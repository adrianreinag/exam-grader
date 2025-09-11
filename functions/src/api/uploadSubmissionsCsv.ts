import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";
import { CsvUploadJob } from "../models/firestore";
import { Timestamp } from "firebase-admin/firestore";

// Permite emails con parte local en Unicode (e.g., acentos) y valida formato básico usuario@dominio.tld
// Nota: Este regex es deliberadamente permisivo para permitir UTF-8 en la parte local.
const UnicodeEmailSchema = z
  .string()
  .trim()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u, { message: "La columna 'student_email' contiene un email inválido." });

const CsvRowSchema = z
  .object({
    student_email: UnicodeEmailSchema,
    student_name: z.string().optional(),
    manual_total_points: z.string().optional().transform((val) => {
      if (!val || val.trim() === "") return null;
      const num = Number(val.trim());
      return isNaN(num) ? null : num;
    }),
  })
  .catchall(z.string().optional());

const CsvUploadSchema = z.object({
  examId: z.string().min(1),
  payload: z.array(CsvRowSchema).min(1, { message: "El archivo CSV no puede estar vacío." }),
});

type HttpError = { status?: number } & Error;

export async function uploadSubmissionsCsvHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedBody = CsvUploadSchema.safeParse(req.body);

    if (!parsedBody.success) {
      const flattened = parsedBody.error.flatten();
      const issues = parsedBody.error.issues.map((issue) => ({ path: issue.path, message: issue.message }));
      logger.error("CSV validation failed:", { flattened, issues });
      res.status(400).json({
        error: {
          message: "Los datos del CSV son inválidos. Revisa el formato.",
          details: flattened,
          issues,
        },
      });
      return;
    }

    const { examId, payload } = parsedBody.data;
    const examData = await assertIsOwner(user, examId);

    if (!user.email) {
      throw new Error("User email is not available for notifications.");
    }

    const newJob: CsvUploadJob = {
      ownerUid: user.uid,
      ownerEmail: user.email,
      examId,
      examTitle: examData.title,
      status: "PENDING",
      createdAt: Timestamp.now(),
      payload: payload,
    };

    await db.collection("csvUploadJobs").add(newJob);

    logger.info(`CSV upload job scheduled for exam ${examId} by user ${user.uid}`);
    res.status(202).json({ success: true, message: "CSV upload has been scheduled." });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error scheduling CSV upload:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: (httpError as Error).message || "Internal Server Error" } });
    }
  }
}
