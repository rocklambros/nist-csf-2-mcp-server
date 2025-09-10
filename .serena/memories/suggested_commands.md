# Suggested Commands for NIST CSF 2.0 MCP Server

## Development Setup
```bash
npm install                 # Install dependencies
npm run build              # Build TypeScript
npm run import:csf-framework # Initialize database with NIST CSF data
npm run db:verify          # Verify database integrity
npm run seed:questions     # Optional: Add 424 assessment questions
```

## Running the Server
```bash
# Development modes
npm run dev                # MCP server only (Claude Desktop)
npm run dev:http           # HTTP server only (Web GUI)
npm run dev:dual           # Both MCP + HTTP in one process

# Production modes
npm start                  # MCP server only
HTTP_PORT=3001 npm run start:http    # HTTP server
HTTP_PORT=8080 npm run start:dual    # Both protocols
```

## GUI Testing
```bash
# Method 1: Separate processes
HTTP_PORT=3001 npm run start:http &    # API server
python3 -m http.server 8081 &         # Static file server
# Access: http://localhost:8081/nist-csf-assessment-gui.html

# Method 2: Single process
HTTP_PORT=8080 npm run start:dual      # Combined server
# Access: http://localhost:8080/nist-csf-assessment-gui.html

# Method 3: Docker
docker-compose up -d                   # Production deployment
# Access: http://localhost:3001/nist-csf-assessment-gui.html
```

## Testing Commands
```bash
npm test                   # All tests with coverage
npm run test:unit         # Unit tests only
npm run test:integration  # Database integration tests
npm run test:e2e          # End-to-end workflow tests
npm run test:security     # Security validation
npm run test:performance  # Performance benchmarks
npm run test:watch        # Watch mode for development
```

## Code Quality
```bash
npm run lint              # ESLint code linting
npm run typecheck         # TypeScript type checking
npm run clean             # Clean build artifacts
```

## Docker Commands
```bash
docker-compose up -d      # Production deployment
npm run docker:build     # Build Docker image
npm run docker:run       # Run with Docker Compose
```

## Database Operations
```bash
npm run db:init           # Full database initialization
npm run import:framework  # Import NIST CSF framework data
npm run cleanup:subcategories # Clean database inconsistencies
npm run import:benchmarks # Import industry benchmarks
```

## Utility Commands (macOS/Darwin)
```bash
lsof -i :3001            # Check port 3001 usage
lsof -i :8081            # Check port 8081 usage
pkill -f "http.server"   # Kill Python file server
pkill -f "node.*http"    # Kill Node HTTP server
```