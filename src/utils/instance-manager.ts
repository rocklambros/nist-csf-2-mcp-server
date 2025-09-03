/**
 * Instance Manager - Prevents multiple MCP server instances and manages clean shutdown
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { logger } from './logger.js';

const LOCK_FILE = path.join(os.tmpdir(), 'nist-csf-mcp-server.lock');

export interface ServerInstance {
  pid: number;
  startTime: string;
  transport: string;
  version: string;
}

/**
 * Check if another instance is already running
 */
export function checkExistingInstance(): ServerInstance | null {
  try {
    if (!fs.existsSync(LOCK_FILE)) {
      return null;
    }

    const lockData = fs.readFileSync(LOCK_FILE, 'utf-8');
    const instance = JSON.parse(lockData) as ServerInstance;

    // Check if the PID is still running
    try {
      // Sending signal 0 checks if process exists without actually sending a signal
      process.kill(instance.pid, 0);
      logger.warn('Existing MCP server instance detected', {
        pid: instance.pid,
        startTime: instance.startTime,
        transport: instance.transport
      });
      return instance;
    } catch (error) {
      // Process doesn't exist, remove stale lock file
      logger.info('Removing stale lock file', { pid: instance.pid });
      fs.unlinkSync(LOCK_FILE);
      return null;
    }
  } catch (error) {
    logger.warn('Failed to check existing instance', { error });
    return null;
  }
}

/**
 * Create a lock file for this instance
 */
export function createLockFile(): void {
  const instance: ServerInstance = {
    pid: process.pid,
    startTime: new Date().toISOString(),
    transport: 'stdio',
    version: '1.0.0'
  };

  try {
    fs.writeFileSync(LOCK_FILE, JSON.stringify(instance, null, 2));
    logger.info('Lock file created', { lockFile: LOCK_FILE, pid: process.pid });
  } catch (error) {
    logger.error('Failed to create lock file', { error, lockFile: LOCK_FILE });
    throw error;
  }
}

/**
 * Remove the lock file for this instance
 */
export function removeLockFile(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
      logger.info('Lock file removed', { lockFile: LOCK_FILE });
    }
  } catch (error) {
    logger.warn('Failed to remove lock file', { error, lockFile: LOCK_FILE });
  }
}

/**
 * Terminate an existing instance gracefully
 */
export function terminateExistingInstance(instance: ServerInstance): boolean {
  try {
    logger.info('Attempting to terminate existing instance', { pid: instance.pid });
    
    // Send SIGTERM first for graceful shutdown
    process.kill(instance.pid, 'SIGTERM');
    
    // Wait up to 5 seconds for graceful shutdown
    const startTime = Date.now();
    while (Date.now() - startTime < 5000) {
      try {
        process.kill(instance.pid, 0);
        // Process still exists, wait a bit more
        execSync('sleep 0.1');
      } catch {
        // Process has terminated
        logger.info('Existing instance terminated gracefully', { pid: instance.pid });
        removeLockFile();
        return true;
      }
    }

    // If still running, force kill
    logger.warn('Force killing existing instance', { pid: instance.pid });
    process.kill(instance.pid, 'SIGKILL');
    removeLockFile();
    return true;
  } catch (error) {
    logger.error('Failed to terminate existing instance', { error, pid: instance.pid });
    return false;
  }
}

/**
 * Setup graceful shutdown handlers
 */
export function setupShutdownHandlers(cleanup: () => Promise<void>): void {
  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, initiating graceful shutdown...`);
    
    try {
      // Call cleanup function
      await cleanup();
      
      // Remove lock file
      removeLockFile();
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      removeLockFile();
      process.exit(1);
    }
  };

  // Handle various termination signals
  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGHUP', () => handleShutdown('SIGHUP'));
  
  // Handle uncaught exceptions and promise rejections
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    removeLockFile();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason, promise });
    removeLockFile();
    process.exit(1);
  });

  // Handle Docker container stop signals
  process.on('SIGQUIT', () => handleShutdown('SIGQUIT'));
  
  logger.info('Shutdown handlers registered');
}

/**
 * Initialize instance management
 */
export function initializeInstanceManager(forceTerminate = false): boolean {
  const existingInstance = checkExistingInstance();
  
  if (existingInstance) {
    if (forceTerminate) {
      logger.info('Force termination requested, attempting to terminate existing instance');
      if (!terminateExistingInstance(existingInstance)) {
        logger.error('Failed to terminate existing instance');
        return false;
      }
    } else {
      logger.error('Another MCP server instance is already running', {
        pid: existingInstance.pid,
        startTime: existingInstance.startTime,
        suggestion: 'Use FORCE_TERMINATE=true environment variable to terminate existing instance'
      });
      return false;
    }
  }

  createLockFile();
  return true;
}