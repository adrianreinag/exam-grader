import { db } from "./firestore";
import { FieldValue } from "firebase-admin/firestore";

type OperationResult<T> = {
  already_processed: boolean;
  result?: T;
};

export async function beginIdempotentOperation<T>(operationKey: string, requestId: string): Promise<OperationResult<T>> {
  if (!requestId) {
    return { already_processed: false };
  }

  const opRef = db.collection("operations").doc(`${operationKey}:${requestId}`);
  const opDoc = await opRef.get();

  if (opDoc.exists && opDoc.data()?.status === "completed") {
    return { already_processed: true, result: opDoc.data()?.result as T };
  }

  await opRef.set({
    status: "in-progress",
    startedAt: FieldValue.serverTimestamp(),
  });

  return { already_processed: false };
}

export async function endIdempotentOperation<T>(operationKey: string, requestId: string, result: T): Promise<void> {
  if (!requestId) {
    return;
  }
  const opRef = db.collection("operations").doc(`${operationKey}:${requestId}`);
  await opRef.update({
    status: "completed",
    finishedAt: FieldValue.serverTimestamp(),
    result,
  });
}
