from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_content_manager
from app.crud import ayush_system as ayush_crud
from app.crud import category as category_crud
from app.crud import plant as plant_crud
from app.models.plant import Plant
from app.models.user import User
from app.schemas.plant import PlantCreate, PlantPublic, PlantUpdate

router = APIRouter(prefix="/plants", tags=["plants"])


def plant_to_public(plant: Plant) -> PlantPublic:
    return PlantPublic(
        id=plant.slug,
        commonName=plant.common_name,
        scientificName=plant.botanical_name,
        category=plant.category.name if plant.category else "",
        ayushSystem=plant.ayush_system.name if plant.ayush_system else None,
        imageUrl=plant.image_url,
        modelUrl=plant.model_url,
        shortDescription=plant.short_description,
        description=plant.description,
        foundIn=plant.found_in or [],
        medicinalUses=plant.medicinal_uses or [],
    )


@router.get("", response_model=list[PlantPublic], response_model_by_alias=True)
def list_plants(
    search: str | None = None,
    category: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    plants = plant_crud.list_plants(db, search=search, category=category, limit=limit, offset=offset)
    return [plant_to_public(plant) for plant in plants]


@router.get("/{plant_id}", response_model=PlantPublic, response_model_by_alias=True)
def get_plant(plant_id: str, db: Session = Depends(get_db)):
    plant = plant_crud.get_by_slug(db, plant_id)
    if not plant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")
    return plant_to_public(plant)


@router.post("", response_model=PlantPublic, response_model_by_alias=True)
def create_plant(
    payload: PlantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_content_manager),
):
    if plant_crud.get_by_slug(db, payload.slug):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Plant id already exists")
    category = category_crud.get_or_create(db, payload.category)
    ayush_system = ayush_crud.get_or_create(db, payload.ayush_system) if payload.ayush_system else None
    plant = plant_crud.create_plant(db, payload, category, ayush_system, current_user.id)
    return plant_to_public(plant)


@router.put("/{plant_id}", response_model=PlantPublic, response_model_by_alias=True)
def update_plant(
    plant_id: str,
    payload: PlantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_content_manager),
):
    plant = plant_crud.get_by_slug(db, plant_id)
    if not plant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")

    category = None
    if payload.category:
        category = category_crud.get_or_create(db, payload.category)

    ayush_system = ayush_crud.get_or_create(db, payload.ayush_system) if payload.ayush_system else None
    plant = plant_crud.update_plant(db, plant, payload, category, ayush_system)
    return plant_to_public(plant)


@router.delete("/{plant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plant(
    plant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_content_manager),
):
    plant = plant_crud.get_by_slug(db, plant_id)
    if not plant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")
    plant_crud.soft_delete_plant(db, plant, current_user.id)
    return None
