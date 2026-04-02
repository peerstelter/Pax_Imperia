FROM node:24-alpine AS builder
WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/

RUN npm ci --workspaces

# Copy source
COPY shared/ ./shared/
COPY client/ ./client/

# Build shared types then client
RUN npm run build --workspace=shared
RUN npm run build --workspace=client

# ── Nginx serving stage ───────────────────────────────────────────────────────
FROM nginx:1.25-alpine
COPY --from=builder /app/client/dist /usr/share/nginx/html
# nginx.conf is mounted by docker-compose; this default is a fallback
