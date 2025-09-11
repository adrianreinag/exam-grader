import { Request as FunctionsRequest } from "firebase-functions/v2/https";
import { Response } from "express";
import { requireIdToken } from "../libs/auth";
import { assertIsOwner } from "../libs/authorize";
import { db } from "../libs/firestore";
import { Submission } from "../models/firestore";
import * as logger from "firebase-functions/logger";

type HttpError = { status?: number } & Error;

export async function exportGradesToCsvHandler(req: FunctionsRequest, res: Response): Promise<void> {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: { message: "Method Not Allowed" } });
      return;
    }

    const user = await requireIdToken(req);
    const examId = req.query.examId as string;

    if (!examId) {
      res.status(400).json({ error: { message: "examId es requerido" } });
      return;
    }

    const examData = await assertIsOwner(user, examId);

    // Obtener todas las submissions
    const submissionsSnapshot = await db
      .collection("exams")
      .doc(examId)
      .collection("submissions")
      .orderBy("createdAt", "desc")
      .get();

    const submissions = submissionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Submission,
    }));

    // Generar CSV
    const csvRows = ["student_email,student_name,manual_total_points,ai_total_points"];

    for (const submission of submissions) {
      const email = submission.respondentEmail || "";
      const name = submission.respondentName || "";
      const manualPoints = submission.manualTotalPoints !== null ? submission.manualTotalPoints.toString() : "";
      const aiPoints = submission.aiTotalPoints !== null ? submission.aiTotalPoints.toString() : "";

      // Escapar campos que contengan comas o comillas
      const escapeCsvField = (field: string) => {
        if (field.includes(",") || field.includes("\"") || field.includes("\n")) {
          return `"${field.replace(/"/g, "\"\"")}"`;
        }
        return field;
      };

      const row = [
        escapeCsvField(email),
        escapeCsvField(name),
        manualPoints,
        aiPoints,
      ].join(",");

      csvRows.push(row);
    }

    const csvContent = csvRows.join("\n");

    // Configurar headers para descarga
    const filename = `correcciones_${examData.title.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache");

    // Agregar BOM para UTF-8 para mejor compatibilidad con Excel
    res.write("\uFEFF");
    res.write(csvContent);
    res.end();

    logger.info(`Exported grades CSV for exam ${examId} by user ${user.uid}`);
  } catch (error) {
    const httpError = error as HttpError;
    logger.error("Error exporting grades to CSV:", httpError);
    if (httpError.status) {
      res.status(httpError.status).json({ error: { message: httpError.message } });
    } else {
      res.status(500).json({ error: { message: (httpError as Error).message || "Internal Server Error" } });
    }
  }
}
