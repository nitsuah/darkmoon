# Multi-stage Dockerfile for Vite + React + Express application
# Optimizes for production with smaller image size and security best practices

# ================================
# Stage 1: Dependencies
# Installs production dependencies
# ================================
FROM node:22-alpine AS deps
RUN apk add --no-cache git
WORKDIR /app

# Copy package files for caching
COPY package*.json ./

RUN npm pkg delete scripts.prepare && npm ci --omit=dev

# ================================
# Stage 2: Builder
# Builds the application
# ================================
FROM node:22-alpine AS builder
RUN apk add --no-cache git
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies, including devDependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Vite application
RUN npm run build

# ================================
# Stage 3: Test
# Runs Vitest unit tests
# ================================
FROM node:22 AS test
RUN apt-get update && apt-get install -y git libnspr4 libnss3 libatk1.0-0 libgtk-3-0 libgbm-dev libcups2 libdrm-dev libxkbcommon0 libxss1 libasound2
WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npx playwright install chromium
COPY . .
RUN mkdir -p /app/node_modules/.vite-temp && chmod -R 775 /app/node_modules/.vite-temp
CMD ["npm", "run", "test:run"]

# ================================
# Stage 4: Dev
# Runs the application in development mode
# ================================
FROM node:22 AS dev
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies, including devDependencies
RUN npm install && apt-get update && apt-get install -y libnspr4 libnss3 libatk1.0-0 libgtk-3-0 libgbm-dev libcups2 libdrm-dev libxkbcommon0 libxss1 libasound2
RUN npx playwright install chromium

# Copy source code
COPY . .

# Ensure .vite-temp is writable for Vitest (dev/CI workaround)
RUN mkdir -p /app/node_modules/.vite-temp && chmod -R 775 /app/node_modules/.vite-temp

# ================================
# Stage 4: Runner
# Runs the application in production
# ================================
FROM node:22-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy necessary files from previous stages
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/server ./server
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 4444

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4444/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Start the Express server directly with Node
CMD ["node", "server/index.js"]
