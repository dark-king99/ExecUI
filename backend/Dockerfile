# ── ExecUI Backend ────────────────────────────────────────────────────────────
# Node 22 (matches development) + native build tools required by bcrypt.
FROM node:22-bookworm-slim

# OpenSSL for the Prisma engines; python3/make/g++ in case bcrypt must compile.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────────────────
# Copy manifests first so the layer is cached unless deps change.
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# ── Prisma: generate client from schema ───────────────────────────────────────
# prisma CLI lives in devDependencies, so it is available here AND at runtime
# (the server also applies pending migrations on boot).
COPY prisma ./prisma/
RUN ./node_modules/.bin/prisma generate

# ── Application source ────────────────────────────────────────────────────────
COPY src ./src/

# ── Runtime ───────────────────────────────────────────────────────────────────
ENV NODE_ENV=production \
    PORT=5555 \
    STORAGE_DIR=/data/uploads

# Uploaded files (avatars, attachments) live OUTSIDE the image — mount a
# volume at /data/uploads or they vanish on every deploy.
RUN mkdir -p /data/uploads && chown -R node:node /app /data
USER node

EXPOSE 5555

# /health verifies the database too — healthy container == serving app.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5555)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Apply schema migrations against the live DB, then start the API.
# Uses the locally-installed prisma binary — no network access needed.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node src/server.js"]
