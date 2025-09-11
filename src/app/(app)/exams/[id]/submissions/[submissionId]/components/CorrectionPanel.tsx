import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { ViewMode, DetailedAnswer } from '../types';
import { CorrectionFormData } from '../schemas';

interface CorrectionPanelProps {
    answer: DetailedAnswer;
    index: number;
    viewMode: ViewMode;
    isReadOnly: boolean;
    register: UseFormRegister<CorrectionFormData>;
}

export function CorrectionPanel({ answer, index, viewMode, isReadOnly, register }: CorrectionPanelProps) {
    if (viewMode === 'MANUAL') {
        return (
            <>
                <div className="flex items-center justify-between flex-shrink-0 mb-6 gap-4">
                    <Label htmlFor={`manual-points-${index}`} className="text-base font-semibold text-gray-900">
                        Puntos Asignados
                    </Label>
                    <div className="flex items-center gap-1">
                        <Input
                            id={`manual-points-${index}`}
                            type="number"
                            max={answer.maxPoints}
                            min={0}
                            step="0.1"
                            className="w-16 h-8 px-2 text-right text-sm font-semibold focus:ring-2 focus:ring-gray-200 focus:border-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            {...register(`answerGrades.${index}.pointsAwarded`, { valueAsNumber: true, min: 0, max: answer.maxPoints })}
                            readOnly={isReadOnly}
                            disabled={isReadOnly}
                            onInput={(e) => {
                                const el = e.currentTarget;
                                const val = el.valueAsNumber;
                                if (Number.isFinite(val)) {
                                    const clamped = Math.min(Math.max(val, 0), answer.maxPoints);
                                    if (clamped !== val) el.value = String(clamped);
                                }
                            }}
                            onBlur={(e) => {
                                const el = e.currentTarget;
                                const val = el.valueAsNumber;
                                if (Number.isFinite(val)) {
                                    const clamped = Math.min(Math.max(val, 0), answer.maxPoints);
                                    if (clamped !== val) el.value = String(clamped);
                                }
                            }}
                        />
                        <span className="text-sm text-gray-500">/ {answer.maxPoints}</span>
                    </div>
                </div>
                <div className="flex-1 min-h-0 flex flex-col overflow-visible">
                    <Label htmlFor={`manual-comment-${index}`} className="text-base font-semibold text-gray-900 mb-3">
                        Comentario de Evaluación
                    </Label>
                    <Textarea
                        id={`manual-comment-${index}`}
                        containerClassName="flex-1 min-h-0 h-full"
                        className="h-full w-full min-h-0 overflow-auto resize-none text-sm leading-relaxed focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                        placeholder="Escribe tu evaluación de esta respuesta..."
                        {...register(`answerGrades.${index}.comment`)}
                        readOnly={isReadOnly}
                        disabled={isReadOnly}
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between flex-shrink-0 mb-6 gap-4">
                <Label className="text-base font-semibold text-gray-900">
                    Puntos Asignados
                </Label>
                <div className="flex items-center gap-1">
                    <Input
                        type="number"
                        value={answer.grade?.aiSuggestedPoints ?? ''}
                        readOnly
                        className="w-16 h-8 px-2 text-right text-sm font-semibold bg-gray-50 border opacity-100 cursor-default [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-readonly
                    />
                    <span className="text-sm text-gray-500">/ {answer.maxPoints}</span>
                </div>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-visible">
                <Label className="text-base font-semibold text-gray-900 mb-3">
                    Comentario de Evaluación
                </Label>
                <div className="h-full w-full min-h-0 overflow-auto rounded-md border bg-gray-50 px-3 py-2">
                    <MarkdownText
                        text={answer.grade?.aiSuggestedComment || 'Sin evaluación de IA disponible para esta respuesta.'}
                        className="text-gray-800 text-sm leading-relaxed"
                    />
                </div>
            </div>
        </>
    );
}