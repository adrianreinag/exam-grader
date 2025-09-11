import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";
import { Grade } from "../models/firestore";

const SetSourceSchema = z.object({
  examId: z.string().min(1),
  submissionId: z.string().min(1),
  source: z.enum(["MANUAL", "AI"]),
});

type HttpError = { status?: number } & Error;

export async function setDefinitiveSourceHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedBody = SetSourceSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsedBody.error.flatten() } });
      return;
    }

    const { examId, submissionId, source } = parsedBody.data;
    await assertIsOwner(user, examId);

    const submissionRef = db.collection("exams").doc(examId).collection("submissions").doc(submissionId);
    const gradeRef = submissionRef.collection("grade").doc("grade");

    const gradeDoc = await gradeRef.get();
    if (!gradeDoc.exists) {
      const err = new Error("Grade document not found for this submission.") as HttpError;
      err.status = 404;
      throw err;
    }
    const gradeData = gradeDoc.data() as Grade;

    const manualTP = gradeData?.manualTotalPoints ?? null;
    const aiTP = gradeData?.aiTotalPoints ?? null;
    const definitiveTotalPoints = source === "AI" ? aiTP : manualTP;

    if (definitiveTotalPoints === null) {
      const err = new Error(`Cannot set source to ${source} because the corresponding grade is not available.`) as HttpError;
      err.status = 400;
      throw err;
    }

    const batch = db.batch();
    batch.update(gradeRef, { definitiveSource: source });
    batch.update(submissionRef, { definitiveSource: source, totalPoints: definitiveTotalPoints });
    await batch.commit();

    logger.info(`Definitive source for submission ${submissionId} set to ${source}`);
    res.status(200).json({ success: true, newTotal: definitiveTotalPoints });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error setting definitive source:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: (httpError as Error).message || "Internal Server Error" } });
    }
  }
}
