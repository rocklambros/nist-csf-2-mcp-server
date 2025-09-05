# NIST CSF 2.0 MCP Server - Stable Release
FROM node:20-alpine

# Install dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite

# Create non-root user
RUN addgroup -g 1001 -S mcp && adduser -S mcp -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy application files
COPY src/ ./src/
COPY data/ ./data/
COPY scripts/ ./scripts/

# Build TypeScript
RUN npm run build

# Initialize database
RUN npm run import:csf-framework

# Remove development files and prune to production dependencies
RUN rm -rf src/ scripts/ tsconfig*.json && npm prune --production

# Change ownership to non-root user
RUN chown -R mcp:mcp /app

# Switch to non-root user
USER mcp

# Expose port for HTTP mode (optional)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "try { require('fs').accessSync('/app/dist/index.js'); process.exit(0); } catch { process.exit(1); }"

# Start MCP server
CMD ["node", "dist/index.js"]