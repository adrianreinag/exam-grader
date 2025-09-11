import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import { sendEmail, buildResultEmail } from "../libs/resend";
import { beginIdempotentOperation, endIdempotentOperation } from "../libs/idempotency";
import * as logger from "firebase-functions/logger";
import { Exam, Submission, Grade, Question, AnswerGrade } from "../models/firestore";
import { Timestamp } from "firebase-admin/firestore";

const FinalizeSchema = z.object({
  examId: z.string().min(1),
  requestId: z.string().uuid().optional(),
});

type HttpError = { status?: number } & Error;
type FinalizeResult = { message: string; sent: number; skipped: number; success?: boolean };

export async function finalizeHandler(req: FunctionsRequest, res: Response): Promise<void> {
  const { examId, requestId } = FinalizeSchema.parse(req.body);
  const operationKey = `finalize:${examId}`;

  if (requestId) {
    const op = await beginIdempotentOperation<FinalizeResult>(operationKey, requestId);
    if (op.already_processed) {
      logger.info(`Idempotent request replayed for ${operationKey}:${requestId}`);
      res.status(200).json(op.result);
      return;
    }
  }

  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const examData = await assertIsOwner(user, examId) as Exam;

    const submissionsRef = db.collection("exams").doc(examId).collection("submissions");
    const snapshot = await submissionsRef.where("gradeState", "==", "GRADED_DRAFT").get();

    if (snapshot.empty) {
      const result: FinalizeResult = { message: "No submissions in draft state to finalize.", sent: 0, skipped: 0 };
      if (requestId) await endIdempotentOperation(operationKey, requestId, result);
      res.status(200).json(result);
      return;
    }

    // Finalization now respects each submission's own definitive source.
    // There is no longer a global exam-level definitive source.

    let sent = 0;
    let skipped = 0;

    const emailPromises = snapshot.docs.map(async (doc) => {
      const submissionData = doc.data() as Submission;
      const gradeDoc = await doc.ref.collection("grade").doc("grade").get();
      const gradeData = gradeDoc.data() as Grade;

      // Determine final source and points per submission
      let finalSource: "MANUAL" | "AI" | null = submissionData.definitiveSource || (gradeData.definitiveSource ?? null);
      let finalPoints: number | null = null;

      if (finalSource === "MANUAL" && gradeData.manualTotalPoints !== null) {
        finalPoints = gradeData.manualTotalPoints;
      } else if (finalSource === "AI" && gradeData.aiTotalPoints !== null) {
        finalPoints = gradeData.aiTotalPoints;
      } else {
        // No definitive source chosen yet: choose a sensible default for finalization
        if (gradeData.manualTotalPoints !== null) {
          finalSource = "MANUAL";
          finalPoints = gradeData.manualTotalPoints;
        } else if (gradeData.aiTotalPoints !== null) {
          finalSource = "AI";
          finalPoints = gradeData.aiTotalPoints;
        } else if (submissionData.totalPoints !== null) {
          // Fallback to existing totalPoints if both are missing
          finalPoints = submissionData.totalPoints;
        } else {
          finalPoints = null;
        }
      }

      const batch = db.batch();
      // Update the submission and grade with the computed definitive source for this submission
      batch.update(doc.ref, {
        gradeState: "GRADED_FINAL",
        definitiveSource: finalSource,
        totalPoints: finalPoints,
      });
      batch.update(gradeDoc.ref, {
        state: "GRADED_FINAL",
        finalizedAt: Timestamp.now(),
        definitiveSource: finalSource,
      });
      await batch.commit();

      if (submissionData.respondentEmail && gradeData && finalPoints !== null) {
        try {
          // Obtener los detalles de las preguntas y respuestas para incluirlos en el correo
          const [questionsSnapshot, answersSnapshot, answerGradesSnapshot] = await Promise.all([
            db.collection("exams").doc(examId).collection("questions").get(),
            doc.ref.collection("answers").get(),
            gradeDoc.ref.collection("answerGrades").get(),
          ]);

          const questionsMap = new Map(questionsSnapshot.docs.map((doc) => [doc.id, doc.data() as Question]));
          const answerGradesMap = new Map(answerGradesSnapshot.docs.map((doc) => [doc.id, doc.data() as AnswerGrade]));

          const detailedAnswers = answersSnapshot.docs.map((answerDoc) => {
            const questionId = answerDoc.id;
            const question = questionsMap.get(questionId);
            const gradeDataForAnswer = answerGradesMap.get(questionId);

            return {
              questionId,
              questionText: question?.text || "Pregunta no encontrada",
              maxPoints: question?.maxPoints || 0,
              rubricText: question?.rubricText || "",
              answerText: answerDoc.data().text || "",
              grade: gradeDataForAnswer ? {
                manualPoints: gradeDataForAnswer.manualPoints ?? null,
                manualComment: gradeDataForAnswer.manualComment ?? null,
                aiSuggestedPoints: gradeDataForAnswer.aiSuggestedPoints ?? null,
                aiSuggestedComment: gradeDataForAnswer.aiSuggestedComment ?? null,
              } : null,
            };
          });

          const html = buildResultEmail({
            examTitle: examData.title,
            nameOrEmail: submissionData.respondentName || submissionData.respondentEmail,
            totalPoints: finalPoints,
            commentsOverall: (() => {
              if (!gradeData) return null;
              if (finalSource === "AI") {
                return gradeData.aiCommentsOverall ?? gradeData.commentsOverall ?? null;
              }
              // MANUAL or null default to manual when available
              return gradeData.manualCommentsOverall ?? gradeData.commentsOverall ?? null;
            })(),
            detailedAnswers: detailedAnswers,
            definitiveSource: finalSource,
          });
          await sendEmail({ to: submissionData.respondentEmail, subject: `Resultados del examen: ${examData.title}`, html });
          sent++;
        } catch (emailError) {
          logger.error(`Failed to send email to ${submissionData.respondentEmail}`, emailError);
          skipped++;
        }
      } else {
        logger.warn(`Skipping email for submission ${doc.id} due to missing email or grade data.`);
        skipped++;
      }
    });

    await Promise.all(emailPromises);

    await db.collection("exams").doc(examId).update({
      state: "EVALUATED",
      finalizedAt: Timestamp.now(),
    });
    logger.info(`Exam ${examId} state has been set to EVALUATED.`);

    const result: FinalizeResult = { success: true, sent, skipped, message: "Finalization complete." };
    if (requestId) await endIdempotentOperation(operationKey, requestId, result);

    logger.info(`Finalized grading for exam ${examId}. Sent: ${sent}, Skipped: ${skipped}`);
    res.status(200).json(result);
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error finalizing grades:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: (httpError as Error).message || "Internal Server Error" } });
    }
  }
}
