# Go-live checklist (production)

Use this before pointing real users or PHI at a deployed environment. Not every item applies to every launch; skip with a written reason if you accept the risk.

## Security and secrets

- [ ] **No dev defaults in prod**: `JWT_SECRET`, DB password, and any API keys are strong, unique, and stored only in the host’s secret manager / env — not in git.
- [ ] **`backend/.env` / `frontend/.env.local`**: production values documented (or templated); `*.example` files do not contain real secrets.
- [ ] **HTTPS everywhere**: TLS on public URLs; cookies/session flags appropriate for HTTPS (`Secure`, `SameSite` aligned with how the browser hits API vs web).
- [ ] **CORS / origins**: `FRONTEND_ORIGIN` (and any API base URL) match the real web origin(s); no wildcard credentialed CORS in production.
- [ ] **Rate limits**: auth and sensitive routes reviewed under expected load; adjust Nest throttler if needed.
- [ ] **Swagger / API docs**: disabled, IP-restricted, or behind auth in production — not open to the internet by default.
- [ ] **Dependency audit**: `npm audit` (frontend + backend); critical issues triaged or patched.

## Auth and access control

- [ ] **Session / JWT posture**: production matches intended model (e.g. httpOnly cookie + same-site policy); logout and token expiry behave as designed.
- [ ] **RBAC smoke test**: `STAFF` cannot mutate where only `ADMIN`/`THERAPIST` should; API remains source of truth (UI can lie; API must not).
- [ ] **Admin-only surfaces**: e.g. audit log UI and `GET /audit-logs` verified for non-admin denial.

## Data and database

- [ ] **Migrations**: `prisma migrate deploy` run against prod DB; schema version recorded or verified.
- [ ] **Backups**: automated Postgres backups + tested restore (frequency and RPO/RTO agreed).
- [ ] **Connection limits**: pool size and DB `max_connections` sane for your instance size.
- [ ] **Audit logs**: retention / archive policy decided ([AUDIT_LOGS.md](AUDIT_LOGS.md)); disk growth monitored.

## Application behavior

- [ ] **Smoke test on staging**: login, patients CRUD (as allowed roles), appointments, notes, plans, progress; calendar and mobile layout if you ship phones.
- [ ] **Error handling**: 5xx paths don’t leak stack traces or secrets to clients; server logs sufficient to debug.
- [ ] **Time zones**: appointment and “date-only” fields behave correctly for your clinic’s TZ (document assumption).

## Multi-tenant and scale (if applicable)

- [ ] **FR-05 (multi-tenant)**: if go-live is multi-clinic, tenant isolation verified (queries, tests, no cross-tenant IDs in URLs). If single-tenant for now, document that explicitly.

## Legal, privacy, EU (if applicable)

- [ ] **FR-10 (GDPR)**: privacy notice, consent where required, DSAR / erasure process, subprocessors — as far as your counsel requires before EU users.
- [ ] **Data processing agreement** with hosting/email providers where needed.

## Operations

- [ ] **Health checks**: load balancer or orchestrator hits Nest (and DB connectivity if you expose it).
- [ ] **Logging / alerting**: structured logs, log retention, alerts on error rate and disk/CPU.
- [ ] **Runbook**: who is on-call; how to rotate secrets; how to restore DB; how to scale or roll back a release.
- [ ] **Frontend / backend deploy**: build commands documented; `NODE_ENV=production`; no `next dev` / `nest start --watch` in prod.

## Post-launch (first week)

- [ ] Watch audit log volume and error logs daily.
- [ ] Confirm backup jobs succeeded.
- [ ] Gather feedback on critical flows and fix regressions before broad rollout.

---

**Related backlog**: FR-01 (auth hardening), FR-02 (RBAC), FR-04 (audit logs), FR-05 (multi-tenant), FR-10 (GDPR) — see [FEATURE_BACKLOG.md](FEATURE_BACKLOG.md) if you track features there.
