# Reporting & Data Export API Reference

This document provides detailed API reference for reporting, progress tracking, and data export tools in the NIST CSF 2.0 MCP Server.

## Tools Overview

| Tool | Purpose | Input Schema | Response Type |
|------|---------|-------------|---------------|
| `track_progress` | Update implementation progress | ProgressTrackingParams | ProgressSummary |
| `generate_report` | Create comprehensive reports | ReportGenerationParams | ReportResult |
| `export_data` | Export data in various formats | DataExportParams | ExportResult |
| `compare_profiles` | Compare multiple profiles | ProfileComparisonParams | ComparisonResult |

## track_progress

Update and track implementation progress across subcategories with status updates, milestones, and completion tracking.

### Parameters

```typescript
interface ProgressTrackingParams {
  profile_id: string;                 // Target profile for updates
  updates: ProgressUpdate[];          // Array of progress updates
  update_metadata?: {
    updated_by: string;
    update_reason: string;
    batch_id?: string;
    milestone_achieved?: string;
  };
}

interface ProgressUpdate {
  subcategory_id: string;
  current_implementation: 'not_implemented' | 'partially_implemented' | 'largely_implemented' | 'fully_implemented';
  current_maturity: number;           // 0-5 scale
  status: 'on_track' | 'at_risk' | 'behind' | 'blocked' | 'completed';
  completion_percentage?: number;     // 0-100
  notes?: string;
  evidence_links?: string[];
  target_completion_date?: string;    // ISO date
  assigned_to?: string;
  blockers?: string[];
}
```

### Response

```typescript
interface ProgressSummaryResponse {
  success: boolean;
  profile_id: string;
  total_subcategories: number;
  completed: number;
  on_track: number;
  at_risk: number;
  behind: number;
  blocked: number;
  overall_completion_percentage: number;
  last_updated: string;
  update_summary: {
    updates_processed: number;
    status_changes: number;
    new_completions: number;
    blockers_identified: number;
  };
  function_progress: {
    [function_id: string]: FunctionProgress;
  };
  blocked_items: BlockedItem[];
  next_milestones: Milestone[];
  recommendations: string[];
}
```

### Examples

#### Batch Progress Update
```json
{
  "tool": "track_progress",
  "arguments": {
    "profile_id": "PROF-20240312-001",
    "updates": [
      {
        "subcategory_id": "GV.PO-01",
        "current_implementation": "fully_implemented",
        "current_maturity": 4,
        "status": "completed",
        "completion_percentage": 100,
        "notes": "Security policy framework completed and approved by leadership",
        "evidence_links": [
          "https://intranet/policies/security-policy-v2.pdf",
          "https://intranet/training/policy-awareness-completion.xlsx"
        ],
        "assigned_to": "Security Team Lead"
      },
      {
        "subcategory_id": "DE.CM-01",
        "current_implementation": "partially_implemented",
        "current_maturity": 2,
        "status": "at_risk",
        "completion_percentage": 35,
        "notes": "SIEM deployment behind schedule due to integration issues",
        "target_completion_date": "2024-06-30",
        "assigned_to": "Network Security Engineer",
        "blockers": [
          "Legacy system compatibility issues",
          "Vendor support delays"
        ]
      },
      {
        "subcategory_id": "PR.AC-01",
        "current_implementation": "largely_implemented",
        "current_maturity": 3,
        "status": "on_track",
        "completion_percentage": 80,
        "notes": "Identity management system deployed, final integrations in progress",
        "target_completion_date": "2024-04-15",
        "assigned_to": "Identity Management Team"
      }
    ],
    "update_metadata": {
      "updated_by": "Program Manager",
      "update_reason": "Monthly progress review",
      "milestone_achieved": "Phase 1 Foundation Controls"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "profile_id": "PROF-20240312-001",
  "total_subcategories": 106,
  "completed": 23,
  "on_track": 45,
  "at_risk": 18,
  "behind": 12,
  "blocked": 8,
  "overall_completion_percentage": 48,
  "last_updated": "2024-03-12T13:00:00Z",
  "update_summary": {
    "updates_processed": 3,
    "status_changes": 2,
    "new_completions": 1,
    "blockers_identified": 1
  },
  "function_progress": {
    "GV": {
      "function_name": "Govern",
      "total_subcategories": 22,
      "completed": 8,
      "on_track": 10,
      "at_risk": 3,
      "behind": 1,
      "blocked": 0,
      "completion_percentage": 55
    },
    "DE": {
      "function_name": "Detect",
      "total_subcategories": 13,
      "completed": 1,
      "on_track": 4,
      "at_risk": 5,
      "behind": 2,
      "blocked": 1,
      "completion_percentage": 25
    }
  },
  "blocked_items": [
    {
      "subcategory_id": "DE.CM-01",
      "subcategory_name": "Network monitoring",
      "blocked_since": "2024-02-15",
      "blocker_description": "Legacy system compatibility issues",
      "impact": "High",
      "escalation_required": true
    }
  ],
  "next_milestones": [
    {
      "name": "Identity Management Deployment",
      "target_date": "2024-04-15",
      "completion_percentage": 80,
      "at_risk": false
    }
  ],
  "recommendations": [
    "Escalate DE.CM-01 integration issues to vendor leadership",
    "Consider interim monitoring solutions while SIEM issues are resolved",
    "Accelerate PR.AC-01 completion to maintain project momentum"
  ]
}
```

