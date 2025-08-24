# NIST CSF 2.0 MCP Server

A comprehensive Model Context Protocol (MCP) server implementation for the NIST Cybersecurity Framework 2.0, providing programmatic access to framework elements and full organizational cybersecurity assessment capabilities.

## Features

- 📚 **Complete NIST CSF 2.0 Framework**: Access all functions, categories, subcategories, and implementation examples
- 🔍 **Advanced Framework Querying**: Search framework elements by function, category, keyword, implementation tier, or ID
- 🏢 **Organization Management**: Create and manage organization profiles with detailed sector and size information
- 📊 **Comprehensive Assessment Suite**: Full workflow from quick assessments to detailed gap analysis and risk scoring
- 📈 **Implementation Planning**: Generate detailed implementation plans with cost estimates and priority matrices
- 📋 **Progress Tracking**: Track implementation progress with status updates and milestone management
- 📄 **Executive Reporting**: Generate comprehensive reports for stakeholders and compliance purposes
- 💾 **Data Export**: Export assessment data in multiple formats (JSON, CSV) for external analysis
- 🔒 **Enterprise Security**: Built with security monitoring, rate limiting, and audit trails
- 🧪 **End-to-End Testing**: Complete E2E test suite validating all workflows
- 📝 **Advanced Logging & Analytics**: Comprehensive logging with performance metrics and usage analytics

## Installation

1. Clone the repository:
```bash
git clone https://github.com/rocklambros/nist-csf-2-mcp-server.git
cd nist-csf-2-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

4. Initialize the database:
```bash
npm run db:init
```

## Quick Start

### Starting the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### Environment Variables

```bash
# Required
NODE_ENV=development|production

