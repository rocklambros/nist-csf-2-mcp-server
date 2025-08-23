/**
 * Authentication middleware for MCP server
 * Implements OAuth 2.1 Client Credentials flow with JWT validation
 */

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { Request, Response, NextFunction } from 'express';

export interface AuthConfig {
  jwksUrl: string;
  audience: string;
  issuer: string;
  algorithms: jwt.Algorithm[];
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

export class AuthMiddleware {
  private client: jwksClient.JwksClient;
  private config: AuthConfig;

  constructor(config?: Partial<AuthConfig>) {
    // Use environment variables with fallback to config
    this.config = {
      jwksUrl: config?.jwksUrl || process.env.JWKS_URL || '',
      audience: config?.audience || process.env.MCP_AUDIENCE || '',
      issuer: config?.issuer || process.env.TOKEN_ISSUER || '',
      algorithms: config?.algorithms || ['RS256']
    };

    if (!this.config.jwksUrl) {
      throw new Error('JWKS_URL is required for authentication');
    }

    // Initialize JWKS client
    this.client = jwksClient({
      jwksUri: this.config.jwksUrl,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10
    });
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

    return parts[1];
  }

  /**
   * Get signing key from JWKS
   */
  private getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
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
   * Validate JWT token
   */
  private async validateToken(token: string): Promise<DecodedToken> {
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
          } else {
            resolve(decoded as DecodedToken);
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
      try {
        const token = this.extractToken(req);
        if (!token) {
          return res.status(401).json({ error: 'Unauthorized - No token provided' });
        }

        const decoded = await this.validateToken(token);
        
        // Attach decoded token to request for use in route handlers
        (req as any).auth = decoded;
        
        next();
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          return res.status(401).json({ error: 'Unauthorized - Token expired' });
        } else if (error instanceof jwt.JsonWebTokenError) {
          return res.status(401).json({ error: 'Unauthorized - Invalid token' });
        }
        
        // Don't expose internal error details
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Unauthorized' });
      }
    };
  }

  /**
   * Middleware to check required scopes
   */
  public requireScope(requiredScope: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const auth = (req as any).auth as DecodedToken;
      
      if (!auth) {
        return res.status(401).json({ error: 'Unauthorized - Not authenticated' });
      }

      const scopes = auth.scope?.split(' ') || [];
      
      if (!scopes.includes(requiredScope)) {
        return res.status(403).json({ 
          error: 'Forbidden - Insufficient permissions',
          required_scope: requiredScope,
          available_scopes: scopes
        });
      }

      next();
    };
  }

  /**
   * Middleware to check tool-specific permissions
   */
  public requireToolPermission(toolName: string) {
    return this.requireScope(`tool:${toolName}`);
  }
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();