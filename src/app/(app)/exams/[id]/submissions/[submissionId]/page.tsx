"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useSearchParams } from "next/navigation";
import { useApi } from "@/infrastructure/api/ApiProvider";
import { toast } from "sonner";
import { Loader } from "lucide-react";

import { useSubmissionData } from './hooks/useSubmissionData';
import { CorrectionFormSchema, CorrectionFormData } from './schemas';
import { SubmissionHeader } from './components/SubmissionHeader';
import { QuestionCorrectionCard } from './components/QuestionCorrectionCard';
import { GeneralComments } from './components/GeneralComments';
import { ViewMode } from './types';

export default function SubmissionDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const apiFetch = useApi();
    const { id: examId, submissionId } = params as { id: string; submissionId: string };
    const demoQuery = searchParams.get('demo') === 'true' ? '?demo=true' : '';

    const formMethods = useForm<CorrectionFormData>({
        resolver: zodResolver(CorrectionFormSchema),
        defaultValues: { manualCommentsOverall: "", answerGrades: [] },
    });
    
    const { control, handleSubmit, watch, formState: { isSubmitting, isDirty } } = formMethods;
    const { fields } = useFieldArray({ control, name: "answerGrades" });

    const { submissionData, navigationInfo, loading, loadData } = useSubmissionData(formMethods);
    const [viewMode, setViewMode] = useState<ViewMode>('MANUAL');
    

    // Inicializa el modo de vista a partir de la fuente definitiva guardada en backend
    useEffect(() => {
        if (!submissionData) return;
        const definitive = submissionData.submission.definitiveSource;
        const aiPointsAvailable = submissionData.submission.aiTotalPoints !== null;
        const initialMode: ViewMode = definitive === 'AI' && aiPointsAvailable ? 'AI' : 'MANUAL';
        setViewMode(initialMode);
    }, [submissionData]);

    // El alto se gestiona con flex + 100dvh; no es necesario observar la altura del header
    
    const watchAnswerGrades = watch("answerGrades");
    const manualTotalPoints = watchAnswerGrades?.reduce((sum, current) => sum + (Number(current.pointsAwarded) || 0), 0) || 0;
    
    const onSaveDraft = async (data: CorrectionFormData, silent: boolean = false) => {
        const toastId = toast.loading("Guardando corrección...");
        try {
            await apiFetch("/saveDraft", {
                method: "POST",
                body: JSON.stringify({
                    examId,
                    submissionId,
                    items: data.answerGrades.map((ag, i) => ({
                        questionId: submissionData!.detailedAnswers[i].questionId,
                        pointsAwarded: ag.pointsAwarded,
                        comment: ag.comment,
                        inlineComments: ag.inlineComments || []
                    })),
                    manualCommentsOverall: data.manualCommentsOverall,
                })
            });
            // Sólo al guardar explícitamente, seleccionar la fuente definitiva según el switch actual
            if (!silent) {
                try {
                    await apiFetch('/setDefinitiveSource', {
                        method: 'POST',
                        body: JSON.stringify({ examId, submissionId, source: viewMode })
                    });
                } catch {
                    // No bloquear por fallo al fijar la fuente definitiva; se notificará abajo
                }
            }

            if (silent) {
                // Recarga en segundo plano, no bloquear
                loadData(true);
            } else {
                await loadData(false);
            }
            toast.success("Corrección guardada.", { id: toastId });
        } catch {
            toast.error("No se pudo guardar la corrección.", { id: toastId });
        }
    };

    const handleViewModeChange = (isAi: boolean) => {
        // Sólo cambia el modo de vista localmente; no guarda ni fija la fuente definitiva
        const newMode = isAi ? 'AI' : 'MANUAL';
        setViewMode(newMode);
    };
    
    if (loading) {
        return (
            <div className="h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="h-10 w-10 animate-spin mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-600">Cargando entrega...</p>
                </div>
            </div>
        );
    }

    if (!submissionData) {
        return <div className="h-screen bg-gray-50 flex items-center justify-center">Error al cargar la entrega.</div>;
    }

    const isEvaluated = submissionData.exam.state === "EVALUATED";
    const aiTotalPoints = submissionData?.submission.aiTotalPoints ?? null;
    const persistedManualTotal = submissionData?.submission.manualTotalPoints ?? null;
    const currentDefinitive = submissionData?.submission.definitiveSource ?? null;
    const definitiveTotalPoints = currentDefinitive
        ? (currentDefinitive === 'AI' ? aiTotalPoints : persistedManualTotal)
        : null;
    const pendingSourceChange = !isEvaluated && currentDefinitive !== viewMode && (viewMode === 'MANUAL' || aiTotalPoints !== null);
    const canSave = isDirty || pendingSourceChange;

    // Puntación máxima total del examen (suma de máximos por pregunta)
    const totalMaxPoints = submissionData.detailedAnswers.reduce((sum, ans) => sum + (ans.maxPoints || 0), 0);

    return (
        <form onSubmit={handleSubmit((data) => onSaveDraft(data))} className="bg-gray-50 overflow-hidden flex flex-col min-h-0" style={{ height: '100dvh' }}>
            <SubmissionHeader
                examId={examId as string}
                demoQuery={demoQuery}
                navigationInfo={navigationInfo}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                manualTotalPoints={manualTotalPoints}
                aiTotalPoints={aiTotalPoints}
                definitiveTotalPoints={definitiveTotalPoints}
                totalMaxPoints={totalMaxPoints}
                isSubmitting={isSubmitting}
                isDirty={canSave}
                isFinalized={isEvaluated}
            />

            <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth snap-y snap-mandatory">
                {fields.map((field, index) => (
                    <div key={field.id} className="min-h-full h-full snap-start">
                         <QuestionCorrectionCard
                            answer={submissionData.detailedAnswers[index]}
                            index={index}
                            viewMode={viewMode}
                            isReadOnly={isEvaluated}
                            formMethods={formMethods}
                         />
                     </div>
                 ))}
                <div className="min-h-full h-full snap-start">
                     <GeneralComments
                         submissionData={submissionData}
                         isReadOnly={isEvaluated}
                         viewMode={viewMode}
                         register={formMethods.register}
                     />
                 </div>
            </div>
        </form>
    );
}