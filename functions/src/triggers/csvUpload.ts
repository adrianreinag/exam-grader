import * as logger from "firebase-functions/logger";
import { FirestoreEvent, QueryDocumentSnapshot } from "firebase-functions/v2/firestore";
import { db } from "../libs/firestore";
import { CsvUploadJob, Question, Submission } from "../models/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

export const processCsvUploadJob = async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
  if (!event.data) {
    logger.log("No data associated with the event");
    return;
  }

  const jobDoc = event.data;
  const job = jobDoc.data() as CsvUploadJob;
  const { examId, examTitle, payload } = job;

  let successfulUploads = 0;
  let skippedUploads = 0;

  try {
    await jobDoc.ref.update({ status: "PROCESSING", startedAt: Timestamp.now() });

    const examRef = db.collection("exams").doc(examId);

    const questionsSnapshot = await examRef.collection("questions").orderBy("order", "asc").get();
    const questions = questionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() as Question }));

    const submissionsRef = examRef.collection("submissions");
    const existingSubmissionsSnapshot = await submissionsRef.get();
    const existingRespondentEmails = new Set(existingSubmissionsSnapshot.docs.map((doc) => (doc.data() as Submission).respondentEmail));

    for (const row of payload) {
      const studentEmail = row.student_email;

      if (existingRespondentEmails.has(studentEmail)) {
        skippedUploads++;
        continue;
      }

      let userRecord;
      try {
        userRecord = await getAuth().getUserByEmail(studentEmail);
      } catch (e) {
        logger.warn(`User with email ${studentEmail} not found, creating submission without UID.`);
      }

      const submissionRef = submissionsRef.doc();
      const batch = db.batch();

      const hasManualGrade = typeof row.manual_total_points === "number";

      const submissionPayload: Submission = {
        respondentUid: userRecord?.uid ?? `csv_import_${studentEmail}`,
        respondentEmail: studentEmail,
        respondentName: row.student_name || userRecord?.displayName || null,
        examTitle: examTitle,
        state: "SUBMITTED",
        createdAt: Timestamp.now(),
        gradeState: hasManualGrade ? "GRADED_DRAFT" : "UNGRADED",
        manualTotalPoints: (typeof row.manual_total_points === "number") ? row.manual_total_points : null,
        aiTotalPoints: null,
        totalPoints: hasManualGrade && (typeof row.manual_total_points === "number") ? row.manual_total_points : null,
        definitiveSource: hasManualGrade ? "MANUAL" : null,
      };
      batch.set(submissionRef, submissionPayload);

      questions.forEach((question, index) => {
        const answerText = row[`pregunta_${index + 1}`] || "";
        const answerRef = submissionRef.collection("answers").doc(question.id);
        batch.set(answerRef, { text: answerText });
      });

      await batch.commit();
      successfulUploads++;
      existingRespondentEmails.add(studentEmail);
    }

    // No email is sent to the exam owner (professor) after CSV processing.

    await jobDoc.ref.update({ status: "COMPLETED", completedAt: Timestamp.now() });
    logger.info(`Successfully completed CSV upload job ${jobDoc.id}.`);
  } catch (error) {
    logger.error(`Failed to process CSV upload job ${jobDoc.id}:`, error);
    await jobDoc.ref.update({ status: "FAILED", completedAt: Timestamp.now(), error: (error as Error).message });
  }
};