# Optional
PORT=3000
LOG_LEVEL=info|debug|warn|error
ENABLE_MONITORING=true|false
DATABASE_PATH=./nist_csf.db
FRAMEWORK_DATA_PATH=./csf-2.0-framework.json
```

## MCP Tools Reference

### Framework Query Tools

#### `query_framework`
Query CSF elements with advanced filtering capabilities.

```json
{
  "function": "GV|ID|PR|DE|RS|RC",
  "category": "Category ID (e.g., GV.OC)",
  "subcategory": "Subcategory ID (e.g., GV.OC-01)", 
  "keyword": "Search terms",
  "implementation_tier": "Tier 1-4 or name",
  "limit": 50,
  "offset": 0
}
```

#### `get_framework_element`
Get detailed information about a specific framework element.

```json
{
  "element_id": "GV.OC-01",
  "include_examples": true,
  "include_references": true
}
```

#### `get_framework_stats`
Get comprehensive statistics about the loaded framework.

```json
{
  "include_tier_distribution": true,
  "include_function_breakdown": true
}
```

### Profile Management Tools

#### `create_profile`
Create organization profile with comprehensive information.

```json
{
  "org_name": "Example Corp",
  "sector": "technology|healthcare|finance|government|other",
  "size": "small|medium|large|enterprise",
  "profile_type": "current|target|comparative",
  "profile_name": "Current State Assessment",
  "description": "Baseline security posture assessment"
}
```

#### `get_profile`
Retrieve profile information with optional assessment data.

```json
{
  "profile_id": "PROF-123",
  "include_assessments": true,
  "include_progress": true
}
```

### Assessment Tools

#### `quick_assessment`
Perform rapid organizational assessment using simplified questionnaire.

```json
{
  "profile_id": "PROF-123",
  "simplified_answers": {
    "govern": "yes|no|partial",
    "identify": "yes|no|partial",
    "protect": "yes|no|partial", 
    "detect": "yes|no|partial",
    "respond": "yes|no|partial",
    "recover": "yes|no|partial"
  },
  "assessed_by": "Security Team",
  "confidence_level": "high|medium|low"
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
Calculate organizational risk score based on implementation gaps.

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
  "include_heat_map": true,
  "include_recommendations": true
}
```

### Analysis & Planning Tools

#### `generate_gap_analysis`
Generate comprehensive gap analysis between current and target states.

```json
{
  "current_profile_id": "PROF-123",
  "target_profile_id": "PROF-456",
  "include_priority_matrix": true,
  "include_visualizations": true,
  "minimum_gap_score": 1.0
}
```

#### `generate_priority_matrix`
Create implementation priority matrix based on impact and effort.

```json
{
  "profile_id": "PROF-123",
  "matrix_type": "effort_impact|risk_resource|custom",
  "include_recommendations": true,
  "include_resource_estimates": true,
  "max_items_per_quadrant": 15
}
```

#### `create_implementation_plan`
Generate detailed implementation roadmap with phases and timelines.

```json
{
  "gap_analysis_id": "GAP-456",
  "timeline_months": 18,
  "available_resources": 8,
  "prioritization_strategy": "risk_based|effort_based|business_driven",
  "phase_duration": 3,
  "include_dependencies": true,
  "include_milestones": true,
  "plan_name": "Cybersecurity Enhancement Initiative"
}
```

#### `estimate_implementation_cost`
Generate detailed cost estimates for implementation activities.

```json
{
  "subcategory_ids": ["GV.OC-01", "ID.AM-01"],
  "organization_size": "small|medium|large|enterprise",
  "include_ongoing_costs": true,
  "include_risk_adjusted": true,
  "currency": "USD|EUR|GBP",
  "include_contingency": true
}
```

### Tracking & Reporting Tools

#### `track_progress`
Update and track implementation progress across subcategories.

```json
{
  "profile_id": "PROF-123",
  "updates": [{
    "subcategory_id": "GV.OC-01",
    "current_implementation": "partially_implemented|largely_implemented|fully_implemented",
    "current_maturity": 3,
    "status": "on_track|at_risk|behind|blocked|completed",
    "notes": "Policy approved, implementation in progress"
  }]
}
```

#### `generate_report`
Create comprehensive reports for different audiences.

```json
{
  "profile_id": "PROF-123",
  "report_type": "executive|technical|compliance|progress",
  "format": "json|html|pdf",
  "include_recommendations": true,
  "include_charts": true,
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  }
}
```

#### `export_data`
Export assessment and progress data in various formats.

```json
{
  "profile_id": "PROF-123",
  "format": "json|csv|xlsx",
  "include_assessments": true,
  "include_progress": true,
  "include_compliance": true,
  "include_milestones": false
}
```

#### `compare_profiles`
Compare multiple profiles for benchmarking and analysis.

```json
{
  "profile_ids": ["PROF-123", "PROF-456"],
  "comparison_type": "gap_analysis|maturity|risk|progress",
  "include_recommendations": true,
  "include_visualizations": true
}
```

### Question Bank Tools

#### `get_assessment_questions`
Retrieve comprehensive assessment questions for cybersecurity framework evaluation.

```json
{
  "assessment_type": "quick|detailed",
  "function": "GV|ID|PR|DE|RS|RC",
  "category": "Category ID (e.g., GV.OC)",
  "subcategory_ids": ["GV.OC-01", "ID.AM-01"],
  "organization_size": "small|medium|large|enterprise",
  "sector": "technology|healthcare|finance|government|other",
  "include_examples": true,
  "include_references": true,
  "limit": 50,
  "offset": 0
}
```

**Response includes**:
- Complete question set with answer options
- Estimated completion time
- Function coverage statistics
- Question metadata and weighting

#### `validate_assessment_responses`
Validate assessment responses for completeness and consistency.

```json
{
  "profile_id": "PROF-123",
  "responses": [
    {
      "subcategory_id": "GV.OC-01",
      "response_value": 3,
      "notes": "Implementation details",
      "evidence": "Supporting documentation"
    }
  ],
  "validation_level": "basic|comprehensive"
}
```

**Validation checks**:
- Response completeness
- Value consistency
- Required question coverage
- Logic validation across responses

#### `get_question_context`
Get detailed context and guidance for specific assessment questions.

```json
{
  "subcategory_id": "GV.OC-01",
  "include_implementation_examples": true,
  "include_references": true,
  "organization_context": {
    "sector": "healthcare",
    "size": "medium"
  }
}
```

**Context includes**:
- Subcategory explanation and importance
- Risk factors and common challenges
- Best practices and implementation guidance
- Sector-specific recommendations
- Related subcategories and dependencies

## Project Structure

```
nist-csf-2-mcp-server/
├── src/
│   ├── index.ts                    # Main MCP server entry point
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts                # CSF types and interfaces
│   ├── db/                         # Database layer
│   │   ├── database.ts             # Main SQLite connection and queries
│   │   ├── monitored-database.ts   # Database monitoring wrapper
│   │   └── models/                 # Data models and schemas
│   ├── services/                   # Business logic services
│   │   ├── framework-loader.ts     # CSF framework data loader
│   │   ├── assessment-engine.ts    # Assessment calculation engine
│   │   └── report-generator.ts     # Report generation service
│   ├── tools/                      # MCP tool implementations
│   │   ├── query_framework.ts      # Framework querying
│   │   ├── create_profile.ts       # Profile management
│   │   ├── quick_assessment.ts     # Quick assessment workflow
│   │   ├── assess_maturity.ts      # Maturity assessment
│   │   ├── calculate_risk_score.ts # Risk calculation
│   │   ├── generate_gap_analysis.ts# Gap analysis generation
│   │   ├── generate_priority_matrix.ts # Priority matrix
│   │   ├── create_implementation_plan.ts # Implementation planning
│   │   ├── estimate_implementation_cost.ts # Cost estimation
│   │   ├── track_progress.ts       # Progress tracking
│   │   ├── generate_report.ts      # Report generation
│   │   ├── export_data.ts          # Data export
│   │   └── compare_profiles.ts     # Profile comparison
│   ├── middleware/                 # Express middleware
│   │   ├── monitoring.ts           # Performance monitoring
│   │   └── validation.ts           # Input validation
│   ├── security/                   # Security components
│   │   ├── auth.ts                 # Authentication
│   │   ├── rate-limiter.ts         # Rate limiting
│   │   └── logger.ts               # Security logging
│   ├── utils/                      # Utilities
│   │   ├── enhanced-logger.ts      # Winston logger with structured logging
│   │   ├── metrics.ts              # Performance metrics
│   │   └── analytics.ts            # Usage analytics
│   ├── test-e2e-workflow.ts       # End-to-end test suite
│   └── CLAUDE.md                  # Claude-specific configuration
├── data/
│   └── csf-2.0-framework.json     # NIST CSF 2.0 framework data
├── test-reports/                   # E2E test reports
├── package.json                    # Node.js dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # This documentation
```

## Database Schema

The SQLite database includes comprehensive tables for all CSF data and organizational assessments:

### Framework Reference Tables
- **`functions`**: CSF core functions (Govern, Identify, Protect, Detect, Respond, Recover)
- **`categories`**: Framework categories within each function
- **`subcategories`**: Detailed subcategories with implementation guidance

### Organizational Data Tables
- **`organization_profiles`**: Organization information, sector, size, and metadata
- **`profiles`**: Assessment profiles (current state, target state, comparative)
- **`profile_assessments`**: Individual subcategory assessments and ratings

### Analysis & Planning Tables
- **`gap_analyses`**: Gap analysis results between current and target states
- **`priority_matrices`**: Implementation priority rankings and resource estimates
- **`implementation_plans`**: Detailed implementation roadmaps and timelines
- **`cost_estimates`**: Financial projections for cybersecurity implementations

### Progress & Reporting Tables
- **`progress_tracking`**: Implementation progress updates and milestone tracking
- **`reports`**: Generated reports and executive summaries
- **`audit_logs`**: Security audit trail and change tracking

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with auto-reload
npm run build            # Build TypeScript to JavaScript
npm run start            # Start production server

# Testing
npm test                 # Run unit tests
npm run test:e2e         # Run end-to-end workflow tests
npm run test:coverage    # Generate test coverage report

# Code Quality
npm run lint             # ESLint code linting
npm run typecheck        # TypeScript type checking
npm run format           # Prettier code formatting

# Database
npm run db:init          # Initialize database schema
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed with sample data
```

