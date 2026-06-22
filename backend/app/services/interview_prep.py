import json
import os
import re
import urllib.error
import urllib.request

import random

DEFAULT_QUESTIONS = [
    {
        "id": 1,
        "question": "Can you describe a challenging technical problem you solved, how you approached it, and what the outcome was?",
        "type": "behavioral",
        "hint": "Use the STAR method (Situation, Task, Action, Result) to structure your answer."
    },
    {
        "id": 2,
        "question": "How do you optimize a slow React components rendering pipeline or API endpoint that is bottlenecking traffic?",
        "type": "technical",
        "hint": "Talk about caching, profile/devtools, state optimization, index tuning, or asynchronous work queues."
    },
    {
        "id": 3,
        "question": "How do you handle disagreement with a colleague or product manager about a design/architectural choice?",
        "type": "behavioral",
        "hint": "Focus on communication, objective criteria, data-driven decisions, and compromise."
    },
    {
        "id": 4,
        "question": "Explain the difference between SQL database indexing (like PostgreSQL B-Tree) and caching (like Redis). When would you use which?",
        "type": "technical",
        "hint": "Highlight lookup complexity, physical disk storage vs RAM, data volatility, and ACID guarantees."
    },
    {
        "id": 5,
        "question": "What is security best practice when implementing JWT authentication? How do you store tokens on client-side safely?",
        "type": "technical",
        "hint": "Mention HTTPS, HttpOnly cookies, token rotation, signature verification, and short expiration times."
    }
]

ROLE_SPECIFIC_QUESTIONS = {
    "frontend": [
        "What is the Virtual DOM and how does React's reconciliation algorithm work?",
        "Explain CSS Grid vs Flexbox and when you would prefer one over the other.",
        "How do you manage client-side state in a large React application? When is Zustand better than Redux or Context?",
        "How do you improve Core Web Vitals (LCP, FID, CLS) for a customer-facing site?",
        "What are the benefits of TypeScript over vanilla JavaScript? How do interfaces differ from types?"
    ],
    "backend": [
        "How do you design a database schema to handle high-write loads with consistent read latency?",
        "Explain the differences between REST, GraphQL, and gRPC. In what scenario would you choose gRPC?",
        "What is database locking? How do optimistic and pessimistic locks prevent race conditions?",
        "How do Celery or other task queues handle worker failures and job retries?",
        "What is a connection pool? Why is it crucial when connecting to PostgreSQL from FastAPI?"
    ],
    "fullstack": [
        "Walk us through how you would design a real-time chat application from frontend to backend database.",
        "How do you implement secure CORS policies? What is a preflight OPTIONS request?",
        "How do you handle authentication across a subdomain ecosystem (e.g. app.domain.com and API at api.domain.com)?",
        "Explain how you would deploy a containerized full-stack app (React+FastAPI+Postgres) on AWS or a VPS.",
        "What are server-side rendering (SSR) and static site generation (SSG)? How do they affect performance/SEO?"
    ]
}


def _clean_json_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _build_local_questions(domain: str) -> list[dict]:
    domain_lower = domain.lower()
    specific_list = []

    if "front" in domain_lower or "react" in domain_lower or "ui" in domain_lower or "web" in domain_lower:
        specific_list = ROLE_SPECIFIC_QUESTIONS["frontend"]
    elif "back" in domain_lower or "api" in domain_lower or "fastapi" in domain_lower or "python" in domain_lower:
        specific_list = ROLE_SPECIFIC_QUESTIONS["backend"]
    elif "full" in domain_lower or "stack" in domain_lower or "software" in domain_lower or "engineer" in domain_lower:
        specific_list = ROLE_SPECIFIC_QUESTIONS["fullstack"]

    questions = []
    for idx, q_text in enumerate(specific_list[:3]):
        questions.append({
            "id": idx + 1,
            "question": q_text,
            "type": "technical",
            "hint": "Think about standard architectural best practices and explain your thought process clearly."
        })

    remaining_needed = 5 - len(questions)
    for i in range(remaining_needed):
        default_q = DEFAULT_QUESTIONS[i]
        questions.append({
            "id": len(questions) + 1,
            "question": default_q["question"],
            "type": default_q["type"],
            "hint": default_q["hint"]
        })

    return questions


