import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";
import { CollectionReference } from "firebase-admin/firestore";

const DeleteExamSchema = z.object({
  examId: z.string().min(1),
});

type HttpError = { status?: number } & Error;

async function deleteCollection(collectionRef: CollectionReference, batchSize: number) {
  const query = collectionRef.limit(batchSize);
  let snapshot = await query.get();

  while (snapshot.size > 0) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    snapshot = await query.get();
  }
}

export async function deleteExamHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedBody = DeleteExamSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsedBody.error.flatten() } });
      return;
    }

    const { examId } = parsedBody.data;
    const examData = await assertIsOwner(user, examId);

    const examRef = db.collection("exams").doc(examId);

    logger.info(`Starting deletion for exam ${examId}`);

    await deleteCollection(examRef.collection("questions"), 100);
    await deleteCollection(examRef.collection("submissions"), 100);

    if (examData.publicToken) {
      const publicLinkRef = db.collection("publicLinks").doc(examData.publicToken);
      await publicLinkRef.delete();
      logger.info(`Deleted public link for exam ${examId}`);
    }

    await examRef.delete();
    logger.info(`Successfully deleted exam ${examId}`);

    res.status(200).json({ success: true, message: "Exam deleted successfully." });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error deleting exam:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: (httpError as Error).message || "Internal Server Error" } });
    }
  }
}
