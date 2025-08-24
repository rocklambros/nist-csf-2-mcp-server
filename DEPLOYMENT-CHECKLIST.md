# NIST CSF 2.0 MCP Server - Production Deployment Checklist

## 🎯 Overview

This checklist ensures the NIST CSF 2.0 MCP Server is properly configured and operationally ready for production deployment.

## ✅ Pre-Deployment Requirements

### 1. **Environment Configuration**

- [ ] Copy `.env.template` to `.env` and configure all required secrets
- [ ] Generate secure secrets using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Configure OAuth 2.1 authentication with valid JWKS URL and issuer
- [ ] Set up proper database encryption keys (if using `ENABLE_DB_ENCRYPTION=true`)
- [ ] Configure rate limiting and security headers for production
- [ ] Set `NODE_ENV=production`

**Critical Secrets to Configure:**
```bash
SESSION_SECRET=your-unique-session-secret-minimum-32-chars
HMAC_SECRET=your-unique-hmac-secret-for-data-integrity
ENCRYPTION_KEY=your-encryption-key-for-data-at-rest
JWKS_URL=https://your-identity-provider.com/.well-known/jwks.json
TOKEN_ISSUER=https://your-identity-provider.com
MCP_AUDIENCE=your-mcp-server-audience
```

### 2. **Security Configuration**

- [ ] **CRITICAL**: Remove or replace hardcoded test passwords in production builds:
  - [ ] Set `TEST_USER_PASSWORD`, `TEST_ADMIN_PASSWORD`, `TEST_ATTACKER_PASSWORD` in `.env`
  - [ ] Set `TEST_JWT_SECRET` for unit tests
  - [ ] Ensure test files are excluded from production Docker builds
- [ ] Configure file permissions: `chmod 600 .env && chown app:app .env`
- [ ] Verify no `.env` files are committed to version control
- [ ] Configure Docker secrets for container deployments

### 3. **Database Setup**

- [ ] **REQUIRED**: Run complete framework import: `npm run import:framework`
- [ ] **REQUIRED**: Seed question bank: `npm run seed:questions`
- [ ] **REQUIRED**: Verify database completeness: `npm run db:verify`
- [ ] Backup production database before first deployment
- [ ] Configure database encryption if handling sensitive data

**Expected Database Counts:**
- ✅ Functions: 6 (GV, ID, PR, DE, RS, RC)
- ✅ Categories: 26+ 
- ✅ Subcategories: 110+ (NIST CSF 2.0 complete)
- ✅ Questions: 9+ (assessment coverage)

## 🐋 Docker Production Deployment

### 1. **Build Production Image**

```bash
# Build image with pre-baked framework data
docker build -t nist-csf-mcp-server:latest .

# Verify build includes complete database
docker run --rm nist-csf-mcp-server:latest npm run db:verify
```

### 2. **Production Container Deployment**

```bash
# Using Docker Compose (recommended)
cp .env.template .env
# Configure .env with production values
docker-compose up -d

# Or direct Docker run
docker run -d \
  --name nist-csf-mcp-server \
  --restart unless-stopped \
  -p 8080:8080 \
  --env-file .env \
  -v ./data:/app/data:rw \
  -v ./logs:/app/logs:rw \
  -v ./secrets:/app/secrets:ro \
  --user 10001:10001 \
  --security-opt no-new-privileges:true \
  --read-only \
  --tmpfs /tmp:noexec,nosuid,size=100M \
  nist-csf-mcp-server:latest
```

### 3. **Container Security Verification**

- [ ] Container runs as non-root user (UID 10001)
- [ ] Read-only root filesystem enabled
- [ ] Security options configured (no-new-privileges)
- [ ] Resource limits applied (CPU: 1.0, Memory: 512M)
- [ ] Health checks functioning
- [ ] Secrets mounted read-only

## 🔍 Post-Deployment Verification

### 1. **System Health Checks**

```bash
# Test server startup
curl -f http://localhost:8080/health || echo "Health check failed"

# Verify database integrity
docker exec nist-csf-mcp-server npm run db:verify

# Test authentication (requires valid token)
curl -H "Authorization: Bearer your-jwt-token" \
     -H "Content-Type: application/json" \
     http://localhost:8080/api/v1/tools

# Run end-to-end workflow test
node run-e2e.js
```

### 2. **Security Validation**

- [ ] Verify no hardcoded passwords in logs: `docker logs nist-csf-mcp-server | grep -i password`
- [ ] Test rate limiting: Rapid requests should be throttled
- [ ] Verify JWT authentication: Requests without valid tokens should be rejected
- [ ] Check security headers: `curl -I http://localhost:8080/`
- [ ] Test CORS configuration matches requirements
- [ ] Verify audit logging is functioning

### 3. **Functional Testing**

