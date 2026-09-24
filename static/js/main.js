/**
 * BioAula · main.js
 * Punto de entrada: inicialización y exposición global de la API pública.
 */

import { state, loadPersistedData } from './state.js';
import { toast, switchView, switchMatTab, setGenerating, refreshStatsBadge, showApp, toggleStudentDetail } from './ui.js';
import { onDragOver, onDragLeave, onDrop, handleFiles } from './files.js';
import { generateAll, showQuizReadyBadge, regenerateQuiz, renderShareLink, copyShareLink, openStudentMode, showQR } from './quiz-generator.js';
import { startQuiz, showStudyMaterial, retakeQuiz } from './quiz-player.js';

// ── Inicialización ────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  loadPersistedData();
  checkStudentMode();

  if (state.apiKey) showApp();
  if (state.quiz)   { showQuizReadyBadge(); showStudyMaterial(); }

  refreshStatsBadge();

  const apikeyEdit = document.getElementById('apikey-edit');
  if (apikeyEdit) apikeyEdit.value = state.apiKey;
});

// ── Modo estudiante desde URL ─────────────────────────────────────────────────

function checkStudentMode() {
  const params    = new URLSearchParams(window.location.search);
  const mode      = params.get('mode');
  const quizParam = params.get('quiz');

  if (mode !== 'estudiante') return;

  if (quizParam) {
    try {
      const quiz = JSON.parse(decodeURIComponent(escape(atob(quizParam))));
      state.quiz = quiz;
      localStorage.setItem('bioaula_quiz', JSON.stringify(quiz));
    } catch (_) {}
  }

  state.studentMode = true;

  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('app').style.display          = 'block';

  ['tab-prof', 'tab-stats', 'tab-cfg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  switchView('estudiante');
  showStudyMaterial();
}

// ── Gestión de API Key ────────────────────────────────────────────────────────

function saveApiKey() {
  const k = document.getElementById('apikey-input').value.trim();
  if (!k.startsWith('AIza')) { toast('API Key inválida. Debe empezar con AIza...', true); return; }
  state.apiKey = k;
  localStorage.setItem('bioaula_key', k);
  showApp();
  toast('¡Bienvenido a BioAula!');
}

function updateApiKey() {
  const k = document.getElementById('apikey-edit').value.trim();
  if (!k) return;
  state.apiKey = k;
  localStorage.setItem('bioaula_key', k);
  toast('API Key actualizada');
}

function clearResults() {
  if (!confirm('¿Borrar todos los resultados de estudiantes?')) return;
  state.results = [];
  localStorage.removeItem('bioaula_results');
  refreshStatsBadge();

  // Reimportar stats para limpiar la vista
  import('./stats.js').then(m => m.renderStats());
  toast('Resultados borrados');
}

function clearAll() {
  if (!confirm('¿Borrar todo?')) return;
  localStorage.clear();
  location.reload();
}

// ── API pública global (usada por onclick en el HTML) ─────────────────────────

window.BioAula = {
  // Auth
  saveApiKey,
  updateApiKey,
  clearResults,
  clearAll,

  // Navegación
  switchView,
  switchMatTab,

  // Archivos
  onDragOver,
  onDragLeave,
  onDrop,
  handleFiles: e => handleFiles(e.files),

  // Generación
  generateAll,
  regenerateQuiz,
  copyShareLink,
  openStudentMode,
  showQR,
  renderShareLink,

  // Quiz (estudiante)
  startQuiz,
  retakeQuiz,

  // UI
  toggleStudentDetail,
};
