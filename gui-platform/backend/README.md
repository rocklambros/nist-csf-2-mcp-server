# NIST CSF GUI Backend

RESTful API backend service that provides a clean interface to the NIST CSF MCP server for the responsive assessment GUI.

## Features

- **MCP Integration**: Direct communication with 40+ NIST CSF MCP tools
- **Real-time Updates**: WebSocket server for live dashboard streaming
- **Assessment Workflow**: Complete assessment lifecycle with progress persistence
- **Company-Size Intelligence**: Filtered questions and benchmarks by organization size
- **Performance Optimized**: <200ms response times with intelligent caching
- **Production Ready**: Comprehensive error handling, logging, and monitoring

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## API Endpoints

### Assessment Management
- `POST /api/profiles` - Create organization profile
- `GET /api/profiles` - List available profiles
- `POST /api/assessments/start` - Start assessment workflow
- `POST /api/assessments/{workflowId}/answers` - Submit question responses
- `GET /api/assessments/{workflowId}/progress` - Get assessment progress
- `POST /api/assessments/{workflowId}/pause` - Pause assessment
- `POST /api/assessments/{workflowId}/resume` - Resume assessment

### Dashboard Data
- `GET /api/dashboard/{profileId}` - Complete dashboard data
- `GET /api/dashboard/{profileId}/benchmarks` - Industry benchmarks
- `GET /api/dashboard/{profileId}/realtime` - Real-time updates

### Health & Monitoring
- `GET /health` - Server health status
- `WebSocket /ws` - Real-time progress updates

## Quality Standards

- **TypeScript Strict Mode**: Full type safety enforcement
- **ESLint**: Recommended rules with zero tolerance for unused variables
- **Test Coverage**: 80%+ coverage requirement
- **Error Handling**: Comprehensive error scenarios with user-friendly messages
- **Performance**: <200ms response time target
- **Security**: Helmet, CORS, input validation, and sanitization

## Environment Configuration

```env
PORT=3001
MCP_SERVER_PATH=../dist/index.js
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
NODE_ENV=development
```

## Architecture

```
backend/
├── src/
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic and MCP integration
│   ├── utils/            # Logging and utilities
│   ├── types/            # TypeScript type definitions
│   └── __tests__/        # Comprehensive test suite
├── dist/                 # Compiled JavaScript output
└── logs/                 # Application logs
```

## Development

```bash
# Run with hot reloading
npm run dev

# Run tests with coverage
npm run test:coverage

# Lint and type checking
npm run lint
npm run typecheck

# Watch mode for TDD
npm run test:watch
```

## Production Deployment

The backend integrates seamlessly with the existing NIST CSF MCP server and provides a clean REST API for the React frontend. It includes comprehensive monitoring, logging, and error handling suitable for production use.