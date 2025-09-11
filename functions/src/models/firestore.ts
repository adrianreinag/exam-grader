import { Timestamp } from "firebase-admin/firestore";

export interface Exam {
  ownerUid: string;
  title: string;
  description: string | null;
  state: "DRAFT" | "PUBLISHED" | "EVALUATED";
  createdAt: Timestamp;
  publishedAt?: Timestamp;
  finalizedAt?: Timestamp;
  publicToken?: string;
  questionsCount?: number;
  maxTotalPoints?: number;
  definitiveGradeSource?: "MANUAL" | "AI";
}

export interface Question {
  order: number;
  text: string;
  maxPoints: number;
  rubricText: string;
}

export interface Submission {
  respondentUid: string;
  respondentEmail: string | null;
  respondentName: string | null;
  examTitle: string;
  state: "SUBMITTED";
  createdAt: Timestamp;
  gradeState: "UNGRADED" | "GRADED_DRAFT" | "GRADED_FINAL";
  totalPoints: number | null;
  definitiveSource: "MANUAL" | "AI" | null;
  manualTotalPoints: number | null;
  aiTotalPoints: number | null;
  gradingMethod?: "AI" | "MANUAL";
}

export interface Answer {
  text: string;
}

export interface InlineComment {
  id: string;
  startIndex: number;
  endIndex: number;
  text: string;
  source: "MANUAL" | "AI";
  createdAt: Date;
}

export interface AnswerGrade {
  manualPoints: number | null;
  manualComment: string | null;
  manualInlineComments: InlineComment[];
  aiSuggestedPoints: number | null;
  aiSuggestedComment: string | null;
  aiInlineComments: InlineComment[];
}

export interface Grade {
  state: "GRADED_DRAFT" | "GRADED_FINAL";
  manualTotalPoints: number | null;
  aiTotalPoints: number | null;
  manualCommentsOverall: string | null;
  aiCommentsOverall: string | null;
  /** @deprecated Use manualCommentsOverall/aiCommentsOverall instead */
  commentsOverall?: string | null;
  updatedAt: Timestamp;
  finalizedAt?: Timestamp;
  definitiveSource: "MANUAL" | "AI" | null;
}

export interface GradingJob {
  ownerUid: string;
  ownerEmail: string;
  examId: string;
  examTitle: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: Timestamp;
  completedAt?: Timestamp;
  /** Optional AI grading mode to influence tone/strictness of the model. Defaults to 'NEUTRAL' when absent. */
  mode?: "NEUTRAL" | "STRICT" | "LENIENT";
}

export interface CsvUploadJob {
    ownerUid: string;
    ownerEmail: string;
    examId: string;
    examTitle: string;
    status: "PENDING" | "COMPLETED" | "FAILED";
    createdAt: Timestamp;
    completedAt?: Timestamp;
    payload: {
        student_email: string;
        student_name?: string;
        [key: string]: string | undefined;
    }[];
}

export interface User {
    uid: string;
    email: string;
    name: string | null;
    openaiApiKey?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
