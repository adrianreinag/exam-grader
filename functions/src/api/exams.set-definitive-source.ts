import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";

const SetDefinitiveSourceSchema = z.object({
  examId: z.string().min(1, "examId is required"),
  source: z.enum(["MANUAL", "AI"]),
});

type HttpError = { status?: number } & Error;

export async function setExamDefinitiveSourceHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const body = JSON.parse(req.body);
    const parsedBody = SetDefinitiveSourceSchema.safeParse(body);

    if (!parsedBody.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsedBody.error.flatten() } });
      return;
    }

    const { examId, source } = parsedBody.data;

    // Verify ownership and get exam data
    const examData = await assertIsOwner(user, examId);

    // Check exam state - can't change definitive source if already EVALUATED
    if (examData.state === "EVALUATED") {
      res.status(400).json({ error: { message: "Cannot change definitive source for an evaluated exam" } });
      return;
    }

    // Update the exam document with the new definitive grade source
    await db.collection("exams").doc(examId).update({
      definitiveGradeSource: source,
    });

    logger.info(`Updated definitive grade source for exam ${examId} to ${source}`);

    res.status(200).json({ success: true });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error setting definitive source:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: "Internal Server Error" } });
    }
  }
}
