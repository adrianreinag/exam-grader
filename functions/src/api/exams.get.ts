import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";

const GetExamQuerySchema = z.object({
  examId: z.string().min(1, "examId is required"),
});

type HttpError = { status?: number } & Error;

export async function getExamHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedQuery = GetExamQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      res.status(400).json({ error: { message: "Invalid query parameters", details: parsedQuery.error.flatten() } });
      return;
    }

    const { examId } = parsedQuery.data;

    const examData = await assertIsOwner(user, examId);

    const questionsSnapshot = await db.collection("exams").doc(examId).collection("questions").orderBy("order", "asc").get();

    const questions = questionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const responsePayload = {
      exam: {
        id: examId,
        title: examData.title,
        description: examData.description,
        state: examData.state,
        createdAt: examData.createdAt.toDate().toISOString(),
        publicToken: examData.publicToken || null,
        questionsCount: examData.questionsCount || 0,
        maxTotalPoints: examData.maxTotalPoints || 0,
      },
      questions: questions,
    };

    res.status(200).json(responsePayload);
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error getting exam:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: "Internal Server Error" } });
    }
  }
}
