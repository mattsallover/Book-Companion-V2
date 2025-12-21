# Multi-stage build for Book Companion

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Setup backend
FROM node:20-alpine
WORKDIR /app

# Copy root package.json (needed for start:backend script)
COPY package.json ./

# Install backend dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --only=production

# Copy backend source
COPY backend/ ./

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Return to root directory
WORKDIR /app

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start the server using the script from root package.json
CMD ["npm", "run", "start:backend"]
