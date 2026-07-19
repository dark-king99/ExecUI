# ── ExecUI Frontend ───────────────────────────────────────────────────────────

# ── Stage 1: build the Vite / React bundle ────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install deps first (cached unless package*.json changes)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .

# VITE_API_BASE_URL must be /api so the bundle points at the nginx proxy.
# Pass a different value at build time with --build-arg if needed.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Copy compiled assets from build stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config: SPA routing + /api proxy (incl. SSE) to the backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
