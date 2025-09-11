"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/infrastructure/api/ApiProvider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader, ArrowLeft, Send, Check } from "lucide-react";

type Submission = { id: string; gradeState: "UNGRADED" | "GRADED_DRAFT" | "GRADED_FINAL"; definitiveSource: "MANUAL" | "AI" | null };

export default function FinalizePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiFetch = useApi();
  const examId = params.id as string;
  const demoQuery = searchParams.get('demo') === 'true' ? '?demo=true' : '';

  const [draftCount, setDraftCount] = useState(0);
  const [missingDefinitiveCount, setMissingDefinitiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [result, setResult] = useState<{ sent: number; skipped: number } | null>(null);

  useEffect(() => {
    const loadDrafts = async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/listSubmissions?examId=${examId}&limit=50`);
        const submissions: Submission[] = data.submissions || [];
        const drafts = submissions.filter((s: Submission) => s.gradeState === "GRADED_DRAFT");
        const missing = submissions.filter((s: Submission) => s.definitiveSource == null).length;
        setDraftCount(drafts.length);
        setMissingDefinitiveCount(missing);
        setTotalCount(submissions.length);
      } catch (err) {
        toast.error("Error al cargar las entregas.");
      } finally {
        setLoading(false);
      }
    };
    if (examId) loadDrafts();
  }, [examId, apiFetch]);

  const handleFinalize = async () => {
    setIsFinalizing(true);
    const toastId = toast.loading("Finalizando y enviando notificaciones...");
    try {
      const response = await apiFetch("/finalize", {
        method: "POST",
        body: JSON.stringify({ examId, requestId: crypto.randomUUID() }),
      });
      setResult(response);
      setDraftCount(0);
      toast.success("Proceso de finalización completado.", {
        id: toastId,
        description: `Se enviaron ${response.sent} correcciones.`,
      });
    } catch {
      toast.error("Hubo un error al finalizar.", { id: toastId });
    } finally {
      setIsFinalizing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader className="h-10 w-10 animate-spin" /></div>;
  }

  const readyToFinalize = totalCount > 0 && missingDefinitiveCount === 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link href={`/exams/${examId}${demoQuery}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Volver al Examen
      </Link>
      
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card>
              <CardContent className="p-8 text-center">
                <Check className="w-12 h-12 text-success mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Proceso Completado</h1>
                <p className="text-muted-foreground mb-4">Se han enviado {result.sent} calificaciones.</p>
                <Button onClick={() => router.push(`/exams/${examId}${demoQuery}`)} variant="default">
                  Volver al Examen
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <CardContent className="p-8 text-center">
                <Send className="w-12 h-12 text-primary mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Finalizar Correcciones</h1>
                {readyToFinalize ? (
                  <>
                    <p className="text-muted-foreground mb-6">
                      Todas las entregas tienen nota definitiva. Se finalizarán
                      {" "}
                      <span className="font-bold text-primary">{draftCount}</span> correcciones en borrador y se notificarán los resultados.
                    </p>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button size="lg" disabled={isFinalizing}>
                                {isFinalizing && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                Finalizar y Enviar
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>¿Confirmar finalización?</DialogTitle>
                                <DialogDescription>
                                    Se enviarán {draftCount} correcciones por email a los estudiantes. Esta acción no se puede deshacer.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                                <Button onClick={handleFinalize}>Confirmar y Enviar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    Faltan {missingDefinitiveCount} entregas por asignar una nota definitiva.
                    Revisa cada entrega y elige la fuente definitiva (Manual o IA) antes de finalizar.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}