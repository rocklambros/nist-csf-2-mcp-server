/**
 * Rate limiting middleware for MCP server
 * Implements configurable rate limits per tool and per client
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  requests: number;
  window: number; // in seconds
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitConfig>;
  private requests: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    this.requests = new Map();
    this.limits = new Map();
    
    // Configure default limits
    this.setDefaultLimits();
    
    // Start cleanup interval to remove old entries
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
  }
  
  /**
   * Set default rate limits for different tool categories
   */
  private setDefaultLimits(): void {
    // Default limits per tool category
    this.limits.set('default', { requests: 100, window: 60 });
    this.limits.set('file_read', { requests: 50, window: 60 });
    this.limits.set('database_query', { requests: 30, window: 60 });
    this.limits.set('execute_code', { requests: 5, window: 300 });
    this.limits.set('import_data', { requests: 10, window: 60 });
    this.limits.set('export_data', { requests: 20, window: 60 });
    this.limits.set('generate_report', { requests: 15, window: 60 });
    this.limits.set('create_assessment', { requests: 30, window: 60 });
    this.limits.set('update_assessment', { requests: 50, window: 60 });
    this.limits.set('validate_evidence', { requests: 20, window: 60 });
    this.limits.set('generate_policy', { requests: 10, window: 60 });
    this.limits.set('generate_template', { requests: 15, window: 60 });
    this.limits.set('generate_test', { requests: 10, window: 60 });
  }
  
  /**
   * Update rate limit for a specific tool
   */
  public setLimit(toolName: string, config: RateLimitConfig): void {
    this.limits.set(toolName, config);
  }
  
  /**
   * Get rate limit configuration for a tool
   */
  private getLimit(toolName: string): RateLimitConfig {
    return this.limits.get(toolName) || this.limits.get('default')!;
  }
  
  /**
   * Generate a unique key for rate limiting
   */
  private getKey(clientId: string, toolName: string): string {
    return `${clientId}:${toolName}`;
  }
  
  /**
   * Check if request should be rate limited
   */
  public checkRateLimit(clientId: string, toolName: string): boolean {
    const key = this.getKey(clientId, toolName);
    const limit = this.getLimit(toolName);
    const now = Date.now();
    
    const entry = this.requests.get(key);
    
    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + (limit.window * 1000)
      });
      return true;
    }
    
    // Check if limit exceeded
    if (entry.count >= limit.requests) {
      return false;
    }
    
    // Increment counter
    entry.count++;
    return true;
  }
  
  /**
   * Get remaining requests for a client and tool
   */
  public getRemainingRequests(clientId: string, toolName: string): number {
    const key = this.getKey(clientId, toolName);
    const limit = this.getLimit(toolName);
    const entry = this.requests.get(key);
    
    if (!entry || Date.now() > entry.resetTime) {
      return limit.requests;
    }
    
    return Math.max(0, limit.requests - entry.count);
  }
  
  /**
   * Get reset time for rate limit
   */
  public getResetTime(clientId: string, toolName: string): number {
    const key = this.getKey(clientId, toolName);
    const entry = this.requests.get(key);
    
    if (!entry) {
      return Date.now();
    }
    
    return entry.resetTime;
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.requests.forEach((entry, key) => {
      if (now > entry.resetTime) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.requests.delete(key));
  }
  
  /**
   * Express middleware for rate limiting
   */
  public middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Extract client ID from auth token or IP
        const clientId = (req as any).auth?.client_id || 
                        (req as any).auth?.sub || 
                        req.ip || 
                        'anonymous';
        
        // Extract tool name from request
        const toolName = req.body?.tool || 
                        req.params?.tool || 
                        req.path.split('/').pop() || 
                        'default';
        
        // Check rate limit
        if (!this.checkRateLimit(clientId, toolName)) {
          const resetTime = this.getResetTime(clientId, toolName);
          const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
          
          res.setHeader('X-RateLimit-Limit', this.getLimit(toolName).requests.toString());
          res.setHeader('X-RateLimit-Remaining', '0');
          res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
          res.setHeader('Retry-After', retryAfter.toString());
          
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded for tool: ${toolName}`,
            retry_after: retryAfter
          });
        }
        
        // Add rate limit headers
        const remaining = this.getRemainingRequests(clientId, toolName);
        const resetTime = this.getResetTime(clientId, toolName);
        
        res.setHeader('X-RateLimit-Limit', this.getLimit(toolName).requests.toString());
        res.setHeader('X-RateLimit-Remaining', remaining.toString());
        res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
        
        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        next(); // Don't block on rate limiting errors
      }
    };
  }
  
  /**
   * Destroy the rate limiter and clean up
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

/**
 * Advanced rate limiting with sliding window and distributed support
 */
export class AdvancedRateLimiter extends RateLimiter {
  private slidingWindows: Map<string, number[]>;
  
  constructor() {
    super();
    this.slidingWindows = new Map();
  }
  
  /**
   * Check rate limit using sliding window algorithm
   */
  public checkRateLimitSlidingWindow(clientId: string, toolName: string): boolean {
    const key = this.getKey(clientId, toolName);
    const limit = this.getLimit(toolName);
    const now = Date.now();
    const windowStart = now - (limit.window * 1000);
    
    // Get or create sliding window
    let timestamps = this.slidingWindows.get(key) || [];
    
    // Remove old timestamps outside the window
    timestamps = timestamps.filter(ts => ts > windowStart);
    
    // Check if limit exceeded
    if (timestamps.length >= limit.requests) {
      this.slidingWindows.set(key, timestamps);
      return false;
    }
    
    // Add current timestamp
    timestamps.push(now);
    this.slidingWindows.set(key, timestamps);
    
    return true;
  }
  
  /**
   * Get precise remaining requests using sliding window
   */
  public getPreciseRemainingRequests(clientId: string, toolName: string): number {
    const key = this.getKey(clientId, toolName);
    const limit = this.getLimit(toolName);
    const now = Date.now();
    const windowStart = now - (limit.window * 1000);
    
    const timestamps = this.slidingWindows.get(key) || [];
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    
    return Math.max(0, limit.requests - validTimestamps.length);
  }
}

// Export singleton instance
export const rateLimiter = new AdvancedRateLimiter();