# Planning & Analysis API Reference

This document provides detailed API reference for planning, analysis, and implementation tools in the NIST CSF 2.0 MCP Server.

## Tools Overview

| Tool | Purpose | Input Schema | Response Type |
|------|---------|-------------|---------------|
| `generate_gap_analysis` | Compare current vs target states | GapAnalysisParams | GapAnalysisResult |
| `generate_priority_matrix` | Prioritize implementation efforts | PriorityMatrixParams | PriorityMatrixResult |
| `create_implementation_plan` | Generate detailed implementation roadmap | ImplementationPlanParams | ImplementationPlanResult |
| `estimate_implementation_cost` | Calculate implementation costs | CostEstimationParams | CostEstimationResult |

## generate_gap_analysis

Generate comprehensive gap analysis comparing current state against target state or industry benchmarks.

### Parameters

```typescript
interface GapAnalysisParams {
  current_profile_id: string;         // Current state profile
  target_profile_id: string;          // Target state profile (optional if using benchmarks)
  analysis_name?: string;             // Custom analysis name
  include_priority_matrix?: boolean;  // Default: false
  include_visualizations?: boolean;   // Default: true
  minimum_gap_score?: number;         // Filter gaps below threshold (0-5)
  analysis_scope?: {
    functions?: string[];             // Limit to specific functions
    categories?: string[];            // Limit to specific categories
  };
  benchmark_comparison?: {
    industry_sector: string;
    organization_size: string;
    use_industry_averages: boolean;
  };
}
```

### Response

```typescript
interface GapAnalysisResult {
  success: boolean;
  analysis_id: string;
  analysis_name: string;
  current_profile_id: string;
  target_profile_id?: string;
  analysis_date: string;
  gap_summary: {
    total_gaps: number;
    critical_gaps: number;           // Gap score >= 4
    major_gaps: number;              // Gap score 3-3.9
    moderate_gaps: number;           // Gap score 2-2.9
    minor_gaps: number;              // Gap score 1-1.9
    average_gap_score: number;
    functions_with_gaps: string[];
  };
  function_gaps: FunctionGapAnalysis[];
  detailed_gaps: SubcategoryGap[];
  priority_matrix?: PriorityMatrix;
  recommendations: {
    immediate_actions: string[];
    strategic_initiatives: string[];
    resource_requirements: string[];
    timeline_estimates: string[];
  };
  visualization_data?: {
    gap_heatmap: HeatMapData;
    function_comparison: ComparisonChart;
    progress_roadmap: RoadmapData;
  };
}
```

### Examples

#### Comprehensive Gap Analysis
```json
{
  "tool": "generate_gap_analysis",
  "arguments": {
    "current_profile_id": "PROF-CURRENT-001",
    "target_profile_id": "PROF-TARGET-001", 
    "analysis_name": "Q1 2024 Security Gap Analysis",
    "include_priority_matrix": true,
    "include_visualizations": true,
    "minimum_gap_score": 1.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "analysis_id": "GAP-20240312-001",
  "analysis_name": "Q1 2024 Security Gap Analysis",
  "current_profile_id": "PROF-CURRENT-001",
  "target_profile_id": "PROF-TARGET-001",
  "analysis_date": "2024-03-12T12:00:00Z",
  "gap_summary": {
    "total_gaps": 47,
    "critical_gaps": 8,
    "major_gaps": 15,
    "moderate_gaps": 18,
    "minor_gaps": 6,
    "average_gap_score": 2.8,
    "functions_with_gaps": ["GV", "ID", "PR", "DE", "RS", "RC"]
  },
  "function_gaps": [
    {
      "function_id": "DE",
      "function_name": "Detect",
      "gap_count": 12,
      "average_gap_score": 4.2,
      "gap_level": "Critical",
      "key_gaps": [
        {
          "subcategory_id": "DE.CM-01",
          "subcategory_name": "Networks and network services are monitored",
          "current_score": 1,
          "target_score": 5,
          "gap_score": 4,
          "priority": "High"
        }
      ]
    }
  ],
  "recommendations": {
    "immediate_actions": [
      "Implement continuous network monitoring (DE.CM-01)",
      "Establish security operations center capabilities",
      "Deploy automated threat detection tools"
    ],
    "strategic_initiatives": [
      "Develop comprehensive cyber threat intelligence program",
      "Implement advanced persistent threat detection",
      "Establish incident response automation"
    ],
    "resource_requirements": [
      "Security operations team (3-5 FTE)",
      "SIEM/SOAR platform investment ($200K-500K)",
      "Training and certification budget ($50K annually)"
    ],
    "timeline_estimates": [
      "Critical gaps: 3-6 months",
      "Major gaps: 6-12 months", 
      "Moderate gaps: 12-18 months"
    ]
  }
}
```

