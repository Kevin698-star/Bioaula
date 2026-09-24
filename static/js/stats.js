/**
 * BioAula · stats.js
 * Renderizado de estadísticas del grupo y análisis pedagógico con IA.
 */

import { state, callGemini } from './state.js';

// ── Render principal de estadísticas ─────────────────────────────────────────

export function renderStats() {
  if (!state.results.length) {
    document.getElementById('stats-empty').style.display   = 'block';
    document.getElementById('stats-content').style.display = 'none';
    return;
  }
  document.getElementById('stats-empty').style.display   = 'none';
  document.getElementById('stats-content').style.display = 'block';

  const n         = state.results.length;
  const avg       = Math.round(state.results.reduce((a, r) => a + r.pct, 0) / n);
  const max       = Math.max(...state.results.map(r => r.pct));
  const min       = Math.min(...state.results.map(r => r.pct));
  const aprobados = state.results.filter(r => r.pct >= 60).length;

  // Subtemas globales
  const globalSubtemas = {};
  state.results.forEach(r => {
    Object.entries(r.subtemas || {}).forEach(([sub, v]) => {
      if (!globalSubtemas[sub]) globalSubtemas[sub] = { ok: 0, total: 0 };
      globalSubtemas[sub].ok    += v.ok;
      globalSubtemas[sub].total += v.total;
    });
  });

  const subtemasOrdenados = Object.entries(globalSubtemas)
    .map(([sub, v]) => ({ sub, pct: Math.round((v.ok / v.total) * 100), total: v.total }))
    .sort((a, b) => a.pct - b.pct);

  const sorted = [...state.results].sort((a, b) => b.pct - a.pct);

  renderSummary(n, avg, max, min, aprobados);
  renderStudents(sorted);
  renderTopics(subtemasOrdenados, avg);
}

// ── Resumen del grupo ─────────────────────────────────────────────────────────

function renderSummary(n, avg, max, min, aprobados) {
  document.getElementById('stats-summary').innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-icon">📊</div>
        <div>
          <div class="card-title">Resumen del grupo · ${state.quiz?.topic || 'Sin tema'}</div>
          <div class="card-sub">${n} estudiante${n !== 1 ? 's' : ''} evaluado${n !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-num">${avg}%</div><div class="stat-label">Promedio</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--accent)">${max}%</div><div class="stat-label">Mejor nota</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--danger)">${min}%</div><div class="stat-label">Menor nota</div></div>
        <div class="stat-card"><div class="stat-num" style="color:var(--warn)">${aprobados}/${n}</div><div class="stat-label">Aprobados</div></div>
      </div>
    </div>`;
}

// ── Lista de estudiantes ──────────────────────────────────────────────────────

function renderStudents(sorted) {
  document.getElementById('stats-students').innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-icon">👥</div>
        <div>
          <div class="card-title">Resultados por estudiante</div>
          <div class="card-sub">Haz clic en un estudiante para ver sus subtemas en detalle</div>
        </div>
      </div>
      ${sorted.map((r, i) => {
        const cls       = r.pct >= 80 ? 'score-high' : r.pct >= 60 ? 'score-mid' : 'score-low';
        const initials  = r.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const sid       = 'sd-' + i;
        const barColor  = r.pct >= 80 ? 'var(--accent)' : r.pct >= 60 ? 'var(--warn)' : 'var(--danger)';

        const subtemasArr = Object.entries(r.subtemas || {})
          .map(([sub, v]) => ({ sub, pct: Math.round((v.ok / v.total) * 100), ok: v.ok, total: v.total }))
          .sort((a, b) => a.pct - b.pct);

        const debiles = subtemasArr.filter(s => s.pct < 60);
        const fuertes = subtemasArr.filter(s => s.pct >= 60);

        return `
          <div class="student-row-wrap">
            <div class="student-row" data-sid="${sid}">
              <div class="student-avatar">${initials}</div>
              <div class="student-name" style="flex:1">
                ${r.name}
                ${r.doc ? `<span style="font-size:11px;color:var(--text3);margin-left:6px">· ${r.doc}</span>` : ''}
              </div>
              <div class="bar-wrap" style="flex:1.2">
                <div class="bar-fill" style="width:${r.pct}%;background:${barColor}"></div>
              </div>
              <div class="student-score ${cls}" style="min-width:44px;text-align:right">${r.pct}%</div>
              ${debiles.length ? `<div style="font-size:11px;padding:2px 7px;border-radius:20px;background:rgba(248,113,113,0.1);color:var(--danger);margin-left:6px;flex-shrink:0">${debiles.length} débil${debiles.length > 1 ? 'es' : ''}</div>` : ''}
              <div class="expand-icon" id="ico-${sid}">▼</div>
            </div>
            <div class="student-detail" id="${sid}">
              <p style="font-size:11px;font-weight:600;color:var(--danger);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">
                ${debiles.length ? '⚠ Subtemas a reforzar' : '✓ Sin subtemas débiles'}
              </p>
              ${debiles.length ? `<div style="margin-bottom:8px">${debiles.map(s =>
                `<span class="subtema-tag subtema-fail">✗ ${s.sub} — ${s.pct}% (${s.ok}/${s.total})</span>`
              ).join('')}</div>` : ''}
              ${fuertes.length ? `
                <p style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Subtemas dominados</p>
                <div style="margin-bottom:8px">${fuertes.map(s =>
                  `<span class="subtema-tag subtema-ok">✓ ${s.sub} — ${s.pct}%</span>`
                ).join('')}</div>` : ''}
            </div>
          </div>`;
      }).join('')}
    </div>`;

  // Eventos de expansión
  document.querySelectorAll('.student-row[data-sid]').forEach(row => {
    row.addEventListener('click', () => {
      const sid   = row.dataset.sid;
      const panel = document.getElementById(sid);
      const ico   = document.getElementById('ico-' + sid);
      if (!panel) return;
      const open = panel.classList.toggle('open');
      if (ico) ico.classList.toggle('open', open);
    });
  });
}