def _call_gemini_questions(domain: str) -> list[dict]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip() or "gemini-1.5-flash"
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )

    prompt = (
        "You are an interview coach. Generate exactly 5 mock interview questions for the user's chosen domain. "
        "The domain can be anything, not just software roles. Mix technical, behavioral, scenario, and domain-specific prompts when appropriate. "
        "Return ONLY valid JSON in this format: {\"questions\":[{\"question\":string,\"type\":string,\"hint\":string}...]}. "
        "Do not wrap the JSON in markdown or code fences. Keep questions practical and varied. "
        f"Chosen domain: {domain}"
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.95,
            "maxOutputTokens": 1200,
        },
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Gemini request failed: {exc.code} {error_body}") from exc

    candidates = response_data.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")

    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts if isinstance(part, dict))
    if not text:
        raise RuntimeError("Gemini returned an empty response")

    parsed = json.loads(_clean_json_text(text))
    questions = parsed.get("questions", [])
    normalized_questions = []
    for index, question in enumerate(questions[:5], start=1):
        normalized_questions.append({
            "id": index,
            "question": str(question.get("question", "")).strip(),
            "type": str(question.get("type", "technical")).strip() or "technical",
            "hint": str(question.get("hint", "")).strip() or "Answer with examples, context, and measurable outcomes where possible."
        })

    if len(normalized_questions) < 5:
        raise RuntimeError("Gemini returned too few questions")

    return normalized_questions

def generate_questions_for_role(role: str) -> list:
    """
    Generates 5 custom interview questions based on the specified domain or role.
    """
    domain = (role or "").strip() or "General"

    if os.getenv("GEMINI_API_KEY"):
        try:
            return _call_gemini_questions(domain)
        except Exception:
            return _build_local_questions(domain)

    return _build_local_questions(domain)

def evaluate_answer(question: str, user_answer: str) -> dict:
    """
    Evaluates the user's answer to a question.
    Returns a score, qualitative feedback, and a sample model answer.
    """
    if not user_answer or len(user_answer.strip()) < 10:
        return {
            "score": 20,
            "feedback": "Your answer is too short. Try to explain your concepts, include technical details, and use structural methods like STAR.",
            "model_answer": "An ideal answer would introduce the concept, explain how it works practically in a project environment, highlight edge cases, and conclude with the business/performance impact."
        }

    user_answer_lower = user_answer.lower()
    word_count = len(user_answer.split())

    # Assess length & quality heuristics
    score = 50
    if word_count > 30:
        score += 15
    if word_count > 60:
        score += 15

    # Check for keywords signaling structured thinking
    keywords = ["example", "result", "solve", "first", "then", "because", "impact", "improve", "use", "code", "architecture"]
    matches = sum(1 for kw in keywords if kw in user_answer_lower)
    score += min(matches * 3, 20)

    score = min(score, 98)  # max score

    # Dynamic feedback
    if score >= 80:
        feedback = "Excellent answer! You provided a detailed explanation, structured your thoughts well, and used key industry terminology effectively."
    elif score >= 60:
        feedback = "Good response. You cover the main points, but could improve by providing more concrete technical examples or detailing the final results of your decisions."
    else:
        feedback = "Understandable effort. However, you should expand on technical specifics. Make sure to clearly link your actions to their positive outcome or describe the exact mechanics of the system."

    # Sample standard answer based on question terms
    if "reconciliation" in question.lower() or "virtual dom" in question.lower():
        model = "The Virtual DOM is a lightweight JS representation of the real DOM. React updates the virtual tree, diffs it against the previous snapshot to find exact changes (reconciliation), and batches updates to the real DOM to minimize paint costs."
    elif "flexbox" in question.lower() or "grid" in question.lower():
        model = "Flexbox is best for one-dimensional layouts (a single row or column), dealing with alignment and spacing. Grid is designed for two-dimensional layouts, letting you specify column and row sizes simultaneously."
    elif "caching" in question.lower() or "indexing" in question.lower():
        model = "A database index (B-Tree) helps Postgres find matching rows on disk quickly by creating a structured lookup key. Redis caching stores key-value objects directly in RAM, bypassing disk operations completely for super-fast retrieval."
    elif "disagreement" in question.lower():
        model = "I would schedule a 1-on-1 to listen and understand their reasoning. Then I would compare both options against objective criteria like performance, scalability, and delivery speed. If unresolved, I would build a quick proof-of-concept to collect hard data, and align behind the final choice."
    else:
        model = "A high-scoring answer would explicitly state the underlying technology, detail a real-world scenario where you encountered this, describe your specific role in implementing a fix, and quote measurable improvements (e.g., latency, readability, or bug reduction)."

    return {
        "score": score,
        "feedback": feedback,
        "model_answer": model
    }
