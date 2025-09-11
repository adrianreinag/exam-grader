import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";
import { Question, AnswerGrade, Grade, Submission, Exam } from "../models/firestore";

const GetSubmissionQuerySchema = z.object({
  examId: z.string().min(1),
  submissionId: z.string().min(1),
});

type HttpError = { status?: number } & Error;

export async function getSubmissionHandler(req: FunctionsRequest, res: Response): Promise<void> {
  let examId: string | undefined;
  let submissionId: string | undefined;

  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedQuery = GetSubmissionQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      res.status(400).json({ error: { message: "Invalid query parameters", details: parsedQuery.error.flatten() } });
      return;
    }

    examId = parsedQuery.data.examId;
    submissionId = parsedQuery.data.submissionId;

    await assertIsOwner(user, examId);

    const submissionRef = db.collection("exams").doc(examId).collection("submissions").doc(submissionId);
    const examRef = db.collection("exams").doc(examId);

    const [submissionDoc, examDoc, questionsSnapshot, answersSnapshot, gradeDoc, answerGradesSnapshot] = await Promise.all([
      submissionRef.get(),
      examRef.get(), // Se añade la obtención del documento del examen
      examRef.collection("questions").get(),
      submissionRef.collection("answers").get(),
      submissionRef.collection("grade").doc("grade").get(),
      submissionRef.collection("grade").doc("grade").collection("answerGrades").get(),
    ]);

    if (!submissionDoc.exists) {
      res.status(404).json({ error: { message: "Submission not found" } });
      return;
    }

    if (!examDoc.exists) {
      res.status(404).json({ error: { message: "Exam not found" } });
      return;
    }

    const questionsMap = new Map(questionsSnapshot.docs.map((doc) => [doc.id, doc.data() as Question]));
    const answerGradesMap = new Map(answerGradesSnapshot.docs.map((doc) => [doc.id, doc.data() as AnswerGrade]));

    const detailedAnswers = answersSnapshot.docs.map((answerDoc) => {
      const questionId = answerDoc.id;
      const question = questionsMap.get(questionId);
      const gradeDataForAnswer = answerGradesMap.get(questionId);

      return {
        questionId,
        questionText: question?.text || "Question not found",
        maxPoints: question?.maxPoints || 0,
        rubricText: question?.rubricText || "",
        answerText: answerDoc.data().text || "",
        grade: gradeDataForAnswer ? {
          manualPoints: gradeDataForAnswer.manualPoints ?? null,
          manualComment: gradeDataForAnswer.manualComment ?? null,
          manualInlineComments: (gradeDataForAnswer.manualInlineComments || []).map((ic: any) => ({
            id: ic.id,
            startIndex: ic.startIndex,
            endIndex: ic.endIndex,
            text: ic.text,
            source: ic.source,
            createdAt: ic?.createdAt?.toDate ? ic.createdAt.toDate().toISOString() : (ic?.createdAt?.toISOString ? ic.createdAt.toISOString() : null),
          })),
          aiSuggestedPoints: gradeDataForAnswer.aiSuggestedPoints ?? null,
          aiSuggestedComment: gradeDataForAnswer.aiSuggestedComment ?? null,
          aiInlineComments: (gradeDataForAnswer.aiInlineComments || []).map((ic: any) => ({
            id: ic.id,
            startIndex: ic.startIndex,
            endIndex: ic.endIndex,
            text: ic.text,
            source: ic.source,
            createdAt: ic?.createdAt?.toDate ? ic.createdAt.toDate().toISOString() : (ic?.createdAt?.toISOString ? ic.createdAt.toISOString() : null),
          })),
        } : null,
      };
    });

    const submissionData = submissionDoc.data() as Submission;
    const gradeData = gradeDoc.exists ? (gradeDoc.data() as Grade) : null;
    const examData = examDoc.data() as Exam;

    const responsePayload = {
      submission: {
        ...submissionData,
        id: submissionDoc.id,
        createdAt: submissionData.createdAt ? submissionData.createdAt.toDate().toISOString() : new Date().toISOString(),
      },
      grade: gradeData ? {
        ...gradeData,
        updatedAt: gradeData.updatedAt ? gradeData.updatedAt.toDate().toISOString() : null,
        finalizedAt: gradeData.finalizedAt ? gradeData.finalizedAt.toDate().toISOString() : null,
      } : null,
      detailedAnswers,
      exam: {
        state: examData.state,
      },
    };

    res.status(200).json(responsePayload);
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error getting submission:", httpError, { examId, submissionId });
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: "Internal Server Error" } });
    }
  }
}
