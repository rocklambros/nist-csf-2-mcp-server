# NIST CSF 2.0 MCP Server

A Model Context Protocol (MCP) server implementation for the NIST Cybersecurity Framework 2.0, providing programmatic access to framework elements and organizational assessment capabilities.

## Features

- 📚 **Complete NIST CSF 2.0 Framework**: Access all functions, categories, subcategories, and implementation examples
- 🔍 **Flexible Querying**: Search framework elements by function, category, keyword, or ID
- 🏢 **Organization Management**: Create and manage organization profiles with implementation tiers
- 📊 **Assessment Tracking**: Record and track implementation status, risk assessments, and gap analyses
- 🔒 **Secure by Design**: Built following MCP security best practices with input validation and error handling
- 📝 **Comprehensive Logging**: Detailed logging for debugging and audit purposes

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

## Usage

### Starting the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### Available MCP Tools

#### Framework Query Tools

- **`query_framework`**: Query CSF elements by function, category, subcategory, or keyword
- **`get_element`**: Get a specific element by its identifier
- **`get_implementation_examples`**: Get implementation examples for a subcategory
- **`get_framework_stats`**: Get statistics about the loaded framework

#### Organization Management Tools

- **`create_organization`**: Create a new organization profile
- **`get_assessment`**: Get assessment data for an organization

#### Assessment Tools

- **`record_implementation`**: Record subcategory implementation status
- **`record_risk`**: Record risk assessment for an element
- **`record_gap`**: Record gap analysis for a category

### Example Tool Calls

```json
// Query all Govern function categories
{
  "tool": "query_framework",
  "arguments": {
    "function": "GV",
    "limit": 10
  }
}

// Search for specific keywords
{
  "tool": "query_framework",
  "arguments": {
    "keyword": "risk management",
    "limit": 20
  }
}

// Create an organization
{
  "tool": "create_organization",
  "arguments": {
    "org_id": "ORG-001",
    "org_name": "Example Corp",
    "industry": "Technology",
    "size": "Medium",
    "current_tier": "Tier 2 - Risk Informed",
    "target_tier": "Tier 3 - Repeatable"
  }
}

// Record implementation status
{
  "tool": "record_implementation",
  "arguments": {
    "org_id": "ORG-001",
    "subcategory_id": "GV.OC-01",
    "implementation_status": "Partially Implemented",
    "maturity_level": 3,
    "notes": "Policy drafted, pending approval",
    "assessed_by": "Security Team"
  }
}
```

## Project Structure

```
nist-csf-2-mcp-server/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts          # CSF types and interfaces
│   ├── db/                   # Database layer
│   │   └── database.ts       # SQLite connection and queries
│   ├── services/             # Business logic
│   │   └── framework-loader.ts # CSF framework loader
│   └── utils/                # Utilities
│       └── logger.ts         # Winston logger configuration
├── csf-2.0-framework.json    # NIST CSF 2.0 data
├── nist_csf.db              # SQLite database
├── package.json             # Node.js dependencies
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

## Database Schema

The SQLite database includes four main tables:

- **`organization_profiles`**: Organization information and implementation tiers
- **`subcategory_implementations`**: Implementation status for each subcategory
- **`risk_assessments`**: Risk assessments for framework elements
- **`gap_analysis`**: Gap analysis between current and target states

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run typecheck
```

## Security Considerations

This MCP server implements multiple security measures:

- ✅ Input validation using Zod schemas
- ✅ SQL injection prevention with parameterized queries
- ✅ Error sanitization to prevent information leakage
- ✅ Structured logging without sensitive data
- ✅ Read-only framework data access
- ✅ Type-safe implementation with TypeScript

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Resources

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)