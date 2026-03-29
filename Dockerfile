FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY backend/package.json backend/package-lock.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN cd backend && npm install
RUN cd frontend && npm install --include=dev

# Copy source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Build frontend
RUN cd frontend && npm run build

EXPOSE 3000

CMD ["node", "backend/src/index.js"]