#### Industry Benchmark Comparison
```json
{
  "tool": "generate_gap_analysis",
  "arguments": {
    "current_profile_id": "PROF-CURRENT-001",
    "analysis_name": "Industry Benchmark Analysis",
    "benchmark_comparison": {
      "industry_sector": "technology",
      "organization_size": "large",
      "use_industry_averages": true
    },
    "minimum_gap_score": 2.0
  }
}
```

## generate_priority_matrix

Create implementation priority matrix based on impact, effort, risk, and resource considerations.

### Parameters

```typescript
interface PriorityMatrixParams {
  profile_id: string;                 // Profile with gap analysis data
  matrix_type: 'effort_impact' | 'risk_resource' | 'custom';
  include_recommendations?: boolean;  // Default: true
  include_resource_estimates?: boolean; // Default: false
  max_items_per_quadrant?: number;    // Default: 15
  custom_criteria?: {
    x_axis_label: string;
    y_axis_label: string;
    scoring_method: string;
  };
  filter_criteria?: {
    minimum_gap_score?: number;
    functions?: string[];
    exclude_completed?: boolean;
  };
}
```

### Response

```typescript
interface PriorityMatrixResult {
  success: boolean;
  matrix_type: string;
  generation_date: string;
  profile_id: string;
  target_profile_id?: string;
  matrix_configuration: {
    x_axis_label: string;
    y_axis_label: string;
    x_axis_threshold: number;
    y_axis_threshold: number;
  };
  quadrants: {
    high_value_low_effort: Quadrant;      // Quick wins
    high_value_high_effort: Quadrant;     // Major projects
    low_value_low_effort: Quadrant;       // Fill-ins
    low_value_high_effort: Quadrant;      // Avoid/defer
  };
  summary: {
    total_items: number;
    quick_wins_count: number;
    strategic_initiatives_count: number;
    fill_ins_count: number;
    avoid_count: number;
    total_effort_required: number;        // Hours
    total_cost_estimate: number;          // USD
    average_risk_reduction: number;       // 0-100 scale
  };
  recommendations?: {
    immediate_focus: string[];
    resource_allocation: string[];
    phased_approach: string[];
    risk_mitigation: string[];
  };
  resource_estimates?: ResourceEstimates;
}
```

### Examples

