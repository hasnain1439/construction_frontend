# syntax=docker/dockerfile:1.7
#
# Construction Platform Web — production image (Next.js standalone output).
#
#   docker build -t construction-web \
#     --build-arg API_ORIGIN=http://api:4000 \
#     --build-arg API_PUBLIC_URL=https://api.example.pk .
#   docker run -p 3000:3000 construction-web
#
# Next.js bakes these into the build, so they are BUILD ARGS, not runtime env:
#   API_ORIGIN            where /api/v1/* is proxied (rewrites)       — in docker compose: http://api:4000
#   API_PUBLIC_URL        public API origin allowed in the CSP (signed file links)
#   NEXT_PUBLIC_*         browser code (app version, Sentry DSN, PostHog key / host)
# One image per environment (staging / production). Runtime env: only SENTRY_DSN (server-side override).
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false
RUN apk add --no-cache libc6-compat

# ─── deps ────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ─── build ───────────────────────────────────────────────────────────────────
FROM base AS build
ARG API_ORIGIN=http://api:4000
ARG API_PUBLIC_URL=
ARG NEXT_PUBLIC_APP_VERSION=1.0.0
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT=
ARG NEXT_PUBLIC_SENTRY_RELEASE=
ARG NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=
ARG NEXT_PUBLIC_POSTHOG_KEY=
ARG NEXT_PUBLIC_POSTHOG_HOST=
ARG SENTRY_ORG=
ARG SENTRY_PROJECT=
ENV NODE_ENV=production \
    API_ORIGIN=${API_ORIGIN} \
    API_PUBLIC_URL=${API_PUBLIC_URL} \
    NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION} \
    NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN} \
    NEXT_PUBLIC_SENTRY_ENVIRONMENT=${NEXT_PUBLIC_SENTRY_ENVIRONMENT} \
    NEXT_PUBLIC_SENTRY_RELEASE=${NEXT_PUBLIC_SENTRY_RELEASE} \
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=${NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE} \
    NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY} \
    NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST} \
    SENTRY_ORG=${SENTRY_ORG} \
    SENTRY_PROJECT=${SENTRY_PROJECT}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# SENTRY_AUTH_TOKEN (source-map upload) comes in as a BuildKit secret so it never lands in a layer:
#   docker build --secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN …
RUN --mount=type=secret,id=sentry_auth_token \
    if [ -s /run/secrets/sentry_auth_token ]; then export SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)"; fi \
    && npm run build \
    && mkdir -p public

# ─── runtime ─────────────────────────────────────────────────────────────────
FROM base AS runtime
ARG GIT_SHA=dev
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
LABEL org.opencontainers.image.title="construction-web" \
      org.opencontainers.image.revision="${GIT_SHA}"
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
