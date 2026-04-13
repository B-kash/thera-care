# Feature backlog (Thera Care)

Ordered **feature requests (FR)**. Implement top-to-bottom unless user explicitly skips or reorders.

---

## Agent / developer workflow

When the user says **“let’s build the next feature”** (or similar: “next backlog item”, “ship next FR”):

1. Open **this file**.
2. Find the **first** feature whose checkbox is still **`[ ]` (not done)**.
3. Implement that feature only (focused PR; branch `feature/<short-name>` unless user specifies otherwise).
4. After it ships: set that item to **`[x]`**, add optional one-line **Shipped** note (date + PR link if you want).
5. If scope is ambiguous, stop and ask user **before** coding that item.

Do **not** start a lower item while a higher `[ ]` item remains unless user says to skip or parallelize.

---

## Backlog (priority order)

### FR-01 — Auth hardening

- [x] **Done when:** Sessions are safer than raw `localStorage` JWT for production posture; abuse surface on auth reduced.
- **Scope (suggested):** httpOnly cookie **or** BFF pattern; same-site / CORS alignment; CSRF strategy if cookies; rate limits on `/auth/*`; refresh-token story (if cookies); document env vars + local dev flow.
- **Out of scope (for this FR):** Full IdP (OAuth) unless you add a follow-up FR.
- **Notes:** `MVP_PHASES.md` “Cross-cutting: security” row — still partially open after Phase 8 Helmet.
- **Shipped (2026-04-12):** httpOnly access cookie + Bearer fallback; `/auth/*` throttling; `POST /auth/logout`; same-origin `/api` rewrite for cookie session.

---

### FR-02 — Role-based access control (RBAC)

- [x] **Done when:** Roles exist in data model; JWT (or session) carries role; Nest guards enforce on mutating routes; frontend hides unauthorized actions (API remains source of truth).
- **Scope (suggested):** `Role` enum or `UserRole` table; `@Roles()` + guard after auth; minimal matrix (e.g. admin vs therapist vs staff) documented in this file or `PRODUCT_SPECS.md`; migrate existing users to default role.
- **Depends on:** FR-01 recommended first if you move off localStorage JWT (avoid double auth migration).
- **Shipped (2026-04-12):** `UserRole` enum + `User.role`; JWT payload + `RolesGuard`; **STAFF** = read-only on domain routes; **ADMIN** / **THERAPIST** = mutations. Frontend: `MutateOnly` / disabled fields on key patient + exercise-plan flows (API still enforces everywhere).

---

### FR-03 — One-command local dev (DX)

- [x] **Done when:** From **clean clone**, developer runs **one documented command** (repo root) that brings stack up: **Docker DB** healthy, **deps installed** (backend + frontend), **Prisma migrate** applied (or clear failure message), **backend + frontend dev servers** running (or second command only if you split “setup” vs “watch” — document which).
- **Scope (suggested):** Root `package.json` scripts **or** `scripts/dev.*` (PowerShell + bash if needed, or Node cross-platform runner); ensure `.env` / `.env.local` exist from `*.example` when missing (no secrets committed); `docker compose up -d` wait-for-Postgres; `npm ci` or `npm install` in `backend/` + `frontend/`; `npx prisma migrate dev` (non-interactive name if CI later); `concurrently`-style **both** `start:dev` + `next dev` with URLs printed; **README** “Run locally” = that one path + troubleshooting (port 5433, Prisma locked DB, etc.).
- **Out of scope (for this FR):** Production deploy automation; full devcontainer mandatory workflow (optional follow-up).
- **Depends on:** None — pure DX; keep compatible with existing `docker-compose.yml` + README ports.
- **Shipped (2026-04-12):** Root `npm run dev` → `scripts/dev.mjs` (Docker wait, env copy, conditional installs, `prisma migrate deploy` + generate, Nest + Next). README + `frontend/.env.example` aligned with cookie/`/api` dev.

---

### FR-04 — Audit logs

