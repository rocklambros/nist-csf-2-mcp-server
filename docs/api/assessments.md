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
| `get_assessment_questions` | Retrieve comprehensive question bank | QuestionBankParams | QuestionSetResult |
| `validate_assessment_responses` | Validate response completeness | ValidationParams | ValidationResult |
| `get_question_context` | Get question guidance and context | QuestionContextParams | ContextResult |

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

## get_assessment_questions

Retrieve comprehensive assessment questions from the question bank covering all 106 NIST CSF 2.0 subcategories.

### Parameters

```typescript
interface GetAssessmentQuestionsParams {
  assessment_type?: 'quick' | 'detailed';     // Default: 'detailed'
  function?: 'GV' | 'ID' | 'PR' | 'DE' | 'RS' | 'RC';
  category?: string;                          // e.g., 'GV.OC'
  subcategory_ids?: string[];                 // Specific subcategories
  assessment_dimension?: 'risk' | 'maturity' | 'implementation' | 'effectiveness';
  organization_size?: 'small' | 'medium' | 'large' | 'enterprise';
  sector?: 'technology' | 'healthcare' | 'finance' | 'government' | 'other';
  include_examples?: boolean;                 // Default: true
  include_references?: boolean;               // Default: true
  include_scoring_guidance?: boolean;         // Default: true
  limit?: number;                            // Default: 50
  offset?: number;                           // Default: 0
}
```

### Response

```typescript
interface GetAssessmentQuestionsResponse {
  success: boolean;
  questions: AssessmentQuestion[];
  metadata: {
    total_questions: number;
    total_subcategories_covered: number;
    assessment_dimensions_included: string[];
    estimated_completion_time_minutes: number;
    coverage_statistics: {
      functions: FunctionCoverage[];
      dimensions: DimensionCoverage[];
    };
  };
  scoring_guidance: {
    risk_levels: RiskLevelDefinition[];
    maturity_levels: MaturityLevelDefinition[];
    scoring_scale: string;
  };
}

interface AssessmentQuestion {
  question_id: string;
  subcategory_id: string;
  question_text: string;
  question_type: 'multiple_choice';
  assessment_dimension: 'risk' | 'maturity' | 'implementation' | 'effectiveness';
  help_text: string;
  weight: number;
  options: QuestionOption[];
}

interface QuestionOption {
  option_id: string;
  option_label: string;
  option_description: string;
  option_value: number;                       // 0-10 scoring
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  maturity_level: 'initial' | 'developing' | 'defined' | 'managed' | 'optimizing';
  sort_order: number;
}
```

### Examples

#### Get All Risk Assessment Questions
```json
{
  "tool": "get_assessment_questions",
  "arguments": {
    "assessment_type": "detailed",
    "assessment_dimension": "risk",
    "include_scoring_guidance": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "questions": [
    {
      "question_id": "GV.OC-01_risk",
      "subcategory_id": "GV.OC-01",
      "question_text": "What is the risk level associated with your organization's cybersecurity context and stakeholder management?",
      "question_type": "multiple_choice",
      "assessment_dimension": "risk",
      "help_text": "This question assesses risk for GV.OC-01",
      "weight": 1.0,
      "options": [
        {
          "option_id": "GV.OC-01_risk_opt_1",
          "option_label": "No significant risk identified - comprehensive controls in place",
          "option_description": "Score: 10, Risk: low, Maturity: managed",
          "option_value": 10,
          "risk_level": "low",
          "maturity_level": "managed",
          "sort_order": 1
        },
        {
          "option_id": "GV.OC-01_risk_opt_5",
          "option_label": "Critical risk - no controls in place or complete failure",
          "option_description": "Score: 0, Risk: critical, Maturity: initial",
          "option_value": 0,
          "risk_level": "critical",
          "maturity_level": "initial",
          "sort_order": 5
        }
      ]
    }
  ],
  "metadata": {
    "total_questions": 106,
    "total_subcategories_covered": 106,
    "assessment_dimensions_included": ["risk"],
    "estimated_completion_time_minutes": 25,
    "coverage_statistics": {
      "functions": [
        {
          "function_id": "GV",
          "function_name": "Govern",
          "questions_count": 31,
          "subcategories_covered": 31
        }
      ],
      "dimensions": [
        {
          "dimension": "risk",
          "questions_count": 106,
          "subcategories_covered": 106
        }
      ]
    }
  },
  "scoring_guidance": {
    "risk_levels": [
      {
        "level": "low",
        "description": "Minimal risk with comprehensive controls",
        "score_range": "7-10"
      },
      {
        "level": "critical",
        "description": "Severe risk requiring immediate attention",
        "score_range": "0-2"
      }
    ],
    "maturity_levels": [
      {
        "level": "managed",
        "description": "Established processes with regular monitoring",
        "characteristics": ["Documented procedures", "Regular reviews", "Performance metrics"]
      }
    ],
    "scoring_scale": "0-10 point scale with risk and maturity level mappings"
  }
}
```

