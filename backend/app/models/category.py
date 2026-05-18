from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(120), unique=True, nullable=False)
    description = Column(Text)

    plants = relationship("Plant", back_populates="category")
