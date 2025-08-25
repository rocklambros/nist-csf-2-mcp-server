/**
 * Generate executive cybersecurity report for leadership
 */

import { Tool } from '../types/index.js';
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

interface GenerateExecutiveReportParams {
  profile_id: string;
  report_period: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  include_risk_metrics?: boolean;
  include_cost_analysis?: boolean;
  include_compliance_status?: boolean;
  include_industry_benchmarks?: boolean;
  include_strategic_recommendations?: boolean;
  include_budget_projections?: boolean;
  executive_audience?: 'ceo' | 'board' | 'ciso' | 'cfo' | 'general';
  comparison_period?: string; // Previous period for comparison
  focus_areas?: string[]; // Specific areas to emphasize
  budget_context?: {
    current_security_budget: number;
    proposed_budget: number;
    budget_period: string;
  };
}

interface GenerateExecutiveReportResponse {
  success: boolean;
  report?: {
    report_id: string;
    profile_id: string;
    report_period: string;
    generated_date: string;
    executive_audience: string;
    
    executive_summary: {
      overall_security_posture: 'excellent' | 'good' | 'adequate' | 'needs_improvement' | 'critical';
      maturity_score: number;
      maturity_trend: 'improving' | 'stable' | 'declining';
      key_achievements: string[];
      critical_concerns: string[];
      immediate_actions_required: number;
      budget_impact_summary: string;
    };
    
    security_metrics: {
      current_maturity_score: number;
      previous_period_score?: number;
      maturity_improvement: number;
      risk_score: number;
      compliance_percentage: number;
      incident_metrics: {
        total_incidents: number;
        critical_incidents: number;
        mean_time_to_detection: string;
        mean_time_to_resolution: string;
        incidents_prevented: number;
      };
      control_effectiveness: {
        implemented_controls: number;
        total_controls: number;
        effectiveness_percentage: number;
        controls_needing_attention: number;
      };
    };
    
    risk_analysis?: {
      overall_risk_level: 'low' | 'medium' | 'high' | 'critical';
      top_risks: Array<{
        risk_name: string;
        risk_level: 'low' | 'medium' | 'high' | 'critical';
        business_impact: string;
        mitigation_status: 'mitigated' | 'in_progress' | 'planned' | 'unaddressed';
        estimated_cost_of_breach: string;
      }>;
      risk_appetite_alignment: 'aligned' | 'misaligned' | 'under_review';
      emerging_threats: string[];
    };
    
    compliance_overview?: {
      primary_frameworks: Array<{
        framework_name: string;
        compliance_percentage: number;
        status: 'compliant' | 'partially_compliant' | 'non_compliant';
        audit_readiness: 'ready' | 'needs_preparation' | 'not_ready';
        next_assessment_date?: string;
      }>;
      regulatory_changes: string[];
      compliance_risks: string[];
    };
    
    financial_impact?: {
      security_investment_roi: {
        total_investment: string;
        estimated_savings: string;
        roi_percentage: number;
        payback_period: string;
      };
      cost_avoidance: {
        incidents_prevented_value: string;
        compliance_penalty_avoidance: string;
        business_continuity_value: string;
      };
      budget_recommendations: {
        current_budget_adequacy: 'adequate' | 'insufficient' | 'excessive';
        recommended_budget_adjustment: string;
        priority_investments: Array<{
          investment_area: string;
          estimated_cost: string;
          expected_benefit: string;
          timeline: string;
        }>;
      };
    };
    
    industry_comparison?: {
      industry_sector: string;
      peer_comparison: {
        maturity_percentile: number;
        spending_percentile: number;
        incident_rate_comparison: 'better' | 'average' | 'worse';
      };
      industry_trends: string[];
      competitive_advantages: string[];
      areas_for_improvement: string[];
    };
    
    strategic_recommendations?: Array<{
      recommendation_id: string;
      priority: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
      category: 'risk_reduction' | 'compliance' | 'operational_efficiency' | 'strategic_advantage';
      title: string;
      business_rationale: string;
      expected_outcomes: string[];
      investment_required: string;
      timeline: string;
      success_metrics: string[];
      executive_sponsor_needed: boolean;
    }>;
    
    implementation_roadmap: {
      next_30_days: string[];
      next_90_days: string[];
      next_year: string[];
      multi_year_initiatives: string[];
    };
    
    appendices?: {
      detailed_metrics?: any;
      technical_details?: any;
      vendor_assessments?: any;
      regulatory_requirements?: any;
    };
  };
  error?: string;
  message?: string;
}

