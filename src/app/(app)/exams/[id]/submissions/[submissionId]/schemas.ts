import { z } from "zod";

export const InlineCommentSchema = z.object({
  id: z.string(),
  startIndex: z.number().min(0),
  endIndex: z.number().min(0),
  text: z.string(),
  source: z.enum(["MANUAL", "AI"]),
  createdAt: z.date(),
});

export const AnswerGradeSchema = z.object({
  pointsAwarded: z.number().min(0),
  comment: z.string().optional(),
  inlineComments: z.array(InlineCommentSchema).optional(),
});

export const CorrectionFormSchema = z.object({
  manualCommentsOverall: z.string().optional(),
  answerGrades: z.array(AnswerGradeSchema),
});

export type CorrectionFormData = z.infer<typeof CorrectionFormSchema>;