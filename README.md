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
  "assessment_dimension": "risk|maturity|implementation|effectiveness",
  "organization_size": "small|medium|large|enterprise",
  "sector": "technology|healthcare|finance|government|other",
  "include_examples": true,
  "include_references": true,
  "limit": 50,
  "offset": 0
}
```

**Comprehensive Question Bank Features**:
- **424 assessment questions** covering all 106 NIST CSF 2.0 subcategories
- **4 assessment dimensions** per subcategory:
  - **Risk Assessment**: Current risk exposure evaluation
  - **Maturity Assessment**: Organizational maturity measurement
  - **Implementation Assessment**: Implementation progress tracking
  - **Effectiveness Assessment**: Control effectiveness measurement
- **5-option scoring system** with detailed risk and maturity mappings
- **Function-specific questions** tailored to each CSF 2.0 function
- **Complete coverage**: 100% of official NIST CSF 2.0 subcategories

**Response includes**:
- Complete question set with multiple assessment dimensions
- 5-option answers with risk/maturity level mappings
- Estimated completion time (15-45 minutes for comprehensive assessment)
- Function coverage statistics and assessment dimension breakdown
- Question metadata, weighting, and scoring rubrics

#### `validate_assessment_responses`
Validate assessment responses for completeness and consistency across all dimensions.

```json
{
  "profile_id": "PROF-123",
  "responses": [
    {
      "subcategory_id": "GV.OC-01",
      "assessment_dimension": "risk",
      "response_value": 3,
      "risk_level": "medium",
      "maturity_level": "defined",
      "notes": "Implementation details",
      "evidence": "Supporting documentation"
    }
  ],
  "validation_level": "basic|comprehensive",
  "require_all_dimensions": true
}
```

**Enhanced validation checks**:
- **Multi-dimensional completeness**: Ensures all 4 assessment dimensions are covered
- **Cross-dimensional consistency**: Validates logical consistency between risk, maturity, implementation, and effectiveness ratings
- **Scoring validation**: Confirms response values align with risk/maturity level mappings
- **Required question coverage**: Verifies coverage across all 106 subcategories
- **Gap identification**: Identifies missing assessments by function and dimension

#### `get_question_context`
Get detailed context and guidance for specific assessment questions with multi-dimensional insights.

```json
{
  "subcategory_id": "GV.OC-01",
  "assessment_dimension": "risk|maturity|implementation|effectiveness",
  "include_implementation_examples": true,
  "include_references": true,
  "include_scoring_guidance": true,
  "organization_context": {
    "sector": "healthcare",
    "size": "medium"
  }
}
```

**Enhanced context includes**:
- **Dimension-specific guidance**: Tailored explanations for each assessment dimension
- **Scoring rubric details**: Clear guidance for each response option with risk/maturity mappings
- **Cross-dimensional relationships**: How different dimensions relate and inform each other
- **Best practices by dimension**: Specific recommendations for risk reduction, maturity improvement, implementation success, and effectiveness measurement
- **Sector-specific insights**: Industry-tailored guidance and benchmarks
- **Related subcategories**: Dependencies and relationships across the framework

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

### Assessment & Question Bank Tables
- **`question_bank`**: Comprehensive assessment questions for all 106 subcategories
- **`question_options`**: Multiple choice options with risk/maturity level mappings
- **`question_responses`**: User responses to assessment questions

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
npm run db:init                    # Initialize database schema and load framework data
npm run import:framework           # Import NIST CSF 2.0 framework data
npm run import:guidance            # Import implementation guidance for all subcategories
npm run seed:questions             # Seed comprehensive question bank (424 questions)
npm run cleanup:subcategories      # Clean up database to match official NIST CSF 2.0
npm run db:verify                  # Verify database integrity and completeness
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

## Security Configuration

### Hardcoded Passwords and Secrets

⚠️ **IMPORTANT**: This server requires proper configuration of secrets and authentication credentials before deployment.

#### Default Configuration Files

The server includes the following template files that contain placeholder values that **MUST** be changed:

1. **`.env.template`** - Contains all environment variable templates
2. **`docker-compose.yml`** - References external secrets directory

#### Required Secret Configuration

**Before deploying this server, you MUST configure the following:**

##### 1. Authentication Secrets (`.env` file)
```bash
# Copy template and configure
cp .env.template .env

