from pydantic import BaseModel
from pydantic import ConfigDict


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None


class CategoryPublic(BaseModel):
    id: int
    name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)
