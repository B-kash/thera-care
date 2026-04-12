# MVP implementation phases

This document tracks phased delivery for the Thera Care monorepo (Next.js frontend, NestJS backend, PostgreSQL, Prisma). It aligns with [PRODUCT_SPECS.md](./PRODUCT_SPECS.md) and [AGENTS.md](../AGENTS.md).

**Git workflow (from Phase 2 onward):** work on a `feature/phase-N-…` branch, open a pull request into `main`, merge after review—not direct pushes to `main`.

---

## Cross-cutting: database seeding (planned)

**Why:** Fast local onboarding, repeatable demos, and e2e fixtures without manual registration every time.

**Where it lives:** Prisma convention — `prisma/seed.ts` (or `prisma/seed/`), wired via `package.json` → `"prisma": { "seed": "..." }`, run with `npx prisma db seed`.

**Safety:** Never seed production-looking secrets into committed code. Use **environment-gated** seeds (e.g. only when `SEED_ENABLED=true` or `NODE_ENV=development`), documented in `backend/.env.example`.

| When | What to add / extend |
|------|------------------------|
| **Phase 2.5** (recommended) | Initial **seed**: one or more **User** rows (e.g. demo clinician) with bcrypt-hashed password from env vars like `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`; optional second staff user. |
| **Phase 3** | Optional **Patient** demo rows linked to a seeded clinician (behind same env gate). |
| **Phase 4+** | Extend seed with **appointments**, then **notes / plans / progress** as those models land—keep seeds minimal and idempotent (`upsert` where possible). |

**Deliverables per seed PR:** seed script, env template lines, short README or comment in seed file on how to run and reset (`migrate reset` vs `db seed`).

---

## Cross-cutting: security (planned)

**Current state (Phase 2):** Access token is stored in **`localStorage`** and sent as **`Authorization: Bearer`**. That works for an MVP but is **not preferred**: any XSS in the app can exfiltrate the token and act as the user until expiry.

**Target direction:** Move to **httpOnly** (and **Secure** in production) **cookies** for the session or access token so JavaScript cannot read it, plus tight CORS/cookie **SameSite** policy and mutating-route **CSRF** protection where needed.

| Topic | Planned changes |
|-------|------------------|
| **Session transport** | After login, API responds with **`Set-Cookie`** (httpOnly, `SameSite=Lax` or `Strict`, `Path=/`, `Secure` in prod). Logout clears the cookie. Frontend uses **`fetch(..., { credentials: 'include' })`** to the API; **remove `localStorage` token** from `AuthProvider` once cookie path works. |
| **Same-origin in dev** | Browsers treat `localhost:3000` and `localhost:4000` as **different sites** for cookies. Options: (1) **Next.js rewrites** or **Route Handlers** proxy `/api/*` → Nest so the browser only talks to **one origin** (recommended for cookie auth), or (2) dedicated dev domain (e.g. `app.thera-care.test` / `api.thera-care.test`) with correct cookie `Domain`. Document chosen approach in the implementing PR. |
| **CSRF** | For cookie-based auth, protect **state-changing** requests (POST/PUT/PATCH/DELETE): **double-submit cookie**, **synchronizer token**, or **SameSite=Strict** where UX allows—pick one in the security PR. |
| **Headers** | Nest: **`helmet`** (or equivalent) for sensible defaults (HSTS in prod, XSS filter, frameguard, etc.). |
| **Auth endpoints** | **Rate limiting** / throttling on **`/auth/login`** and **`/auth/register`** to reduce brute force and account stuffing. |
| **Registration** | For real deployments, **close or gate** public self-serve registration (invite-only, admin-created users, or env `ALLOW_PUBLIC_REGISTER=false`). |
| **Secrets** | Strong **`JWT_SECRET`** (or session secret) in env only; rotation story documented. |

**Suggested placement in the roadmap:** implement **cookie-based session (or httpOnly JWT) + proxy** as **Phase 2.5** immediately after Phase 2 merge, *or* as the first slice of **Phase 3** if you prefer to batch with patients. Seeding can land in the **same PR as Phase 2.5** or **first Phase 3 PR**—whichever ships first.

---

## Phase 1 — Foundation (done)