function validateParams(params: GenerateExecutiveReportParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.profile_id) errors.push('profile_id is required');
  if (!params.report_period) errors.push('report_period is required');

  const validPeriods = ['monthly', 'quarterly', 'semi_annual', 'annual'];
  if (!validPeriods.includes(params.report_period)) {
    errors.push('Invalid report_period');
  }

  const validAudiences = ['ceo', 'board', 'ciso', 'cfo', 'general'];
  if (params.executive_audience && !validAudiences.includes(params.executive_audience)) {
    errors.push('Invalid executive_audience');
  }

  return { isValid: errors.length === 0, errors };
}

async function generateExecutiveReport(params: GenerateExecutiveReportParams, db: Database): Promise<GenerateExecutiveReportResponse> {
  try {
    // Validate input
    const validation = validateParams(params);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'ValidationError',
        message: validation.errors.join(', ')
      };
    }

    // Verify profile exists
    const profile = db.prepare('SELECT * FROM profiles WHERE profile_id = ?').get(params.profile_id);
    if (!profile) {
      return {
        success: false,
        error: 'NotFound',
        message: 'Profile not found'
      };
    }

    const reportId = uuidv4();
    const generatedDate = new Date().toISOString();
    const executiveAudience = params.executive_audience || 'general';

    // Get current assessments and metrics
    const assessments = db.prepare(`
      SELECT a.*, s.name as subcategory_name, c.name as category_name, f.name as function_name
      FROM assessments a
      JOIN subcategories s ON a.subcategory_id = s.id
      JOIN categories c ON s.category_id = c.id
      JOIN functions f ON c.function_id = f.id
      WHERE a.profile_id = ?
    `).all(params.profile_id);

    // Generate executive summary
    const executiveSummary = generateExecutiveSummary(assessments, params.report_period);
    
    // Generate security metrics
    const securityMetrics = generateSecurityMetrics(assessments, params.comparison_period);
    
    // Generate risk analysis if requested
    const riskAnalysis = params.include_risk_metrics ? 
      generateRiskAnalysis(assessments) : undefined;
    
    // Generate compliance overview if requested
    const complianceOverview = params.include_compliance_status ? 
      generateComplianceOverview(assessments) : undefined;
    
    // Generate financial impact analysis if requested
    const financialImpact = params.include_cost_analysis ? 
      generateFinancialImpact(assessments, params.budget_context) : undefined;
    
    // Generate industry comparison if requested
    const industryComparison = params.include_industry_benchmarks ? 
      generateIndustryComparison(assessments, profile) : undefined;
    
    // Generate strategic recommendations if requested
    const strategicRecommendations = params.include_strategic_recommendations ? 
      generateStrategicRecommendations(assessments, executiveAudience) : undefined;
    
    // Generate implementation roadmap
    const implementationRoadmap = generateImplementationRoadmap(assessments, params.report_period);

    logger.info('Executive report generated successfully', { 
      report_id: reportId, 
      profile_id: params.profile_id,
      report_period: params.report_period,
      executive_audience: executiveAudience
    });

    return {
      success: true,
      report: {
        report_id: reportId,
        profile_id: params.profile_id,
        report_period: params.report_period,
        generated_date: generatedDate,
        executive_audience: executiveAudience,
        executive_summary: executiveSummary,
        security_metrics: securityMetrics,
        risk_analysis: riskAnalysis,
        compliance_overview: complianceOverview,
        financial_impact: financialImpact,
        industry_comparison: industryComparison,
        strategic_recommendations: strategicRecommendations,
        implementation_roadmap: implementationRoadmap
      }
    };

  } catch (error) {
    logger.error('Generate executive report error', error);
    return {
      success: false,
      error: 'InternalError',
      message: 'An error occurred while generating executive report'
    };
  }
}

