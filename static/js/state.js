/**
 * BioAula · state.js
 * Estado global de la aplicación y comunicación con la API de Gemini.
 */

// ── Estado global ─────────────────────────────────────────────────────────────
export const state = {
  apiKey:        localStorage.getItem('bioaula_key') || '',
  quiz:          null,           // { topic, nivel, numQ, bankSize, banco, apoyo }
  results:       [],             // [{ name, doc, score, total, pct, subtemas, ... }]
  uploadedFiles: [],             // [{ name, content, type, mime }]
  currentQ:      0,
  myQuestions:   [],
  studentAnswers:[],
  studentName:   '',
  studentDoc:    '',
  studentMode:   false,
};

// ── Gemini API ─────────────────────────────────────────────────────────────────

/**
 * Llama a la API de Gemini con un prompt y un system instruction opcional.
 * @param {string} prompt   - Mensaje del usuario
 * @param {string} system   - Instrucción de sistema (opcional)
 * @param {Array}  extraParts - Partes adicionales (imágenes, documentos)
 * @returns {Promise<string>} Texto de respuesta
 */
export async function callGemini(prompt, system = '', extraParts = []) {
  const parts = [...extraParts, { text: prompt }];
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 8192 },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || 'Error de API');
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Utilidades de persistencia ─────────────────────────────────────────────────

export function saveQuiz(quiz) {
  state.quiz = quiz;
  localStorage.setItem('bioaula_quiz', JSON.stringify(quiz));
}

export function saveResults() {
  localStorage.setItem('bioaula_results', JSON.stringify(state.results));
}

export function loadPersistedData() {
  try {
    const savedQuiz = localStorage.getItem('bioaula_quiz');
    if (savedQuiz) state.quiz = JSON.parse(savedQuiz);
  } catch (_) {}

  try {
    const savedResults = localStorage.getItem('bioaula_results');
    if (savedResults) state.results = JSON.parse(savedResults);
  } catch (_) {}
}