- [ ] **Framework Queries**: Test basic CSF element retrieval
- [ ] **Profile Management**: Create and retrieve organization profiles
- [ ] **Assessment Workflow**: Complete quick assessment and gap analysis
- [ ] **Report Generation**: Generate and export reports
- [ ] **Question Bank**: Retrieve assessment questions
- [ ] **Data Export**: Test CSV/JSON export functionality

**Sample Test Commands:**
```bash
# Test framework query (with valid auth token)
curl -H "Authorization: Bearer $TOKEN" \
     -X POST http://localhost:8080/mcp \
     -d '{"method":"csf_lookup","params":{"element_id":"GV.OC-01"}}'

# Test profile creation
curl -H "Authorization: Bearer $TOKEN" \
     -X POST http://localhost:8080/mcp \
     -d '{"method":"create_profile","params":{"org_name":"Test Org","sector":"technology","size":"medium"}}'
```

## 🚨 Production Monitoring

### 1. **Essential Monitoring**

- [ ] Set up application health monitoring (HTTP 200 responses)
- [ ] Monitor database connection health
- [ ] Track authentication failures and rate limiting violations
- [ ] Monitor resource usage (CPU, memory, disk)
- [ ] Set up log aggregation and alerting

### 2. **Alert Thresholds**

- [ ] **Failed Authentication**: >10 failures in 5 minutes
- [ ] **Rate Limiting**: >50 violations in 5 minutes  
- [ ] **Database Errors**: Any connection failures
- [ ] **Memory Usage**: >80% of container limit
- [ ] **Response Time**: >2 seconds average

### 3. **Log Management**

- [ ] Configure structured JSON logging
- [ ] Set up log rotation (10MB max per file, 3 files)
- [ ] Ensure no sensitive data in logs (PII, tokens, passwords)
- [ ] Configure log shipping to centralized system

## 🔒 Security Hardening

### 1. **Network Security**

- [ ] Configure TLS 1.3 termination (use reverse proxy like nginx)
- [ ] Implement IP whitelisting if required
- [ ] Configure proper firewall rules (only port 8080 exposed)
- [ ] Set up DDoS protection and rate limiting at network level

### 2. **Secret Management**

- [ ] Use container secret management (Docker secrets, Kubernetes secrets)
- [ ] Implement secret rotation policies (90-day maximum)
- [ ] Never log or expose secrets in error messages
- [ ] Configure secret scanning in CI/CD pipeline

### 3. **Compliance**

- [ ] Document all data flows for compliance reporting
- [ ] Configure data retention policies (90 days default)
- [ ] Set up audit log retention (1+ years for compliance)
- [ ] Implement data anonymization if required

## 📋 Maintenance Procedures

### 1. **Regular Tasks**

- [ ] **Weekly**: Review security logs and failed authentication attempts
- [ ] **Monthly**: Update container base images and security patches
- [ ] **Quarterly**: Rotate secrets and API keys
- [ ] **Annually**: Review and update threat model

### 2. **Backup & Recovery**

- [ ] Configure automated database backups (daily)
- [ ] Test backup restoration procedures
- [ ] Document recovery time objectives (RTO) and recovery point objectives (RPO)
- [ ] Store backups in secure, offsite location

### 3. **Update Procedures**

```bash
# Update deployment
docker-compose pull
docker-compose down
docker-compose up -d

# Verify update
npm run db:verify
node run-e2e.js
```

## 🚀 Go-Live Checklist

- [ ] All environment variables configured and tested
- [ ] Database populated with complete NIST CSF 2.0 framework (110+ subcategories)
- [ ] Security configurations validated
- [ ] Docker container deployment successful
- [ ] Health checks passing
- [ ] End-to-end tests passing
- [ ] Authentication and authorization working
- [ ] Rate limiting functioning
- [ ] Monitoring and alerting configured
- [ ] Backup procedures tested
- [ ] Documentation updated
- [ ] Support team trained

## 💥 Troubleshooting

### Common Issues

1. **Database Incomplete (< 100 subcategories)**:
   ```bash
   npm run import:framework
   npm run db:verify
   ```

2. **Authentication Failures**:
   - Verify JWKS_URL is accessible
   - Check TOKEN_ISSUER matches JWT issuer
   - Ensure MCP_AUDIENCE matches token audience

3. **Container Permission Errors**:
   - Verify user 10001:10001 owns application files
   - Check volume mount permissions
   - Ensure secrets directory is readable

4. **Performance Issues**:
   - Check database query optimization
   - Verify proper indexing
   - Monitor container resource limits

## 📞 Support

For production issues:
1. Check application logs: `docker logs nist-csf-mcp-server`
2. Verify system health: `npm run db:verify`
3. Run diagnostics: `node run-e2e.js`
4. Consult security documentation in README.md

---

**Last Updated**: 2025-08-24  
**Version**: 1.0.0  
**Security Review**: Required for production deployment