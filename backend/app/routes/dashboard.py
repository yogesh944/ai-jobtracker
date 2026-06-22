from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session

from app.core.database import get_db

from app.core.dependencies import get_current_user

from app.models.user import User

from app.models.job import Job


router = APIRouter()


@router.get("/")

def dashboard(

    db: Session = Depends(get_db),

    current_user: User = Depends(

        get_current_user

    )

):

    jobs = db.query(Job).filter(

        Job.user_id == current_user.id

    ).all()


    total_jobs = len(jobs)


    applied = len([job for job in jobs if getattr(job, "status") == "Applied"])


    interview = len([job for job in jobs if getattr(job, "status") == "Interview"])


    rejected = len([job for job in jobs if getattr(job, "status") == "Rejected"])


    offer = len([job for job in jobs if getattr(job, "status") == "Offer"])


    return {

        "total_jobs": total_jobs,

        "applied": applied,

        "interview": interview,

        "rejected": rejected,

        "offer": offer

    }