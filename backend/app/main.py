from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
from app.models.user import User
from app.routes.auth import router as auth_router
from app.models.resume import Resume
from app.routes.resume import router as resume_router
from app.models.job import Job
from app.routes.job import router as job_router
from app.routes.dashboard import router as dashboard_router
from app.routes.interview import router as interview_router
from app.routes.ai_jobs import router as ai_jobs_router
from app.core.websocket import manager

app = FastAPI()

# Enable CORS for frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables in PostgreSQL
Base.metadata.create_all(bind=engine)

# Home route
@app.get("/")
def home():
    return {
        "message": "AI Job Tracker API"
    }

# Include routes
app.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"]
)

app.include_router(
    resume_router,
    prefix="/resume",
    tags=["Resume"]
)

app.include_router(
    job_router,
    prefix="/jobs",
    tags=["Jobs"]
)

app.include_router(
    dashboard_router,
    prefix="/dashboard",
    tags=["Dashboard"]
)

app.include_router(
    interview_router,
    prefix="/interview",
    tags=["Interview Prep"]
)

app.include_router(
    ai_jobs_router,
    prefix="/ai-jobs",
    tags=["AI Job Search"]
)

# WebSocket Endpoint for real-time notifications
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    try:
        # Keep connection open and listen for heartbeat or client requests
        while True:
            data = await websocket.receive_text()
            # We can parse client messages if needed, otherwise just keep alive
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
