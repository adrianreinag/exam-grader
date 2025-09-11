import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";
import { Grade, AnswerGrade } from "../models/firestore";
import { Timestamp } from "firebase-admin/firestore";

const InlineCommentSchema = z.object({
  id: z.string(),
  startIndex: z.number().min(0),
  endIndex: z.number().min(0),
  text: z.string().max(1000),
});

const AnswerGradeItemSchema = z.object({
  questionId: z.string(),
  pointsAwarded: z.number().min(0),
  comment: z.string().max(4000).optional(),
  inlineComments: z.array(InlineCommentSchema).optional(),
});

const SaveDraftSchema = z.object({
  examId: z.string().min(1),
  submissionId: z.string().min(1),
  items: z.array(AnswerGradeItemSchema),
  // New preferred field
  manualCommentsOverall: z.string().max(8000).optional(),
  // Deprecated fallback field
  commentsOverall: z.string().max(8000).optional(),
});

type HttpError = { status?: number } & Error;

export async function saveDraftHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedBody = SaveDraftSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsedBody.error.flatten() } });
      return;
    }

    const { examId, submissionId, items } = parsedBody.data;
    const commentsOverall = (parsedBody.data.manualCommentsOverall ?? parsedBody.data.commentsOverall) || null;
    await assertIsOwner(user, examId);

    const questionsSnapshot = await db.collection("exams").doc(examId).collection("questions").get();
    const questionsMap = new Map(questionsSnapshot.docs.map((doc) => [doc.id, doc.data()]));

    let totalPoints = 0;
    const batch = db.batch();
    const submissionRef = db.collection("exams").doc(examId).collection("submissions").doc(submissionId);

    for (const item of items) {
      const questionData = questionsMap.get(item.questionId);
      if (!questionData) {
        throw new Error(`Invalid questionId provided: ${item.questionId}`);
      }

      const maxPoints = questionData.maxPoints || 0;
      const clampedPoints = Math.max(0, Math.min(item.pointsAwarded, maxPoints));
      totalPoints += clampedPoints;

      const answerGradeRef = submissionRef.collection("grade").doc("grade").collection("answerGrades").doc(item.questionId);

      // Procesar comentarios inline manuales
      const manualInlineComments = (item.inlineComments || []).map((ic) => ({
        ...ic,
        source: "MANUAL" as const,
        createdAt: new Date(),
      }));

      const answerGradePayload: Partial<AnswerGrade> = {
        manualPoints: clampedPoints,
        manualComment: item.comment || null,
        manualInlineComments,
      };
      batch.set(answerGradeRef, answerGradePayload, { merge: true });
    }

    const gradeRef = submissionRef.collection("grade").doc("grade");
    const gradePayload: Partial<Grade> = {
      state: "GRADED_DRAFT",
      manualTotalPoints: totalPoints,
      manualCommentsOverall: commentsOverall,
      updatedAt: Timestamp.now(),
      definitiveSource: "MANUAL",
    };
    batch.set(gradeRef, gradePayload, { merge: true });

    batch.update(submissionRef, { gradeState: "GRADED_DRAFT", manualTotalPoints: totalPoints, totalPoints: totalPoints, definitiveSource: "MANUAL" });

    await batch.commit();

    logger.info(`Draft saved for submission ${submissionId}`);
    res.status(200).json({ success: true, totalPoints });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error saving draft:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: (httpError as Error).message || "Internal Server Error" } });
    }
  }
}
