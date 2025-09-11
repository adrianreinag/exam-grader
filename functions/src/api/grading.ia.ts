import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";
import { GradingJob } from "../models/firestore";
import { Timestamp } from "firebase-admin/firestore";

const GradeIaSchema = z.object({
  examId: z.string().min(1),
  mode: z.enum(["NEUTRAL", "STRICT", "LENIENT"]).optional(),
});

type HttpError = { status?: number } & Error;

export async function gradeIaHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedBody = GradeIaSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsedBody.error.flatten() } });
      return;
    }

    const { examId, mode } = parsedBody.data;
    const examData = await assertIsOwner(user, examId);

    if (!user.email) {
      throw new Error("User email is not available for notifications.");
    }

    const newJob: Omit<GradingJob, "scope"> = {
      ownerUid: user.uid,
      ownerEmail: user.email,
      examId,
      examTitle: examData.title,
      status: "PENDING",
      createdAt: Timestamp.now(),
      mode: mode || "NEUTRAL",
    };

    await db.collection("gradingJobs").add(newJob);

    logger.info(`Grading job scheduled for exam ${examId} by user ${user.uid}`);
    res.status(202).json({ success: true, message: "AI suggestion generation has been scheduled." });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error in scheduling AI grading:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: (httpError as Error).message || "Internal Server Error" } });
    }
  }
}
