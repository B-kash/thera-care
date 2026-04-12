# MVP phases (aligned with AGENTS.md)

**Source of truth for phase order and scope:** [AGENTS.md](../AGENTS.md) (Phases **0–9**).  
This file tracks **what shipped in the repo**, **git workflow**, and **cross-cutting** work that AGENTS does not number separately.

**Product spec:** [PRODUCT_SPECS.md](./PRODUCT_SPECS.md) (not `product-spec.md`).

**Git workflow:** Use `feature/…` branches and pull requests into `main`—no direct pushes to `main` for feature work.

---

## Cross-cutting: database seeding (planned)

See prior seeding table: env-gated `prisma/seed`, demo users/patients/appointments as models exist. Fits best after auth is stable (**AGENTS Phase 2** done) and before heavy demos.

---

## Cross-cutting: security (planned)

httpOnly cookies, same-origin / BFF, CSRF, Helmet, rate limits on `/auth/*`—documented earlier; still **planned** (not in AGENTS phase list; typically **AGENTS Phase 8** or a dedicated security PR).

---

## Phase map: AGENTS ↔ repository

| AGENTS phase | AGENTS name              | Repo status |
|--------------|---------------------------|-------------|
| **0**        | Analysis & plan           | Done historically; future features repeat analysis as needed. |
| **1**        | Foundation setup          | **Partial vs AGENTS:** Prisma + Postgres + Config + global `ValidationPipe` + core modules exist; **full** Phase-1 Prisma schema in AGENTS (all models day-one) was delivered **incrementally** (User early; Patient / Appointment when Phases 3–4 shipped). **Swagger** + **stub modules** + **extra nav routes** added to close obvious gaps. |
| **2**        | Authentication & users    | **Done:** login/register, bcrypt, JWT, guard, `/users` list, `/auth/me`; token in `localStorage` (security cross-cutting). AGENTS “create user” is covered by **register** + Prisma; no separate admin **POST /users** unless added later. |
| **3**        | Patient management        | **Done:** CRUD API + UI. |
| **4**        | Appointments              | **Done:** CRUD, patient + therapist (staff user), status, overlap rule, UI. |
| **5**        | Treatment notes           | **Done:** Prisma `TreatmentNote` (SOAP text fields), REST CRUD + optional `appointmentId`, JWT; UI list (`?patientId=`), new/edit, patient profile snippet + links. |
| **6**        | Exercise plans            | **Done:** `ExercisePlan` + `ExerciseItem`, patient + author; REST plan CRUD + item CRUD under plan; JWT; UI `?patientId=` list, new, detail with items; patient profile snippet. |
| **7**        | Progress tracking         | **Next** (`ProgressRecord` + UI per AGENTS). |
| **8**        | Polish & stabilization      | Planned (validation, errors, UI consistency). |
| **9**        | Optional improvements     | Do not start unless asked (RBAC, audit, etc.). |

---

## AGENTS Phase 1 — Foundation (checklist vs repo)

Per AGENTS.md, Phase 1 includes:

- [x] Prisma + PostgreSQL + `.env`
- [x] `PrismaModule` + `PrismaService`
- [x] `ConfigModule` (global)
- [x] Global `ValidationPipe`
- [x] **Swagger** at `/api/docs` (Bearer auth)
- [x] Module scaffolds: `auth`, `users`, `patients`, `appointments`, **`treatment-notes`** (Phase 5), **`exercise-plans`** (Phase 6), **`progress`** (stub until Phase 7)
- [x] Frontend base layout: **sidebar + header** + routes: `/login`, `/dashboard`, `/patients`, `/appointments`, **`/treatment-notes`**, **`/exercise-plans`**, **`/progress`** (`/progress` placeholder until Phase 7)
- [x] `docker-compose.yml` for Postgres
- **Prisma schema:** AGENTS lists all models in Phase 1; repo adds **TreatmentNote** (Phase 5), **ExercisePlan / ExerciseItem** (Phase 6), **ProgressRecord** when **AGENTS Phase 7** ships.

---

## AGENTS Phase 2 — Authentication & users (done)

- Backend: JWT auth, guards, password hashing, protected routes.
- Frontend: login, auth state, protected shell.

---

## AGENTS Phase 3 — Patient management (done)

- Full patient CRUD (API + UI).

---

## AGENTS Phase 4 — Appointments (done)

- CRUD, patient + therapist (staff user), status, list/filter UI.

---

## AGENTS Phase 5 — Treatment notes (done)

- Backend: `TreatmentNote` model; `treatment-notes` module with CRUD, author from JWT, list by `patientId` (+ optional `appointmentId` filter), appointment must match patient.
- Frontend: `/treatment-notes` (patient picker + list), `/treatment-notes/new`, `/treatment-notes/[id]` SOAP forms; patient detail shows recent notes and links.

---

## AGENTS Phase 6 — Exercise plans (done)

- Backend: `ExercisePlan` (patient, author), `ExerciseItem` (name, instructions, sets, reps, sort order); list by `patientId`; nested `POST|PATCH|DELETE …/items`.
- Frontend: `/exercise-plans` picker + list, `/exercise-plans/new`, `/exercise-plans/[id]` edit plan + manage items; patient detail shows recent plans.

---

## AGENTS Phase 7 — Progress tracking

- Backend: progress records (pain, mobility, notes, date).
- Frontend: history + simple visualization.

---

## AGENTS Phase 8 — Polish & stabilization

- Validation, error handling, UI consistency, duplication removal.

---

## AGENTS Phase 9 — Optional

- Only if explicitly requested (RBAC, audit, notifications, etc.).

---

## Suggested branch naming

| Work | Example branch |
|------|------------------|
| Phase 5 | `feature/phase-5-treatment-notes` |
| Phase 6 | `feature/phase-6-exercise-plans` |
| Phase 7 | `feature/phase-7-progress` |
| Phase 8 | `feature/phase-8-polish` |

Update this file when delivery catches up or AGENTS.md changes.