## generate_report

Create comprehensive reports for different audiences including executive summaries, technical details, compliance reports, and progress updates.

### Parameters

```typescript
interface ReportGenerationParams {
  profile_id: string;                 // Target profile
  report_type: 'executive' | 'technical' | 'compliance' | 'progress' | 'gap_analysis' | 'custom';
  format: 'json' | 'html' | 'pdf' | 'markdown';
  include_recommendations?: boolean;  // Default: true
  include_charts?: boolean;           // Default: true for non-JSON formats
  date_range?: {
    start_date: string;               // ISO date
    end_date: string;                 // ISO date
  };
  custom_sections?: {
    executive_summary: boolean;
    technical_details: boolean;
    implementation_status: boolean;
    risk_assessment: boolean;
    compliance_status: boolean;
    recommendations: boolean;
    appendices: boolean;
  };
  audience?: 'board' | 'executive' | 'technical' | 'audit' | 'general';
  branding?: {
    organization_name: string;
    logo_url?: string;
    color_scheme?: string;
  };
}
```

### Response

```typescript
interface ReportResult {
  success: boolean;
  report_id: string;
  report_type: string;
  format: string;
  file_path?: string;                 // For file-based formats
  content?: string;                   // For content-based formats
  base64_data?: string;               // For binary formats (PDF)
  metadata: {
    profile_id: string;
    generated_at: string;
    generated_by?: string;
    report_size: number;              // Bytes
    page_count?: number;              // For PDF/HTML
    section_count: number;
    data_freshness: string;           // How recent the underlying data is
  };
  report_summary: {
    key_findings: string[];
    critical_issues: string[];
    recommendations_count: number;
    compliance_percentage: number;
    overall_maturity_level: string;
  };
}
```

### Examples

#### Executive Report Generation
```json
{
  "tool": "generate_report",
  "arguments": {
    "profile_id": "PROF-20240312-001",
    "report_type": "executive",
    "format": "pdf",
    "include_recommendations": true,
    "include_charts": true,
    "audience": "board",
    "branding": {
      "organization_name": "TechCorp Industries",
      "color_scheme": "corporate_blue"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "report_id": "RPT-EXEC-20240312-001",
  "report_type": "executive",
  "format": "pdf",
  "file_path": "/reports/executive-report-20240312-001.pdf",
  "base64_data": "JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFI+PgplbmRvYmoK...",
  "metadata": {
    "profile_id": "PROF-20240312-001",
    "generated_at": "2024-03-12T13:15:00Z",
    "report_size": 2847392,
    "page_count": 24,
    "section_count": 8,
    "data_freshness": "2024-03-12T13:00:00Z"
  },
  "report_summary": {
    "key_findings": [
      "Overall cybersecurity maturity at Tier 2.3 (Risk Informed)",
      "48% completion of target implementation goals",
      "8 critical gaps requiring immediate attention",
      "Strong governance foundation with 55% function completion"
    ],
    "critical_issues": [
      "Detection capabilities significantly below target (25% complete)",
      "8 blocked implementation items requiring executive escalation",
      "Budget variance of +$200K from original estimates"
    ],
    "recommendations_count": 12,
    "compliance_percentage": 72,
    "overall_maturity_level": "Tier 2 - Risk Informed"
  }
}
```

