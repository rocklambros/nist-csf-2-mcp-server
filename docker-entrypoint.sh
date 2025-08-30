#!/bin/sh

# Docker entrypoint script for NIST CSF MCP Server
# Handles signal forwarding and cleanup

set -e

# Set default environment variables
export NODE_ENV="${NODE_ENV:-production}"
export LOG_LEVEL="${LOG_LEVEL:-info}"

# Enable graceful shutdown handling
export FORCE_TERMINATE="${FORCE_TERMINATE:-false}"

# Function to handle shutdown
cleanup() {
    echo "Docker container received shutdown signal, cleaning up..." >&2
    # The Node.js process handles its own cleanup via signal handlers
    exit 0
}

# Trap signals and forward them appropriately
trap cleanup SIGTERM SIGINT SIGQUIT

# Start the MCP server
echo "Starting NIST CSF 2.0 MCP Server in Docker container..." >&2
exec node dist/index.js "$@"