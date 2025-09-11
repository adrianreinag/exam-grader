import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import { Submission } from "../models/firestore";
import * as logger from "firebase-functions/logger";

type HttpError = { status?: number } & Error;

export async function clearAllGradesHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const { examId } = req.body;

    if (!examId) {
      res.status(400).json({ error: { message: "examId es requerido" } });
      return;
    }

    await assertIsOwner(user, examId);

    // Obtener todas las submissions
    const submissionsSnapshot = await db
      .collection("exams")
      .doc(examId)
      .collection("submissions")
      .get();

    // Procesar en lotes para evitar problemas de límites
    const batchSize = 500;
    let processedCount = 0;

    for (let i = 0; i < submissionsSnapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = submissionsSnapshot.docs.slice(i, i + batchSize);

      for (const doc of batchDocs) {
        const submission = doc.data() as Submission;

        // Solo procesar si tiene correcciones
        if (submission.manualTotalPoints !== null || submission.aiTotalPoints !== null) {
          const clearedSubmission: Partial<Submission> = {
            gradeState: "UNGRADED",
            manualTotalPoints: null,
            aiTotalPoints: null,
            totalPoints: null,
            definitiveSource: null,
          };

          batch.update(doc.ref, clearedSubmission);

          // También limpiar las correcciones de las respuestas individuales
          const answersSnapshot = await doc.ref.collection("answers").get();
          for (const answerDoc of answersSnapshot.docs) {
            batch.update(answerDoc.ref, {
              manualPoints: null,
              aiPoints: null,
              manualComment: null,
              aiComment: null,
              aiOverallComment: null,
              aiInlineComments: null,
            });
          }

          processedCount++;
        }
      }

      if (batchDocs.some((doc) => {
        const submission = doc.data() as Submission;
        return submission.manualTotalPoints !== null || submission.aiTotalPoints !== null;
      })) {
        await batch.commit();
      }
    }

    logger.info(`Cleared all grades for exam ${examId} by user ${user.uid}. Processed ${processedCount} submissions.`);

    res.status(200).json({
      success: true,
      message: `Se han vaciado todas las correcciones. ${processedCount} entregas procesadas.`,
      processedCount,
    });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error clearing all grades:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: (httpError as Error).message || "Internal Server Error" } });
    }
  }
}
