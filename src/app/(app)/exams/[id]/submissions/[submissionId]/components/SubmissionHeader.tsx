import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader, ArrowLeft, ChevronLeft, ChevronRight, Brain, User, Save, Eye } from 'lucide-react';
import { NavigationInfo, ViewMode } from '../types';

interface SubmissionHeaderProps {
    examId: string;
    demoQuery: string;
    navigationInfo: NavigationInfo | null;
    viewMode: ViewMode;
    onViewModeChange: (isAi: boolean) => void;
    manualTotalPoints: number;
    aiTotalPoints: number | null;
    definitiveTotalPoints: number | null;
    totalMaxPoints: number;
    isSubmitting: boolean;
    isDirty: boolean;
    isFinalized: boolean;
}

export function SubmissionHeader({
    examId,
    demoQuery,
    navigationInfo,
    viewMode,
    onViewModeChange,
    manualTotalPoints,
    aiTotalPoints,
    definitiveTotalPoints,
    totalMaxPoints,
    isSubmitting,
    isDirty,
    isFinalized,
}: SubmissionHeaderProps) {
    const currentTotal = viewMode === 'AI' ? (aiTotalPoints ?? 0) : manualTotalPoints;
    return (
        <div className="sticky top-0 z-40 bg-white border-b flex-shrink-0">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-2">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                    <div className="flex items-center gap-4">
                        <Link href={`/exams/${examId}${demoQuery}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Volver al Examen
                        </Link>
                    </div>

                    {navigationInfo && (
                        <div className="flex items-center gap-3 justify-self-center">
                            {navigationInfo.previous ? (
                                <Link href={`/exams/${examId}/submissions/${navigationInfo.previous.id}${demoQuery}`}>
                                    <Button variant="ghost" size="sm" className="h-8 px-2">
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <Button variant="ghost" size="sm" className="h-8 px-2" disabled>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="text-xs text-gray-500">
                                Entrega <span className="font-semibold text-gray-900">{navigationInfo.currentIndex}</span> de {navigationInfo.total}
                            </div>
                            {navigationInfo.next ? (
                                <Link href={`/exams/${examId}/submissions/${navigationInfo.next.id}${demoQuery}`}>
                                    <Button variant="ghost" size="sm" className="h-8 px-2">
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <Button variant="ghost" size="sm" className="h-8 px-2" disabled>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-4 justify-self-end">
                        <div className="flex items-center gap-2.5">
                            <Label htmlFor="source-switch" className="font-medium text-gray-700 text-sm">
                                <User className="h-4 w-4 mr-1 inline-block" />
                                Manual
                            </Label>
                            <Switch
                                id="source-switch"
                                checked={viewMode === 'AI'}
                                onCheckedChange={onViewModeChange}
                                disabled={aiTotalPoints === null}
                            />
                            <Label htmlFor="source-switch" className="font-medium text-gray-700 text-sm">
                                <Brain className="h-4 w-4 mr-1 inline-block" />
                                IA
                            </Label>
                        </div>

                        {isFinalized ? (
                            <div className="px-2.5 py-1 rounded-md border border-red-100 text-red-600 bg-red-50/60 text-xs flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                Solo lectura
                            </div>
                        ) : (
                             <Button type="submit" disabled={isSubmitting || !isDirty} className="h-8 px-3 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-sm">
                                {isSubmitting ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {isDirty ? "Guardar" : "Guardado"} {currentTotal} / {totalMaxPoints}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}