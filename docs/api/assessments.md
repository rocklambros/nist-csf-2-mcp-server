# Assessment API Reference

This document provides detailed API reference for assessment and evaluation tools in the NIST CSF 2.0 MCP Server.

## Tools Overview

| Tool | Purpose | Input Schema | Response Type |
|------|---------|-------------|---------------|
| `create_profile` | Create organization/assessment profiles | CreateProfileParams | ProfileResult |
| `get_profile` | Retrieve profile information | GetProfileParams | ProfileData |  
| `quick_assessment` | Rapid organizational assessment | QuickAssessmentParams | AssessmentResult |
| `assess_maturity` | Comprehensive maturity evaluation | AssessMaturityParams | MaturityResult |
| `calculate_risk_score` | Risk scoring based on gaps | RiskScoreParams | RiskResult |

## create_profile

Create a new organization profile or assessment profile for tracking cybersecurity implementation status.

### Parameters

```typescript
interface CreateProfileParams {
  org_name: string;                    // Organization name
  sector: 'technology' | 'healthcare' | 'finance' | 'government' | 'other';
  size: 'small' | 'medium' | 'large' | 'enterprise';
  profile_type: 'current' | 'target' | 'comparative';
  profile_name?: string;               // Default: "{org_name} {profile_type} Profile"
  description?: string;                // Profile description
  contact_info?: {
    primary_contact: string;
    email: string;
    department?: string;
  };
  metadata?: Record<string, any>;      // Additional metadata
}
```

### Response

```typescript
interface CreateProfileResponse {
  success: boolean;
  profile_id: string;
  org_id?: string;
  message: string;
  profile_details: {
    profile_name: string;
    profile_type: string;
    created_at: string;
    organization: {
      name: string;
      sector: string; 
      size: string;
    };
  };
}
```

### Examples

#### Create Current State Profile
```json
{
  "tool": "create_profile",
  "arguments": {
    "org_name": "TechCorp Industries",
    "sector": "technology",
    "size": "large",
    "profile_type": "current",
    "profile_name": "Q4 2024 Security Assessment",
    "description": "Comprehensive current state cybersecurity assessment",
    "contact_info": {
      "primary_contact": "John Smith",
      "email": "j.smith@techcorp.com",
      "department": "Information Security"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "profile_id": "PROF-20240312-001",
  "org_id": "ORG-TECHCORP-001",
  "message": "Profile created successfully",
  "profile_details": {
    "profile_name": "Q4 2024 Security Assessment", 
    "profile_type": "current",
    "created_at": "2024-03-12T10:30:00Z",
    "organization": {
      "name": "TechCorp Industries",
      "sector": "technology",
      "size": "large"
    }
  }
}
```

## get_profile

Retrieve detailed information about an existing profile including assessments and progress data.

### Parameters

```typescript
interface GetProfileParams {
  profile_id: string;                  // Required profile identifier
  include_assessments?: boolean;       // Default: true
  include_progress?: boolean;          // Default: false
  include_metadata?: boolean;          // Default: true
  assessment_date_range?: {
    start_date: string;               // ISO date string
    end_date: string;                 // ISO date string  
  };
}
```

### Response

```typescript
interface GetProfileResponse {
  success: boolean;
  profile: {
    profile_id: string;
    profile_name: string;
    profile_type: string;
    description?: string;
    created_at: string;
    updated_at: string;
    organization: OrganizationDetails;
    assessments?: AssessmentSummary[];
    progress?: ProgressSummary;
    metadata?: Record<string, any>;
  };
}
```

### Examples

#### Get Profile with Assessments
```json
{
  "tool": "get_profile", 
  "arguments": {
    "profile_id": "PROF-20240312-001",
    "include_assessments": true,
    "include_progress": true
  }
}
```

## quick_assessment

Perform a rapid organizational cybersecurity assessment using simplified questionnaire responses.

### Parameters

```typescript
interface QuickAssessmentParams {
  profile_id: string;                  // Target profile for assessment
  simplified_answers: {
    govern: 'yes' | 'no' | 'partial';     // Governance processes
    identify: 'yes' | 'no' | 'partial';   // Asset identification
    protect: 'yes' | 'no' | 'partial';    // Protective measures  
    detect: 'yes' | 'no' | 'partial';     // Detection capabilities
    respond: 'yes' | 'no' | 'partial';    // Response procedures
    recover: 'yes' | 'no' | 'partial';    // Recovery processes
  };
  assessed_by: string;                 // Assessor name/identifier
  confidence_level: 'high' | 'medium' | 'low';
  assessment_date?: string;            // ISO date, defaults to now
  notes?: string;                      // Additional assessment notes
}
```

### Response

```typescript
interface QuickAssessmentResponse {
  success: boolean;
  assessment_id: string;
  message: string;
  initial_maturity_scores: {
    govern: number;          // 0-5 scale
    identify: number;
    protect: number; 
    detect: number;
    respond: number;
    recover: number;
    overall_average: number;
  };
  details: {
    assessmentsCreated: number;
    functionSummaries: FunctionSummary[];
    recommendations: string[];
    next_steps: string[];
  };
}
```

