# NIST CSF 2.0 MCP Server - Testing Plan

This comprehensive testing plan provides step-by-step instructions for testing the NIST CSF 2.0 MCP Server with both **Claude Desktop** and **OpenAI/ChatGPT** platforms.

## 🎯 Overview

The NIST CSF 2.0 MCP Server supports **dual-mode operation**:
- **MCP Protocol**: Native integration with Claude Desktop via stdio
- **HTTP REST API**: Direct integration with ChatGPT and other AI platforms via HTTP endpoints

**Key Features to Test**:
- ✅ 39 specialized MCP tools for cybersecurity assessment
- ✅ Complete NIST CSF 2.0 framework (6 functions, 34 categories, 185 subcategories)
- ✅ 424-question comprehensive assessment workflow
- ✅ Multi-tier security authentication (disabled/API key/OAuth)
- ✅ Real-time reporting and analytics
- ✅ Dual-mode simultaneous operation

## 🖥️ Testing with Claude Desktop

### Prerequisites
- Docker installed on your system
- Claude Desktop application installed
- Admin access to modify Claude Desktop configuration

### Step 1: Server Installation & Setup

#### Option A: Docker Deployment (Recommended)
```bash
# Pull and run the latest Docker image
docker run -d --name nist-csf-mcp -p 8080:8080 rocklambros/nist-csf-2-mcp-server:latest

# Verify container is running
docker ps | grep nist-csf-mcp

# Check server logs
docker logs nist-csf-mcp
```

#### Option B: Native Installation
```bash
# Clone and build from source
git clone https://github.com/rocklambros/nist-csf-2-mcp-server.git
cd nist-csf-2-mcp-server
npm install
npm run build
npm run import:csf-framework

# Start MCP server
npm start
```

### Step 2: Claude Desktop Configuration

**Configuration File Locations**:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Docker Configuration** (Recommended):
```json
{
  "mcpServers": {
    "nist-csf-2.0": {
      "command": "docker",
      "args": ["exec", "-i", "nist-csf-mcp", "node", "/app/dist/index.js"],
      "env": {
        "MCP_SERVER": "true"
      }
    }
  }
}
```

**Native Installation Configuration**:
```json
{
  "mcpServers": {
    "nist-csf-2.0": {
      "command": "node",
      "args": ["/path/to/nist-csf-2-mcp-server/dist/index.js"],
      "env": {
        "MCP_SERVER": "true"
      }
    }
  }
}
```

### Step 3: Claude Desktop Testing

1. **Restart Claude Desktop** after updating the configuration
2. **Verify Connection**: Look for MCP server connection indicator
3. **Run Test Commands**:

#### Basic Framework Lookup Test
```
Please use csf_lookup to find information about subcategory "GV.OC-01"
```

#### Organization Setup Test
```
I need to start a cybersecurity assessment for my organization. Please help me:

1. Create an organization profile for "TechCorp Inc" - a medium-sized technology company
2. Perform a quick initial assessment to understand our current security posture
3. Calculate our initial risk score and identify the most critical areas for improvement

Use the NIST CSF 2.0 MCP server tools to guide me through this process step by step.
```

#### Comprehensive Assessment Test
```
I want to conduct a comprehensive NIST CSF 2.0 assessment for my organization. Please:

1. Create a detailed maturity assessment across all framework functions
2. Generate a gap analysis comparing our current state to industry best practices
3. Create an implementation priority matrix based on risk and business impact
4. Develop a phased implementation plan with timelines and cost estimates
5. Generate an executive summary report for leadership

Walk me through each step and explain the results.
```

#### Advanced Features Test
```
Please help me with advanced NIST CSF features:

1. Generate test scenarios for our security controls
2. Create policy templates based on our assessment results
3. Track progress on our implementation plan
4. Compare our profile against industry benchmarks
5. Export our assessment data for external reporting
```

### Step 4: Validation Checklist for Claude

- [ ] All 39 MCP tools are accessible and responsive
- [ ] Framework data queries return accurate NIST CSF 2.0 information
- [ ] Organization profile creation works correctly
- [ ] Assessment workflow completes end-to-end
- [ ] Reports generate with proper formatting
- [ ] Error handling works for invalid inputs
- [ ] Performance is acceptable (sub-100ms for most operations)

## 🌐 Testing with OpenAI/ChatGPT

### Prerequisites
- Node.js 18.x+ installed
- Access to ChatGPT Plus or API (for custom actions)
- Basic understanding of REST API testing

### Step 1: HTTP Server Setup

#### Start HTTP Server
```bash
# Option 1: HTTP Only Mode
npm run start:http

# Option 2: Dual Mode (Recommended) - Runs both MCP and HTTP
npm run start:dual

# Option 3: Development Mode with Auto-reload
npm run dev:http
```

