from fastapi import Depends

from fastapi import HTTPException

from fastapi.security import OAuth2PasswordBearer

from sqlalchemy.orm import Session

from app.core.database import get_db

from app.core.security import verify_token

from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(

    tokenUrl="auth/login"

)


def get_current_user(

        token: str = Depends(oauth2_scheme),

        db: Session = Depends(get_db)

):

    payload = verify_token(token)


    if payload is None:

        raise HTTPException(

            status_code=401,

            detail="Invalid Token"

        )


    email = payload.get("sub")


    user = db.query(User).filter(

        User.email == email

    ).first()


    if user is None:

        raise HTTPException(

            status_code=401,

            detail="User not found"

        )


    return user