### Examples  

#### Basic Quick Assessment
```json
{
  "tool": "quick_assessment",
  "arguments": {
    "profile_id": "PROF-20240312-001",
    "simplified_answers": {
      "govern": "partial",
      "identify": "yes", 
      "protect": "partial",
      "detect": "no",
      "respond": "partial",
      "recover": "no"
    },
    "assessed_by": "Security Team Lead",
    "confidence_level": "medium",
    "notes": "Initial assessment based on current documentation review"
  }
}
```

**Response:**
```json
{
  "success": true,
  "assessment_id": "ASSESS-20240312-001",
  "message": "Quick assessment completed successfully",
  "initial_maturity_scores": {
    "govern": 2.5,
    "identify": 3.0,
    "protect": 2.0,
    "detect": 1.0,
    "respond": 2.5,
    "recover": 1.0,
    "overall_average": 2.0
  },
  "details": {
    "assessmentsCreated": 106,
    "functionSummaries": [
      {
        "function": "Govern",
        "average_score": 2.5,
        "assessed_subcategories": 22,
        "key_gaps": ["Policy documentation", "Risk management procedures"]
      }
    ],
    "recommendations": [
      "Prioritize detection capability development",
      "Establish formal incident response procedures", 
      "Develop business continuity and recovery plans"
    ],
    "next_steps": [
      "Conduct detailed maturity assessment",
      "Generate gap analysis report",
      "Create implementation priority matrix"
    ]
  }
}
```

## assess_maturity

Perform comprehensive maturity assessment across all NIST CSF functions and subcategories.

### Parameters

```typescript
interface AssessMaturityParams {
  profile_id: string;                  // Target profile
  include_recommendations?: boolean;    // Default: true
  include_subcategory_details?: boolean; // Default: false
  assessment_scope?: {
    functions?: string[];              // Limit to specific functions
    categories?: string[];             // Limit to specific categories  
  };
  maturity_model?: 'cmmi' | 'nist' | 'custom'; // Default: 'nist'
}
```

### Response

```typescript
interface AssessMaturityResponse {
  success: boolean;
  assessment_id: string;
  profile_id: string;
  assessment_date: string;
  overall_maturity_tier: string;       // e.g., "Tier 2 - Risk Informed"
  overall_maturity_score: number;      // 0-5 scale
  function_breakdown: FunctionMaturity[];
  subcategory_details?: SubcategoryMaturity[];
  recommendations?: {
    immediate_actions: string[];
    strategic_initiatives: string[];
    capability_improvements: string[];
  };
  maturity_progression: {
    current_tier: string;
    next_tier: string;
    advancement_requirements: string[];
    estimated_effort: string;
  };
}
```

### Examples

#### Comprehensive Maturity Assessment
```json
{
  "tool": "assess_maturity",
  "arguments": {
    "profile_id": "PROF-20240312-001",
    "include_recommendations": true,
    "include_subcategory_details": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "assessment_id": "MATURITY-20240312-001",
  "profile_id": "PROF-20240312-001", 
  "assessment_date": "2024-03-12T10:45:00Z",
  "overall_maturity_tier": "Tier 2 - Risk Informed",
  "overall_maturity_score": 2.3,
  "function_breakdown": [
    {
      "function_id": "GV",
      "function_name": "Govern",
      "maturity_score": 2.8,
      "maturity_tier": "Tier 3 - Repeatable", 
      "assessed_subcategories": 22,
      "strengths": ["Policy framework", "Risk governance"],
      "weaknesses": ["Supply chain oversight", "Third-party risk management"]
    },
    {
      "function_id": "DE",
      "function_name": "Detect",
      "maturity_score": 1.5,
      "maturity_tier": "Tier 1 - Partial",
      "assessed_subcategories": 13,
      "strengths": ["Basic monitoring"],
      "weaknesses": ["Continuous monitoring", "Anomaly detection", "Threat intelligence"]
    }
  ],
  "recommendations": {
    "immediate_actions": [
      "Implement continuous security monitoring",
      "Establish incident detection procedures",
      "Deploy security information and event management (SIEM)"
    ],
    "strategic_initiatives": [
      "Develop comprehensive cyber threat intelligence program",
      "Establish security operations center (SOC)",
      "Implement advanced threat detection capabilities"
    ],
    "capability_improvements": [
      "Enhance security awareness training",
      "Improve vulnerability management processes",
      "Strengthen access control mechanisms"
    ]
  },
  "maturity_progression": {
    "current_tier": "Tier 2 - Risk Informed",
    "next_tier": "Tier 3 - Repeatable", 
    "advancement_requirements": [
      "Establish repeatable processes across all functions",
      "Implement continuous improvement mechanisms",
      "Achieve consistent capability maturity"
    ],
    "estimated_effort": "12-18 months with dedicated resources"
  }
}
```

## calculate_risk_score

Calculate organizational risk score based on implementation gaps and threat landscape.

### Parameters

