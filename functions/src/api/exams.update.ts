import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner, assertIsDraft } from "../libs/authorize";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";
import { Exam } from "../models/firestore";

const QuestionSchema = z.object({
  id: z.string().optional(),
  order: z.number().int().min(0),
  text: z.string().min(2).max(4000),
  maxPoints: z.number().int().min(1).max(1000),
  rubricText: z.string().min(2).max(8000),
});

const UpdateExamSchema = z.object({
  examId: z.string().min(1),
  patch: z.object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(8000).optional().nullable(),
    questions: z.array(QuestionSchema).optional(),
  }),
});

type HttpError = { status?: number } & Error;

export async function updateExamHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedBody = UpdateExamSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsedBody.error.flatten() } });
      return;
    }

    const { examId, patch } = parsedBody.data;

    const examData = await assertIsOwner(user, examId);
    assertIsDraft(examData);

    const batch = db.batch();
    const examRef = db.collection("exams").doc(examId);

    const examUpdatePayload: Partial<Exam> = {};
    if (patch.title !== undefined) {
      examUpdatePayload.title = patch.title;
    }
    if (patch.description !== undefined) {
      examUpdatePayload.description = patch.description ?? null;
    }
    if (Object.keys(examUpdatePayload).length > 0) {
      batch.update(examRef, examUpdatePayload);
    }

    if (patch.questions) {
      const existingQuestionsSnapshot = await examRef.collection("questions").get();
      existingQuestionsSnapshot.forEach((doc) => batch.delete(doc.ref));

      patch.questions.forEach((question) => {
        const questionRef = examRef.collection("questions").doc();
        batch.set(questionRef, {
          order: question.order,
          text: question.text,
          maxPoints: question.maxPoints,
          rubricText: question.rubricText,
        });
      });
    }

    await batch.commit();

    logger.info(`Exam updated successfully: ${examId} by user ${user.uid}`);
    res.status(200).json({ success: true, examId });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error updating exam:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: "Internal Server Error" } });
    }
  }
}
