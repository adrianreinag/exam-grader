import React from 'react';
import { motion } from 'framer-motion';
import { UseFormRegister } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownText } from '@/components/ui/MarkdownText';
import { CorrectionFormData } from '../schemas';
import { SubmissionData, ViewMode } from '../types';

interface GeneralCommentsProps {
    submissionData: SubmissionData | null;
    isReadOnly: boolean;
    viewMode: ViewMode;
    register: UseFormRegister<CorrectionFormData>;
}

export function GeneralComments({ submissionData, isReadOnly, viewMode, register }: GeneralCommentsProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full bg-gray-50 flex flex-col overflow-hidden"
        >
            <div className="flex-1 min-h-0 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <div className="p-6 bg-white border border-gray-200 rounded-md flex flex-col h-full min-h-0">
                    <div className="mb-3 flex-shrink-0">
                        <h2 className="text-sm font-medium text-gray-700">Comentarios generales</h2>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col overflow-visible">
                        {viewMode === 'MANUAL' ? (
                            <>
                                <Label htmlFor="comments-overall" className="text-base font-semibold text-gray-900 mb-3">
                                    Comentario general
                                </Label>
                                <Textarea
                                    id="comments-overall"
                                    containerClassName="flex-1 min-h-0 h-full"
                                    {...register("manualCommentsOverall")}
                                    className="h-full w-full min-h-0 overflow-auto resize-none text-sm leading-relaxed focus:ring-2 focus:ring-gray-200 focus:border-gray-300 bg-gray-50"
                                    placeholder="Escribe un comentario general sobre el desempeño del estudiante..."
                                    readOnly={isReadOnly}
                                    disabled={isReadOnly}
                                />
                            </>
                        ) : (
                            <>
                                <Label className="text-base font-semibold text-gray-900 mb-3">
                                    Comentario general (IA)
                                </Label>
                                <div className="h-full w-full min-h-0 overflow-auto rounded-md border bg-gray-50 px-3 py-2">
                                    <MarkdownText
                                        text={submissionData?.grade?.aiCommentsOverall ?? submissionData?.grade?.commentsOverall ?? 'Sin comentario general de IA disponible.'}
                                        className="text-gray-800 text-sm leading-relaxed"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}