#### Effort-Impact Priority Matrix
```json
{
  "tool": "generate_priority_matrix",
  "arguments": {
    "profile_id": "PROF-CURRENT-001",
    "matrix_type": "effort_impact",
    "include_recommendations": true,
    "include_resource_estimates": true,
    "max_items_per_quadrant": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "matrix_type": "effort_impact",
  "generation_date": "2024-03-12T12:15:00Z",
  "profile_id": "PROF-CURRENT-001",
  "matrix_configuration": {
    "x_axis_label": "Implementation Effort",
    "y_axis_label": "Security Impact",
    "x_axis_threshold": 2.5,
    "y_axis_threshold": 3.0
  },
  "quadrants": {
    "high_value_low_effort": {
      "name": "Quick Wins",
      "description": "High impact, low effort initiatives",
      "strategy": "Implement immediately for maximum ROI",
      "items": [
        {
          "subcategory_id": "GV.PO-01",
          "subcategory_name": "Policy is established and communicated",
          "current_state": "not_implemented",
          "target_state": "fully_implemented",
          "gap_score": 3.5,
          "x_axis_value": 2.0,      // Low effort
          "y_axis_value": 4.0,      // High impact
          "priority_score": 8.0,
          "estimated_effort_hours": 80,
          "estimated_cost": 15000,
          "risk_reduction": 75
        }
      ],
      "total_items": 6,
      "average_gap": 3.2,
      "total_effort_hours": 480,
      "total_cost": 95000,
      "average_risk_reduction": 68,
      "recommended_timeline": "1-3 months"
    },
    "high_value_high_effort": {
      "name": "Strategic Initiatives", 
      "description": "High impact, high effort projects",
      "strategy": "Plan carefully with dedicated resources",
      "items": [
        {
          "subcategory_id": "DE.CM-01",
          "subcategory_name": "Networks and network services are monitored",
          "current_state": "not_implemented",
          "target_state": "fully_implemented",
          "gap_score": 4.5,
          "x_axis_value": 4.5,      // High effort
          "y_axis_value": 4.8,      // High impact  
          "priority_score": 9.6,
          "estimated_effort_hours": 2000,
          "estimated_cost": 350000,
          "risk_reduction": 85
        }
      ],
      "total_items": 8,
      "average_gap": 4.1,
      "total_effort_hours": 12800,
      "total_cost": 2200000,
      "average_risk_reduction": 78,
      "recommended_timeline": "6-18 months"
    }
  },
  "summary": {
    "total_items": 28,
    "quick_wins_count": 6,
    "strategic_initiatives_count": 8,
    "fill_ins_count": 9,
    "avoid_count": 5,
    "total_effort_required": 15840,
    "total_cost_estimate": 2650000,
    "average_risk_reduction": 65
  },
  "recommendations": {
    "immediate_focus": [
      "Execute all 6 quick wins within next quarter",
      "Begin planning for top 3 strategic initiatives",
      "Allocate resources for continuous monitoring implementation"
    ],
    "resource_allocation": [
      "Dedicate 2 FTE for quick wins execution",
      "Plan for 8-10 FTE team for strategic initiatives",
      "Budget $500K for immediate implementations"
    ],
    "phased_approach": [
      "Phase 1 (0-3 months): Quick wins + planning",
      "Phase 2 (3-9 months): Strategic initiative execution",
      "Phase 3 (9-18 months): Fill-ins and optimization"
    ],
    "risk_mitigation": [
      "Prioritize critical infrastructure protection initiatives",
      "Implement interim controls while major projects are underway", 
      "Establish regular progress review checkpoints"
    ]
  }
}
```

## create_implementation_plan

Generate detailed implementation roadmap with phases, timelines, dependencies, and resource allocation.

### Parameters

```typescript
interface CreateImplementationPlanParams {
  gap_analysis_id?: string;           // Base plan on existing gap analysis
  profile_id?: string;               // Alternative: base on profile gaps
  timeline_months: number;           // Total implementation timeline
  available_resources: number;       // Available FTE resources
  prioritization_strategy: 'risk_based' | 'effort_based' | 'business_driven';
  phase_duration?: number;           // Months per phase (default: 3)
  include_dependencies?: boolean;     // Default: true
  include_milestones?: boolean;      // Default: true
  plan_name?: string;                // Custom plan name
  budget_constraints?: {
    total_budget: number;
    quarterly_budget: number;
  };
  resource_constraints?: {
    security_expertise_available: boolean;
    external_consultants_allowed: boolean;
    technology_refresh_budget: number;
  };
}
```

### Response

```typescript
interface ImplementationPlanResult {
  success: boolean;
  plan_id: string;
  plan_name: string;
  timeline_months: number;
  available_resources: number;
  total_phases: number;
  total_effort_hours: number;
  estimated_cost: number;
  phases: Phase[];
  dependency_graph?: {
    nodes: DependencyNode[];
    edges: DependencyEdge[];
    critical_path: string[];
    has_cycle: boolean;
  };
  milestones?: Milestone[];
  resource_allocation: ResourceAllocation[];
  risk_assessment: {
    high_risk_items: string[];
    mitigation_strategies: string[];
    contingency_plans: string[];
  };
}
```

### Examples

