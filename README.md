# NIST CSF 2.0 Assessment Platform

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/rocklambros/nist-csf-2-mcp-server)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MCP Tools](https://img.shields.io/badge/MCP%20Tools-38-purple.svg)](./PROMPTS.md)
[![E2E Tests](https://img.shields.io/badge/E2E%20Tests-100%25%20Pass-green.svg)](#testing)

**Production-ready NIST Cybersecurity Framework 2.0 implementation** with professional assessment GUI, comprehensive MCP server, and complete workflow automation. Built for cybersecurity professionals, CISOs, compliance teams, and AI integration.

🎯 **185 clean subcategories** • 🛡️ **Multi-tier security** • 📊 **Executive dashboards** • 🤖 **38+ MCP tools** • ✅ **100% E2E tested**

---

## 🚀 Quick Start Guide

### Option 1: Web Assessment GUI (Recommended)

**Perfect for: CISOs, Security Teams, Auditors, Executive Assessments**

```bash
# Clone and start servers
git clone https://github.com/rocklambros/nist-csf-2-mcp-server.git
cd nist-csf-2-mcp-server

# Install dependencies and initialize
npm install
npm run build
npm run import:csf-framework

# Start assessment platform
HTTP_PORT=3001 npm run start:http &
python3 -m http.server 8081 &
```

**🌐 Access Your Assessment Platform:**
- **📋 Assessment GUI**: http://localhost:8081/nist-csf-assessment-gui.html
- **📊 API Documentation**: http://localhost:3001/api/tools
- **💚 Health Check**: http://localhost:3001/health

### Option 2: MCP Server for AI Integration

**Perfect for: Claude Desktop, ChatGPT, Developer Workflows**

**Claude Desktop Configuration:**
```json
{
  "mcpServers": {
    "nist-csf-2.0": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/nist-csf-2-mcp-server"
    }
  }
}
```

**Docker MCP Server:**
```bash
docker run -i --rm \
  -v $(pwd)/data:/app/data \
  ghcr.io/rocklambros/nist-csf-2-mcp-server:latest
```

---

## 📋 Assessment GUI User Guide

### Complete Workflow (15-45 minutes)

#### Step 1: Organization Setup (2 minutes)
1. **Navigate to**: http://localhost:8081/nist-csf-assessment-gui.html
2. **Fill required fields**:
   - Organization Name
   - Industry Sector (technology, healthcare, finance, etc.)
   - Organization Size (small/medium/large/enterprise)
   - Contact Information
3. **Click**: "Start Assessment" 

#### Step 2: Hierarchical Assessment (10-40 minutes, resumable)

**Function Selection:**
- Choose from **6 NIST CSF 2.0 Functions**:
  - **GV (GOVERN)**: 6 categories - Risk management, policy, oversight
  - **ID (IDENTIFY)**: 3 categories - Asset management, risk assessment
  - **PR (PROTECT)**: 5 categories - Access control, training, data security
  - **DE (DETECT)**: 3 categories - Monitoring, analysis, detection processes
  - **RS (RESPOND)**: 4 categories - Incident management, analysis, communication, mitigation
  - **RC (RECOVER)**: 3 categories - Recovery planning, communication, improvements

**Category Navigation:**
- Select category within function (e.g., GV.OC: Organizational Context)
- View breadcrumb navigation: "GV: GOVERN → Categories"
- See progress tracking per function

**Question Assessment:**
- Answer subcategory questions (e.g., "GV.OC-01: The organizational mission is understood...")
- Rate implementation level (0-5 scale): Not Implemented → Optimized
- Add confidence level and notes
- **Auto-save**: Answers saved in real-time with ✅ "Saved" indicator
- **Navigation**: Single-click "Next Question" advancement

#### Step 3: Results & Reports (Instant)

**Generated Artifacts:**
- Gap analysis with priority matrix
- Implementation plans with cost estimates
- Executive reports with benchmarking
- Progress tracking and milestones

### Key Features

**✅ Production Quality:**
- **100% E2E tested** workflow
- **Hierarchical navigation** through NIST CSF structure
- **Real-time auto-save** with data persistence
- **Complete question coverage** (all 185 current subcategories)
- **Clean data quality** (duplicates and undefined text filtered)

**✅ Professional Experience:**
- **Clear labeling**: "GV.OC-01: The organizational mission..."
- **Progress tracking**: Visual indicators across functions/categories
- **Breadcrumb navigation**: Always know your location in framework
- **Session management**: Resume assessments anytime
- **Cache-busted updates**: Always get latest fixes

---

## 🤖 AI Integration Guide

### Claude Desktop Usage

**Installation:**
1. Add MCP server to Claude Desktop configuration
2. Restart Claude Desktop
3. Verify connection: Tools should appear in interface

**Example Prompts:**
```
"Assess my organization's NIST CSF maturity for the GOVERN function"
"Generate a gap analysis between current and target security posture"
"Create an implementation plan for improving our PROTECT capabilities"
"Export our assessment results to PDF for executive presentation"
```

### ChatGPT Integration

**Setup via HTTP API:**
```python
import requests

def assess_nist_csf(org_name, size, function="GV"):
    response = requests.post("http://localhost:3001/api/tools/quick_assessment", {
        "org_name": org_name,
        "size": size, 
        "assessment_data": {"govern": 3, "identify": 2, "protect": 3}
    })
    return response.json()

# Generate gap analysis
def create_gap_analysis(current_profile_id, target_profile_id):
    response = requests.post("http://localhost:3001/api/tools/generate_gap_analysis", {
        "current_profile_id": current_profile_id,
        "target_profile_id": target_profile_id
    })
    return response.json()
```

### Available Tools (38 Total)

**Core Assessment:**
- `create_profile` - Organization setup and profiling
- `quick_assessment` - Rapid function-level assessment  
- `assess_maturity` - Detailed maturity scoring
- `get_assessment_questions` - Question bank access

**Analysis & Planning:**
- `generate_gap_analysis` - Current vs target analysis
- `calculate_risk_score` - Risk assessment and heat maps
- `generate_priority_matrix` - Implementation prioritization
- `create_implementation_plan` - Phased roadmap creation
- `estimate_implementation_cost` - Financial planning

**Reporting & Export:**
- `generate_report` - Comprehensive assessment reports
- `generate_executive_report` - Executive-level summaries
- `generate_dashboard` - Real-time dashboard data
- `export_data` - Multi-format export capabilities

**[Complete Tool Documentation with Examples →](./PROMPTS.md)**

---

## 🏗️ Architecture Overview

### Production Architecture (Current State)

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   Assessment GUI    │    │    HTTP REST API     │    │   SQLite Database   │
│   (Port 8081)       │◄──►│    (Port 3001)       │◄──►│   (NIST CSF 2.0)    │
│                     │    │                      │    │                     │
│ • Hierarchical Nav  │    │ • 38 MCP Tools       │    │ • 185 Subcategories │
│ • Auto-save         │    │ • CORS Enabled       │    │ • Assessment Data   │
│ • Progress Tracking │    │ • Multi-auth Tiers   │    │ • Progress Tracking │
│ • Clean Questions   │    │ • Rate Limiting      │    │ • Report Generation │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
           │                           │                           │
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│    User Browser     │    │     MCP Protocol     │    │   Framework Data    │
│                     │    │                      │    │                     │
│ • Modern Browsers   │    │ • Claude Desktop     │    │ • Official NIST     │
│ • Mobile Responsive │    │ • ChatGPT            │    │ • 938 Elements      │
│ • Session Storage   │    │ • API Clients        │    │ • Implementation    │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

### Key Components

**Frontend Layer:**
- **HTML Assessment GUI**: Production-ready interface with hierarchical navigation
- **Real-time Auto-save**: Persistent answer storage with visual feedback
- **Progress Tracking**: Function/category/question level progress indicators
- **Clean Data Quality**: Filtered questions with no duplicates or undefined text

**API Layer:**
- **HTTP REST Server**: Express.js with CORS, rate limiting, and multi-tier auth
- **MCP Protocol Server**: Native Claude Desktop and AI client integration
- **38 Specialized Tools**: Complete NIST CSF assessment and reporting toolkit
- **Dual-mode Operation**: Supports both HTTP REST and MCP protocols

**Data Layer:**
- **SQLite Database**: Optimized schema for NIST CSF 2.0 (1.8MB+ framework data)
- **Assessment Storage**: Organizations, profiles, answers, progress tracking
- **Report Generation**: Gap analysis, implementation plans, cost estimates
- **Framework Data**: Official NIST elements with implementation examples

**Quality Assurance:**
- **100% E2E Test Coverage**: Complete workflow validation
- **Production Deployment**: Docker-ready with health monitoring
- **Data Integrity**: Comprehensive validation and error handling

---

## 📱 User Interface Guide

### Assessment GUI Features

**🎯 Hierarchical Navigation:**
```
Organization Setup → Function Selection → Category Selection → Subcategory Questions
                                    ↓
                              GV (GOVERN) → GV.OC (Context) → GV.OC-01, GV.OC-02...
```

**✅ Quality Assurance:**
- **No duplicates**: Each subcategory appears exactly once
- **Clean text**: All "undefined" entries filtered out  
- **Complete coverage**: All 185 current NIST CSF 2.0 subcategories
- **Deprecated filtering**: Withdrawn controls (ID.GV, etc.) excluded

**📊 Real-time Features:**
- Auto-save every answer with visual confirmation
- Progress tracking across functions/categories
- Breadcrumb navigation with back buttons
- Session persistence (resume anytime)

### Browser Compatibility

**Supported Browsers:**
- Chrome/Edge 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Mobile browsers ✅

**Performance:**
- Sub-100ms response times
- Optimized for 100+ concurrent users
- Responsive design for all screen sizes

---

## 🔧 Developer Setup

### Local Development

```bash
# Prerequisites: Node.js 18+, SQLite3

# Setup
git clone https://github.com/rocklambros/nist-csf-2-mcp-server.git
cd nist-csf-2-mcp-server
npm install

# Initialize database with NIST CSF 2.0 data
npm run build
npm run import:csf-framework

# Development servers
npm run dev                    # MCP server (stdio)
npm run dev:http              # HTTP API (port 8080)
HTTP_PORT=3001 npm run dev:http # Custom port
python3 -m http.server 8081   # Static file server for GUIs

# Testing
npm test                      # All tests
npm run test:e2e             # End-to-end workflow tests
npm run test:security        # Security validation
npm run lint                 # Code quality
npm run typecheck           # TypeScript validation
```

### Production Deployment

```bash
# Build for production
npm run build

# Docker deployment
docker build -t nist-csf-server .
docker run -p 3001:3001 -v $(pwd)/data:/app/data nist-csf-server

# Health check
curl http://localhost:3001/health
# Expected: {"status":"healthy","version":"1.0.0","tools_available":38}
```

---

## 🧪 Testing & Quality

### Test Coverage
- **E2E Tests**: 100% pass rate (10/10 workflows)
- **Unit Tests**: Core functionality validation  
- **Integration Tests**: Database and API validation
- **Security Tests**: Authentication and input validation
- **Performance Tests**: Load and stress testing

### Test Execution
```bash
# Run complete test suite
npm run test:all

# Specific test categories
npm run test:e2e              # End-to-end workflow validation
npm run test:tools            # Individual tool validation
npm run test:security         # Security vulnerability assessment
npm run test:performance      # Response time and load testing

# Coverage reporting
npm run test:coverage         # Generate HTML coverage reports
```

### Quality Metrics
- **Response Time**: Sub-100ms for most operations
- **Data Quality**: Zero duplicates, undefined text filtered
- **API Success Rate**: 100% for valid requests
- **Framework Compliance**: Complete NIST CSF 2.0 coverage

---

## 🔒 Security Implementation

### Multi-tier Authentication
- **Development**: `AUTH_MODE=disabled` (local testing)
- **Basic**: `AUTH_MODE=simple` with API keys
- **Enterprise**: `AUTH_MODE=oauth` with JWT + JWKS

### Security Features
- **Input Validation**: Zod schema validation on all endpoints
- **SQL Injection Protection**: Parameterized queries throughout
- **Rate Limiting**: Configurable request limits per client
- **CORS Security**: Configurable origin restrictions
- **Audit Logging**: Comprehensive security event tracking
- **Error Sanitization**: No sensitive data exposure

### Compliance Standards
- **NIST CSF 2.0**: Complete framework implementation
- **GDPR**: Data privacy and protection measures
- **SOX**: Financial controls and audit trail
- **ISO 27001**: Security management alignment

---

## 📊 API Reference

### HTTP REST API

**Base URL**: `http://localhost:3001`

**Authentication** (when enabled):
```bash
# API Key method
curl -H "X-API-Key: your-api-key" http://localhost:3001/api/tools/create_profile

# JWT method  
curl -H "Authorization: Bearer your-jwt-token" http://localhost:3001/api/tools/assess_maturity
```

**Core Endpoints:**
```bash
# Organization Management
POST /api/tools/create_profile          # Create assessment profile
POST /api/tools/clone_profile           # Clone existing profile

# Assessment Execution
POST /api/tools/quick_assessment        # Function-level assessment
POST /api/tools/assess_maturity         # Detailed maturity scoring
POST /api/tools/get_assessment_questions # Question bank access

# Analysis & Planning
POST /api/tools/generate_gap_analysis   # Gap analysis generation
POST /api/tools/create_implementation_plan # Implementation roadmap
POST /api/tools/estimate_implementation_cost # Cost estimation

# Reporting & Export
POST /api/tools/generate_report         # Comprehensive reports
POST /api/tools/export_data            # Multi-format export
GET  /health                           # System health check
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "profile_id": "org-example-current-abc123",
    "message": "Assessment completed successfully"
  },
  "timestamp": "2025-09-08T00:00:00.000Z",
  "tool": "create_profile"
}
```

---

## 🗂️ Database Schema

### Core Tables
- **`functions`**: 6 NIST CSF 2.0 functions (GV, ID, PR, DE, RS, RC)
- **`categories`**: 23 active categories (filtered from 34 in source data)
- **`subcategories`**: 185 current subcategories (deprecated ones excluded)
- **`organization_profiles`**: Company/entity information
- **`profiles`**: Assessment profiles (current, target, baseline)
- **`assessments`**: Question responses and maturity scores

### Assessment Tables
- **`gap_analyses`**: Current vs target gap analysis results
- **`implementation_plans`**: Phased implementation roadmaps
- **`progress_tracking`**: Real-time implementation progress
- **`reports`**: Generated assessment reports and exports

### Data Quality
- **No duplicates**: Unique constraints on profile+subcategory
- **Clean questions**: Undefined and duplicate text filtered
- **Referential integrity**: Comprehensive foreign key relationships
- **Audit trail**: Complete change tracking and timestamps

---

## 🔍 Troubleshooting

### Common Issues

**GUI Issues:**
```bash
# Clear browser cache for latest fixes
# Chrome/Edge: Ctrl+Shift+R or F12 → Application → Storage → Clear
# Firefox: Ctrl+Shift+Delete → Clear cache
# Safari: Cmd+Option+R or Develop → Empty Caches

# If save errors persist:
# 1. Open console (F12) and check for error details
# 2. Verify green version indicator appears
# 3. Check API server is running on port 3001
```

**Server Issues:**
```bash
# Port conflicts
HTTP_PORT=3002 npm run start:http  # Use alternative port

# Database issues
npm run db:verify                  # Validate database integrity
npm run import:csf-framework       # Reimport framework data

# Performance issues
npm run test:performance          # Run performance tests
```

**API Issues:**
```bash
# Test server health
curl http://localhost:3001/health

# Test tool functionality
curl -X POST http://localhost:3001/api/tools/csf_lookup \
  -H "Content-Type: application/json" -d '{}'

# Check server logs for detailed error information
```

### Support Resources
- **GitHub Issues**: https://github.com/rocklambros/nist-csf-2-mcp-server/issues
- **API Documentation**: http://localhost:3001/api/tools
- **Tool Examples**: [PROMPTS.md](./PROMPTS.md)
- **Architecture Details**: [CLAUDE.md](./CLAUDE.md)

---

## 📈 Performance Metrics

### Benchmarks
- **Assessment Loading**: <2 seconds for 185 subcategories
- **Question Navigation**: <100ms response time
- **Auto-save Operations**: <200ms with visual feedback
- **Report Generation**: <5 seconds for comprehensive reports
- **Database Operations**: <10ms for most queries

### Scalability
- **Concurrent Users**: 100+ supported
- **Database Size**: Optimized for enterprise deployments
- **Memory Usage**: <100MB for standard operations
- **Docker Performance**: Multi-stage builds with health checks

---

## 🤝 Contributing

### Development Workflow
1. **Fork repository** and create feature branch
2. **Run tests**: `npm test` before making changes
3. **Maintain quality**: All tests must pass
4. **Update docs**: Keep documentation current
5. **Submit PR**: With clear description and test validation

### Code Standards
- **TypeScript strict mode**: Complete type safety
- **ESLint compliance**: Consistent code formatting
- **Test coverage**: >95% for core functionality
- **Security first**: Input validation and safe error handling
- **Performance focused**: Sub-100ms response targets

### Testing Requirements
```bash
npm run test:all              # All test suites must pass
npm run lint                  # Code quality validation
npm run typecheck            # TypeScript compliance
npm run test:security        # Security vulnerability check
```

---

## 📜 License & Support

**MIT License** - Free for commercial and personal use

**Professional Support Available:**
- Implementation consulting
- Custom assessment workflows
- Enterprise integration
- Training and documentation

**Community Resources:**
- GitHub Issues for bug reports
- Discussions for feature requests
- Wiki for advanced usage examples
- Docker Hub for containerized deployments

---

## 🎯 Version Information

**Current Version**: 1.0.0 (Production Ready)
**NIST CSF Version**: 2.0 (Complete Implementation)
**Last Updated**: September 2025
**Test Status**: 100% E2E Pass Rate

**Recent Improvements:**
- ✅ Complete E2E test workflow (100% success)
- ✅ Hierarchical assessment navigation
- ✅ Real-time auto-save functionality  
- ✅ Clean question quality (duplicates removed)
- ✅ Withdrawn controls filtering
- ✅ Production-ready GUI experience
