# ── ExecUI Backend ────────────────────────────────────────────────────────────
# Node 20 slim with native build tools required by bcrypt
FROM node:20-slim

#Install OpenSSL IMMEDIATELY
RUN apt-get update && apt-get install -y openssl libssl-dev

WORKDIR /app

# ── Install dependencies ───────────────────────────────────────────────────────
# Copy manifests first so layer is cached unless deps change
COPY package*.json ./
RUN npm ci

# ── Prisma: generate client from schema ───────────────────────────────────────
# prisma CLI lives in devDependencies, so it is available here.
# The generated client is bundled into node_modules/@prisma/client.
COPY prisma ./prisma/
RUN npx prisma generate

# ── Application source ────────────────────────────────────────────────────────
COPY src ./src/

# ── Runtime ───────────────────────────────────────────────────────────────────
EXPOSE 5555

# Run schema migrations against the live DB then start the API server.
# Use the locally-installed prisma binary so no network access is needed.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node src/server.js"]