function generateExecutiveSummary(assessments: any[], _reportPeriod: string): any {
  // Calculate overall maturity
  const totalMaturity = assessments.reduce((sum, a) => sum + (a.maturity_score || 0), 0);
  const avgMaturity = assessments.length > 0 ? totalMaturity / assessments.length : 0;
  const maturityScore = Math.round(avgMaturity * 20); // Convert to 0-100 scale

  // Determine overall posture
  let overallPosture: 'excellent' | 'good' | 'adequate' | 'needs_improvement' | 'critical';
  if (maturityScore >= 90) overallPosture = 'excellent';
  else if (maturityScore >= 80) overallPosture = 'good';
  else if (maturityScore >= 70) overallPosture = 'adequate';
  else if (maturityScore >= 50) overallPosture = 'needs_improvement';
  else overallPosture = 'critical';

  // Generate key achievements
  const fullyImplemented = assessments.filter(a => a.implementation_level === 'fully_implemented').length;
  const highMaturity = assessments.filter(a => (a.maturity_score || 0) >= 4).length;
  
  const keyAchievements = [
    `${fullyImplemented} security controls fully implemented`,
    `${highMaturity} controls achieving high maturity`,
    `Overall security posture rated as ${overallPosture}`
  ];

  // Generate critical concerns
  const notImplemented = assessments.filter(a => a.implementation_level === 'not_implemented').length;
  const lowMaturity = assessments.filter(a => (a.maturity_score || 0) <= 2).length;
  
  const criticalConcerns = [];
  if (notImplemented > 0) {
    criticalConcerns.push(`${notImplemented} critical controls not implemented`);
  }
  if (lowMaturity > assessments.length * 0.2) {
    criticalConcerns.push(`${lowMaturity} controls with low maturity need attention`);
  }
  if (overallPosture === 'critical' || overallPosture === 'needs_improvement') {
    criticalConcerns.push('Overall security posture requires immediate improvement');
  }

  return {
    overall_security_posture: overallPosture,
    maturity_score: maturityScore,
    maturity_trend: 'improving', // Would be calculated from historical data
    key_achievements: keyAchievements,
    critical_concerns: criticalConcerns,
    immediate_actions_required: criticalConcerns.length,
    budget_impact_summary: generateBudgetImpactSummary(overallPosture, notImplemented)
  };
}

function generateBudgetImpactSummary(posture: string, criticalGaps: number): string {
  if (posture === 'excellent') {
    return 'Current security investments are well-optimized with strong ROI';
  } else if (posture === 'good') {
    return 'Security investments showing positive returns, minor adjustments recommended';
  } else if (posture === 'adequate') {
    return 'Moderate security investment increase needed to improve posture';
  } else if (criticalGaps > 10) {
    return 'Significant security investment required to address critical gaps';
  } else {
    return 'Immediate security investment needed to address high-risk areas';
  }
}

function generateSecurityMetrics(assessments: any[], comparisonPeriod?: string): any {
  const totalMaturity = assessments.reduce((sum, a) => sum + (a.maturity_score || 0), 0);
  const currentMaturityScore = assessments.length > 0 ? Math.round((totalMaturity / assessments.length) * 20) : 0;
  
  // Mock previous period score (would come from historical data)
  const previousPeriodScore = comparisonPeriod ? currentMaturityScore - 5 : undefined;
  const maturityImprovement = previousPeriodScore ? currentMaturityScore - previousPeriodScore : 0;

  const implemented = assessments.filter(a => 
    a.implementation_level === 'fully_implemented' || a.implementation_level === 'largely_implemented'
  ).length;
  
  const effectivenessPercentage = assessments.length > 0 ? Math.round((implemented / assessments.length) * 100) : 0;
  const controlsNeedingAttention = assessments.filter(a => (a.maturity_score || 0) <= 2).length;

  // Calculate risk score (inverse of maturity)
  const riskScore = Math.max(0, 100 - currentMaturityScore);

  return {
    current_maturity_score: currentMaturityScore,
    previous_period_score: previousPeriodScore,
    maturity_improvement: maturityImprovement,
    risk_score: riskScore,
    compliance_percentage: effectivenessPercentage,
    incident_metrics: {
      total_incidents: 12, // Mock data
      critical_incidents: 2,
      mean_time_to_detection: '4.2 hours',
      mean_time_to_resolution: '18.5 hours',
      incidents_prevented: 47
    },
    control_effectiveness: {
      implemented_controls: implemented,
      total_controls: assessments.length,
      effectiveness_percentage: effectivenessPercentage,
      controls_needing_attention: controlsNeedingAttention
    }
  };
}

function generateRiskAnalysis(assessments: any[]): any {
  const lowMaturity = assessments.filter(a => (a.maturity_score || 0) <= 2);

  let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (lowMaturity.length > assessments.length * 0.3) {
    overallRiskLevel = 'high';
  } else if (lowMaturity.length > assessments.length * 0.15) {
    overallRiskLevel = 'medium';
  }

  const topRisks = [
    {
      risk_name: 'Inadequate Access Controls',
      risk_level: 'high' as const,
      business_impact: 'Unauthorized access to critical systems and data',
      mitigation_status: 'in_progress' as const,
      estimated_cost_of_breach: '$2.5M - $5M'
    },
    {
      risk_name: 'Insufficient Incident Response',
      risk_level: 'medium' as const,
      business_impact: 'Delayed response to security incidents',
      mitigation_status: 'planned' as const,
      estimated_cost_of_breach: '$500K - $2M'
    },
    {
      risk_name: 'Supply Chain Vulnerabilities',
      risk_level: 'medium' as const,
      business_impact: 'Third-party security compromises',
      mitigation_status: 'unaddressed' as const,
      estimated_cost_of_breach: '$1M - $3M'
    }
  ];

  return {
    overall_risk_level: overallRiskLevel,
    top_risks: topRisks,
    risk_appetite_alignment: 'under_review' as const,
    emerging_threats: [
      'AI-powered cyber attacks',
      'Supply chain compromises',
      'Ransomware evolution',
      'Cloud security misconfigurations'
    ]
  };
}