// ── Mapa de calor de subtemas ─────────────────────────────────────────────────

function renderTopics(subtemasOrdenados, avg) {
  if (!subtemasOrdenados.length) {
    document.getElementById('stats-topics').innerHTML = '';
    return;
  }

  const debiles = subtemasOrdenados.filter(s => s.pct < 60);

  document.getElementById('stats-topics').innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-icon">🔥</div>
        <div>
          <div class="card-title">Análisis por subtema</div>
          <div class="card-sub">Porcentaje de acierto del grupo — los más bajos necesitan refuerzo</div>
        </div>
      </div>
      ${subtemasOrdenados.map(s => {
        const color = s.pct >= 80 ? 'var(--accent)' : s.pct >= 60 ? 'var(--warn)' : 'var(--danger)';
        const cls   = s.pct >= 80 ? 'score-high'   : s.pct >= 60 ? 'score-mid'  : 'score-low';
        return `
          <div class="topic-row">
            <div class="topic-name">${s.sub}</div>
            <div class="topic-bar-wrap"><div class="topic-bar" style="width:${s.pct}%;background:${color}"></div></div>
            <div class="topic-pct ${cls}">${s.pct}%</div>
            ${s.pct < 60 ? '<span style="font-size:11px;padding:2px 8px;border-radius:20px;background:rgba(248,113,113,0.1);color:var(--danger);margin-left:6px">Reforzar</span>' : ''}
          </div>`;
      }).join('')}
      ${debiles.length > 0 ? `
        <div class="divider"></div>
        <div id="ai-topic-analysis">
          <div class="loading-box">
            <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
            Generando recomendaciones pedagógicas...
          </div>
        </div>` : ''}
    </div>`;

  if (debiles.length > 0) generateTeacherAnalysis(debiles, avg);
}

// ── Análisis pedagógico IA para el profesor ───────────────────────────────────

async function generateTeacherAnalysis(debiles, avg) {
  const el = document.getElementById('ai-topic-analysis');
  if (!el) return;

  try {
    const promptRes = await fetch('/api/teacher-analysis-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic:       state.quiz?.topic,
        weakTopics:  debiles,
        avg,
        numStudents: state.results.length,
      }),
    });
    const { prompt, system } = await promptRes.json();
    const analysis = await callGemini(prompt, system);

    el.innerHTML = `
      <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
        <p style="font-size:12px;font-weight:500;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">
          Recomendaciones pedagógicas (IA)
        </p>
        <div class="support-block" style="margin:0">${analysis}</div>
      </div>`;
  } catch (_) {
    el.innerHTML = '';
  }
}
