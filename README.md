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

### One command (recommended)

From the **repo root** (requires [Docker](https://docs.docker.com/get-docker/) for Postgres):

```bash
npm run dev
```

The script: if **`127.0.0.1:5433`** already accepts connections, it **does not run Docker** (leaves your running Postgres alone). Otherwise it runs **`docker compose up -d --no-recreate`**, then waits until the port is open. It creates `backend/.env` and `frontend/.env.local` from `*.example` when missing, runs `npm install` in `backend/` and `frontend/` when `node_modules` is absent, runs **`prisma migrate deploy`** + **`prisma generate`** (skip with `THERA_SKIP_MIGRATE=1` for faster restarts), then starts the app servers (see env flags below).

**Optional env (same `npm run dev`):**

| Variable | Effect |
|----------|--------|
| *(default)* | **Nest + Next** in this terminal; shared stdio (no pipe buffering in parent). **Ctrl+C** stops both. |
| `THERA_PREFIX_LOGS=1` | One terminal, **[web]** / **[api]** prefixes via **`concurrently`** (`npm run dev:multiplex`). Run **`npm install` once at repo root** so `concurrently` exists. **Ctrl+C** stops both. |
| `THERA_SPLIT_TERMINALS=1` | **Windows only:** after setup in this shell, opens **two** `cmd` windows — **TheraWeb** (frontend), **TheraAPI** (backend). Docker + Prisma already ran here; **this process exits** — closing those windows stops each server; **Ctrl+C in original shell does nothing** after exit. On macOS/Linux this flag is ignored with a warning; use two terminals manually or `THERA_PREFIX_LOGS=1`. |
| `THERA_SKIP_MIGRATE=1` | Skip Prisma migrate + generate for faster restarts. |

**Windows PowerShell:** `VAR=value cmd` does **not** work. Set env then run, e.g. `$env:THERA_SPLIT_TERMINALS = "1"; npm run dev` or `$env:THERA_PREFIX_LOGS = "1"; npm run dev`. In **cmd.exe**: `set THERA_SPLIT_TERMINALS=1 && npm run dev`.

- **API:** [http://localhost:4000](http://localhost:4000) — **Swagger:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs)  
- **App:** [http://localhost:3000](http://localhost:3000)

Database URL defaults to `postgresql://postgres:postgres@localhost:5433/physio_app` (see `docker-compose.yml` and `backend/.env.example`).

**Troubleshooting**

| Issue | What to do |
|--------|------------|
| `docker compose` fails | Start Docker Desktop / engine; retry `npm run dev`. |
| Timeout waiting for `127.0.0.1:5433` | Another process may be using **5433**, or Postgres container unhealthy — `docker compose logs postgres`. |
| Prisma migrate errors | Ensure no stale `DATABASE_URL` in your shell overrides `backend/.env`. |
| Frontend cannot reach API | Check `BACKEND_INTERNAL_URL` in `frontend/.env.local` matches where Nest listens (default `http://127.0.0.1:4000`). |
| Out of memory with `npm run dev` | Nest watch + Next dev are heavy; use **`THERA_SKIP_MIGRATE=1`** for day‑to‑day restarts, or run **`npm run start:dev`** and **`npm run dev`** in two terminals. Optionally raise Node heap, e.g. PowerShell: `$env:NODE_OPTIONS='--max-old-space-size=6144'; npm run dev`. |
| Faster restarts, migrations already applied | Unix/bash: `THERA_SKIP_MIGRATE=1 npm run dev`. PowerShell: `$env:THERA_SKIP_MIGRATE = "1"; npm run dev`. |

**Database only** (no app servers): `npm run dev:db`

### Manual (split terminals)

1. **PostgreSQL** (repo root): `docker compose up -d` (port **5433** on the host).

2. **Backend** (`backend/`): copy `backend/.env.example` → `backend/.env`, then `npm install`, `npx prisma migrate deploy`, `npm run start:dev`.

3. **Frontend** (`frontend/`): copy `frontend/.env.example` → `frontend/.env.local` if missing, then `npm install`, `npm run dev`.

On **Windows**, `THERA_SPLIT_TERMINALS=1 npm run dev` automates opening those two shells after shared setup (see table above).

### Mobile / responsive (FR-12 smoke)

Narrow viewport (~375px): **menu** opens drawer; **no horizontal scroll** for primary chrome. Spot-check **login**, **dashboard**, **patients** (list + detail), **appointments** (list + calendar), **treatment notes**, **exercise plans**, **progress** — forms stack; wide tables scroll inside bordered region. **iOS Safari + Chrome Android** if you ship beyond desktop.