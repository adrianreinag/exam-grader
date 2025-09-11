"use client";

import { useEffect, useState, useCallback, useMemo, useRef, type ComponentType } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApi } from "@/infrastructure/api/ApiProvider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StateIndicator } from "@/components/ui/state-indicator";
import { motion, AnimatePresence } from "framer-motion";
import { translateStatus } from "@/utils/translations";
import { CsvUploader } from "@/components/ui/CsvUploader";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Bot, Send, BarChart, Copy, Loader, User, Smile, Frown, Scale, ChevronDown, Download, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useJobStatus } from "@/infrastructure/jobs/JobStatusProvider";

const QuestionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(5, { message: "El enunciado es muy corto." }),
  maxPoints: z.number().int().min(1, { message: "Debe ser al menos 1." }),
  rubricText: z.string().min(10, { message: "La rúbrica es muy corta." }),
});

const ExamFormSchema = z.object({
  title: z.string().min(3, { message: "El título es muy corto." }),
  description: z.string().optional(),
  questions: z.array(QuestionSchema).min(1, { message: "Añade al menos una pregunta." }),
});

type ExamFormData = z.infer<typeof ExamFormSchema>;
type ApiQuestion = { id: string; text: string; maxPoints: number; rubricText: string; order: number; };
type ExamData = { id: string; title: string; state: "DRAFT" | "PUBLISHED" | "EVALUATED"; publicToken: string | null; definitiveGradeSource?: "MANUAL" | "AI"; };
type Submission = {
  id: string;
  respondentName: string | null;
  createdAt: string;
  gradeState: "UNGRADED" | "GRADED_DRAFT" | "GRADED_FINAL";
  manualTotalPoints: number | null;
  aiTotalPoints: number | null;
  definitiveSource: "MANUAL" | "AI" | null;
  totalPoints: number | null;
  gradingMethod: "AI" | "MANUAL" | null;
};
type SubmissionsFilter = "ALL" | "UNCORRECTED" | "AI_GRADED" | "MANUAL_GRADED";

