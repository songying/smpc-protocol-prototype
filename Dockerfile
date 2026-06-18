# Multi-stage Dockerfile for SMPC Protocol Platform
# Supports both development and production environments

# Build stage for dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development build stage
FROM node:18-alpine AS dev-deps
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    git \
    bash

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci && npm cache clean --force

# Build stage for the application
FROM node:18-alpine AS builder
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    git

# Copy dependencies from dev-deps stage
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Create necessary directories
RUN mkdir -p deployments data

# Set environment to enable build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Compile smart contracts first
RUN npm run contracts:compile

# Build Next.js application
RUN npm run build

# Development stage
FROM node:18-alpine AS development
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    git \
    bash \
    curl \
    jq

# Create app user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy dependencies and source code
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p deployments data logs && \
    chown -R nextjs:nodejs /app

# Copy health check script
COPY scripts/health-check.sh /usr/local/bin/health-check.sh
RUN chmod +x /usr/local/bin/health-check.sh

# Expose ports
EXPOSE 3000 8545

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD /usr/local/bin/health-check.sh

# Switch to non-root user
USER nextjs

# Set environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Default command for development
CMD ["npm", "run", "dev"]

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install system dependencies. python3 + gmpy2 power the MP-SPDZ external client
# (scripts/mpspdz-client.py) that secret-shares inputs to the compute parties.
# gmpy2 isn't packaged for alpine, so build it via pip with deps removed after.
RUN apk add --no-cache \
    libc6-compat \
    dumb-init \
    curl \
    jq \
    python3 \
    py3-pip \
    gmp mpfr4 mpc1 \
 && apk add --no-cache --virtual .gmpy2-build gcc musl-dev python3-dev gmp-dev mpfr-dev mpc1-dev \
 && pip3 install --break-system-packages --no-cache-dir gmpy2 \
 && apk del .gmpy2-build

# Create app user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/contracts ./contracts
COPY --from=builder --chown=nextjs:nodejs /app/circuits ./circuits
COPY --from=builder --chown=nextjs:nodejs /app/artifacts ./artifacts
COPY --from=builder --chown=nextjs:nodejs /app/deployments ./deployments
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/hardhat.config.cjs ./hardhat.config.cjs
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Create directories and set permissions
RUN mkdir -p logs && \
    chown -R nextjs:nodejs /app

# Copy health check script
COPY scripts/health-check.sh /usr/local/bin/health-check.sh
RUN chmod +x /usr/local/bin/health-check.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD /usr/local/bin/health-check.sh

# Switch to non-root user
USER nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command for production
CMD ["node", "server.js"]

# Default stage (can be overridden with --target)
FROM development AS final