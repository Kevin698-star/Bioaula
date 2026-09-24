/**
 * BioAula · quiz-player.js
 * Lógica del flujo de prueba para el estudiante: inicio, preguntas y resultados.
 */

import { state, callGemini, saveResults } from './state.js';
import { toast, refreshStatsBadge } from './ui.js';

const LETTERS = ['A', 'B', 'C', 'D'];

// ── Material de estudio ───────────────────────────────────────────────────────

export function showStudyMaterial() {
  const el = document.getElementById('study-material-preview');
  if (!el || !state.quiz) return;
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-icon">📖</div>
        <div>
          <div class="card-title">Material de estudio · ${state.quiz.topic}</div>
          <div class="card-sub">Repasa antes de comenzar</div>
        </div>
      </div>
      <div class="support-block">${state.quiz.apoyo || 'Sin material de apoyo todavía.'}</div>
    </div>`;
}

// ── Inicio del quiz ───────────────────────────────────────────────────────────

export function startQuiz() {
  if (!state.quiz) { toast('El profesor aún no ha generado una prueba', true); return; }

  const name = document.getElementById('student-name').value.trim();
  const doc  = document.getElementById('student-doc').value.trim();

  if (!name)                          { toast('Escribe tu nombre completo', true); return; }
  if (!doc)                           { toast('Escribe tu número de documento', true); return; }
  if (!/^\d{5,15}$/.test(doc))        { toast('El documento debe tener entre 5 y 15 dígitos', true); return; }

  const ya = state.results.find(r => r.doc === doc);
  if (ya && !confirm(`El documento ${doc} ya completó esta prueba con ${ya.pct}%. ¿Deseas repetirla?`)) return;

  state.studentName    = name;
  state.studentDoc     = doc;
  state.currentQ       = 0;
  state.studentAnswers = [];
  state.myQuestions    = selectQuestions(name);

  document.getElementById('student-start').style.display   = 'none';
  document.getElementById('quiz-container').style.display  = 'block';
  renderQuestion();
}

// ── Selección determinística de preguntas ─────────────────────────────────────

function selectQuestions(name) {
  const seed  = [...name].reduce((a, c, i) => a + c.charCodeAt(0) * (i + 1), 0);
  const banco = [...state.quiz.banco];

  // Shuffle determinístico
  for (let i = banco.length - 1; i > 0; i--) {
    const j = Math.abs(Math.floor(Math.sin(seed * (i + 1)) * 10000)) % (i + 1);
    [banco[i], banco[j]] = [banco[j], banco[i]];
  }

  const subtemas = [...new Set(state.quiz.banco.map(p => p.subtema))];
  const numQ     = state.quiz.numQ;
  const selected = [];

  // Al menos 1 pregunta por subtema
  for (const sub of subtemas) {
    if (selected.length >= numQ) break;
    const q = banco.find(p => p.subtema === sub && !selected.includes(p));
    if (q) selected.push(q);
  }

  // Completar con el resto del banco
  for (const q of banco) {
    if (selected.length >= numQ) break;
    if (!selected.includes(q)) selected.push(q);
  }

  return selected.slice(0, numQ);
}

// ── Render de una pregunta ────────────────────────────────────────────────────

export function renderQuestion() {
  const total = state.myQuestions.length;
  const curr  = state.currentQ;
  const q     = state.myQuestions[curr];

  document.getElementById('progress-bar').style.width = `${(curr / total) * 100}%`;

  // Escapar explicación para uso inline en atributo
  const explEscaped = (q.explicacion || '').replace(/`/g, "'").replace(/\n/g, ' ');

  document.getElementById('question-area').innerHTML = `
    <div class="card">
      <div class="question-num">Pregunta ${curr + 1} de ${total} · ${q.subtema || state.quiz.topic}</div>
      <div class="question-text">${q.pregunta}</div>
      <div class="options">
        ${q.opciones.map((op, i) => `
          <button class="option-btn" id="opt-${i}"
            data-index="${i}" data-correct="${q.correcta}"
            data-expl="${explEscaped}">
            <div class="option-letter">${LETTERS[i]}</div>
            <span>${op}</span>
          </button>`).join('')}
      </div>
      <div class="explanation" id="explanation">${q.explicacion || ''}</div>
      <div id="next-btn-area" style="margin-top:1rem;display:none">
        <button class="btn btn-primary" id="next-btn">
          ${curr + 1 < total ? 'Siguiente →' : 'Ver resultados →'}
        </button>
      </div>
    </div>`;

  // Eventos
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => handleOptionSelect(
      Number(btn.dataset.index),
      Number(btn.dataset.correct),
      btn.dataset.expl
    ));
  });

  document.getElementById('next-btn')?.addEventListener('click', nextQuestion);
}