### Running E2E Tests

The project includes comprehensive end-to-end tests that validate the complete cybersecurity assessment workflow:

```bash
# Run the full E2E test suite
npm run test:e2e

# Run with monitoring disabled
ENABLE_MONITORING=false npm run test:e2e

# View test reports
ls test-reports/
```

### Environment Configuration

Create a `.env` file for development:

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
ENABLE_MONITORING=true
DATABASE_PATH=./nist_csf.db
FRAMEWORK_DATA_PATH=./data/csf-2.0-framework.json
ANALYTICS_ENABLED=true
SECURITY_HEADERS_ENABLED=true
RATE_LIMIT_ENABLED=true
```

## Security Architecture

This MCP server implements enterprise-grade security measures:

### Input Validation & Sanitization
- ✅ Zod schema validation for all inputs
- ✅ SQL injection prevention with parameterized queries
- ✅ XSS protection with input sanitization
- ✅ Type-safe implementation with comprehensive TypeScript

### Authentication & Authorization
- ✅ JWT-based authentication system
- ✅ Role-based access control (RBAC)
- ✅ API key management and rotation
- ✅ Session management and timeout controls

### Security Monitoring
- ✅ Real-time security event logging
- ✅ Intrusion detection and alerting
- ✅ Rate limiting and DDoS protection
- ✅ Audit trail for all data modifications

### Data Protection
- ✅ Encrypted data at rest
- ✅ TLS encryption for data in transit
- ✅ PII and sensitive data redaction in logs
- ✅ Secure key management practices

### Compliance & Governance
- ✅ NIST Cybersecurity Framework alignment
- ✅ SOC 2 Type II compliance readiness
- ✅ GDPR data protection compliance
- ✅ Industry-standard security controls

## Performance & Monitoring

### Metrics & Analytics
- **Response Time Monitoring**: Sub-100ms average response times
- **Resource Utilization**: CPU, memory, and database performance tracking
- **Usage Analytics**: Tool usage patterns and performance optimization
- **Error Tracking**: Comprehensive error logging and alerting

### Scalability Features
- **Database Connection Pooling**: Efficient SQLite connection management
- **Query Optimization**: Indexed queries for large-scale assessments
- **Caching Layer**: Framework data caching for improved performance
- **Horizontal Scaling**: Ready for multi-instance deployment

## Use Cases

### Cybersecurity Assessment Workflows

1. **Initial Risk Assessment**
   - Create organization profile
   - Perform quick assessment
   - Generate risk score and heat map
   - Identify critical gaps

2. **Detailed Gap Analysis**
   - Comprehensive maturity assessment
   - Generate detailed gap analysis
   - Create implementation priority matrix
   - Estimate costs and timelines

3. **Implementation Planning**
   - Create phased implementation plan
   - Track progress and milestones
   - Generate executive reports
   - Monitor compliance status

4. **Continuous Improvement**
   - Regular progress updates
   - Comparative analysis over time
   - Benchmark against industry standards
   - Export data for external analysis

### Integration Scenarios

- **GRC Platforms**: Export data to governance, risk, and compliance tools
- **SIEM Integration**: Security event correlation and analysis
- **Business Intelligence**: Executive dashboards and KPI tracking
- **Audit Support**: Compliance reporting and evidence collection

## API Documentation

For detailed API documentation with request/response examples, see:
- [Framework Query API](./docs/api/framework-queries.md)
- [Assessment API](./docs/api/assessments.md)
- [Planning & Analysis API](./docs/api/planning.md)
- [Reporting API](./docs/api/reporting.md)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with tests
4. Run the test suite: `npm test && npm run test:e2e`
5. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Maintain >90% test coverage
- Include comprehensive error handling
- Document new features and APIs
- Follow security coding guidelines

## Support

- 📚 **Documentation**: Comprehensive guides and API references
- 🐛 **Issue Tracking**: GitHub Issues for bug reports and feature requests  
- 💬 **Community**: Join our Discord community for support and discussions
- 📧 **Enterprise Support**: Contact enterprise@nist-csf-mcp.com for professional support

## Roadmap

### v2.1.0 (Planned)
- [ ] Real-time collaboration features
- [ ] Advanced visualization dashboards
- [ ] Machine learning-powered risk predictions
- [ ] Multi-tenant architecture support

### v2.2.0 (Planned)
- [ ] Integration with popular GRC platforms
- [ ] Advanced reporting with custom templates
- [ ] Mobile-responsive web interface
- [ ] Cloud deployment templates (AWS, Azure, GCP)

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Resources

- [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Cybersecurity Assessment Best Practices](https://csrc.nist.gov/publications)

---

**Built with ❤️ for the cybersecurity community**