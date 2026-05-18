from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.crud import user as user_crud
from app.models.user import User
from app.schemas.user import RolePublic, UserCreate, UserPublic, UserUpdate

router = APIRouter(tags=["users"])


def user_to_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.name if user.role else "",
    )


@router.get("/roles", response_model=list[RolePublic])
def list_roles(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return user_crud.list_roles(db)


@router.get("/users", response_model=list[UserPublic])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return [user_to_public(user) for user in user_crud.list_users(db)]


@router.post("/users", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_crud.get_user_by_email(db, payload.email.lower()):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    role = user_crud.get_role_by_name(db, payload.role)
    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role does not exist")

    user = user_crud.create_user(db, payload, role, current_user.id)
    return user_to_public(user)


@router.put("/users/{user_id}", response_model=UserPublic)
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = user_crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    role = None
    if payload.role:
        role = user_crud.get_role_by_name(db, payload.role)
        if not role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role does not exist")

    updated_user = user_crud.update_user(db, user, payload, role)
    return user_to_public(updated_user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete yourself")

    user = user_crud.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_crud.soft_delete_user(db, user, current_user.id)
    return None
