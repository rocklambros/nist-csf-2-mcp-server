/**
 * Security logging middleware for MCP server
 * Implements structured logging with sensitive data protection
 */

import * as crypto from 'crypto';
import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

interface SecurityLogEntry {
  timestamp: string;
  event: string;
  level: 'info' | 'warn' | 'error' | 'critical';
  client_id?: string;
  user_id?: string;
  tool?: string;
  method?: string;
  path?: string;
  ip?: string;
  user_agent?: string;
  params_hash?: string;
  success?: boolean;
  duration_ms?: number;
  error?: string;
  error_code?: string;
  response_code?: number;
  request_id?: string;
  session_id?: string;
  threat_indicators?: string[];
}

export class SecurityLogger {
  private logger: winston.Logger;
  private sensitiveParams: Set<string>;
  private threatPatterns: RegExp[];
  
  constructor() {
    // Configure sensitive parameter names to redact
    this.sensitiveParams = new Set([
      'password',
      'token',
      'secret',
      'key',
      'api_key',
      'apikey',
      'authorization',
      'auth',
      'credential',
      'private',
      'ssn',
      'credit_card',
      'cvv',
      'pin'
    ]);
    
    // Configure threat patterns to detect
    this.threatPatterns = [
      /(\.\.|\/\.\.\/)/gi, // Path traversal
      /(<script|javascript:|onerror=)/gi, // XSS attempts
      /('|(--)|;|\bUNION\b|\bSELECT\b|\bDROP\b)/gi, // SQL injection
      /([;&|`$]|\bexec\b|\beval\b)/gi, // Command injection
      /(\\x[0-9a-f]{2}|%[0-9a-f]{2})/gi, // Encoded attacks
    ];
    
    // Initialize Winston logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'mcp-server' },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        // File transport for production
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/security.log',
          maxsize: 10485760, // 10MB
          maxFiles: 10
        })
      ]
    });
  }
  
  /**
   * Sanitize parameters by removing sensitive values
   */
  private sanitizeParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params || {})) {
      const lowerKey = key.toLowerCase();
      
      // Check if parameter name indicates sensitive data
      let isSensitive = false;
      for (const sensitive of this.sensitiveParams) {
        if (lowerKey.includes(sensitive)) {
          isSensitive = true;
          break;
        }
      }
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeParams(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Generate hash of parameters for tracking without exposing data
   */
  private hashParams(params: Record<string, any>): string {
    const sanitized = this.sanitizeParams(params);
    const jsonString = JSON.stringify(sanitized);
    return crypto.createHash('sha256').update(jsonString).digest('hex').substring(0, 16);
  }
  
  /**
   * Detect potential security threats in parameters
   */
  private detectThreats(params: Record<string, any>): string[] {
    const threats: string[] = [];
    const paramsString = JSON.stringify(params);
    
    for (const pattern of this.threatPatterns) {
      if (pattern.test(paramsString)) {
        threats.push(pattern.source);
      }
    }
    
    return threats;
  }
  
  /**
   * Log security event
   */
  public logSecurityEvent(entry: SecurityLogEntry): void {
    // Determine log level based on event type
    const level = entry.level || 'info';
    
    // Add threat detection if applicable
    if (entry.threat_indicators && entry.threat_indicators.length > 0) {
      entry.level = 'warn';
    }
    
    // Log based on level
    switch (level) {
      case 'critical':
        this.logger.error(entry);
        // Also trigger alerts for critical events
        this.triggerAlert(entry);
        break;
      case 'error':
        this.logger.error(entry);
        break;
      case 'warn':
        this.logger.warn(entry);
        break;
      default:
        this.logger.info(entry);
    }
  }
  
  /**
   * Log tool call
   */
  public logToolCall(context: {
    client_id?: string;
    tool_name: string;
    params: Record<string, any>;
    success: boolean;
    duration_ms?: number;
    error?: string;
  }): void {
    const threats = this.detectThreats(context.params);
    
    const entry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      event: 'mcp_tool_call',
      level: context.success ? 'info' : 'error',
      client_id: context.client_id,
      tool: context.tool_name,
      params_hash: this.hashParams(context.params),
      success: context.success,
      duration_ms: context.duration_ms,
      error: context.error,
      threat_indicators: threats.length > 0 ? threats : undefined
    };
    
    this.logSecurityEvent(entry);
  }
  
  /**
   * Log authentication event
   */
  public logAuthEvent(context: {
    client_id?: string;
    success: boolean;
    reason?: string;
    ip?: string;
  }): void {
    const entry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      event: 'authentication',
      level: context.success ? 'info' : 'warn',
      client_id: context.client_id,
      success: context.success,
      error: context.reason,
      ip: context.ip
    };
    
    this.logSecurityEvent(entry);
  }
  
  /**
   * Log rate limit event
   */
  public logRateLimitEvent(context: {
    client_id: string;
    tool_name: string;
    ip?: string;
  }): void {
    const entry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      event: 'rate_limit_exceeded',
      level: 'warn',
      client_id: context.client_id,
      tool: context.tool_name,
      ip: context.ip
    };
    
    this.logSecurityEvent(entry);
  }
  
  /**
   * Log validation failure
   */
  public logValidationFailure(context: {
    client_id?: string;
    tool_name: string;
    validation_error: string;
    params?: Record<string, any>;
  }): void {
    const threats = context.params ? this.detectThreats(context.params) : [];
    
    const entry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      event: 'validation_failure',
      level: threats.length > 0 ? 'warn' : 'info',
      client_id: context.client_id,
      tool: context.tool_name,
      error: context.validation_error,
      params_hash: context.params ? this.hashParams(context.params) : undefined,
      threat_indicators: threats.length > 0 ? threats : undefined
    };
    
    this.logSecurityEvent(entry);
  }
  
  /**
   * Trigger alert for critical events
   */
  private triggerAlert(entry: SecurityLogEntry): void {
    // In production, this would send alerts to monitoring systems
    console.error('CRITICAL SECURITY EVENT:', entry);
    
    // Could integrate with:
    // - Email alerts
    // - Slack/Teams notifications
    // - PagerDuty
    // - SIEM systems
  }
  
  /**
   * Express middleware for request/response logging
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = crypto.randomBytes(16).toString('hex');
      
      // Attach request ID for correlation
      (req as any).requestId = requestId;
      
      // Log request
      const requestEntry: SecurityLogEntry = {
        timestamp: new Date().toISOString(),
        event: 'http_request',
        level: 'info',
        request_id: requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
        client_id: (req as any).auth?.client_id,
        params_hash: req.body ? this.hashParams(req.body) : undefined
      };
      
      // Check for threats in request
      const threats = req.body ? this.detectThreats(req.body) : [];
      if (threats.length > 0) {
        requestEntry.threat_indicators = threats;
        requestEntry.level = 'warn';
      }
      
      this.logSecurityEvent(requestEntry);
      
      // Capture response
      const originalSend = res.send;
      res.send = function(data: any) {
        const duration = Date.now() - startTime;
        
        // Log response
        const responseEntry: SecurityLogEntry = {
          timestamp: new Date().toISOString(),
          event: 'http_response',
          level: res.statusCode >= 400 ? 'error' : 'info',
          request_id: requestId,
          response_code: res.statusCode,
          duration_ms: duration,
          client_id: (req as any).auth?.client_id
        };
        
        securityLogger.logSecurityEvent(responseEntry);
        
        return originalSend.call(this, data);
      };
      
      next();
    };
  }
  
  /**
   * Get recent security events
   */
  public async getRecentEvents(_minutes: number = 60): Promise<SecurityLogEntry[]> {
    // This would query the log storage in production
    // For now, return empty array as placeholder
    return [];
  }
  
  /**
   * Get security metrics
   */
  public async getSecurityMetrics(): Promise<{
    total_requests: number;
    failed_auth: number;
    rate_limits: number;
    validation_failures: number;
    threats_detected: number;
  }> {
    // This would aggregate metrics from logs in production
    return {
      total_requests: 0,
      failed_auth: 0,
      rate_limits: 0,
      validation_failures: 0,
      threats_detected: 0
    };
  }
}

// Export singleton instance
export const securityLogger = new SecurityLogger();