**Goal:** Runnable monorepo, database wiring, module skeletons, and UI shell.

### Backend

- Nest project cleanup and **domain-style layout** (`auth`, `users`, `prisma` as `PrismaModule` + `PrismaService`).
- **`ConfigModule`** (global) for environment variables.
- **Prisma 7** with `prisma.config.ts`, PostgreSQL datasource, initial **`User`** model.
- **`PrismaModule`** (global) using `@prisma/adapter-pg` + `pg` pool.
- **`AuthModule`** / **`UsersModule`** scaffolds (placeholder routes).
- **`GET /`** health JSON.
- **`docker-compose.yml`**: Postgres (host port **5433** documented to avoid clashing with a local Postgres on 5432).
- Scripts: `prebuild` → `prisma generate`, `prisma:*` npm scripts.

### Frontend

- Root **App Router** layout (fonts, metadata).
- **`AppShell`**: sidebar + nav to dashboard, patients, appointments.
- **Route placeholders:** `/dashboard`, `/patients`, `/appointments` (under **`(app)`** layout after Phase 2).
- **`/`** home route: Phase 2 routes to **`/login`** or **`/dashboard`** depending on auth state (Phase 1 used a simple redirect to the dashboard only).

### Ops / docs

- **`backend/.env.example`** with `DATABASE_URL`, `PORT`, notes on env precedence.

---

## Phase 2 — Authentication (done)

**Goal:** Real sign-in, JWT API protection, and login UX.

### Backend

- **`POST /auth/register`**, **`POST /auth/login`** with DTOs + **`ValidationPipe`** (global, whitelist).
- **JWT** (`JwtModule`, `JwtStrategy`, `AuthGuard('jwt')`).
- **`GET /auth/me`** (authenticated).
- **`GET /users`** requires Bearer token; responses **exclude** `passwordHash`.
- **CORS**: `Authorization` header, `credentials: true` for future cookie flows.
- **`JWT_SECRET`**, **`JWT_EXPIRES_IN`**, **`FRONTEND_ORIGIN`** in `.env.example`.
- Unit tests for **`AuthService`**; e2e asserts **`GET /users` → 401** without token.

### Frontend

- **`AuthProvider`** + **`useAuth`**: **interim** storage of access token in **`localStorage`** (see **Cross-cutting: security**—to be replaced).
- **`/login`**: sign-in + register (tabs), **`?next=`** redirect after success.
- **`(app)`** layout: **`AuthGate`** + **`AppShell`** for authenticated sections.
- **`/`** → login or dashboard depending on token.
- **`LogoutButton`** in shell.
- **`NEXT_PUBLIC_API_URL`** in **`frontend/.env.example`**; **`.gitignore`** exception for `.env.example`.

---

## Phase 2.5 — Seeding & secure sessions (planned)

**Goal:** Repeatable local/demo data and **remove dependency on `localStorage` for JWT** (cookie + same-origin or BFF pattern as documented above).

### Seeding

- Add **`prisma/seed`** script and **`npx prisma db seed`** wiring.
- Env-gated demo **User(s)**; document in `.env.example`.
- Optional: `package.json` script alias e.g. **`db:seed`**.

### Security (session transport)

- Issue auth cookie from Nest on login; align Next + API origins (proxy or dev host strategy).
- Update **`AuthProvider` / `AuthGate`**: session inferred from **`/auth/me`** with **`credentials: 'include'`**, no token in `localStorage`.
- Logout clears cookie server-side.
- Add **Helmet** (or equivalent) and **rate limits** on auth routes as part of this slice or a fast follow.

---

## Phase 3 — Patients (done)

**Goal:** Full patient CRUD and list/detail UX per product spec.

**Delivered:** `Patient` Prisma model + migration; Nest `patients` module (JWT-protected CRUD, list search `q`, pagination `skip`/`take`); UI at `/patients`, `/patients/new`, `/patients/[id]` with `apiFetchJson` + Bearer token. Optional demo **Patient** seeding remains for **Phase 2.5** / follow-up.

### Backend (`patients` module)

