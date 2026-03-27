FROM node:18-alpine

WORKDIR /app

# Cache bust - force rebuild
ARG CACHE_BUST=5
ARG BUILD_DATE=2026-03-27

# Copy package files from backend
COPY backend/package*.json ./
RUN npm install

# Copy backend code
COPY backend/ .

RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "app.js"]
