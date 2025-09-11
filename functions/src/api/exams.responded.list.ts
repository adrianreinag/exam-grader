import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";
import { Submission } from "../models/firestore";

const ListRespondedExamsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type HttpError = { status?: number } & Error;

type RespondedExamResponse = {
  id: string;
  title: string;
  state: "UNGRADED" | "GRADED_DRAFT" | "GRADED_FINAL";
  submittedAt: string;
  totalPoints: number | null;
  submissionId: string;
};

export async function listRespondedExamsHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedQuery = ListRespondedExamsQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      res.status(400).json({ error: { message: "Invalid query parameters", details: parsedQuery.error.flatten() } });
      return;
    }

    const { cursor, limit } = parsedQuery.data;

    let query = db.collectionGroup("submissions")
      .where("respondentUid", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (cursor) {
      const submissionsForCursor = await db.collectionGroup("submissions").where("respondentUid", "==", user.uid).get();
      const startAfterDoc = submissionsForCursor.docs.find((doc) => doc.id === cursor);
      if (startAfterDoc?.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const submissionsSnapshot = await query.get();

    const respondedExams = submissionsSnapshot.docs.reduce<RespondedExamResponse[]>((acc, doc) => {
      const submissionData = doc.data() as Submission;
      const examId = doc.ref.parent.parent?.id;

      if (examId) {
        acc.push({
          id: examId,
          title: submissionData.examTitle || "Examen sin título",
          state: submissionData.gradeState,
          submittedAt: submissionData.createdAt.toDate().toISOString(),
          totalPoints: submissionData.manualTotalPoints ?? null,
          submissionId: doc.id,
        });
      }
      return acc;
    }, []);

    const nextCursor = submissionsSnapshot.docs.length === limit ? submissionsSnapshot.docs[submissionsSnapshot.docs.length - 1].id : null;

    res.status(200).json({ exams: respondedExams, nextCursor });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error listing responded exams:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: "Internal Server Error" } });
    }
  }
}
