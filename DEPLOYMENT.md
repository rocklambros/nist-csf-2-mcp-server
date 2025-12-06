# Deployment Guide

## Professional Assessment GUI Deployment

### Docker Compose (Recommended)
```bash
cd nist-csf-gui
docker-compose up
```

### Manual Setup
```bash
# Backend
cd nist-csf-gui/backend
npm install && npm run build && npm start

# Frontend  
cd nist-csf-gui/frontend
npm install && npm run build && npm start
```

### Environment Configuration
```bash
# Backend (.env)
PORT=3001
MCP_SERVER_PATH=../dist/index.js
CORS_ORIGIN=http://localhost:3000

# Frontend (.env)
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_WEBSOCKET_URL=ws://localhost:3001
```

## MCP Server Deployment

### Docker (Recommended)
```bash
docker run -p 3000:3000 ghcr.io/rocklambros/nist-csf-2-mcp-server:latest
```

### Native Installation
```bash
npm install && npm run build && npm start
```

## Security Configuration

### Development
```bash
AUTH_MODE=disabled docker-compose up
```

### Production
```bash
AUTH_MODE=oauth OAUTH_ISSUER=https://your-provider.com docker-compose up
```

## Monitoring

### Health Checks
- GUI: http://localhost:3000
- Backend: http://localhost:3001/health
- MCP Server: Built-in health monitoring

### Logs
```bash
docker-compose logs -f gui-backend
docker-compose logs -f nist-csf-mcp
```