import React from 'react';
import { motion } from 'framer-motion';
import { UseFormReturn } from 'react-hook-form';
import { AnswerDisplay } from './AnswerDisplay';
import { CorrectionPanel } from './CorrectionPanel';
import { CorrectionFormData } from '../schemas';
import { ViewMode, DetailedAnswer } from '../types';
import { Edit3 } from 'lucide-react';

interface QuestionCorrectionCardProps {
    answer: DetailedAnswer;
    index: number;
    viewMode: ViewMode;
    isReadOnly: boolean;
    formMethods: UseFormReturn<CorrectionFormData>;
}

export function QuestionCorrectionCard({ answer, index, viewMode, isReadOnly, formMethods }: QuestionCorrectionCardProps) {
    const { register, watch, getValues, reset } = formMethods;

    const watchAnswerGrades = watch("answerGrades");
    const currentPoints = viewMode === 'AI'
        ? answer.grade?.aiSuggestedPoints
        : watchAnswerGrades?.[index]?.pointsAwarded;
    const currentManualInline = watchAnswerGrades?.[index]?.inlineComments || [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`h-full bg-gray-50 flex flex-col overflow-hidden ${index > 0 ? 'border-t border-gray-100' : ''}`}
        >
            <div className="flex flex-1 min-h-0 gap-6 flex-col lg:flex-row w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <div className="flex-1">
                    <div className="p-6 bg-white border border-gray-200 rounded-md flex flex-col h-full min-h-0">
                        <div className="flex flex-col gap-6 h-full">
                            <div className="flex flex-col">
                                <div className="mb-3 flex-shrink-0">
                                    <h2 className="text-sm font-medium text-gray-700">Pregunta {index + 1}</h2>
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-base font-semibold text-gray-900 mb-2">Enunciado</h3>
                                    <div className="text-gray-800 text-sm leading-relaxed">
                                        {answer.questionText}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col flex-1 min-h-0">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-gray-900">Respuesta del Estudiante</h3>
                                    {!isReadOnly && viewMode === 'MANUAL' && (
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <Edit3 className="h-3 w-3" />
                                            Selecciona texto para comentar
                                        </div>
                                    )}
                                    {viewMode === 'AI' && (
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            {`${answer.grade?.aiInlineComments?.length ?? 0} comentarios de IA`}
                                        </div>
                                    )}
                                </div>
                                <div className={`flex-1 min-h-0 ${viewMode === 'MANUAL' ? 'allow-selection select-text' : ''}`}>
                                    <AnswerDisplay
                                        answerText={answer.answerText}
                                        manualComments={currentManualInline}
                                        aiComments={answer.grade?.aiInlineComments || []}
                                        viewMode={viewMode}
                                        isReadOnly={isReadOnly}
                                        onManualCommentsChange={(comments) => {
                                            const form = getValues();
                                            if (form.answerGrades[index]) {
                                                form.answerGrades[index].inlineComments = comments;
                                                reset(form, { keepDirty: true });
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-full lg:w-96 flex-shrink-0">
                    <div className="p-6 bg-white border border-gray-200 rounded-md flex flex-col h-full min-h-0">
                        <div className="mb-3 flex-shrink-0">
                            <h3 className="text-sm font-medium text-gray-700">Corrección {viewMode === 'AI' ? 'IA' : 'Manual'}</h3>
                        </div>
                        <div className="flex-1 min-h-0 flex flex-col overflow-visible">
                             <CorrectionPanel
                                answer={answer}
                                index={index}
                                viewMode={viewMode}
                                isReadOnly={isReadOnly}
                                register={register}
                             />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}