#### Technical Progress Report
```json
{
  "tool": "generate_report",
  "arguments": {
    "profile_id": "PROF-20240312-001",
    "report_type": "progress",
    "format": "html",
    "date_range": {
      "start_date": "2024-01-01",
      "end_date": "2024-03-12"
    },
    "custom_sections": {
      "executive_summary": false,
      "technical_details": true,
      "implementation_status": true,
      "risk_assessment": true,
      "compliance_status": false,
      "recommendations": true,
      "appendices": true
    },
    "audience": "technical"
  }
}
```

## export_data

Export assessment data, progress tracking, and analysis results in various formats for external analysis, backup, or integration purposes.

### Parameters

```typescript
interface DataExportParams {
  profile_id: string;                 // Source profile
  format: 'json' | 'csv' | 'xlsx' | 'xml';
  include_assessments?: boolean;      // Default: true
  include_progress?: boolean;         // Default: true
  include_compliance?: boolean;       // Default: false
  include_milestones?: boolean;       // Default: false
  include_historical_data?: boolean;  // Default: false
  date_range?: {
    start_date: string;
    end_date: string;
  };
  data_filtering?: {
    functions?: string[];             // Filter by specific functions
    status?: string[];               // Filter by implementation status
    maturity_threshold?: number;     // Only include items above threshold
  };
  export_template?: 'standard' | 'compliance_audit' | 'vendor_assessment' | 'custom';
}
```

### Response

```typescript
interface ExportResult {
  success: boolean;
  export_id: string;
  format: string;
  file_path?: string;                 // For file exports
  base64_data?: string;               // For binary formats
  content?: any;                      // For JSON exports
  metadata: {
    profile_id: string;
    exported_at: string;
    record_count: number;
    file_size: number;                // Bytes
    included_sections: string[];
    data_quality_score: number;       // 0-100
  };
  export_summary: {
    total_records: number;
    assessment_records: number;
    progress_records: number;
    compliance_records: number;
    data_completeness: number;        // Percentage
  };
}
```

### Examples

#### Comprehensive JSON Export
```json
{
  "tool": "export_data",
  "arguments": {
    "profile_id": "PROF-20240312-001",
    "format": "json",
    "include_assessments": true,
    "include_progress": true,
    "include_compliance": true,
    "include_milestones": true,
    "include_historical_data": true,
    "export_template": "standard"
  }
}
```

**Response:**
```json
{
  "success": true,
  "export_id": "EXP-20240312-001",
  "format": "json",
  "content": {
    "profile_metadata": {
      "profile_id": "PROF-20240312-001",
      "organization_name": "TechCorp Industries",
      "export_timestamp": "2024-03-12T13:30:00Z"
    },
    "assessments": [
      {
        "subcategory_id": "GV.PO-01",
        "implementation_level": "fully_implemented",
        "maturity_score": 4,
        "assessment_date": "2024-03-01T10:00:00Z",
        "assessed_by": "Security Team Lead",
        "notes": "Policy framework established and operational",
        "evidence": ["policy-doc-v2.pdf", "training-completion-report.xlsx"]
      }
    ],
    "progress_tracking": [
      {
        "subcategory_id": "GV.PO-01",
        "status_history": [
          {
            "status": "completed",
            "completion_percentage": 100,
            "timestamp": "2024-03-01T10:00:00Z",
            "updated_by": "Security Team Lead"
          }
        ]
      }
    ],
    "compliance_data": [
      {
        "requirement": "SOX IT Controls",
        "subcategory_mappings": ["GV.PO-01", "GV.RM-01"],
        "compliance_status": "compliant",
        "last_audit_date": "2024-02-15T00:00:00Z"
      }
    ]
  },
  "metadata": {
    "profile_id": "PROF-20240312-001",
    "exported_at": "2024-03-12T13:30:00Z",
    "record_count": 318,
    "file_size": 187420,
    "included_sections": ["assessments", "progress", "compliance", "milestones"],
    "data_quality_score": 94
  },
  "export_summary": {
    "total_records": 318,
    "assessment_records": 106,
    "progress_records": 156,
    "compliance_records": 42,
    "data_completeness": 87
  }
}
```

