from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.resume import Resume
from app.models.user import User
from app.services.ai_job_agent import analyze_job_match, get_ai_provider_status


router = APIRouter()


class JobMatchRequest(BaseModel):
    company: str = ""
    position: str
    job_description: str


@router.get("/provider")
def get_provider_status():
    return get_ai_provider_status()


@router.post("/match")
def match_job_to_resume(
    req: JobMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.user_id == current_user.id).first()
    if not resume or not resume.parsed_text:
        raise HTTPException(
            status_code=400,
            detail="Upload your resume before running AI job matching."
        )

    return analyze_job_match(
        resume_text=resume.parsed_text,
        company=req.company,
        position=req.position,
        job_description=req.job_description
    )
