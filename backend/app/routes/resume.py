import os
import shutil

from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.services.resume_parser import extract_text_from_pdf
from app.services.ai_analyzer import analyze_resume_against_job

UPLOAD_DIR = "app/uploads"

router = APIRouter()

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)

class AnalyzeRequest(BaseModel):
    job_description: str

@router.post("/upload")
def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename")

    file_path = os.path.join(
        UPLOAD_DIR,
        f"{current_user.id}_{file.filename}"
    )

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        text = extract_text_from_pdf(file_path)
    except Exception as e:
        text = f"Error extracting text: {str(e)}"

    # Check if user already has a resume, update it or create new
    existing_resume = db.query(Resume).filter(Resume.user_id == current_user.id).first()
    if existing_resume:
        existing_resume.file_name = file.filename
        existing_resume.file_path = file_path
        existing_resume.parsed_text = text
        db.commit()
        db.refresh(existing_resume)
        db_resume = existing_resume
    else:
        new_resume = Resume(
            user_id=current_user.id,
            file_name=file.filename,
            file_path=file_path,
            parsed_text=text
        )
        db.add(new_resume)
        db.commit()
        db.refresh(new_resume)
        db_resume = new_resume

    return {
        "id": db_resume.id,
        "filename": db_resume.file_name,
        "message": "Resume uploaded successfully",
        "text": db_resume.parsed_text
    }

@router.get("/current")
def get_current_resume(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.user_id == current_user.id).first()
    if not resume:
        return {"filename": None, "text": None}
    return {
        "id": resume.id,
        "filename": resume.file_name,
        "text": resume.parsed_text
    }

@router.post("/analyze")
def analyze_resume(
    req: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    resume = db.query(Resume).filter(Resume.user_id == current_user.id).first()
    if not resume or not resume.parsed_text:
        raise HTTPException(
            status_code=400,
            detail="No uploaded resume found. Please upload your resume first."
        )

    analysis = analyze_resume_against_job(resume.parsed_text, req.job_description)
    return analysis
