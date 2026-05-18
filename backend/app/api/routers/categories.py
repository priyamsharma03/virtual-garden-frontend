from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.crud import category as category_crud
from app.schemas.category import CategoryCreate, CategoryPublic

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryPublic])
def list_categories(db: Session = Depends(get_db)):
    return category_crud.list_categories(db)


@router.post("", response_model=CategoryPublic, dependencies=[Depends(require_admin)])
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    return category_crud.create_category(db, payload)