#### Risk-Based Implementation Plan
```json
{
  "tool": "create_implementation_plan",
  "arguments": {
    "gap_analysis_id": "GAP-20240312-001",
    "timeline_months": 18,
    "available_resources": 6,
    "prioritization_strategy": "risk_based",
    "phase_duration": 3,
    "include_dependencies": true,
    "include_milestones": true,
    "plan_name": "Enterprise Security Enhancement Program",
    "budget_constraints": {
      "total_budget": 3000000,
      "quarterly_budget": 500000
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "plan_id": "PLAN-20240312-001",
  "plan_name": "Enterprise Security Enhancement Program",
  "timeline_months": 18,
  "available_resources": 6,
  "total_phases": 6,
  "total_effort_hours": 15840,
  "estimated_cost": 2650000,
  "phases": [
    {
      "id": "PHASE-001",
      "phase_number": 1,
      "phase_name": "Foundation & Quick Wins",
      "start_month": 1,
      "end_month": 3,
      "effort_hours": 1440,
      "resource_count": 6,
      "items": [
        {
          "id": "ITEM-001",
          "subcategory_id": "GV.PO-01",
          "subcategory_name": "Policy establishment",
          "priority_rank": 1,
          "effort_hours": 80,
          "dependencies": [],
          "prerequisite_items": [],
          "status": "planned"
        }
      ],
      "milestones": [
        {
          "name": "Security Policy Framework Completed",
          "target_month": 2,
          "success_criteria": "All foundation policies approved and published",
          "deliverables": ["Security policy suite", "Awareness materials"]
        }
      ],
      "status": "planned"
    }
  ],
  "dependency_graph": {
    "nodes": [
      {
        "id": "GV.PO-01",
        "name": "Security Policy",
        "type": "foundation",
        "effort_hours": 80
      }
    ],
    "edges": [
      {
        "from": "GV.PO-01",
        "to": "PR.AC-01", 
        "dependency_type": "prerequisite",
        "delay_weeks": 2
      }
    ],
    "critical_path": ["GV.PO-01", "PR.AC-01", "DE.CM-01"],
    "has_cycle": false
  },
  "milestones": [
    {
      "name": "Foundation Security Controls",
      "target_month": 3,
      "success_criteria": "Basic security framework operational",
      "deliverables": ["Policies", "Procedures", "Initial training"]
    }
  ],
  "resource_allocation": [
    {
      "phase": 1,
      "internal_fte": 4,
      "external_consultants": 2,
      "budget_allocation": 450000,
      "skill_requirements": ["Security policy", "Risk management", "Compliance"]
    }
  ],
  "risk_assessment": {
    "high_risk_items": [
      "Resource availability during peak project periods",
      "External consultant availability for specialized skills",
      "Technology integration complexities"
    ],
    "mitigation_strategies": [
      "Cross-train internal team members on critical skills",
      "Establish backup consultant relationships",
      "Conduct proof-of-concept testing before major deployments"
    ],
    "contingency_plans": [
      "Extend timeline by 3 months if critical resources unavailable",
      "Reduce scope to essential items if budget constraints arise",
      "Implement interim solutions to maintain security posture"
    ]
  }
}
```

## estimate_implementation_cost

Generate detailed cost estimates for cybersecurity implementation activities including one-time and ongoing costs.

### Parameters

```typescript
interface EstimateImplementationCostParams {
  subcategory_ids: string[];          // Specific subcategories to estimate
  organization_size: 'small' | 'medium' | 'large' | 'enterprise';
  include_ongoing_costs?: boolean;    // Default: true
  include_risk_adjusted?: boolean;    // Default: false  
  currency: 'USD' | 'EUR' | 'GBP';   // Default: 'USD'
  cost_model?: 'conservative' | 'aggressive' | 'realistic'; // Default: 'realistic'
  include_contingency?: boolean;      // Default: true (adds 15-25%)
  regional_multiplier?: number;       // Cost adjustment for region (default: 1.0)
}
```

### Response

```typescript
interface EstimateImplementationCostResult {
  success: boolean;
  estimation_date: string;
  currency: string;
  organization_size: string;
  cost_model: string;
  total_cost: number;
  cost_breakdown: {
    one_time: {
      labor_cost: number;
      tools_cost: number;
      training_cost: number;
      consulting_cost: number;
      contingency: number;
      total_one_time: number;
    };
    annual_recurring: {
      license_costs: number;
      maintenance_costs: number;
      personnel_costs: number;
      training_refresh: number;
      total_annual: number;
    };
    three_year_tco: number;           // Total cost of ownership
  };
  subcategory_estimates: SubcategoryCostEstimate[];
  cost_factors: {
    labor_rate_per_hour: number;
    consultant_rate_per_hour: number;
    regional_multiplier: number;
    contingency_percentage: number;
  };
  recommendations: {
    cost_optimization: string[];
    phased_investment: string[];
    roi_considerations: string[];
  };
}
```