#### CSV Export for Analysis
```json
{
  "tool": "export_data",
  "arguments": {
    "profile_id": "PROF-20240312-001",
    "format": "csv",
    "include_assessments": true,
    "include_progress": true,
    "data_filtering": {
      "functions": ["DE", "RS"],
      "status": ["at_risk", "behind", "blocked"]
    },
    "export_template": "vendor_assessment"
  }
}
```

## compare_profiles

Compare multiple profiles for benchmarking, progress analysis, and organizational assessment across different time periods or organizational units.

### Parameters

```typescript
interface ProfileComparisonParams {
  profile_ids: string[];              // 2-10 profiles to compare
  comparison_type: 'gap_analysis' | 'maturity' | 'risk' | 'progress' | 'comprehensive';
  include_recommendations?: boolean;  // Default: true
  include_visualizations?: boolean;   // Default: true
  comparison_metrics?: {
    show_deltas: boolean;            // Show change between profiles
    calculate_trends: boolean;       // Calculate improvement trends
    benchmark_against_industry: boolean;
  };
  grouping_strategy?: 'by_function' | 'by_category' | 'by_time_period' | 'by_organization';
}
```

### Response

```typescript
interface ComparisonResult {
  success: boolean;
  comparison_id: string;
  comparison_type: string;
  profiles_compared: ProfileSummary[];
  comparison_date: string;
  overall_comparison: {
    best_performer: string;          // Profile ID
    most_improved: string;           // Profile ID
    average_scores: FunctionScores;
    variance_analysis: VarianceAnalysis;
  };
  detailed_comparisons: DetailedComparison[];
  trend_analysis?: TrendAnalysis;
  recommendations: {
    improvement_opportunities: string[];
    best_practices_to_share: string[];
    resource_optimization: string[];
  };
  visualization_data?: ComparisonCharts;
}
```

### Examples

#### Multi-Period Progress Comparison
```json
{
  "tool": "compare_profiles",
  "arguments": {
    "profile_ids": ["PROF-Q1-2024", "PROF-Q2-2024", "PROF-Q3-2024"],
    "comparison_type": "progress",
    "include_recommendations": true,
    "include_visualizations": true,
    "comparison_metrics": {
      "show_deltas": true,
      "calculate_trends": true,
      "benchmark_against_industry": false
    },
    "grouping_strategy": "by_time_period"
  }
}
```

## Error Handling

### Common Error Responses

```typescript
interface ReportingErrorResponse {
  success: false;
  error: string;
  error_code: string;
  details?: any;
  retry_suggestions?: string[];
}
```

### Error Codes

| Error Code | Description | Common Causes |
|------------|-------------|---------------|
| `INSUFFICIENT_DATA` | Not enough data for report | Complete assessments first |
| `REPORT_GENERATION_FAILED` | Report creation error | Template or data issues |
| `EXPORT_FORMAT_UNSUPPORTED` | Invalid export format | Check supported formats |
| `COMPARISON_PROFILES_INVALID` | Invalid profile comparison | Ensure profiles exist |
| `PROGRESS_UPDATE_CONFLICT` | Concurrent update conflict | Retry with latest data |

## Performance Considerations

### Optimization Guidelines

1. **Progress Tracking**: Batch updates for better performance
2. **Report Generation**: Use appropriate format for audience needs
3. **Data Export**: Apply filtering to reduce data size
4. **Profile Comparison**: Limit to essential comparisons

### Performance Metrics

- **Progress Updates**: <1s for batch updates (up to 50 items)
- **Report Generation**: <10s for comprehensive PDF reports
- **Data Export**: <5s for JSON exports (up to 10MB)
- **Profile Comparison**: <8s for multi-profile analysis

This API provides comprehensive reporting and data management capabilities for cybersecurity program oversight and compliance.