# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a secure Model Context Protocol (MCP) server implementation focused on NIST Cybersecurity Framework 2.0. The server provides programmatic access to NIST CSF 2.0 controls with enterprise-grade security, including OAuth 2.1 authentication, comprehensive input validation, and rate limiting.

## Development Setup

### Environment Setup
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On macOS/Linux

# Install core dependencies
pip install mcp uvloop PyJWT gunicorn

# Install testing dependencies
pip install pytest pytest-cov pytest-security
```

### Running the Server
```bash
# Development mode with debugging
python -m src.server.app --debug

# Production mode with Gunicorn
gunicorn --bind 0.0.0.0:8080 --workers 2 --timeout 30 --max-requests 1000 src.server.app:app

# Docker container (recommended for production)
docker build -t nist-csf-mcp-server .
docker run -p 8080:8080 --env-file .env nist-csf-mcp-server
```

### Testing
```bash
# Run all tests with coverage
pytest tests/ --cov=src --cov-report=term-missing

# Run security tests specifically
pytest tests/security/ -v

# Run injection tests
pytest tests/security/test_injection.py -v

# Run authentication tests
pytest tests/security/test_auth.py -v

# Generate security test report
pytest tests/security/ --html=security-report.html
```

## Architecture

### Secure MCP Server Structure
The server implements defense-in-depth security following enterprise standards:

#### Security Layers
1. **Authentication Layer** (OAuth 2.1)
   - Client Credentials flow with JWT validation
   - Token lifetime < 15 minutes
   - Scope-based authorization per tool
   - JWKS validation against trusted IdP

2. **Validation Layer**
   - Type and range validation on all inputs
   - Path traversal prevention with canonicalization
   - Injection attack prevention (SQL, Command, LDAP, XXE)
   - Request size limits (1MB default)

3. **Rate Limiting Layer**
   - Per-client and per-tool limits
   - Configurable time windows
   - Exponential backoff for repeated violations

4. **Audit Layer**
   - Structured JSON logging
   - Sanitized parameter logging (no PII)
   - Security event tracking
   - Performance metrics

### Core Components

1. **Authentication Middleware** (`src/server/auth.py`)
   - JWT token validation with PyJWT
   - Scope enforcement decorators
   - Token refresh handling
   - Fail-closed on any auth error

2. **Tool Base Class** (`src/server/tools/base_tool.py`)
   - Mandatory parameter validation
   - Security checklist enforcement
   - Error sanitization
   - Execution timing limits

3. **NIST CSF Query Engine**
   - Read-only access to NIST CSF 2.0 data
   - Parameterized queries only (no dynamic SQL)
   - Result size pagination
   - Cache with TTL for performance

4. **Rate Limiter** (`src/server/middleware/rate_limit.py`)
   - Token bucket algorithm
   - Configurable per-tool limits
   - Client identification via JWT claims
   - Redis-backed for distributed deployments

### Security-First Data Flow
```
Client Request 
  → TLS 1.3 termination
  → Authentication check (JWT validation)
  → Rate limit check
  → Input validation & sanitization
  → Authorization check (scope validation)  
  → Tool execution (with timeout)
  → Response sanitization
  → Audit logging
  → Encrypted response to client
```

## Security Considerations

This server operates with strict security constraints:
- **Read-only**: No data modification capabilities
- **Input Validation**: All inputs sanitized and validated
- **No Code Execution**: Server cannot execute arbitrary code
- **Audit Trail**: All queries logged for compliance
- **Type Safety**: Strong typing throughout the codebase

## NIST CSF 2.0 Implementation

The server implements all six core functions:
- **GV (Govern)**: Organizational cybersecurity risk management
- **ID (Identify)**: Asset and risk identification
- **PR (Protect)**: Safeguards implementation
- **DE (Detect)**: Anomaly and event detection
- **RS (Respond)**: Incident response actions
- **RC (Recover)**: Recovery planning and improvements

Each function contains categories and subcategories that can be queried programmatically through MCP tools.

## File Structure Convention

```
nist-csf-2-mcp-server/
├── src/
│   └── server/
│       ├── __init__.py
│       ├── app.py              # Main application with security middleware
│       ├── auth.py             # OAuth 2.1 authentication
│       ├── validators.py       # Input validation utilities
│       ├── tools/
│       │   ├── base_tool.py   # Base class with security enforcement
│       │   ├── query_csf.py   # NIST CSF query tool
│       │   └── assess_control.py # Control assessment tool
│       └── middleware/
│           ├── rate_limit.py  # Rate limiting implementation
│           ├── logging.py     # Security audit logging
│           └── error_handler.py # Error sanitization
├── config/
│   ├── server-config.yaml     # Server configuration
│   └── tool-registry.yaml     # Tool definitions and scopes
├── tests/
│   ├── security/
│   │   ├── test_injection.py  # Injection attack tests
│   │   ├── test_auth.py      # Authentication tests
│   │   └── test_traversal.py # Path traversal tests
│   └── tools/
│       └── test_*.py          # Tool-specific tests
├── Dockerfile                  # Secure container configuration
├── .env.template              # Environment template (never commit .env)
├── requirements.txt           # Python dependencies
└── .claude/
    ├── claude-code-config.yaml # Claude Code configuration
    └── mcp-server-rules.md    # Security development rules
```

## Security Implementation Requirements

When implementing ANY feature in this codebase:

### 1. Tool Implementation Checklist
Every new tool MUST:
- [ ] Extend `BaseTool` class
- [ ] Implement `validate_params()` with comprehensive validation
- [ ] Include rate limiting configuration
- [ ] Define required OAuth scopes
- [ ] Handle errors without exposing internals
- [ ] Add security tests covering OWASP Top 10

### 2. Input Validation Requirements
For EVERY parameter:
- [ ] Type validation with isinstance()
- [ ] Range/size validation
- [ ] Path traversal check (for file operations)
- [ ] Injection prevention (SQL, Command, LDAP)
- [ ] Regex validation for structured inputs
- [ ] Canonicalization before use

### 3. Authentication Flow
All requests must:
- [ ] Include valid Bearer token
- [ ] Pass JWT signature validation
- [ ] Have required scopes for the tool
- [ ] Be within token lifetime (< 15 min)
- [ ] Come from trusted issuer

### 4. Container Security
Docker deployments must:
- [ ] Run as non-root user (UID 10001)
- [ ] Use distroless or slim base images
- [ ] Set resource limits
- [ ] Enable read-only root filesystem
- [ ] Drop all capabilities
- [ ] Use security options (no-new-privileges)

## Critical Security Patterns

### Fail-Closed Pattern
```python
# ALWAYS default to denial
def authorize(token, required_scope):
    try:
        decoded = validate_token(token)
        if required_scope in decoded.get('scope', '').split():
            return True
    except Exception:
        pass  # Any error = deny
    return False  # Default deny
```

### Input Sanitization Pattern
```python
# NEVER trust user input
def validate_filename(filename):
    # Whitelist approach - define what's allowed
    if not re.match(r'^[a-zA-Z0-9_\-\.]+$', filename):
        raise ValueError("Invalid filename")
    
    # Prevent traversal
    if '..' in filename or filename.startswith('/'):
        raise SecurityError("Path traversal detected")
    
    # Canonicalize and verify
    safe_path = Path(BASE_DIR, filename).resolve()
    if not safe_path.is_relative_to(BASE_DIR):
        raise SecurityError("Access denied")
    
    return safe_path
```