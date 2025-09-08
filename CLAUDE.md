# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive **Model Context Protocol (MCP) server** implementation for the **NIST Cybersecurity Framework 2.0**. The server provides programmatic access to all NIST CSF 2.0 elements with enterprise-grade security, comprehensive assessment capabilities, advanced reporting features, and a complete suite of 38 MCP tools.

**Current State**: Production-ready with ~32K lines of TypeScript code, comprehensive Docker support, dual-mode operation (MCP + HTTP REST API), and extensive documentation.

## Technology Stack

- **Runtime**: Node.js 20.x+ with TypeScript 5.x
- **Database**: SQLite3 with comprehensive schema for NIST CSF 2.0 (1.8MB+ of framework data)
- **Security**: Multi-tier authentication (disabled/simple/oauth) with comprehensive validation
- **Testing**: Jest with extensive test suites (unit, integration, security, performance)
- **Build**: TypeScript compilation with Docker support and fallback mechanisms
- **Validation**: Zod schemas for input validation and type safety
- **Deployment**: Docker containerization with multi-stage builds and health checks
- **APIs**: Dual-mode server supporting both MCP protocol and HTTP REST endpoints

## Development Setup

### Environment Setup
```bash
# Install Node.js dependencies
npm install

# Build TypeScript code
npm run build

# Initialize database with NIST CSF 2.0 data
npm run import:csf-framework

# Verify database integrity
npm run db:verify

# Optionally seed comprehensive question bank (424 questions)
npm run seed:questions
```

### Running the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode (MCP server)
npm start

# HTTP REST API mode
npm run start:http

# With monitoring enabled
ENABLE_MONITORING=true npm start

# With specific authentication mode
AUTH_MODE=simple API_KEY=test-key npm start

# Docker deployment
docker build -t nist-csf-mcp-server .
docker run -p 3000:3000 nist-csf-mcp-server
```

### Testing
```bash
# Run all tests with coverage
npm test

# Run specific test suites
npm run test:integration     # Database and service integration
npm run test:e2e            # End-to-end workflow validation
npm run test:security       # Security validation suite
npm run test:performance    # Performance benchmarking

# Code quality checks
npm run lint                # ESLint code linting
npm run typecheck           # TypeScript type checking
npm run format             # Prettier code formatting
```

## Architecture

### TypeScript MCP Server Structure
The server implements a comprehensive cybersecurity assessment platform following enterprise patterns:

#### Core Architecture Layers

1. **MCP Protocol Layer** (`src/index.ts`)
   - Main MCP server implementation using `@modelcontextprotocol/sdk-typescript`
   - Tool registration and request routing
   - Error handling and response formatting
   - Protocol-compliant message handling

2. **Tool Implementation Layer** (`src/tools/`)
   - 38 comprehensive MCP tools covering all NIST CSF 2.0 functions
   - Type-safe tool interfaces with Zod validation schemas
   - Consistent error handling and logging patterns
   - Modular design for maintainability
   - Interactive tools with user prompting capabilities

3. **Database Layer** (`src/db/`)
   - SQLite database with comprehensive NIST CSF 2.0 schema
   - Type-safe database operations with prepared statements
   - Performance monitoring wrapper for database operations
   - Transaction management for data consistency

4. **Service Layer** (`src/services/`)
   - Business logic services for assessment calculations
   - Framework data loading and management
   - Report generation engine with multiple formats
   - Risk scoring algorithms and maturity calculations

5. **Security & Validation Layer**
   - Multi-tier authentication system (disabled/simple/oauth)
   - Comprehensive input validation with Zod schemas
   - SQL injection and XSS prevention
   - Rate limiting and audit logging

6. **Monitoring & Analytics Layer** (`src/utils/`)
   - Structured logging with Winston
   - Performance metrics collection
   - Usage analytics and monitoring
   - Health checks and system diagnostics

### Data Flow Architecture
```
Client Request (MCP Protocol)
  ↓
Tool Router (src/index.ts)
  ↓
