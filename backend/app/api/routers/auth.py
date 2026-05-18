from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.core.security import create_access_token
from app.crud.user import authenticate_user
from app.schemas.auth import Token
from app.schemas.user import UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.id)
    return Token(access_token=token)


@router.get("/me", response_model=UserPublic)
def read_me(current_user=Depends(get_current_user)):
    return UserPublic(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role.name if current_user.role else "",
    )
