import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { z } from "zod";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import * as logger from "firebase-functions/logger";
import { Submission } from "../models/firestore";

const CalculateStatsSchema = z.object({
  examId: z.string().min(1),
});

type HttpError = { status?: number } & Error;

function calculateMean(data: number[]): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((a, b) => a + b, 0);
  return sum / data.length;
}

function calculateStdDev(data: number[], mean: number): number {
  if (data.length < 2) return 0;
  const sqDiffs = data.map((value) => Math.pow(value - mean, 2));
  const avgSqDiff = calculateMean(sqDiffs);
  return Math.sqrt(avgSqDiff);
}

function calculateCorrelation(data1: number[], data2: number[]): number {
  if (data1.length !== data2.length || data1.length === 0) return 0;
  const n = data1.length;
  const mean1 = calculateMean(data1);
  const mean2 = calculateMean(data2);
  let numerator = 0;
  let sumSq1 = 0;
  let sumSq2 = 0;
  for (let i = 0; i < n; i++) {
    const diff1 = data1[i] - mean1;
    const diff2 = data2[i] - mean2;
    numerator += diff1 * diff2;
    sumSq1 += Math.pow(diff1, 2);
    sumSq2 += Math.pow(diff2, 2);
  }
  const denominator = Math.sqrt(sumSq1) * Math.sqrt(sumSq2);
  return denominator === 0 ? 1 : numerator / denominator;
}

type DiscrepancyItem = {
    submissionId: string;
    respondentName: string | null;
    professorPoints: number;
    aiPoints: number;
    diff: number;
};

type QuestionStats = {
    questionIndex: number;
    maxPoints: number;
    professorMean: number;
    aiMean: number;
    correlation: number;
    agreement: number; // percentage of scores within 10% of each other
};

type GradingDistribution = {
    range: string;
    professorCount: number;
    aiCount: number;
};

type PerformanceInsights = {
    overall: {
        message: string;
        type: "excellent" | "good" | "acceptable" | "poor";
    };
    trend: {
        message: string;
        type: "ai_higher" | "professor_higher" | "balanced";
    };
    consistency: {
        message: string;
        type: "very_consistent" | "consistent" | "moderate" | "inconsistent";
    };
};

