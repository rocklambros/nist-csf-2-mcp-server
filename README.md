# NIST CSF 2.0 Assessment Platform

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/rocklambros/nist-csf-2-mcp-server)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![MCP Tools](https://img.shields.io/badge/MCP%20Tools-40-purple.svg)](./PROMPTS.md)

**Complete NIST Cybersecurity Framework 2.0 implementation** with professional assessment GUI and comprehensive MCP server. Built for cybersecurity professionals, CISOs, and AI integration.

🎯 **740 assessment questions** • 🛡️ **Multi-tier security** • 📊 **Executive dashboards** • 🤖 **40+ MCP tools**

---

## 🚀 Quick Start

Choose your deployment option based on your use case:

### Option 1: Professional Assessment GUI (Recommended)

**Perfect for: CISOs, Security Teams, Executive Presentations**

```bash
git clone https://github.com/rocklambros/nist-csf-2-mcp-server.git
cd nist-csf-2-mcp-server/nist-csf-gui
docker-compose up
```

**Access Your Platform:**
- 🌐 **Assessment Interface**: http://localhost:3000
- 📊 **Executive Dashboard**: Real-time progress and benchmarking  
- 🔧 **Health Status**: http://localhost:3001/health

**Features:**
- Company-size aware question filtering
- Persistent assessment sessions (pause/resume anytime)
- Real-time executive dashboards with industry benchmarking
- Professional PDF reports for board presentations

### Option 2: MCP Server for AI Integration

**Perfect for: Claude Desktop, ChatGPT, Technical Users**

**Claude Desktop Setup:**
```json
{
  "mcpServers": {
    "nist-csf": {
      "command": "sh",
      "args": ["-c", "docker run -i --rm ghcr.io/rocklambros/nist-csf-2-mcp-server:latest node dist/index.js 2>/dev/null"],
      "env": {"MCP_SERVER": "true"}
    }
  }
}
```

---

## 🎨 Assessment GUI Experience

### Workflow
1. **Organization Setup** (2 minutes): Name, size, industry → automatic question filtering
2. **Function Assessment** (2-4 hours, resumable): Navigate NIST CSF functions with dual questions
3. **Executive Dashboard** (Instant): Real-time results with industry comparison

### Professional Features
- **Dual Question Types**: Maturity rating + Implementation status per subcategory
- **Smart Filtering**: 740 total questions → relevant subset based on organization size
- **Industry Benchmarking**: Compare against similar organizations in your sector
- **Executive Ready**: Professional styling suitable for CISO and board presentations

---

## 🤖 MCP Tools (40 Tools)

### Assessment & Scoring
- `start_assessment_workflow` - Begin comprehensive assessment
- `persistent_comprehensive_assessment` - Resume assessments across sessions
- `assess_maturity` - Calculate maturity scores across NIST functions
- `calculate_risk_score` - Risk assessment with heat map generation
- `get_assessment_questions` - 740-question bank with size filtering

### Planning & Implementation  
- `generate_gap_analysis` - Current vs target state analysis
- `create_implementation_plan` - Phased roadmap with timelines
- `generate_priority_matrix` - Effort/impact prioritization
- `estimate_implementation_cost` - Financial planning and ROI analysis
- `track_progress` - Implementation progress monitoring

### Reporting & Export
- `generate_executive_report` - Board-ready executive summaries
- `generate_dashboard` - Real-time dashboard data
- `export_data` - Multi-format data export (PDF, CSV, Excel)
- `generate_compliance_report` - Multi-framework compliance mapping

**[Complete Tool Documentation with Examples →](./PROMPTS.md)**

---

## 📊 Technical Specifications

- **Framework**: Complete NIST CSF 2.0 (6 functions, 34 categories, 185 subcategories)
- **Questions**: 740 across 4 dimensions (Risk, Maturity, Implementation, Effectiveness)
- **Performance**: <100ms response times, 100+ concurrent users
- **Security**: Multi-tier authentication (development → API key → OAuth 2.1)
- **Integration**: MCP protocol, REST API, WebSocket real-time updates

---

## 🔧 Advanced Configuration

### Security Modes
```bash
# Development
AUTH_MODE=disabled docker-compose up

# Production
AUTH_MODE=oauth OAUTH_ISSUER=https://your-provider.com docker-compose up
```

### Performance Options
```bash
# Monitoring enabled
ENABLE_MONITORING=true docker-compose up

# Development with hot reload
docker-compose -f docker-compose.dev.yml up
```

---

## 📚 Documentation

- **[Deployment Guide](./DEPLOYMENT.md)**: Complete setup options
- **[MCP Tools Reference](./PROMPTS.md)**: All 40 tools with examples  
- **[Assessment Workflow](./PERSISTENT_ASSESSMENT_GUIDE.md)**: Detailed usage guide
- **[Architecture Overview](./ARCHITECTURE_IMPROVEMENT_PLAN.md)**: Technical details

---

## 🆘 Support

- **[GitHub Issues](https://github.com/rocklambros/nist-csf-2-mcp-server/issues)**: Bug reports and feature requests
- **[GitHub Discussions](https://github.com/rocklambros/nist-csf-2-mcp-server/discussions)**: Community support

---

## 📋 License

MIT License

---

*Enterprise-grade cybersecurity assessment platform for NIST CSF 2.0 compliance, executive reporting, and professional security evaluation.*