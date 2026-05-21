from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base


class Plant(Base):
    __tablename__ = "plants"

    id = Column(String(36), primary_key=True)
    slug = Column(String(80), unique=True, nullable=False, index=True)
    botanical_name = Column(String(255), unique=True, nullable=False)
    common_name = Column(String(255), nullable=False)
    short_description = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    medicinal_uses = Column(JSON, nullable=False, default=list)
    found_in = Column(JSON, nullable=False, default=list)
    image_url = Column(String(500), nullable=False)
    image_urls = Column(JSON, default=list)
    model_url = Column(String(500))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    ayush_id = Column(Integer, ForeignKey("ayush_systems.id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)
    created_by = Column(String(36), ForeignKey("users.id"))
    deleted_by = Column(String(36), ForeignKey("users.id"))

    category = relationship("Category", back_populates="plants")
    ayush_system = relationship("AyushSystem", back_populates="plants")