export async function calculateComparisonStatsHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const parsedBody = CalculateStatsSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: { message: "Invalid request body", details: parsedBody.error.flatten() } });
      return;
    }

    const { examId } = parsedBody.data;
    await assertIsOwner(user, examId);

    const submissionsSnapshot = await db.collection("exams").doc(examId).collection("submissions").get();

    const comparableSubmissions = submissionsSnapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as Submission }))
      .filter((item) => typeof item.data.manualTotalPoints === "number" && typeof item.data.aiTotalPoints === "number");

    if (comparableSubmissions.length === 0) {
      res.status(200).json({ message: "No submissions are available for comparison yet.", stats: null });
      return;
    }

    const professorPoints: number[] = [];
    const aiPoints: number[] = [];

    comparableSubmissions.forEach((s) => {
      professorPoints.push(s.data.manualTotalPoints as number);
      aiPoints.push(s.data.aiTotalPoints as number);
    });

    const discrepancies: DiscrepancyItem[] = comparableSubmissions.map((s) => {
      const professorScore = s.data.manualTotalPoints as number;
      const aiScore = s.data.aiTotalPoints as number;
      return {
        submissionId: s.id,
        respondentName: s.data.respondentName || s.data.respondentEmail,
        professorPoints: professorScore,
        aiPoints: aiScore,
        diff: Math.abs(professorScore - aiScore),
      };
    }).filter((d) => d.diff > 0);

    const professorMean = calculateMean(professorPoints);
    const aiMean = calculateMean(aiPoints);

    // Calculate question-level statistics
    const examDoc = await db.collection("exams").doc(examId).get();
    const examData = examDoc.data();
    const questions = examData?.questions || [];

    // For now, skip question-level stats as we need to fetch AnswerGrade documents separately
    // This would require additional queries which could be expensive
    const questionStats: QuestionStats[] = [];

    // Calculate grade distribution
    const getGradeRange = (score: number, total: number): string => {
      const percentage = (score / total) * 100;
      if (percentage >= 90) return "90-100%";
      if (percentage >= 80) return "80-89%";
      if (percentage >= 70) return "70-79%";
      if (percentage >= 60) return "60-69%";
      return "0-59%";
    };

    const totalPoints = questions.reduce((sum: number, q: { maxPoints?: number }) => sum + (q.maxPoints || 10), 0);
    const gradingDistribution: GradingDistribution[] = [
      { range: "90-100%", professorCount: 0, aiCount: 0 },
      { range: "80-89%", professorCount: 0, aiCount: 0 },
      { range: "70-79%", professorCount: 0, aiCount: 0 },
      { range: "60-69%", professorCount: 0, aiCount: 0 },
      { range: "0-59%", professorCount: 0, aiCount: 0 },
    ];

    comparableSubmissions.forEach((s) => {
      const profRange = getGradeRange(s.data.manualTotalPoints as number, totalPoints);
      const aiRange = getGradeRange(s.data.aiTotalPoints as number, totalPoints);

      const profEntry = gradingDistribution.find((d) => d.range === profRange);
      const aiEntry = gradingDistribution.find((d) => d.range === aiRange);

      if (profEntry) profEntry.professorCount++;
      if (aiEntry) aiEntry.aiCount++;
    });

    // Generate insights
    const correlation = calculateCorrelation(professorPoints, aiPoints);
    const meanDiff = Math.abs(professorMean - aiMean);
    const meanDiffPercentage = (meanDiff / Math.max(professorMean, aiMean)) * 100;

    const insights: PerformanceInsights = {
      overall: {
        message: correlation > 0.85 ? "La IA muestra una correlación excelente con las calificaciones manuales" :
          correlation > 0.7 ? "La IA muestra una buena correlación con las calificaciones manuales" :
            correlation > 0.5 ? "La IA muestra una correlación aceptable con las calificaciones manuales" :
              "La IA muestra baja correlación con las calificaciones manuales",
        type: correlation > 0.85 ? "excellent" : correlation > 0.7 ? "good" : correlation > 0.5 ? "acceptable" : "poor",
      },
      trend: {
        message: meanDiffPercentage < 5 ? "Las calificaciones están muy equilibradas entre IA y manual" :
          professorMean > aiMean ? "Los profesores tienden a calificar más alto que la IA" :
            "La IA tiende a calificar más alto que los profesores",
        type: meanDiffPercentage < 5 ? "balanced" : professorMean > aiMean ? "professor_higher" : "ai_higher",
      },
      consistency: {
        message: meanDiffPercentage < 3 ? "Muy alta consistencia entre ambos métodos" :
          meanDiffPercentage < 8 ? "Buena consistencia entre ambos métodos" :
            meanDiffPercentage < 15 ? "Consistencia moderada entre ambos métodos" :
              "Baja consistencia entre ambos métodos",
        type: meanDiffPercentage < 3 ? "very_consistent" : meanDiffPercentage < 8 ? "consistent" : meanDiffPercentage < 15 ? "moderate" : "inconsistent",
      },
    };

    const stats = {
      professorMean,
      aiMean,
      professorStdDev: calculateStdDev(professorPoints, professorMean),
      aiStdDev: calculateStdDev(aiPoints, aiMean),
      correlation,
      discrepancies: discrepancies.sort((a, b) => b.diff - a.diff).slice(0, 10),
      questionStats,
      gradingDistribution,
      insights,
      totalSubmissions: comparableSubmissions.length,
      scatterData: comparableSubmissions.map((s) => ({
        professor: s.data.manualTotalPoints as number,
        ai: s.data.aiTotalPoints as number,
        name: s.data.respondentName || s.data.respondentEmail || "Anónimo",
      })),
    };

    logger.info(`Calculated on-the-fly stats for exam ${examId}`);
    res.status(200).json({ stats });
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error calculating comparison stats:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: (httpError as Error).message || "Internal Server Error" } });
    }
  }
}
