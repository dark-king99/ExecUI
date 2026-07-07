# ─────────────────────────────────────────────────────────────────────────────
# ExecUI — production image (API + built SPA in one container)
#
# The backend serves the compiled frontend from ../frontend/dist (see
# backend/src/app.js), so a single image runs the whole app:
#   /app/backend        Express API (port 5555)
#   /app/frontend/dist  compiled SPA, served with an /api-aware SPA fallback
#
# Migrations apply themselves on boot (server runs `prisma migrate deploy`),
# so a fresh database only needs DATABASE_URL to point at it.
#
#   docker build -t execui:latest .
#   docker run -p 5555:5555 --env-file backend/.env \
#     -v execui-uploads:/data/uploads execui:latest
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build the SPA ───────────────────────────────────────────────────
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ .
# Same-origin serving → the SPA calls /api on its own host.
ENV VITE_API_BASE_URL=/api
RUN npm run build

# ── Stage 2: backend dependencies + Prisma client ────────────────────────────
FROM node:22-bookworm-slim AS backend-deps
# openssl for Prisma engines; build tools in case bcrypt has to compile.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/package*.json ./
# Full install on purpose: the prisma CLI (a devDependency) is used at boot
# for `prisma migrate deploy`, so it ships in the runtime image.
RUN npm ci --no-audit --no-fund
COPY backend/prisma ./prisma
RUN ./node_modules/.bin/prisma generate

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=5555 \
    STORAGE_DIR=/data/uploads

WORKDIR /app
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
COPY --from=frontend-build /build/dist ./frontend/dist

# Uploaded files live outside the image — mount a volume at /data/uploads.
RUN mkdir -p /data/uploads \
    && chown -R node:node /app /data
USER node

WORKDIR /app/backend
EXPOSE 5555

# /health verifies the database too, so a healthy container == a serving app.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5555)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
