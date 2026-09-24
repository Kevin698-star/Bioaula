/**
 * BioAula · files.js
 * Manejo de carga y previsualización de archivos del material de clase.
 */

import { state } from './state.js';

const FILE_ICONS = {
  pdf: '📄', docx: '📝', doc: '📝', txt: '📋',
  png: '🖼', jpg: '🖼', jpeg: '🖼', md: '📝', csv: '📊', default: '📎',
};

// ── Drag & Drop ───────────────────────────────────────────────────────────────

export function onDragOver(e) {
  e.preventDefault();
  document.getElementById('upload-zone')?.classList.add('drag');
}

export function onDragLeave() {
  document.getElementById('upload-zone')?.classList.remove('drag');
}

export function onDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone')?.classList.remove('drag');
  handleFiles(e.dataTransfer.files);
}

// ── Procesamiento de archivos ─────────────────────────────────────────────────

/**
 * Procesa un FileList y los agrega al estado.
 * Imágenes → base64, resto → texto.
 * @param {FileList} files
 */
export async function handleFiles(files) {
  for (const file of files) {
    const ext  = file.name.split('.').pop().toLowerCase();
    const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);

    let content, type;
    if (isImg) {
      content = await fileToBase64(file);
      type    = 'image';
    } else {
      content = await file.text();
      type    = 'text';
    }

    state.uploadedFiles.push({ name: file.name, content, type, mime: file.type });
  }
  renderFileList();
}

function fileToBase64(file) {
  return new Promise(res => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
}

// ── Render de la lista de archivos ────────────────────────────────────────────

export function renderFileList() {
  const container = document.getElementById('file-list');
  if (!container) return;

  container.innerHTML = state.uploadedFiles.map((f, i) => {
    const ext  = f.name.split('.').pop().toLowerCase();
    const icon = FILE_ICONS[ext] || FILE_ICONS.default;
    return `
      <div class="file-chip">
        <span>${icon}</span>
        <span class="file-chip-name">${f.name}</span>
        <span class="file-chip-remove" data-index="${i}">✕</span>
      </div>`;
  }).join('');

  // Delegación de eventos para remover archivos
  container.querySelectorAll('.file-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      state.uploadedFiles.splice(Number(btn.dataset.index), 1);
      renderFileList();
    });
  });
}

// ── Construir partes de Gemini desde archivos ─────────────────────────────────

/**
 * Convierte los archivos cargados en partes listas para enviar a Gemini.
 * @returns {Array} extraParts para callGemini()
 */
export function buildGeminiFileParts() {
  return state.uploadedFiles.map(f => {
    if (f.type === 'image') {
      return { inlineData: { mimeType: f.mime, data: f.content } };
    }
    return { text: `[Contenido de archivo "${f.name}"]:\n${f.content.substring(0, 8000)}` };
  });
}
