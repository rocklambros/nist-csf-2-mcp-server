# Framework Query API Reference

This document provides detailed API reference for framework query tools in the NIST CSF 2.0 MCP Server.

## Tools Overview

| Tool | Purpose | Input Schema | Response Type |
|------|---------|-------------|---------------|
| `query_framework` | Search and filter CSF elements | QueryFrameworkParams | FrameworkElement[] |
| `get_framework_element` | Get specific element by ID | GetElementParams | FrameworkElement |
| `get_framework_stats` | Get framework statistics | StatsParams | FrameworkStats |

## query_framework

Search and filter NIST CSF 2.0 framework elements with advanced filtering capabilities.

### Parameters

```typescript
interface QueryFrameworkParams {
  function?: 'GV' | 'ID' | 'PR' | 'DE' | 'RS' | 'RC';
  category?: string;        // e.g., 'GV.OC'
  subcategory?: string;     // e.g., 'GV.OC-01'
  keyword?: string;         // Full-text search
  implementation_tier?: string; // 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4'
  limit?: number;           // Default: 50, Max: 200
  offset?: number;          // Default: 0
  include_examples?: boolean; // Default: false
}
```

### Response

```typescript
interface QueryFrameworkResponse {
  success: boolean;
  results: FrameworkElement[];
  total_count: number;
  has_more: boolean;
  query_metadata: {
    execution_time_ms: number;
    filters_applied: string[];
    search_strategy: string;
  };
}

interface FrameworkElement {
  id: string;
  type: 'function' | 'category' | 'subcategory';
  name: string;
  description: string;
  function_id?: string;
  category_id?: string;
  implementation_tiers?: string[];
  outcomes?: string[];
  implementation_examples?: ImplementationExample[];
  references?: Reference[];
}
```

### Examples

#### Search by Function
```json
{
  "tool": "query_framework",
  "arguments": {
    "function": "GV",
    "limit": 10,
    "include_examples": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "GV.OC-01",
      "type": "subcategory",
      "name": "Organizational Context",
      "description": "The organizational mission, objectives, stakeholders, and activities are understood and inform cybersecurity roles, responsibilities, and risk management decisions",
      "function_id": "GV",
      "category_id": "GV.OC",
      "implementation_tiers": ["Tier 1", "Tier 2", "Tier 3", "Tier 4"],
      "outcomes": [
        "Organizational mission and objectives are defined",
        "Stakeholder expectations are documented",
        "Cybersecurity's role in achieving mission objectives is established"
      ],
      "implementation_examples": [
        {
          "tier": "Tier 2",
          "example": "Document organizational mission statement with explicit cybersecurity considerations",
          "sector": "all"
        }
      ]
    }
  ],
  "total_count": 25,
  "has_more": true,
  "query_metadata": {
    "execution_time_ms": 15,
    "filters_applied": ["function:GV"],
    "search_strategy": "function_filter"
  }
}
```

#### Keyword Search
```json
{
  "tool": "query_framework",
  "arguments": {
    "keyword": "risk management",
    "limit": 5
  }
}
```

#### Filter by Implementation Tier
```json
{
  "tool": "query_framework",
  "arguments": {
    "implementation_tier": "Tier 3",
    "limit": 20,
    "offset": 0
  }
}
```

## get_framework_element

Retrieve detailed information about a specific framework element by its ID.

### Parameters

```typescript
interface GetElementParams {
  element_id: string;           // Required: CSF element ID
  include_examples?: boolean;   // Default: true
  include_references?: boolean; // Default: true
  include_relationships?: boolean; // Default: false
}
```

### Response

```typescript
interface GetElementResponse {
  success: boolean;
  element: DetailedFrameworkElement;
  relationships?: ElementRelationships;
}

interface DetailedFrameworkElement extends FrameworkElement {
  created_at: string;
  updated_at: string;
  version: string;
  detailed_description: string;
  implementation_guidance: string[];
  consideration_factors: string[];
  measurement_criteria: string[];
}
```

### Examples

#### Get Subcategory with Examples
```json
{
  "tool": "get_framework_element",
  "arguments": {
    "element_id": "GV.OC-01",
    "include_examples": true,
    "include_references": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "element": {
    "id": "GV.OC-01",
    "type": "subcategory",
    "name": "Organizational Context",
    "description": "The organizational mission, objectives, stakeholders, and activities are understood and inform cybersecurity roles, responsibilities, and risk management decisions",
    "detailed_description": "Organizations must establish and maintain a clear understanding of their mission, business objectives, stakeholder expectations, and operational activities to effectively integrate cybersecurity considerations into all business processes.",
    "function_id": "GV",
    "category_id": "GV.OC",
    "implementation_tiers": ["Tier 1", "Tier 2", "Tier 3", "Tier 4"],
    "implementation_guidance": [
      "Document organizational mission statement with cybersecurity integration points",
      "Identify key stakeholders and their cybersecurity expectations",
      "Map business processes to cybersecurity risk areas"
    ],
    "consideration_factors": [
      "Industry sector and regulatory requirements",
      "Organizational size and complexity",
      "Risk tolerance and appetite"
    ],
    "implementation_examples": [
      {
        "tier": "Tier 1",
        "example": "Basic mission statement acknowledging cybersecurity importance",
        "sector": "all"
      },
      {
        "tier": "Tier 2", 
        "example": "Formal cybersecurity policy aligned with business objectives",
        "sector": "all"
      }
    ],
    "references": [
      {
        "source": "NIST CSF 2.0",
        "section": "3.1",
        "url": "https://www.nist.gov/cyberframework"
      }
    ]
  }
}
```

