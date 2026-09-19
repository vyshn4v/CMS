# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: Build Workspace
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install native dependencies needed for prisma/openssl compilation
RUN apk add --no-cache libc6-compat openssl

ENV NX_DAEMON=false

# Copy root workspace and package manifests
COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY libs/shared-types/package.json ./libs/shared-types/
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy complete workspace source code
COPY libs ./libs
COPY apps ./apps

# Generate Prisma Client
RUN npx prisma generate

# Build shared-types, web frontend, and backend API
RUN npm run build:shared-types || npx nx build @cms/shared-types
RUN npm run build:web || npx nx build @cms/web
RUN npm run build:api || npx nx build @cms/api

# ==============================================================================
# Stage 2: Production Runner (Lean Alpine Image)
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV STATIC_PATH=/app/apps/web/dist

# Install runtime dependencies (OpenSSL required by Prisma engine)
RUN apk add --no-cache openssl curl

# Create non-root system user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy root package files for production dependency installation
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY libs/shared-types/package.json ./libs/shared-types/
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Generate Prisma Client in production environment
RUN npx prisma generate

# Copy compiled outputs from builder stage
COPY --from=builder /app/libs/shared-types/dist ./libs/shared-types/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/web/dist ./apps/web/dist

# Grant correct file ownership to non-root user
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 5000

# Container Healthcheck verifying the public unauthenticated health endpoint (SEC-14)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Launch NestJS backend with memory budget tuned for Oracle 1GB VPS
CMD ["node", "--max-old-space-size=180", "apps/api/dist/main.js"]
