import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { db } from "../libs/firestore";
import { requireIdToken } from "../libs/auth";
import * as logger from "firebase-functions/logger";
import { Exam, Submission } from "../models/firestore";
import { Timestamp } from "firebase-admin/firestore";

const SubmitAnswerSchema = z.object({
  questionId: z.string(),
  text: z.string().max(20000),
});

const SubmitExamSchema = z.object({
  token: z.string(),
  answers: z.array(SubmitAnswerSchema).min(1),
});

type HttpError = { status?: number } & Error;

export async function publicSubmitHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const respondentUser = await requireIdToken(req);
    const parsedBody = SubmitExamSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsedBody.error.flatten() } });
      return;
    }

    const { token, answers } = parsedBody.data;

    const publicLinkRef = db.collection("publicLinks").doc(token);
    const publicLinkDoc = await publicLinkRef.get();

    if (!publicLinkDoc.exists) {
      res.status(404).json({ error: { message: "Exam not found or link is invalid" } });
      return;
    }

    const { examId } = publicLinkDoc.data() as { examId: string };
    const examRef = db.collection("exams").doc(examId);
    const examDoc = await examRef.get();
    const examData = examDoc.data() as Exam;

    if (!examDoc.exists || examData?.state !== "PUBLISHED") {
      res.status(403).json({ error: { message: "This exam is not accepting submissions" } });
      return;
    }

    const existingSubmission = await examRef.collection("submissions").where("respondentUid", "==", respondentUser.uid).limit(1).get();
    if (!existingSubmission.empty) {
      res.status(409).json({ error: { message: "You have already submitted answers for this exam." } });
      return;
    }

    const batch = db.batch();
    const submissionRef = examRef.collection("submissions").doc();

    const submissionPayload: Submission = {
      respondentUid: respondentUser.uid,
      respondentEmail: respondentUser.email || null,
      respondentName: respondentUser.name || null,
      examTitle: examData.title,
      state: "SUBMITTED",
      createdAt: Timestamp.now(),
      gradeState: "UNGRADED",
      manualTotalPoints: null,
      aiTotalPoints: null,
      totalPoints: null,
      definitiveSource: null,
    };
    batch.set(submissionRef, submissionPayload);

    answers.forEach((answer) => {
      const answerRef = submissionRef.collection("answers").doc(answer.questionId);
      batch.set(answerRef, { text: answer.text });
    });

    await batch.commit();

    logger.info(`New submission ${submissionRef.id} for exam ${examId} by user ${respondentUser.uid}`);
    res.status(201).json({ submissionId: submissionRef.id });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error in submit:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: "Internal Server Error" } });
    }
  }
}