#### Verify Server Status
```bash
# Check server health
curl http://localhost:8080/health

# List all available tools
curl http://localhost:8080/tools | jq '.'

# Get tool count (should return 39)
curl http://localhost:8080/tools | jq '.tools | length'
```

### Step 2: Direct HTTP API Testing

#### Test Basic Tool Functionality
```bash
# Test CSF Lookup
curl -X POST http://localhost:8080/api/tools/csf_lookup \
  -H "Content-Type: application/json" \
  -d '{"element_id": "GV.OC-01"}' | jq '.'

# Test Framework Search
curl -X POST http://localhost:8080/api/tools/search_framework \
  -H "Content-Type: application/json" \
  -d '{"query": "risk management", "limit": 5}' | jq '.'

# Test Organization Profile Creation
curl -X POST http://localhost:8080/api/tools/create_profile \
  -H "Content-Type: application/json" \
  -d '{
    "org_name": "TestCorp API",
    "industry": "technology",
    "size": "medium",
    "current_tier": "Tier1",
    "target_tier": "Tier3"
  }' | jq '.'
```

#### Test Assessment Workflow
```bash
# Start Assessment Workflow
curl -X POST http://localhost:8080/api/tools/start_assessment_workflow \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "testcorp-api",
    "assessment_type": "comprehensive"
  }' | jq '.'

# Get Assessment Questions
curl -X POST http://localhost:8080/api/tools/get_assessment_questions \
  -H "Content-Type: application/json" \
  -d '{
    "subcategory_id": "GV.OC-01",
    "question_type": "all"
  }' | jq '.'
```

#### Test Reporting Tools
```bash
# Generate Gap Analysis
curl -X POST http://localhost:8080/api/tools/generate_gap_analysis \
  -H "Content-Type: application/json" \
  -d '{"org_id": "testcorp-api"}' | jq '.'

# Generate Report
curl -X POST http://localhost:8080/api/tools/generate_report \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "testcorp-api",
    "report_type": "executive",
    "format": "json"
  }' | jq '.'
```

### Step 3: ChatGPT Custom Actions Integration

#### Configure Custom Actions in ChatGPT

1. **Go to ChatGPT Settings** → **Custom Actions** → **Create Action**
2. **Add Server Information**:
   - **Base URL**: `http://localhost:8080/api/tools`
   - **Authentication**: None (or configure API key if enabled)
3. **Import Tool Schemas**: Use the OpenAPI schema from `/api/schema` endpoint

#### Sample Custom Action Configuration
```yaml
# Example custom action for CSF Lookup
name: NIST CSF Lookup
description: Look up NIST Cybersecurity Framework elements
base_url: http://localhost:8080/api/tools
endpoints:
  - path: /csf_lookup
    method: POST
    description: Look up CSF functions, categories, or subcategories
    parameters:
      element_id:
        type: string
        required: true
        description: CSF element identifier (e.g., GV.OC-01)
```

#### ChatGPT Test Prompts
```
Using the NIST CSF action, please look up subcategory "GV.OC-01" and explain its purpose.

Help me create a comprehensive cybersecurity assessment using the NIST CSF tools available through custom actions.

Generate a risk assessment report for a medium-sized technology company using the available NIST CSF endpoints.
```

### Step 4: Alternative Integration Methods

#### Option A: MCP Bridge (Third-party)
```bash
# Install MCP Bridge
npm install -g @modelcontextprotocol/bridge

# Start bridge (connects MCP to HTTP)
mcp-bridge --mcp-command "node dist/index.js" --http-port 8081
```

#### Option B: Custom Connector Development
```javascript
// Example Node.js connector for OpenAI
const axios = require('axios');

class NISTCSFConnector {
  constructor(baseUrl = 'http://localhost:8080/api/tools') {
    this.baseUrl = baseUrl;
  }

  async csfLookup(elementId) {
    const response = await axios.post(`${this.baseUrl}/csf_lookup`, {
      element_id: elementId
    });
    return response.data;
  }
}
```

### Step 5: Validation Checklist for OpenAI

- [ ] HTTP server starts without errors
- [ ] All 39 endpoints are accessible via HTTP
- [ ] API responses include proper success/error formatting
- [ ] Custom actions work in ChatGPT
- [ ] Assessment workflow completes via API calls
- [ ] Reports generate correctly through HTTP endpoints
- [ ] Error handling returns appropriate HTTP status codes
- [ ] Performance meets requirements under API load

## 🔒 Security Testing

### Authentication Modes Testing

#### Test No Authentication (Development)
```bash
# Should work without any authentication
curl http://localhost:8080/tools
```

#### Test API Key Authentication
```bash
# Set environment variable
export API_KEY="your-test-api-key"
export AUTH_MODE="simple"

# Restart server and test with API key
curl -H "Authorization: Bearer your-test-api-key" http://localhost:8080/tools
```

