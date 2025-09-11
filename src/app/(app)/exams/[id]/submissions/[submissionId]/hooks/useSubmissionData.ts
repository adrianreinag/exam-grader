import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useApi } from '@/infrastructure/api/ApiProvider';
import { toast } from 'sonner';
import { UseFormReturn } from 'react-hook-form';
import { CorrectionFormData } from '../schemas';
import { SubmissionData, DetailedAnswer, NavigationInfo } from '../types';

export function useSubmissionData(formMethods: UseFormReturn<CorrectionFormData>) {
    const params = useParams();
    const apiFetch = useApi();
    const { id: examId, submissionId } = params as { id: string; submissionId: string };
    
    const [submissionData, setSubmissionData] = useState<SubmissionData | null>(null);
    const [navigationInfo, setNavigationInfo] = useState<NavigationInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const { reset } = formMethods;

    const loadData = useCallback(async (silent: boolean = false) => {
        if (!examId || !submissionId) return;
        const toggleLoading = !silent;
        if (toggleLoading) setLoading(true);
        try {
            const data = await apiFetch(`/getSubmission?examId=${examId}&submissionId=${submissionId}`);
            setSubmissionData(data);
            
            reset({
                manualCommentsOverall: data.grade?.manualCommentsOverall ?? data.grade?.commentsOverall ?? "",
                answerGrades: data.detailedAnswers.map((a: DetailedAnswer) => ({
                    pointsAwarded: a.grade?.manualPoints ?? 0,
                    comment: a.grade?.manualComment ?? "",
                    inlineComments: (a.grade?.manualInlineComments || []).map((c: any) => ({
                        ...c,
                        createdAt: c?.createdAt ? new Date(c.createdAt) : new Date(),
                    })),
                })),
            });

            try {
                const listData = await apiFetch(`/listSubmissions?examId=${examId}&limit=50`);
                const submissions = listData.submissions;
                const currentIndex = submissions.findIndex((s: any) => s.id === submissionId);

                if (currentIndex !== -1) {
                    const prev = currentIndex > 0 ? submissions[currentIndex - 1] : null;
                    const next = currentIndex < submissions.length - 1 ? submissions[currentIndex + 1] : null;
                    setNavigationInfo({
                        currentIndex: currentIndex + 1,
                        total: submissions.length,
                        previous: prev ? { id: prev.id, name: prev.respondentName || 'Anónimo' } : null,
                        next: next ? { id: next.id, name: next.respondentName || 'Anónimo' } : null,
                    });
                }
            } catch (e) {
                console.error("Failed to load navigation data", e);
                setNavigationInfo(null);
            }

        } catch (err) {
            toast.error("Error al cargar los datos de la entrega.");
        } finally {
            if (toggleLoading) setLoading(false);
        }
    }, [examId, submissionId, apiFetch, reset]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return { submissionData, navigationInfo, loading, loadData };
}