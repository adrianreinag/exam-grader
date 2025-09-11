import { db } from "./firestore";
import { DecodedIdToken } from "firebase-admin/auth";
import { DocumentData } from "firebase-admin/firestore";

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function assertIsOwner(user: DecodedIdToken, examId: string): Promise<DocumentData> {
  const examRef = db.collection("exams").doc(examId);
  const examDoc = await examRef.get();

  if (!examDoc.exists) {
    throw new HttpError(404, "Exam not found");
  }

  const examData = examDoc.data();
  if (examData?.ownerUid !== user.uid) {
    throw new HttpError(403, "Forbidden: You are not the owner of this exam");
  }

  return examData;
}

export function assertIsDraft(examData: DocumentData) {
  if (examData.state !== "DRAFT") {
    throw new HttpError(409, "Conflict: Exam is not in DRAFT state and cannot be modified");
  }
}