#### Get Questions for Specific Function
```json
{
  "tool": "get_assessment_questions",
  "arguments": {
    "function": "DE",
    "assessment_type": "detailed",
    "include_examples": true
  }
}
```

## validate_assessment_responses

Validate assessment responses for completeness and consistency across all dimensions.

### Parameters

```typescript
interface ValidateAssessmentResponsesParams {
  profile_id: string;
  responses: AssessmentResponse[];
  validation_level: 'basic' | 'comprehensive';    // Default: 'comprehensive'
  require_all_dimensions?: boolean;               // Default: true
  require_all_subcategories?: boolean;            // Default: false
  cross_dimensional_validation?: boolean;         // Default: true
}

interface AssessmentResponse {
  question_id: string;
  subcategory_id: string;
  assessment_dimension: 'risk' | 'maturity' | 'implementation' | 'effectiveness';
  response_value: number;                         // 0-10 scale
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  maturity_level?: 'initial' | 'developing' | 'defined' | 'managed' | 'optimizing';
  notes?: string;
  evidence?: string;
  response_date?: string;                        // ISO date string
}
```

### Response

```typescript
interface ValidateAssessmentResponsesResponse {
  success: boolean;
  validation_status: 'valid' | 'partial' | 'invalid';
  validation_summary: {
    total_responses: number;
    valid_responses: number;
    missing_responses: number;
    invalid_responses: number;
    completeness_percentage: number;
  };
  dimension_coverage: {
    risk: number;              // % coverage
    maturity: number;
    implementation: number;
    effectiveness: number;
  };
  validation_issues: ValidationIssue[];
  recommendations: string[];
  missing_assessments: {
    subcategory_id: string;
    missing_dimensions: string[];
  }[];
}

interface ValidationIssue {
  issue_type: 'missing_response' | 'invalid_value' | 'inconsistent_cross_dimension' | 'missing_evidence';
  severity: 'error' | 'warning' | 'info';
  question_id: string;
  subcategory_id: string;
  assessment_dimension: string;
  description: string;
  suggested_resolution: string;
}
```

### Examples

#### Comprehensive Validation
```json
{
  "tool": "validate_assessment_responses",
  "arguments": {
    "profile_id": "PROF-20240312-001",
    "responses": [
      {
        "question_id": "GV.OC-01_risk",
        "subcategory_id": "GV.OC-01",
        "assessment_dimension": "risk",
        "response_value": 5,
        "risk_level": "medium",
        "maturity_level": "defined",
        "notes": "Some governance processes in place but gaps exist",
        "evidence": "Policy documents, but missing stakeholder engagement framework"
      },
      {
        "question_id": "GV.OC-01_maturity",
        "subcategory_id": "GV.OC-01",
        "assessment_dimension": "maturity",
        "response_value": 6,
        "risk_level": "medium",
        "maturity_level": "defined"
      }
    ],
    "validation_level": "comprehensive",
    "require_all_dimensions": true,
    "cross_dimensional_validation": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "validation_status": "partial",
  "validation_summary": {
    "total_responses": 2,
    "valid_responses": 2,
    "missing_responses": 422,
    "invalid_responses": 0,
    "completeness_percentage": 0.47
  },
  "dimension_coverage": {
    "risk": 0.94,
    "maturity": 0.94,
    "implementation": 0.0,
    "effectiveness": 0.0
  },
  "validation_issues": [
    {
      "issue_type": "missing_response",
      "severity": "warning",
      "question_id": "GV.OC-01_implementation",
      "subcategory_id": "GV.OC-01",
      "assessment_dimension": "implementation",
      "description": "Missing implementation assessment for GV.OC-01",
      "suggested_resolution": "Complete implementation assessment to get full subcategory coverage"
    }
  ],
  "recommendations": [
    "Complete assessment for all 4 dimensions per subcategory",
    "Focus on missing implementation and effectiveness assessments",
    "Ensure cross-dimensional consistency in responses"
  ],
  "missing_assessments": [
    {
      "subcategory_id": "GV.OC-01",
      "missing_dimensions": ["implementation", "effectiveness"]
    }
  ]
}
```

## get_question_context

Get detailed context, guidance, and scoring information for specific assessment questions.

### Parameters

```typescript
interface GetQuestionContextParams {
  subcategory_id: string;
  assessment_dimension?: 'risk' | 'maturity' | 'implementation' | 'effectiveness';
  include_implementation_examples?: boolean;      // Default: true
  include_references?: boolean;                  // Default: true
  include_scoring_guidance?: boolean;            // Default: true
  include_related_subcategories?: boolean;      // Default: true
  organization_context?: {
    sector: 'technology' | 'healthcare' | 'finance' | 'government' | 'other';
    size: 'small' | 'medium' | 'large' | 'enterprise';
  };
}
```

