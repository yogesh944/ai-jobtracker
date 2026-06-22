from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from app.schemas.user import UserCreate, UserLogin

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token
)

from app.models.user import User

from app.core.database import get_db

from app.core.dependencies import get_current_user




router = APIRouter()


@router.post("/register")

def register(

    user: UserCreate,

    db: Session = Depends(get_db)

):

    existing_user = db.query(User).filter(

        User.email == user.email

    ).first()


    if existing_user:

        return {

            "message":

            "Email already exists"

        }


    hashed_password = hash_password(

        user.password

    )


    new_user = User(

        name=user.name,

        email=user.email,

        password=hashed_password

    )


    db.add(new_user)

    db.commit()

    db.refresh(new_user)


    return {

        "message":

        "User created successfully"

    }

@router.post("/login")
def login(

    user: UserLogin,

    db: Session = Depends(get_db)

):

    # Find user by email

    existing_user = db.query(User).filter(

        User.email == user.email

    ).first()


    if not existing_user:

        return {

            "message":

            "User not found"

        }


    # Verify password

    if not verify_password(

        user.password,

        existing_user.password

    ):

        return {

            "message":

            "Invalid password"

        }


    # Create JWT token

    token = create_access_token(

        {

            "sub":

            existing_user.email

        }

    )


    return {

        "access_token": token,

        "token_type": "bearer"

    }

@router.get("/profile")

def profile(

    current_user: User = Depends(

        get_current_user

    )

):

    return {

        "id":

        current_user.id,

        "name":

        current_user.name,

        "email":

        current_user.email

    }

