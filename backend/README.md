# Virtual Garden Backend (FastAPI)

A clean FastAPI backend aligned with the Angular frontend models.

## Structure
- app/ -> application code (API, models, schemas, services)
- alembic/ -> migrations
- scripts/ -> seed and init helpers

## Setup
1) Create and activate a virtual environment
2) Install dependencies:
   pip install -r requirements.txt
3) Configure environment if you want MySQL:
   cp .env.example .env
   By default the API runs with SQLite at ./virtual_garden.db for local development.
   Add Cloudinary credentials in .env if you want plant images uploaded to Cloudinary instead of disk storage.
4) Initialize and seed data:
   python scripts/init_db.py
   python scripts/seed_plants.py
5) Start API:
   uvicorn app.main:app --reload --port 8000

## Notes
- Default API base path: /api/v1
- CORS is set via CORS_ORIGINS in .env
- Plant images are uploaded to Cloudinary when the Cloudinary env vars are set.
- Admin user is created from ADMIN_* env values
- Admins can manage users, roles, plants, categories, and AYUSH systems.
- Managers can create, edit, and soft-delete plant records.
