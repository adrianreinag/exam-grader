import { User } from 'firebase/auth';

export const FAKE_USER: Partial<User> = {
  uid: 'demo-user-123',
  email: 'demo@exam-grader.es',
  displayName: 'Usuario Demo',
  photoURL: null,
};

export const BASE_FAKE_EXAMS = {
  "demo-exam-1": {
    id: "demo-exam-1",
    ownerUid: "demo-user-123",
    title: "Demo: Historia de la Web",
    description: "Un examen para demostrar las capacidades de corrección de la plataforma.",
    state: "PUBLISHED",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    publicToken: "demo-token-historia",
    questionsCount: 2,
    maxTotalPoints: 20,
  },
  "demo-exam-2": {
    id: "demo-exam-2",
    ownerUid: "demo-user-123",
    title: "Demo: Conceptos de React",
    description: "Examen práctico sobre React Hooks y el Virtual DOM.",
    state: "DRAFT",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    publicToken: null,
    questionsCount: 1,
    maxTotalPoints: 10,
  }
};

export const BASE_FAKE_QUESTIONS = {
  "demo-exam-1": [
    { id: "q1-e1", examId: "demo-exam-1", order: 0, text: "¿Quién es considerado el inventor de la World Wide Web y en qué año presentó su propuesta?", maxPoints: 10, rubricText: "Debe mencionar a Tim Berners-Lee (5 puntos) y el año 1989 (5 puntos). Aceptar 1990 o 1991 con 3 puntos." },
    { id: "q2-e1", examId: "demo-exam-1", order: 1, text: "Describe brevemente la diferencia entre HTML, CSS y JavaScript.", maxPoints: 10, rubricText: "Debe explicar que HTML es estructura (3 puntos), CSS es presentación/estilo (3 puntos) y JavaScript es comportamiento/interactividad (4 puntos)." },
  ],
  "demo-exam-2": [
    { id: "q1-e2", examId: "demo-exam-2", order: 0, text: "¿Qué es el Virtual DOM y por qué es beneficioso para el rendimiento?", maxPoints: 10, rubricText: "Mencionar que es una representación en memoria del DOM real (5 puntos). Explicar que React compara el VDOM con el anterior y solo actualiza los cambios en el DOM real (batching/diffing) para minimizar manipulaciones costosas (5 puntos)." },
  ]
};

export const BASE_FAKE_SUBMISSIONS = {
  "demo-exam-1": [
    { id: "sub1-e1", examId: "demo-exam-1", respondentName: "Estudiante Aplicado", respondentEmail: "estudiante1@demo.com", createdAt: new Date().toISOString(), gradeState: "GRADED_DRAFT", manualTotalPoints: 18, aiTotalPoints: 17, definitiveSource: "MANUAL", totalPoints: 18 },
    { id: "sub2-e1", examId: "demo-exam-1", respondentName: "Estudiante Creativo", respondentEmail: "estudiante2@demo.com", createdAt: new Date().toISOString(), gradeState: "UNGRADED", manualTotalPoints: null, aiTotalPoints: null, definitiveSource: null, totalPoints: null },
  ]
};

export const BASE_FAKE_ANSWERS = {
  "sub1-e1": [
    { questionId: "q1-e1", text: "Fue Tim Berners-Lee en 1989. Propuso un sistema para que los científicos del CERN pudieran compartir información." },
    { questionId: "q2-e1", text: "HTML es para poner el texto y las imágenes, CSS para que se vea bonito con colores y fuentes, y JS para que los botones hagan cosas." },
  ],
  "sub2-e1": [
    { questionId: "q1-e1", text: "Creo que fue Bill Gates." },
    { questionId: "q2-e1", text: "HTML son las etiquetas, CSS es lo que va en el <style> y JS es para las funciones." },
  ]
};

