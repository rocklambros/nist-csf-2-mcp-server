# Docker Deployment Troubleshooting Guide

## 🚀 Guaranteed Working Deployment

### Quick Fix for "const" Error
```bash
# Complete cleanup and fresh build
docker system prune -a -f
cd nist-csf-gui  
docker-compose build --no-cache
docker-compose up
```

### Individual Service Testing
```bash
# Test each service independently
docker-compose build --no-cache nist-csf-mcp      # MCP Server
docker-compose build --no-cache gui-backend       # Backend API  
docker-compose build --no-cache gui-frontend      # React GUI

# Start services one by one
docker-compose up nist-csf-mcp -d
docker-compose up gui-backend -d  
docker-compose up gui-frontend -d
```

## 🔧 Common Issues and Solutions

### Issue: "unknown instruction: const"
**Cause**: Docker cache corruption or multiline HEALTHCHECK syntax
**Solution**:
```bash
docker system prune -a -f
docker-compose build --no-cache --force-rm
```

### Issue: TypeScript compilation errors
**Cause**: Zod v4 syntax incompatibility or missing dev dependencies  
**Solution**: 
- Fixed in backend: `npm ci` (includes dev dependencies)
- Fixed in frontend: Simplified Zod schema syntax

### Issue: React build failures
**Cause**: Missing TypeScript compiler or Tailwind CSS configuration
**Solution**:
- Removed complex Tailwind setup
- Simplified validation schemas
- Added all required React dependencies

### Issue: Volume mounting errors
**Cause**: Database file vs directory mounting confusion
**Fix**: Use named volumes instead of bind mounts for database

## ✅ Verification Steps

### 1. Environment Check
```bash
docker --version    # Should be Docker 20.0+
docker-compose --version  # Any recent version
```

### 2. Port Availability  
```bash
lsof -i :3000    # Should be free for frontend
lsof -i :3001    # Should be free for backend
```

### 3. Build Validation
```bash
# Each service should build without errors
docker-compose build nist-csf-mcp
docker-compose build gui-backend  
docker-compose build gui-frontend
```

### 4. Health Check Validation
```bash
# Start services and test endpoints
curl http://localhost:3001/health    # Backend health
curl http://localhost:3000/health    # Frontend health
```

## 🎯 Working Deployment Commands

### Professional Assessment GUI
```bash
git clone https://github.com/rocklambros/nist-csf-2-mcp-server.git
cd nist-csf-2-mcp-server/nist-csf-gui
docker-compose up
```

### URLs
- 🌐 Assessment Interface: http://localhost:3000
- 🔧 Backend API: http://localhost:3001
- 📊 Health Status: http://localhost:3001/health

## ⚠️ Known Limitations

1. **First Startup**: May take 2-3 minutes for database initialization
2. **Port Conflicts**: Ensure ports 3000 and 3001 are available
3. **Memory Usage**: Requires ~2GB available memory for all services
4. **Node Version**: Some React dependencies require Node 18+ compatibility

## 🆘 Emergency Reset

If all else fails:
```bash
# Nuclear option - complete reset
docker system prune -a -f
docker volume prune -f
rm -rf nist-csf-gui/backend/node_modules nist-csf-gui/frontend/node_modules
docker-compose build --no-cache --force-rm
```