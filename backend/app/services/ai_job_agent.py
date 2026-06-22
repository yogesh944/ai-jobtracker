import json
import os
import re
import urllib.error
import urllib.request
from typing import Any


TECH_SKILLS = [
    "react", "angular", "vue", "javascript", "typescript", "python", "fastapi",
    "django", "flask", "java", "spring", "node", "express", "sql", "postgresql",
    "mysql", "mongodb", "redis", "docker", "kubernetes", "aws", "gcp", "azure",
    "git", "graphql", "rest", "html", "css", "tailwind", "machine learning",
    "data science", "nlp", "devops", "ci/cd", "microservices", "linux"
]

DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


def _normalize_words(text: str) -> set[str]:
    return set(re.findall(r"[a-zA-Z][a-zA-Z0-9+#./-]*", text.lower()))


def _extract_skills(text: str) -> list[str]:
    text_lower = text.lower()
    skills = []
    for skill in TECH_SKILLS:
        if re.search(r"\b" + re.escape(skill) + r"\b", text_lower):
            skills.append(skill)
    return skills


def _humanize_skill(skill: str) -> str:
    special = {
        "ci/cd": "CI/CD",
        "gcp": "GCP",
        "aws": "AWS",
        "html": "HTML",
        "css": "CSS",
        "sql": "SQL",
        "nlp": "NLP",
    }
    return special.get(skill, skill.title())


def _get_provider_choice() -> str:
    provider = os.getenv("AI_PROVIDER", "auto").strip().lower()
    if provider in {"", "auto"}:
        return "gemini" if os.getenv("GEMINI_API_KEY") else "local"
    return provider


def _build_local_analysis(
    resume_text: str,
    company: str,
    position: str,
    job_description: str
) -> dict[str, Any]:
    resume_text = resume_text or ""
    job_description = job_description or ""

    resume_skills = _extract_skills(resume_text)
    job_skills = _extract_skills(job_description)
    if not job_skills:
        job_skills = ["javascript", "python", "sql", "git"]

    matched_skills = [skill for skill in job_skills if skill in resume_skills]
    missing_skills = [skill for skill in job_skills if skill not in resume_skills]

    resume_words = _normalize_words(resume_text)
    job_words = _normalize_words(job_description)
    overlap_words = resume_words.intersection(job_words)
    word_score = min(30, len(overlap_words) * 2)
    skill_score = int((len(matched_skills) / max(len(job_skills), 1)) * 60)
    title_bonus = 10 if any(word in resume_words for word in _normalize_words(position)) else 0
    match_score = max(18, min(98, skill_score + word_score + title_bonus))

    strengths = []
    if matched_skills:
        strengths.append(
            "Resume already shows alignment with "
            + ", ".join(_humanize_skill(skill) for skill in matched_skills[:5])
            + "."
        )
    else:
        strengths.append("Resume has general experience signals, but the exact job skills need stronger evidence.")

    if company:
        strengths.append(f"The profile can be positioned for {company} with a focused role summary.")

    improvements = []
    if missing_skills:
        improvements.append(
            "Add proof points for "
            + ", ".join(_humanize_skill(skill) for skill in missing_skills[:4])
            + " if you have real experience with them."
        )
    improvements.append("Rewrite two experience bullets with measurable outcomes, business impact, and the target role keywords.")

    cover_letter = (
        f"Dear Hiring Team,\n\n"
        f"I am excited to apply for the {position} role"
        f"{f' at {company}' if company else ''}. My background aligns with the role through "
        f"{', '.join(_humanize_skill(skill) for skill in matched_skills[:4]) if matched_skills else 'hands-on project and problem-solving experience'}."
        " I would welcome the opportunity to connect my technical skills with your team priorities.\n\n"
        "Sincerely,\n"
        "Your Name"
    )

    return {
        "company": company,
        "position": position,
        "match_score": match_score,
        "matched_skills": [_humanize_skill(skill) for skill in matched_skills],
        "missing_skills": [_humanize_skill(skill) for skill in missing_skills],
        "strengths": strengths,
        "improvements": improvements,
        "summary": (
            f"{position or 'This role'} looks like a "
            f"{'strong' if match_score >= 75 else 'moderate' if match_score >= 50 else 'stretch'} match based on resume and job description overlap."
        ),
        "cover_letter": cover_letter,
    }


def _clean_json_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _call_gemini_analysis(
    resume_text: str,
    company: str,
    position: str,
    job_description: str
) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )

    prompt = (
        "You are an AI job matching assistant. Return ONLY valid JSON with keys: "
        "match_score (number), matched_skills (array of strings), missing_skills (array of strings), "
        "strengths (array of strings), improvements (array of strings), summary (string), cover_letter (string). "
        "Use concise, practical wording. Do not wrap the JSON in markdown or code fences. "
        f"Company: {company or 'N/A'}\n"
        f"Position: {position}\n"
        f"Resume text:\n{resume_text}\n\n"
        f"Job description:\n{job_description}"
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.95,
            "maxOutputTokens": 1024,
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
    return {
        "company": company,
        "position": position,
        "match_score": int(parsed.get("match_score", 0)),
        "matched_skills": [str(item) for item in parsed.get("matched_skills", [])],
        "missing_skills": [str(item) for item in parsed.get("missing_skills", [])],
        "strengths": [str(item) for item in parsed.get("strengths", [])],
        "improvements": [str(item) for item in parsed.get("improvements", [])],
        "summary": str(parsed.get("summary", "")),
        "cover_letter": str(parsed.get("cover_letter", "")),
    }


def get_ai_provider_status() -> dict[str, Any]:
    provider = _get_provider_choice()
    has_gemini_key = bool(os.getenv("GEMINI_API_KEY"))
    has_openai_key = bool(os.getenv("OPENAI_API_KEY"))
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    gemini_model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)

    return {
        "provider": provider,
        "mode": "gemini" if provider == "gemini" and has_gemini_key else "local_rules",
        "is_external_ai_configured": has_gemini_key or has_openai_key or provider == "ollama",
        "gemini_model": gemini_model,
        "ollama_base_url": ollama_base_url,
        "message": (
            "Using Gemini free tier for analysis."
            if provider == "gemini" and has_gemini_key
            else "Using local matching. Add Gemini, OpenAI, or Ollama settings when you want model-backed analysis."
        )
    }


def analyze_job_match(resume_text: str, company: str, position: str, job_description: str) -> dict[str, Any]:
    provider = _get_provider_choice()

    analysis: dict[str, Any]
    if provider == "gemini" and os.getenv("GEMINI_API_KEY"):
        try:
            analysis = _call_gemini_analysis(resume_text, company, position, job_description)
        except Exception:
            analysis = _build_local_analysis(resume_text, company, position, job_description)
    else:
        analysis = _build_local_analysis(resume_text, company, position, job_description)

    analysis["provider"] = get_ai_provider_status()
    return analysis
