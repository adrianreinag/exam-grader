import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";
import { Exam } from "../models/firestore";

const ListExamsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type HttpError = { status?: number } & Error;

export async function listExamsHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedQuery = ListExamsQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      res.status(400).json({ error: { message: "Invalid query parameters", details: parsedQuery.error.flatten() } });
      return;
    }

    const { cursor, limit } = parsedQuery.data;

    let query = db
      .collection("exams")
      .where("ownerUid", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (cursor) {
      const startAfterDoc = await db.collection("exams").doc(cursor).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const snapshot = await query.get();

    const exams = snapshot.docs.map((doc) => {
      const data = doc.data() as Exam;
      return {
        id: doc.id,
        title: data.title,
        state: data.state,
        createdAt: data.createdAt.toDate().toISOString(),
        questionsCount: data.questionsCount || 0,
      };
    });

    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;

    res.status(200).json({ exams, nextCursor });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error listing exams:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: "Internal Server Error" } });
    }
  }
}
