/**
 * BioAula · ui.js
 * Funciones de interfaz: navegación, toast, tabs y utilidades visuales.
 */

import { state } from './state.js';

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastTimer;

/**
 * Muestra una notificación flotante.
 * @param {string}  msg   - Mensaje a mostrar
 * @param {boolean} isErr - Si es true, muestra color de error
 */
export function toast(msg, isErr = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.borderColor = isErr ? 'rgba(248,113,113,0.4)' : 'var(--border2)';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ── Navegación principal ───────────────────────────────────────────────────────

const VIEW_MAP = { profesor: 'prof', estadisticas: 'stats', estudiante: 'est', config: 'cfg' };

/**
 * Cambia la vista activa de la aplicación.
 * @param {string} v - Nombre de la vista: 'profesor' | 'estadisticas' | 'estudiante' | 'config'
 */
export function switchView(v) {
  if (state.studentMode && ['estadisticas', 'profesor', 'config'].includes(v)) return;

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  document.getElementById('view-' + v)?.classList.add('active');
  document.getElementById('tab-' + VIEW_MAP[v])?.classList.add('active');

  if (v === 'estadisticas') {
    // Importación dinámica para evitar dependencia circular
    import('./stats.js').then(m => m.renderStats());
  }
}

// ── Tabs del material ─────────────────────────────────────────────────────────

/**
 * Cambia la pestaña de material (texto / archivos / URLs).
 * @param {string} t - 'texto' | 'archivos' | 'urls'
 */
export function switchMatTab(t) {
  const tabNames = ['texto', 'archivos', 'urls'];
  document.querySelectorAll('.inner-tab').forEach((btn, i) =>
    btn.classList.toggle('active', tabNames[i] === t)
  );
  document.querySelectorAll('.inner-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('mat-' + t)?.classList.add('active');
}

// ── Modo generación ───────────────────────────────────────────────────────────

/**
 * Activa/desactiva el estado de "generando" del botón principal.
 * @param {boolean} v
 */
export function setGenerating(v) {
  document.getElementById('gen-dots').style.display  = v ? 'inline-flex' : 'none';
  document.getElementById('gen-label').textContent   = v
    ? 'Generando con Gemini 2.5...'
    : 'Generar banco de preguntas + apoyo →';
  document.getElementById('gen-btn').disabled = v;
}

// ── Badge de estadísticas ─────────────────────────────────────────────────────

export function refreshStatsBadge() {
  const b = document.getElementById('stats-badge');
  if (!b) return;
  if (state.results.length > 0) {
    b.style.display = 'inline';
    b.textContent = state.results.length;
  } else {
    b.style.display = 'none';
  }
}

// ── Setup / App screens ───────────────────────────────────────────────────────

export function showApp() {
  document.getElementById('setup-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const el = document.getElementById('apikey-edit');
  if (el) el.value = state.apiKey;
}

// ── Detalle de estudiante ─────────────────────────────────────────────────────

export function toggleStudentDetail(sid) {
  const panel = document.getElementById(sid);
  const ico   = document.getElementById('ico-' + sid);
  if (!panel) return;
  const open = panel.classList.toggle('open');
  if (ico) ico.classList.toggle('open', open);
}