- Prisma **`Patient`**: first/last name, optional email/phone, date of birth, notes, optional **`createdBy`** → `User`, timestamps.
- Migration(s).
- **DTOs:** create, update (partial), list query (`q`, `skip`, `take`).
- **`PatientsController`** + **`PatientsService`**: `POST/GET/PATCH/DELETE`, `GET :id`; **hard delete** on `DELETE`.
- **Authorization:** JWT on all routes; **`createdByUserId`** set on create from token subject.
- Unit tests (`PatientsService`); e2e **`GET /patients` without token → 401**.
- **Seeding:** optional demo patients still per cross-cutting table (not required for Phase 3 closure).

### Frontend

- **`/patients`**: searchable table, link to detail, **Add patient**.
- **`/patients/new`**, **`/patients/[id]`**: create and edit/delete; **`apiFetchJson`** + Bearer token (until Phase 2.5 cookies).
- Empty and error states.

### Cross-cutting

- Seed or admin-only **register** policy if open registration is no longer desired (overlaps **Security** table).

---

## Phase 4 — Appointments

**Goal:** Schedule appointments linked to patients (and optionally users).

### Backend (`appointments` module)

- Prisma **`Appointment`** model (patient relation, start/end or single datetime, status, notes, optional user relation).
- Migration(s).
- DTOs + validated create/update/list (filter by date range, patient).
- **Conflict rules** (simple overlap check MVP).
- Controllers thin; services own scheduling logic.
- **Seeding:** optional demo appointments (cross-cutting table).

### Frontend

- **`/appointments`**: calendar or list view (pick simplest usable MVP).
- Create/edit appointment flows; link to patient.
- Dashboard can later surface “today’s appointments” (optional in this phase or stub).

---

## Phase 5 — Treatment notes

**Goal:** Clinical notes tied to patient and/or appointment.

### Backend (`treatment-notes` module)

- Prisma **`TreatmentNote`** model (body, author user, patient, optional appointment, timestamps).
- Migration(s).
- CRUD + list by patient (and by appointment if modeled).
- DTOs; ensure **only authenticated staff** can read/write.
- **Seeding:** optional demo notes for demo patients (cross-cutting table).

### Frontend

- Notes section on **patient detail** and/or dedicated **`/treatment-notes`** area per spec.
- Rich text or textarea MVP; autosave optional later.

---

## Phase 6 — Exercise plans

**Goal:** Assign structured exercise plans to patients.

### Backend (`exercise-plans` module)

- Prisma models: e.g. **`ExercisePlan`**, **`Exercise`**, join or JSON structure for plan content (decide in implementation).
- Migration(s).
- CRUD plans, assign to patient, versioning optional MVP.
- **Seeding:** optional template plans / assignments (cross-cutting table).

### Frontend

- **`/exercise-plans`** (list/templates) + assignment from patient UI.
- Readable plan view for clinician (patient portal is non-goal for MVP per spec).

---

## Phase 7 — Progress tracking

**Goal:** Record and display progress over time (metrics, visit snapshots, or scores).

### Backend (`progress` module)

- Prisma **`ProgressEntry`** (or similarly named) model: patient, date, metrics JSON or typed columns, optional link to appointment/note.
- Migration(s).
- APIs to create entries and list history for a patient.
- **Seeding:** optional demo progress rows (cross-cutting table).

### Frontend

- **`/progress`** or embedded **progress history** on patient detail (per “Progress history” in spec).
- Simple table/chart MVP (no heavy analytics; non-goals exclude advanced analytics).

---

## Post-MVP (not phased here)

- Patient-facing portal, payments, insurance, video, native mobile, advanced analytics (see **Non-goals** in product spec).
- Deeper hardening: **audit logs**, fine-grained **roles** (admin/receptionist), **E2E in CI**, WAF, secret rotation automation—beyond the explicit **Cross-cutting: security** table when those become requirements.

---

## Suggested branch naming

| Phase | Example branch |
|-------|----------------|
| Phase 2.5 | `feature/phase-2.5-seed-and-secure-sessions` |
| Phase 3 | `feature/phase-3-patients` |
| Phase 4 | `feature/phase-4-appointments` |
| Phase 5 | `feature/phase-5-treatment-notes` |
| Phase 6 | `feature/phase-6-exercise-plans` |
| Phase 7 | `feature/phase-7-progress` |

Update this file when scope changes so agents and humans stay aligned.
