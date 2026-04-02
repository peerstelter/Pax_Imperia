FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/

RUN npm ci --workspaces

COPY shared/ ./shared/
COPY server/ ./server/

RUN npm run build --workspace=shared
RUN npm run build --workspace=server

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/

RUN npm ci --workspaces --omit=dev

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist

RUN mkdir -p /data

ENV PORT=3000
ENV DB_PATH=/data/pax_imperia.db

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
