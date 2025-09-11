"use client";

import { useAuth } from "@/infrastructure/auth/AuthProvider";
import { useApi } from "@/infrastructure/api/ApiProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StateIndicator } from "@/components/ui/state-indicator";
import { translateStatus } from "@/utils/translations";
import { toast } from "sonner";
import { Plus, Book, Trash2, Loader, AlertTriangle, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useApiKeyStatus } from "@/hooks/useApiKeyStatus";
import Link from "next/link";

type CreatedExam = { id: string; title: string; state: "DRAFT" | "PUBLISHED" | "EVALUATED"; createdAt: string; questionsCount: number; };

export default function DashboardPage() {
  const { user } = useAuth();
  const apiFetch = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const { status: apiKeyStatus, needsApiKey } = useApiKeyStatus();
  const [createdExams, setCreatedExams] = useState<CreatedExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [examToDelete, setExamToDelete] = useState<CreatedExam | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const createdRes = await apiFetch("/listExams?limit=50");
        setCreatedExams(createdRes.exams || []);
        setNextCursor(createdRes.nextCursor ?? null);
      } catch (err) { 
        toast.error("Error al cargar los exámenes", { description: "No se pudieron cargar los exámenes. Inténtalo de nuevo." });
      } finally { 
        setLoading(false); 
      }
    };
    if (user) fetchData();
  }, [user, apiFetch]);

  const handleCreateExam = async () => {
    setIsCreating(true);
    const target = `/exams/new${isDemo ? '?demo=true' : ''}`;
    router.push(target);
    setIsCreating(false);
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    const toastId = toast.loading("Eliminando examen...");
    try {
      await apiFetch("/deleteExam", {
        method: "POST",
        body: JSON.stringify({ examId: examToDelete.id }),
      });
      setCreatedExams(prevExams => prevExams.filter(exam => exam.id !== examToDelete.id));
      toast.success(`El examen "${examToDelete.title}" ha sido eliminado.`, { id: toastId });
    } catch (err) {
      toast.error("No se pudo eliminar el examen.", { id: toastId });
    } finally {
      setExamToDelete(null);
    }
  };
  
  const handleLoadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await apiFetch(`/listExams?limit=50&cursor=${encodeURIComponent(nextCursor)}`);
      setCreatedExams(prev => [...prev, ...(res.exams || [])]);
      setNextCursor(res.nextCursor ?? null);
    } catch (err) {
      toast.error("No se pudieron cargar más exámenes.");
    } finally {
      setLoadingMore(false);
    }
  };
  
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mis Exámenes Creados</h1>
          <p className="text-muted-foreground">Aquí puedes gestionar todos los exámenes que has creado.</p>
        </div>
        <Button onClick={handleCreateExam} disabled={isCreating} size="lg">
          {isCreating ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Crear Examen
        </Button>
      </div>

      {!isDemo && needsApiKey && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="flex items-center justify-between">
              <span>
                Tu clave API de OpenAI no está configurada o es inválida. 
                Configúrala para usar las funciones de calificación automática.
              </span>
              <Button variant="outline" size="sm" className="ml-4" asChild>
                <Link href={`/profile${isDemo ? '?demo=true' : ''}`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20">
              <Loader className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : createdExams.length > 0 ? (
            <>
            <div className="p-4 border-b flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Mostrando {createdExams.length} exámenes</p>
              {nextCursor ? (
                <Button onClick={handleLoadMore} disabled={loadingMore} variant="outline" size="sm">
                  {loadingMore ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Cargar más
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">No hay más exámenes</p>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Título</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Preguntas</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {createdExams.map((exam) => (
                  <TableRow key={exam.id} onClick={() => router.push(`/exams/${exam.id}${isDemo ? '?demo=true' : ''}`)} className="cursor-pointer">
                    <TableCell className="font-medium">{exam.title}</TableCell>
                    <TableCell><StateIndicator state={exam.state}>{translateStatus(exam.state)}</StateIndicator></TableCell>
                    <TableCell>{exam.questionsCount || 0}</TableCell>
                    <TableCell>{new Date(exam.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                                e.stopPropagation();
                                setExamToDelete(exam);
                            }}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Eliminar examen"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          ) : (
            <div className="text-center p-12">
              <Book className="h-12 w-12 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-bold mb-2">Crea tu primer examen</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Parece que aún no tienes ningún examen. ¡Haz clic en el botón para empezar!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      
      
      <Dialog open={!!examToDelete} onOpenChange={() => setExamToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás seguro de que quieres eliminar este examen?</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Se eliminará el examen "{examToDelete?.title}", junto con todas sus preguntas y las entregas de los estudiantes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExamToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteExam}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}