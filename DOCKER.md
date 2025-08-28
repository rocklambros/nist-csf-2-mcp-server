# Docker Deployment Guide
## NIST CSF 2.0 MCP Server

## 🚀 Quick Start

### Instant Deployment (5 seconds)
```bash
git clone https://github.com/rocklambros/nist-csf-2-mcp-server.git
cd nist-csf-2-mcp-server
docker-compose up -d
```

**That's it!** Server running on `http://localhost:8080` with full NIST CSF 2.0 framework data.

## 📋 Prerequisites

- **Docker Engine** 20.10+ and **Docker Compose** 2.0+
- **2GB RAM** and **1GB disk space**
- **Port 8080** available (configurable)

## 🏗️ Deployment Options

### Production Deployment (Recommended)
```bash
# Full production stack with persistence, monitoring, security
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f mcp-server
```

**Features:**
- ✅ Data persistence across restarts
- ✅ Health checks and auto-restart
- ✅ Resource limits (512MB RAM, 1 CPU)
- ✅ Security hardening (non-root user, read-only filesystem)
- ✅ Structured logging with rotation

### Development Deployment
```bash
# Quick testing without persistence
docker run --rm -p 8080:8080 nist-csf-mcp-server:latest
```

### Custom Configuration
```bash
# Override environment variables
docker run -p 8080:8080 \
  -e AUTH_MODE=simple \
  -e API_KEY=your-secure-key \
  -e LOG_LEVEL=debug \
  nist-csf-mcp-server:latest
```

## 🔧 Configuration

### Environment Variables
```bash
# Security Configuration
AUTH_MODE=disabled          # disabled|simple|oauth
API_KEY=your-api-key-here   # Required when AUTH_MODE=simple
LOG_LEVEL=info              # debug|info|warn|error

# Server Configuration  
SERVER_PORT=8080            # Server port (default: 8080)
SERVER_HOST=0.0.0.0        # Server host (default: 0.0.0.0)
NODE_ENV=production         # Node environment

# Feature Toggles
ENABLE_MONITORING=true      # Performance monitoring
ANALYTICS_ENABLED=true     # Usage analytics
RATE_LIMIT_ENABLED=true    # DDoS protection
```

### Volume Mounts
```yaml
# docker-compose.yml volumes section
volumes:
  - ./data:/app/data:rw          # Framework data persistence
  - ./logs:/app/logs:rw          # Application logs
  - ./secrets:/app/secrets:ro    # Secrets/certificates
```

## 🚀 Production Deployment

### Load Balanced Setup
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - mcp-server-1
      - mcp-server-2
      - mcp-server-3

  mcp-server-1:
    extends: 
      file: docker-compose.yml
      service: mcp-server
    ports:
      - "8081:8080"

  mcp-server-2:
    extends:
      file: docker-compose.yml  
      service: mcp-server
    ports:
      - "8082:8080"

  mcp-server-3:
    extends:
      file: docker-compose.yml
      service: mcp-server
    ports:
      - "8083:8080"
```

### Health Monitoring
```bash
# Check container health
docker-compose exec mcp-server wget -qO- http://localhost:8080/health

# Monitor logs
docker-compose logs -f --tail=50 mcp-server

# Container metrics
docker stats mcp-server
```

## 🔒 Security Best Practices

### Container Security
- ✅ **Non-root user** (UID 10001)
- ✅ **Read-only filesystem** with tmpfs for writable areas
- ✅ **Minimal capabilities** (dropped ALL, added only necessary)
- ✅ **Security profiles** (AppArmor, no-new-privileges)
- ✅ **Resource limits** prevent DoS attacks

### Network Security
```yaml
# Bind to localhost only (production)
ports:
  - "127.0.0.1:8080:8080"

# Custom network isolation
networks:
  mcp-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Secrets Management
```bash
# Use Docker secrets for production
echo "your-api-key" | docker secret create mcp_api_key -
echo "jwt-secret-key" | docker secret create mcp_jwt_secret -

# Reference in docker-compose.yml
secrets:
  - mcp_api_key
  - mcp_jwt_secret
```

## 🐛 Troubleshooting

### Common Issues

**Port 8080 already in use:**
```bash
# Find process using port
lsof -i :8080
# Kill process or change port
docker-compose -f docker-compose.yml -p custom up -d
```

**Container won't start:**
```bash
# Check logs
docker-compose logs mcp-server

# Debug container
docker run -it --rm nist-csf-mcp-server:latest sh
```

**Performance issues:**
```bash
# Increase memory limit
docker-compose up -d --scale mcp-server=1 
# Edit docker-compose.yml: memory: 1G

# Monitor resources
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

**Database issues:**
```bash
# Rebuild with fresh database
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 📊 Monitoring & Observability

### Health Checks
```bash
# Application health
curl http://localhost:8080/health

# Container health  
docker inspect --format='{{.State.Health.Status}}' mcp-server
```

### Metrics Collection
```bash
# Export metrics (if enabled)
curl http://localhost:8080/metrics

# Log analysis
docker-compose logs --since 1h mcp-server | grep ERROR
```

### Performance Monitoring
```bash
# Response time monitoring
time curl -s http://localhost:8080/health

# Concurrent connection testing  
ab -n 1000 -c 10 http://localhost:8080/health
```

## 🔄 Updates & Maintenance

### Update to Latest Version
```bash
# Pull latest image
docker-compose pull

# Restart with new image
docker-compose up -d --force-recreate

# Verify update
docker-compose exec mcp-server node --version
```

### Backup & Restore
```bash
# Backup data volume
docker run --rm -v nist-csf-2-mcp-server_data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz /data

# Restore data volume  
docker run --rm -v nist-csf-2-mcp-server_data:/data -v $(pwd):/backup alpine tar xzf /backup/data-backup.tar.gz -C /
```

## 🎯 Performance Tuning

### Resource Optimization
```yaml
# docker-compose.yml optimizations
deploy:
  resources:
    limits:
      cpus: '2.0'        # Scale based on load
      memory: 1G         # Increase for large datasets
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Node.js Optimization
```bash
# Environment tuning
NODE_OPTIONS="--max-old-space-size=1024 --optimize-for-size"
UV_THREADPOOL_SIZE=8  # For concurrent operations
```

---

## 🚀 Next: Enterprise Deployment

For Kubernetes, AWS ECS, and enterprise orchestration, see our [Enterprise Deployment Guide](KUBERNETES.md).

For Claude Desktop integration with Docker, see [MCP Client Integration](README.md#mcp-client-integration).