## get_framework_stats

Get comprehensive statistics about the loaded NIST CSF 2.0 framework.

### Parameters

```typescript
interface StatsParams {
  include_tier_distribution?: boolean;    // Default: true
  include_function_breakdown?: boolean;   // Default: true
  include_implementation_stats?: boolean; // Default: false
  include_version_info?: boolean;        // Default: true
}
```

### Response

```typescript
interface FrameworkStatsResponse {
  success: boolean;
  framework_version: string;
  last_updated: string;
  total_elements: {
    functions: number;
    categories: number; 
    subcategories: number;
    implementation_examples: number;
  };
  function_breakdown?: FunctionStats[];
  tier_distribution?: TierDistribution;
  implementation_stats?: ImplementationStats;
}
```

### Examples

#### Basic Statistics
```json
{
  "tool": "get_framework_stats",
  "arguments": {
    "include_function_breakdown": true,
    "include_tier_distribution": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "framework_version": "2.0",
  "last_updated": "2024-02-26",
  "total_elements": {
    "functions": 6,
    "categories": 23,
    "subcategories": 106,
    "implementation_examples": 318
  },
  "function_breakdown": [
    {
      "function_id": "GV",
      "name": "Govern",
      "categories": 6,
      "subcategories": 22,
      "implementation_examples": 88
    },
    {
      "function_id": "ID", 
      "name": "Identify",
      "categories": 6,
      "subcategories": 22,
      "implementation_examples": 66
    },
    {
      "function_id": "PR",
      "name": "Protect", 
      "categories": 5,
      "subcategories": 19,
      "implementation_examples": 57
    },
    {
      "function_id": "DE",
      "name": "Detect",
      "categories": 3,
      "subcategories": 13,
      "implementation_examples": 39
    },
    {
      "function_id": "RS",
      "name": "Respond",
      "categories": 2,
      "subcategories": 16,
      "implementation_examples": 48
    },
    {
      "function_id": "RC",
      "name": "Recover", 
      "categories": 1,
      "subcategories": 14,
      "implementation_examples": 20
    }
  ],
  "tier_distribution": {
    "tier_1_applicable": 106,
    "tier_2_applicable": 106,
    "tier_3_applicable": 98,
    "tier_4_applicable": 89
  }
}
```

## Error Handling

All framework query tools follow consistent error handling patterns:

### Common Error Responses

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  error_code: string;
  details?: any;
  suggestions?: string[];
}
```

### Error Codes

| Error Code | Description | Common Causes |
|------------|-------------|---------------|
| `ELEMENT_NOT_FOUND` | Requested element doesn't exist | Invalid element ID |
| `INVALID_FUNCTION` | Invalid function specified | Must be GV, ID, PR, DE, RS, or RC |
| `INVALID_TIER` | Invalid implementation tier | Must be Tier 1-4 or tier name |
| `QUERY_TOO_BROAD` | Query returned too many results | Add more filters or increase limit |
| `FRAMEWORK_NOT_LOADED` | Framework data not available | Server initialization issue |

### Example Error Response

```json
{
  "success": false,
  "error": "Framework element not found",
  "error_code": "ELEMENT_NOT_FOUND", 
  "details": {
    "requested_id": "GV.XX-99",
    "valid_pattern": "^(GV|ID|PR|DE|RS|RC)\\.(\\w+)-(\\d+)$"
  },
  "suggestions": [
    "Verify the element ID format",
    "Use query_framework to search for similar elements",
    "Check the framework documentation for valid IDs"
  ]
}
```

## Performance Considerations

### Optimization Tips

1. **Use Specific Filters**: More specific queries execute faster
2. **Limit Results**: Use appropriate `limit` values (default: 50, max: 200)
3. **Avoid Broad Keywords**: Specific terms yield better performance
4. **Cache Results**: Framework data changes infrequently

### Performance Metrics

- **Average Response Time**: <50ms for filtered queries
- **Complex Searches**: <200ms for keyword searches
- **Statistics Queries**: <100ms for full framework stats
- **Cache Hit Rate**: >95% for repeated element requests

### Rate Limits

- **Standard Queries**: 1000 requests per minute
- **Complex Searches**: 100 requests per minute  
- **Statistics Requests**: 50 requests per minute

## Integration Examples

### JavaScript/TypeScript

```typescript
import { MCPClient } from '@modelcontextprotocol/client';

const client = new MCPClient();

// Search for governance subcategories
const govSubcategories = await client.callTool({
  name: 'query_framework',
  arguments: {
    function: 'GV',
    limit: 50,
    include_examples: true
  }
});

// Get specific element details
const element = await client.callTool({
  name: 'get_framework_element', 
  arguments: {
    element_id: 'GV.OC-01',
    include_relationships: true
  }
});
```

### Python

```python
from mcp_client import MCPClient

client = MCPClient()

# Keyword search
results = client.call_tool(
    'query_framework',
    {
        'keyword': 'incident response',
        'limit': 20
    }
)

# Get framework statistics
stats = client.call_tool(
    'get_framework_stats',
    {
        'include_function_breakdown': True,
        'include_tier_distribution': True
    }
)
```

This API provides comprehensive access to the NIST CSF 2.0 framework data with high performance and detailed error handling for robust integration.