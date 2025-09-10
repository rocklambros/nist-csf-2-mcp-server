# Codebase Structure Overview

## Root Directory Structure
```
nist-csf-2-mcp-server/
├── src/                     # TypeScript source code (32K+ lines)
├── tests/                   # Comprehensive test suites
├── data/                    # NIST CSF framework data and database
├── scripts/                 # Build, import, and utility scripts
├── docker-compose.yml       # Production deployment configuration
├── Dockerfile               # Container build definition
├── package.json             # Dependencies and scripts
├── tsconfig.json           # TypeScript compilation settings
└── *.html                  # Assessment GUI interfaces
```

## Source Code Organization (/src)
```
src/
├── index.ts                 # Main MCP server entry point
├── server.ts               # Secure MCP server with authentication
├── http-server.ts          # HTTP REST API server
├── dual-mode-server.ts     # Combined MCP + HTTP server
├── types/index.ts          # TypeScript type definitions
├── db/
│   ├── database.ts         # SQLite connection and operations
│   └── monitored-database.ts # Performance monitoring wrapper
├── services/
│   ├── framework-loader.ts # NIST CSF data loading
│   ├── question-bank.ts    # Assessment question management
│   └── question-seeder.ts  # Question database seeding
├── tools/                  # MCP Tool Implementations (38 tools)
│   ├── csf_lookup.ts       # Framework element lookup
│   ├── create_profile.ts   # Organization profile management
│   ├── assess_maturity.ts  # Maturity assessment
│   ├── generate_gap_analysis.ts # Gap analysis generation
│   └── [34 more tools...]  # Complete CSF workflow coverage
├── utils/
│   ├── enhanced-logger.ts  # Winston structured logging
│   ├── metrics.ts         # Performance metrics
│   └── analytics.ts       # Usage analytics
├── security/
│   ├── auth.ts            # Multi-tier authentication
│   ├── rate-limiter.ts    # Request rate limiting
│   └── validators.ts      # Input validation
└── middleware/
    └── monitoring.ts      # Express middleware for monitoring
```

## Test Organization (/tests)
```
tests/
├── tools/                 # Unit tests for MCP tools
├── integration/           # Database integration tests
├── e2e/                  # End-to-end workflow tests
├── security/             # Security validation tests
├── performance/          # Performance benchmark tests
└── validation/           # Business logic validation
```

## Key Architectural Patterns

### MCP Tool Structure
Each tool follows consistent pattern:
1. **Input Validation**: Zod schema validation
2. **Business Logic**: Core functionality implementation
3. **Database Operations**: Type-safe database interactions
4. **Error Handling**: Structured error responses
5. **Logging**: Comprehensive audit trails

### Database Layer
- **SQLite3**: Production-ready database with NIST CSF 2.0 schema
- **Type Safety**: TypeScript interfaces for all database operations
- **Performance Monitoring**: Query performance tracking
- **Transaction Management**: ACID compliance for data consistency

### Security Architecture
- **Multi-Tier**: Disabled (dev) → Simple (basic) → OAuth (enterprise)
- **Input Validation**: Zod schemas prevent injection attacks
- **Error Sanitization**: Secure error messages
- **Audit Logging**: Comprehensive security event tracking

### Service Layer
- **Framework Management**: NIST CSF data loading and validation
- **Assessment Engine**: Maturity calculations and risk scoring
- **Report Generation**: Multi-format report creation
- **Question Bank**: 424-question comprehensive assessment system