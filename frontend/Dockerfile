# Production Next.js standalone. Set BACKEND_INTERNAL_URL at build to in-cluster API URL.
# Build from repo: docker build -t thera-care-frontend:local -f frontend/Dockerfile \
#   --build-arg BACKEND_INTERNAL_URL=http://thera-care-backend:4000 frontend

FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS build
ARG BACKEND_INTERNAL_URL=http://thera-care-backend:4000
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
# Monorepo: Next may emit standalone under `.next/standalone/<package>` (see turbopack root warning).
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone/frontend ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
