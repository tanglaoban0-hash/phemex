FROM node:18-alpine

WORKDIR /app

# Copy package files from backend
COPY backend/package*.json ./
RUN npm install

# Copy backend code
COPY backend/ .

RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "app.js"]
