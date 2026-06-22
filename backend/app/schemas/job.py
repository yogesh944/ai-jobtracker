from pydantic import BaseModel


class JobCreate(BaseModel):

    company: str

    position: str


class JobUpdate(BaseModel):

    status: str