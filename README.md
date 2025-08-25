# NIST CSF 2.0 MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)
[![Security](https://img.shields.io/badge/Security-Enterprise%20Grade-red.svg)](#security-architecture)

A comprehensive **Model Context Protocol (MCP) server** implementation for the **NIST Cybersecurity Framework 2.0**, providing programmatic access to all framework elements with enterprise-grade security, comprehensive assessment capabilities, and advanced reporting features.

## 🚀 Features

### Framework & Assessment
- 📚 **Complete NIST CSF 2.0 Implementation**: Access all 6 functions, 23 categories, and 106 subcategories
- 🔍 **Advanced Querying**: Multi-dimensional search across functions, categories, keywords, and implementation tiers
- 📊 **Comprehensive Assessment Suite**: From quick organizational assessments to detailed maturity evaluations
- 💡 **424-Question Assessment Bank**: Complete question coverage for all subcategories with 4 assessment dimensions each
- 📈 **Risk & Maturity Scoring**: Advanced algorithms for organizational cybersecurity posture measurement

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
- 🧪 **Comprehensive Testing**: 95%+ test coverage with integration, performance, and security tests
- 📖 **Complete Documentation**: API docs, sample prompts, and integration guides
- 🔧 **Claude Code Ready**: Optimized for AI development workflows with [PROMPTS.md](./PROMPTS.md)
- ⚡ **Performance Optimized**: Sub-100ms response times with intelligent caching

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

# 4. Initialize database with NIST CSF 2.0 data
npm run db:init

# 5. Start the server
npm start
```

The server will start on `http://localhost:3000` with authentication disabled for easy testing.

## 🛠️ Quick Start Guide

### 1. Development Mode
```bash
npm run dev  # Auto-reload enabled
```

### 2. Seed Question Bank (Optional)
```bash
npm run seed:questions  # Adds 424 assessment questions
```

### 3. Verify Installation
```bash
npm test              # Run test suite
npm run test:e2e      # End-to-end workflow tests
```

### 4. Security Configuration
See [Security Configuration](#security-configuration) for authentication setup.

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

## 📡 MCP Tools Reference

### Framework Query Tools

#### `csf_lookup`
Look up specific CSF elements by ID with detailed information.
```json
{
  "element_id": "GV.OC-01",
  "include_examples": true,
  "include_references": true
}
```

#### `search_framework`
Advanced search across the framework with multiple filters.
```json
{
  "query": "risk management",
  "function": "GV",
  "category": "GV.OC",
  "implementation_tier": 2,
  "limit": 10
}
```

#### `get_related_subcategories`
Find related subcategories and their relationships.
```json
{
  "subcategory_id": "GV.OC-01",
  "relationship_type": "supports",
  "include_dependencies": true
}
```

### Profile Management Tools

#### `create_profile`
Create organization cybersecurity profiles.
```json
{
  "org_name": "Example Corp",
  "sector": "technology",
  "size": "medium",
  "profile_type": "current",
  "profile_name": "Current State Assessment"
}
```

#### `clone_profile`
Clone existing profiles for target state or comparative analysis.
```json
{
  "source_profile_id": "PROF-123",
  "profile_type": "target",
  "profile_name": "Target State Profile"
}
```

### Assessment Tools

#### `quick_assessment`
Rapid organizational assessment using simplified questionnaire.
```json
{
  "profile_id": "PROF-123",
  "simplified_answers": {
    "govern": "partial",
    "identify": "yes",
    "protect": "partial",
    "detect": "no",
    "respond": "partial",
    "recover": "no"
  },
  "assessed_by": "Security Team"
}
```

#### `assess_maturity`
Comprehensive maturity assessment across all functions.
```json
{
  "profile_id": "PROF-123",
  "include_recommendations": true,
  "include_subcategory_details": true
}
```

#### `calculate_risk_score`
Calculate organizational risk scores with threat modeling.
```json
{
  "profile_id": "PROF-123",
  "threat_weights": {
    "govern": 1.5,
    "identify": 1.3,
    "protect": 1.4,
    "detect": 1.2,
    "respond": 1.1,
    "recover": 1.0
  },
  "include_heat_map": true
}
```

#### `calculate_maturity_trend`
Track maturity progression over time with trend analysis.
```json
{
  "profile_id": "PROF-123",
  "time_period": "last_12_months",
  "include_projections": true
}
```

### Planning & Analysis Tools

#### `generate_gap_analysis`
Comprehensive gap analysis between current and target states.
```json
{
  "current_profile_id": "PROF-123",
  "target_profile_id": "PROF-456",
  "include_priority_matrix": true,
  "include_cost_estimates": true
}
```

#### `generate_priority_matrix`
Create implementation priority matrices based on multiple factors.
```json
{
  "profile_id": "PROF-123",
  "matrix_type": "effort_impact",
  "include_resource_estimates": true,
  "max_items_per_quadrant": 15
}
```

#### `estimate_implementation_cost`
Detailed cost estimates for cybersecurity implementations.
```json
{
  "subcategory_ids": ["GV.OC-01", "ID.AM-01"],
  "organization_size": "medium",
  "include_ongoing_costs": true,
  "include_risk_adjusted": true
}
```

#### `create_implementation_plan`
Generate detailed implementation roadmaps with phases and timelines.
```json
{
  "gap_analysis_id": "GAP-456",
  "timeline_months": 18,
  "available_resources": 8,
  "prioritization_strategy": "risk_based",
  "include_dependencies": true
}
```

#### `suggest_next_actions`
AI-powered recommendations for next implementation steps.
```json
{
  "profile_id": "PROF-123",
  "focus_area": "governance",
  "urgency_level": "high",
  "include_quick_wins": true
}
```

### Progress Tracking Tools

#### `track_progress`
Update and track implementation progress across subcategories.
```json
{
  "profile_id": "PROF-123",
  "updates": [{
    "subcategory_id": "GV.OC-01",
    "current_implementation": "partially_implemented",
    "current_maturity": 3,
    "status": "on_track",
    "notes": "Policy approved, implementation in progress"
  }]
}
```

#### `generate_milestone`
Create project milestones with deliverables and timelines.
```json
{
  "profile_id": "PROF-123",
  "milestone_type": "assessment",
  "target_date": "2024-12-31",
  "title": "Q4 Security Assessment Completion"
}
```

### Advanced Analysis Tools

#### `get_industry_benchmarks`
Compare against industry standards and benchmarks.
```json
{
  "organization_size": "medium",
  "sector": "technology",
  "include_peer_comparisons": true,
  "benchmark_source": "nist_industry_data"
}
```

#### `compare_profiles`
Detailed comparison between multiple profiles.
```json
{
  "profile_ids": ["PROF-123", "PROF-456"],
  "comparison_type": "maturity",
  "include_recommendations": true,
  "include_visualizations": true
}
```

### Reporting Tools

#### `generate_report`
Create comprehensive reports for different audiences.
```json
{
  "profile_id": "PROF-123",
  "report_type": "executive",
  "format": "json",
  "include_recommendations": true,
  "include_charts": true
}
```

#### `generate_executive_report`
Business-focused reports for executives and board members.
```json
{
  "profile_id": "PROF-123",
  "audience": "board",
  "include_financial_impact": true,
  "include_strategic_recommendations": true
}
```

#### `generate_compliance_report`
Multi-framework compliance reporting and gap analysis.
```json
{
  "profile_id": "PROF-123",
  "compliance_frameworks": ["iso27001", "pci_dss", "hipaa"],
  "include_remediation_roadmap": true
}
```

#### `generate_audit_report`
Comprehensive audit reports with findings and recommendations.
```json
{
  "profile_id": "PROF-123",
  "audit_type": "comprehensive",
  "regulatory_framework": "nist_csf",
  "include_exceptions": true
}
```

#### `create_custom_report`
Flexible custom report builder with multiple content types.
```json
{
  "profile_id": "PROF-123",
  "sections": [
    {
      "section_type": "executive_summary",
      "title": "Executive Summary"
    },
    {
      "section_type": "metrics",
      "title": "Key Metrics"
    }
  ]
}
```

#### `generate_dashboard`
Real-time cybersecurity dashboards and KPI visualization.
```json
{
  "profile_id": "PROF-123",
  "dashboard_type": "executive",
  "include_real_time_metrics": true,
  "refresh_interval": 300
}
```

### Evidence & Documentation Tools

#### `upload_evidence`
Manage evidence and supporting documentation.
```json
{
  "profile_id": "PROF-123",
  "subcategory_id": "GV.OC-01",
  "evidence_type": "policy_document",
  "file_metadata": {
    "filename": "security_policy.pdf",
    "file_size": 2048576,
    "mime_type": "application/pdf"
  }
}
```

#### `validate_evidence`
Validate evidence completeness and quality.
```json
{
  "profile_id": "PROF-123",
  "validation_type": "comprehensive",
  "include_recommendations": true
}
```

#### `track_audit_trail`
Comprehensive audit trail tracking and reporting.
```json
{
  "profile_id": "PROF-123",
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  },
  "event_types": ["assessment", "update", "report_generation"]
}
```

### Policy & Templates Tools

#### `generate_policy_template`
Generate cybersecurity policy templates based on framework requirements.
```json
{
  "subcategory_ids": ["GV.OC-01", "GV.PO-01"],
  "organization_size": "medium",
  "sector": "healthcare",
  "template_format": "detailed"
}
```

#### `get_implementation_template`
Get implementation templates and best practices.
```json
{
  "subcategory_id": "ID.AM-01",
  "organization_size": "large",
  "include_checklists": true,
  "include_examples": true
}
```

#### `get_implementation_guidance`
Comprehensive implementation guidance for specific subcategories.
```json
{
  "subcategory_id": "PR.AC-01",
  "organization_size": "medium",
  "sector": "finance",
  "implementation_approach": "phased"
}
```

### Question Bank & Assessment Tools

#### `get_assessment_questions`
Retrieve comprehensive assessment questions (424 questions total).
```json
{
  "assessment_type": "detailed",
  "function": "GV",
  "assessment_dimension": "maturity",
  "organization_size": "medium",
  "sector": "technology",
  "limit": 50
}
```

#### `validate_assessment_responses`
Validate assessment responses for completeness and consistency.
```json
{
  "profile_id": "PROF-123",
  "responses": [
    {
      "subcategory_id": "GV.OC-01",
      "assessment_dimension": "risk",
      "response_value": 3,
      "risk_level": "medium",
      "maturity_level": "defined"
    }
  ],
  "validation_level": "comprehensive"
}
```

#### `get_question_context`
Get detailed context and scoring guidance for assessment questions.
```json
{
  "subcategory_id": "GV.OC-01",
  "assessment_dimension": "maturity",
  "include_scoring_guidance": true,
  "organization_context": {
    "sector": "healthcare",
    "size": "medium"
  }
}
```

### Data Management Tools

#### `export_data`
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
│   ├── tools/                     # MCP tool implementations (37 tools)
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

- **Optimized prompts for all 37 MCP tools**
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
npm run db:init                    # Initialize database with NIST CSF 2.0 data
npm run import:framework           # Import framework data
npm run seed:questions             # Seed 424 assessment questions
npm run cleanup:subcategories      # Clean database to match official CSF
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