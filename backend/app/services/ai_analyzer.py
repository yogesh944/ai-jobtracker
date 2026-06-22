import re

COMMON_TECH_KEYWORDS = [
    "react", "angular", "vue", "javascript", "typescript", "python", "django",
    "flask", "fastapi", "golang", "java", "spring", "c++", "c#", "dotnet",
    "ruby", "rails", "php", "laravel", "sql", "postgresql", "mysql", "mongodb",
    "redis", "docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "git",
    "graphql", "rest api", "html", "css", "tailwindcss", "machine learning",
    "data science", "nlp", "agile", "scrum", "devops", "microservices"
]

def analyze_resume_against_job(resume_text: str, job_description: str) -> dict:
    """
    Analyzes resume text against a target job description.
    Returns details like match score, matched/missing keywords, strengths,
    and tailored projects/improvements.
    """
    if not resume_text:
        resume_text = ""
    if not job_description:
        job_description = ""

    resume_text_lower = resume_text.lower()
    job_desc_lower = job_description.lower()

    # Find keywords present in the job description
    job_keywords = []
    for kw in COMMON_TECH_KEYWORDS:
        # Use word boundaries or simple matching
        if re.search(r'\b' + re.escape(kw) + r'\b', job_desc_lower):
            job_keywords.append(kw)

    # If no keywords are found in the job description, extract from the resume or default
    if not job_keywords:
        # Fallback to standard web development keywords if job description is generic
        job_keywords = ["react", "javascript", "typescript", "python", "sql", "git"]

    # Match keywords in resume
    matched_keywords = []
    missing_keywords = []
    for kw in job_keywords:
        if re.search(r'\b' + re.escape(kw) + r'\b', resume_text_lower):
            matched_keywords.append(kw)
        else:
            missing_keywords.append(kw)

    # Calculate match score
    total_kws = len(job_keywords)
    if total_kws > 0:
        match_score = int((len(matched_keywords) / total_kws) * 100)
    else:
        match_score = 50

    # Ensure match score fits realistically (range 20 to 95 for mock, or calculated)
    match_score = max(15, min(match_score, 98))

    # Generate Strengths
    strengths = []
    if matched_keywords:
        strengths.append(f"Excellent overlap in core technologies: {', '.join([k.upper() for k in matched_keywords[:4]])}.")
    if len(matched_keywords) > 3:
        strengths.append("Demonstrates solid alignment with the primary technical requirements of the job description.")
    else:
        strengths.append("Found basic alignment with standard industry technologies.")

    # Generate Areas of Improvement
    improvements = []
    if missing_keywords:
        improvements.append(f"Incorporate missing core technologies: {', '.join([k.upper() for k in missing_keywords[:3]])}.")
        improvements.append("Quantify your accomplishments (e.g., 'Improved API response time by 40%' rather than just 'Responsible for APIs').")
    else:
        improvements.append("Tailor your summary statement to align directly with the company's core mission.")
        improvements.append("Enhance bullet points under professional experience with strong action verbs.")

    # Generate Suggested Projects
    suggested_projects = []
    if missing_keywords:
        proj_kw = missing_keywords[0].upper()
        suggested_projects.append({
            "title": f"End-to-End {proj_kw} Integration Project",
            "description": f"Build and document a public repository showcase focusing on {missing_keywords[0]} to bridge the keyword gap in your resume. Combine it with your existing stack ({', '.join(matched_keywords[:2])})."
        })
    else:
        suggested_projects.append({
            "title": "Cloud-Native Scalability Project",
            "description": "Create a microservices-based application implementing load balancers, caching layers (Redis), and container deployments to show advanced technical architecture design."
        })

    return {
        "match_score": match_score,
        "matched_keywords": [k.upper() for k in matched_keywords],
        "missing_keywords": [k.upper() for k in missing_keywords],
        "strengths": strengths,
        "improvements": improvements,
        "suggested_projects": suggested_projects
    }
