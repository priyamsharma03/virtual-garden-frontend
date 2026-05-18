# Virtual Garden Backend (FastAPI + MySQL)

A clean FastAPI backend aligned with the Angular frontend models.

## Structure
- app/ -> application code (API, models, schemas, services)
- alembic/ -> migrations
- scripts/ -> seed and init helpers

## Setup
1) Create and activate a virtual environment
2) Install dependencies:
   pip install -r requirements.txt
3) Configure environment:
   cp .env.example .env
4) Run migrations:
   alembic revision --autogenerate -m "init"
   alembic upgrade head
5) Seed base data:
   python scripts/init_db.py
   python scripts/seed_plants.py
6) Start API:
   uvicorn app.main:app --reload --port 8000

## Notes
- Default API base path: /api/v1
- CORS is set via CORS_ORIGINS in .env
- Admin user is created from ADMIN_* env values
