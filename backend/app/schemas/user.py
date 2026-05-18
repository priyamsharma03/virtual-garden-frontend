from pydantic import BaseModel, EmailStr, Field
from pydantic import ConfigDict


class RolePublic(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = "Manager"


class UserUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    email: EmailStr | None = None
    password: str | None = Field(None, min_length=6)
    role: str | None = None


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str

    model_config = ConfigDict(from_attributes=True)
