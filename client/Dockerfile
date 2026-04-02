FROM node:20-alpine AS builder
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

# The dist/ output is the only artifact needed
FROM scratch
COPY --from=builder /app/client/dist /dist
