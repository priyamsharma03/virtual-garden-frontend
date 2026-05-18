from pydantic import BaseModel, EmailStr
from pydantic import ConfigDict


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str

    model_config = ConfigDict(from_attributes=True)
