# syntax=docker/dockerfile:1.7
#
# Super admin dashboard image (build context: this folder), used by docker-compose.yml:
# Vite builds the site, then Nginx serves it and forwards /api to the backend.

# ─── Build ────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
# Empty: the dashboard calls /api on its own address; Nginx (below) forwards it to the backend.
ENV VITE_API_BASE_URL=
RUN npm run build

# ─── Serve ────────────────────────────────────────────────────────────────────
FROM nginx:stable-alpine AS runtime
# The backend API on the shared Docker network, and the largest upload accepted.
ENV API_UPSTREAM=http://edu-api:6003 \
    MAX_UPLOAD_SIZE=210m
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/nginx-health || exit 1
