import * as logger from "firebase-functions/logger";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini-2025-08-07";
const OPENAI_MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS || 1500);
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 45000);
const OPENAI_RETRY_ATTEMPTS = Number(process.env.OPENAI_RETRY_ATTEMPTS || 1);

type GradingInput = {
  studentName: string;
  rubricText: string;
  questionText: string;
  maxPoints: number;
  answerText: string;
  mode?: "NEUTRAL" | "STRICT" | "LENIENT";
};


type InlineCommentResponse = {
  id: string;
  startIndex: number;
  endIndex: number;
  text: string;
  /** Exact substring (frase) de la respuesta del alumno a la que se refiere el comentario. */
  quote?: string;
};

type GradingResponse = {
  pointsAwarded: number;
  comment: string;
  overallComment?: string;
  inlineComments?: InlineCommentResponse[];
};


export async function gradeWithAI(input: GradingInput, apiKey?: string): Promise<GradingResponse> {
  const effectiveApiKey = apiKey || OPENAI_API_KEY;

  if (!effectiveApiKey) {
    logger.error("OpenAI API key is not configured.");
    throw new Error("The AI grading service is not configured.");
  }

  const model = OPENAI_MODEL;

  const allowedModes = ["NEUTRAL", "STRICT", "LENIENT"] as const;
  const incomingMode = input.mode as string | undefined;
  const mode = (incomingMode && (allowedModes as readonly string[]).includes(incomingMode)) ? incomingMode as typeof allowedModes[number] : "NEUTRAL";
  const MODE_INSTRUCTIONS: Record<string, string> = {
    NEUTRAL: "Mantén un tono profesional y equilibrado. Penaliza y recompensa con justicia, ajustándote a la rúbrica.",
    STRICT: "Modo severo y exigente: sé estricto al asignar puntos, penaliza imprecisiones, ambigüedades y errores de razonamiento. No otorgues puntos por aproximaciones vagas.",
    LENIENT: "Modo amable y optimista: prioriza el refuerzo positivo, valora la intención y otorga puntos parciales cuando haya indicios razonables, manteniendo coherencia con la rúbrica.",
  };

  const systemPrompt = `Eres un corrector pedagógico y constructivo. Evalúas respuestas de examen usando una RÚBRICA del profesor.
Tu objetivo es ayudar al estudiante a mejorar con feedback útil y educativo.

MODO DE CORRECCIÓN: ${mode}.
Instrucciones de modo: ${MODE_INSTRUCTIONS[mode]}.

ESTRUCTURA de tu respuesta JSON:
- "pointsAwarded": puntuación numérica
- "comment": comentario general siguiendo estructura pedagógica
- "overallComment": comentario global sobre la respuesta
- "inlineComments": array de comentarios específicos sobre fragmentos de texto

Para inlineComments, cada elemento debe tener:
- "id": identificador único (ej: "c1", "c2")
- "startIndex": posición inicial del texto comentado
- "endIndex": posición final del texto comentado  
- "text": comentario específico sobre ese fragmento
- "quote": la frase EXACTA (subcadena literal) de la respuesta del alumno que quieres comentar. Debe existir tal cual en la respuesta. Evita reformular; usa texto literal. Manténla acotada (≈5–25 palabras).

CUÁNDO usar inlineComments:
- Respuestas largas (>50 palabras) con múltiples conceptos
- Errores específicos en partes concretas
- Aciertos destacables en fragmentos específicos
- Nunca para respuestas muy cortas

FORMATO DEL TEXTO (Markdown simple):
- Los campos "comment" y "overallComment" pueden usar Markdown simple: **negrita**, *cursiva* o _cursiva_.
- Cualquier línea que empiece por "# " se interpreta como un título breve (muestra similar a texto en negrita). No uses niveles múltiples de encabezado.
- Evita otros elementos de Markdown (listas, enlaces, tablas, código, etc.).

Devuelves SIEMPRE JSON válido.`;

  const userPrompt = `
    ALUMNO: "${input.studentName}"
    RÚBRICA: "${input.rubricText}"
    ENUNCIADO: "${input.questionText}" (máximo ${input.maxPoints} puntos)
    RESPUESTA DEL ALUMNO: "${input.answerText}"

    Evalúa la respuesta y genera:
    1. **Comentario general** con aspectos positivos, a mejorar, justificación y consejos
    2. **Comentarios específicos** (solo si la respuesta es larga) señalando fragmentos concretos

    Para los índices de texto, cuenta caracteres desde el inicio de la respuesta (empezando en 0).
    Además, por cada comentario en línea incluye también "quote" con la subcadena EXACTA (texto literal) de la respuesta que estás comentando. Esta "quote" debe aparecer en la respuesta sin cambios.

    Usa el Markdown simple indicado únicamente en "comment" y "overallComment". No uses otros elementos de Markdown.

    Devuelve SOLO el JSON.
  `;

  try {
    const started = Date.now();

    // Log request details
    const requestBody = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: OPENAI_MAX_TOKENS,
      reasoning_effort: "low",
    };

    logger.info("OpenAI request details", {
      model,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      maxTokens: OPENAI_MAX_TOKENS,
      hasApiKey: !!effectiveApiKey,
      apiKeyPrefix: effectiveApiKey ? effectiveApiKey.substring(0, 7) + "..." : "none",
    });

    // Helper: fetch with timeout and simple retry/backoff for 429/5xx
    const fetchWithTimeoutAndRetry = async (attempt = 0): Promise<Response> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${effectiveApiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        clearTimeout(timer);

        logger.info("OpenAI response received", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          attempt,
        });

        if (!response.ok && (response.status === 429 || (response.status >= 500 && response.status < 600))) {
          if (attempt < OPENAI_RETRY_ATTEMPTS) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000);
            logger.warn("OpenAI API transient error; retrying", { status: response.status, attempt, backoffMs });
            await new Promise((r) => setTimeout(r, backoffMs));
            return fetchWithTimeoutAndRetry(attempt + 1);
          }
        }

        return response;
      } catch (err) {
        clearTimeout(timer);
        // Retry on abort/timeouts or network errors
        const isAbort = (err as Error)?.name === "AbortError";
        if ((isAbort || (err as any)?.code === "ECONNRESET") && attempt < OPENAI_RETRY_ATTEMPTS) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000);
          logger.warn("OpenAI request aborted or network error; retrying", { attempt, backoffMs });
          await new Promise((r) => setTimeout(r, backoffMs));
          return fetchWithTimeoutAndRetry(attempt + 1);
        }
        throw err;
      }
    };

    const response = await fetchWithTimeoutAndRetry();

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("OpenAI API request failed", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorBody,
        requestModel: model,
        requestMaxTokens: OPENAI_MAX_TOKENS,
      });

      // Check for API key related errors
      if (response.status === 401) {
        const errorMessage = errorBody.toLowerCase();
        if (errorMessage.includes("invalid") || errorMessage.includes("unauthorized") || errorMessage.includes("api key")) {
          throw new Error("INVALID_API_KEY");
        }
      }

      throw new Error(`OpenAI API request failed with status ${response.status}`);
    }

    const responseText = await response.text();
    logger.info("Raw OpenAI response", {
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 500),
    });

    let json;
    try {
      json = JSON.parse(responseText);
    } catch (parseError) {
      logger.error("Failed to parse OpenAI response as JSON", {
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
        responseText: responseText.substring(0, 1000),
      });
      throw new Error("OpenAI returned invalid JSON");
    }

    // Log the full response for debugging
    logger.info("OpenAI parsed response structure", {
      hasChoices: !!json.choices,
      choicesLength: json.choices?.length || 0,
      firstChoiceExists: !!json.choices?.[0],
      hasMessage: !!json.choices?.[0]?.message,
      hasContent: !!json.choices?.[0]?.message?.content,
      hasError: !!json.error,
      hasUsage: !!json.usage,
      responseKeys: Object.keys(json),
      fullResponse: JSON.stringify(json, null, 2),
    });

    const content = json.choices?.[0]?.message?.content;
    const finishReason = json.choices?.[0]?.finish_reason;

    if (!content) {
      // If the response was truncated due to length limits, retry with a shorter prompt
      if (finishReason === "length") {
        logger.warn("OpenAI response truncated due to token limit, retrying with simplified prompt", {
          originalMaxTokens: OPENAI_MAX_TOKENS,
          usage: json.usage,
        });

        // Retry with a much simpler prompt and higher token limit
        const simplifiedSystemPrompt = `Evalúa esta respuesta de examen y devuelve JSON con:
- "pointsAwarded": puntuación numérica (0-${input.maxPoints})
- "comment": comentario breve (máximo 200 caracteres)

Devuelve SOLO el JSON.`;

        const simplifiedUserPrompt = `RÚBRICA: "${input.rubricText.substring(0, 500)}"
PREGUNTA: "${input.questionText.substring(0, 300)}" (${input.maxPoints} puntos máximo)
RESPUESTA: "${input.answerText.substring(0, 800)}"

Evalúa y devuelve JSON.`;

        try {
          const retryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${effectiveApiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: simplifiedSystemPrompt },
                { role: "user", content: simplifiedUserPrompt },
              ],
              response_format: { type: "json_object" },
              max_completion_tokens: 2000,
            }),
          });

          if (retryResponse.ok) {
            const retryJson = await retryResponse.json();
            const retryContent = retryJson.choices?.[0]?.message?.content;

            if (retryContent) {
              logger.info("Successful retry with simplified prompt");
              const parsed = JSON.parse(retryContent) as GradingResponse;
              let points = Number(parsed.pointsAwarded ?? 0);
              if (!Number.isFinite(points)) {
                points = 0;
              }
              const clampedPoints = Math.max(0, Math.min(points, input.maxPoints));

              return {
                pointsAwarded: clampedPoints,
                comment: String(parsed.comment ?? "Evaluación completada con prompt simplificado.").slice(0, 1000),
                overallComment: "",
                inlineComments: [],
              };
            }
          }
        } catch (retryError) {
          logger.warn("Retry with simplified prompt also failed", { retryError });
        }
      }

      logger.error("OpenAI response structure issue", {
        choices: json.choices,
        firstChoice: json.choices?.[0],
        message: json.choices?.[0]?.message,
        error: json.error,
        usage: json.usage,
        finishReason,
      });
      throw new Error("OpenAI response did not contain content.");
    }

    const parsed = JSON.parse(content) as GradingResponse;

    let points = Number(parsed.pointsAwarded ?? 0);
    if (!Number.isFinite(points)) {
      points = 0;
    }

    const clampedPoints = Math.max(0, Math.min(points, input.maxPoints));

    const comment = String(parsed.comment ?? "").slice(0, 4000);
    const overallComment = String(parsed.overallComment ?? "").slice(0, 4000);

    // Procesar comentarios inline si existen
    const inlineComments = Array.isArray(parsed.inlineComments) ?
      (parsed.inlineComments as Partial<InlineCommentResponse>[])
        .map((ic) => ({
          id: String(ic.id || Math.random().toString(36).substr(2, 9)),
          startIndex: Math.max(0, Number(ic.startIndex) || 0),
          endIndex: Math.max(0, Number(ic.endIndex) || 0),
          text: String(ic.text || "").slice(0, 1000),
          quote: typeof ic.quote === "string" ? String(ic.quote).slice(0, 400) : undefined,
        }))
        .filter((ic) => ic.text && (ic.startIndex < ic.endIndex || (ic.quote && ic.quote.length > 0))) :
      [];

    const durationMs = Date.now() - started;
    logger.info("AI grading call completed", {
      model,
      durationMs,
      answerChars: input.answerText?.length ?? 0,
      maxPoints: input.maxPoints,
      mode,
    });

    return {
      pointsAwarded: clampedPoints,
      comment,
      overallComment,
      inlineComments,
    };
  } catch (error) {
    logger.error("Error processing OpenAI request:", error);
    throw error;
  }
}
