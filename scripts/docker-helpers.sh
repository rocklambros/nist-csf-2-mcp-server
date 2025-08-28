#!/bin/bash
# Docker Helper Scripts for NIST CSF 2.0 MCP Server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check Docker requirements
check_requirements() {
    log "Checking Docker requirements..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker Desktop or Docker Engine."
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose v2."
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running. Please start Docker."
    fi
    
    log "✅ All requirements satisfied"
}

# Quick start function
quick_start() {
    log "🚀 Starting NIST CSF 2.0 MCP Server..."
    
    check_requirements
    
    # Pull latest images if they exist
    docker-compose pull 2>/dev/null || true
    
    # Start services
    docker-compose up -d
    
    log "⏳ Waiting for server to start..."
    sleep 10
    
    # Health check
    if curl -sf http://localhost:8080/health > /dev/null; then
        log "✅ Server is running at http://localhost:8080"
        log "📖 API documentation: http://localhost:8080/docs"
        log "❤️  Health check: http://localhost:8080/health"
    else
        warn "Server may still be starting. Check logs with: docker-compose logs -f"
    fi
}

# Development start
dev_start() {
    log "🔧 Starting development environment..."
    
    check_requirements
    
    # Start development stack
    docker-compose -f docker-compose.dev.yml up -d
    
    log "⏳ Waiting for development server..."
    sleep 15
    
    # Health check
    if curl -sf http://localhost:3000/health > /dev/null; then
        log "✅ Development server running at http://localhost:3000"
        log "🐛 Debugger available on port 9229"
        log "📊 Database viewer: http://localhost:8081"
    else
        warn "Development server may still be starting. Check logs with: docker-compose -f docker-compose.dev.yml logs -f"
    fi
}

# Stop services
stop_services() {
    log "🛑 Stopping services..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    log "✅ All services stopped"
}

# Clean up everything
clean_all() {
    log "🧹 Cleaning up Docker resources..."
    
    # Stop all services
    stop_services
    
    # Remove containers, networks, volumes, and images
    docker-compose down -v --rmi all 2>/dev/null || true
    docker-compose -f docker-compose.dev.yml down -v --rmi all 2>/dev/null || true
    
    # Clean up dangling images
    docker image prune -f
    
    log "✅ Cleanup completed"
}

# Build images locally
build_images() {
    log "🏗️  Building Docker images..."
    
    # Build production image
    docker-compose build --no-cache
    
    # Build development image if dev compose exists
    if [ -f "docker-compose.dev.yml" ]; then
        docker-compose -f docker-compose.dev.yml build --no-cache
    fi
    
    log "✅ Images built successfully"
}

# Show logs
show_logs() {
    local service=${1:-mcp-server}
    local lines=${2:-100}
    
    log "📋 Showing logs for $service (last $lines lines)..."
    docker-compose logs --tail="$lines" -f "$service"
}

# Health check
health_check() {
    log "🏥 Checking service health..."
    
    local prod_url="http://localhost:8080/health"
    local dev_url="http://localhost:3000/health"
    
    echo "Production server (port 8080):"
    if curl -sf "$prod_url" > /dev/null; then
        echo "✅ Healthy"
        curl -s "$prod_url" | jq . 2>/dev/null || curl -s "$prod_url"
    else
        echo "❌ Not responding"
    fi
    
    echo ""
    echo "Development server (port 3000):"
    if curl -sf "$dev_url" > /dev/null; then
        echo "✅ Healthy"
        curl -s "$dev_url" | jq . 2>/dev/null || curl -s "$dev_url"
    else
        echo "❌ Not responding"
    fi
}

# Performance test
performance_test() {
    log "📊 Running performance test..."
    
    local url=${1:-http://localhost:8080/health}
    local requests=${2:-100}
    local concurrency=${3:-10}
    
    if command -v ab &> /dev/null; then
        ab -n "$requests" -c "$concurrency" "$url"
    else
        warn "Apache Bench (ab) not found. Install with: apt-get install apache2-utils"
    fi
}

# Update images
update_images() {
    log "🔄 Updating Docker images..."
    
    # Pull latest images
    docker-compose pull
    
    # Recreate containers with new images
    docker-compose up -d --force-recreate
    
    log "✅ Images updated and containers recreated"
}

# Backup data
backup_data() {
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    log "💾 Creating backup in $backup_dir..."
    
    # Backup volumes
    docker run --rm -v "$(pwd)/data:/data" -v "$backup_dir:/backup" alpine \
        tar czf "/backup/data-backup.tar.gz" -C /data .
    
    # Backup database
    docker-compose exec -T mcp-server sqlite3 /app/nist_csf.db ".backup /app/data/backup.db" || true
    
    log "✅ Backup completed: $backup_dir"
}

# Show help
show_help() {
    cat << EOF
🛠️  Docker Helper Scripts for NIST CSF 2.0 MCP Server

Usage: $0 [command] [options]

Commands:
  start           Quick start production server
  dev             Start development environment  
  stop            Stop all services
  clean           Clean up all Docker resources
  build           Build images locally
  logs [service]  Show service logs (default: mcp-server)
  health          Check service health
  perf [url]      Run performance test
  update          Update images and restart
  backup          Backup data volumes
  help            Show this help message

Examples:
  $0 start                    # Quick start production
  $0 dev                      # Start development mode
  $0 logs mcp-server 50       # Show last 50 logs
  $0 perf http://localhost:8080/health 200 20  # Test with 200 requests, 20 concurrent

Environment Variables:
  COMPOSE_PROJECT_NAME        # Set custom project name (default: nist-csf-2-mcp-server)
  DOCKER_BUILDKIT            # Enable BuildKit (recommended: 1)

EOF
}

# Main script logic
case "${1:-help}" in
    "start"|"up")
        quick_start
        ;;
    "dev"|"development")
        dev_start
        ;;
    "stop"|"down")
        stop_services
        ;;
    "clean"|"cleanup")
        clean_all
        ;;
    "build")
        build_images
        ;;
    "logs")
        show_logs "${2:-mcp-server}" "${3:-100}"
        ;;
    "health"|"status")
        health_check
        ;;
    "perf"|"performance")
        performance_test "${2:-http://localhost:8080/health}" "${3:-100}" "${4:-10}"
        ;;
    "update"|"upgrade")
        update_images
        ;;
    "backup")
        backup_data
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        error "Unknown command: $1. Use '$0 help' for usage information."
        ;;
esac