- [x] **Done when:** Security-relevant and clinical CRUD leaves **append-only** audit trail; admin (or role with permission) can list/filter.
- **Scope (suggested):** `AuditLog` model (`actorUserId`, `action`, `entityType`, `entityId`, `metadata` JSON, `ip`, `userAgent`, `createdAt`); `AuditService.log()` called from services; RBAC protects read endpoint; retention policy documented (even if “manual DB purge for now”).
- **Depends on:** FR-02 (need stable actor + roles for “who did what”).
- **Shipped (2026-04-13):** Prisma `AuditLog` + enums; `AuditService.logEvent` from domain services after successful mutations; `GET /audit-logs` (ADMIN); request IP/UA capture; admin UI `/audit-logs`; [AUDIT_LOGS.md](AUDIT_LOGS.md) retention note.

---

### FR-05 — Multi-tenant (go-live)

- [x] **Done when:** **Plan A** only: single deployment, **shared** Postgres + **shared schema**, row partition via **`tenantId`** on every tenant-owned table; **no cross-tenant leaks** (guards + consistent Prisma `where` / scoped access layer + tests). **Patient = per-clinic chart:** same real-world person at **another** clinic = **separate `Patient` row** in that tenant; **no** automatic sharing of clinical data across tenants (see **Option 3** below). **Indexes** in place for common tenant-scoped queries (lists, FK joins, time-ordered feeds). **Connection pooling** configured for prod-style load (document dev vs prod URLs); migrations still work (direct vs pooled URL split if needed).
- **Architecture (this FR):** **Plan A** — app enforces tenant boundary (JWT/session → `tenantId`, Nest guard, services never query without tenant filter). **Not in scope:** Postgres **RLS**, separate DB/schema per tenant, separate deploy per tenant (future FR if compliance demands).
- **Patient / multi-clinic (product — Option 3):** Treat **`Patient` (+ notes, plans, progress)** as **owned by one tenant** (one clinic’s record). Same individual visiting **another** clinic → **new patient** in that tenant’s data (duplicate demographics OK). **Cross-clinic continuity** only via **explicit workflows later** (e.g. patient-consented **referral**, **import summary** into a new chart, audited handoff) — **not** in FR-05; pull from **Optional** when product defines flows + legal checks (**FR-10** overlap).
- **Scope (suggested):** `Tenant` model + `tenantId` on `User`, `Patient`, and all tenant-owned entities; **composite uniques** where needed (e.g. `(tenantId, email)` on `User`; `(tenantId, …)` for patient identifiers you choose); middleware/guard resolves `tenantId` from auth; migration + **backfill** single default tenant for existing rows then tighten constraints. **Indexes:** add Prisma `@@index` / `@@unique` migrations — at minimum `(tenantId)` or **`(tenantId, createdAt)`** / **`(tenantId, id)`** on high-traffic list tables, align with appointment/patient/progress query patterns + any `tenantId` + foreign-key lookups; run **EXPLAIN** spot-check on slow paths if needed. **Connection pooling:** Prisma `DATABASE_URL` tuning (`connection_limit`, `pool_timeout`) per host docs; for managed Postgres use **provider pooler** (PgBouncer transaction mode, Neon pooler, etc.) when supported — document **`DATABASE_URL`** (pooled) vs **`DIRECT_URL`** / migrate URL for `prisma migrate` if pooler disallows prepared statements or long sessions; update `backend/.env.example` + README / go-live notes.
- **Out of scope (for this FR):** Row-Level Security policies; read replicas; global full-text search across tenants; **global “one patient row” identity** across tenants; **silent** merge/dedup of charts; cross-tenant APIs without a dedicated future FR (referral/share/import).
- **Depends on:** FR-02 strongly recommended; FR-01 before production.
- **Shipped (2026-04-13):** `Tenant` + `tenantId` on tenant-owned models; default tenant migration; `(tenantId, email)` on `User`; JWT + services/controllers + audit tenant-scoped; frontend `AuthUser.tenant` + optional slug on login/register; pooling notes in `backend/.env.example`.

---

### FR-06 — Design system pass

- [x] **Done when:** Shared primitives (buttons, inputs, page headers, alerts, tables) replace one-off styles across main flows; dark mode stays consistent. Also lets add theming so that if the developer wants they can change the theme of the app. Have a few pre built themes that the developer can choose from. Also add a dark and light mode for each theme
- **Scope (suggested):** Small internal component layer (no need for full Storybook day one); align spacing/typography with `app-shell` + feature pages; reduce duplicate class strings.
- **Depends on:** None hard — can ship after FR-05 to avoid churn during tenant migration, or earlier if you accept refactor cost.
- **Shipped (2026-04-12):** Semantic CSS tokens + Tailwind `@theme`; `ThemeProvider` + palette/mode (`ThemeSwitcher` in shell); shared `Button` / `ButtonLink`, `PageHeader`, `Alert`, `TableShell`; dashboard / patients / appointments list + shell use primitives.

