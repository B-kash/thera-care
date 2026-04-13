# DevOps and CI (FR-14)

This document describes how **continuous integration** and **releases** are expected to work for Thera Care. **Kubernetes and cluster operations** live in [KUBERNETES_RUNBOOK.md](KUBERNETES_RUNBOOK.md) (FR-18) and, for a full production setup, a **separate infrastructure repository** (see that runbook).

## Continuous integration

- **Workflow:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- **Triggers:** every `push` to `main` and every `pull_request`.
- **Jobs:**
  - **Backend:** `npm ci` → `prisma validate` → **`prisma generate`** (gitignored client; required before ESLint) → ESLint (`lint:ci`, `CI=true` turns off `prettier/prettier` inside ESLint for stable line endings) → Jest → Nest build (`prebuild` runs generate again — harmless).
  - **Frontend:** `npm ci` → ESLint → `next build`.

Pull requests should stay green before merge. **Branch protection** (GitHub: *Settings → Branches → Branch protection rule* for `main`) should require this workflow (or a ruleset that includes it) as a **required status check**, plus at least one reviewer if your team policy demands it.

## Secrets and environments

- **Never** commit real `DATABASE_URL`, `JWT_SECRET`, or provider keys. Use GitHub **Environments** (`development`, `staging`, `production`) with scoped secrets for deploy workflows when you add them.
- **Local:** copy `backend/.env.example` and `frontend/.env.example` only; keep `.env` / `.env.local` out of version control.

## Database migrations (Prisma)

- **Rule of thumb:** run **`prisma migrate deploy`** against the target database **before** or **as part of** rolling out a backend version that depends on the new schema — not after old code is gone if the migration is incompatible with the previous app version (plan **expand → deploy → contract** for zero-downtime renames).
- **Pooled vs direct URL:** for hosts that need a non-pooled URL for migrations, use the provider’s “direct” connection string for the migrate job only; the app runtime uses the pooler URL. Document both in the infra repo’s secrets layout.
- **CI:** does not run migrations against a live DB; it only **`prisma validate`** plus generate-at-build.

## Release promotion

Suggested path: **development → staging → production**, each with its own `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_ORIGIN` (or equivalent). Tag **immutable** container images with **Git SHA** and optionally **semver** (see Kubernetes runbook). Do not rely on a moving **`latest`** tag for production.

## Rollback

- **Application-only:** redeploy the previous **image digest** or Git tag that was known good.
- **Bad migration already applied:** prefer a **forward** follow-up migration that fixes data/schema; avoid `migrate reset` on shared environments. Document incidents in your ops channel.

## Optional next steps

- Add a **`release`** workflow: on tag `v*`, build and push images to your registry, then trigger deploy (staging/prod) via the **infra repo** or GitHub Environment gates.
- Add **`docker build`** smoke jobs in CI using the repo `Dockerfile`s under `backend/` and `frontend/` when you want CI to validate container builds on every PR.
