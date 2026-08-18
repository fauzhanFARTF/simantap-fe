# syntax=docker/dockerfile:1

# ── Tahap 1: build ────────────────────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Tahap 2: runtime -- nginx statis, tidak butuh Node sama sekali ─────────
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Jalan penuh sebagai user non-root "nginx" -- image dasar sudah menetapkan
# `pid /run/nginx.pid;` dan `user nginx;` sendiri di nginx.conf-nya; yang
# kurang cuma izin tulis ke lokasi runtime itu untuk user tersebut.
RUN mkdir -p /uploads && \
    chown -R nginx:nginx /usr/share/nginx/html /uploads \
        /var/cache/nginx /etc/nginx/conf.d /run
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