---

### FR-07 — Calendar UI (appointments)

- [x] **Done when:** Appointments visible in **week or month calendar** view; create/edit still works (reuse existing API).
- **Scope (suggested):** Pick one library (e.g. FullCalendar, react-big-calendar) or minimal custom grid; filter by staff/patient; link to existing detail routes.
- **Depends on:** None for read-only calendar; write flows assume appointments API stable.
- **Shipped (2026-04-12):** `react-big-calendar` week + month on `/appointments?view=calendar`; list tab unchanged; event click → appointment detail; list/calendar loads use `take=500` (backend max raised).

---

### FR-08 — Export CSV (patient analytics)

- [ ] **Done when:** User can download **CSV** for a patient (or date range) combining progress + key demographics / visits (exact columns = product choice).
- **Status:** No dedicated export endpoint or patient-detail download in repo yet (lists use `skip`/`take` only).
- **Scope (suggested):** Backend `GET` or `POST` export endpoint (RBAC: same access as patient read); stream CSV; frontend download button on patient detail or dedicated “Exports” action; UTF-8, sensible filenames.
- **Depends on:** FR-02 for “who may export”; FR-05 if export must be tenant-scoped.

---

### FR-09 — Notifications (**last** per product plan)

- [ ] **Done when:** At least one **real channel** (e.g. email or in-app inbox) for one high-value event (e.g. appointment reminder or “note shared” — you choose).
- **Scope (suggested):** Provider (Resend/SendGrid/SMTP) behind interface; templates; idempotency; user prefs table if needed; rate limits; no spam on failed jobs.
- **Depends on:** FR-02 + FR-05 in production; FR-01 for secrets and callback URLs.

---

### FR-10 — GDPR compliance (EU launch)

- [ ] **Done when:** Product meets **baseline GDPR posture** for EU users: lawful processing documented; users/patients can **access** and **delete** personal data on request; **retention** + minimization addressed; privacy notice + consent UX where required; security measures aligned with Art. 32; subprocessors / DPA story documented for whoever operates hosting.
- **Scope (suggested):** Privacy policy + in-app **privacy notice** (what you collect, why, retention); registration / onboarding **consent** capture (timestamp, version) if not solely contract/legitimate interest; **DSAR export** (machine-readable bundle: user + linked clinical entities therapist may access — exact shape = legal review); **right to erasure** (account + cascade or anonymize patient PII per policy); **cookie / local storage** disclosure if non-essential trackers added later; **breach playbook** (internal doc: who notifies, 72h clock); optional **Records of processing** (`ROPA`) doc in `docs/`; **subprocessor list** in privacy doc.
- **Out of scope (for this FR):** Full ISO 27001; legal sign-off (need real counsel); DPO appointment unless you hit statutory threshold.
- **Depends on:** FR-02 helps (who may export/delete); FR-05 if multi-tenant before EU go-live; FR-01 before production (secrets, transport). Can start policy + export/delete design without RBAC if single role MVP.

---

### FR-11 — Cursor-based pagination

- [ ] **Done when:** High-volume **list** APIs use **cursor pagination** (not `skip`/`offset`) with stable ordering; responses include **`nextCursor`** (or explicit “end”); clients can page forward reliably; at least **patients** + **appointments** lists covered (extend same pattern to other list endpoints as follow-up if needed).
- **Status:** Current APIs use **offset** pagination (`skip` / `take` on patients, appointments, users, audit logs, etc.); Prisma `cursor` not used yet.
- **Scope (suggested):** Shared contract: query `cursor` (opaque string), `limit` (capped max, e.g. 50); order by **deterministic** tie-breaker (`createdAt` + `id` or similar); Prisma `take` + `cursor` / seek method documented in code; Nest DTO validation + Swagger; **RBAC / tenant filters unchanged** (cursor encodes position only inside allowed set); frontend: **“Load more”** or infinite scroll using returned `nextCursor`; document cursor format (versioned if you change sort key).
- **Out of scope (for this FR):** Full GraphQL relay spec; backward pagination unless trivial add-on; search-index pagination (Algolia etc.).
- **Depends on:** FR-05 if lists must be **tenant-scoped** first (cursor + `tenantId` filter must align); else none.

