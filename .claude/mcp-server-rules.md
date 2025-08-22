# MCP Server Development Rules for Claude Code

## Installation Instructions for Claude Code

### Step 1: Create Rules File
Save this content as `.claude/mcp-server-rules.md` in your project root.

### Step 2: Create Claude Code Configuration
Create `.claude/claude-code-config.yaml`:

```yaml
name: "Secure MCP Server Development"
version: "1.0.0"
rules:
  - ./mcp-server-rules.md
context:
  - "You are building a secure MCP server following enterprise security standards"
  - "Always validate inputs, use authentication, and implement rate limiting"
  - "Default to fail-closed behavior on any security error"
```

### Step 3: Initialize Claude Code with Rules
```bash
# In your project directory
claude-code init --config .claude/claude-code-config.yaml
```

---

## Core MCP Server Security Rules

### RULE SET 1: Project Structure & Initial Setup

**WHEN** creating a new MCP server project:
```yaml
MUST_CREATE:
  - src/
    - server/
      - app.{py|ts}           # Main server application
      - auth.{py|ts}          # Authentication middleware
      - validators.{py|ts}    # Input validation
      - tools/                # Individual tool implementations
      - middleware/           # Security middleware
  - config/
    - server-config.yaml      # Server configuration
    - tool-registry.yaml      # Tool definitions
  - tests/
    - security/              # Security-specific tests
    - tools/                 # Tool unit tests
  - Dockerfile               # Container configuration
  - .env.template           # Environment variables template
  - requirements.txt or package.json
```

### RULE SET 2: Authentication & Authorization

**ALWAYS** implement OAuth 2.1 Client Credentials flow:

```python
# Template for src/server/auth.py
"""
REQUIREMENTS:
1. Use PyJWT for token validation
2. Token lifetime < 15 minutes
3. Validate on EVERY request
4. Check scopes per tool
"""

from functools import wraps
import jwt
import os

class AuthMiddleware:
    def __init__(self):
        self.jwks_url = os.environ['JWKS_URL']  # NEVER hardcode
        self.audience = os.environ['MCP_AUDIENCE']
        
    def require_scope(self, required_scope: str):
        """Decorator to enforce scope requirements"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Extract Bearer token
                token = self._extract_token()
                if not token:
                    return {"error": "Unauthorized"}, 401
                
                # Validate token
                try:
                    decoded = self._validate_token(token)
                except jwt.InvalidTokenError:
                    return {"error": "Invalid token"}, 401
                
                # Check scope
                if required_scope not in decoded.get('scope', '').split():
                    return {"error": "Insufficient permissions"}, 403
                
                return func(*args, **kwargs)
            return wrapper
        return decorator
```

### RULE SET 3: Input Validation for Every Tool

**FOR EVERY** tool implementation:

```python
# Template for src/server/tools/base_tool.py
"""
SECURITY CHECKLIST:
[ ] Type validation
[ ] Range validation  
[ ] Path traversal check
[ ] SQL injection prevention
[ ] Command injection prevention
[ ] Size limits
[ ] Rate limiting
"""

import re
from pathlib import Path
from typing import Dict, Any

class BaseTool:
    def validate_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Override in each tool with specific validation"""
        raise NotImplementedError
    
    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        # ALWAYS validate first
        validated_params = self.validate_params(params)
        return self._execute_impl(validated_params)

class FileReaderTool(BaseTool):
    def __init__(self):
        self.base_dir = Path("/app/data").resolve()  # Restricted directory
        self.max_size = 1024 * 1024  # 1MB limit
        
    def validate_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        filename = params.get('filename')
        
        # Type check
        if not isinstance(filename, str):
            raise ValueError("filename must be string")
        
        # Path traversal prevention
        if '..' in filename or filename.startswith('/'):
            raise SecurityError("Path traversal detected")
        
        # Validate characters
        if re.search(r'[<>:"|?*\x00-\x1f]', filename):
            raise ValueError("Invalid characters in filename")
        
        # Canonicalize and verify path
        full_path = (self.base_dir / filename).resolve()
        if not full_path.is_relative_to(self.base_dir):
            raise SecurityError("Access denied")
            
        return {"filename": filename, "full_path": full_path}
```

### RULE SET 4: Container Security

**ALWAYS** use this Dockerfile template:

```dockerfile
# Dockerfile
FROM python:3.11-slim AS builder

WORKDIR /build
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.11-slim

# Create non-root user (MANDATORY)
RUN useradd --uid 10001 --no-create-home mcp-server && \
    mkdir -p /app/data && \
    chown -R 10001:10001 /app

WORKDIR /app
COPY --from=builder /root/.local /home/mcp-server/.local
COPY --chown=10001:10001 src/ ./src/

# Switch to non-root user (MANDATORY)
USER 10001

# Security headers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8080

# Run with security limits
CMD ["python", "-m", "gunicorn", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "2", \
     "--timeout", "30", \
     "--max-requests", "1000", \
     "src.server.app:app"]
```

### RULE SET 5: Security Testing Requirements

**CREATE** these test files:

