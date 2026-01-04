#React

# Build
FROM node:18-alpine AS builder

LABEL maintainer="Hospital Monitoring Team"
LABEL description="React Frontend Builder"

WORKDIR /app

# Copia package files
COPY frontend/package*.json ./

# Installa dipendenze
RUN npm ci --only=production

# Copia codice sorgente
COPY frontend/ .

# Build produzione
RUN npm run build

# Development Server
FROM node:18-alpine AS development

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .

EXPOSE 3000

ENV NODE_ENV=development

CMD ["npm", "start"]

# Nginx Production Server
FROM nginx:alpine AS production

# Copia build da stage builder
COPY --from=builder /app/build /usr/share/nginx/html

# Copia configurazione nginx custom
COPY docker/frontend-dev/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]