---

### FR-12 — Mobile-friendly (responsive UX)

- [x] **Done when:** Core flows are **usable on phone-width viewports** (≈320–428px): navigation, auth, dashboard shell, **patients**, **appointments**, **treatment notes**, **exercise plans**, **progress** — no horizontal scroll traps for primary actions; forms and tables have a **small-screen pattern** (stacked fields, scroll-x only where intentional, or card/list alternative).
- **Scope (suggested):** Audit layout: **sidebar** → collapsible / drawer + menu affordance on narrow widths; **tables** → responsive column hide, stacked rows, or cards; **touch targets** ≥ ~44px where interactive; **viewport** + safe-area if needed; keyboard / `input` types for mobile; smoke checklist in `docs/` or README (“verify on iOS Safari + Chrome Android”); **installable PWA** (manifest, icons, SW) → **FR-13** (shipped).
- **Out of scope (for this FR):** Native iOS/Android apps; offline-first; full redesign — goal is **adaptation**, not new brand.
- **Depends on:** FR-06 helps (shared components + theming reduce duplicate responsive work); can ship incremental **before** FR-06 if you accept some one-off responsive CSS first.
- **Shipped (2026-04-13):** `AppShell` mobile drawer + overlay; `viewport` + safe-area on shell/login; tighter main padding; `Button` / theme selects / nav / appointment tabs **≥44px** touch height on small screens; `PageHeader` stacks actions; `TableShell` full-bleed horizontal scroll on narrow; README smoke checklist.

---

### FR-13 — Progressive Web App (PWA)

- [x] **Done when:** App is **installable** from supported mobile/desktop browsers (Add to Home Screen / install prompt where applicable); **Web App Manifest** present with name, theme/background colors, display mode, start URL; **icons** (maskable + standard sizes); **service worker** registers without breaking auth/API flows; **offline** behavior defined (at minimum branded offline fallback page + cached static shell; **not** silent stale clinical writes).
- **Scope (suggested):** Next.js integration (`metadata` manifest link, icons in `public/`); SW strategy (e.g. Workbox or hand-rolled): precache app shell + static assets; network-first for `/api` or same-origin API routes; `scope` / `start_url` aligned with app base path; Lighthouse PWA checks pass at acceptable threshold; README: HTTPS requirement for prod, how to test install locally; update **FR-10** privacy copy if SW caches personal data (disclose briefly).
- **Out of scope (for this FR):** Full **offline CRUD** for patients/notes; **Web Push** (tie to FR-09 if desired); native store packaging.
- **Depends on:** FR-12 **recommended** (usable layout at install size); FR-01 cookie/session behavior must stay correct with SW fetch handling.
- **Shipped (2026-04):** `src/app/manifest.ts` + `public/icons/*`; `public/sw.js` + `ServiceWorkerRegistration` (prod or `NEXT_PUBLIC_ENABLE_SW=true`); `/offline` page; README PWA section; `/api` network-only in SW — no offline clinical writes.

---

### FR-14 — DevOps / CI–CD best practices

