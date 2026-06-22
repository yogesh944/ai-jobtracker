from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.interview_prep import generate_questions_for_role, evaluate_answer

router = APIRouter()

class GenerateRequest(BaseModel):
    role: str = "Fullstack"

class FeedbackRequest(BaseModel):
    question: str
    answer: str

@router.post("/generate")
def generate_questions(
    req: GenerateRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        questions = generate_questions_for_role(req.role)
        return {
            "role": req.role,
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback")
def evaluate_user_answer(
    req: FeedbackRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        result = evaluate_answer(req.question, req.answer)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