function DraftExamEditor({ examId, onPublishSuccess }: { examId: string; onPublishSuccess: () => void }) {
  const apiFetch = useApi();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const dashboardHref = isDemo ? "/dashboard?demo=true" : "/dashboard";
  const {
    register, control, handleSubmit, reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ExamFormData>({ resolver: zodResolver(ExamFormSchema) });

  const { fields, append, remove } = useFieldArray({ control, name: "questions" });

  const loadExam = useCallback(async () => {
    try {
        const data = await apiFetch(`/getExam?examId=${examId}`);
        reset({
          title: data.exam.title,
          description: data.exam.description || "",
          questions: data.questions.map((q: ApiQuestion) => ({...q, maxPoints: Number(q.maxPoints) })),
        });
    } catch {
        toast.error("No se pudo cargar el examen.");
    }
  }, [examId, reset, apiFetch]);
  
  useEffect(() => { loadExam(); }, [loadExam]);

  const onSaveDraft = async (data: ExamFormData) => {
    const toastId = toast.loading("Guardando borrador...");
    try {
      await apiFetch("/updateExam", {
        method: "POST",
        body: JSON.stringify({
          examId,
          patch: {
            title: data.title, 
            description: data.description,
            questions: data.questions.map((q, index) => ({ ...q, order: index })),
          },
        }),
      });
      reset(data, { keepDirty: false });
      toast.success("Borrador guardado.", { id: toastId });
    } catch { 
      toast.error("Error al guardar el borrador.", { id: toastId });
    }
  };

  const onPublish = async () => {
    if (isDirty) {
      toast.warning("Guarda los cambios antes de publicar.");
      return;
    }
    const toastId = toast.loading("Publicando examen...");
    try {
      await apiFetch("/publishExam", { method: "POST", body: JSON.stringify({ examId }) });
      toast.success("Examen publicado con éxito.", { id: toastId });
      onPublishSuccess();
    } catch { 
      toast.error("Error al publicar el examen.", { id: toastId }); 
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <form onSubmit={handleSubmit(onSaveDraft)} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
            <Link href={dashboardHref} className="flex items-center gap-2 text-sm text-primary hover:underline mb-4">
                <ArrowLeft className="h-4 w-4" />
                Volver al Dashboard
            </Link>
            <h1 className="text-3xl font-bold mb-2">Editor de Examen</h1>
            </div>
            <div className="flex items-center gap-2">
            <Button type="submit" variant="secondary" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isDirty ? 'Guardar Borrador' : 'Guardado'}
            </Button>
            <Dialog>
                <DialogTrigger asChild>
                    <Button type="button" disabled={isSubmitting || isDirty}>Publicar</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Seguro que quieres publicar?</DialogTitle>
                        <DialogDescription>
                            Una vez publicado, el examen y sus preguntas ya no podrán ser editados. Los estudiantes podrán empezar a enviar sus respuestas.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={onPublish}>Confirmar y Publicar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
        </div>

        <Card className="shadow-sm">
            <CardHeader>
            <CardTitle>Detalles del Examen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="title">Título del Examen</Label>
                <Input id="title" {...register("title")} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea id="description" {...register("description")} rows={4} />
            </div>
            </CardContent>
        </Card>

        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Preguntas</CardTitle>
            <Button type="button" onClick={() => append({ text: "", maxPoints: 10, rubricText: "" })} size="sm">
                <Plus className="mr-2 h-4 w-4" />Añadir Pregunta
            </Button>
            </CardHeader>
            <CardContent className="space-y-4">
            {errors.questions?.root && (
                <p className="text-sm text-destructive">{errors.questions.root.message}</p>
            )}
            <AnimatePresence>
                {!fields.length && (
                <div className="text-center py-10 border-2 border-dashed rounded-md bg-muted/30">
                    <p className="text-muted-foreground">Aún no hay preguntas.</p>
                    <p className="text-sm text-muted-foreground">Añade la primera para empezar a construir tu examen.</p>
                </div>
                )}
                {fields.map((field, index) => (
                <motion.div
                    key={field.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-card p-4 rounded-md border shadow-sm"
                >
                    <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Pregunta {index + 1}</h3>
                    <Button type="button" onClick={() => remove(index)} variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                    </div>
                    <div className="space-y-3">
                    <Textarea placeholder="Enunciado de la pregunta" {...register(`questions.${index}.text`)} />
                    {errors.questions?.[index]?.text && <p className="text-sm text-destructive">{errors.questions[index]?.text?.message}</p>}
                    <Input type="number" placeholder="Puntos" {...register(`questions.${index}.maxPoints`, { valueAsNumber: true })} />
                    {errors.questions?.[index]?.maxPoints && <p className="text-sm text-destructive">{errors.questions[index]?.maxPoints?.message}</p>}
                    <Textarea placeholder="Rúbrica de evaluación" {...register(`questions.${index}.rubricText`)} rows={4} />
                    {errors.questions?.[index]?.rubricText && <p className="text-sm text-destructive">{errors.questions[index]?.rubricText?.message}</p>}
                    </div>
                </motion.div>
                ))}
            </AnimatePresence>
            </CardContent>
        </Card>
      </form>
    </div>
  );
}

function PublishedExamDashboard({ examId, examData, initialSubmissions, initialNextCursor }: { examId: string, examData: ExamData, initialSubmissions?: Submission[], initialNextCursor?: string | null }) {
  const isExamEvaluated = examData.state === "EVALUATED";
  const router = useRouter();
  const apiFetch = useApi();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const demoQuery = isDemo ? '?demo=true' : '';

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/e/${examData.publicToken}` : "";
  
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions ?? []);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor ?? null);
  const [loading, setLoading] = useState(initialSubmissions === undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<SubmissionsFilter>("ALL");
  const [isConfirmingJob, setIsConfirmingJob] = useState(false);
  type AiMode = "NEUTRAL" | "STRICT" | "LENIENT";
  const [aiMode, setAiMode] = useState<AiMode>("NEUTRAL");
  const MODE_META: Record<AiMode, { label: string; description: string; icon: ComponentType<{ className?: string }> }> = {
    NEUTRAL: { label: "Equilibrado", description: "Tono profesional y equilibrado. Penaliza y recompensa con justicia.", icon: Scale },
    STRICT: { label: "Enfadado (Estricto)", description: "Exigente y severo: penaliza ambigüedades y errores; nada de puntos por aproximaciones vagas.", icon: Frown },
    LENIENT: { label: "Sonriente (Permisivo)", description: "Amable y optimista: refuerzo positivo y puntos parciales cuando haya indicios razonables.", icon: Smile },
  };
  const closeDialogButtonRef = useRef<HTMLButtonElement>(null);

  const { activeJobs, lastCompletedJobId } = useJobStatus();

  const isJobRunningForThisExam = useMemo(() => 
    activeJobs.some(job => job.examId === examId),
  [activeJobs, examId]);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/listSubmissions?examId=${examId}&limit=50`);
      setSubmissions(data.submissions);
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      console.error("Failed to load submissions:", err);
      toast.error("No se pudieron cargar las entregas.");
    } finally {
      setLoading(false);
    }
  }, [examId, apiFetch]);

  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await apiFetch(`/listSubmissions?examId=${examId}&limit=50&cursor=${encodeURIComponent(nextCursor)}`);
      setSubmissions(prev => [...prev, ...(res.submissions || [])]);
      setNextCursor(res.nextCursor ?? null);
    } catch (err) {
      toast.error("No se pudieron cargar más entregas.");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => { if (initialSubmissions === undefined) { loadSubmissions(); } }, [loadSubmissions, initialSubmissions]);
  
  useEffect(() => {
    if (lastCompletedJobId && lastCompletedJobId.startsWith(examId)) {
      toast.info('Actualizando lista de entregas...');
      loadSubmissions();
    }
  }, [lastCompletedJobId, examId, loadSubmissions]);

  const handleGenerateAISuggestions = async () => {
    setIsConfirmingJob(true);
    const toastId = toast.loading("Iniciando proceso de corrección con IA...");
    try {
      await apiFetch("/gradeIa", { method: "POST", body: JSON.stringify({ examId, mode: aiMode }) });
      toast.success("Proceso iniciado con éxito.", {
        id: toastId,
        description: "Recibirás un email cuando las sugerencias estén listas.",
      });
      closeDialogButtonRef.current?.click();
    } catch (err) {
      toast.error("Error al iniciar la generación de sugerencias.", { id: toastId });
    } finally {
      setIsConfirmingJob(false);
    }
  };

  const handleNavigate = (url: string, allowIfEvaluated: boolean = false) => {
    if (isExamEvaluated && !allowIfEvaluated) {
      toast.error("El examen está evaluado. No se permiten más modificaciones.");
      return;
    }
    router.push(`${url}${demoQuery}`);
  };

  const handleExportGrades = async () => {
    try {
      // Hacer la petición directamente con fetch para obtener el blob
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5001/exam-grader-92a7b/europe-west1' 
        : 'https://europe-west1-exam-grader-92a7b.cloudfunctions.net';
      
      const response = await fetch(`${baseUrl}/exportGradesToCsv?examId=${examId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await (await import('firebase/auth')).getAuth().currentUser?.getIdToken()}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Error al exportar');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `correcciones_${examData.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('CSV de correcciones exportado correctamente');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar las correcciones');
    }
  };

  const handleClearAllGrades = async () => {
    const toastId = toast.loading("Vaciando todas las correcciones...");
    try {
      await apiFetch("/clearAllGrades", {
        method: "POST",
        body: JSON.stringify({ examId }),
      });
      toast.success("Todas las correcciones han sido vaciadas", { id: toastId });
      loadSubmissions(); // Recargar la lista
    } catch (error) {
      toast.error("Error al vaciar las correcciones", { id: toastId });
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (filter === "ALL") return submissions;
    if (filter === "UNCORRECTED") {
      return submissions.filter(s => (s.manualTotalPoints == null) && (s.aiTotalPoints == null));
    }
    if (filter === "AI_GRADED") {
      return submissions.filter(s => s.aiTotalPoints != null);
    }
    if (filter === "MANUAL_GRADED") {
      return submissions.filter(s => s.manualTotalPoints != null);
    }
    return submissions;
  }, [submissions, filter]);

  const isReadyToFinalize = useMemo(
    () => submissions.length > 0 && submissions.every(s => s.definitiveSource !== null),
    [submissions]
  );
  const hasComparable = useMemo(() => submissions.some(s => s.manualTotalPoints !== null && s.aiTotalPoints !== null), [submissions]);
  const needsAiSuggestions = useMemo(() => submissions.length > 0 && submissions.some(s => s.aiTotalPoints === null), [submissions]);
  
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href={`/dashboard${demoQuery}`} className="flex items-center gap-2 text-sm text-primary hover:underline mb-4">
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">{examData.title}</h1>
          <StateIndicator state={examData.state}>{translateStatus(examData.state)}</StateIndicator>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {isExamEvaluated ? (
            <>
              <Button variant="secondary" className="border border-border" onClick={() => handleNavigate(`/exams/${examId}/comparison`, true)} disabled={!hasComparable}>
                <BarChart className="mr-2 h-4 w-4" />
                Comparar Correcciones
              </Button>
            </>
          ) : (
            <>
              <div className="inline-flex items-stretch rounded-md overflow-hidden border border-border shadow-sm">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="rounded-none" disabled={!needsAiSuggestions || isJobRunningForThisExam}>
                      {isJobRunningForThisExam ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                      {isJobRunningForThisExam ? 'Procesando...' : 'Generar Sugerencias IA'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Generar Sugerencias con IA</DialogTitle>
                      <DialogDescription>
                        Se iniciará un proceso en segundo plano para generar sugerencias de la IA para todas las entregas que aún no las tengan. Recibirás un email cuando termine.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 rounded-md border p-3 bg-muted/40">
                      <div className="flex items-center gap-2 font-medium">
                        {(() => { const Icon = MODE_META[aiMode].icon; return <Icon className="h-4 w-4" /> })()}
                        Modo seleccionado: {MODE_META[aiMode].label}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{MODE_META[aiMode].description}</p>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <button ref={closeDialogButtonRef} className="hidden" aria-hidden="true" />
                      </DialogClose>
                      <DialogClose asChild>
                        <Button variant="outline" disabled={isConfirmingJob}>Cancelar</Button>
                      </DialogClose>
                      <Button onClick={handleGenerateAISuggestions} disabled={isConfirmingJob}>
                        {isConfirmingJob && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar e Iniciar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-none w-9 justify-center" aria-label="Seleccionar modo IA" disabled={!needsAiSuggestions || isJobRunningForThisExam}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel>Modo de corrección IA</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {([
                      "NEUTRAL",
                      "STRICT",
                      "LENIENT",
                    ] as AiMode[]).map((m) => (
                      <DropdownMenuItem key={m} onClick={() => setAiMode(m)} className={aiMode === m ? "bg-accent/40" : undefined}>
                        {(() => { const Icon = MODE_META[m].icon; return <Icon className="h-4 w-4" /> })()}
                        <div className="flex flex-col">
                          <span className="font-medium">{MODE_META[m].label}</span>
                          <span className="text-xs text-muted-foreground">{MODE_META[m].description}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <Button variant="secondary" className="border border-border" onClick={() => handleNavigate(`/exams/${examId}/comparison`)} disabled={!hasComparable}>
                <BarChart className="mr-2 h-4 w-4" />
                Comparar Correcciones
              </Button>
              <Button onClick={() => handleNavigate(`/exams/${examId}/finalize`)} disabled={!isReadyToFinalize}>
                <Send className="mr-2 h-4 w-4" />
                Finalizar
              </Button>
            </>
          )}
        </div>
      </div>
      {isExamEvaluated ? (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
              <StateIndicator state="EVALUATED">Examen Evaluado</StateIndicator>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Este examen ha sido evaluado. No se aceptan más respuestas y el enlace de invitación ha sido desactivado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enlace de Invitación</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Comparte este enlace con los participantes.</p>
              <div className="flex gap-2">
                <Input value={publicUrl} readOnly />
                <Button onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Enlace copiado"); }} size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Subir Respuestas por Lote (CSV)</CardTitle>
            </CardHeader>
            <CardContent>
              <CsvUploader examId={examId} onUploadSuccess={loadSubmissions} />
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">Entregas Recibidas</h2>
        <div className="flex gap-2">
          <Button 
            onClick={handleExportGrades} 
            variant="outline" 
            size="sm"
            disabled={submissions.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          {!isExamEvaluated && (
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={submissions.length === 0}
                  className="text-destructive hover:text-destructive"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Vaciar Correcciones
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Vaciar todas las correcciones?</DialogTitle>
                  <DialogDescription>
                    Esta acción eliminará TODAS las correcciones manuales y de IA de todas las entregas. 
                    Esta acción no se puede deshacer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button onClick={handleClearAllGrades} variant="destructive">
                      Confirmar y Vaciar
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex flex-wrap gap-2">
            {([
              { key: 'ALL', label: 'Todas' },
              { key: 'UNCORRECTED', label: 'Sin corregir' },
              { key: 'AI_GRADED', label: 'Corregido IA' },
              { key: 'MANUAL_GRADED', label: 'Corregido manual' },
            ] as { key: SubmissionsFilter; label: string }[]).map(({ key, label }) => (
              <Button
                key={key}
                variant={filter === key ? 'secondary' : 'ghost'}
                className={`border ${filter === key ? 'border-border' : 'border-border/40'}`}
                size="sm"
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" className="flex justify-center py-10"><Loader className="h-8 w-8 animate-spin" /></motion.div>
            ) : (
              <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {filteredSubmissions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Estudiante</TableHead>
                        <TableHead className="text-right">Nota Manual</TableHead>
                        <TableHead className="text-right">Nota IA</TableHead>
                        <TableHead className="text-right">Nota Definitiva</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubmissions.map(sub => (
                        <TableRow
                          key={sub.id}
                          onClick={() => handleNavigate(`/exams/${examId}/submissions/${sub.id}`, true)}
                          className={`${isExamEvaluated ? '' : 'cursor-pointer'}`}
                        >
                          <TableCell className="font-semibold">
                            <div>{sub.respondentName || "Anónimo"}</div>
                            <div className="text-xs text-muted-foreground font-normal">{new Date(sub.createdAt).toLocaleString('es-ES')}</div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg">{sub.manualTotalPoints ?? '–'}</TableCell>
                          <TableCell className="text-right font-bold text-lg">{sub.aiTotalPoints ?? '–'}</TableCell>
                          <TableCell className="text-right font-bold text-lg">
                            {sub.definitiveSource === 'MANUAL' ? (
                              <div className="flex items-center justify-end gap-2">
                                {sub.manualTotalPoints ?? '–'}
                                {sub.manualTotalPoints !== null && <User className="h-4 w-4 text-primary" />}
                              </div>
                            ) : sub.definitiveSource === 'AI' ? (
                              <div className="flex items-center justify-end gap-2">
                                {sub.aiTotalPoints ?? '–'}
                                {sub.aiTotalPoints !== null && <Bot className="h-4 w-4 text-primary" />}
                              </div>
                            ) : (
                              <span>–</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="p-10 text-center text-muted-foreground">No hay entregas que coincidan con este filtro.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {!loading && (
            <div className="p-4 border-t flex justify-center">
              {nextCursor ? (
                <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline">
                  {loadingMore ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Cargar más
                </Button>
              ) : (
                submissions.length >= 50 ? <p className="text-sm text-muted-foreground">No hay más entregas.</p> : null
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExamPageWrapper() {
  const params = useParams();
  const apiFetch = useApi();
  const examId = params.id as string;
  
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialSubmissions, setInitialSubmissions] = useState<Submission[] | undefined>(undefined);
  const [initialNextCursor, setInitialNextCursor] = useState<string | null | undefined>(undefined);

  const loadExamData = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/getExam?examId=${examId}`);
      setExamData(data.exam);
      if (data.exam.state !== "DRAFT") {
        const subs = await apiFetch(`/listSubmissions?examId=${examId}&limit=50`);
        setInitialSubmissions(subs.submissions);
        setInitialNextCursor(subs.nextCursor ?? null);
      } else {
        setInitialSubmissions(undefined);
        setInitialNextCursor(undefined);
      }
    } catch (err) {
      setExamData(null);
      setInitialSubmissions(undefined);
      setInitialNextCursor(undefined);
    } finally {
      setLoading(false);
    }
  }, [examId, apiFetch]);

  useEffect(() => { loadExamData(); }, [loadExamData]);

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader className="h-10 w-10 animate-spin" /></div>;
  if (!examData) return <div className="text-center py-20">Examen no encontrado.</div>;
  
  return examData.state === "DRAFT" 
    ? <DraftExamEditor examId={examId} onPublishSuccess={loadExamData} /> 
    : <PublishedExamDashboard examId={examId} examData={examData} initialSubmissions={initialSubmissions} initialNextCursor={initialNextCursor} />;
}