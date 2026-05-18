import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.append(str(BACKEND_DIR))

from app.crud import category as category_crud
from app.crud import plant as plant_crud
from app.db.session import SessionLocal
from app.schemas.plant import PlantCreate


def load_seed_data() -> list[dict]:
    repo_root = Path(__file__).resolve().parents[2]
    seed_path = repo_root / "src" / "assets" / "data" / "plants.json"
    with seed_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> None:
    db = SessionLocal()
    try:
        seed_data = load_seed_data()
        for entry in seed_data:
            if plant_crud.get_by_slug(db, entry["id"]):
                continue
            payload = PlantCreate.model_validate(
                {
                    "id": entry["id"],
                    "commonName": entry["commonName"],
                    "scientificName": entry["scientificName"],
                    "category": entry["category"],
                    "imageUrl": entry["imageUrl"],
                    "shortDescription": entry["shortDescription"],
                    "description": entry["description"],
                    "foundIn": entry["foundIn"],
                    "medicinalUses": entry["medicinalUses"],
                }
            )
            category = category_crud.get_or_create(db, payload.category)
            plant_crud.create_plant(db, payload, category)
    finally:
        db.close()


if __name__ == "__main__":
    main()
