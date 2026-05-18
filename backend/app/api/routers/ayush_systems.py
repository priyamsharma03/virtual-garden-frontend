from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.crud import ayush_system as ayush_crud
from app.schemas.ayush_system import AyushSystemCreate, AyushSystemPublic

router = APIRouter(prefix="/ayush-systems", tags=["ayush-systems"])


@router.get("", response_model=list[AyushSystemPublic])
def list_ayush_systems(db: Session = Depends(get_db)):
    return ayush_crud.list_ayush_systems(db)


@router.post("", response_model=AyushSystemPublic, dependencies=[Depends(require_admin)])
def create_ayush_system(payload: AyushSystemCreate, db: Session = Depends(get_db)):
    return ayush_crud.create_ayush_system(db, payload)
