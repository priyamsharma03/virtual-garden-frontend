import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def list_roles(db: Session) -> list[Role]:
    return db.query(Role).order_by(Role.name.asc()).all()


def get_role_by_name(db: Session, name: str) -> Role | None:
    return db.query(Role).filter(Role.name == name).first()


def list_users(db: Session) -> list[User]:
    return db.query(User).filter(User.deleted_at.is_(None)).order_by(User.name.asc()).all()


def get_user(db: Session, user_id: str) -> User | None:
    return db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()


def create_user(db: Session, payload: UserCreate, role: Role, created_by: str | None = None) -> User:
    user = User(
        id=str(uuid.uuid4()),
        name=payload.name,
        email=payload.email.lower(),
        password_hash=get_password_hash(payload.password),
        role_id=role.id,
        created_by=created_by,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: User, payload: UserUpdate, role: Role | None = None) -> User:
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        user.name = data["name"]
    if "email" in data:
        user.email = data["email"].lower()
    if "password" in data and data["password"]:
        user.password_hash = get_password_hash(data["password"])
    if role:
        user.role_id = role.id

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def soft_delete_user(db: Session, user: User, deleted_by: str | None = None) -> None:
    user.deleted_at = datetime.now(timezone.utc)
    user.deleted_by = deleted_by
    db.add(user)
    db.commit()