### Response

```typescript
interface GetQuestionContextResponse {
  success: boolean;
  subcategory_id: string;
  subcategory_details: {
    description: string;
    function: string;
    category: string;
    importance: string;
  };
  dimension_guidance: {
    [dimension: string]: {
      question_text: string;
      assessment_focus: string;
      scoring_rubric: ScoringRubric[];
      best_practices: string[];
      common_challenges: string[];
    };
  };
  implementation_examples?: ImplementationExample[];
  references?: Reference[];
  related_subcategories?: RelatedSubcategory[];
  sector_specific_guidance?: SectorGuidance;
}

interface ScoringRubric {
  score_range: string;
  risk_level: string;
  maturity_level: string;
  description: string;
  indicators: string[];
}
```

### Examples

#### Get Complete Context for Governance Subcategory
```json
{
  "tool": "get_question_context",
  "arguments": {
    "subcategory_id": "GV.OC-01",
    "include_implementation_examples": true,
    "include_references": true,
    "include_scoring_guidance": true,
    "organization_context": {
      "sector": "technology",
      "size": "large"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "subcategory_id": "GV.OC-01",
  "subcategory_details": {
    "description": "The organizational cybersecurity strategy is established and communicated",
    "function": "Govern",
    "category": "Organizational Context",
    "importance": "Foundation for all cybersecurity activities and alignment with business objectives"
  },
  "dimension_guidance": {
    "risk": {
      "question_text": "What is the risk level associated with your organization's cybersecurity context and stakeholder management?",
      "assessment_focus": "Current risk exposure from inadequate organizational cybersecurity strategy",
      "scoring_rubric": [
        {
          "score_range": "8-10",
          "risk_level": "low",
          "maturity_level": "managed",
          "description": "Comprehensive cybersecurity strategy with strong governance",
          "indicators": ["Documented strategy", "Regular reviews", "Stakeholder engagement", "Board oversight"]
        },
        {
          "score_range": "0-2",
          "risk_level": "critical",
          "maturity_level": "initial",
          "description": "No cybersecurity strategy or governance framework",
          "indicators": ["No strategy document", "Lack of leadership support", "No stakeholder engagement"]
        }
      ],
      "best_practices": [
        "Develop comprehensive cybersecurity strategy aligned with business objectives",
        "Ensure regular board and executive oversight",
        "Establish clear stakeholder communication channels"
      ],
      "common_challenges": [
        "Lack of executive buy-in and support",
        "Difficulty aligning cybersecurity with business priorities",
        "Insufficient stakeholder engagement"
      ]
    },
    "maturity": {
      "question_text": "What is the maturity level of your organizational cybersecurity context management?",
      "assessment_focus": "Organizational maturity in cybersecurity strategy and governance",
      "best_practices": [
        "Implement continuous improvement processes",
        "Regular strategy reviews and updates",
        "Metrics-driven governance approach"
      ]
    }
  },
  "implementation_examples": [
    {
      "example_title": "Technology Sector - Large Organization",
      "description": "Enterprise cybersecurity strategy framework",
      "implementation_steps": [
        "Establish cybersecurity steering committee with C-level participation",
        "Develop comprehensive strategy document aligned with business objectives",
        "Implement regular quarterly reviews and updates",
        "Create stakeholder communication and reporting framework"
      ],
      "success_metrics": [
        "Strategy approval at board level",
        "Regular stakeholder feedback collection",
        "Measurable alignment with business objectives"
      ]
    }
  ],
  "sector_specific_guidance": {
    "sector": "technology",
    "specific_considerations": [
      "Rapid technology change requires agile strategy updates",
      "Strong focus on intellectual property protection",
      "Emphasis on secure software development lifecycle"
    ],
    "regulatory_requirements": ["SOX", "GDPR", "CCPA"],
    "industry_benchmarks": {
      "average_maturity_score": 3.2,
      "leading_practice_score": 4.5
    }
  }
}
```

## Performance Considerations

### Enhanced Performance Metrics

- **Question Retrieval**: <200ms for full question bank (424 questions)
- **Validation Processing**: <500ms for comprehensive validation
- **Context Generation**: <300ms for detailed guidance
- **Cross-dimensional Analysis**: <1s for consistency checks

### Question Bank Statistics

- **Total Questions**: 424 questions across all subcategories
- **Assessment Dimensions**: 4 per subcategory (risk, maturity, implementation, effectiveness)
- **Response Options**: 2,120 total options with detailed scoring
- **Complete Coverage**: 100% of NIST CSF 2.0 subcategories (106/106)
- **Estimated Assessment Time**: 15-45 minutes for comprehensive evaluation

This API provides comprehensive cybersecurity assessment capabilities with enterprise-grade performance and reliability.