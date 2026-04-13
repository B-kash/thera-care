# Example Kubernetes manifests (FR-18)

These files are **templates** for a real **infrastructure repository** or cluster admin workflow. **Edit** image names, tags, namespaces, resources, and wire **Secrets** outside git (SealedSecrets, External Secrets Operator, or cloud secret manager).

## Layout

- `base/` — Kustomize base: Deployments + Services for API and web.

## Build images

From the **monorepo root**:

```bash
docker build -t YOUR_REGISTRY/thera-care-backend:YOUR_TAG -f backend/Dockerfile backend
docker build -t YOUR_REGISTRY/thera-care-frontend:YOUR_TAG -f frontend/Dockerfile \
  --build-arg BACKEND_INTERNAL_URL=http://thera-care-backend:4000 frontend
```

The frontend build argument must match the **Kubernetes Service** name and port the browser will reach through the Next rewrite (`/api/*` → backend). In this example the backend Service is `thera-care-backend` on port `4000`.

## Apply

```bash
kubectl apply -k infra/k8s/base
```

Requires a namespace `thera-care` (included) and Secrets **`thera-care-backend-secrets`** / **`thera-care-frontend-secrets`** created out of band (see `*-deployment.yaml`).

## Migrations

Run **`prisma migrate deploy`** as a **Job** before or alongside the new API rollout, using the same image as the API and the **direct** database URL if your host requires it. See [docs/DEVOPS.md](../../docs/DEVOPS.md).