```python
# tests/security/test_injection.py
"""
MUST TEST:
1. Path traversal (../, ..\, %2e%2e)
2. SQL injection (', --, UNION)
3. Command injection (&, |, ;, `)
4. XXE/XML injection
5. LDAP injection
"""

import pytest
from src.server.tools import FileReaderTool

class TestPathTraversal:
    @pytest.mark.parametrize("malicious_input", [
        "../etc/passwd",
        "..\\windows\\system32",
        "%2e%2e%2fetc%2fpasswd",
        "....//etc/passwd",
        "/etc/passwd",
        "C:\\Windows\\System32"
    ])
    def test_blocks_path_traversal(self, malicious_input):
        tool = FileReaderTool()
        with pytest.raises(SecurityError):
            tool.validate_params({"filename": malicious_input})

# tests/security/test_auth.py
class TestAuthentication:
    def test_missing_token_returns_401(self):
        # Test no token
        pass
    
    def test_expired_token_returns_401(self):
        # Test expired token
        pass
    
    def test_wrong_scope_returns_403(self):
        # Test insufficient permissions
        pass
```

### RULE SET 6: Rate Limiting & Resource Control

**IMPLEMENT** rate limiting at multiple levels:

```python
# src/server/middleware/rate_limit.py
from collections import defaultdict
from datetime import datetime, timedelta
import threading

class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(list)
        self.lock = threading.Lock()
        
        # Configurable limits
        self.limits = {
            "default": {"requests": 100, "window": 60},  # 100 req/min
            "file_read": {"requests": 50, "window": 60},
            "database_query": {"requests": 10, "window": 60},
            "execute_code": {"requests": 5, "window": 300}  # 5 per 5 min
        }
    
    def check_rate_limit(self, client_id: str, tool_name: str) -> bool:
        limit_config = self.limits.get(tool_name, self.limits["default"])
        window = timedelta(seconds=limit_config["window"])
        max_requests = limit_config["requests"]
        
        with self.lock:
            now = datetime.now()
            key = f"{client_id}:{tool_name}"
            
            # Clean old requests
            self.requests[key] = [
                req_time for req_time in self.requests[key]
                if now - req_time < window
            ]
            
            # Check limit
            if len(self.requests[key]) >= max_requests:
                return False
            
            # Add current request
            self.requests[key].append(now)
            return True
```

### RULE SET 7: Logging & Monitoring

**LOG** every security-relevant event:

```python
# src/server/middleware/logging.py
import json
import hashlib
from datetime import datetime

class SecurityLogger:
    def __init__(self):
        self.sensitive_params = ["password", "token", "secret", "key"]
    
    def log_tool_call(self, context):
        # Hash sensitive params
        safe_params = self._sanitize_params(context['params'])
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event": "mcp_tool_call",
            "client_id": context.get('client_id'),
            "tool": context.get('tool_name'),
            "params_hash": hashlib.sha256(
                json.dumps(safe_params).encode()
            ).hexdigest(),
            "success": context.get('success'),
            "duration_ms": context.get('duration_ms'),
            "error": context.get('error')
        }
        
        # Write to stdout for container log collection
        print(json.dumps(log_entry))
```

### RULE SET 8: Environment Configuration

**CREATE** `.env.template`:

```bash
# .env.template (NEVER commit actual .env)
# Authentication
JWKS_URL=https://your-idp.com/.well-known/jwks.json
MCP_AUDIENCE=mcp-server-prod
TOKEN_ISSUER=https://your-idp.com

# Server Configuration
SERVER_PORT=8080
SERVER_HOST=0.0.0.0
MAX_REQUEST_SIZE=1048576  # 1MB

# Security
ENABLE_RATE_LIMITING=true
MAX_REQUESTS_PER_MINUTE=100
ENABLE_AUDIT_LOG=true

# Tool Permissions (JSON array of allowed tools)
ALLOWED_TOOLS=["read_file","list_directory"]

# Never log these
SECRET_API_KEY=  # Leave empty in template
DATABASE_PASSWORD=  # Leave empty in template
```

---

## Quick Start Commands for Claude Code

```bash
# 1. Initialize MCP server project with security rules
claude-code init mcp-server --template secure-mcp

# 2. Generate tool with security validation
claude-code generate tool --name "my_tool" --secure

# 3. Run security audit
claude-code audit security --level strict

# 4. Generate security tests
claude-code generate tests --type security

# 5. Check for vulnerabilities
claude-code scan --include-sast --include-secrets
```

---

## Critical Security Checklist

Before deploying your MCP server, verify:

- [ ] **Authentication**: OAuth 2.1 implemented with token validation
- [ ] **Input Validation**: Every tool validates ALL parameters
- [ ] **Path Security**: No path traversal possible
- [ ] **Injection Prevention**: SQL/Command/LDAP injection blocked
- [ ] **Rate Limiting**: Implemented per tool and per client
- [ ] **Container Security**: Running as non-root with resource limits
- [ ] **Logging**: Structured logs without sensitive data
- [ ] **Error Handling**: Never expose internal details in errors
- [ ] **TLS**: HTTPS only with TLS 1.3 minimum
- [ ] **Testing**: Security tests cover all OWASP Top 10

---

## Emergency Response

If security breach detected:

1. **Activate kill switch** - Block all requests immediately
2. **Revoke tokens** - Invalidate all active sessions
3. **Rotate secrets** - Change all API keys and passwords
4. **Audit logs** - Review last 24 hours of activity
5. **Patch & redeploy** - Fix vulnerability and deploy update