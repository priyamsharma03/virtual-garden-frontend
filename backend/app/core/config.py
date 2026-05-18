from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Virtual Garden API"
    API_PREFIX: str = "/api/v1"
    DB_URL: str = Field(
        "sqlite:///./virtual_garden.db",
        validation_alias=AliasChoices("DB_URL", "DATABASE_URL"),
    )
    JWT_SECRET_KEY: str = "change_this"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: str = "change_me"
    ADMIN_NAME: str = "Admin User"
    CORS_ORIGINS: list[str] = ["http://localhost:4200"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_origins(cls, value):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
