from pydantic import BaseModel
from pydantic import ConfigDict


class AyushSystemCreate(BaseModel):
    name: str
    description: str | None = None


class AyushSystemPublic(BaseModel):
    id: int
    name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)
