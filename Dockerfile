# Multi-stage Dockerfile for Node.js applications
# Optimizes for production with smaller image size and security best practices

# ================================
# Stage 1: Dependencies
# Installs production dependencies
# ================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files for caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# ================================
# Stage 2: Builder
# Builds the application
# ================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies, including devDependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ================================
# Stage 3: Runner
# Runs the application in production
# ================================
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy necessary files from previous stages
COPY --from=deps --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/.next ./.next
COPY --from=builder --chown=appuser:nodejs /app/public ./public
COPY --from=builder --chown=appuser:nodejs /app/package*.json ./

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 3000

# Health check endpoint.  Assumes /api/health returns 200 OK on success.
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]