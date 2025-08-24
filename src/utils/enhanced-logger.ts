/**
 * Enhanced structured logger with correlation IDs and JSON output
 */

import winston from 'winston';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import { AsyncLocalStorage } from 'async_hooks';

// Extended log levels
const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

// Colors for console output
const colors = {
  fatal: 'red bold',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  trace: 'gray',
};

winston.addColors(colors);

// Context storage for correlation IDs
const asyncLocalStorage = new AsyncLocalStorage();

// Custom metadata interface
interface LogMetadata {
  correlationId?: string;
  userId?: string;
  toolName?: string;
  profileId?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  query?: string;
  [key: string]: any;
}

// System metadata
const systemMetadata = {
  hostname: os.hostname(),
  pid: process.pid,
  nodeVersion: process.version,
  platform: process.platform,
  environment: process.env.NODE_ENV || 'development',
};

/**
 * Enhanced JSON format with structured fields
 */
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const context = asyncLocalStorage.getStore() as any || {};
    
    const logEntry = {
      correlationId: info.correlationId || context.correlationId || 'system',
      service: 'nist-csf-mcp-server',
      ...systemMetadata,
      ...info,
    };
    
    // Remove duplicate fields that will be explicitly included
    const { level: __, message: ___, ...otherFields } = logEntry;
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: info.level,
      message: info.message,
      ...otherFields
    });
  })
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const context = asyncLocalStorage.getStore() as any || {};
    const corrId = correlationId || context.correlationId || 'system';
    
    let msg = `${timestamp} [${level}] [${corrId.substring(0, 8)}]: ${message}`;
    
    // Add important metadata
    if (meta.duration) msg += ` (${meta.duration}ms)`;
    if (meta.statusCode) msg += ` [${meta.statusCode}]`;
    if (meta.errorCode) msg += ` [ERR:${meta.errorCode}]`;
    
    // Add remaining metadata if in debug mode
    if (process.env.LOG_LEVEL === 'debug' || process.env.LOG_LEVEL === 'trace') {
      const { duration, statusCode, errorCode, ...rest } = meta;
      if (Object.keys(rest).length > 0) {
        msg += `\n  ${JSON.stringify(rest, null, 2)}`;
      }
    }
    
    return msg;
  })
);

/**
 * Create the enhanced logger
 */
class EnhancedLogger {
  private logger: winston.Logger;
  
  constructor() {
    // Determine if we should use JSON or console format
    const useJsonFormat = process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production';
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      levels,
      defaultMeta: systemMetadata,
      transports: [
        // Console transport
        new winston.transports.Console({
          format: useJsonFormat ? structuredFormat : consoleFormat,
        }),
        // File transport for errors (always JSON)
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs/error.log'),
          level: 'error',
          format: structuredFormat,
          maxsize: 10485760, // 10MB
          maxFiles: 10,
        }),
        // File transport for all logs (always JSON)
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs/app.log'),
          format: structuredFormat,
          maxsize: 20971520, // 20MB
          maxFiles: 20,
        }),
      ],
      exitOnError: false,
    });
    
    // Add metrics log file for performance data
    if (process.env.ENABLE_METRICS_LOG === 'true') {
      this.logger.add(new winston.transports.File({
        filename: path.join(process.cwd(), 'logs/metrics.log'),
        format: structuredFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 10,
      }));
    }
  }
  
  /**
   * Create a child logger with additional context
   */
  child(metadata: LogMetadata): EnhancedLogger {
    const childLogger = new EnhancedLogger();
    childLogger.logger = this.logger.child(metadata);
    return childLogger;
  }
  
  /**
   * Run a function with a correlation ID context
   */
  withCorrelationId<T>(correlationId: string, fn: () => T): T {
    return asyncLocalStorage.run({ correlationId }, fn);
  }
  
  /**
   * Generate a new correlation ID
   */
  generateCorrelationId(): string {
    return uuidv4();
  }
  
  /**
   * Get current correlation ID from context
   */
  getCorrelationId(): string {
    const context = asyncLocalStorage.getStore() as any;
    return context?.correlationId || 'system';
  }
  
  // Logging methods
  fatal(message: string, meta?: LogMetadata): void {
    this.logger.log('fatal', message, meta);
  }
  
  error(message: string, error?: Error | LogMetadata, meta?: LogMetadata): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        ...meta,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    } else {
      this.logger.error(message, { ...error, ...meta });
    }
  }
  
  warn(message: string, meta?: LogMetadata): void {
    this.logger.warn(message, meta);
  }
  
  info(message: string, meta?: LogMetadata): void {
    this.logger.info(message, meta);
  }
  
  debug(message: string, meta?: LogMetadata): void {
    this.logger.debug(message, meta);
  }
  
  trace(message: string, meta?: LogMetadata): void {
    this.logger.log('trace', message, meta);
  }
  
  /**
   * Log HTTP request
   */
  logRequest(req: any, meta?: LogMetadata): void {
    this.info('HTTP Request', {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      ...meta,
    });
  }
  
  /**
   * Log HTTP response
   */
  logResponse(req: any, res: any, duration: number, meta?: LogMetadata): void {
    const level = res.statusCode >= 400 ? 'error' : 'info';
    this.logger.log(level, 'HTTP Response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ...meta,
    });
  }
  
  /**
   * Log database query
   */
  logQuery(query: string, duration: number, success: boolean, meta?: LogMetadata): void {
    const level = success ? 'debug' : 'error';
    this.logger.log(level, 'Database Query', {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      success,
      ...meta,
    });
  }
  
  /**
   * Log tool execution
   */
  logToolExecution(toolName: string, duration: number, success: boolean, meta?: LogMetadata): void {
    const level = success ? 'info' : 'error';
    this.logger.log(level, 'Tool Execution', {
      toolName,
      duration,
      success,
      ...meta,
    });
  }
  
  /**
   * Log metric
   */
  logMetric(metricName: string, value: number, unit: string, meta?: LogMetadata): void {
    this.info('Metric', {
      metricName,
      value,
      unit,
      type: 'metric',
      ...meta,
    });
  }
  
  /**
   * Create a timer for measuring duration
   */
  startTimer(): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1000000; // Convert to milliseconds
    };
  }
}

// Create singleton instance
export const logger = new EnhancedLogger();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled Rejection', {
    promise: String(promise),
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
  });
  process.exit(1);
});

export default logger;