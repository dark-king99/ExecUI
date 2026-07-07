# ── ExecUI Frontend ───────────────────────────────────────────────────────────

# ── Stage 1: build the Vite / React bundle ────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (cached unless package*.json changes)
COPY package*.json ./
RUN npm ci

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

# Custom nginx config: SPA routing + /api proxy to backend service
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
