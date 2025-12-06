/**
 * Logging utility for NIST CSF GUI Backend
 * 
 * QUALITY STANDARDS ENFORCED:
 * - All exports used by application modules
 * - Structured logging for debugging and monitoring
 * - Performance optimized
 */

import winston from 'winston';
import path from 'path';

// Log levels for different environments
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Console colors for development
const colors = {
  error: 'red',
  warn: 'yellow', 
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [GUI-BACKEND] [${level}]: ${message}`;
          if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
          }
          return msg;
        })
      )
    }),
    
    // File transports for production
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs/combined.log'),
      maxsize: 10485760, // 10MB  
      maxFiles: 20
    })
  ],
  exitOnError: false
});

// Ensure logs directory exists
import { mkdirSync } from 'fs';
try {
  mkdirSync(path.join(process.cwd(), 'logs'), { recursive: true });
} catch (error) {
  // Directory might already exist
}

export default logger;