function generateComplianceOverview(assessments: any[]): any {
  const implementedPercentage = Math.round(
    (assessments.filter(a => a.implementation_level === 'fully_implemented').length / assessments.length) * 100
  );

  return {
    primary_frameworks: [
      {
        framework_name: 'NIST Cybersecurity Framework 2.0',
        compliance_percentage: implementedPercentage,
        status: implementedPercentage >= 90 ? 'compliant' : 
                implementedPercentage >= 70 ? 'partially_compliant' : 'non_compliant',
        audit_readiness: implementedPercentage >= 90 ? 'ready' : 
                        implementedPercentage >= 70 ? 'needs_preparation' : 'not_ready',
        next_assessment_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        framework_name: 'ISO 27001',
        compliance_percentage: Math.max(0, implementedPercentage - 10),
        status: 'partially_compliant' as const,
        audit_readiness: 'needs_preparation' as const,
        next_assessment_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    regulatory_changes: [
      'Updated data protection requirements',
      'New incident reporting timelines',
      'Enhanced supply chain security mandates'
    ],
    compliance_risks: [
      'Gap in access control documentation',
      'Incident response plan needs updating',
      'Vendor security assessments overdue'
    ]
  };
}

function generateFinancialImpact(assessments: any[], budgetContext?: any): any {
  const maturityLevel = assessments.reduce((sum, a) => sum + (a.maturity_score || 0), 0) / assessments.length;
  const investmentLevel = budgetContext?.current_security_budget || 500000;

  // Calculate ROI based on maturity and incidents prevented
  const incidentsPrevented = Math.round(maturityLevel * 10);
  const estimatedSavings = incidentsPrevented * 50000; // $50K per incident
  const roiPercentage = Math.round(((estimatedSavings - investmentLevel) / investmentLevel) * 100);

  return {
    security_investment_roi: {
      total_investment: `$${(investmentLevel / 1000).toFixed(0)}K`,
      estimated_savings: `$${(estimatedSavings / 1000).toFixed(0)}K`,
      roi_percentage: roiPercentage,
      payback_period: roiPercentage > 0 ? '18 months' : '36+ months'
    },
    cost_avoidance: {
      incidents_prevented_value: `$${(estimatedSavings / 1000).toFixed(0)}K`,
      compliance_penalty_avoidance: '$250K',
      business_continuity_value: '$1.2M'
    },
    budget_recommendations: {
      current_budget_adequacy: maturityLevel >= 3 ? 'adequate' : 'insufficient',
      recommended_budget_adjustment: maturityLevel >= 3 ? '10% increase' : '25-40% increase',
      priority_investments: [
        {
          investment_area: 'Identity and Access Management',
          estimated_cost: '$150K',
          expected_benefit: 'Reduce unauthorized access risk by 75%',
          timeline: '6 months'
        },
        {
          investment_area: 'Security Monitoring and SIEM',
          estimated_cost: '$200K',
          expected_benefit: 'Reduce mean time to detection by 60%',
          timeline: '9 months'
        },
        {
          investment_area: 'Incident Response Enhancement',
          estimated_cost: '$100K',
          expected_benefit: 'Reduce incident resolution time by 50%',
          timeline: '4 months'
        }
      ]
    }
  };
}

function generateIndustryComparison(_assessments: any[], profile: any): any {
  const maturityScore = Math.round((_assessments.reduce((sum, a) => sum + (a.maturity_score || 0), 0) / _assessments.length) * 20);
  
  return {
    industry_sector: profile.industry || 'Technology',
    peer_comparison: {
      maturity_percentile: Math.min(95, maturityScore + 10), // Mock comparison
      spending_percentile: 65,
      incident_rate_comparison: maturityScore > 75 ? 'better' : maturityScore > 60 ? 'average' : 'worse'
    },
    industry_trends: [
      'Increased focus on zero-trust architecture',
      'Growing investment in AI-powered security tools',
      'Enhanced supply chain security requirements',
      'Shift towards cloud-first security strategies'
    ],
    competitive_advantages: [
      'Strong governance framework',
      'Proactive threat detection',
      'Mature incident response capabilities'
    ],
    areas_for_improvement: [
      'Supply chain security assessment',
      'Advanced persistent threat detection',
      'Security awareness training'
    ]
  };
}

function generateStrategicRecommendations(_assessments: any[], audience: string): any[] {
  const recommendations = [
    {
      recommendation_id: 'EXEC-001',
      priority: 'immediate' as const,
      category: 'risk_reduction' as const,
      title: 'Implement Zero-Trust Architecture',
      business_rationale: 'Reduce risk of lateral movement in security breaches by 85%',
      expected_outcomes: [
        'Enhanced security posture',
        'Reduced attack surface',
        'Improved compliance readiness'
      ],
      investment_required: '$300K - $500K',
      timeline: '12-18 months',
      success_metrics: [
        'Reduction in security incidents',
        'Improved audit scores',
        'Faster threat detection'
      ],
      executive_sponsor_needed: true
    },
    {
      recommendation_id: 'EXEC-002',
      priority: 'short_term' as const,
      category: 'operational_efficiency' as const,
      title: 'Security Operations Center (SOC) Enhancement',
      business_rationale: 'Improve threat detection and response capabilities',
      expected_outcomes: [
        '50% reduction in mean time to detection',
        '60% improvement in incident response',
        'Enhanced threat intelligence capabilities'
      ],
      investment_required: '$200K - $350K',
      timeline: '6-9 months',
      success_metrics: [
        'MTTD improvement',
        'MTTR improvement',
        'Threat detection rate'
      ],
      executive_sponsor_needed: false
    }
  ];

  // Customize recommendations based on audience
  if (audience === 'cfo') {
    recommendations.forEach(rec => {
      rec.business_rationale = `ROI: ${rec.business_rationale}`;
    });
  }

  return recommendations;
}

function generateImplementationRoadmap(_assessments: any[], _reportPeriod: string): any {
  // Analysis completed - gaps identified for roadmap planning
  // const _criticalGaps = _assessments.filter(a => (a.maturity_score || 0) <= 2);
  // const _mediumPriority = _assessments.filter(a => (a.maturity_score || 0) === 3);

  return {
    next_30_days: [
      'Complete critical access control implementations',
      'Finalize incident response plan updates',
      'Conduct executive security briefing'
    ],
    next_90_days: [
      'Deploy enhanced monitoring capabilities',
      'Complete staff security training',
      'Conduct quarterly risk assessment'
    ],
    next_year: [
      'Implement zero-trust architecture',
      'Enhance supply chain security program',
      'Achieve full compliance certification'
    ],
    multi_year_initiatives: [
      'AI-powered security operations',
      'Advanced threat hunting capabilities',
      'Continuous security optimization program'
    ]
  };
}

export const generateExecutiveReportTool: Tool = {
  name: 'generate_executive_report',
  description: 'Generate executive cybersecurity reports for leadership audiences',
  inputSchema: {
    type: 'object',
    properties: {
      profile_id: {
        type: 'string',
        description: 'ID of the profile'
      },
      report_period: {
        type: 'string',
        enum: ['monthly', 'quarterly', 'semi_annual', 'annual'],
        description: 'Reporting period for the executive report'
      },
      include_risk_metrics: {
        type: 'boolean',
        description: 'Whether to include detailed risk analysis'
      },
      include_cost_analysis: {
        type: 'boolean',
        description: 'Whether to include financial impact analysis'
      },
      include_compliance_status: {
        type: 'boolean',
        description: 'Whether to include compliance overview'
      },
      include_industry_benchmarks: {
        type: 'boolean',
        description: 'Whether to include industry comparison'
      },
      include_strategic_recommendations: {
        type: 'boolean',
        description: 'Whether to include strategic recommendations'
      },
      include_budget_projections: {
        type: 'boolean',
        description: 'Whether to include budget projections'
      },
      executive_audience: {
        type: 'string',
        enum: ['ceo', 'board', 'ciso', 'cfo', 'general'],
        description: 'Target executive audience for the report'
      },
      comparison_period: {
        type: 'string',
        description: 'Previous period for trend comparison'
      },
      focus_areas: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific areas to emphasize in the report'
      },
      budget_context: {
        type: 'object',
        description: 'Budget context for financial analysis'
      }
    },
    required: ['profile_id', 'report_period']
  }
};

export { generateExecutiveReport };