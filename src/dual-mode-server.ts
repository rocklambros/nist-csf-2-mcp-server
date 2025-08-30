#!/usr/bin/env node
/**
 * Dual-Mode Server: MCP + HTTP REST API
 * Runs both MCP server (stdio) and HTTP REST API simultaneously
 */

import { logger } from './utils/logger.js';
import { startHttpServer } from './http-server.js';

async function startDualModeServer(): Promise<void> {
  logger.info('🚀 Starting NIST CSF 2.0 Dual-Mode Server...');
  logger.info('📡 MCP Mode: stdio (for Claude Desktop)');
  logger.info('🌐 HTTP Mode: REST API (for ChatGPT/other integrations)');

  try {
    // Start HTTP server
    const httpPort = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT) : 8080;
    await startHttpServer(httpPort);

    // Import and start MCP server in parallel
    logger.info('📡 Starting MCP server (stdio mode)...');
    await import('./index.js');

    logger.info('✅ Dual-Mode Server fully operational!');
    logger.info(`🌐 HTTP REST API: http://localhost:${httpPort}`);
    logger.info('📡 MCP Protocol: stdio (Claude Desktop ready)');

  } catch (error) {
    logger.error('❌ Failed to start dual-mode server:', error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down dual-mode server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down dual-mode server');
  process.exit(0);
});

// Start dual-mode server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startDualModeServer();
}

export { startDualModeServer };