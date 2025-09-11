import * as logger from "firebase-functions/logger";
import { FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import { db } from "../libs/firestore";
import { GradingJob, Question, Answer, AnswerGrade, Submission } from "../models/firestore";
import { gradeWithAI } from "../libs/openai";
import { getUserOpenAIApiKey } from "../libs/user-api-key";
// Professor email notifications disabled: no Resend imports used here.
import { Timestamp } from "firebase-admin/firestore";

const ANSWER_CONCURRENCY = Number(process.env.AI_ANSWER_CONCURRENCY || 8);
const SUBMISSION_CONCURRENCY = Number(process.env.AI_SUBMISSION_CONCURRENCY || 25);

// Helper to run a list of tasks with limited concurrency
const runWithConcurrency = async <T, >(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const myIndex = cursor++;
      if (myIndex >= tasks.length) break;
      results[myIndex] = await tasks[myIndex]();
    }
  };
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
};

export const processGradingJob = async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
  if (!event.data) {
    logger.log("No data associated with the event");
    return;
  }

  const jobDoc = event.data;
  const job = jobDoc.data() as GradingJob;
  const { examId, ownerUid } = job;
  const mode = job.mode || "NEUTRAL";

  // Get user-specific OpenAI API key
  const apiKey = await getUserOpenAIApiKey(ownerUid);

  try {
    await jobDoc.ref.update({ status: "PROCESSING", startedAt: Timestamp.now() });

    const examRef = db.collection("exams").doc(examId);

    const questionsSnapshot = await examRef.collection("questions").get();
    const questionsMap = new Map<string, Question>(
      questionsSnapshot.docs.map((doc) => [doc.id, doc.data() as Question])
    );

    const submissionsSnapshot = await examRef.collection("submissions").get();

    // Debug logging
    logger.info(`Total submissions found: ${submissionsSnapshot.docs.length}`);
    submissionsSnapshot.docs.forEach((doc, idx) => {
      const data = doc.data() as Submission;
      logger.info(`Submission ${idx}: id=${doc.id}, aiTotalPoints=${data.aiTotalPoints} (${typeof data.aiTotalPoints})`);
    });

    const submissionsToGrade = submissionsSnapshot.docs.filter((doc) => (doc.data() as Submission).aiTotalPoints === null);

    if (submissionsToGrade.length === 0) {
      logger.info(`No new submissions to grade for job ${jobDoc.id}.`);
      await jobDoc.ref.update({ status: "COMPLETED", completedAt: Timestamp.now() });
      return;
    }

    logger.info(`Found ${submissionsToGrade.length} submissions to grade for job ${jobDoc.id}.`);

    // Helpers para reconciliar índices usando una cita/quote opcional
    type AiInlineIncoming = {
      id?: string;
      startIndex?: number;
      endIndex?: number;
      text?: string;
      quote?: string;
    };
    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    const findBestQuoteIndex = (text: string, quote: string, suggestedStart?: number) => {
      if (!quote || !text) return -1;
      const indices: number[] = [];
      for (let idx = text.indexOf(quote, 0); idx !== -1; idx = text.indexOf(quote, idx + 1)) {
        indices.push(idx);
      }
      if (indices.length === 0) return -1;
      if (typeof suggestedStart !== "number" || !Number.isFinite(suggestedStart)) {
        return indices[0];
      }
      let best = indices[0];
      let bestDist = Math.abs(indices[0] - suggestedStart);
      for (let i = 1; i < indices.length; i++) {
        const d = Math.abs(indices[i] - suggestedStart);
        if (d < bestDist) {
          best = indices[i];
          bestDist = d;
        }
      }
      return best;
    };

    const reconcileInline = (answerText: string, ic: AiInlineIncoming) => {
      const len = answerText.length;
      let start = clamp(Number(ic.startIndex) || 0, 0, len);
      let end = clamp(Number(ic.endIndex) || 0, 0, len);
      const quote = typeof ic.quote === "string" ? ic.quote : undefined;

      if (quote && quote.length > 0) {
        const qIdx = findBestQuoteIndex(answerText, quote, start);
        if (qIdx >= 0) {
          const tolerance = 300; // margen de error en caracteres
          const dist = Math.abs(qIdx - start);
          if (dist > tolerance) {
            logger.warn("AI inline comment indices far from quote match; reconciling to quote.", { suggestedStart: start, quoteStart: qIdx, tolerance });
          }
          start = qIdx;
          end = clamp(qIdx + quote.length, 0, len);
        }
      }

      if (end <= start) return null; // inválido, descartar
      return { startIndex: start, endIndex: end };
    };

    // Process individual submission with AI grading
    const processSubmission = async (submissionDoc: QueryDocumentSnapshot) => {
      const submissionRef = submissionDoc.ref;
      const submissionData = submissionDoc.data() as Submission;
      const answersSnapshot = await submissionRef.collection("answers").get();

      const submissionStarted = Date.now();
      logger.info("Start AI suggestions for submission", {
        submissionId: submissionDoc.id,
        answersCount: answersSnapshot.docs.length,
        concurrency: ANSWER_CONCURRENCY,
      });

      // Process answers with controlled concurrency
      const tasks = answersSnapshot.docs.map((answerDoc) => async () => {
        const answer = answerDoc.data() as Answer;
        const question = questionsMap.get(answerDoc.id);
        if (!question || !answer) return 0;
        const rawText = (answer.text || "");
        if (!rawText.trim()) {
          logger.info("Skipping empty answer for AI grading", { submissionId: submissionDoc.id, questionId: answerDoc.id });
          return 0;
        }

        const started = Date.now();
        try {
          const aiResult = await gradeWithAI({
            studentName: submissionData.respondentName || "Anónimo",
            rubricText: question.rubricText,
            questionText: question.text,
            maxPoints: question.maxPoints,
            answerText: rawText,
            mode,
          }, apiKey);

          const answerGradeRef = submissionRef.collection("grade").doc("grade").collection("answerGrades").doc(answerDoc.id);

          // Procesar y reconciliar comentarios inline de IA (usando quote si existe)
          const rawInline = (aiResult.inlineComments || []) as AiInlineIncoming[];
          const aiInlineComments = rawInline
            .map((ic) => {
              const reconciled = reconcileInline(rawText, ic);
              if (!reconciled) return null;
              return {
                id: String(ic.id || Math.random().toString(36).substr(2, 9)),
                startIndex: reconciled.startIndex,
                endIndex: reconciled.endIndex,
                text: String(ic.text || "").slice(0, 1000),
                source: "AI" as const,
                createdAt: new Date(),
              };
            })
            .filter((x): x is NonNullable<typeof x> => Boolean(x));

          const answerGradePayload: Partial<AnswerGrade> = {
            aiSuggestedPoints: aiResult.pointsAwarded,
            aiSuggestedComment: aiResult.comment,
            aiInlineComments,
          };
          await answerGradeRef.set(answerGradePayload, { merge: true });

          // Guardar el comentario general de la IA en el documento de calificación principal
          if (aiResult.overallComment) {
            await submissionRef.collection("grade").doc("grade").set({
              aiCommentsOverall: aiResult.overallComment,
              // Mantener el campo deprecado por compatibilidad hacia atrás
              commentsOverall: aiResult.overallComment,
            }, { merge: true });
          }

          const dur = Date.now() - started;
          logger.info("AI graded answer", { submissionId: submissionDoc.id, questionId: answerDoc.id, points: aiResult.pointsAwarded, durationMs: dur });
          return aiResult.pointsAwarded;
        } catch (err) {
          const dur = Date.now() - started;
          const errorMessage = (err as Error)?.message;

          // Handle API key errors specifically
          if (errorMessage === "INVALID_API_KEY") {
            logger.error("Invalid OpenAI API key for user", {
              submissionId: submissionDoc.id,
              questionId: answerDoc.id,
              ownerUid: job.ownerUid,
              durationMs: dur,
            });
            throw new Error("INVALID_API_KEY: La clave API de OpenAI es inválida. Por favor, verifica tu clave API en la configuración.");
          }

          if (errorMessage === "MISSING_API_KEY") {
            logger.error("Missing OpenAI API key for user", {
              submissionId: submissionDoc.id,
              questionId: answerDoc.id,
              ownerUid: job.ownerUid,
              durationMs: dur,
            });
            throw new Error("MISSING_API_KEY: No se encontró una clave API de OpenAI válida. Por favor, configura tu clave API.");
          }

          logger.error("AI grading failed for answer", { submissionId: submissionDoc.id, questionId: answerDoc.id, durationMs: dur, error: errorMessage });
          return 0;
        }
      });

      const pointsPerAnswer = await runWithConcurrency(tasks, ANSWER_CONCURRENCY);
      const totalAiPoints = pointsPerAnswer.reduce((sum, n) => sum + (Number(n) || 0), 0);

      // Persist totals WITHOUT changing definitiveSource or totalPoints; keep suggestions separate
      const batch = db.batch();
      const gradeRef = submissionRef.collection("grade").doc("grade");
      batch.set(gradeRef, { aiTotalPoints: totalAiPoints }, { merge: true });
      batch.update(submissionRef, { aiTotalPoints: totalAiPoints });

      await batch.commit();

      const submissionDuration = Date.now() - submissionStarted;
      logger.info(`Generated AI suggestions for submission ${submissionDoc.id}.`, { totalAiPoints, durationMs: submissionDuration });
    };

    // Convert submissions to tasks for controlled concurrency
    const submissionTasks = submissionsToGrade.map((submissionDoc) => async () => {
      // Execute the submission processing logic
      return await processSubmission(submissionDoc);
    });

    logger.info(`Processing ${submissionTasks.length} submissions with concurrency limit of ${SUBMISSION_CONCURRENCY}`);
    await runWithConcurrency(submissionTasks, SUBMISSION_CONCURRENCY);
    // Intentionally no email to exam owners (professors) upon AI suggestions completion.

    await jobDoc.ref.update({ status: "COMPLETED", completedAt: Timestamp.now() });
    logger.info(`Successfully completed AI suggestion job ${jobDoc.id} for exam ${examId}.`);
  } catch (error) {
    logger.error(`Failed to process grading job ${jobDoc.id} for exam ${examId}:`, error);
    await jobDoc.ref.update({ status: "FAILED", completedAt: Timestamp.now(), error: (error as Error).message });
  }
};
