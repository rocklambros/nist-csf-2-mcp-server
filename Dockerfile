# Multi-stage build for security and efficiency
FROM --platform=$TARGETPLATFORM node:20-alpine AS builder

# Build arguments for metadata
ARG BUILDTIME
ARG VERSION
ARG TARGETPLATFORM
ARG BUILDPLATFORM

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

# Initialize database with complete framework data (skip question bank for now)
RUN npm run build && npm run import:csf-framework

# Verify database was built correctly
RUN npm run db:verify

# Remove dev dependencies after database build
RUN npm prune --production && \
    rm -rf src/ scripts/ tsconfig.json

# Final stage - minimal runtime image
FROM node:20-alpine

# Install security updates and build tools for better-sqlite3 native compilation
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    dumb-init \
    python3 make g++ sqlite \
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

# Copy Docker entrypoint script
COPY --chown=mcp-server:mcp-server docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# Rebuild better-sqlite3 for target platform compatibility
USER root
RUN npm rebuild better-sqlite3 && chown -R mcp-server:mcp-server /app

# Set security environment variables and metadata
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MCP_SERVER=true

# Add metadata labels
LABEL org.opencontainers.image.created="${BUILDTIME}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.title="NIST CSF 2.0 MCP Server" \
      org.opencontainers.image.description="Model Context Protocol server for NIST Cybersecurity Framework 2.0" \
      org.opencontainers.image.source="https://github.com/rocklambros/nist-csf-2-mcp-server" \
      org.opencontainers.image.documentation="https://github.com/rocklambros/nist-csf-2-mcp-server/blob/main/README.md" \
      org.opencontainers.image.platform="${TARGETPLATFORM}"

# Switch to non-root user (MANDATORY)
USER mcp-server

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "import http from 'http'; http.get('http://localhost:8080/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Expose port (non-privileged)
EXPOSE 8080

# Use dumb-init to handle signals properly and our custom entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--", "./docker-entrypoint.sh"]

# Default CMD - runs the MCP server
CMD []