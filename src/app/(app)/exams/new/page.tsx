"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useApi } from "@/infrastructure/api/ApiProvider";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ArrowLeft, Loader } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

const QuestionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(5, { message: "El enunciado es muy corto." }),
  maxPoints: z
    .number()
    .refine((v) => !Number.isNaN(v), { message: "Debe ser un número válido" })
    .int()
    .min(1, { message: "Debe ser al menos 1." }),
  rubricText: z.string().min(10, { message: "La rúbrica es muy corta." }),
});

const ExamFormSchema = z.object({
  title: z.string().min(3, { message: "El título es muy corto." }),
  description: z.string().optional(),
  questions: z.array(QuestionSchema).min(1, { message: "Añade al menos una pregunta." }),
});

type ExamFormData = z.infer<typeof ExamFormSchema>;

export default function NewExamPage() {
  const apiFetch = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const dashboardHref = isDemo ? "/dashboard?demo=true" : "/dashboard";

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ExamFormData>({
    resolver: zodResolver(ExamFormSchema),
    defaultValues: { title: "", description: "", questions: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "questions" });

  const onSaveDraft = async (data: ExamFormData) => {
    const toastId = toast.loading("Creando examen y guardando borrador...");
    try {
      // 1) Crear examen con el título actual
      const createRes = await apiFetch("/createExam", {
        method: "POST",
        body: JSON.stringify({ title: data.title || "Nuevo Examen" }),
      });
      const examId = createRes.examId as string;

      // 2) Actualizar examen con el resto de campos y preguntas
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

      toast.success("Borrador guardado.", { id: toastId });
      router.replace(`/exams/${examId}${isDemo ? "?demo=true" : ""}`);
    } catch (err) {
      toast.error("No se pudo guardar el borrador.", { id: toastId });
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <form onSubmit={handleSubmit(onSaveDraft)} className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href={dashboardHref} className="flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-2">Nuevo Examen</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="secondary" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isDirty ? "Guardar Borrador" : "Sin cambios"}
          </Button>
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
          <Button
            type="button"
            onClick={() => append({ text: "", maxPoints: 10, rubricText: "" })}
            size="sm"
          >
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
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <Textarea placeholder="Enunciado de la pregunta" {...register(`questions.${index}.text`)} />
                  {errors.questions?.[index]?.text && (
                    <p className="text-sm text-destructive">{errors.questions[index]?.text?.message}</p>
                  )}
                  <Input
                    type="number"
                    placeholder="Puntos"
                    {...register(`questions.${index}.maxPoints`, { valueAsNumber: true })}
                  />
                  {errors.questions?.[index]?.maxPoints && (
                    <p className="text-sm text-destructive">{errors.questions[index]?.maxPoints?.message}</p>
                  )}
                  <Textarea placeholder="Rúbrica de evaluación" {...register(`questions.${index}.rubricText`)} rows={4} />
                  {errors.questions?.[index]?.rubricText && (
                    <p className="text-sm text-destructive">{errors.questions[index]?.rubricText?.message}</p>
                  )}
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