export const BASE_FAKE_GRADES = {
  "sub1-e1": {
    state: "GRADED_DRAFT",
    manualTotalPoints: 18,
    aiTotalPoints: 17,
    manualCommentsOverall: "¡Muy buen trabajo! Las definiciones son claras y precisas.",
    aiCommentsOverall: "Desde la IA: gran comprensión general; revisa detalles técnicos en la distinción HTML/CSS/JS.",
    commentsOverall: "¡Muy buen trabajo! Las definiciones son claras y precisas.",
    definitiveSource: "MANUAL",
    answerGrades: {
        "q1-e1": { manualPoints: 10, manualComment: "Perfecto.", aiSuggestedPoints: 10, aiSuggestedComment: "Respuesta completa y correcta." },
        "q2-e1": { manualPoints: 8, manualComment: "Buena explicación conceptual, aunque se podría ser más técnico.", aiSuggestedPoints: 7, aiSuggestedComment: "Identifica correctamente los roles, pero la descripción es coloquial." },
    }
  }
};

export const BASE_FAKE_RESPONDED_EXAMS = [
    { id: 'some-other-exam-id', title: 'Demo: Fundamentos de IA', state: 'GRADED_FINAL', submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), totalPoints: 85, submissionId: 'sub-ia-1' }
];

// ----- Comprehensive demo data generation -----

type DemoMaps = {
  exams: Record<string, any>;
  questions: Record<string, any[]>;
  submissions: Record<string, any[]>;
  answers: Record<string, any[]>;
  grades: Record<string, any>;
  respondedExams: any[];
};

