from pydantic import BaseModel, ConfigDict, Field


class PlantBase(BaseModel):
    common_name: str = Field(..., alias="commonName")
    scientific_name: str = Field(..., alias="scientificName")
    category: str
    image_url: str = Field(..., alias="imageUrl")
    short_description: str = Field(..., alias="shortDescription")
    description: str
    found_in: list[str] = Field(default_factory=list, alias="foundIn")
    medicinal_uses: list[str] = Field(default_factory=list, alias="medicinalUses")

    model_config = ConfigDict(populate_by_name=True)


class PlantCreate(PlantBase):
    slug: str = Field(..., alias="id")


class PlantUpdate(BaseModel):
    common_name: str | None = Field(None, alias="commonName")
    scientific_name: str | None = Field(None, alias="scientificName")
    category: str | None = None
    image_url: str | None = Field(None, alias="imageUrl")
    short_description: str | None = Field(None, alias="shortDescription")
    description: str | None = None
    found_in: list[str] | None = Field(None, alias="foundIn")
    medicinal_uses: list[str] | None = Field(None, alias="medicinalUses")

    model_config = ConfigDict(populate_by_name=True)


class PlantPublic(PlantBase):
    id: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
