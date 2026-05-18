from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate


def list_categories(db: Session) -> list[Category]:
    return db.query(Category).order_by(Category.name.asc()).all()


def get_category_by_name(db: Session, name: str) -> Category | None:
    return db.query(Category).filter(Category.name == name).first()


def create_category(db: Session, payload: CategoryCreate) -> Category:
    category = Category(name=payload.name, description=payload.description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def get_or_create(db: Session, name: str) -> Category:
    category = get_category_by_name(db, name)
    if category:
        return category
    category = Category(name=name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category: Category, payload: CategoryCreate) -> Category:
    category.name = payload.name
    category.description = payload.description
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category: Category) -> None:
    db.delete(category)
    db.commit()
