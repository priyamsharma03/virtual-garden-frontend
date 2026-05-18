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


def get_or_create(db: Session, name: str) -> AyushSystem:
    system = get_ayush_system_by_name(db, name)
    if system:
        return system
    system = AyushSystem(name=name)
    db.add(system)
    db.commit()
    db.refresh(system)
    return system


def update_ayush_system(db: Session, system: AyushSystem, payload: AyushSystemCreate) -> AyushSystem:
    system.name = payload.name
    system.description = payload.description
    db.add(system)
    db.commit()
    db.refresh(system)
    return system


def delete_ayush_system(db: Session, system: AyushSystem) -> None:
    db.delete(system)
    db.commit()