// ── Selección de opción ───────────────────────────────────────────────────────

function handleOptionSelect(selected, correct, explanation) {
  document.querySelectorAll('.option-btn').forEach(b => (b.disabled = true));

  state.studentAnswers.push({
    selected,
    correct,
    subtema:  state.myQuestions[state.currentQ].subtema,
    pregunta: state.myQuestions[state.currentQ].pregunta,
    opciones: state.myQuestions[state.currentQ].opciones,
  });

  document.querySelectorAll('.option-btn').forEach((b, i) => {
    if (i === correct)                        b.classList.add('correct');
    else if (i === selected && selected !== correct) b.classList.add('wrong');
  });

  document.getElementById('explanation').style.display = 'block';
  document.getElementById('next-btn-area').style.display = 'block';
}

// ── Siguiente pregunta ────────────────────────────────────────────────────────

function nextQuestion() {
  state.currentQ++;
  if (state.currentQ >= state.myQuestions.length) showResults();
  else renderQuestion();
}

// ── Resultados ────────────────────────────────────────────────────────────────

export async function showResults() {
  document.getElementById('quiz-container').style.display = 'none';
  const rc = document.getElementById('results-container');
  rc.style.display = 'block';

  const score = state.studentAnswers.filter(a => a.selected === a.correct).length;
  const total = state.myQuestions.length;
  const pct   = Math.round((score / total) * 100);
  const circ  = 2 * Math.PI * 40;
  const offset = circ - (pct / 100) * circ;

  const msg = pct >= 85 ? '¡Excelente! Dominas el tema.'
    : pct >= 70 ? 'Muy bien. Repasa los errores.'
    : pct >= 50 ? 'Aprobado. Refuerza los conceptos fallidos.'
    : 'Necesitas repasar el tema completo.';

  // Calcular subtemas
  const subtemasMap = {};
  state.studentAnswers.forEach(a => {
    if (!subtemasMap[a.subtema]) subtemasMap[a.subtema] = { ok: 0, total: 0 };
    subtemasMap[a.subtema].total++;
    if (a.selected === a.correct) subtemasMap[a.subtema].ok++;
  });
  const subtemasDebiles = Object.entries(subtemasMap)
    .filter(([, v]) => v.ok / v.total < 0.6)
    .map(([k]) => k);

  // Guardar resultado
  const result = {
    name: state.studentName, doc: state.studentDoc,
    score, total, pct, subtemas: subtemasMap, subtemasDebiles, timestamp: Date.now(),
  };
  state.results = state.results.filter(r => r.doc !== state.studentDoc);
  state.results.push(result);
  saveResults();
  refreshStatsBadge();

  rc.innerHTML = `
    <div class="card">
      <div style="text-align:center;padding:1rem 0 1.5rem">
        <div class="score-ring">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle class="bg" cx="50" cy="50" r="40" stroke-dasharray="${circ}" stroke-dashoffset="0"/>
            <circle class="fg" cx="50" cy="50" r="40" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
          </svg>
          <div>
            <div class="score-num">${pct}%</div>
            <div class="score-label">${score}/${total}</div>
          </div>
        </div>
        <p style="font-family:'Syne',sans-serif;font-size:16px;font-weight:600;color:var(--text);margin-top:8px">${state.studentName}</p>
        <p style="font-size:12px;color:var(--text3);margin-top:2px">Doc: ${state.studentDoc}</p>
        <p style="font-size:13px;color:var(--text3);margin-top:4px">${msg}</p>
      </div>

      ${subtemasDebiles.length > 0
        ? `<div class="alert alert-warn"><strong>Subtemas a reforzar:</strong> ${subtemasDebiles.join(' · ')}</div>`
        : `<div class="alert" style="background:rgba(74,222,128,0.07);border-color:rgba(74,222,128,0.25);color:var(--accent2)">✓ ¡Excelente! Dominas todos los subtemas evaluados.</div>`}

      <div class="divider"></div>
      <p style="font-size:12px;font-weight:500;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Tu desempeño por subtema</p>
      ${Object.entries(subtemasMap)
        .sort((a, b) => (a[1].ok / a[1].total) - (b[1].ok / b[1].total))
        .map(([sub, v]) => {
          const p     = Math.round((v.ok / v.total) * 100);
          const color = p >= 80 ? 'var(--accent)' : p >= 60 ? 'var(--warn)' : 'var(--danger)';
          const cls   = p >= 80 ? 'score-high'   : p >= 60 ? 'score-mid'  : 'score-low';
          return `<div class="topic-row">
            <div class="topic-name">${sub}</div>
            <div class="topic-bar-wrap"><div class="topic-bar" style="width:${p}%;background:${color}"></div></div>
            <div class="topic-pct ${cls}">${p}%</div>
            ${p < 60 ? '<span style="font-size:11px;padding:2px 7px;border-radius:20px;background:rgba(248,113,113,0.1);color:var(--danger);margin-left:6px">Reforzar</span>' : ''}
          </div>`;
        }).join('')}

      <div class="divider"></div>
      <p style="font-size:12px;font-weight:500;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Detalle de respuestas</p>
      ${state.studentAnswers.map((a) => {
        const ok = a.selected === a.correct;
        return `<div class="result-item ${ok ? 'result-ok' : 'result-fail'}">
          <span style="margin-right:6px">${ok ? '✓' : '✗'}</span>
          <strong>${a.pregunta.substring(0, 72)}${a.pregunta.length > 72 ? '...' : ''}</strong>
          ${!ok ? `<br><span style="font-size:12px;opacity:0.7;margin-left:16px">Tu respuesta: ${a.opciones[a.selected]} · Correcta: ${a.opciones[a.correct]}</span>` : ''}
        </div>`;
      }).join('')}
    </div>

    <div id="ai-support-area">
      <div class="loading-box">
        <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        Generando retroalimentación personalizada con IA...
      </div>
    </div>
    <div class="btn-row" style="margin-top:1rem">
      <button class="btn" onclick="window.BioAula.retakeQuiz()">Reintentar prueba</button>
    </div>`;

  // Retroalimentación IA personalizada
  try {
    const wrongItems = state.studentAnswers
      .filter(a => a.selected !== a.correct)
      .map(a => ({
        pregunta: a.pregunta, subtema: a.subtema,
        opcionElegida: a.opciones[a.selected], opcionCorrecta: a.opciones[a.correct],
      }));

    const promptRes = await fetch('/api/student-feedback-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: state.studentName,
        topic:       state.quiz.topic,
        pct, weakTopics: subtemasDebiles, wrongItems,
      }),
    });
    const { prompt, system } = await promptRes.json();
    const support = await callGemini(prompt, system);

    const icon  = pct >= 80 ? '🌟' : '🧬';
    const title = pct >= 80 ? '¡Muy bien hecho!'              : 'Refuerzo personalizado para ti';
    const sub   = pct >= 80 ? 'Sigue así y llega más lejos'   : 'Basado en tus errores específicos';

    document.getElementById('ai-support-area').innerHTML = `
      <div class="card" style="border-color:rgba(74,222,128,0.3)">
        <div class="card-header">
          <div class="card-icon">${icon}</div>
          <div><div class="card-title">${title}</div><div class="card-sub">${sub}</div></div>
        </div>
        <div class="support-block">${support}</div>
      </div>`;
  } catch (_) {
    document.getElementById('ai-support-area').innerHTML = '';
  }
}

// ── Reintentar prueba ─────────────────────────────────────────────────────────

export function retakeQuiz() {
  state.currentQ       = 0;
  state.studentAnswers = [];
  state.studentDoc     = '';

  document.getElementById('results-container').style.display = 'none';
  document.getElementById('student-start').style.display     = 'block';

  const docEl = document.getElementById('student-doc');
  if (docEl) docEl.value = '';
  showStudyMaterial();
}
