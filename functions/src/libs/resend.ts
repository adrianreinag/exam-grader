import * as logger from "firebase-functions/logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!RESEND_API_KEY) {
    logger.error("Resend API key is not configured. Cannot send email.");
    throw new Error("Email service is not configured.");
  }

  const fromAddress = "Exam Grader <noreply@exam-grader.es>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      logger.error("Resend API request failed", { status: response.status, body: errorBody });
      throw new Error(`Resend API request failed with status ${response.status}`);
    }

    const data = await response.json();
    logger.info("Email sent successfully via Resend", { to: payload.to, messageId: data.id });
  } catch (error) {
    logger.error("Error sending email via Resend:", error);
    throw error;
  }
}

type DetailedQuestion = {
  questionId: string;
  questionText: string;
  maxPoints: number;
  rubricText: string;
  answerText: string;
  grade: {
    manualPoints: number | null;
    manualComment: string | null;
    aiSuggestedPoints: number | null;
    aiSuggestedComment: string | null;
  } | null;
};

type ResultEmailTemplateProps = {
  nameOrEmail: string;
  examTitle: string;
  totalPoints: number;
  commentsOverall?: string | null;
  detailedAnswers?: DetailedQuestion[];
  definitiveSource?: "MANUAL" | "AI" | null;
};

export function buildResultEmail(props: ResultEmailTemplateProps): string {
  const commentsHtml = props.commentsOverall ?
    `<p><strong>Comentarios generales:</strong></p><p style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;">${props.commentsOverall}</p>` :
    "";

  // Generar el HTML para cada pregunta y respuesta
  let questionsAnswersHtml = "";
  if (props.detailedAnswers && props.detailedAnswers.length > 0) {
    questionsAnswersHtml = `
      <h3 style="margin-top: 30px;">Detalle de la corrección</h3>
    `;

    props.detailedAnswers.forEach((qa, index) => {
      // Determinar qué comentario y puntuación mostrar según la fuente definitiva
      const usedSource = props.definitiveSource || "MANUAL";
      const points = usedSource === "AI" ?
        qa.grade?.aiSuggestedPoints :
        qa.grade?.manualPoints;
      const comment = usedSource === "AI" ?
        qa.grade?.aiSuggestedComment :
        qa.grade?.manualComment;

      questionsAnswersHtml += `
        <div style="margin-bottom: 25px; border: 1px solid #ddd; border-radius: 8px; padding: 15px;">
          <h4 style="margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 10px;">Pregunta ${index + 1}</h4>
          <p><strong>Enunciado:</strong> ${qa.questionText}</p>
          <p><strong>Puntuación máxima:</strong> ${qa.maxPoints} puntos</p>
          <div style="margin: 15px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
            <p style="margin-top: 0;"><strong>Tu respuesta:</strong></p>
            <p style="white-space: pre-wrap;">${qa.answerText || "<Sin respuesta>"}</p>
          </div>
          <p><strong>Puntuación obtenida:</strong> ${points !== null ? points : 0} / ${qa.maxPoints} puntos</p>
          ${comment ? `<p><strong>Comentario:</strong> ${comment}</p>` : ""}
        </div>
      `;
    });
  }

  return `
    <div style="font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Resultados del Examen: ${props.examTitle}</h2>
      <p>Hola ${props.nameOrEmail},</p>
      <p>Ya está disponible la corrección de tu examen. A continuación encontrarás los detalles de tu evaluación.</p>
      <hr>
      <p style="font-size: 1.5em; text-align: center; margin: 20px 0;"><strong>Nota final: ${props.totalPoints} puntos</strong></p>
      ${commentsHtml}
      ${questionsAnswersHtml}
      <hr>
      <p style="font-size: 0.8em; color: #777; text-align: center; margin-top: 30px;">Gracias por participar.</p>
    </div>
  `;
}

type ProfessorNotificationEmailProps = {
    examTitle: string;
    gradedCount: number;
    submissionsUrl: string;
};

export function buildProfessorNotificationEmail(props: ProfessorNotificationEmailProps): string {
  return `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>Sugerencias de IA Generadas</h2>
        <p>Hola,</p>
        <p>El proceso para generar sugerencias de la IA para tu examen "<strong>${props.examTitle}</strong>" ha finalizado.</p>
        <hr>
        <p>Se han generado sugerencias para <strong>${props.gradedCount} entregas</strong>.</p>
        <p>Puedes revisar las entregas en el siguiente enlace:</p>
        <p style="margin: 20px 0;">
          <a href="${props.submissionsUrl}" style="background-color: #007bff; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Ver Entregas
          </a>
        </p>
        <hr>
        <p style="font-size: 0.8em; color: #777;">El equipo de Exam Grader.</p>
      </div>
    `;
}

type CsvUploadReportEmailProps = {
    examTitle: string;
    totalRows: number;
    successfulUploads: number;
    skippedUploads: number;
    examUrl: string;
};

export function buildCsvUploadReportEmail(props: CsvUploadReportEmailProps): string {
  const skippedHtml = props.skippedUploads > 0 ? `<p>Se omitieron <strong>${props.skippedUploads} entregas</strong> porque ya existían respuestas para esos estudiantes.</p>` : "";

  return `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>Proceso de Subida de CSV Completado</h2>
        <p>Hola,</p>
        <p>El archivo CSV de respuestas para el examen "<strong>${props.examTitle}</strong>" ha sido procesado.</p>
        <hr>
        <p><strong>Resultados:</strong></p>
        <ul>
            <li>Filas totales en el archivo: <strong>${props.totalRows}</strong></li>
            <li>Entregas nuevas creadas: <strong style="color: #28a745;">${props.successfulUploads}</strong></li>
            <li>Entregas omitidas (duplicadas): <strong style="color: #ffc107;">${props.skippedUploads}</strong></li>
        </ul>
        ${skippedHtml}
        <p>Puedes ver las nuevas entregas en el panel del examen:</p>
        <p style="margin: 20px 0;">
          <a href="${props.examUrl}" style="background-color: #007bff; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Ir al Examen
          </a>
        </p>
        <hr>
        <p style="font-size: 0.8em; color: #777;">El equipo de Exam Grader.</p>
      </div>
    `;
}
