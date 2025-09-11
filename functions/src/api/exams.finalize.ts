import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";

const FinalizeExamSchema = z.object({
  examId: z.string().min(1),
});

type HttpError = { status?: number } & Error;

export async function finalizeExamHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedBody = FinalizeExamSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsedBody.error.flatten() } });
      return;
    }

    const { examId } = parsedBody.data;
    const examData = await assertIsOwner(user, examId);

    if (examData.state !== "PUBLISHED") {
      res.status(409).json({ error: { message: "Only published exams can be finalized." } });
      return;
    }

    const examRef = db.collection("exams").doc(examId);
    await examRef.update({
      state: "EVALUATED",
    });

    logger.info(`Exam ${examId} has been evaluated and closed.`);
    res.status(200).json({ success: true, message: "Exam finalized." });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error finalizing exam:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: (httpError as Error).message || "Internal Server Error" } });
    }
  }
}
