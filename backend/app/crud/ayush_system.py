from sqlalchemy.orm import Session

from app.models.ayush_system import AyushSystem
from app.schemas.ayush_system import AyushSystemCreate


def list_ayush_systems(db: Session) -> list[AyushSystem]:
    return db.query(AyushSystem).order_by(AyushSystem.name.asc()).all()


def get_ayush_system_by_name(db: Session, name: str) -> AyushSystem | None:
    return db.query(AyushSystem).filter(AyushSystem.name == name).first()


def create_ayush_system(db: Session, payload: AyushSystemCreate) -> AyushSystem:
    system = AyushSystem(name=payload.name, description=payload.description)
    db.add(system)
    db.commit()
    db.refresh(system)
    return system
