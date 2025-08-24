/**
 * Security tests for authentication and authorization
 * Tests JWT validation, scope checking, and token expiry
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { AuthMiddleware } from '../../src/security/auth';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createPrivateKey, createPublicKey } from 'crypto';

// Generate test RSA key pair
const generateTestKeys = () => {
  const { privateKey, publicKey } = require('crypto').generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { privateKey, publicKey };
};

describe('Authentication Middleware Tests', () => {
  let authMiddleware: AuthMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let testKeys: { privateKey: string; publicKey: string };
  
  beforeAll(() => {
    testKeys = generateTestKeys();
    
    // Mock environment variables
    process.env.JWKS_URL = 'https://test.auth.com/.well-known/jwks.json';
    process.env.MCP_AUDIENCE = 'test-audience';
    process.env.TOKEN_ISSUER = 'https://test.auth.com';
    
    authMiddleware = new AuthMiddleware();
    
    // Setup mock request/response
    mockReq = {
      headers: {},
      body: {},
      params: {},
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
    delete process.env.JWKS_URL;
    delete process.env.MCP_AUDIENCE;
    delete process.env.TOKEN_ISSUER;
  });
  
  describe('Token Validation', () => {
    it('should reject request without authorization header', async () => {
      const middleware = authMiddleware.authenticate();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized - No token provided'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should reject request with invalid authorization format', async () => {
      mockReq.headers = { authorization: 'InvalidFormat token123' };
      
      const middleware = authMiddleware.authenticate();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should reject request with malformed JWT', async () => {
      mockReq.headers = { authorization: 'Bearer invalid.jwt.token' };
      
      const middleware = authMiddleware.authenticate();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized - Invalid token'
      });
    });
    
    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        {
          sub: 'test-user',
          aud: 'test-audience',
          iss: 'https://test.auth.com',
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
          iat: Math.floor(Date.now() / 1000) - 7200
        },
        testKeys.privateKey,
        { algorithm: 'RS256', keyid: 'test-key-id' }
      );
      
      mockReq.headers = { authorization: `Bearer ${expiredToken}` };
      
      const middleware = authMiddleware.authenticate();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized - Token expired'
      });
    });
    
    it('should reject tokens with wrong audience', async () => {
      const wrongAudienceToken = jwt.sign(
        {
          sub: 'test-user',
          aud: 'wrong-audience',
          iss: 'https://test.auth.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000)
        },
        testKeys.privateKey,
        { algorithm: 'RS256', keyid: 'test-key-id' }
      );
      
      mockReq.headers = { authorization: `Bearer ${wrongAudienceToken}` };
      
      const middleware = authMiddleware.authenticate();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
    
    it('should reject tokens with wrong issuer', async () => {
      const wrongIssuerToken = jwt.sign(
        {
          sub: 'test-user',
          aud: 'test-audience',
          iss: 'https://wrong.issuer.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000)
        },
        testKeys.privateKey,
        { algorithm: 'RS256', keyid: 'test-key-id' }
      );
      
      mockReq.headers = { authorization: `Bearer ${wrongIssuerToken}` };
      
      const middleware = authMiddleware.authenticate();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
    
    it('should reject tokens older than 15 minutes', async () => {
      const oldToken = jwt.sign(
        {
          sub: 'test-user',
          aud: 'test-audience',
          iss: 'https://test.auth.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000) - 1800 // Issued 30 minutes ago
        },
        testKeys.privateKey,
        { algorithm: 'RS256', keyid: 'test-key-id' }
      );
      
      mockReq.headers = { authorization: `Bearer ${oldToken}` };
      
      const middleware = authMiddleware.authenticate();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
  
  describe('Scope Authorization', () => {
    it('should reject request without required scope', async () => {
      (mockReq as any).auth = {
        sub: 'test-user',
        scope: 'read:data write:data'
      };
      
      const middleware = authMiddleware.requireScope('admin:tools');
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden - Insufficient permissions',
        required_scope: 'admin:tools',
        available_scopes: ['read:data', 'write:data']
      });
    });
    
    it('should allow request with required scope', async () => {
      (mockReq as any).auth = {
        sub: 'test-user',
        scope: 'read:data write:data admin:tools'
      };
      
      const middleware = authMiddleware.requireScope('admin:tools');
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
    
    it('should handle missing scope field gracefully', async () => {
      (mockReq as any).auth = {
        sub: 'test-user'
        // No scope field
      };
      
      const middleware = authMiddleware.requireScope('read:data');
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
  
  describe('Tool Permission Checking', () => {
    it('should require tool-specific permission', async () => {
      (mockReq as any).auth = {
        sub: 'test-user',
        scope: 'tool:create_assessment tool:update_assessment'
      };
      
      const middleware = authMiddleware.requireToolPermission('create_assessment');
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should reject without tool permission', async () => {
      (mockReq as any).auth = {
        sub: 'test-user',
        scope: 'tool:create_assessment'
      };
      
      const middleware = authMiddleware.requireToolPermission('delete_assessment');
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
  
  describe('Token Extraction', () => {
    it('should extract Bearer token correctly', () => {
      const testToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
      mockReq.headers = { authorization: `Bearer ${testToken}` };
      
      // Access private method through reflection for testing
      const token = (authMiddleware as any).extractToken(mockReq);
      expect(token).toBe(testToken);
    });
    
    it('should handle case-insensitive Bearer prefix', () => {
      const testToken = 'test.token.here';
      mockReq.headers = { authorization: `bearer ${testToken}` };
      
      // Bearer should be case-sensitive per RFC 6750
      const token = (authMiddleware as any).extractToken(mockReq);
      expect(token).toBeNull();
    });
    
    it('should reject tokens with extra spaces', () => {
      mockReq.headers = { authorization: 'Bearer  token' }; // Double space
      
      const token = (authMiddleware as any).extractToken(mockReq);
      expect(token).toBeNull();
    });
  });
  
  describe('Security Edge Cases', () => {
    it('should handle extremely long tokens gracefully', async () => {
      const longToken = 'a'.repeat(10000);
      mockReq.headers = { authorization: `Bearer ${longToken}` };
      
      const middleware = authMiddleware.authenticate();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
    
    it('should not expose internal error details', async () => {
      // Force an internal error by mocking
      const middleware = authMiddleware.authenticate();
      mockReq.headers = { authorization: 'Bearer will.cause.error' };
      
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      // Should not expose stack traces or internal details
      expect(mockRes.json).toHaveBeenCalledWith({
        error: expect.stringMatching(/^Unauthorized/)
      });
      
      const callArg = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(callArg.error).not.toContain('stack');
      expect(callArg.error).not.toContain('at ');
    });
    
    it('should handle concurrent authentication attempts', async () => {
      const promises = [];
      const middleware = authMiddleware.authenticate();
      
      // Simulate concurrent requests
      for (let i = 0; i < 10; i++) {
        const req = { 
          headers: { authorization: `Bearer token${i}` },
          body: {},
          params: {},
          ip: `127.0.0.${i}`
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };
        const next = jest.fn();
        
        promises.push(middleware(req as Request, res as Response, next));
      }
      
      await Promise.all(promises);
      // Should handle all requests without crashing
      expect(promises).toHaveLength(10);
    });
  });
  
  describe('Algorithm Security', () => {
    it('should reject tokens with none algorithm', async () => {
      const noneAlgorithmToken = jwt.sign(
        {
          sub: 'test-user',
          aud: 'test-audience',
          iss: 'https://test.auth.com'
        },
        '',
        { algorithm: 'none' as any }
      );
      
      mockReq.headers = { authorization: `Bearer ${noneAlgorithmToken}` };
      
      const middleware = authMiddleware.authenticate();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
    
    it('should only accept configured algorithms', async () => {
      const hs256Token = jwt.sign(
        {
          sub: 'test-user',
          aud: 'test-audience',
          iss: 'https://test.auth.com'
        },
        process.env.TEST_JWT_SECRET || 'defaultTestSecret',
        { algorithm: 'HS256' }
      );
      
      mockReq.headers = { authorization: `Bearer ${hs256Token}` };
      
      const middleware = authMiddleware.authenticate();
      await middleware(mockReq as Request, mockRes as Response, mockNext);
      
      // Should reject HS256 when expecting RS256
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});