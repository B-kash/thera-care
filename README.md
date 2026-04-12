# Physio App

A full-stack physiotherapist management application.

## Stack
- Frontend: Next.js
- Backend: NestJS
- Database: PostgreSQL
- ORM: Prisma

## Planned MVP features
- Authentication
- Patient management
- Appointments
- Treatment notes
- Exercise plans
- Progress tracking

## Roadmap and phases

See [docs/MVP_PHASES.md](docs/MVP_PHASES.md) for phased delivery

## Run locally

1. **PostgreSQL** (from repo root): `docker compose up -d`  
   Default DB URL uses host port **5433** (see `docker-compose.yml`).

2. **Backend** (`backend/`): copy `backend/.env.example` → `backend/.env`, then `npm install`, `npx prisma migrate dev`, `npm run start:dev`  
   API: [http://localhost:4000](http://localhost:4000) (health at `/`). **Swagger:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

3. **Frontend** (`frontend/`): optional `frontend/.env.local` from `frontend/.env.example`, then `npm install`, `npm run dev`  
   App: [http://localhost:3000](http://localhost:3000) — register or sign in, then use the dashboard shell.