### Examples

#### Multi-Subcategory Cost Estimation
```json
{
  "tool": "estimate_implementation_cost",
  "arguments": {
    "subcategory_ids": ["GV.PO-01", "PR.AC-01", "DE.CM-01", "RS.RP-01"],
    "organization_size": "large",
    "include_ongoing_costs": true,
    "include_risk_adjusted": false,
    "currency": "USD",
    "include_contingency": true,
    "cost_model": "realistic"
  }
}
```

**Response:**
```json
{
  "success": true,
  "estimation_date": "2024-03-12T12:30:00Z",
  "currency": "USD",
  "organization_size": "large", 
  "cost_model": "realistic",
  "total_cost": 847500,
  "cost_breakdown": {
    "one_time": {
      "labor_cost": 480000,
      "tools_cost": 225000,
      "training_cost": 65000,
      "consulting_cost": 120000,
      "contingency": 133500,
      "total_one_time": 1023500
    },
    "annual_recurring": {
      "license_costs": 85000,
      "maintenance_costs": 45000,
      "personnel_costs": 180000,
      "training_refresh": 12000,
      "total_annual": 322000
    },
    "three_year_tco": 1989500
  },
  "subcategory_estimates": [
    {
      "subcategory_id": "DE.CM-01",
      "subcategory_name": "Network monitoring",
      "implementation_approach": "SIEM deployment with monitoring tools",
      "effort_estimate": {
        "hours": 800,
        "duration_weeks": 16,
        "team_size": 3
      },
      "cost_breakdown": {
        "labor": 120000,
        "tools": 185000,
        "training": 25000,
        "consulting": 60000,
        "total": 390000
      },
      "ongoing_costs": {
        "annual_licenses": 45000,
        "annual_maintenance": 25000,
        "annual_personnel": 80000
      }
    }
  ],
  "cost_factors": {
    "labor_rate_per_hour": 150,
    "consultant_rate_per_hour": 250,
    "regional_multiplier": 1.0,
    "contingency_percentage": 15
  },
  "recommendations": {
    "cost_optimization": [
      "Consider phased SIEM deployment to spread costs",
      "Leverage existing infrastructure where possible", 
      "Negotiate multi-year licensing agreements for better rates"
    ],
    "phased_investment": [
      "Phase 1: Core policies and procedures ($180K)",
      "Phase 2: Technology infrastructure ($620K)",
      "Phase 3: Advanced capabilities and optimization ($230K)"
    ],
    "roi_considerations": [
      "Risk reduction value: $2.5M annually in avoided incidents",
      "Compliance cost avoidance: $500K annually",
      "Operational efficiency gains: 15% reduction in security operations costs"
    ]
  }
}
```

## Error Handling

### Common Error Responses

```typescript
interface PlanningErrorResponse {
  success: false;
  error: string;
  error_code: string;
  details?: any;
  recovery_actions?: string[];
}
```

### Error Codes

| Error Code | Description | Common Causes |
|------------|-------------|---------------|
| `PROFILE_DATA_INSUFFICIENT` | Not enough assessment data | Complete assessments first |
| `INVALID_TIMELINE` | Timeline constraints impossible | Adjust resources or timeline |
| `BUDGET_CONSTRAINT_VIOLATION` | Costs exceed budget limits | Increase budget or reduce scope |
| `RESOURCE_ALLOCATION_ERROR` | Resource planning conflict | Adjust resource availability |
| `DEPENDENCY_CYCLE_DETECTED` | Circular dependencies found | Review implementation order |

## Performance Considerations

### Optimization Guidelines

1. **Gap Analysis**: Use targeted scope for faster analysis
2. **Priority Matrix**: Limit items per quadrant for manageable results  
3. **Implementation Plans**: Balance detail with execution speed
4. **Cost Estimation**: Cache estimates for similar configurations

### Performance Metrics

- **Gap Analysis**: <5s for comprehensive analysis
- **Priority Matrix**: <3s for standard configurations
- **Implementation Plans**: <8s for complex 18-month plans
- **Cost Estimation**: <2s for multiple subcategories

This API enables comprehensive cybersecurity planning with data-driven insights and actionable recommendations.