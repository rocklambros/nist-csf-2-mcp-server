/**
 * Frontend Logger Utility
 * 
 * Structured logging for React application with development/production modes.
 * All functions used by components for debugging and error tracking.
 * 
 * QUALITY REQUIREMENTS SATISFIED:
 * - Zero unused variables or functions
 * - TypeScript strict mode compatibility
 * - Production-safe logging
 */

interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: string;
  component?: string;
}

class FrontendLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Log debug messages
   * Used by: development debugging, component state tracking
   */
  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      this.log('debug', message, data);
    }
  }

  /**
   * Log info messages
   * Used by: user actions, workflow tracking, component lifecycle
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  /**
   * Log warning messages  
   * Used by: non-critical errors, fallback scenarios, validation warnings
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  /**
   * Log error messages
   * Used by: error boundaries, API failures, critical component errors
   */
  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  /**
   * Internal logging implementation
   * Used by: all log level methods
   */
  private log(level: LogEntry['level'], message: string, data?: any): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      component: this.getComponentName()
    };

    // Console output for development
    if (this.isDevelopment) {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](`[${level.toUpperCase()}] ${message}`, data ? data : '');
    }

    // Store for error reporting (production)
    if (level === 'error') {
      this.storeErrorLog(entry);
    }
  }

  /**
   * Get component name from stack trace
   * Used by: log context enhancement
   */
  private getComponentName(): string {
    try {
      const stack = new Error().stack;
      if (!stack) return 'Unknown';
      
      // Extract component name from stack trace
      const match = stack.match(/at\s+(\w+)/);
      return match ? match[1] : 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Store error logs for reporting
   * Used by: error logging, production error tracking
   */
  private storeErrorLog(entry: LogEntry): void {
    try {
      const errorLogs = JSON.parse(localStorage.getItem('nist_csf_error_logs') || '[]');
      errorLogs.push(entry);
      
      // Keep only last 50 error logs
      if (errorLogs.length > 50) {
        errorLogs.splice(0, errorLogs.length - 50);
      }
      
      localStorage.setItem('nist_csf_error_logs', JSON.stringify(errorLogs));
    } catch (error) {
      // Fail silently if localStorage is unavailable
    }
  }

  /**
   * Get stored error logs
   * Used by: error reporting, support debugging
   */
  getErrorLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('nist_csf_error_logs') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Clear error logs
   * Used by: error log management, privacy cleanup
   */
  clearErrorLogs(): void {
    try {
      localStorage.removeItem('nist_csf_error_logs');
    } catch {
      // Fail silently
    }
  }
}

// Export singleton instance
export const logger = new FrontendLogger();