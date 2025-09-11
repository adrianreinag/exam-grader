"use client";

import { createContext, useContext, ReactNode, FC, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch as realApiFetch } from './client';
import { FAKE_EXAMS, FAKE_QUESTIONS, FAKE_SUBMISSIONS, FAKE_ANSWERS, FAKE_GRADES, FAKE_RESPONDED_EXAMS } from '../demo/demo-data';

type ApiFetchType = typeof realApiFetch;

const ApiContext = createContext<ApiFetchType>(realApiFetch);

const useInMemoryDatabase = () => {
    const [exams, setExams] = useState(FAKE_EXAMS);
    const [questions, setQuestions] = useState(FAKE_QUESTIONS);
    const [submissions, setSubmissions] = useState(FAKE_SUBMISSIONS);
    const [answers, setAnswers] = useState(FAKE_ANSWERS);
    const [grades, setGrades] = useState(FAKE_GRADES);
    const [publicSubmissionsByToken, setPublicSubmissionsByToken] = useState<Record<string, string | true>>({});

    return {
        exams, questions, submissions, answers, grades, publicSubmissionsByToken,
        setExams, setQuestions, setSubmissions, setAnswers, setGrades, setPublicSubmissionsByToken
    };
};

const mockApiFetch = (db: any) => async (path: string, options: RequestInit = {}) => {
    console.log(`[DEMO API] Path: ${path}`, options);
    const body = options.body ? JSON.parse(options.body as string) : {};
    
    await new Promise(res => setTimeout(res, 300 + Math.random() * 500));

    const url = new URL(path, "http://localhost");
    const examIdFromQuery = url.searchParams.get("examId");
    const submissionIdFromQuery = url.searchParams.get("submissionId");
    
    const examId = body.examId || examIdFromQuery;
    const submissionId = body.submissionId || submissionIdFromQuery;

    switch (url.pathname) {
        case "/listExams": {
            const limitParam = Number(url.searchParams.get("limit") || 20);
            const limit = Math.max(1, Math.min(50, Number.isFinite(limitParam) ? limitParam : 20));
            const cursorId = url.searchParams.get("cursor");

            const examsArr = Object.values(db.exams) as any[];
            const sorted = [...examsArr].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            let startIndex = 0;
            if (cursorId) {
                const idx = sorted.findIndex((e: any) => e.id === cursorId);
                if (idx >= 0) startIndex = idx + 1;
            }

            const page = sorted.slice(startIndex, startIndex + limit);
            const hasMore = startIndex + limit < sorted.length;
            const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].id : null;

            const minimal = page.map((e: any) => ({
                id: e.id,
                title: e.title,
                state: e.state,
                createdAt: e.createdAt,
                questionsCount: e.questionsCount || 0,
            }));

            return { exams: minimal, nextCursor };
        }

        case "/listRespondedExams":
            return { exams: FAKE_RESPONDED_EXAMS };

        case "/getExam":
            return {
                exam: db.exams[examId],
                questions: db.questions[examId] || [],
            };

        case "/createExam": {
            const newId = `demo-exam-${Math.floor(Math.random() * 1000000)}`;
            const newExam = {
                id: newId,
                ownerUid: "demo-user-123",
                title: body.title || "Nuevo Examen",
                description: "",
                state: "DRAFT",
                createdAt: new Date().toISOString(),
                publicToken: null,
                questionsCount: 0,
                maxTotalPoints: 0,
            };
            db.setExams((current: any) => ({ ...current, [newId]: newExam }));
            db.setQuestions((current: any) => ({ ...current, [newId]: [] }));
            return { examId: newId };
        }

        case "/deleteExam": {
            const subs = db.submissions[examId] || [];
            db.setExams((current: any) => { const { [examId]: _x, ...rest } = current; return rest; });
            db.setQuestions((current: any) => { const { [examId]: _x, ...rest } = current; return rest; });
            db.setSubmissions((current: any) => { const { [examId]: _x, ...rest } = current; return rest; });
            db.setAnswers((current: any) => { const next = { ...current }; subs.forEach((s: any) => delete next[s.id]); return next; });
            db.setGrades((current: any) => { const next = { ...current }; subs.forEach((s: any) => delete next[s.id]); return next; });
            return { success: true };
        }

        case "/updateExam": {
            const patch = body.patch || {};
            const prevExam = db.exams[examId] || {};
            let questionsForExam = db.questions[examId] || [];
            if (Array.isArray(patch.questions)) {
                const newQuestions = patch.questions.map((q: any, index: number) => ({
                    id: q.id || `q-${Math.random().toString(36).slice(2, 8)}`,
                    examId,
                    order: index,
                    text: q.text,
                    maxPoints: Number(q.maxPoints),
                    rubricText: q.rubricText,
                }));
                questionsForExam = newQuestions;
                db.setQuestions((current: any) => ({ ...current, [examId]: newQuestions }));
            }
            const questionsCount = questionsForExam.length;
            const maxTotalPoints = questionsForExam.reduce((sum: number, q: any) => sum + (Number(q.maxPoints) || 0), 0);
            db.setExams((current: any) => ({
                ...current,
                [examId]: {
                    ...prevExam,
                    title: patch.title ?? prevExam.title,
                    description: patch.description ?? prevExam.description,
                    questionsCount,
                    maxTotalPoints,
                }
            }));
            return { success: true };
        }

        case "/publishExam": {
            db.setExams((current: any) => {
                const prev = current[examId];
                const token = prev?.publicToken || `demo-token-${examId}`;
                return { ...current, [examId]: { ...prev, state: "PUBLISHED", publicToken: token } };
            });
            return { success: true };
        }
        
        case "/listSubmissions":
            return { submissions: db.submissions[examId] || [] };
        
        case "/getSubmission": {
            const submission = db.submissions[examId]?.find((s: any) => s.id === submissionId);
            const grade = db.grades[submissionId];
            return {
                submission,
                grade: grade ? { ...grade, answerGrades: undefined } : null,
                detailedAnswers: (db.answers[submissionId] || []).map((ans: any) => ({
                    questionId: ans.questionId,
                    answerText: ans.text,
                    questionText: db.questions[examId]?.find((q: any) => q.id === ans.questionId)?.text,
                    maxPoints: db.questions[examId]?.find((q: any) => q.id === ans.questionId)?.maxPoints,
                    rubricText: db.questions[examId]?.find((q: any) => q.id === ans.questionId)?.rubricText,
                    grade: grade?.answerGrades?.[ans.questionId] || null,
                }))
            };
        }

        case "/saveDraft": {
            const items = body.items || [];
            const commentsOverall = (body.manualCommentsOverall ?? body.commentsOverall) || "";
            const manualTotalPoints = items.reduce((sum: number, it: any) => sum + (Number(it.pointsAwarded) || 0), 0);
            const prevGrade = db.grades[submissionId] || {};
            const answerGrades = items.reduce((acc: any, it: any) => {
                acc[it.questionId] = {
                    manualPoints: Number(it.pointsAwarded) || 0,
                    manualComment: it.comment || "",
                    aiSuggestedPoints: prevGrade?.answerGrades?.[it.questionId]?.aiSuggestedPoints ?? null,
                    aiSuggestedComment: prevGrade?.answerGrades?.[it.questionId]?.aiSuggestedComment ?? null,
                };
                return acc;
            }, {} as any);
            db.setGrades((current: any) => ({
                ...current,
                [submissionId]: {
                    state: "GRADED_DRAFT",
                    manualTotalPoints,
                    aiTotalPoints: prevGrade.aiTotalPoints ?? null,
                    manualCommentsOverall: commentsOverall,
                    definitiveSource: prevGrade.definitiveSource ?? "MANUAL",
                    answerGrades,
                }
            }));
            db.setSubmissions((current: any) => ({
                ...current,
                [examId]: (current[examId] || []).map((s: any) => s.id === submissionId ? {
                    ...s,
                    gradeState: "GRADED_DRAFT",
                    manualTotalPoints,
                } : s)
            }));
            return { success: true };
        }

        case "/setDefinitiveSource": {
            const source = body.source === 'AI' ? 'AI' : 'MANUAL';
            db.setSubmissions((current: any) => ({
                ...current,
                [examId]: (current[examId] || []).map((s: any) => {
                    if (s.id !== submissionId) return s;
                    const chosen = source === 'AI' ? s.aiTotalPoints : s.manualTotalPoints;
                    return { ...s, definitiveSource: source, totalPoints: chosen };
                })
            }));
            return { success: true };
        }

        case "/calculateComparisonStats": {
            const subs = (db.submissions[examId] || []).filter((s: any) => s.manualTotalPoints !== null && s.aiTotalPoints !== null);
            const n = subs.length;
            if (n === 0) return { message: "No hay datos suficientes para comparar." };
            const xs = subs.map((s: any) => Number(s.manualTotalPoints));
            const ys = subs.map((s: any) => Number(s.aiTotalPoints));
            const sum = (arr: number[]) => arr.reduce((a: number, b: number) => a + b, 0);
            const mean = (arr: number[]) => sum(arr) / arr.length;
            const mx = mean(xs); const my = mean(ys);
            const std = (arr: number[], m: number) => Math.sqrt(arr.reduce((acc: number, v: number) => acc + Math.pow(v - m, 2), 0) / arr.length);
            const sx = std(xs, mx); const sy = std(ys, my);
            const cov = xs.reduce((acc: number, x: number, i: number) => acc + ((x - mx) * (ys[i] - my)), 0) / xs.length;
            const corr = (sx === 0 || sy === 0) ? 0 : (cov / (sx * sy));
            const discrepancies = subs
                .map((s: any) => ({
                    submissionId: s.id,
                    respondentName: s.respondentName,
                    professorPoints: s.manualTotalPoints,
                    aiPoints: s.aiTotalPoints,
                    diff: Math.abs(Number(s.manualTotalPoints) - Number(s.aiTotalPoints)),
                }))
                .sort((a: any, b: any) => b.diff - a.diff)
                .slice(0, 10);
            return {
                stats: {
                    professorMean: mx,
                    aiMean: my,
                    professorStdDev: sx,
                    aiStdDev: sy,
                    correlation: corr,
                    discrepancies,
                }
            };
        }

        case "/getPublicExam": {
            const token = url.searchParams.get("token") || body.token;
            const examsArr = Object.values(db.exams) as any[];
            const exam = examsArr.find((e: any) => e.publicToken === token && e.state === "PUBLISHED");
            if (!exam) {
                throw new Error("404 Not Found");
            }
            return {
                exam: { title: exam.title, description: exam.description },
                questions: (db.questions[exam.id] || []).map((q: any) => ({ id: q.id, text: q.text, maxPoints: q.maxPoints }))
            };
        }

        case "/publicSubmit": {
            const token = body.token;
            const examsArr = Object.values(db.exams) as any[];
            const exam = examsArr.find((e: any) => e.publicToken === token && e.state === "PUBLISHED");
            if (!exam) {
                throw new Error("404 Not Found");
            }
            if (db.publicSubmissionsByToken?.[token]) {
                // Simulate 409 Conflict for duplicate submissions from the same invite link
                throw new Error("409 Conflict: duplicate submission");
            }
            const newSubmissionId = `sub-${Math.random().toString(36).slice(2, 10)}`;
            const newSubmission = {
                id: newSubmissionId,
                examId: exam.id,
                respondentName: "Participante Demo",
                respondentEmail: "anon@demo.local",
                createdAt: new Date().toISOString(),
                gradeState: "UNGRADED",
                manualTotalPoints: null,
                aiTotalPoints: null,
                definitiveSource: null,
                totalPoints: null,
            };
            db.setSubmissions((current: any) => ({ ...current, [exam.id]: [...(current[exam.id] || []), newSubmission] }));
            const answers = (body.answers || []).map((a: any) => ({ questionId: a.questionId, text: a.text }));
            db.setAnswers((current: any) => ({ ...current, [newSubmissionId]: answers }));
            db.setPublicSubmissionsByToken((current: any) => ({ ...current, [token]: newSubmissionId }));
            return { submissionId: newSubmissionId };
        }

        case "/finalize": {
            const before = db.submissions[examId] || [];
            const updated = before.map((s: any) => s.gradeState === 'GRADED_DRAFT' ? { ...s, gradeState: 'GRADED_FINAL' } : s);
            const sent = before.filter((s: any) => s.gradeState === 'GRADED_DRAFT').length;
            const skipped = before.length - sent;
            db.setSubmissions((current: any) => ({ ...current, [examId]: updated }));
            db.setExams((current: any) => ({
                ...current,
                [examId]: {
                    ...current[examId],
                    state: "EVALUATED",
                    publicToken: null,
                    finalizedAt: new Date().toISOString(),
                }
            }));
            return { sent, skipped };
        }

        case "/gradeIa":
            console.log(`[DEMO] Simulating AI grading for exam ${examId}`);
            setTimeout(() => {
                const submissionsForExam = db.submissions[examId];
                if (!submissionsForExam) return;

                const updatedSubmissions = submissionsForExam.map((s: any) => {
                    if (s.aiTotalPoints === null) {
                        const maxPoints = db.exams[examId]?.maxTotalPoints || (FAKE_EXAMS[examId as keyof typeof FAKE_EXAMS]?.maxTotalPoints) || 100;
                        const simulatedAIPoints = Math.round(s.manualTotalPoints !== null ? s.manualTotalPoints * (0.8 + Math.random() * 0.4) : Math.random() * maxPoints);
                        return { ...s, aiTotalPoints: Math.min(simulatedAIPoints, maxPoints) };
                    }
                    return s;
                });
                db.setSubmissions((current: any) => ({...current, [examId]: updatedSubmissions}));
                 console.log(`[DEMO] AI grading finished for exam ${examId}`);
            }, 5000);
            return { success: true, message: "AI suggestion generation has been scheduled." };
        
        default:
            console.warn(`[DEMO API] Unhandled path: ${path}`);
            return { success: true };
    }
};

interface ApiProviderProps {
  children: ReactNode;
  value?: ApiFetchType;
}

export const ApiProvider: FC<ApiProviderProps> = ({ children, value }) => {
  const params = useSearchParams();
  const isDemoMode = params.get('demo') === 'true';
  const db = useInMemoryDatabase();
  
  const realValue = value || (isDemoMode ? mockApiFetch(db) : realApiFetch);

  return (
    <ApiContext.Provider value={realValue}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => useContext(ApiContext);