# Container Registry Strategy
## NIST CSF 2.0 MCP Server

## 🏪 Available Registries

### GitHub Container Registry (Primary)
```bash
# Pull from GitHub Container Registry (recommended for CI/CD)
docker pull ghcr.io/rocklambros/nist-csf-2-mcp-server:latest
```

**Benefits:**
- ✅ Integrated with GitHub Actions
- ✅ Free for public repositories  
- ✅ Automatic vulnerability scanning
- ✅ Fine-grained access control

### Docker Hub (Public Distribution)
```bash
# Pull from Docker Hub (easiest for end users)
docker pull rocklambros/nist-csf-mcp-server:latest
```

**Benefits:**
- ✅ Highest discoverability
- ✅ Integrated with Docker Desktop
- ✅ Official Docker registry
- ✅ Auto-builds from GitHub

## 🏷️ Image Tagging Strategy

### Production Tags
- `latest` - Latest stable release from main branch
- `v2.1.0` - Specific version tags for production deployments
- `v2.1` - Major.minor tags for compatibility
- `v2` - Major version tags for long-term support

### Development Tags  
- `main` - Latest commit from main branch
- `develop` - Latest commit from develop branch
- `pr-123` - Pull request specific builds

### Platform Tags
- `latest-amd64` - x86_64 architecture specific
- `latest-arm64` - ARM64 architecture specific  
- `latest` - Multi-architecture manifest

## 🔒 Security & Compliance

### Image Scanning
```bash
# Automatic vulnerability scanning with Trivy
docker scan rocklambros/nist-csf-mcp-server:latest

# Manual security scan
trivy image rocklambros/nist-csf-mcp-server:latest
```

### Supply Chain Security
- ✅ **Multi-stage builds** reduce attack surface
- ✅ **Non-root execution** (UID 10001)
- ✅ **Minimal base image** (Alpine Linux)
- ✅ **Signed images** with Docker Content Trust
- ✅ **SBOM generation** for compliance

### Image Verification
```bash
# Verify image signature (when available)
docker trust inspect --pretty rocklambros/nist-csf-mcp-server:latest

# Check image metadata
docker inspect rocklambros/nist-csf-mcp-server:latest
```

## 📊 Registry Metrics

### Image Stats
- **Size**: ~200MB compressed (~500MB uncompressed)
- **Layers**: 8 optimized layers with maximum caching
- **Architectures**: linux/amd64, linux/arm64
- **Base OS**: Alpine Linux 3.18

### Performance Metrics
- **Build Time**: ~3-5 minutes (with caching: ~30 seconds)
- **Pull Time**: ~15 seconds on fast connection
- **Startup Time**: ~2-3 seconds cold start
- **Memory Usage**: ~50MB baseline + request processing

## 🚀 Enterprise Registry Support

### Private Registry Deployment
```bash
# For air-gapped or private environments
docker tag rocklambros/nist-csf-mcp-server:latest your-registry.com/nist-csf-mcp-server:latest
docker push your-registry.com/nist-csf-mcp-server:latest
```

### Registry Configuration
```yaml
# docker-compose.yml for private registry
services:
  mcp-server:
    image: your-registry.com/nist-csf-mcp-server:latest
    pull_policy: always
```

### Offline Installation
```bash
# Save image for offline transfer
docker save rocklambros/nist-csf-mcp-server:latest | gzip > nist-csf-mcp-server.tar.gz

# Load on target system
gunzip -c nist-csf-mcp-server.tar.gz | docker load
```

## 🔄 Update Strategy

### Automatic Updates
```bash
# Watchtower for automatic updates (production use with care)
docker run -d --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --interval 3600 mcp-server
```

### Manual Updates
```bash
# Update to latest version
docker-compose pull
docker-compose up -d --force-recreate
```

### Rollback Strategy
```bash
# Quick rollback to previous version
docker tag rocklambros/nist-csf-mcp-server:v2.0.0 rocklambros/nist-csf-mcp-server:latest
docker-compose up -d --force-recreate
```

## 📈 Registry Analytics

### Pull Statistics
- Track Docker Hub pulls for adoption metrics
- Monitor GitHub Container Registry usage
- Analyze geographic distribution of usage
- Track version adoption rates

### Success Metrics
- **Monthly pulls**: Target 1000+ (enterprise adoption indicator)
- **Version distribution**: Latest version adoption rate
- **Platform distribution**: amd64 vs arm64 usage
- **Geographic spread**: Global vs regional adoption