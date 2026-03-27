FROM node:18-alpine

WORKDIR /app

# Cache bust - force rebuild on every deploy
ARG CACHE_BUST=1

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend code
COPY backend/ .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "app.js"]
