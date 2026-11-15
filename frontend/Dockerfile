FROM node:22-alpine AS builder

WORKDIR /app

ARG PUBLIC_API_BASE_URL=/api/v1
ARG PUBLIC_EXPERTEDU_STUDIO_URL=
ARG PUBLIC_SITE_URL=https://expertedu.bo

ENV PUBLIC_API_BASE_URL=$PUBLIC_API_BASE_URL \
    PUBLIC_EXPERTEDU_STUDIO_URL=$PUBLIC_EXPERTEDU_STUDIO_URL \
    PUBLIC_SITE_URL=$PUBLIC_SITE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.static.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ > /dev/null || exit 1
