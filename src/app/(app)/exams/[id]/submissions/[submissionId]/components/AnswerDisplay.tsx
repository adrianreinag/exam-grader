import React from 'react';
import { AnnotatedText, InlineComment } from "@/components/ui/AnnotatedText";
import { MessageSquare } from 'lucide-react';
import { ViewMode } from '../types';

interface AnswerDisplayProps {
    answerText: string;
    manualComments: InlineComment[];
    aiComments: InlineComment[];
    viewMode: ViewMode;
    isReadOnly: boolean;
    onManualCommentsChange: (comments: InlineComment[]) => void;
}

export function AnswerDisplay({ answerText, manualComments, aiComments, viewMode, isReadOnly, onManualCommentsChange }: AnswerDisplayProps) {
    if (!answerText) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-sm italic text-gray-500">El estudiante no respondió esta pregunta</p>
            </div>
        );
    }
    
    return (
        <div className="h-full w-full min-w-0 overflow-y-auto whitespace-pre-wrap break-words">
            <AnnotatedText
                text={answerText}
                manualComments={viewMode === 'MANUAL' ? manualComments : []}
                aiComments={viewMode === 'AI' ? aiComments : []}
                onManualCommentsChange={onManualCommentsChange}
                readOnly={isReadOnly || viewMode === 'AI'}
                showSummary={false}
            />
        </div>
    );
}