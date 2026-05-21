import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.db.base import Base
from app.db.session import engine
from app import models  # noqa: F401
from app.models.role import Role
from app.models.user import User


def init_db(db: Session) -> None:
    Base.metadata.create_all(bind=engine)

    roles = {role.name: role for role in db.query(Role).all()}
    if "Admin" not in roles:
        admin_role = Role(name="Admin")
        db.add(admin_role)
        db.flush()
        roles["Admin"] = admin_role

    if "Manager" not in roles:
        manager_role = Role(name="Manager")
        db.add(manager_role)
        db.flush()
        roles["Manager"] = manager_role

    existing_admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
    if not existing_admin:
        admin = User(
            id=str(uuid.uuid4()),
            name=settings.ADMIN_NAME,
            email=settings.ADMIN_EMAIL,
            password_hash=get_password_hash(settings.ADMIN_PASSWORD),
            role_id=roles["Admin"].id,
        )
        db.add(admin)
    else:
        existing_admin.name = settings.ADMIN_NAME
        existing_admin.role_id = roles["Admin"].id
        if not verify_password(settings.ADMIN_PASSWORD, existing_admin.password_hash):
            existing_admin.password_hash = get_password_hash(settings.ADMIN_PASSWORD)

    db.commit()
