import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_content_manager
from app.crud import ayush_system as ayush_crud
from app.crud import category as category_crud
from app.crud import plant as plant_crud
from app.models.plant import Plant
from app.models.user import User
from app.schemas.plant import PlantCreate, PlantPublic, PlantUpdate
from app.services.cloudinary import upload_image

router = APIRouter(prefix="/plants", tags=["plants"])


def build_public_image_url(request: Request, image_url: str) -> str:
    if image_url.startswith(("http://", "https://")):
        return image_url
    if image_url.startswith("/"):
        return f"{str(request.base_url).rstrip('/')}{image_url}"
    return f"{str(request.base_url).rstrip('/')}/{image_url}"


def parse_text_list(value: str | None) -> list[str]:
    if not value:
        return []

    normalized = value.replace("\r", "")
    return [item.strip() for item in normalized.split("\n") if item.strip()]


def normalize_model_url(value: str | None) -> str | None:
    if not value:
        return None

    cleaned = value.strip()
    if not cleaned:
        return None

    src_match = re.search(r"src=[\"']([^\"']+)[\"']", cleaned, re.IGNORECASE)
    resolved = src_match.group(1) if src_match else cleaned

    if "sketchfab.com" in resolved and "/embed" not in resolved:
        id_match = re.search(r"(?:models/|3d-models/[^/]+-)([a-f0-9]{32})", resolved, re.IGNORECASE)
        if id_match:
            resolved = f"https://sketchfab.com/models/{id_match.group(1)}/embed"

    if len(resolved) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model URL is too long. Please paste the Sketchfab embed URL only.",
        )

    return resolved


def plant_to_public(request: Request, plant: Plant) -> PlantPublic:
    return PlantPublic(
        id=plant.slug,
        commonName=plant.common_name,
        scientificName=plant.botanical_name,
        category=plant.category.name if plant.category else "",
        ayushSystem=plant.ayush_system.name if plant.ayush_system else None,
        imageUrl=build_public_image_url(request, plant.image_url),
        modelUrl=plant.model_url,
        shortDescription=plant.short_description,
        description=plant.description,
        foundIn=plant.found_in or [],
        medicinalUses=plant.medicinal_uses or [],
    )


@router.get("", response_model=list[PlantPublic], response_model_by_alias=True)
def list_plants(
    request: Request,
    search: str | None = None,
    category: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    plants = plant_crud.list_plants(db, search=search, category=category, limit=limit, offset=offset)
    return [plant_to_public(request, plant) for plant in plants]


@router.get("/{plant_id}", response_model=PlantPublic, response_model_by_alias=True)
def get_plant(plant_id: str, request: Request, db: Session = Depends(get_db)):
    plant = plant_crud.get_by_slug(db, plant_id)
    if not plant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")
    return plant_to_public(request, plant)


@router.post("", response_model=PlantPublic, response_model_by_alias=True)
def create_plant(
    request: Request,
    common_name: str = Form(..., alias="commonName"),
    scientific_name: str = Form(..., alias="scientificName"),
    category: str = Form(...),
    ayush_system: str | None = Form(None, alias="ayushSystem"),
    short_description: str = Form(..., alias="shortDescription"),
    description: str = Form(...),
    found_in: str = Form("", alias="foundIn"),
    medicinal_uses: str = Form("", alias="medicinalUses"),
    model_url: str | None = Form(None, alias="modelUrl"),
    image_file: UploadFile | None = File(None, alias="imageFile"),
    image_url: str | None = Form(None, alias="imageUrl"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_content_manager),
):
    stored_image_url = upload_image(image_file) if image_file and image_file.filename else None
    resolved_image_url = stored_image_url or (image_url.strip() if image_url else "")
    if not resolved_image_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plant image is required")

    payload = PlantCreate.model_validate(
        {
            "commonName": common_name,
            "scientificName": scientific_name,
            "category": category,
            "ayushSystem": ayush_system.strip() if ayush_system else None,
            "imageUrl": resolved_image_url,
            "modelUrl": normalize_model_url(model_url),
            "shortDescription": short_description,
            "description": description,
            "foundIn": parse_text_list(found_in),
            "medicinalUses": parse_text_list(medicinal_uses),
        }
    )
    category_record = category_crud.get_or_create(db, payload.category)
    ayush_record = ayush_crud.get_or_create(db, payload.ayush_system) if payload.ayush_system else None
    existing = plant_crud.get_by_botanical_name(db, payload.scientific_name)
    try:
        if existing:
            update_payload = PlantUpdate.model_validate(payload.model_dump(by_alias=True))
            plant = plant_crud.update_plant(db, existing, update_payload, category_record, ayush_record)
        else:
            plant = plant_crud.create_plant(db, payload, category_record, ayush_record, current_user.id)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Scientific name already exists",
        ) from exc
    return plant_to_public(request, plant)


@router.put("/{plant_id}", response_model=PlantPublic, response_model_by_alias=True)
def update_plant(
    plant_id: str,
    request: Request,
    common_name: str | None = Form(None, alias="commonName"),
    scientific_name: str | None = Form(None, alias="scientificName"),
    category: str | None = Form(None),
    ayush_system: str | None = Form(None, alias="ayushSystem"),
    short_description: str | None = Form(None, alias="shortDescription"),
    description: str | None = Form(None),
    found_in: str | None = Form(None, alias="foundIn"),
    medicinal_uses: str | None = Form(None, alias="medicinalUses"),
    model_url: str | None = Form(None, alias="modelUrl"),
    image_file: UploadFile | None = File(None, alias="imageFile"),
    image_url: str | None = Form(None, alias="imageUrl"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_content_manager),
):
    plant = plant_crud.get_by_slug(db, plant_id)
    if not plant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")

    payload_data: dict[str, object] = {}

    if common_name is not None:
        payload_data["commonName"] = common_name
    if scientific_name is not None:
        payload_data["scientificName"] = scientific_name
    if category:
        payload_data["category"] = category
    if ayush_system is not None:
        payload_data["ayushSystem"] = ayush_system.strip() or None
    if short_description is not None:
        payload_data["shortDescription"] = short_description
    if description is not None:
        payload_data["description"] = description
    if found_in is not None:
        payload_data["foundIn"] = parse_text_list(found_in)
    if medicinal_uses is not None:
        payload_data["medicinalUses"] = parse_text_list(medicinal_uses)
    if model_url is not None:
        payload_data["modelUrl"] = normalize_model_url(model_url)

    stored_image_url = upload_image(image_file) if image_file and image_file.filename else None
    if stored_image_url:
        payload_data["imageUrl"] = stored_image_url
    elif image_url is not None and image_url.strip():
        payload_data["imageUrl"] = image_url.strip()

    payload = PlantUpdate.model_validate(payload_data)

    category_record = category_crud.get_or_create(db, category) if category else None
    ayush_record = ayush_crud.get_or_create(db, ayush_system.strip()) if ayush_system and ayush_system.strip() else None
    try:
        plant = plant_crud.update_plant(db, plant, payload, category_record, ayush_record)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Scientific name already exists",
        ) from exc
    return plant_to_public(request, plant)


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
