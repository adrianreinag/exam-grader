import { InlineComment } from "@/components/ui/AnnotatedText";

export type DetailedAnswer = {
    questionId: string;
    questionText: string;
    maxPoints: number;
    rubricText: string;
    answerText: string;
    grade: {
        manualPoints: number | null;
        manualComment: string | null;
        manualInlineComments: InlineComment[];
        aiSuggestedPoints: number | null;
        aiSuggestedComment: string | null;
        aiInlineComments: InlineComment[];
    } | null;
};

export type SubmissionData = {
    submission: {
        id: string;
        respondentName: string | null;
        aiTotalPoints: number | null;
        manualTotalPoints: number | null;
        definitiveSource: 'MANUAL' | 'AI' | null;
    };
    grade: {
      manualCommentsOverall: string | null;
      aiCommentsOverall: string | null;
      // deprecated fallback field from backend
      commentsOverall?: string | null;
    } | null;
    detailedAnswers: DetailedAnswer[];
    exam: {
        state: "DRAFT" | "PUBLISHED" | "EVALUATED";
    };
};

export type NavigationInfo = {
    currentIndex: number;
    total: number;
    previous: { id: string; name: string } | null;
    next: { id: string; name: string } | null;
};

export type ViewMode = 'MANUAL' | 'AI';