- [x] **Done when:** Repo has **documented** CI–CD posture aligned with team workflow: **automated checks** on every PR (at minimum **lint + unit/build** for `backend/` and `frontend/`); **branch protection** expectations documented (who merges, required checks); **environment promotion** story (dev → staging → prod or equivalent) with **secrets** outside git; **database migrations** path defined for deploys (Prisma: order of migrate vs app start); **rollback** or “forward-fix only” call documented.
- **Scope (suggested):** Pick CI (e.g. GitHub Actions): matrix or parallel jobs; cache `npm`; run Prisma **validate** / generate where useful; optional **Docker image** build for backend + frontend; add **`docs/DEVOPS.md`** (or extend README) mapping **local → CI → deploy** and naming conventions for branches/tags; optional **staging** deploy workflow (manual or on `main`).
- **Reference (ideas, not product-specific):** [Databricks — CI/CD best practices (GCP)](https://docs.databricks.com/gcp/en/dev-tools/ci-cd/best-practices) — use for **principles** (small batches, repeatable pipelines, env parity, review gates). **Adapt** to NestJS + Next.js + PostgreSQL (this repo is **not** Databricks).
- **Out of scope (for this FR):** Full SOC2 evidence pack; multi-cloud DR; replacing your hosting vendor’s native deploy if already sufficient.
- **Depends on:** None hard; **FR-05** before prod multi-tenant if CI must inject tenant-aware config per env.
- **Notes:** **Kubernetes**, **separate IaC repo**, cluster-level **observability / resilience / rollback** → **FR-18** (this FR = app-repo **CI** + release hygiene; **FR-18** = **where** workloads run).
- **Shipped (2026-04):** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — path-filtered backend/frontend jobs, **`npx prisma generate`** before backend lint, aggregate **CI** job for branch protection; [docs/DEVOPS.md](DEVOPS.md); root **Husky** + **lint-staged** (lint on commit). Optional: `release` workflow + Docker smoke in CI (still listed in DEVOPS as next steps).

---

### FR-15 — User management & role management (admin-provisioned)

- [x] **Done when:** **Self-service registration is removed or disabled** in production posture; **ADMIN** (or equivalent role) can **create** users, **assign / change roles**, **deactivate** or **delete** accounts via API + UI; therapists/staff cannot escalate privileges; audit-worthy actions logged or ready for **FR-04**.
- **Scope (suggested):** Backend: `POST` admin-only create user (email, name, role, optional initial password or invite-only); `PATCH` user (role, active flag); list users with filters; guard all routes with **FR-02** roles; migration if `User` needs `invitedAt` / `deactivatedAt`. Frontend: **Users** admin screen (table + create/edit drawer); hide **Register** link and public register route or gate behind env `ALLOW_PUBLIC_REGISTER=false`; first-time login flow if using **set password email** (overlap **FR-16**). Document bootstrap (how first admin exists — seed, env, or one-time CLI).
- **Out of scope (for this FR):** Full IdP / SCIM; bulk CSV import (follow-up).
- **Depends on:** **FR-02** (roles + guards). **FR-05** if users are tenant-scoped.

---

### FR-16 — Forgot password & magic-link login

- [x] **Done when:** User can request **password reset** via email (time-limited token, one-time use); user can sign in via **magic link** (signed token in email, short TTL); flows rate-limited; invalid/expired token shows safe UX; **no** user enumeration via timing/message if you adopt uniform responses (document tradeoff).
- **Scope (suggested):** Store hashed reset/magic tokens + expiry in DB or signed JWT with jti denylist; Nest modules + DTOs; email send via **minimal provider** (SMTP, Resend, etc.) — can ship **before** full **FR-09** if scope is auth-only templates; frontend pages: forgot password, reset password, “email sent”, magic-link landing that sets session/cookie per **FR-01**; align with **FR-15** if only existing users may use magic link (no public register).
- **Out of scope (for this FR):** SMS OTP; social OAuth logins.
- **Depends on:** **FR-01** (session/cookie after link click); **FR-15** recommended so all users are known before magic-link rollout in prod.
- **Shipped (2026-04):** `EmailAuthToken` + `EmailAuthTokenService` + `MailerService`; `POST /auth/password-reset/*`, `POST /auth/magic-link/*`; throttled; frontend `/login/forgot-password`, `/login/reset-password`, `/login/magic-link`, `/login/magic`; README + `backend/.env.example` (`AUTH_EMAIL_MODE`, TTLs). Enumeration: uniform `{ ok: true }` on request endpoints (documented).

---

### FR-17 — Two-factor authentication (2FA)

- [x] **Done when:** User can enable **TOTP** (authenticator app); **backup codes** generated once and shown securely; login requires second factor when 2FA enabled; **ADMIN** can policy-disable user 2FA or lock reset path (document); recovery does not weaken security of others.
- **Scope (suggested):** Encrypt TOTP secret at rest; verify window + clock skew; QR or manual secret entry in UI; require password (or session step-up) before enabling/disabling; optional **require 2FA for ADMIN** flag (env or DB); Swagger + README for testers; consider overlap with **FR-16** (lost device → admin reset + re-enroll).
- **Out of scope (for this FR):** WebAuthn / passkeys-only; hardware keys as primary requirement.
- **Depends on:** **FR-01**; **FR-15** for admin-assisted account recovery; **FR-16** optional if “lost password + 2FA” needs combined flow.
- **Shipped (2026-04-13):** TOTP enrollment + backup codes (hashed); encrypted secret at rest; `POST /auth/login` → `POST /auth/login/2fa`; self-service disable; `POST /users/:id/two-factor/clear` (ADMIN, same tenant); optional `REQUIRE_2FA_FOR_ADMIN`; `TOTP_ENCRYPTION_KEY` / `PRE_2FA_JWT_SECRET` in `backend/.env.example`; Security page + login second step.

---

### FR-18 — DevOps pipeline: IaC repo + Kubernetes (deploy, tag, observe, rollback)

- [ ] **Done when:** **Separate repository** holds **IaC + Kubernetes manifests** (or Helm/Kustomize charts) for this product; **automated pipeline** builds **versioned container images**, deploys to **at least** dev + staging (prod optional same pattern); **image tagging** policy documented (**immutable tags**: Git SHA + semver or calendar version; never reuse `latest` for prod); **observability** baseline live (**logs** aggregation, **metrics**, **tracing** optional but preferred); **resilience / reliability** primitives in cluster (**probes**, **resources**, **replicas**, **PDB** / surge rules where applicable, **HPA** or documented scale path); **rollback** path documented and tested (e.g. Helm `rollback`, Argo CD sync to previous Git, or `kubectl rollout undo`) — **one-page runbook**; links **FR-14** app CI (build/test) to **image publish** + **deploy promotion**.
- **Progress (in this repo, not full FR-18):** Example **Kustomize** manifests under [`infra/k8s/`](../infra/k8s/) (backend + frontend Deployments/Services, namespace) and **[`docs/KUBERNETES_RUNBOOK.md`](KUBERNETES_RUNBOOK.md)** (tagging, rollback, observability, health probes). **Still open:** dedicated **infra repo**, CI **image build/push**, live cluster wiring, secrets operator, and tested deploy/rollback on a real cluster.
- **Scope (suggested):** Pick stack (examples): **Terraform/OpenTofu** or Pulumi for cloud + cluster add-ons; **GitHub Actions** / GitLab CI in **IaC repo** for plan/apply gates; **Kubernetes**: `Deployment`/`Service`/`Ingress` (or gateway API) for **backend** + **frontend** (or SSR separately); **Secrets** via sealed-secrets, external secrets operator, or cloud secret manager — **not** plaintext in git; **Network policies** if threat model needs; **DB**: managed Postgres + **FR-05** pooled URL in prod; **migrations**: job or init pattern (order vs app rollout documented). **Observability:** OpenTelemetry or vendor (Datadog/Grafana Cloud/CloudWatch) — dashboards for **latency, errors, saturation**; **alerting** on SLO-style signals (5xx rate, pod crash loop); **structured logs** correlation with `trace_id` where possible. **Reliability:** health/readiness endpoints wired; graceful shutdown; optional **multi-AZ** = cloud default + explicit in docs.
- **Relationship to FR-14:** **FR-14** = application repo **CI** (lint, test, build). **FR-18** = **where it runs** (infra repo, cluster, release, SRE baseline). Both ship before treating prod as “real.”
- **Out of scope (for this FR):** Multi-region active-active; custom service mesh day one; SOC2 audit evidence pack (can reference this work later).
- **Depends on:** **FR-05** before prod multi-tenant wiring in manifests/secrets; **FR-14** recommended so app images are CI-clean before promoting.

---

## Optional / later (not numbered — pull in when needed)

- **Seeding:** env-gated `prisma/seed` for demos (`MVP_PHASES.md`).
- **Richer analytics / charts:** beyond current progress bars; BI export.
- **Soft delete / legal hold:** retention beyond GDPR delete path; litigation freeze workflows.
- **Cross-tenant patient continuity (Option 3 implementation):** consented referral, record export/import into new chart, or patient-initiated link — product + **FR-10** + audit (**FR-04**) before build.

---

## Changelog (optional)

| Date       | FR        | Note                                                                 |
|------------|-----------|----------------------------------------------------------------------|
| 2026-04-14 | FR-13, FR-16 | Marked shipped: PWA shell + manifest/SW; password reset + magic link |
| 2026-04-14 | FR-14    | Marked shipped: GitHub Actions CI, DEVOPS.md, Husky/lint-staged      |
| 2026-04-14 | FR-11,08 | Clarified “not built yet” (offset lists; no CSV export)              |
| 2026-04-14 | FR-18 | Documented in-repo K8s starter + runbook vs full separate-repo scope |
