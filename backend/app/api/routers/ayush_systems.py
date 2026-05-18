from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin, require_content_manager
from app.crud import ayush_system as ayush_crud
from app.models.ayush_system import AyushSystem
from app.schemas.ayush_system import AyushSystemCreate, AyushSystemPublic

router = APIRouter(prefix="/ayush-systems", tags=["ayush-systems"])


@router.get("", response_model=list[AyushSystemPublic])
def list_ayush_systems(db: Session = Depends(get_db)):
    return ayush_crud.list_ayush_systems(db)


@router.post("", response_model=AyushSystemPublic, dependencies=[Depends(require_admin)])
def create_ayush_system(payload: AyushSystemCreate, db: Session = Depends(get_db)):
    if ayush_crud.get_ayush_system_by_name(db, payload.name):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="AYUSH system already exists")
    return ayush_crud.create_ayush_system(db, payload)


@router.put("/{system_id}", response_model=AyushSystemPublic, dependencies=[Depends(require_admin)])
def update_ayush_system(system_id: int, payload: AyushSystemCreate, db: Session = Depends(get_db)):
    system = db.get(AyushSystem, system_id)
    if not system:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AYUSH system not found")
    return ayush_crud.update_ayush_system(db, system, payload)


@router.delete("/{system_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_content_manager)])
def delete_ayush_system(system_id: int, db: Session = Depends(get_db)):
    system = db.get(AyushSystem, system_id)
    if not system:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AYUSH system not found")
    if system.plants:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="AYUSH system is used by plants")
    ayush_crud.delete_ayush_system(db, system)
    return None
