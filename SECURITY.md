# NIST CSF 2.0 MCP Server - Security Documentation

## Overview

This MCP server implements comprehensive security measures following enterprise security standards and OWASP best practices.

## Security Features

### 1. Authentication (OAuth 2.1)
- JWT token validation with JWKS support
- Token lifetime limited to 15 minutes
- Scope-based authorization for tool access
- Client credentials flow implementation

**Configuration:**
```env
JWKS_URL=https://your-idp.com/.well-known/jwks.json
MCP_AUDIENCE=mcp-server-prod
TOKEN_ISSUER=https://your-idp.com
JWT_ALGORITHMS=RS256,RS384,RS512
TOKEN_MAX_AGE=900
```

### 2. Input Validation
- Comprehensive parameter validation for all tools using Zod schemas
- Path traversal prevention
- SQL injection protection
- Command injection prevention
- XSS protection
- File size and type validation

**Security Checks:**
- Type validation
- Range validation
- Path traversal checks
- SQL/Command injection prevention
- Size limits enforcement

### 3. Rate Limiting
- Per-client and per-tool rate limits
- Sliding window algorithm for accurate limiting
- Configurable limits based on tool sensitivity
- Headers include rate limit information

**Default Limits:**
- Default: 100 requests/minute
- Import operations: 10 requests/minute
- Export operations: 20 requests/minute
- Code execution: 5 requests/5 minutes

### 4. Security Logging
- Structured logging with sensitive data redaction
- Threat pattern detection
- Audit trail for all tool executions
- Security event monitoring

**Logged Events:**
- Authentication attempts
- Tool executions
- Rate limit violations
- Validation failures
- Security threats detected

### 5. Container Security
- Multi-stage Docker build
- Non-root user execution (UID 10001)
- Read-only root filesystem
- Resource limits enforced
- Security headers enabled
- Minimal Alpine Linux base

### 6. Network Security
- HTTPS/TLS only in production
- CORS protection with configurable origins
- Security headers via Helmet.js
- Content Security Policy
- HSTS enforcement

## Deployment Security

### Environment Configuration

1. Copy `.env.template` to `.env`:
```bash
cp .env.template .env
```

2. Configure required security settings:
```env
# Required for production
JWKS_URL=https://your-idp.com/.well-known/jwks.json
MCP_AUDIENCE=mcp-server-prod
TOKEN_ISSUER=https://your-idp.com
SESSION_SECRET=<generate-strong-secret>
ENCRYPTION_KEY=<generate-strong-key>
HMAC_SECRET=<generate-strong-secret>
```

3. Set production mode:
```env
NODE_ENV=production
ENABLE_AUTH=true
ENABLE_RATE_LIMITING=true
ENABLE_SECURITY_HEADERS=true
ENABLE_AUDIT_LOG=true
```

### Docker Deployment

1. Build the secure container:
```bash
npm run docker:build
```

2. Run with Docker Compose:
```bash
docker-compose up -d
```

The container runs with:
- Non-root user
- Read-only filesystem
- Resource limits
- Health checks
- Security capabilities dropped

### Testing Security

Run security tests:
```bash
npm run test:security
```

Tests cover:
- Path traversal attempts
- SQL injection attempts
- Command injection attempts
- XSS prevention
- Authentication flows
- Rate limiting
- Token validation

## Security Checklist

Before deploying to production:

- [ ] **Authentication**: OAuth 2.1 configured with valid JWKS URL
- [ ] **Secrets**: All secrets generated and stored securely
- [ ] **TLS**: HTTPS configured with valid certificates
- [ ] **Rate Limiting**: Appropriate limits set for each tool
- [ ] **Monitoring**: Security logging and alerting configured
- [ ] **Validation**: All tools validate input parameters
- [ ] **Container**: Running as non-root with resource limits
- [ ] **Network**: Firewall rules and network segmentation in place
- [ ] **Backup**: Regular backups configured and tested
- [ ] **Updates**: Security update process documented

## Tool Permission Matrix

| Tool | Required Scope | Rate Limit | Auth Required |
|------|---------------|------------|---------------|
| csf_lookup | - | 100/min | No |
| search_framework | - | 50/min | No |
| create_profile | profile:write | 20/min | Yes |
| import_assessment | data:import | 5/min | Yes |
| export_data | data:export | 10/min | Yes |
| generate_report | report:generate | 10/min | Yes |
| validate_evidence | evidence:validate | 20/min | Yes |

## Incident Response

If a security incident is detected:

1. **Immediate Actions:**
   - Block affected client IDs
   - Review security logs for attack patterns
   - Check for data exfiltration attempts

2. **Investigation:**
   - Analyze logs in `/logs/security.log`
   - Review rate limit violations
   - Check authentication failures

3. **Remediation:**
   - Rotate compromised credentials
   - Update security rules
   - Deploy patches if vulnerabilities found

4. **Post-Incident:**
   - Document incident details
   - Update security policies
   - Improve detection mechanisms

## Security Updates

Stay informed about security updates:

1. Monitor dependencies:
```bash
npm audit
```

2. Update dependencies regularly:
```bash
npm update
npm audit fix
```

3. Subscribe to security advisories for:
   - Node.js
   - Express.js
   - JWT libraries
   - Docker Alpine

## Compliance

This implementation aligns with:
- OWASP Top 10 security practices
- NIST Cybersecurity Framework
- OAuth 2.1 specifications
- Docker security best practices
- Zero Trust architecture principles

## Contact

For security issues or questions:
- Create a private security advisory on GitHub
- Do NOT create public issues for security vulnerabilities
- Include detailed reproduction steps and impact assessment

## Additional Resources

- [OWASP Security Cheat Sheet](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security Documentation](https://docs.docker.com/engine/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)