"""
BioAula — Servidor Flask
Lógica central de la plataforma educativa con IA.
"""

from flask import Flask, render_template, request, jsonify
import json
import base64
import os

app = Flask(__name__)


# ─── Rutas principales ───────────────────────────────────────────────────────

@app.route("/")
def index():
    """Página principal — detecta modo estudiante desde query params."""
    mode = request.args.get("mode", "")
    quiz_param = request.args.get("quiz", "")
    return render_template("index.html", student_mode=(mode == "estudiante"), quiz_param=quiz_param)


# ─── API: Validación de API Key ───────────────────────────────────────────────

@app.route("/api/validate-key", methods=["POST"])
def validate_key():
    """Valida formato básico de la API Key de Gemini."""
    data = request.get_json()
    key = data.get("key", "").strip()
    if not key.startswith("AIza"):
        return jsonify({"valid": False, "error": "La API Key debe empezar con 'AIza...'"}), 400
    return jsonify({"valid": True})


# ─── API: Parsing de archivos ─────────────────────────────────────────────────

@app.route("/api/parse-file", methods=["POST"])
def parse_file():
    """
    Recibe un archivo del cliente, extrae su texto legible y lo devuelve.
    Soporta TXT, CSV, MD. Para PDF/DOCX/imágenes el cliente maneja directamente con Gemini.
    """
    if "file" not in request.files:
        return jsonify({"error": "No se recibió archivo"}), 400

    file = request.files["file"]
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower()

    text_types = {"txt", "md", "csv"}

    if ext in text_types:
        try:
            content = file.read().decode("utf-8", errors="replace")
            return jsonify({"type": "text", "content": content[:10000], "name": filename})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # Para tipos binarios (pdf, docx, imágenes) el cliente los maneja directamente
    return jsonify({"type": "passthrough", "name": filename})


# ─── API: Generar prompts de Gemini ──────────────────────────────────────────

@app.route("/api/build-prompts", methods=["POST"])
def build_prompts():
    """
    Recibe los parámetros de la prueba y devuelve los dos prompts
    listos para enviar a la API de Gemini desde el cliente.
    No almacena datos ni llama a Gemini — eso lo hace el navegador directamente.
    """
    data = request.get_json()
    topic = data.get("topic", "").strip()
    nivel = data.get("nivel", "bachillerato")
    bank_size = int(data.get("bankSize", 30))
    num_q = int(data.get("numQ", 10))
    mat_text = data.get("materialText", "").strip()
    urls = data.get("urls", "").strip()

    if not topic:
        return jsonify({"error": "El tema es requerido"}), 400

    material = f"Tema: {topic}\nNivel: {nivel}"
    if urls:
        material += f"\nURLs de referencia: {urls}"
    if mat_text:
        material += f"\n\nMaterial de estudio:\n{mat_text}"

    quiz_prompt = f"""Eres un generador de exámenes. Tu única tarea es producir JSON. No escribas ninguna palabra fuera del JSON.

MATERIAL:
{material}

INSTRUCCIÓN: Genera exactamente {bank_size} preguntas de selección múltiple para un banco de prueba de {nivel}.

Reglas:
- 4 opciones por pregunta (solo UNA correcta, índice 0-3)
- Cubre TODOS los subtemas del material
- Varía el tipo: memorización, comprensión, aplicación, análisis
- Distractores plausibles y educativos
- Asigna a cada pregunta un "subtema" corto (máx 4 palabras)

FORMATO DE RESPUESTA — devuelve EXACTAMENTE esto, sin ningún texto antes ni después, sin bloques de código, sin backticks:
{{"preguntas":[{{"pregunta":"texto de la pregunta","opciones":["opción A","opción B","opción C","opción D"],"correcta":0,"explicacion":"explicación breve","subtema":"nombre subtema"}}]}}"""

    apoyo_prompt = f"""{material}

Genera un resumen de estudio estructurado para los estudiantes con:
1. Los 6-8 conceptos clave del tema
2. Una analogía cotidiana para entender el concepto central
3. Mapa conceptual en texto (relaciones entre conceptos)
4. 3 datos curiosos o aplicaciones reales
5. Preguntas de autoevaluación (3 preguntas reflexivas sin opciones)

Escribe de forma clara y motivadora para {nivel}. Máximo 450 palabras."""

    return jsonify({
        "quizPrompt": quiz_prompt,
        "apoyoPrompt": apoyo_prompt,
        "quizSystem": "Eres un generador de JSON. Responde SOLO con el JSON pedido, absolutamente nada más. Sin backticks, sin texto, sin explicaciones. Solo el JSON crudo.",
        "apoyoSystem": "Eres un profesor de biología. Responde en español.",
        "numQ": num_q,
        "bankSize": bank_size,
        "topic": topic,
        "nivel": nivel,
    })


