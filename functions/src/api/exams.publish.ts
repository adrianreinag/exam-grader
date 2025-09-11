import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner, assertIsDraft } from "../libs/authorize";
import { db } from "../libs/firestore";
import { nanoid } from "nanoid";
import * as logger from "firebase-functions/logger";

const PublishExamSchema = z.object({
  examId: z.string().min(1),
});

type HttpError = { status?: number } & Error;

export async function publishExamHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedBody = PublishExamSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsedBody.error.flatten() } });
      return;
    }

    const { examId } = parsedBody.data;
    const examData = await assertIsOwner(user, examId);
    assertIsDraft(examData);

    const questionsRef = db.collection("exams").doc(examId).collection("questions");
    const questionsSnapshot = await questionsRef.get();

    if (questionsSnapshot.empty) {
      res.status(400).json({ error: { message: "Cannot publish an exam with no questions" } });
      return;
    }

    const questionsCount = questionsSnapshot.size;
    const maxTotalPoints = questionsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().maxPoints || 0), 0);
    const publicToken = nanoid(22);

    await db.runTransaction(async (transaction) => {
      const examRef = db.collection("exams").doc(examId);
      const publicLinkRef = db.collection("publicLinks").doc(publicToken);
      const publicLinkDoc = await transaction.get(publicLinkRef);
      if (publicLinkDoc.exists) {
        throw new Error("Public token collision. Please try again.");
      }
      transaction.set(publicLinkRef, { examId });
      transaction.update(examRef, {
        state: "PUBLISHED",
        publicToken,
        publishedAt: new Date(),
        questionsCount,
        maxTotalPoints,
      });
    });

    // TU CORRECCIÓN RESTAURADA Y CORRECTA:
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || "https://exam-grader-five.vercel.app";
    const publicUrl = `${publicBaseUrl}/e/${publicToken}`;

    logger.info(`Exam published successfully: ${examId} with token ${publicToken}`);
    res.status(200).json({ success: true, examId, publicUrl });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error publishing exam:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: (httpError as Error).message || "Internal Server Error" } });
    }
  }
}