#### Test OAuth 2.1 Authentication
```bash
# Configure OAuth settings
export AUTH_MODE="oauth"
export OAUTH_ISSUER="your-oauth-issuer"
export OAUTH_AUDIENCE="your-audience"

# Test with valid JWT token
curl -H "Authorization: Bearer your-jwt-token" http://localhost:8080/tools
```

### Security Validation Checklist

- [ ] Unauthorized requests are properly rejected
- [ ] Input validation prevents injection attacks
- [ ] Error messages don't leak sensitive information
- [ ] Rate limiting works correctly
- [ ] HTTPS/TLS configuration is secure (production)
- [ ] Database queries use parameterized statements
- [ ] Audit logging captures security events

## 📊 Performance Testing

### Load Testing with Apache Bench
```bash
# Test basic endpoint performance
ab -n 1000 -c 10 http://localhost:8080/health

# Test tool endpoint under load
ab -n 100 -c 5 -p test-payload.json -T application/json http://localhost:8080/api/tools/csf_lookup
```

### Performance Benchmarks

| Operation | Target Response Time | Max Concurrent Users |
|-----------|---------------------|---------------------|
| Framework Lookup | < 100ms | 100+ |
| Quick Assessment | < 500ms | 50+ |
| Report Generation | < 2000ms | 20+ |
| Database Queries | < 50ms | 200+ |

### Performance Validation Checklist

- [ ] Framework queries respond under 100ms
- [ ] Assessment tools complete within acceptable timeframes
- [ ] Memory usage remains stable under load
- [ ] Database connections are properly managed
- [ ] Concurrent requests don't cause resource conflicts

## 🐛 Troubleshooting

### Common Issues and Solutions

#### Claude Desktop Connection Issues
```bash
# Check if MCP server is accessible
docker exec -it nist-csf-mcp node -e "console.log('MCP Server accessible')"

# Verify Claude Desktop configuration
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Check server logs
docker logs nist-csf-mcp --tail 50
```

#### HTTP API Connection Issues
```bash
# Check if port is available
netstat -an | grep 8080

# Test server health
curl -v http://localhost:8080/health

# Check server logs
npm run dev:http  # Runs with verbose logging
```

#### Database Issues
```bash
# Verify database initialization
npm run db:verify

# Re-import framework data if needed
npm run import:csf-framework

# Check database file permissions
ls -la nist_csf.db
```

### Error Code Reference

| HTTP Status | Description | Common Causes |
|-------------|-------------|---------------|
| 400 | Bad Request | Invalid input parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 404 | Not Found | Tool or resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Database or server error |

## ✅ Test Completion Criteria

### Functional Testing Complete
- [ ] All 39 MCP tools working in Claude Desktop
- [ ] All 39 HTTP endpoints working for OpenAI integration
- [ ] Assessment workflow completes end-to-end
- [ ] Reports generate correctly in both modes
- [ ] Data integrity maintained across operations

### Integration Testing Complete
- [ ] Claude Desktop MCP integration working
- [ ] ChatGPT custom actions functioning
- [ ] Dual-mode operation stable
- [ ] Authentication modes working
- [ ] Error handling appropriate

### Performance Testing Complete
- [ ] Response times meet benchmarks
- [ ] Server handles concurrent users
- [ ] Memory usage stable under load
- [ ] Database performance acceptable
- [ ] No resource leaks detected

### Security Testing Complete
- [ ] Authentication working correctly
- [ ] Input validation preventing attacks
- [ ] Audit logging functioning
- [ ] Error messages sanitized
- [ ] HTTPS configuration secure

## 📋 Test Report Template

```markdown
# NIST CSF 2.0 MCP Server Test Report

## Test Environment
- **Date**: [Test Date]
- **Version**: [Server Version]
- **Platform**: [OS and Version]
- **Tester**: [Name]

## Claude Desktop Testing Results
- **Connection**: ✅/❌
- **Tool Availability**: [X/39 tools working]
- **Assessment Workflow**: ✅/❌
- **Report Generation**: ✅/❌
- **Performance**: [Response times]

## OpenAI/HTTP API Testing Results
- **HTTP Server**: ✅/❌  
- **Endpoint Availability**: [X/39 endpoints working]
- **Custom Actions**: ✅/❌
- **API Workflow**: ✅/❌
- **Performance**: [Response times]

## Issues Found
1. [Issue description and severity]
2. [Issue description and severity]

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

## Overall Status
- **Ready for Production**: ✅/❌
- **Critical Issues**: [Count]
- **Minor Issues**: [Count]
```

## 🔗 Additional Resources

- **[README.md](./README.md)**: Complete project documentation
- **[PROMPTS.md](./PROMPTS.md)**: Optimized prompts for all tools
- **[DOCKER.md](./DOCKER.md)**: Docker deployment guide
- **[SECURITY.md](./SECURITY.md)**: Security configuration details
- **[API Documentation](http://localhost:8080/api/docs)**: Auto-generated API docs (when server running)

For additional support or questions about testing, please refer to the project documentation or create an issue in the GitHub repository.