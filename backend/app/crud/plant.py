import uuid
from datetime import datetime, timezone

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.ayush_system import AyushSystem
from app.models.category import Category
from app.models.plant import Plant
from app.schemas.plant import PlantCreate, PlantUpdate


def list_plants(
    db: Session,
    search: str | None = None,
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Plant]:
    query = db.query(Plant).filter(Plant.deleted_at.is_(None))
    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(Plant.common_name).like(term),
                func.lower(Plant.botanical_name).like(term),
            )
        )
    if category:
        query = query.join(Category).filter(Category.name == category)

    return query.order_by(Plant.common_name.asc()).offset(offset).limit(limit).all()


def get_by_slug(db: Session, slug: str) -> Plant | None:
    return db.query(Plant).filter(Plant.slug == slug, Plant.deleted_at.is_(None)).first()


def create_plant(
    db: Session,
    payload: PlantCreate,
    category: Category,
    ayush_system: AyushSystem | None = None,
    created_by: str | None = None,
) -> Plant:
    plant = Plant(
        id=str(uuid.uuid4()),
        slug=payload.slug,
        botanical_name=payload.scientific_name,
        common_name=payload.common_name,
        short_description=payload.short_description,
        description=payload.description,
        medicinal_uses=payload.medicinal_uses,
        found_in=payload.found_in,
        image_url=payload.image_url,
        model_url=payload.model_url,
        category_id=category.id,
        ayush_id=ayush_system.id if ayush_system else None,
        created_by=created_by,
    )
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant


def update_plant(
    db: Session,
    plant: Plant,
    payload: PlantUpdate,
    category: Category | None,
    ayush_system: AyushSystem | None = None,
) -> Plant:
    data = payload.model_dump(exclude_unset=True, by_alias=False)

    if "common_name" in data:
        plant.common_name = data["common_name"]
    if "scientific_name" in data:
        plant.botanical_name = data["scientific_name"]
    if "short_description" in data:
        plant.short_description = data["short_description"]
    if "description" in data:
        plant.description = data["description"]
    if "medicinal_uses" in data:
        plant.medicinal_uses = data["medicinal_uses"]
    if "found_in" in data:
        plant.found_in = data["found_in"]
    if "image_url" in data:
        plant.image_url = data["image_url"]
    if "model_url" in data:
        plant.model_url = data["model_url"]
    if category:
        plant.category_id = category.id
    if "ayush_system" in data:
        plant.ayush_id = ayush_system.id if ayush_system else None

    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant


def soft_delete_plant(db: Session, plant: Plant, deleted_by: str | None = None) -> None:
    plant.deleted_at = datetime.now(timezone.utc)
    plant.deleted_by = deleted_by
    db.add(plant)
    db.commit()
