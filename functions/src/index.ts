import { onRequest, Request } from "firebase-functions/v2/https";
import { Response } from "express";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { withCors } from "./libs/cors";
import { withSecurityHeaders } from "./libs/securityHeaders";
import { createExamHandler } from "./api/exams.create";
import { getExamHandler } from "./api/exams.get";
import { updateExamHandler } from "./api/exams.update";
import { publishExamHandler } from "./api/exams.publish";
import { getPublicExamHandler } from "./api/public.exam.get";
import { publicSubmitHandler } from "./api/public.submit";
import { gradeIaHandler } from "./api/grading.ia";
import { listSubmissionsHandler } from "./api/grading.submissions.list";
import { getSubmissionHandler } from "./api/grading.submission.get";
import { saveDraftHandler } from "./api/grading.save-draft";
import { finalizeHandler } from "./api/grading.finalize";
import { listExamsHandler } from "./api/exams.list";
import { listRespondedExamsHandler } from "./api/exams.responded.list";
import { finalizeExamHandler } from "./api/exams.finalize";
import { setExamDefinitiveSourceHandler } from "./api/exams.set-definitive-source";
import { processGradingJob } from "./triggers/grading";
import { calculateComparisonStatsHandler } from "./api/grading.calculate-stats";
import { deleteExamHandler } from "./api/exams.delete";
import { uploadSubmissionsCsvHandler } from "./api/uploadSubmissionsCsv";
import { processCsvUploadJob } from "./triggers/csvUpload";
import { setDefinitiveSourceHandler } from "./api/grading.set-source";
import { exportGradesToCsvHandler } from "./api/exportGradesToCsv";
import { clearAllGradesHandler } from "./api/clearAllGrades";
import { getUserSettings, updateUserSettings, checkApiKeyStatus } from "./api/user.settings";

const pingHandler = (req: Request, res: Response) => {
  logger.info("Ping received!", { structuredData: true });
  res.status(200).json({ message: "pong" });
};

export const ping = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(pingHandler)));
export const createExam = onRequest({ region: "europe-west1", secrets: ["OPENAI_API_KEY", "RESEND_API_KEY", "CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(createExamHandler)));
export const getExam = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(getExamHandler)));
export const updateExam = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(updateExamHandler)));
export const publishExam = onRequest({ region: "europe-west1", secrets: ["PUBLIC_BASE_URL", "CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(publishExamHandler)));
export const deleteExam = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(deleteExamHandler)));
export const getPublicExam = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(getPublicExamHandler)));
export const publicSubmit = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(publicSubmitHandler)));
export const gradeIa = onRequest({ region: "europe-west1", secrets: ["OPENAI_API_KEY", "CORS_ALLOWED_ORIGINS", "RESEND_API_KEY", "PUBLIC_BASE_URL"] }, withCors(withSecurityHeaders(gradeIaHandler)));
export const calculateComparisonStats = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(calculateComparisonStatsHandler)));
export const uploadSubmissionsCsv = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(uploadSubmissionsCsvHandler)));
export const exportGradesToCsv = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(exportGradesToCsvHandler)));
export const clearAllGrades = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(clearAllGradesHandler)));
export const listSubmissions = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(listSubmissionsHandler)));
export const getSubmission = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(getSubmissionHandler)));
export const saveDraft = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(saveDraftHandler)));
export const setDefinitiveSource = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(setDefinitiveSourceHandler)));
export const finalize = onRequest({ region: "europe-west1", secrets: ["RESEND_API_KEY", "CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(finalizeHandler)));
export const listExams = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(listExamsHandler)));
export const listRespondedExams = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(listRespondedExamsHandler)));
export const finalizeExam = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(finalizeExamHandler)));
export const setExamDefinitiveSource = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(setExamDefinitiveSourceHandler)));

// User Settings endpoints
export const getUserSettingsEndpoint = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(getUserSettings)));
export const updateUserSettingsEndpoint = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(updateUserSettings)));
export const checkApiKeyStatusEndpoint = onRequest({ region: "europe-west1", secrets: ["CORS_ALLOWED_ORIGINS"] }, withCors(withSecurityHeaders(checkApiKeyStatus)));

export const ongradingscheduled = onDocumentCreated(
  {
    document: "gradingJobs/{jobId}",
    region: "europe-west1",
    secrets: ["OPENAI_API_KEY", "RESEND_API_KEY", "PUBLIC_BASE_URL"],
  },
  processGradingJob
);

export const oncsvuploadscheduled = onDocumentCreated(
  {
    document: "csvUploadJobs/{jobId}",
    region: "europe-west1",
    secrets: ["RESEND_API_KEY", "PUBLIC_BASE_URL"],
  },
  processCsvUploadJob
);