# ─── API: Prompts de análisis pedagógico ─────────────────────────────────────

@app.route("/api/teacher-analysis-prompt", methods=["POST"])
def teacher_analysis_prompt():
    """Genera el prompt de análisis pedagógico para el profesor."""
    data = request.get_json()
    topic = data.get("topic", "")
    weak_topics = data.get("weakTopics", [])
    avg = data.get("avg", 0)
    num_students = data.get("numStudents", 0)

    debiles_text = "\n".join(
        f"- {s['sub']}: {s['pct']}% de acierto" for s in weak_topics
    )

    prompt = f"""Soy el profesor de "{topic}". Estos son los subtemas donde el grupo tuvo menor desempeño (% de acierto):
{debiles_text}

Promedio general del grupo: {avg}%
Número de estudiantes: {num_students}

Genera recomendaciones pedagógicas concretas para el profesor:
1. Qué actividades o estrategias usar para reforzar cada subtema débil
2. Cómo reorganizar el tiempo de clase
3. Recursos o dinámicas específicas recomendadas
4. Si hay patrones de error que sugieran una mala comprensión de un concepto base

Máximo 300 palabras. Dirígete al profesor de "usted" o en tono profesional."""

    return jsonify({
        "prompt": prompt,
        "system": "Eres un experto en pedagogía de ciencias naturales. Responde en español.",
    })


# ─── API: Prompt de retroalimentación al estudiante ──────────────────────────

@app.route("/api/student-feedback-prompt", methods=["POST"])
def student_feedback_prompt():
    """Genera el prompt de retroalimentación personalizada para el estudiante."""
    data = request.get_json()
    student_name = data.get("studentName", "")
    topic = data.get("topic", "")
    pct = int(data.get("pct", 0))
    weak_topics = data.get("weakTopics", [])
    wrong_items = data.get("wrongItems", [])

    wrong_text = "\n\n".join(
        f"Pregunta: {w['pregunta']}\nSubtema: {w['subtema']}\n"
        f"Respuesta incorrecta: {w['opcionElegida']}\nCorrecta: {w['opcionCorrecta']}"
        for w in wrong_items
    )

    if pct >= 80:
        prompt = (
            f"El estudiante {student_name} obtuvo {pct}% en \"{topic}\". ¡Lo hizo muy bien!\n\n"
            "Domina todos o casi todos los subtemas. Genera un mensaje de felicitación motivador "
            "(máx 80 palabras), y luego sugiere 2 formas de profundizar o aplicar el conocimiento "
            "en la vida real. Dirígete de \"tú\"."
        )
    else:
        prompt = (
            f"El estudiante {student_name} obtuvo {pct}% en \"{topic}\".\n\n"
            f"Falló en estos subtemas: {', '.join(weak_topics)}.\n\n"
            f"Errores específicos:\n{wrong_text}\n\n"
            "Genera un material de refuerzo personalizado: dirígete al estudiante de \"tú\", "
            "sé motivador, incluye una analogía para el concepto más fallido, un ejemplo práctico "
            "y 2 ejercicios de práctica. Máximo 250 palabras."
        )

    return jsonify({
        "prompt": prompt,
        "system": "Eres un profesor de biología empático. Responde en español.",
    })


# ─── Punto de entrada ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)
