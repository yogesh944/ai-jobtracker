from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.user import User
from app.schemas.job import JobCreate, JobUpdate
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.websocket import manager

router = APIRouter()

# CREATE JOB
@router.post("/")
async def create_job(
    job: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_job = Job(
        company=job.company,
        position=job.position,
        user_id=current_user.id
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    await manager.send_to_user(current_user.id, {
        "type": "JOB_CREATED",
        "message": f"Added: {new_job.position} at {new_job.company}."
    })

    return {
        "message": "Job created successfully",
        "job": {
            "id": new_job.id,
            "company": new_job.company,
            "position": new_job.position,
            "status": new_job.status
        }
    }

# GET ALL JOBS
@router.get("/")
async def get_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    jobs = db.query(Job).filter(
        Job.user_id == current_user.id
    ).all()
    return jobs

# UPDATE JOB
@router.put("/{job_id}")
async def update_job(
    job_id: int,
    job: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_job = db.query(Job).filter(
        Job.id == job_id,
        Job.user_id == current_user.id
    ).first()

    if existing_job is None:
        return {
            "message": "Job not found"
        }

    old_status = existing_job.status
    existing_job.status = job.status  # type: ignore[assignment]
    db.commit()
    db.refresh(existing_job)

    await manager.send_to_user(current_user.id, {
        "type": "JOB_UPDATED",
        "message": f"Updated: {existing_job.company} status changed from '{old_status}' to '{existing_job.status}'."
    })

    return {
        "message": "Job updated successfully",
        "status": existing_job.status
    }

# DELETE JOB
@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_job = db.query(Job).filter(
        Job.id == job_id,
        Job.user_id == current_user.id
    ).first()

    if existing_job is None:
        return {
            "message": "Job not found"
        }

    company = existing_job.company
    position = existing_job.position

    db.delete(existing_job)
    db.commit()

    await manager.send_to_user(current_user.id, {
        "type": "JOB_DELETED",
        "message": f"Removed: Job application for {position} at {company}."
    })

    return {
        "message": "Job deleted successfully"
    }
