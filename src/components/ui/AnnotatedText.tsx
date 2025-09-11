"use client";

import { useState, useRef } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { Brain, User, Plus, X, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

export interface InlineComment {
  id: string;
  startIndex: number;
  endIndex: number;
  text: string;
  source: "MANUAL" | "AI";
  createdAt: Date;
}

interface AnnotatedTextProps {
  text: string;
  manualComments: InlineComment[];
  aiComments: InlineComment[];
  onManualCommentsChange: (comments: InlineComment[]) => void;
  readOnly?: boolean;
  showSummary?: boolean;
}

export function AnnotatedText({ 
  text, 
  manualComments, 
  aiComments, 
  onManualCommentsChange,
  readOnly = false,
  showSummary = true,
}: AnnotatedTextProps) {
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number; rect?: { top: number; right: number; bottom: number; left: number; width: number; height: number } } | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [hoveredComment, setHoveredComment] = useState<{ comment: InlineComment; rect: DOMRect } | null>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Ordenar comentarios por posición para evitar solapamientos
  const sortComments = (comments: InlineComment[]) => {
    return [...comments].sort((a, b) => a.startIndex - b.startIndex);
  };

  const activeComments = sortComments(manualComments.length ? manualComments : aiComments);

  const handleTextSelection = () => {
    if (readOnly || isAddingComment) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !textRef.current) {
      setSelectedRange(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const containerElement = textRef.current;
    
    // Verificar que la selección está dentro de nuestro contenedor
    if (!containerElement.contains(range.commonAncestorContainer)) {
      setSelectedRange(null);
      return;
    }

    // Calcular índices relativos al texto completo
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(containerElement);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const startIndex = preCaretRange.toString().length;

    const selectedText = range.toString();
    const endIndex = startIndex + selectedText.length;

    if (startIndex < endIndex && selectedText.trim().length > 0) {
      // Guardar el rectángulo en coordenadas de viewport (evita recortes por overflow)
      const rect = range.getBoundingClientRect();
      setSelectedRange({ start: startIndex, end: endIndex, rect });
    } else {
      setSelectedRange(null);
    }
  };

  const handlePencilClick = () => {
    setIsAddingComment(true);
  };

  const handleAddComment = () => {
    if (!selectedRange || !newCommentText.trim()) return;

    const newComment: InlineComment = {
      id: Math.random().toString(36).substr(2, 9),
      startIndex: selectedRange.start,
      endIndex: selectedRange.end,
      text: newCommentText.trim(),
      source: "MANUAL",
      createdAt: new Date()
    };

    onManualCommentsChange([...manualComments, newComment]);
    toast.success('Comentario añadido');
    
    // Limpiar estado
    setIsAddingComment(false);
    setSelectedRange(null);
    setNewCommentText('');
    window.getSelection()?.removeAllRanges();
    
  };

  const handleCancelComment = () => {
    setIsAddingComment(false);
    setSelectedRange(null);
    setNewCommentText('');
    window.getSelection()?.removeAllRanges();
  };

  const handleDeleteComment = (commentId: string) => {
    onManualCommentsChange(manualComments.filter(c => c.id !== commentId));
    toast.success('Comentario eliminado');
  };

  const handleCommentHover = (comment: InlineComment, event: React.MouseEvent<HTMLSpanElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredComment({ comment, rect });
  };

  const renderAnnotatedText = () => {
    if (activeComments.length === 0) {
      return <span>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    activeComments.forEach((comment, index) => {
      // Texto antes del comentario
      if (comment.startIndex > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, comment.startIndex)}
          </span>
        );
      }

      // Texto comentado con estilo destacado
      const commentedText = text.slice(comment.startIndex, comment.endIndex);
      
      parts.push(
        <span
          key={`comment-${comment.id}`}
          className={
            `relative group cursor-pointer transition-colors duration-200 underline decoration-2 underline-offset-[3px] ` +
            (comment.source === 'MANUAL'
              ? 'decoration-amber-500 hover:decoration-amber-600'
              : 'decoration-sky-500 hover:decoration-sky-600')
          }
          onMouseEnter={(e) => handleCommentHover(comment, e)}
          onMouseLeave={() => setHoveredComment(null)}
        >
          {commentedText}
          {comment.source === 'MANUAL' && !readOnly && (
            <button
              aria-label="Eliminar comentario"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeleteComment(comment.id);
              }}
              className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white/90 hover:bg-white text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-full h-5 w-5 flex items-center justify-center shadow-sm"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      );

      lastIndex = Math.max(lastIndex, comment.endIndex);
    });

    // Texto después del último comentario
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-final">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <div className="space-y-4">
      {/* Controles movidos al encabezado de la respuesta en QuestionCorrectionCard */}

      {/* Texto principal */}
      <div className="relative">
        <div
          ref={textRef}
          className="text-sm leading-relaxed select-text whitespace-pre-wrap break-words max-w-full"
          onMouseUp={handleTextSelection}
        >
          {renderAnnotatedText()}
        </div>

        {/* Barra de herramientas elegante */}
        {selectedRange && !isAddingComment && !readOnly && (
          <div 
            className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl border border-gray-700 animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{
              left: selectedRange.rect ? Math.min(Math.max(selectedRange.rect.left + (selectedRange.rect.width / 2) - 60, 8), Math.max(window.innerWidth - 120 - 8, 8)) : 8,
              top: selectedRange.rect ? Math.min(Math.max(selectedRange.rect.top - 45, 8), Math.max(window.innerHeight - 45 - 8, 8)) : 8,
            }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={handlePencilClick}
                className="flex items-center gap-1 hover:bg-gray-800 px-2 py-1 rounded-md transition-all duration-150 text-sm font-medium"
              >
                <Edit3 className="h-3 w-3" />
                Comentar
              </button>
            </div>
            {/* Pequeña flecha apuntando al texto */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}

        {/* Panel de comentario mejorado */}
        {selectedRange && isAddingComment && !readOnly && (
          <div 
            className="fixed z-50 bg-white border rounded-lg shadow-xl p-4 w-96 animate-in fade-in slide-in-from-bottom-3 duration-300"
            style={{
              left: selectedRange.rect ? Math.min(Math.max(selectedRange.rect.left, 8), Math.max(window.innerWidth - 384 - 16, 8)) : 8,
              top: selectedRange.rect ? Math.min(Math.max(selectedRange.rect.bottom + 15, 8), Math.max(window.innerHeight - 220, 8)) : 8,
            }}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                  <Edit3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">Nuevo comentario</h4>
                  <p className="text-xs text-gray-500 truncate max-w-[250px]">
                    "{text.slice(selectedRange.start, selectedRange.end)}"
                  </p>
                </div>
              </div>
              <div>
                <Textarea
                  id="comment-text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Añade tu comentario sobre este fragmento..."
                  className="border-gray-300 focus:border-gray-300 focus:ring-2 focus:ring-gray-200 resize-none"
                  rows={3}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleAddComment}
                  size="sm"
                  disabled={!newCommentText.trim()}
                  className="bg-gray-900 hover:bg-gray-800 text-white border-0"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Añadir comentario
                </Button>
                <Button
                  onClick={() => {
                    setSelectedRange(null);
                    setIsAddingComment(false);
                    setNewCommentText('');
                    window.getSelection()?.removeAllRanges();
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tooltip elegante en hover */}
        {hoveredComment && (
          <div 
            className="fixed z-40 bg-white border rounded-lg shadow-lg p-3 max-w-sm pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-200"
            style={{
              left: Math.min(hoveredComment.rect.left, window.innerWidth - 280),
              top: hoveredComment.rect.bottom + 12,
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${hoveredComment.comment.source === 'MANUAL' ? 'bg-amber-600' : 'bg-sky-600'}`}>
                {hoveredComment.comment.source === 'MANUAL' ? (
                  <User className="h-3 w-3 text-white" />
                ) : (
                  <Brain className="h-3 w-3 text-white" />
                )}
              </div>
              <div className="flex-1">
                <span className="text-xs font-medium text-gray-600">
                  {hoveredComment.comment.source === 'MANUAL' ? 'Comentario Manual' : 'Sugerencia IA'}
                </span>
              </div>
              {hoveredComment.comment.source === 'MANUAL' && !readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                  onClick={() => handleDeleteComment(hoveredComment.comment.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{hoveredComment.comment.text}</p>
          </div>
        )}
      </div>

      {/* Resumen de comentarios */}
      {showSummary && (
        <div className="text-sm text-muted-foreground h-5 flex items-center">
          {(manualComments.length > 0 || aiComments.length > 0) && (
            <>
              {manualComments.length > 0 && (
                <span>{manualComments.length} comentario{manualComments.length !== 1 ? 's' : ''} manual{manualComments.length !== 1 ? 'es' : ''}</span>
              )}
              {manualComments.length > 0 && aiComments.length > 0 && <span> • </span>}
              {aiComments.length > 0 && (
                <span>{aiComments.length} comentario{aiComments.length !== 1 ? 's' : ''} de IA</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