function generateComprehensiveDemo(): DemoMaps {
  const ownerUid = 'demo-user-123';
  const exams: Record<string, any> = {};
  const questions: Record<string, any[]> = {};
  const submissions: Record<string, any[]> = {};
  const answers: Record<string, any[]> = {};
  const grades: Record<string, any> = {};
  const respondedExams: any[] = [];

  const now = Date.now();

  const makeQ = (examIndex: number) => [
    { id: `q1-e${examIndex}`, examId: `demo-exam-${examIndex}`, order: 0, text: `Pregunta 1 del examen ${examIndex}`, maxPoints: 10, rubricText: 'Criterios claros para P1.' },
    { id: `q2-e${examIndex}`, examId: `demo-exam-${examIndex}`, order: 1, text: `Pregunta 2 del examen ${examIndex}`, maxPoints: 15, rubricText: 'Criterios claros para P2.' },
    { id: `q3-e${examIndex}`, examId: `demo-exam-${examIndex}`, order: 2, text: `Pregunta 3 del examen ${examIndex}`, maxPoints: 20, rubricText: 'Criterios claros para P3.' },
  ];

  const maxTotal = 10 + 15 + 20; // 45

  const scenarios = [
    'UNGRADED',
    'MANUAL_ONLY',
    'AI_ONLY',
    'BOTH_MANUAL_CHOSEN',
    'BOTH_AI_CHOSEN',
    'DEF_MANUAL',
    'DEF_AI',
  ] as const;

  const mkSubmission = (examId: string, examIndex: number, scenario: typeof scenarios[number], idx: number) => {
    const subId = `sub-${examIndex}-${idx}`;
    const baseSub = {
      id: subId,
      examId,
      respondentName: `Estudiante ${idx}`,
      respondentEmail: `estudiante${idx}@demo.com`,
      createdAt: new Date(now - (examIndex * 3600_000) - (idx * 600_000)).toISOString(),
    } as any;

    const qids = [`q1-e${examIndex}`, `q2-e${examIndex}`, `q3-e${examIndex}`];
    answers[subId] = qids.map((qid, qIdx) => ({ questionId: qid, text: `Respuesta ${qIdx + 1} del estudiante ${idx} para examen ${examIndex}.` }));

    const pick = (n: number) => Math.max(0, Math.min(n, maxTotal));
    const manual = pick(25 + ((examIndex + idx) % 15));
    const ai = pick(22 + ((examIndex * 2 + idx) % 18));

    const manualSplit = [Math.min(10, manual - 15), Math.min(15, 10), Math.max(0, manual - 10 - Math.min(15, 10))];
    const aiSplit = [Math.min(10, ai - 15), Math.min(15, 10), Math.max(0, ai - 10 - Math.min(15, 10))];

    const buildAnswerGrades = (withManual: boolean, withAI: boolean) => ({
      [qids[0]]: {
        manualPoints: withManual ? Math.max(0, manualSplit[0]) : null,
        manualComment: withManual ? 'Corrección manual P1.' : null,
        aiSuggestedPoints: withAI ? Math.max(0, aiSplit[0]) : null,
        aiSuggestedComment: withAI ? 'Sugerencia IA P1.' : null,
      },
      [qids[1]]: {
        manualPoints: withManual ? Math.max(0, manualSplit[1]) : null,
        manualComment: withManual ? 'Corrección manual P2.' : null,
        aiSuggestedPoints: withAI ? Math.max(0, aiSplit[1]) : null,
        aiSuggestedComment: withAI ? 'Sugerencia IA P2.' : null,
      },
      [qids[2]]: {
        manualPoints: withManual ? Math.max(0, manualSplit[2]) : null,
        manualComment: withManual ? 'Corrección manual P3.' : null,
        aiSuggestedPoints: withAI ? Math.max(0, aiSplit[2]) : null,
        aiSuggestedComment: withAI ? 'Sugerencia IA P3.' : null,
      },
    });

    let sub: any = {};
    let grade: any = null;
    switch (scenario) {
      case 'UNGRADED':
        sub = { ...baseSub, gradeState: 'UNGRADED', manualTotalPoints: null, aiTotalPoints: null, definitiveSource: null, totalPoints: null };
        break;
      case 'MANUAL_ONLY':
        sub = { ...baseSub, gradeState: 'GRADED_DRAFT', manualTotalPoints: manual, aiTotalPoints: null, definitiveSource: 'MANUAL', totalPoints: manual };
        grade = {
          state: 'GRADED_DRAFT', manualTotalPoints: manual, aiTotalPoints: null,
          manualCommentsOverall: 'Comentario general manual (borrador).',
          definitiveSource: 'MANUAL',
          answerGrades: buildAnswerGrades(true, false),
        };
        break;
      case 'AI_ONLY':
        sub = { ...baseSub, gradeState: 'GRADED_DRAFT', manualTotalPoints: null, aiTotalPoints: ai, definitiveSource: 'AI', totalPoints: ai };
        grade = {
          state: 'GRADED_DRAFT', manualTotalPoints: null, aiTotalPoints: ai,
          aiCommentsOverall: 'Comentario general generado por IA.',
          commentsOverall: 'Compat: comentario global (deprecated).',
          definitiveSource: 'AI',
          answerGrades: buildAnswerGrades(false, true),
        };
        break;
      case 'BOTH_MANUAL_CHOSEN':
        sub = { ...baseSub, gradeState: 'GRADED_DRAFT', manualTotalPoints: manual, aiTotalPoints: ai, definitiveSource: 'MANUAL', totalPoints: manual };
        grade = {
          state: 'GRADED_DRAFT', manualTotalPoints: manual, aiTotalPoints: ai,
          manualCommentsOverall: 'Se elige la nota manual.', aiCommentsOverall: 'IA sugiere otra calificación.',
          definitiveSource: 'MANUAL',
          answerGrades: buildAnswerGrades(true, true),
        };
        break;
      case 'BOTH_AI_CHOSEN':
        sub = { ...baseSub, gradeState: 'GRADED_DRAFT', manualTotalPoints: manual, aiTotalPoints: ai, definitiveSource: 'AI', totalPoints: ai };
        grade = {
          state: 'GRADED_DRAFT', manualTotalPoints: manual, aiTotalPoints: ai,
          manualCommentsOverall: 'Profe corrige pero se elige IA.', aiCommentsOverall: 'IA seleccionada como definitiva.',
          definitiveSource: 'AI',
          answerGrades: buildAnswerGrades(true, true),
        };
        break;
      case 'DEF_MANUAL':
        sub = { ...baseSub, gradeState: 'GRADED_FINAL', manualTotalPoints: manual, aiTotalPoints: ai, definitiveSource: 'MANUAL', totalPoints: manual };
        grade = {
          state: 'GRADED_FINAL', manualTotalPoints: manual, aiTotalPoints: ai,
          manualCommentsOverall: 'Final: manual definitivo.', aiCommentsOverall: 'IA como referencia.',
          definitiveSource: 'MANUAL',
          answerGrades: buildAnswerGrades(true, true),
        };
        break;
      case 'DEF_AI':
        sub = { ...baseSub, gradeState: 'GRADED_FINAL', manualTotalPoints: manual, aiTotalPoints: ai, definitiveSource: 'AI', totalPoints: ai };
        grade = {
          state: 'GRADED_FINAL', manualTotalPoints: manual, aiTotalPoints: ai,
          manualCommentsOverall: 'Final manual disponible.', aiCommentsOverall: 'Final: IA definitiva.',
          definitiveSource: 'AI',
          answerGrades: buildAnswerGrades(true, true),
        };
        break;
    }

    return { sub, grade };
  };

  // Generate 60 additional exams to exercise pagination and diverse states
  for (let i = 3; i <= 62; i++) {
    const id = `demo-exam-${i}`;
    const state = (i % 4 === 0) ? 'EVALUATED' : (i % 4 === 1) ? 'DRAFT' : (i % 4 === 2) ? 'PUBLISHED' : 'EVALUATED';
    const qs = makeQ(i);
    const questionsCount = qs.length;
    const maxTotalPoints = qs.reduce((s, q) => s + q.maxPoints, 0);
    exams[id] = {
      id,
      ownerUid,
      title: `Demo: Examen ${i}`,
      description: `Examen de demostración #${i} con ${questionsCount} preguntas y estado ${state}.`,
      state,
      createdAt: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
      publicToken: (state === 'PUBLISHED' || state === 'EVALUATED') ? `demo-token-${id}` : null,
      questionsCount,
      maxTotalPoints,
    };
    questions[id] = qs;

    // Assign between 3 and 5 submissions cycling through scenarios
    const scs = scenarios.slice(0, 3 + (i % 3));
    submissions[id] = [];
    scs.forEach((sc, idx) => {
      const { sub, grade } = mkSubmission(id, i, sc, idx + 1);
      submissions[id].push(sub);
      if (grade) grades[sub.id] = grade;

      // Add some respondedExams rows
      if (sub.gradeState !== 'UNGRADED' && (idx % 2 === 0)) {
        respondedExams.push({
          id,
          title: exams[id].title,
          state: sub.gradeState,
          submittedAt: sub.createdAt,
          totalPoints: sub.totalPoints ?? 0,
          submissionId: sub.id,
        });
      }
    });
  }

  return { exams, questions, submissions, answers, grades, respondedExams };
}

const GENERATED = generateComprehensiveDemo();

export const FAKE_EXAMS = { ...BASE_FAKE_EXAMS, ...GENERATED.exams };
export const FAKE_QUESTIONS = { ...BASE_FAKE_QUESTIONS, ...GENERATED.questions };
export const FAKE_SUBMISSIONS = { ...BASE_FAKE_SUBMISSIONS, ...GENERATED.submissions };
export const FAKE_ANSWERS = { ...BASE_FAKE_ANSWERS, ...GENERATED.answers };
export const FAKE_GRADES = { ...BASE_FAKE_GRADES, ...GENERATED.grades };
export const FAKE_RESPONDED_EXAMS = [...BASE_FAKE_RESPONDED_EXAMS, ...GENERATED.respondedExams];