# Edit .env and set these REQUIRED values:
SESSION_SECRET=your-unique-session-secret-minimum-32-chars
HMAC_SECRET=your-unique-hmac-secret-for-data-integrity
ENCRYPTION_KEY=your-encryption-key-for-data-at-rest
DATABASE_PASSWORD=your-database-password-if-using-external-db
EXTERNAL_API_KEY=your-external-service-api-keys
```

##### 2. OAuth 2.1 Authentication
```bash
# Configure OAuth providers in .env:
JWKS_URL=https://your-identity-provider.com/.well-known/jwks.json
TOKEN_ISSUER=https://your-identity-provider.com
MCP_AUDIENCE=your-mcp-server-audience
```

##### 3. Database Encryption (Optional)
```bash
# If using database encryption:
ENABLE_DB_ENCRYPTION=true
DB_ENCRYPTION_KEY=your-database-encryption-key-32-bytes
```

#### Security Best Practices

1. **Generate Strong Secrets**
   ```bash
   # Generate secure random secrets:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Secret Storage**
   - Use environment variables or secure secret management systems
   - Never commit `.env` files to version control
   - Use Docker secrets for containerized deployments
   - Implement secret rotation policies

3. **File Permissions**
   ```bash
   # Secure your environment file:
   chmod 600 .env
   chown app:app .env
   ```

4. **Container Security**
   - Mount secrets as read-only volumes
   - Use the `secrets/` directory for Docker deployments
   - Ensure secrets are owned by the application user (UID 10001)

#### Verification

After configuration, verify your setup:

```bash
# Check that required environment variables are set:
npm run config:check

# Test authentication configuration:
npm run test:auth

# Validate security configuration:
npm run security:audit
```

#### Default Values That Must Be Changed

**⚠️ These default/empty values MUST be replaced:**

- `SESSION_SECRET=` (empty - REQUIRED)
- `HMAC_SECRET=` (empty - REQUIRED)  
- `ENCRYPTION_KEY=` (empty - REQUIRED)
- `DATABASE_PASSWORD=` (empty - set if using external DB)
- `EXTERNAL_API_KEY=` (empty - set if using external APIs)
- `JWKS_URL=https://your-idp.com/.well-known/jwks.json` (placeholder - REQUIRED)
- `TOKEN_ISSUER=https://your-idp.com` (placeholder - REQUIRED)

**⚠️ Test-Only Hardcoded Passwords (REMOVE in production):**

**Critical Security Issue**: The following files contain hardcoded passwords for testing purposes that pose security risks:

1. **`src/tools/generate_test_scenarios.ts`** (Lines 486-488):
   ```typescript
   // ⚠️ SECURITY RISK: Hardcoded test passwords
   { username: 'test_user_01', role: 'standard', password: 'TestPass123!' },
   { username: 'test_admin_01', role: 'admin', password: 'AdminPass456!' },
   { username: 'test_attacker_01', role: 'unauthorized', password: 'BadPass789!' }
   ```

2. **`tests/security/test_auth.ts`** (Line 363):
   ```typescript
   // ⚠️ SECURITY RISK: Hardcoded JWT secret
   'secret',  // Hardcoded JWT signing secret
   ```

**IMMEDIATE ACTION REQUIRED:**

1. **For Development/Testing**: Replace hardcoded values with environment variables:
   ```typescript
   // BEFORE (UNSAFE):
   password: 'TestPass123!'
   
   // AFTER (SECURE):
   password: process.env.TEST_USER_PASSWORD || 'defaultTestPass'
   ```

2. **For Production Deployment**: 
   - Ensure these test files are excluded from production builds
   - Use `.dockerignore` and build processes to exclude test directories
   - Implement dynamic test credential generation

3. **Environment Variable Configuration**:
   ```bash
   # Add to .env file:
   TEST_USER_PASSWORD=your-secure-test-password
   TEST_ADMIN_PASSWORD=your-secure-admin-test-password
   TEST_JWT_SECRET=your-secure-jwt-test-secret
   ```

4. **Production Build Safety**:
   ```bash
   # Exclude test files in production builds:
   echo "tests/" >> .dockerignore
   echo "**/*.test.ts" >> .dockerignore
   echo "src/tools/generate_test_scenarios.ts" >> .dockerignore
   ```

**✅ Production-ready defaults (no change needed):**
- All rate limiting configurations
- Security header settings
- Database connection settings
- Monitoring and logging configurations

#### Emergency Security Measures

If secrets are compromised:

1. **Immediately rotate all secrets**
2. **Revoke and reissue API keys**  
3. **Update OAuth configurations**
4. **Review audit logs for unauthorized access**
5. **Force password resets for all users**

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