# Kubernetes and infra (FR-18)

FR-18 expects a **separate repository** for Terraform/OpenTofu (or Pulumi), cluster add-ons, and **Helm or Kustomize** charts that deploy this product. **This app repository** holds application source, **CI** ([DEVOPS.md](DEVOPS.md)), and **example** manifests under `infra/k8s/` as a starting point to copy or submodule into that infra repo.

## Image tagging (immutable)

- **Production:** deploy by **digest** or by an **immutable tag** that always points to one build (e.g. `1.4.2` or `2026.04.13-abc1234`). Never deploy prod by a floating **`latest`** tag alone.
- **Development:** SHA tags or `dev-<short-sha>` are fine.
- **Link to CI:** the same Git commit that passed [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) should be the one built into the image you promote.

## Rollback (one page)

1. **Identify last good revision:** previous Deployment revision, Helm release revision, or Argo CD sync.
2. **Kubernetes native:** `kubectl rollout undo deployment/<name> -n <namespace>` (or `helm rollback <release> <revision>`).
3. **GitOps (e.g. Argo CD):** sync application to the previous **commit** or **image tag** on the infra repo’s main branch, or use the UI “History → Rollback”.
4. **Database:** rolling back **pods** does not undo migrations. If a migration caused breakage, ship a **forward** migration or restore DB from backup only under your disaster-recovery procedure — document who may authorize that.

## Observability baseline

- **Logs:** aggregate stdout from API and web pods (cluster logging stack or cloud provider).
- **Metrics:** expose HTTP latency and error rates from the ingress or service mesh; alert on elevated 5xx and crash loops.
- **Tracing (optional):** propagate `trace_id` from ingress to Nest if you add OpenTelemetry later.

## Health and readiness

- **Backend:** Nest serves `GET /` as a simple health payload ([`AppController`](../backend/src/app.controller.ts)). Point **liveness** and **readiness** probes at `/` (or add a dedicated `/health` later if you split “up” vs “ready for traffic” after DB checks).
- **Frontend:** Next.js standalone server should expose TCP readiness on port 3000; add an HTTP readiness path if you introduce a lightweight `/api/health` route later.

## Example manifests

See [`infra/k8s/README.md`](../infra/k8s/README.md). Replace image names, namespaces, resource requests/limits, and **Secrets** (create via sealed-secrets, External Secrets, or your cloud secret manager — not committed as plaintext).

## Multi-tenant (FR-05) and production

- Inject **`DATABASE_URL`** (pooled) and **`JWT_SECRET`** per environment; use a **direct** DB URL only for migration Jobs if your provider requires it.
- **`FRONTEND_ORIGIN`** on the API must match the browser origin used for cookies (see auth hardening notes in the main README).
