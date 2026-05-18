from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import auth, plants, categories, ayush_systems, health
from app.core.config import settings

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(plants.router, prefix=settings.API_PREFIX)
app.include_router(categories.router, prefix=settings.API_PREFIX)
app.include_router(ayush_systems.router, prefix=settings.API_PREFIX)
