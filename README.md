# NIST CSF 2.0 MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)
[![Security](https://img.shields.io/badge/Security-Enterprise%20Grade-red.svg)](#security-architecture)

A comprehensive **Model Context Protocol (MCP) server** implementation for the **NIST Cybersecurity Framework 2.0**, providing programmatic access to all framework elements with **36 specialized MCP tools**, enterprise-grade security, comprehensive assessment capabilities, and advanced reporting features. Built for seamless integration with Claude, ChatGPT, and other AI assistants.

## 🚀 Features

### Framework & Assessment
- 📚 **Complete NIST CSF 2.0 Implementation**: Access all 6 functions, 23 categories, and 106 subcategories
- 🔍 **Advanced Querying**: Multi-dimensional search across functions, categories, keywords, and implementation tiers
- 📊 **Comprehensive Assessment Suite**: From quick organizational assessments to detailed maturity evaluations
- 💡 **424-Question Assessment Bank**: Complete question coverage for all subcategories with 4 assessment dimensions each
- 📈 **Risk & Maturity Scoring**: Advanced algorithms for organizational cybersecurity posture measurement
- 🤖 **36 Specialized MCP Tools**: Complete cybersecurity assessment and management toolkit

### Planning & Implementation
- 🎯 **Gap Analysis & Priority Matrices**: Intelligent prioritization based on risk, effort, and business impact
- 📋 **Implementation Planning**: Detailed roadmaps with timelines, costs, milestones, and dependencies  
- 💰 **Cost Estimation**: Comprehensive financial modeling for cybersecurity investments
- 📌 **Progress Tracking**: Real-time implementation progress monitoring with milestone management

### Reporting & Analytics
- 📄 **Executive Reporting**: Business-ready reports for C-level executives and board presentations
- 🏢 **Compliance Reporting**: Multi-framework compliance (ISO27001, PCI DSS, HIPAA, GDPR, SOX)
- 📊 **Custom Dashboards**: Real-time cybersecurity metrics and KPI visualization
- 🔍 **Audit Trails**: Comprehensive audit logging and evidence management

### Enterprise Security
- 🔐 **Multi-tier Authentication**: No-auth (development) → API Key (simple) → OAuth 2.1 (enterprise)
- 🛡️ **Input Validation**: Zod schema validation with SQL injection and XSS prevention
- 📝 **Audit Logging**: Complete audit trails with security event monitoring
- ⚡ **Rate Limiting**: Configurable DDoS protection and resource management

### Developer Experience
- 🧪 **Comprehensive Testing**: 95%+ test coverage with integration, performance, and security tests (70+ test files)
- 📖 **Complete Documentation**: API docs, sample prompts, and integration guides
- 🔧 **Claude Code Ready**: Optimized for AI development workflows with [PROMPTS.md](./PROMPTS.md)
- ⚡ **Performance Optimized**: Sub-100ms response times with intelligent caching
- 🎯 **Production Ready**: Enterprise-grade TypeScript with strict validation and error handling

## 📦 Installation

### Prerequisites
- **Node.js 18.x+** and **npm**
- **SQLite3** (included with Node.js)
- **TypeScript 5.x** (installed via npm)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/rocklambros/nist-csf-2-mcp-server.git
cd nist-csf-2-mcp-server

# 2. Install dependencies
npm install

# 3. Build TypeScript code
npm run build

# 4. Database is pre-populated (no initialization needed)
# The NIST CSF 2.0 database comes ready with all framework data and 424 questions

# 5. Start the server
npm start
```

The server will start on `http://localhost:3000` with authentication disabled for easy testing.

## 🛠️ Quick Start Guide

### 1. Development Mode
```bash
npm run dev  # Auto-reload enabled
```

### 2. Testing the Installation
```bash
npm run test:e2e      # Verify full functionality
```

### 3. Security Configuration
See [Security Configuration](#-security-configuration) for authentication setup.

## 🔧 Environment Configuration

Create a `.env` file for custom configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Database
DATABASE_PATH=./nist_csf.db
FRAMEWORK_DATA_PATH=./data/csf-2.0-framework.json

# Features
ENABLE_MONITORING=true
ANALYTICS_ENABLED=true
RATE_LIMIT_ENABLED=true

# Security (see Security Configuration section)
AUTH_MODE=disabled  # disabled|simple|oauth
API_KEY=your-api-key-here
```

## 🛠️ Complete MCP Tools Suite (36 Tools)

### Framework Query & Search Tools (3 tools)

#### 1. `csf_lookup`
Look up specific CSF elements by ID with detailed information and implementation examples.

#### 2. `search_framework`
Advanced multi-dimensional search across the framework with filters for functions, categories, keywords, and tiers.

#### 3. `get_related_subcategories`
Find related subcategories, dependencies, and cross-functional relationships.

### Organization & Profile Management Tools (3 tools)

#### 4. `create_profile`
Create comprehensive organization cybersecurity profiles with industry-specific guidance and customizable assessment parameters.

#### 5. `clone_profile`
Clone existing profiles for target state planning or comparative analysis with selective modifications.

#### 6. `compare_profiles`
Compare multiple profiles side-by-side with detailed gap analysis and recommendations.

### Assessment & Scoring Tools (8 tools)

#### 7. `quick_assessment`
Rapid organizational assessment using simplified yes/no/partial questionnaire for all six CSF functions.

#### 8. `assess_maturity`
Comprehensive maturity assessment across all functions with detailed recommendations and subcategory analysis.

#### 9. `calculate_risk_score`
Advanced risk scoring with customizable threat weights and heat map visualization.

#### 10. `calculate_maturity_trend`
Track maturity progression over time with statistical analysis and future projections.

#### 11. `get_assessment_questions`
Access the complete 424-question assessment bank with filtering by subcategory and assessment dimensions.

#### 12. `validate_assessment_responses`
Validate assessment responses for completeness, consistency, and business logic compliance.

#### 13. `get_question_context`
Provide additional context and guidance for specific assessment questions.

#### 14. `import_assessment`
Import assessment data from external systems with validation and normalization.

### Planning & Analysis Tools (6 tools)

#### 15. `generate_gap_analysis`
Comprehensive gap analysis between current and target states with priority matrices and cost estimates.

#### 16. `generate_priority_matrix`
Create implementation priority matrices based on effort, impact, risk, and available resources.

#### 17. `estimate_implementation_cost`
Detailed financial modeling for cybersecurity implementations with labor, tools, and ongoing costs.

#### 18. `create_implementation_plan`
Generate phased implementation roadmaps with timelines, dependencies, and resource allocation.

#### 19. `suggest_next_actions`
AI-powered recommendations for next implementation steps based on risk, effort, and business impact.

#### 20. `get_implementation_guidance`
Detailed implementation guidance for specific subcategories with industry-specific recommendations.

### Progress Tracking & Monitoring Tools (4 tools)

#### 21. `track_progress`
Update and track implementation progress across subcategories with milestone tracking.

#### 22. `generate_milestone`
Create and manage project milestones with deliverables and success criteria.

#### 23. `track_audit_trail`
Maintain comprehensive audit trails for compliance and change tracking.

#### 24. `get_industry_benchmarks`
Access industry-specific benchmarks and best practices for comparative analysis.

### Reporting & Analytics Tools (8 tools)

#### 25. `generate_report`
Create comprehensive cybersecurity assessment reports with executive summaries.

#### 26. `generate_executive_report`
Business-ready executive reports for C-level presentations and board meetings.

#### 27. `generate_audit_report`
Detailed audit reports with findings, recommendations, and compliance status.

#### 28. `generate_compliance_report`
Multi-framework compliance reports (ISO27001, PCI DSS, HIPAA, GDPR, SOX).

#### 29. `create_custom_report`
Build custom reports with flexible data selection and formatting options.

#### 30. `generate_dashboard`
Real-time cybersecurity dashboards with KPIs and visualization.

#### 31. `export_data`
Export assessment data in multiple formats (JSON, CSV, Excel, PDF).

#### 32. `validate_evidence`
Validate and manage evidence files for audit and compliance purposes.

### Template & Policy Tools (4 tools)

#### 33. `get_implementation_template`
Generate detailed implementation guides for specific subcategories with examples and tools.

#### 34. `generate_policy_template`
Create policy document templates based on NIST CSF subcategories.

#### 35. `generate_test_scenarios`
Generate security testing scenarios and validation checklists.

#### 36. `upload_evidence`
Upload and manage evidence files with automatic validation and categorization.

## 🚀 Common Usage Patterns

### Complete Assessment Workflow
```bash
# 1. Create organization profile
create_profile → profile_id

# 2. Perform initial assessment  
quick_assessment → initial_scores

# 3. Detailed maturity analysis
assess_maturity → detailed_analysis

# 4. Calculate risk scores
calculate_risk_score → risk_profile

# 5. Generate gap analysis
generate_gap_analysis → gap_report

# 6. Create implementation plan
create_implementation_plan → roadmap

# 7. Generate executive report
generate_executive_report → executive_summary
```

### Compliance Reporting Workflow
```bash
# 1. Import existing assessments
import_assessment → normalized_data

# 2. Validate evidence files
validate_evidence → compliance_check

# 3. Generate compliance report
generate_compliance_report → multi_framework_report

# 4. Create audit trail
track_audit_trail → audit_documentation
```

### Continuous Improvement Workflow
```bash
# 1. Track implementation progress
track_progress → progress_updates

# 2. Calculate maturity trends
calculate_maturity_trend → trend_analysis

# 3. Benchmark against industry
get_industry_benchmarks → peer_comparison

# 4. Suggest next actions
suggest_next_actions → recommendations
```

## 🔧 Advanced Configuration

### Custom Threat Modeling
Configure threat weights for risk calculations:
```bash
# High-security organization (financial services)
calculate_risk_score --threat_weights '{"govern":1.8,"identify":1.6,"protect":1.7,"detect":1.5,"respond":1.3,"recover":1.2}'

# Standard organization (technology)  
calculate_risk_score --threat_weights '{"govern":1.5,"identify":1.3,"protect":1.4,"detect":1.2,"respond":1.1,"recover":1.0}'
```

### Multi-Framework Compliance
Generate compliance reports for multiple standards:
```bash
# ISO 27001 + PCI DSS compliance
generate_compliance_report --frameworks '["iso27001","pci_dss"]' --include_remediation_roadmap true

# Healthcare compliance (HIPAA + NIST)
generate_compliance_report --frameworks '["hipaa","nist_csf"]' --sector healthcare
```

### Industry Benchmarking
```bash
# Technology sector benchmarking
get_industry_benchmarks --sector technology --organization_size medium --include_peer_comparisons true

# Financial services benchmarking  
get_industry_benchmarks --sector financial_services --organization_size large --benchmark_source nist_industry_data
```

## 🔐 Security Configuration

### Multi-Tier Authentication

#### Development Mode (No Authentication)
```env
AUTH_MODE=disabled
```
Perfect for development and testing environments.

#### Simple Authentication (API Key)
```env
AUTH_MODE=simple
API_KEY=your-secure-api-key-here
```
Basic API key protection for internal deployments.

#### Enterprise Authentication (OAuth 2.1)
```env
AUTH_MODE=oauth
OAUTH_ISSUER=https://your-identity-provider.com
OAUTH_AUDIENCE=nist-csf-mcp-server
JWT_ALGORITHM=RS256
JWKS_URI=https://your-identity-provider.com/.well-known/jwks.json
```

### Security Features
- ✅ **Input Validation**: Zod schema validation with XSS/injection prevention
- ✅ **Rate Limiting**: Configurable request throttling
- ✅ **Audit Logging**: Comprehensive audit trails with structured logging
- ✅ **CORS Protection**: Configurable cross-origin resource sharing
- ✅ **Helmet Security**: Standard HTTP security headers

## 📊 Performance & Monitoring

### Performance Benchmarks
- **Database Operations**: <50ms average response time
- **Complex Assessments**: <200ms for full maturity analysis
- **Report Generation**: <500ms for executive reports
- **Concurrent Users**: Supports 100+ simultaneous connections

### Monitoring Features
```env
ENABLE_MONITORING=true
ANALYTICS_ENABLED=true
LOG_LEVEL=info
METRICS_COLLECTION=true
```

### Health Checks
```bash
curl http://localhost:3000/health
# Returns: {"status": "healthy", "version": "1.0.0", "uptime": "2h 15m"}
```

## 🧪 Testing & Quality Assurance

### Comprehensive Test Suite
```bash
# Run all tests with coverage
npm test

# Individual test suites
npm run test:unit        # Unit tests (95%+ coverage)
npm run test:integration # Database integration tests
npm run test:e2e         # End-to-end workflow tests
npm run test:security    # Security validation tests
npm run test:performance # Performance benchmarks
```

### Test Coverage
- **Total Test Files**: 70+ comprehensive test files
- **Unit Test Coverage**: 95%+ across all MCP tools
- **Integration Coverage**: Complete database and service testing
- **Performance Testing**: All 36 tools benchmarked
- **Security Testing**: Input validation and authentication tests

## 📦 Deployment Options

### Docker Deployment
```bash
# Build container
npm run docker:build

# Run with Docker Compose
npm run docker:run
```

### Production Deployment
```bash
# Install dependencies
npm ci --only=production

# Build for production
npm run build

# Start production server
NODE_ENV=production npm start
```

### Enterprise Deployment
- **Load Balancer**: Multiple instances with session affinity
- **Database**: SQLite with backup/restore procedures
- **Monitoring**: Integrated logging and metrics collection
- **Security**: Full OAuth 2.1 with JWT validation

## 📚 Documentation Resources
Export assessment and progress data in various formats.
```json
{
  "profile_id": "PROF-123",
  "format": "json",
  "include_assessments": true,
  "include_progress": true,
  "include_compliance": true
}
```

#### `import_assessment`
Import assessment data from external sources.
```json
{
  "profile_id": "PROF-123",
  "data_format": "csv",
  "data_source": "external_assessment_tool",
  "validate_on_import": true
}
```

### Testing & Development Tools

#### `generate_test_scenarios`
Generate comprehensive test scenarios for development and validation.
```json
{
  "scenario_types": ["assessment", "gap_analysis", "implementation"],
  "organization_profiles": 3,
  "include_edge_cases": true
}
```

## 🏗️ Project Structure

```
nist-csf-2-mcp-server/
├── src/
│   ├── index.ts                    # Main MCP server entry point
│   ├── types/                      # TypeScript definitions
│   │   └── index.ts               # Core types and interfaces
│   ├── db/                        # Database layer
│   │   ├── database.ts            # SQLite connection and queries
│   │   └── monitored-database.ts  # Performance monitoring wrapper
│   ├── services/                  # Business logic services
│   │   ├── framework-loader.ts    # NIST CSF data loading
│   │   ├── assessment-engine.ts   # Assessment calculations
│   │   └── report-generator.ts    # Report generation
│   ├── tools/                     # MCP tool implementations (36 tools)
│   │   ├── csf_lookup.ts         # Framework lookup
│   │   ├── create_profile.ts     # Profile management
│   │   ├── quick_assessment.ts   # Quick assessments
│   │   ├── generate_report.ts    # Report generation
│   │   └── [33 more tools...]    # Complete tool suite
│   ├── utils/                     # Utility functions
│   │   ├── enhanced-logger.ts    # Structured logging
│   │   ├── metrics.ts           # Performance metrics
│   │   └── analytics.ts         # Usage analytics
│   └── CLAUDE.md                # Claude Code configuration
├── tests/                        # Comprehensive test suite
│   ├── tools/                   # Tool-specific tests
│   ├── integration/             # Integration tests
│   ├── performance/             # Performance benchmarks
│   ├── security/                # Security validation
│   └── validation/              # Business logic validation
├── data/
│   └── csf-2.0-framework.json   # NIST CSF 2.0 reference data
├── PROMPTS.md                   # LLM prompt examples for all tools
├── CONTRIBUTING.md              # Contribution guidelines
├── package.json                 # Dependencies and scripts
└── README.md                    # This documentation
```

## 🗃️ Database Schema

The SQLite database contains comprehensive tables supporting all NIST CSF 2.0 operations:

### Framework Reference Tables
- **`functions`**: 6 core CSF functions (Govern, Identify, Protect, Detect, Respond, Recover)
- **`categories`**: 23 framework categories with detailed descriptions
- **`subcategories`**: 106 subcategories with implementation guidance and outcomes
- **`implementation_examples`**: Practical examples for each subcategory

### Assessment & Organizational Tables  
- **`organization_profiles`**: Organization information, sector, size, and metadata
- **`profiles`**: Assessment profiles (current, target, comparative states)
- **`profile_assessments`**: Individual subcategory assessments with maturity scores
- **`question_bank`**: 424 comprehensive assessment questions across 4 dimensions
- **`question_responses`**: Assessment response tracking with validation

### Analysis & Planning Tables
- **`gap_analyses`**: Gap analysis results with priority recommendations  
- **`priority_matrices`**: Implementation prioritization with effort/impact scoring
- **`implementation_plans`**: Detailed roadmaps with phases, timelines, and dependencies
- **`cost_estimates`**: Financial projections with ROI analysis
- **`milestones`**: Project milestones with deliverables and progress tracking

### Reporting & Audit Tables
- **`reports`**: Generated reports with metadata and content
- **`audit_trail`**: Comprehensive audit logging for compliance
- **`evidence`**: Evidence management with file metadata and validation
- **`compliance_mappings`**: Multi-framework compliance relationships

## 🧪 Testing

### Available Test Commands

```bash
# Unit Tests
npm test                    # Run all unit tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report

# Integration Tests  
npm run test:integration   # Database and service integration
npm run test:e2e          # End-to-end workflow validation
npm run test:performance  # Performance benchmarking

# Security Tests
npm run test:security     # Security validation suite
npm run test:validation   # Input validation testing

# Code Quality
npm run lint              # ESLint code linting  
npm run typecheck         # TypeScript type checking
npm run format           # Prettier code formatting
```

### Test Coverage
- **95%+ overall test coverage**
- **Unit tests**: All tools and services
- **Integration tests**: Database operations and workflows
- **Security tests**: Input validation, injection prevention
- **Performance tests**: Response time and resource usage benchmarks

## 🔒 Security Architecture

### Multi-Tier Security Model

#### 🚀 **Tier 1: Quick Start** (Default)
Perfect for development and evaluation:
```bash
npm start  # No authentication required
```

#### 🔑 **Tier 2: Simple Security**
API key authentication for basic security:
```env
AUTH_MODE=simple
API_KEY=your-secure-api-key
```

#### 🏢 **Tier 3: Enterprise Security** 
Full OAuth 2.1 + JWT for production:
```env
AUTH_MODE=oauth
JWKS_URL=https://your-idp.com/.well-known/jwks.json
TOKEN_ISSUER=https://your-idp.com
```

### Security Features

#### Input Validation & Sanitization
- ✅ **Zod Schema Validation**: Type-safe input validation for all parameters
- ✅ **SQL Injection Prevention**: Parameterized queries throughout  
- ✅ **XSS Protection**: Input sanitization and output encoding
- ✅ **Path Traversal Prevention**: Secure file handling with canonicalization

#### Authentication & Authorization
- ✅ **Progressive Authentication**: Choose your security level
- ✅ **JWT Validation**: Industry-standard token validation
- ✅ **Scope-Based Access Control**: Granular permission management
- ✅ **Session Management**: Secure session handling with proper expiration

#### Security Monitoring
- ✅ **Real-time Security Logging**: Structured audit trail
- ✅ **Rate Limiting**: Configurable DDoS protection
- ✅ **Intrusion Detection**: Suspicious activity monitoring
- ✅ **Error Handling**: Secure error messages without information disclosure

#### Data Protection
- ✅ **Encryption at Rest**: Optional database encryption
- ✅ **TLS Encryption**: Secure data transmission
- ✅ **PII Redaction**: Automatic sensitive data protection in logs
- ✅ **Secure Key Management**: Environment-based secret handling

## 📊 Performance & Monitoring

### Performance Metrics
- **Sub-100ms Response Times**: Optimized for real-time usage
- **Concurrent Connections**: Supports 100+ simultaneous users
- **Database Optimization**: Indexed queries for large datasets
- **Memory Efficiency**: Optimized for long-running deployments

### Monitoring Features
- **Real-time Metrics**: Response times, error rates, resource usage
- **Usage Analytics**: Tool usage patterns and performance insights
- **Health Checks**: Automated system health monitoring
- **Alert System**: Configurable alerts for performance thresholds

## 🚀 Use Cases & Workflows

### 1. Initial Cybersecurity Assessment
```
create_profile → quick_assessment → calculate_risk_score → generate_report
```

### 2. Detailed Gap Analysis & Planning  
```
assess_maturity → generate_gap_analysis → generate_priority_matrix → create_implementation_plan
```

### 3. Implementation & Progress Tracking
```
create_implementation_plan → generate_milestone → track_progress → generate_dashboard
```

### 4. Compliance & Audit Support
```
generate_compliance_report → upload_evidence → track_audit_trail → generate_audit_report
```

### 5. Executive Reporting & Governance
```
calculate_maturity_trend → generate_executive_report → compare_profiles → export_data
```

## 📝 Sample Prompts & Integration

For comprehensive LLM prompt examples and integration guidance, see **[PROMPTS.md](./PROMPTS.md)** which includes:

- **Optimized prompts for all 36 MCP tools**
- **Complete workflow examples**
- **Integration patterns for Claude, ChatGPT, and Gemini**
- **Best practices for cybersecurity assessments**
- **Advanced use case scenarios**

## 🤝 Contributing

We welcome contributions! Please see **[CONTRIBUTING.md](./CONTRIBUTING.md)** for detailed guidelines.

### Quick Contribution Guide

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with comprehensive tests
4. **Run the test suite**: `npm test && npm run test:e2e`
5. **Submit a pull request** with detailed description

### Development Standards
- **TypeScript**: Strict type checking enabled
- **Test Coverage**: Maintain 95%+ coverage
- **Security**: Follow security coding guidelines
- **Documentation**: Document all public APIs
- **Code Style**: ESLint + Prettier enforced

## 📋 Available Scripts

```bash
# Development
npm run dev                        # Start development server with auto-reload
npm run build                      # Build TypeScript to JavaScript
npm start                          # Start production server

# Database Operations  
npm run db:verify                  # Verify database integrity

# Testing & Quality
npm test                          # Run comprehensive test suite
npm run test:e2e                  # End-to-end workflow tests
npm run test:coverage             # Generate detailed coverage report
npm run lint                      # Code linting with ESLint
npm run typecheck                 # TypeScript type validation
npm run format                    # Code formatting with Prettier

# Security & Validation
npm run test:security             # Security validation tests
npm run config:check              # Validate environment configuration
npm run security:audit            # Security configuration audit
```

## 🗺️ Roadmap

### v2.1.0 - Enhanced Analytics (Q2 2024)
- [ ] **Advanced Visualization**: Interactive dashboards with D3.js
- [ ] **Machine Learning**: AI-powered risk predictions and recommendations  
- [ ] **Real-time Collaboration**: Multi-user assessment workflows
- [ ] **Mobile API**: REST API endpoints for mobile applications

### v2.2.0 - Enterprise Features (Q3 2024)  
- [ ] **Multi-tenant Architecture**: SaaS-ready multi-organization support
- [ ] **Advanced Integrations**: GRC platform connectors (ServiceNow, Archer)
- [ ] **Custom Frameworks**: Support for organization-specific frameworks
- [ ] **Automated Reporting**: Scheduled report generation and distribution

### v2.3.0 - Cloud & Scale (Q4 2024)
- [ ] **Cloud Deployment**: AWS, Azure, GCP deployment templates
- [ ] **Microservices Architecture**: Container-ready distributed architecture  
- [ ] **GraphQL API**: Modern API interface for complex queries
- [ ] **Blockchain Integration**: Immutable audit trails with blockchain

## 🆘 Support & Community

### Documentation & Resources
- 📚 **[PROMPTS.md](./PROMPTS.md)**: LLM integration examples
- 🛠️ **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Contribution guidelines  
- 🔒 **Security Configuration**: Multi-tier authentication setup
- 📊 **API Documentation**: Complete tool reference with examples

### Community Support
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/rocklambros/nist-csf-2-mcp-server/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/rocklambros/nist-csf-2-mcp-server/discussions)
- 📧 **Enterprise Support**: Contact enterprise@rockcyber.com

### External Resources
- [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Cybersecurity Assessment Best Practices](https://csrc.nist.gov/publications)

## License

MIT License

Copyright (c) 2025 RockCyber, LLC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**Built with ❤️ for the cybersecurity community**  
*Empowering organizations to implement NIST Cybersecurity Framework 2.0 with confidence*