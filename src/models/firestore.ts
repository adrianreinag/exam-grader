export interface ComparisonJob {
    ownerUid: string;
    examId: string;
    status: "PENDING" | "COMPLETED" | "FAILED";
    // createdAt y completedAt serían objetos Timestamp en backend, pero string (ISO) o Date en frontend
    createdAt: { seconds: number; nanoseconds: number; };
    completedAt?: { seconds: number; nanoseconds: number; };
    stats?: {
        professorMean: number;
        aiMean: number;
        professorStdDev: number;
        aiStdDev: number;
        correlation: number;
        discrepancies: {
            submissionId: string;
            respondentName: string | null;
            professorPoints: number;
            aiPoints: number;
            diff: number;
        }[];
    };
}