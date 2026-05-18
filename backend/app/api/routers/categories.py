from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin, require_content_manager
from app.crud import category as category_crud
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryPublic

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryPublic])
def list_categories(db: Session = Depends(get_db)):
    return category_crud.list_categories(db)


@router.post("", response_model=CategoryPublic, dependencies=[Depends(require_admin)])
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    if category_crud.get_category_by_name(db, payload.name):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category already exists")
    return category_crud.create_category(db, payload)


@router.put("/{category_id}", response_model=CategoryPublic, dependencies=[Depends(require_admin)])
def update_category(category_id: int, payload: CategoryCreate, db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category_crud.update_category(db, category, payload)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_content_manager)])
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    if category.plants:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category is used by plants")
    category_crud.delete_category(db, category)
    return None
