# BioAula · Estructura Modular

Plataforma educativa con IA — migrada de un solo HTML monolítico a una
arquitectura modular con Flask (Python), CSS separado y JS en módulos ES6.

---

## Estructura del proyecto

```
bioaula/
│
├── app.py                  ← Servidor Flask (lógica backend en Python)
├── requirements.txt
│
├── templates/
│   └── index.html          ← HTML limpio con Jinja2, sin CSS ni JS inline
│
└── static/
    ├── css/
    │   └── styles.css      ← Todos los estilos (variables, componentes, utilidades)
    │
    └── js/
        ├── main.js         ← Punto de entrada: inicialización y API pública global
        ├── state.js        ← Estado global + función callGemini + persistencia
        ├── ui.js           ← Navegación, toast, tabs, badges
        ├── files.js        ← Carga de archivos, drag & drop, partes para Gemini
        ├── quiz-generator.js ← Generación del banco, parser JSON, share link, QR
        ├── quiz-player.js  ← Flujo del estudiante: inicio, preguntas, resultados
        └── stats.js        ← Estadísticas del grupo + análisis pedagógico IA
```

---

## Responsabilidades por capa

| Capa | Responsabilidad |
|------|----------------|
| `app.py` | Rutas Flask, construcción de prompts para Gemini, validación básica |
| `styles.css` | Todo el diseño visual (variables CSS, componentes, animaciones) |
| `state.js` | Estado global, llamadas a Gemini API, localStorage |
| `ui.js` | Navegación entre vistas, toast, tabs, badges de conteo |
| `files.js` | Drag & drop, lectura de archivos, conversión a partes de Gemini |
| `quiz-generator.js` | Genera el banco de preguntas, parser JSON robusto, compartir enlace |
| `quiz-player.js` | Flujo completo del estudiante (inicio → pregunta → resultado) |
| `stats.js` | Dashboard del profesor con estadísticas y recomendaciones IA |
| `index.html` | Estructura HTML semántica, sin lógica ni estilos inline |

---

## Instalación y uso

```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Ejecutar el servidor
python app.py

# 3. Abrir en el navegador
# http://localhost:5000
```

---

## Flujo de datos

```
Profesor ingresa material
       ↓
[Navegador] → POST /api/build-prompts → [Flask/Python]
       ↓ recibe prompts listos
[Navegador] → Gemini API (directo, con API Key del usuario)
       ↓ banco de preguntas JSON + material de apoyo
Estado en memoria (state.js) + localStorage
       ↓
Enlace con quiz codificado en base64 → estudiantes
       ↓
[Estudiante] responde prueba → resultado guardado en localStorage
       ↓
[Vista Estadísticas] → POST /api/teacher-analysis-prompt → [Flask]
       ↓ prompt listo
[Navegador] → Gemini API → recomendaciones pedagógicas
```

---

## Notas de diseño

- **La API Key de Gemini nunca pasa por el servidor Flask** — el navegador
  llama directamente a `generativelanguage.googleapis.com`.
- **Flask solo construye prompts** — no almacena datos de estudiantes ni resultados.
- **Los módulos JS usan ES6 `import/export`** — requieren `type="module"` en el script.
- **`window.BioAula`** expone las funciones necesarias para los `onclick` del HTML.