```typescript
interface CalculateRiskScoreParams {
  profile_id: string;                  // Target profile
  threat_weights?: {                   // Custom threat weightings
    govern: number;                    // Default: 1.5
    identify: number;                  // Default: 1.3  
    protect: number;                   // Default: 1.4
    detect: number;                    // Default: 1.2
    respond: number;                   // Default: 1.1
    recover: number;                   // Default: 1.0
  };
  include_heat_map?: boolean;          // Default: true
  include_recommendations?: boolean;   // Default: true
  risk_context?: {
    industry_sector: string;
    threat_environment: 'low' | 'medium' | 'high' | 'critical';
    regulatory_requirements: string[];
  };
}
```

### Response

```typescript
interface CalculateRiskScoreResponse {
  success: boolean;
  profile_id: string;
  overall_risk_score: number;          // 0-100 scale
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  assessment_date: string;
  function_risks: FunctionRisk[];
  heat_map_data?: HeatMapData[];
  risk_summary: {
    critical_risks: number;
    high_risks: number;
    medium_risks: number;
    low_risks: number;
    top_risk_areas: string[];
    coverage_percentage: number;
  };
  recommendations?: {
    critical_actions: string[];
    risk_mitigation: string[];
    quick_improvements: string[];
  };
}
```

### Examples

#### Calculate Risk with Custom Weights
```json
{
  "tool": "calculate_risk_score",
  "arguments": {
    "profile_id": "PROF-20240312-001",
    "threat_weights": {
      "govern": 1.8,
      "identify": 1.5,
      "protect": 1.6,
      "detect": 1.4,
      "respond": 1.2,
      "recover": 1.0
    },
    "include_heat_map": true,
    "include_recommendations": true,
    "risk_context": {
      "industry_sector": "technology",
      "threat_environment": "high",
      "regulatory_requirements": ["SOX", "GDPR"]
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "profile_id": "PROF-20240312-001",
  "overall_risk_score": 67.5,
  "risk_level": "High",
  "assessment_date": "2024-03-12T11:00:00Z",
  "function_risks": [
    {
      "function_id": "DE",
      "function_name": "Detect", 
      "weighted_risk_score": 85.2,
      "risk_level": "Critical",
      "high_risk_count": 8,
      "subcategory_count": 13,
      "max_risk": 95,
      "risk_contributors": [
        "Monitoring capabilities limited",
        "Detection Processes missing",
        "Anomaly detection absent"
      ]
    },
    {
      "function_id": "RC",
      "function_name": "Recover",
      "weighted_risk_score": 78.1,
      "risk_level": "High",
      "high_risk_count": 6,
      "subcategory_count": 14,
      "max_risk": 90,
      "risk_contributors": [
        "Recovery Planning missing",
        "Communications plan absent"
      ]
    }
  ],
  "risk_summary": {
    "critical_risks": 1,
    "high_risks": 3,
    "medium_risks": 2,
    "low_risks": 0,
    "top_risk_areas": [
      "Detect (85.2)",
      "Recover (78.1)",
      "Respond (65.8)"
    ],
    "coverage_percentage": 32.5
  },
  "recommendations": {
    "critical_actions": [
      "Address Detect: Monitoring capabilities limited",
      "Address Recover: Recovery Planning missing", 
      "Address Respond: Response Planning incomplete"
    ],
    "risk_mitigation": [
      "Implement emergency response procedures immediately",
      "Conduct comprehensive security assessment",
      "Establish 24/7 monitoring capabilities",
      "Deploy additional monitoring tools"
    ],
    "quick_improvements": [
      "Quick win: Improve Protect (3 high-risk areas)",
      "Quick win: Improve Govern (2 high-risk areas)"
    ]
  }
}
```

## Error Handling

### Common Error Responses

```typescript
interface AssessmentErrorResponse {
  success: false;
  error: string;
  error_code: string;
  details?: any;
  recovery_suggestions?: string[];
}
```

### Error Codes

| Error Code | Description | Common Causes |
|------------|-------------|---------------|
| `PROFILE_NOT_FOUND` | Profile doesn't exist | Invalid profile_id |
| `PROFILE_EXISTS` | Profile already exists | Duplicate org_name + profile_type |
| `INVALID_ASSESSMENT_DATA` | Assessment data validation failed | Missing required fields |
| `ASSESSMENT_IN_PROGRESS` | Another assessment is running | Wait for completion or cancel |
| `INSUFFICIENT_DATA` | Not enough data for calculation | Complete basic assessments first |

## Performance Considerations

### Optimization Guidelines

1. **Profile Management**: Reuse profiles for multiple assessments
2. **Assessment Scope**: Limit scope for faster execution
3. **Concurrent Assessments**: Avoid running multiple assessments simultaneously
4. **Data Caching**: Assessment results are cached for 24 hours

### Performance Metrics

- **Profile Creation**: <500ms average response time
- **Quick Assessment**: <2s for 106 subcategories  
- **Maturity Assessment**: <5s for comprehensive analysis
- **Risk Calculation**: <3s including heat map generation

This API provides comprehensive cybersecurity assessment capabilities with enterprise-grade performance and reliability.