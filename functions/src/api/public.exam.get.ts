import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";

const GetPublicExamSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

type HttpError = { status?: number } & Error;

export async function getPublicExamHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const parsedQuery = GetPublicExamSchema.safeParse(req.query);

    if (!parsedQuery.success) {
      res.status(400).json({ error: { message: "Invalid query parameters", details: parsedQuery.error.flatten() } });
      return;
    }

    const { token } = parsedQuery.data;

    const publicLinkRef = db.collection("publicLinks").doc(token);
    const publicLinkDoc = await publicLinkRef.get();

    if (!publicLinkDoc.exists) {
      res.status(404).json({ error: { message: "Exam not found or link is invalid" } });
      return;
    }

    const { examId } = publicLinkDoc.data() as { examId: string };

    const examRef = db.collection("exams").doc(examId);
    const examDoc = await examRef.get();

    const examData = examDoc.data();

    if (!examDoc.exists || examData?.state !== "PUBLISHED") {
      res.status(404).json({ error: { message: "Exam is not available" } });
      return;
    }

    const questionsSnapshot = await examRef.collection("questions").orderBy("order", "asc").get();
    const questions = questionsSnapshot.docs.map((doc) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { rubricText, ...questionData } = doc.data();
      return {
        id: doc.id,
        ...questionData,
      };
    });

    const responsePayload = {
      exam: {
        title: examData?.title ?? "Untitled Exam",
        description: examData?.description ?? "",
      },
      questions,
    };

    res.status(200).json(responsePayload);
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error getting public exam:", httpError);
    res.status(500).json({ error: { message: "Internal Server Error" } });
  }
}
