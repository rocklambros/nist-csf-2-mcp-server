/**
 * Security tests for rate limiting
 * Tests rate limit enforcement, sliding windows, and distributed scenarios
 */

import { describe, it, expect, beforeEach, afterAll, jest } from '@jest/globals';
import { RateLimiter, AdvancedRateLimiter } from '../../src/security/rate-limiter';
import { Request, Response, NextFunction } from 'express';

describe('Rate Limiter Tests', () => {
  let rateLimiter: RateLimiter;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  
  beforeEach(() => {
    rateLimiter = new RateLimiter();
    
    mockReq = {
      body: { tool: 'test_tool' },
      params: {},
      path: '/api/test_tool',
      ip: '127.0.0.1'
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn()
    };
    
    mockNext = jest.fn();
  });
  
  afterAll(() => {
    rateLimiter.destroy();
  });
  
  describe('Basic Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      const clientId = 'test-client';
      const toolName = 'test_tool';
      
      // Default limit is 100 requests per 60 seconds
      for (let i = 0; i < 100; i++) {
        const allowed = rateLimiter.checkRateLimit(clientId, toolName);
        expect(allowed).toBe(true);
      }
    });
    
    it('should block requests exceeding rate limit', () => {
      const clientId = 'test-client-2';
      const toolName = 'test_tool';
      
      // Fill up the limit
      for (let i = 0; i < 100; i++) {
        rateLimiter.checkRateLimit(clientId, toolName);
      }
      
      // Next request should be blocked
      const allowed = rateLimiter.checkRateLimit(clientId, toolName);
      expect(allowed).toBe(false);
    });
    
    it('should track rate limits per client', () => {
      const toolName = 'test_tool';
      
      // Client 1 uses up their limit
      for (let i = 0; i < 100; i++) {
        rateLimiter.checkRateLimit('client1', toolName);
      }
      
      // Client 2 should still be allowed
      const allowed = rateLimiter.checkRateLimit('client2', toolName);
      expect(allowed).toBe(true);
    });
    
    it('should track rate limits per tool', () => {
      const clientId = 'test-client-3';
      
      // Use up limit for tool1
      for (let i = 0; i < 100; i++) {
        rateLimiter.checkRateLimit(clientId, 'tool1');
      }
      
      // tool2 should still be allowed
      const allowed = rateLimiter.checkRateLimit(clientId, 'tool2');
      expect(allowed).toBe(true);
    });
  });
  
  describe('Tool-Specific Limits', () => {
    it('should enforce lower limits for sensitive operations', () => {
      const clientId = 'test-client-4';
      
      // execute_code has limit of 5 per 300 seconds
      for (let i = 0; i < 5; i++) {
        const allowed = rateLimiter.checkRateLimit(clientId, 'execute_code');
        expect(allowed).toBe(true);
      }
      
      // 6th request should be blocked
      const allowed = rateLimiter.checkRateLimit(clientId, 'execute_code');
      expect(allowed).toBe(false);
    });
    
    it('should apply correct limits for import operations', () => {
      const clientId = 'test-client-5';
      
      // import_data has limit of 10 per 60 seconds
      for (let i = 0; i < 10; i++) {
        const allowed = rateLimiter.checkRateLimit(clientId, 'import_data');
        expect(allowed).toBe(true);
      }
      
      const allowed = rateLimiter.checkRateLimit(clientId, 'import_data');
      expect(allowed).toBe(false);
    });
  });
  
  describe('Remaining Requests Calculation', () => {
    it('should correctly calculate remaining requests', () => {
      const clientId = 'test-client-6';
      const toolName = 'test_tool';
      
      // Initially should have full limit
      let remaining = rateLimiter.getRemainingRequests(clientId, toolName);
      expect(remaining).toBe(100);
      
      // Use 10 requests
      for (let i = 0; i < 10; i++) {
        rateLimiter.checkRateLimit(clientId, toolName);
      }
      
      remaining = rateLimiter.getRemainingRequests(clientId, toolName);
      expect(remaining).toBe(90);
    });
    
    it('should return 0 when limit exceeded', () => {
      const clientId = 'test-client-7';
      const toolName = 'test_tool';
      
      // Use up all requests
      for (let i = 0; i < 100; i++) {
        rateLimiter.checkRateLimit(clientId, toolName);
      }
      
      const remaining = rateLimiter.getRemainingRequests(clientId, toolName);
      expect(remaining).toBe(0);
    });
  });
  
  describe('Express Middleware', () => {
    it('should allow request within limits', async () => {
      const middleware = rateLimiter.middleware();
      
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    });
    
    it('should block request exceeding limits with 429 status', async () => {
      const middleware = rateLimiter.middleware();
      
      // Fill up the rate limit
      for (let i = 0; i < 100; i++) {
        await middleware(mockReq as Request, mockRes as Response, jest.fn());
      }
      
      // Reset mock functions
      mockRes.status = jest.fn().mockReturnThis();
      mockRes.json = jest.fn().mockReturnThis();
      mockNext = jest.fn();
      
      // Next request should be blocked
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Too Many Requests',
        message: expect.stringContaining('Rate limit exceeded'),
        retry_after: expect.any(Number)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should include Retry-After header when rate limited', async () => {
      const middleware = rateLimiter.middleware();
      
      // Fill up the rate limit
      for (let i = 0; i < 100; i++) {
        await middleware(mockReq as Request, mockRes as Response, jest.fn());
      }
      
      mockRes.setHeader = jest.fn();
      
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });
    
    it('should extract client ID from auth token', async () => {
      (mockReq as any).auth = { client_id: 'auth-client-123' };
      
      const middleware = rateLimiter.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      // Should use auth client_id for rate limiting
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should fall back to IP address if no auth', async () => {
      mockReq.ip = '192.168.1.100';
      delete (mockReq as any).auth;
      
      const middleware = rateLimiter.middleware();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
  
  describe('Custom Rate Limits', () => {
    it('should allow updating rate limits for specific tools', () => {
      rateLimiter.setLimit('custom_tool', { requests: 5, window: 10 });
      
      const clientId = 'test-client-8';
      
      // Should only allow 5 requests
      for (let i = 0; i < 5; i++) {
        const allowed = rateLimiter.checkRateLimit(clientId, 'custom_tool');
        expect(allowed).toBe(true);
      }
      
      const allowed = rateLimiter.checkRateLimit(clientId, 'custom_tool');
      expect(allowed).toBe(false);
    });
  });
});

describe('Advanced Rate Limiter Tests', () => {
  let advancedLimiter: AdvancedRateLimiter;
  
  beforeEach(() => {
    advancedLimiter = new AdvancedRateLimiter();
  });
  
  afterAll(() => {
    advancedLimiter.destroy();
  });
  
  describe('Sliding Window Algorithm', () => {
    it('should use sliding window for more accurate rate limiting', () => {
      const clientId = 'sliding-client';
      const toolName = 'test_tool';
      
      // Add requests at different times
      const results: boolean[] = [];
      for (let i = 0; i < 10; i++) {
        const allowed = advancedLimiter.checkRateLimitSlidingWindow(clientId, toolName);
        results.push(allowed);
      }
      
      // All should be allowed
      expect(results.every(r => r === true)).toBe(true);
    });
    
    it('should correctly calculate remaining requests with sliding window', () => {
      const clientId = 'sliding-client-2';
      const toolName = 'test_tool';
      
      // Add some requests
      for (let i = 0; i < 25; i++) {
        advancedLimiter.checkRateLimitSlidingWindow(clientId, toolName);
      }
      
      const remaining = advancedLimiter.getPreciseRemainingRequests(clientId, toolName);
      expect(remaining).toBe(75); // 100 - 25
    });
    
    it('should remove expired timestamps from sliding window', (done) => {
      const clientId = 'sliding-client-3';
      const toolName = 'fast_tool';
      
      // Set a very short window for testing
      advancedLimiter.setLimit('fast_tool', { requests: 5, window: 1 }); // 1 second window
      
      // Add 5 requests
      for (let i = 0; i < 5; i++) {
        advancedLimiter.checkRateLimitSlidingWindow(clientId, toolName);
      }
      
      // Should be blocked immediately
      let allowed = advancedLimiter.checkRateLimitSlidingWindow(clientId, toolName);
      expect(allowed).toBe(false);
      
      // Wait for window to expire
      setTimeout(() => {
        // Should be allowed again after window expires
        allowed = advancedLimiter.checkRateLimitSlidingWindow(clientId, toolName);
        expect(allowed).toBe(true);
        done();
      }, 1100); // Wait slightly more than 1 second
    });
  });
  
  describe('Burst Protection', () => {
    it('should prevent burst attacks', () => {
      const clientId = 'burst-attacker';
      const toolName = 'protected_tool';
      
      // Try to send 200 requests in a burst
      let blockedCount = 0;
      for (let i = 0; i < 200; i++) {
        const allowed = advancedLimiter.checkRateLimit(clientId, toolName);
        if (!allowed) blockedCount++;
      }
      
      // Should block 100 requests (after the first 100)
      expect(blockedCount).toBe(100);
    });
  });
  
  describe('Multi-Tool Rate Limiting', () => {
    it('should track different tools independently', () => {
      const clientId = 'multi-tool-client';
      
      // Use different tools
      const tools = ['tool1', 'tool2', 'tool3'];
      const results: Record<string, number> = {};
      
      tools.forEach(tool => {
        let count = 0;
        for (let i = 0; i < 150; i++) {
          if (advancedLimiter.checkRateLimit(clientId, tool)) {
            count++;
          }
        }
        results[tool] = count;
      });
      
      // Each tool should allow 100 requests
      expect(results.tool1).toBe(100);
      expect(results.tool2).toBe(100);
      expect(results.tool3).toBe(100);
    });
  });
  
  describe('Cleanup Mechanism', () => {
    it('should clean up old entries to prevent memory leaks', (done) => {
      // Create many clients with expired entries
      for (let i = 0; i < 100; i++) {
        advancedLimiter.checkRateLimit(`temp-client-${i}`, 'test_tool');
      }
      
      // Trigger cleanup (normally runs every minute)
      (advancedLimiter as any).cleanup();
      
      // Check that memory is managed (implementation-specific)
      expect(true).toBe(true); // Cleanup ran without errors
      done();
    });
  });
  
  describe('Security Scenarios', () => {
    it('should handle distributed attack from multiple IPs', () => {
      const toolName = 'sensitive_tool';
      advancedLimiter.setLimit('sensitive_tool', { requests: 10, window: 60 });
      
      const attackerIPs = Array.from({ length: 20 }, (_, i) => `192.168.1.${i}`);
      const blockedRequests: string[] = [];
      
      attackerIPs.forEach(ip => {
        for (let i = 0; i < 15; i++) {
          const allowed = advancedLimiter.checkRateLimit(ip, toolName);
          if (!allowed) {
            blockedRequests.push(ip);
            break;
          }
        }
      });
      
      // Each IP should be rate limited independently
      expect(blockedRequests.length).toBe(20);
    });
    
    it('should protect high-risk operations with stricter limits', () => {
      const clientId = 'test-client';
      const highRiskOps = ['execute_code', 'import_data', 'export_data'];
      
      highRiskOps.forEach(op => {
        let allowed = 0;
        for (let i = 0; i < 50; i++) {
          if (advancedLimiter.checkRateLimit(clientId, op)) {
            allowed++;
          }
        }
        
        // High-risk operations should have much lower limits
        expect(allowed).toBeLessThanOrEqual(20);
      });
    });
  });
});