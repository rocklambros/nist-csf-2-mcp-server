# Multi-stage build for security and efficiency
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ sqlite

# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies for build and scripts)
RUN npm ci && \
    npm cache clean --force

# Copy source code and data
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY data/ ./data/

# Build TypeScript
RUN npm run build

# Initialize database with complete framework data
RUN npm run db:init

# Verify database was built correctly
RUN npm run db:verify

# Remove dev dependencies after database build
RUN npm prune --production && \
    rm -rf src/ scripts/ tsconfig.json

# Final stage - minimal runtime image
FROM node:20-alpine

# Install security updates
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user with specific UID/GID
RUN addgroup -g 10001 -S mcp-server && \
    adduser -u 10001 -S -G mcp-server -h /app mcp-server

# Set working directory
WORKDIR /app

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/logs && \
    chown -R mcp-server:mcp-server /app

# Copy built application from builder stage
COPY --from=builder --chown=mcp-server:mcp-server /build/node_modules ./node_modules
COPY --from=builder --chown=mcp-server:mcp-server /build/dist ./dist
COPY --from=builder --chown=mcp-server:mcp-server /build/package*.json ./

# Copy framework data and pre-built database
COPY --from=builder --chown=mcp-server:mcp-server /build/data/ ./data/
COPY --from=builder --chown=mcp-server:mcp-server /build/nist_csf.db ./nist_csf.db

# Set security environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Switch to non-root user (MANDATORY)
USER mcp-server

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Expose port (non-privileged)
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Run with security limits and monitoring
CMD ["node", \
     "--max-http-header-size=8192", \
     "--pending-deprecation", \
     "--trace-warnings", \
     "dist/index.js"]