Tool Implementation (src/tools/*.ts)
  ↓
Input Validation (Zod Schemas)
  ↓
Service Layer (src/services/*.ts)
  ↓
Database Layer (src/db/*.ts)
  ↓
Response Formatting (MCP Protocol)
  ↓
Client Response
```

### Security-First Implementation

#### Input Validation & Type Safety
- **Zod Schema Validation**: Every tool parameter validated with comprehensive schemas
- **TypeScript Strict Mode**: Complete type safety with strict null checks
- **SQL Injection Prevention**: Parameterized queries throughout the application
- **Input Sanitization**: Automatic sanitization of user inputs
- **Type Guards**: Runtime type checking for external data

#### Authentication & Authorization
- **Progressive Security Model**: Choose appropriate security level for your environment
  - `AUTH_MODE=disabled`: No authentication (development/testing)
  - `AUTH_MODE=simple`: API key authentication (basic security)
  - `AUTH_MODE=oauth`: Full OAuth 2.1 + JWT (enterprise security)
- **Token Validation**: JWT signature verification with JWKS support
- **Scope-Based Access**: Granular permissions per tool
- **Session Management**: Secure session handling with proper expiration

#### Security Monitoring
- **Audit Logging**: Comprehensive audit trail for all operations
- **Rate Limiting**: Configurable request rate limits per client
- **Error Sanitization**: Secure error messages without sensitive information disclosure
- **Security Event Logging**: Real-time security event monitoring

### Database Schema (SQLite)

#### Framework Reference Tables
- **`functions`**: 6 core CSF functions (GV, ID, PR, DE, RS, RC)
- **`categories`**: 23 framework categories with detailed information
- **`subcategories`**: 106 subcategories with implementation guidance
- **`implementation_examples`**: Practical implementation examples

#### Assessment & Organization Tables
- **`organization_profiles`**: Organization metadata and sector information
- **`profiles`**: Assessment profiles (current, target, comparative)
- **`profile_assessments`**: Individual subcategory assessments and maturity scores
- **`question_bank`**: 424 comprehensive assessment questions across 4 dimensions
- **`question_responses`**: Assessment response tracking with validation

#### Analysis & Planning Tables
- **`gap_analyses`**: Gap analysis results with priority recommendations
- **`priority_matrices`**: Implementation prioritization matrices
- **`implementation_plans`**: Detailed roadmaps with phases and timelines
- **`cost_estimates`**: Financial projections and ROI analysis
- **`milestones`**: Project milestones with deliverables and tracking

#### Audit & Compliance Tables
- **`audit_trail`**: Comprehensive audit logging for compliance
- **`reports`**: Generated reports with metadata and content
- **`evidence`**: Evidence management with file metadata
- **`compliance_mappings`**: Multi-framework compliance relationships

## File Structure Convention

```
nist-csf-2-mcp-server/
├── src/
│   ├── index.ts                      # Main MCP server entry point
│   ├── types/
│   │   └── index.ts                  # TypeScript type definitions
│   ├── db/
│   │   ├── database.ts               # SQLite connection and operations
│   │   └── monitored-database.ts     # Performance monitoring wrapper
│   ├── services/
│   │   ├── framework-loader.ts       # NIST CSF data loading service
│   │   ├── assessment-engine.ts      # Assessment calculation engine
│   │   └── report-generator.ts       # Report generation service
│   ├── tools/                        # MCP Tool Implementations (36 tools)
│   │   ├── csf_lookup.ts             # Framework element lookup
│   │   ├── search_framework.ts       # Advanced framework search
│   │   ├── create_profile.ts         # Organization profile management
│   │   ├── quick_assessment.ts       # Rapid assessment workflow
│   │   ├── assess_maturity.ts        # Comprehensive maturity assessment
│   │   ├── calculate_risk_score.ts   # Risk scoring and analysis
│   │   ├── generate_gap_analysis.ts  # Gap analysis generation
│   │   ├── generate_priority_matrix.ts # Priority matrix creation
│   │   ├── create_implementation_plan.ts # Implementation planning
│   │   ├── track_progress.ts         # Progress tracking and updates
│   │   ├── generate_report.ts        # Comprehensive reporting
│   │   ├── generate_executive_report.ts # Executive-level reporting
│   │   ├── generate_compliance_report.ts # Multi-framework compliance
│   │   ├── generate_audit_report.ts  # Audit reporting with findings
│   │   ├── create_custom_report.ts   # Custom report builder
│   │   ├── generate_dashboard.ts     # Real-time dashboard generation
│   │   ├── upload_evidence.ts        # Evidence management
│   │   ├── track_audit_trail.ts      # Audit trail tracking
│   │   ├── get_assessment_questions.ts # 424-question assessment bank
│   │   ├── validate_assessment_responses.ts # Response validation
│   │   ├── get_implementation_guidance.ts # Implementation guidance
│   │   └── [18 more tools...]        # Additional specialized tools
│   ├── utils/
│   │   ├── enhanced-logger.ts        # Winston structured logging
│   │   ├── metrics.ts               # Performance metrics collection
│   │   └── analytics.ts             # Usage analytics and monitoring
│   └── CLAUDE.md                    # This file
├── tests/
│   ├── tools/                       # Tool-specific unit tests
│   ├── integration/                 # Database and service integration tests
│   ├── performance/                 # Performance benchmarking tests
│   ├── security/                    # Security validation tests
│   └── validation/                  # Business logic validation tests
├── data/
│   └── csf-2.0-framework.json       # Official NIST CSF 2.0 reference data
├── PROMPTS.md                       # LLM prompt examples for all 36 tools
├── CONTRIBUTING.md                  # Contribution guidelines and standards
├── package.json                     # Node.js dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # Comprehensive project documentation
```

## MCP Tools Implementation Guidelines

When implementing or modifying MCP tools in this codebase:

### 1. Tool Structure Requirements
Every tool MUST follow this pattern:
```typescript
import { z } from 'zod';
import { Tool } from '../types';
import Database from '../db/database';
import { logger } from '../utils/enhanced-logger';

// Define Zod schema for input validation
const ToolNameSchema = z.object({
  required_param: z.string().min(1),
  optional_param: z.string().optional(),
  // ... other parameters
});

type ToolNameParams = z.infer<typeof ToolNameSchema>;

export async function toolName(params: unknown): Promise<any> {
  try {
    // 1. Validate input parameters
    const validatedParams = ToolNameSchema.parse(params);
    
    // 2. Business logic implementation
    const db = Database.getInstance();
    // ... implementation
    
    // 3. Return structured response
    return {
      success: true,
      data: result,
      // ... response fields
    };
  } catch (error) {
    logger.error('Tool execution error', { tool: 'toolName', error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export tool definition
export const toolNameTool: Tool = {
  name: 'tool_name',
  description: 'Clear, comprehensive description of tool functionality',
  inputSchema: {
    type: 'object',
    properties: {
      // JSON Schema derived from Zod schema
    },
    required: ['required_param']
  }
};
```

### 2. Input Validation Requirements
For EVERY parameter:
- **Type Validation**: Use Zod schemas for comprehensive type checking
- **Range/Size Validation**: Implement appropriate limits and constraints
- **Business Logic Validation**: Validate against business rules and dependencies
- **Sanitization**: Automatic input sanitization for security
- **Error Handling**: Consistent error messages and logging

### 3. Database Operation Requirements
All database operations MUST:
- **Use Prepared Statements**: Prevent SQL injection with parameterized queries
- **Handle Transactions**: Use transactions for multi-operation consistency
- **Error Handling**: Proper database error handling and connection management
- **Performance Monitoring**: Utilize the monitored database wrapper
- **Type Safety**: Use TypeScript interfaces for database results

### 4. Error Handling & Logging
Implement comprehensive error handling:
```typescript
try {
  // Tool implementation
} catch (error) {
  // Log error with context
  logger.error('Tool execution error', {
    tool: 'toolName',
    params: sanitizedParams, // Remove sensitive data
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  
  // Return user-friendly error response
  return {
    success: false,
    error: getPublicErrorMessage(error)
  };
}
```

### 5. Security Implementation Checklist
Every tool implementation MUST:
- [ ] **Input Validation**: Comprehensive Zod schema validation
- [ ] **SQL Injection Prevention**: Use parameterized queries only
- [ ] **XSS Prevention**: Sanitize all user inputs
- [ ] **Error Sanitization**: No sensitive information in error messages
- [ ] **Authentication Check**: Respect authentication requirements
- [ ] **Rate Limiting**: Consider rate limiting for resource-intensive operations
- [ ] **Audit Logging**: Log all significant operations

### 6. Testing Requirements
Every tool MUST have:
- [ ] **Unit Tests**: Test core functionality with various inputs
- [ ] **Integration Tests**: Test database interactions and workflows
- [ ] **Security Tests**: Test input validation and security measures
- [ ] **Error Handling Tests**: Test error conditions and edge cases
- [ ] **Performance Tests**: Benchmark response times and resource usage

### 7. Documentation Requirements
Every tool MUST include:
- [ ] **Tool Description**: Clear, comprehensive functionality description
- [ ] **Parameter Documentation**: All parameters with types and constraints
- [ ] **Response Format**: Expected response structure and fields
- [ ] **Usage Examples**: Practical usage examples in README.md and PROMPTS.md
- [ ] **Error Codes**: Documented error conditions and messages

## NIST CSF 2.0 Implementation

The server provides complete coverage of the NIST Cybersecurity Framework 2.0:

### Core Functions Coverage
- **GV (Govern)**: Organizational cybersecurity governance and risk management
- **ID (Identify)**: Asset management, business environment, and risk assessment
- **PR (Protect)**: Identity management, access control, data security, and protective technology
- **DE (Detect)**: Anomalies and events detection, continuous monitoring
- **RS (Respond)**: Response planning, communications, analysis, mitigation, and improvements
- **RC (Recover)**: Recovery planning, improvements, and communications

### Implementation Features
- **Complete Coverage**: All 6 functions, 23 categories, 106 subcategories
- **Assessment Dimensions**: Risk, Maturity, Implementation, and Effectiveness assessments
- **Question Bank**: 424 comprehensive assessment questions (4 per subcategory)
- **Industry Customization**: Sector-specific guidance and benchmarks
- **Organizational Sizing**: Small, medium, large, and enterprise-specific recommendations
- **Compliance Mapping**: Multi-framework compliance (ISO27001, PCI DSS, HIPAA, GDPR, SOX)

### Data Integrity
- **Official NIST Data**: Based on official NIST CSF 2.0 publication
- **Regular Updates**: Framework data updated to match official NIST releases
- **Validation Scripts**: Database integrity validation and cleanup scripts
- **Comprehensive Testing**: Extensive testing to ensure data accuracy

## Performance & Monitoring

### Performance Standards
- **Response Time**: Sub-100ms average response times for most operations
- **Concurrent Users**: Support for 100+ simultaneous connections
- **Memory Efficiency**: Optimized for long-running deployments
- **Database Optimization**: Indexed queries for large-scale operations

### Monitoring Implementation
- **Real-time Metrics**: Response times, error rates, resource usage
- **Database Monitoring**: Query performance, connection pooling, optimization
- **Security Monitoring**: Authentication events, rate limiting, suspicious activity
- **Health Checks**: Automated system health monitoring and alerting

### Analytics Features
- **Usage Analytics**: Tool usage patterns and performance insights
- **Assessment Analytics**: Completion rates, response patterns, trend analysis
- **Performance Analytics**: System performance metrics and optimization opportunities
- **Business Analytics**: Organizational assessment trends and benchmarks

## Security Considerations

This server implements enterprise-grade security measures:

### Multi-Tier Security Architecture
1. **Development Tier**: No authentication required for easy setup and testing
2. **Basic Security Tier**: API key authentication for simple deployment scenarios
3. **Enterprise Tier**: Full OAuth 2.1 + JWT for production environments

### Security Implementation Standards
- **Defense in Depth**: Multiple security layers for comprehensive protection
- **Zero Trust Principles**: Validate and verify all requests and operations
- **Least Privilege**: Minimal permissions required for operations
- **Security by Default**: Secure configurations and sensible defaults
- **Continuous Monitoring**: Real-time security event monitoring and alerting

### Compliance & Governance
- **NIST Framework Alignment**: Implementation follows NIST cybersecurity principles
- **Data Protection**: GDPR compliance with data privacy and protection measures
- **Audit Readiness**: Comprehensive audit trails and compliance reporting
- **Industry Standards**: Follows industry best practices and security standards

## Docker Deployment

### Container Support
The project includes comprehensive Docker support with:

- **Multi-stage Builds**: Optimized production images with minimal size
- **Build Fallback**: TypeScript compilation with fallback mechanisms for compatibility
- **Health Checks**: Automated container health monitoring
- **Security**: Non-root user execution and minimal attack surface
- **Data Persistence**: Proper volume mounting for database and logs
- **Environment Variables**: Flexible configuration through environment variables

### Docker Commands
```bash
# Build image
docker build -t nist-csf-mcp-server .

# Run with port mapping
docker run -p 3000:3000 nist-csf-mcp-server

# Run with volume mounting
docker run -p 3000:3000 -v $(pwd)/data:/app/data nist-csf-mcp-server

# Docker Compose deployment
docker-compose up -d
```

### Troubleshooting Docker Builds
- The Docker build includes a fallback mechanism for TypeScript compilation
- If TypeScript compilation fails, it uses a simplified file copy approach
- All TypeScript syntax should be avoided in production Docker builds
- Use `npm run build` locally to test TypeScript compilation before Docker builds

## Development Guidelines

### Code Quality Standards
- **TypeScript Strict Mode**: Complete type safety with strict null checks
- **ESLint Configuration**: Comprehensive linting rules for code consistency
- **Prettier Formatting**: Consistent code formatting across the project
- **Test Coverage**: Maintain 95%+ test coverage across all modules

### Git Workflow Standards
- **Feature Branches**: Use feature branches for all development work
- **Branch Protection**: Main branch is protected requiring PR reviews
- **Commit Messages**: Clear, descriptive commit messages following conventional commits
- **Pull Request Reviews**: All changes require at least 1 approval before merging
- **Automated Testing**: All tests must pass before merging
- **No Force Pushes**: Force pushes and direct pushes to main are disabled

### Documentation Standards
- **API Documentation**: Comprehensive documentation for all tools and endpoints
- **Code Comments**: Clear, helpful comments for complex business logic
- **README Updates**: Keep README.md updated with new features and changes
- **Changelog Maintenance**: Document all changes and version updates

## Integration Guidelines

### MCP Client Integration
- **Protocol Compliance**: Full MCP protocol compliance for maximum compatibility
- **Error Handling**: Robust error handling for client applications
- **Response Formatting**: Consistent response formats across all tools
- **Version Compatibility**: Backwards compatibility considerations

### External System Integration
- **GRC Platform Integration**: APIs designed for GRC platform connectivity
- **SIEM Integration**: Security event formats compatible with SIEM systems
- **Business Intelligence**: Data export formats suitable for BI tools
- **Audit System Integration**: Audit trail formats for compliance systems

## Troubleshooting

### Common Development Issues
- **Database Lock Issues**: Use proper transaction management and connection pooling
- **Memory Leaks**: Monitor memory usage and implement proper resource cleanup
- **Type Errors**: Utilize TypeScript strict mode and comprehensive type definitions
- **Performance Issues**: Use the monitoring wrapper and performance profiling tools

### Security Issues
- **Authentication Failures**: Verify token signatures and expiration times
- **Rate Limiting**: Monitor rate limit configurations and client behavior
- **Input Validation**: Ensure all inputs are validated with appropriate schemas
- **Database Security**: Use parameterized queries and validate all database operations

### Deployment Issues
- **Environment Configuration**: Verify all required environment variables
- **Database Initialization**: Ensure database is properly initialized with framework data
- **Port Conflicts**: Check for port availability and conflicts
- **Permission Issues**: Verify file system permissions for database and log files

## Important Instructions for Claude Code

When working with this codebase:

1. **Always Run Tests**: Execute `npm test` before making changes and after completing work
2. **Type Safety**: Maintain strict TypeScript compliance - fix all type errors
3. **Security First**: Never compromise on security validations or error handling
4. **Database Consistency**: Use transactions for multi-operation database changes  
5. **Comprehensive Testing**: Write tests for all new functionality
6. **Documentation Updates**: Update relevant documentation for any changes
7. **Performance Monitoring**: Consider performance implications of all changes
8. **Security Scanning**: Run security tests for any security-related changes
9. **Branch Protection**: Always work on feature branches - main branch is protected
10. **Docker Compatibility**: Consider Docker deployment implications for changes

### Critical Security Patterns

**Always Use Zod Validation**:
```typescript
const schema = z.object({
  param: z.string().min(1).max(100)
});
const validated = schema.parse(input); // This will throw on invalid input
```

**Always Use Parameterized Queries**:
```typescript
// CORRECT
db.prepare('SELECT * FROM table WHERE id = ?').get(userId);

// WRONG - SQL injection vulnerability
db.prepare(`SELECT * FROM table WHERE id = ${userId}`).get();
```

**Always Sanitize Error Messages**:
```typescript
// CORRECT
return { success: false, error: 'Invalid input provided' };

// WRONG - may expose sensitive information  
return { success: false, error: error.message };
```

## Current Project Status (September 2025)

### Production-Ready Implementation ✅

- **Codebase**: 32K+ lines of production-ready TypeScript
- **Tools**: 38 comprehensive MCP tools for NIST CSF 2.0
- **Database**: Fully populated with official NIST framework data (1.8MB+)
- **APIs**: Dual-mode server (MCP + HTTP REST)
- **GUI Platform**: Complete assessment interface with hierarchical navigation
- **Testing**: **100% E2E test success rate** (comprehensive workflow validation)
- **Security**: Multi-tier authentication with enterprise-grade patterns
- **Deployment**: Docker-ready with containerization and orchestration support
- **Data Quality**: Clean question bank with duplicates and undefined text filtered

### Recent Major Improvements ✅

**E2E Testing & Quality (September 2025)**:
- ✅ **Gap analysis functionality restored** (SQL schema fixes)
- ✅ **Implementation planning workflow** (database method additions)
- ✅ **Complete dependency chain** (100% test success vs 60% before)
- ✅ **Production-ready reliability** with comprehensive error handling

**Assessment GUI Platform (September 2025)**:
- ✅ **Hierarchical navigation workflow** (Functions → Categories → Subcategories)
- ✅ **Real-time auto-save functionality** with visual feedback
- ✅ **Clean question quality** (removed duplicates and "undefined" text)
- ✅ **NIST CSF 2.0 compliance** (withdrawn controls filtered out)
- ✅ **Professional user experience** suitable for CISO and executive use

**Technical Infrastructure (September 2025)**:
- ✅ **Port configuration fixes** (proper HTTP_PORT handling)
- ✅ **CORS and API connectivity** (GUI-to-API integration)
- ✅ **Database schema corrections** (fixed foreign key relationships)
- ✅ **Cache-busting mechanisms** (reliable GUI updates)

### Current Functional Status

**Core Workflows**: 100% Operational ✅
- Organization creation and profiling
- Comprehensive assessment execution (185 subcategories)
- Gap analysis and priority matrix generation
- Implementation planning with cost estimates
- Progress tracking and milestone management
- Executive reporting and data export

**Web Assessment Interface**: Production Ready ✅
- **URL**: http://localhost:8081/nist-csf-assessment-gui.html
- **Features**: Complete hierarchical navigation, auto-save, progress tracking
- **Quality**: Clean questions, no duplicates, proper subcategory labeling
- **Experience**: Single-click navigation, visual feedback, session persistence

**API Integration**: Fully Functional ✅
- **HTTP REST API**: http://localhost:3001/api/tools
- **MCP Protocol**: Native Claude Desktop integration
- **Multi-format responses**: JSON, HTML, CSV, PDF exports
- **Authentication**: Multi-tier security (disabled/simple/oauth)

This comprehensive MCP server represents a **production-grade cybersecurity assessment platform** with enterprise-level features, complete testing coverage, and professional user experience. It serves as both a reference implementation for NIST CSF 2.0 and a immediately deployable assessment solution.