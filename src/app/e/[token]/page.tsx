"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApi } from "@/infrastructure/api/ApiProvider";
import { useAuth } from "@/infrastructure/auth/AuthProvider";
import { loginWithGoogle, logout } from "@/infrastructure/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader, Check, User, LogOut } from "lucide-react";

const AnswerSchema = z.object({
  text: z.string().min(1, { message: "La respuesta no puede estar vacía." }),
});

const SubmissionFormSchema = z.object({
  answers: z.array(AnswerSchema),
});

type SubmissionFormData = z.infer<typeof SubmissionFormSchema>;
type ExamData = { title: string; description: string; };
type QuestionData = { id: string; text: string; maxPoints: number; };

export default function PublicExamPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const apiFetch = useApi();
  const token = params.token as string;

  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionFormData>({
    resolver: zodResolver(SubmissionFormSchema),
  });

  useEffect(() => {
    const loadExam = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await apiFetch(`/getPublicExam?token=${token}`);
        setExam(data.exam);
        setQuestions(data.questions);
        reset({ answers: data.questions.map(() => ({ text: "" })) });
      } catch (err) {
        setError("El examen no se ha podido encontrar o ya no está disponible.");
      } finally {
        setLoading(false);
      }
    };
    loadExam();
  }, [token, reset, apiFetch]);

  const onSubmit = async (data: SubmissionFormData) => {
    if (!user) {
        toast.error("Debes iniciar sesión para enviar tus respuestas.");
        loginWithGoogle();
        return;
    }
    const toastId = toast.loading("Enviando respuestas...");
    try {
      const response = await apiFetch("/publicSubmit", {
        method: "POST",
        body: JSON.stringify({
          token,
          answers: data.answers.map((a, index) => ({
            questionId: questions[index].id,
            text: a.text,
          })),
        }),
      });
      if (response.submissionId) {
        toast.dismiss(toastId);
        setIsSubmitted(true);
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      if (err.message.includes("409")) {
        toast.warning("Ya has enviado una respuesta para este examen.");
        setIsSubmitted(true);
      } else {
        toast.error("Error al enviar las respuestas.");
      }
    }
  };

  if (authLoading || loading) {
    return <div className="flex h-screen items-center justify-center"><Loader className="h-12 w-12 animate-spin" /></div>;
  }
  
  if (error) {
    return <div className="flex h-screen items-center justify-center text-center p-8">{error}</div>;
  }

  if (isSubmitted) {
    return (
      <>
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b h-16 flex items-center px-6">
          <h1 className="font-bold text-lg">{exam?.title}</h1>
          {user && (
            <div className="ml-auto">
              <Button variant="outline" onClick={logout} className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          )}
        </header>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-center p-8 animate-fade-in">
          <Card className="max-w-md">
            <CardContent className="p-8">
              <Check className="w-12 h-12 text-success mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">¡Respuestas Enviadas!</h1>
              <p className="text-muted-foreground">Recibirás los resultados por correo. ¡Mucha suerte!</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-center p-8 animate-fade-in">
        <Card className="max-w-md">
            <CardContent className="p-8">
                <User className="w-12 h-12 text-primary mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Inicia sesión para empezar</h1>
                <p className="text-muted-foreground mb-6">Necesitas una cuenta para poder responder al examen.</p>
                <Button onClick={loginWithGoogle} size="lg">Iniciar Sesión con Google</Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b h-16 flex items-center px-6">
        <h1 className="font-bold text-lg">{exam?.title}</h1>
        {user && (
          <div className="ml-auto">
            <Button variant="outline" onClick={logout} className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        )}
      </header>
      <main className="max-w-3xl mx-auto p-6 space-y-8 animate-fade-in">
        <Card>
            <CardHeader>
                <CardTitle className="text-3xl">{exam?.title}</CardTitle>
                <CardDescription>{exam?.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                    Respondiendo como: <span className="font-medium text-foreground">{user.displayName}</span>
                </div>
            </CardContent>
        </Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {questions.map((q, index) => (
            <Card key={q.id}>
                <CardHeader>
                    <Label className="font-semibold text-lg">
                        Pregunta {index + 1} <span className="text-muted-foreground font-normal">({q.maxPoints} pts)</span>
                    </Label>
                    <CardDescription className="pt-1">{q.text}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea 
                        {...register(`answers.${index}.text`)}
                        rows={5}
                        placeholder="Escribe tu respuesta aquí..."
                    />
                    {errors.answers?.[index]?.text && <p className="text-sm text-destructive mt-2">{errors.answers[index]?.text?.message}</p>}
                </CardContent>
            </Card>
          ))}
          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Entregar Examen
          </Button>
        </form>
      </main>
    </>
  );
}