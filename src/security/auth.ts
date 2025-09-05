/**
 * Authentication middleware for MCP server
 * Supports three modes:
 * 1. DISABLED (default) - No authentication required
 * 2. SIMPLE - API key authentication via Bearer token
 * 3. OAUTH - Full OAuth 2.1 Client Credentials with JWT validation
 */

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { Request, Response, NextFunction } from 'express';

export type AuthMode = 'disabled' | 'simple' | 'oauth';

export interface AuthConfig {
  mode: AuthMode;
  // Simple auth config
  apiKey?: string;
  // OAuth config  
  jwksUrl?: string;
  audience?: string;
  issuer?: string;
  algorithms?: jwt.Algorithm[];
}

export interface DecodedToken {
  sub: string;
  aud: string | string[];
  iss: string;
  exp: number;
  iat: number;
  scope?: string;
  client_id?: string;
}

export interface SimpleAuthToken {
  authenticated: true;
  mode: 'simple';
  scope?: string;
}

export class AuthMiddleware {
  private client?: jwksClient.JwksClient;
  private config: AuthConfig;

  constructor(config?: Partial<AuthConfig>) {
    // Determine authentication mode from environment
    const mode = this.determineAuthMode();
    
    this.config = {
      mode,
      // Simple auth config
      apiKey: config?.apiKey || process.env.API_KEY,
      // OAuth config
      jwksUrl: config?.jwksUrl || process.env.JWKS_URL,
      audience: config?.audience || process.env.MCP_AUDIENCE,
      issuer: config?.issuer || process.env.TOKEN_ISSUER,
      algorithms: config?.algorithms || ['RS256']
    };

    // Only initialize JWKS client for OAuth mode
    if (this.config.mode === 'oauth') {
      if (!this.config.jwksUrl) {
        throw new Error('JWKS_URL is required for OAuth authentication mode');
      }

      this.client = jwksClient({
        jwksUri: this.config.jwksUrl,
        cache: true,
        cacheMaxAge: 600000, // 10 minutes
        rateLimit: true,
        jwksRequestsPerMinute: 10
      });
    }

    // Write to stderr for MCP compatibility
    process.stderr.write(`🔒 Authentication mode: ${this.config.mode.toUpperCase()}\n`);
  }

  /**
   * Determine authentication mode from environment variables
   */
  private determineAuthMode(): AuthMode {
    // Check for explicit simple auth flag
    if (process.env.SIMPLE_AUTH === 'true' || process.env.AUTH_MODE === 'simple') {
      return 'simple';
    }
    
    // Check for OAuth configuration
    if (process.env.JWKS_URL || process.env.AUTH_MODE === 'oauth') {
      return 'oauth';
    }
    
    // Default to disabled for easy initial setup
    return 'disabled';
  }

  /**
   * Extract Bearer token from Authorization header
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1] || null;
  }

  /**
   * Get signing key from JWKS (OAuth mode only)
   */
  private getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
    if (!this.client) {
      callback(new Error('JWKS client not initialized'));
      return;
    }
    
    this.client.getSigningKey(header.kid!, (err, key) => {
      if (err) {
        callback(err);
      } else {
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
      }
    });
  }

  /**
   * Validate simple API key
   */
  private validateApiKey(token: string): SimpleAuthToken | null {
    if (!this.config.apiKey) {
      process.stderr.write('⚠️  Simple auth enabled but no API_KEY configured\n');
      return null;
    }

    if (token === this.config.apiKey) {
      return {
        authenticated: true,
        mode: 'simple',
        scope: 'all' // Simple mode grants all permissions
      };
    }

    return null;
  }

  /**
   * Validate JWT token (OAuth mode only)
   */
  private async validateJwtToken(token: string): Promise<DecodedToken> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.getKey.bind(this),
        {
          audience: this.config.audience,
          issuer: this.config.issuer,
          algorithms: this.config.algorithms,
          maxAge: '15m' // Token lifetime < 15 minutes as per requirements
        },
        (err, decoded) => {
          if (err) {
            reject(err);
            return;
          } else {
            resolve(decoded as DecodedToken);
            return;
          }
        }
      );
    });
  }

  /**
   * Middleware to validate authentication
   */
  public authenticate() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Disabled mode - no authentication required
      if (this.config.mode === 'disabled') {
        (req as any).auth = { authenticated: false, mode: 'disabled' };
        next();
        return;
      }

      // Extract token for simple and OAuth modes
      const token = this.extractToken(req);
      if (!token) {
        return res.status(401).json({ 
          error: 'Unauthorized - No token provided'
        });
      }

      try {
        // Simple authentication mode
        if (this.config.mode === 'simple') {
          const validated = this.validateApiKey(token);
          if (!validated) {
            return res.status(401).json({ 
              error: 'Unauthorized - Invalid credentials'
            });
          }
          (req as any).auth = validated;
          next();
          return;
        }

        // OAuth authentication mode
        if (this.config.mode === 'oauth') {
          const decoded = await this.validateJwtToken(token);
          (req as any).auth = decoded;
          next();
          return;
        }

        // This should never happen
        return res.status(500).json({ error: 'Invalid authentication configuration' });

      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return res.status(401).json({ error: 'Unauthorized - Token expired' });
        } else if (error instanceof jwt.JsonWebTokenError) {
          return res.status(401).json({ error: 'Unauthorized - Invalid token' });
        }
        
        // Don't expose internal error details
        process.stderr.write(`Authentication error: ${error}\n`);
        return res.status(401).json({ error: 'Unauthorized' });
      }
    };
  }

  /**
   * Middleware to check required scopes
   */
  public requireScope(requiredScope: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const auth = (req as any).auth;
      
      // Disabled mode - allow all operations
      if (this.config.mode === 'disabled' || auth?.mode === 'disabled') {
        next();
        return;
      }

      if (!auth) {
        return res.status(401).json({ error: 'Unauthorized - Not authenticated' });
      }

      // Simple mode - all permissions granted
      if (auth.mode === 'simple' || auth.scope === 'all') {
        next();
        return;
      }

      // OAuth mode - check specific scopes
      const scopes = auth.scope?.split(' ') || [];
      
      if (!scopes.includes(requiredScope)) {
        return res.status(403).json({ 
          error: 'Forbidden - Insufficient permissions'
        });
      }

      next();
      return;
    };
  }

  /**
   * Middleware to check tool-specific permissions
   */
  public requireToolPermission(toolName: string) {
    return this.requireScope(`tool:${toolName}`);
  }

  /**
   * Get current authentication mode
   */
  public getAuthMode(): AuthMode {
    return this.config.mode;
  }

  /**
   * Check if authentication is currently enabled
   */
  public isAuthEnabled(): boolean {
    return this.config.mode !== 'disabled';
  }
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();