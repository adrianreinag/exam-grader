import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";
import { Submission } from "../models/firestore";

const ListSubmissionsQuerySchema = z.object({
  examId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type HttpError = { status?: number } & Error;

export async function listSubmissionsHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedQuery = ListSubmissionsQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      res.status(400).json({ error: { message: "Invalid query parameters", details: parsedQuery.error.flatten() } });
      return;
    }

    const { examId, cursor, limit } = parsedQuery.data;
    await assertIsOwner(user, examId);

    let query = db
      .collection("exams")
      .doc(examId)
      .collection("submissions")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (cursor) {
      const startAfterDoc = await db.collection("exams").doc(examId).collection("submissions").doc(cursor).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const snapshot = await query.get();

    const submissions = snapshot.docs.map((doc) => {
      const data = doc.data() as Submission;
      return {
        id: doc.id,
        respondentEmail: data.respondentEmail || null,
        respondentName: data.respondentName || null,
        createdAt: data.createdAt.toDate().toISOString(),
        gradeState: data.gradeState || "UNGRADED",
        manualTotalPoints: data.manualTotalPoints ?? null,
        aiTotalPoints: data.aiTotalPoints ?? null,
        definitiveSource: data.definitiveSource || null,
        totalPoints: data.totalPoints ?? null,
        gradingMethod: data.gradingMethod || null,
      };
    });

    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;

    res.status(200).json({ submissions, nextCursor });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error listing submissions:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: "Internal Server Error" } });
    }
  }
}
