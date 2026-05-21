from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers import auth, plants, categories, ayush_systems, health, users
from app.core.config import settings
from app.db.init_db import init_db
from app.db.session import SessionLocal

app = FastAPI(title=settings.APP_NAME)

@app.get("/")
def home():
    return {"message": "Backend Running"}

@app.on_event("startup")
def initialize_database() -> None:
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()

uploads_root = Path(__file__).resolve().parents[1] / "uploads"
uploads_root.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=uploads_root), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(plants.router, prefix=settings.API_PREFIX)
app.include_router(categories.router, prefix=settings.API_PREFIX)
app.include_router(ayush_systems.router, prefix=settings.API_PREFIX)
