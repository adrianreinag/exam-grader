import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";

const CreateExamSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters long").max(200),
  description: z.string().max(8000).optional(),
});

type HttpError = {
  status?: number;
} & Error;

export async function createExamHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedBody = CreateExamSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsedBody.error.flatten() } });
      return;
    }

    const { title, description } = parsedBody.data;

    const newExam = {
      ownerUid: user.uid,
      title,
      description: description || null,
      state: "DRAFT",
      createdAt: new Date(),
    };

    const docRef = await db.collection("exams").add(newExam);

    logger.info(`Exam created successfully: ${docRef.id} by user ${user.uid}`);

    res.status(201).json({ examId: docRef.id });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error creating exam:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: "Internal Server Error" } });
    }
  }
}
