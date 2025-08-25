/**
 * Generate compliance report for regulatory frameworks
 */

import { Tool } from '../types/index.js';
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

interface GenerateComplianceReportParams {
  profile_id: string;
  compliance_framework: 'iso27001' | 'sox' | 'hipaa' | 'pci_dss' | 'gdpr' | 'fisma' | 'fedramp' | 'custom';
  report_scope?: 'full' | 'partial' | 'gap_analysis' | 'remediation_focused';
  include_evidence?: boolean;
  include_recommendations?: boolean;
  include_risk_assessment?: boolean;
  include_implementation_roadmap?: boolean;
  custom_framework_requirements?: Array<{
    requirement_id: string;
    requirement_name: string;
    description: string;
    mandatory: boolean;
    category: string;
  }>;
  assessment_date?: string;
  assessor_name?: string;
  organization_context?: {
    business_functions: string[];
    critical_assets: string[];
    regulatory_obligations: string[];
  };
}

interface GenerateComplianceReportResponse {
  success: boolean;
  report?: {
    report_id: string;
    profile_id: string;
    compliance_framework: string;
    report_scope: string;
    generated_date: string;
    assessment_date: string;
    assessor_name?: string;
    overall_compliance_score: number;
    compliance_status: 'compliant' | 'partially_compliant' | 'non_compliant';
    
    executive_summary: {
      total_requirements: number;
      compliant_requirements: number;
      partially_compliant_requirements: number;
      non_compliant_requirements: number;
      critical_gaps: number;
      high_priority_recommendations: number;
      estimated_remediation_effort: string;
    };
    
    compliance_details: Array<{
      requirement_id: string;
      requirement_name: string;
      description: string;
      compliance_status: 'compliant' | 'partially_compliant' | 'non_compliant';
      csf_subcategories: string[];
      current_implementation: string;
      gaps_identified: string[];
      evidence_provided?: string[];
      risk_level: 'low' | 'medium' | 'high' | 'critical';
      remediation_priority: 'low' | 'medium' | 'high' | 'critical';
    }>;
    
    gap_analysis?: {
      critical_gaps: Array<{
        requirement_id: string;
        gap_description: string;
        impact: string;
        recommended_action: string;
        timeline: string;
        effort_estimate: string;
      }>;
      remediation_roadmap: Array<{
        phase: number;
        phase_name: string;
        duration: string;
        requirements_addressed: string[];
        deliverables: string[];
        success_criteria: string[];
      }>;
    };
    
    recommendations?: Array<{
      recommendation_id: string;
      category: 'technical' | 'administrative' | 'physical';
      priority: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      affected_requirements: string[];
      implementation_guidance: string;
      estimated_cost: string;
      estimated_effort: string;
      expected_benefits: string[];
    }>;
    
    risk_assessment?: {
      overall_risk_level: 'low' | 'medium' | 'high' | 'critical';
      risk_factors: Array<{
        factor: string;
        current_level: string;
        target_level: string;
        mitigation_measures: string[];
      }>;
      non_compliance_risks: Array<{
        requirement_id: string;
        risk_description: string;
        likelihood: 'low' | 'medium' | 'high';
        impact: 'low' | 'medium' | 'high' | 'critical';
        risk_score: number;
      }>;
    };
    
    implementation_roadmap?: {
      total_estimated_duration: string;
      estimated_budget_range: string;
      phases: Array<{
        phase_number: number;
        phase_name: string;
        start_date: string;
        end_date: string;
        objectives: string[];
        deliverables: string[];
        milestones: string[];
        resource_requirements: string[];
      }>;
    };
  };
  error?: string;
  message?: string;
}

function validateParams(params: GenerateComplianceReportParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.profile_id) errors.push('profile_id is required');
  if (!params.compliance_framework) errors.push('compliance_framework is required');

  const validFrameworks = ['iso27001', 'sox', 'hipaa', 'pci_dss', 'gdpr', 'fisma', 'fedramp', 'custom'];
  if (!validFrameworks.includes(params.compliance_framework)) {
    errors.push('Invalid compliance_framework');
  }

  const validScopes = ['full', 'partial', 'gap_analysis', 'remediation_focused'];
  if (params.report_scope && !validScopes.includes(params.report_scope)) {
    errors.push('Invalid report_scope');
  }

  if (params.compliance_framework === 'custom' && !params.custom_framework_requirements) {
    errors.push('custom_framework_requirements is required for custom framework');
  }

  return { isValid: errors.length === 0, errors };
}

async function generateComplianceReport(params: GenerateComplianceReportParams, db: Database): Promise<GenerateComplianceReportResponse> {
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
    const assessmentDate = params.assessment_date || generatedDate;
    const reportScope = params.report_scope || 'full';

    // Get framework requirements
    const frameworkRequirements = getFrameworkRequirements(params.compliance_framework, params.custom_framework_requirements);
    
    // Get current assessments for the profile
    const assessments = db.prepare(`
      SELECT a.*, s.name as subcategory_name, s.description as subcategory_description
      FROM assessments a
      JOIN subcategories s ON a.subcategory_id = s.id
      WHERE a.profile_id = ?
    `).all(params.profile_id);

    // Generate compliance analysis
    const complianceDetails = analyzeCompliance(frameworkRequirements, assessments);
    
    // Calculate overall compliance score
    const overallScore = calculateOverallScore(complianceDetails);
    
    // Generate executive summary
    const executiveSummary = generateExecutiveSummary(complianceDetails);
    
    // Generate gap analysis if requested
    const gapAnalysis = (params.report_scope === 'gap_analysis' || params.include_recommendations) ?
      generateGapAnalysis(complianceDetails) : undefined;
    
    // Generate recommendations if requested
    const recommendations = params.include_recommendations ?
      generateRecommendations(complianceDetails, params.compliance_framework) : undefined;
    
    // Generate risk assessment if requested
    const riskAssessment = params.include_risk_assessment ?
      generateRiskAssessment(complianceDetails, params.compliance_framework) : undefined;
    
    // Generate implementation roadmap if requested
    const implementationRoadmap = params.include_implementation_roadmap ?
      generateImplementationRoadmap(complianceDetails, params.compliance_framework) : undefined;

    // Determine compliance status
    const complianceStatus = overallScore >= 90 ? 'compliant' : 
                           overallScore >= 70 ? 'partially_compliant' : 'non_compliant';

    logger.info('Compliance report generated successfully', { 
      report_id: reportId, 
      profile_id: params.profile_id,
      compliance_framework: params.compliance_framework,
      compliance_score: overallScore
    });

    return {
      success: true,
      report: {
        report_id: reportId,
        profile_id: params.profile_id,
        compliance_framework: params.compliance_framework,
        report_scope: reportScope,
        generated_date: generatedDate,
        assessment_date: assessmentDate,
        assessor_name: params.assessor_name,
        overall_compliance_score: overallScore,
        compliance_status: complianceStatus,
        executive_summary: executiveSummary,
        compliance_details: complianceDetails,
        gap_analysis: gapAnalysis,
        recommendations: recommendations,
        risk_assessment: riskAssessment,
        implementation_roadmap: implementationRoadmap
      }
    };

  } catch (error) {
    logger.error('Generate compliance report error', error);
    return {
      success: false,
      error: 'InternalError',
      message: 'An error occurred while generating compliance report'
    };
  }
}

function getFrameworkRequirements(framework: string, customRequirements?: any[]): any[] {
  if (framework === 'custom' && customRequirements) {
    return customRequirements;
  }

  // Framework requirement mappings
  const frameworkMappings: Record<string, any[]> = {
    iso27001: [
      {
        requirement_id: 'A.5.1.1',
        requirement_name: 'Policies for information security',
        description: 'A set of policies for information security shall be defined',
        mandatory: true,
        category: 'Security Policy',
        csf_mappings: ['GV.OC-01', 'GV.PO-01']
      },
      {
        requirement_id: 'A.6.1.1',
        requirement_name: 'Information security roles and responsibilities',
        description: 'All information security responsibilities shall be defined and allocated',
        mandatory: true,
        category: 'Organization of Information Security',
        csf_mappings: ['GV.OC-02', 'GV.OC-03']
      },
      {
        requirement_id: 'A.8.1.1',
        requirement_name: 'Inventory of assets',
        description: 'Assets associated with information and information processing facilities shall be identified',
        mandatory: true,
        category: 'Asset Management',
        csf_mappings: ['ID.AM-01', 'ID.AM-02']
      }
    ],
    pci_dss: [
      {
        requirement_id: 'REQ-1',
        requirement_name: 'Install and maintain firewall configuration',
        description: 'Install and maintain a firewall configuration to protect cardholder data',
        mandatory: true,
        category: 'Network Security',
        csf_mappings: ['PR.AC-04', 'PR.PT-04']
      },
      {
        requirement_id: 'REQ-2',
        requirement_name: 'Do not use vendor-supplied defaults',
        description: 'Do not use vendor-supplied defaults for system passwords and other security parameters',
        mandatory: true,
        category: 'Configuration Management',
        csf_mappings: ['PR.AC-01', 'PR.IP-01']
      }
    ],
    hipaa: [
      {
        requirement_id: 'SEC-164.308(a)(1)',
        requirement_name: 'Security Officer',
        description: 'Assign security responsibilities to an individual',
        mandatory: true,
        category: 'Administrative Safeguards',
        csf_mappings: ['GV.OC-02']
      },
      {
        requirement_id: 'SEC-164.312(a)(1)',
        requirement_name: 'Access Control',
        description: 'Implement technical policies and procedures for electronic information systems',
        mandatory: true,
        category: 'Technical Safeguards',
        csf_mappings: ['PR.AC-01', 'PR.DS-02']
      }
    ]
  };

  return frameworkMappings[framework] || [];
}

function analyzeCompliance(requirements: any[], assessments: any[]): any[] {
  return requirements.map(requirement => {
    const mappedSubcategories = requirement.csf_mappings || [];
    const relevantAssessments = assessments.filter(a => 
      mappedSubcategories.includes(a.subcategory_id)
    );

    // Determine compliance status based on assessments
    let complianceStatus: 'compliant' | 'partially_compliant' | 'non_compliant' = 'non_compliant';
    const currentImplementation: string[] = [];
    const gapsIdentified: string[] = [];

    if (relevantAssessments.length > 0) {
      const avgMaturity = relevantAssessments.reduce((sum, a) => sum + (a.maturity_score || 0), 0) / relevantAssessments.length;
      
      if (avgMaturity >= 4) {
        complianceStatus = 'compliant';
        currentImplementation.push('Fully implemented controls with mature processes');
      } else if (avgMaturity >= 2) {
        complianceStatus = 'partially_compliant';
        currentImplementation.push('Partially implemented with some gaps');
        gapsIdentified.push('Controls need maturity improvement');
      } else {
        complianceStatus = 'non_compliant';
        gapsIdentified.push('Controls not adequately implemented');
      }
    } else {
      gapsIdentified.push('No corresponding CSF controls implemented');
    }

    // Determine risk and priority
    const riskLevel = complianceStatus === 'compliant' ? 'low' :
                     complianceStatus === 'partially_compliant' ? 'medium' : 'high';
    
    const priority = requirement.mandatory ? 
      (complianceStatus === 'non_compliant' ? 'critical' : 'high') :
      (complianceStatus === 'non_compliant' ? 'medium' : 'low');

    return {
      requirement_id: requirement.requirement_id,
      requirement_name: requirement.requirement_name,
      description: requirement.description,
      compliance_status: complianceStatus,
      csf_subcategories: mappedSubcategories,
      current_implementation: currentImplementation.join('; ') || 'Not implemented',
      gaps_identified: gapsIdentified,
      evidence_provided: relevantAssessments.map(a => `Assessment: ${a.subcategory_id} - ${a.implementation_level}`),
      risk_level: riskLevel,
      remediation_priority: priority
    };
  });
}

function calculateOverallScore(complianceDetails: any[]): number {
  if (complianceDetails.length === 0) return 0;

  const scores = complianceDetails.map((detail: any) => {
    switch (detail.compliance_status) {
      case 'compliant': return 100;
      case 'partially_compliant': return 50;
      case 'non_compliant': return 0;
      default: return 0;
    }
  });

  return Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length);
}

function generateExecutiveSummary(complianceDetails: any[]): any {
  const total = complianceDetails.length;
  const compliant = complianceDetails.filter(d => d.compliance_status === 'compliant').length;
  const partiallyCompliant = complianceDetails.filter(d => d.compliance_status === 'partially_compliant').length;
  const nonCompliant = complianceDetails.filter(d => d.compliance_status === 'non_compliant').length;
  const criticalGaps = complianceDetails.filter(d => d.remediation_priority === 'critical').length;
  const highPriorityRecommendations = complianceDetails.filter(d => d.remediation_priority === 'high').length;

  // Estimate remediation effort
  let effortEstimate = 'Low';
  if (criticalGaps > 5 || nonCompliant > total * 0.5) {
    effortEstimate = 'High (6+ months)';
  } else if (criticalGaps > 2 || nonCompliant > total * 0.3) {
    effortEstimate = 'Medium (3-6 months)';
  } else {
    effortEstimate = 'Low (1-3 months)';
  }

  return {
    total_requirements: total,
    compliant_requirements: compliant,
    partially_compliant_requirements: partiallyCompliant,
    non_compliant_requirements: nonCompliant,
    critical_gaps: criticalGaps,
    high_priority_recommendations: highPriorityRecommendations,
    estimated_remediation_effort: effortEstimate
  };
}

function generateGapAnalysis(complianceDetails: any[]): any {
  const criticalGaps = complianceDetails
    .filter(d => d.remediation_priority === 'critical')
    .map(detail => ({
      requirement_id: detail.requirement_id,
      gap_description: detail.gaps_identified.join('; '),
      impact: 'High risk of non-compliance and potential regulatory penalties',
      recommended_action: `Implement ${detail.requirement_name} controls immediately`,
      timeline: '1-3 months',
      effort_estimate: 'High'
    }));

  // Generate remediation roadmap
  const phases = [
    {
      phase: 1,
      phase_name: 'Critical Gap Remediation',
      duration: '1-3 months',
      requirements_addressed: criticalGaps.map(g => g.requirement_id),
      deliverables: ['Critical control implementations', 'Compliance documentation', 'Risk mitigation measures'],
      success_criteria: ['All critical gaps addressed', 'Compliance status improved to partially compliant']
    },
    {
      phase: 2,
      phase_name: 'Comprehensive Compliance',
      duration: '3-6 months',
      requirements_addressed: complianceDetails.filter(d => d.compliance_status !== 'compliant').map(d => d.requirement_id),
      deliverables: ['Full compliance implementation', 'Process documentation', 'Training materials'],
      success_criteria: ['Full compliance achieved', 'All requirements met', 'Audit readiness']
    },
    {
      phase: 3,
      phase_name: 'Continuous Monitoring',
      duration: 'Ongoing',
      requirements_addressed: ['All requirements'],
      deliverables: ['Monitoring procedures', 'Regular assessments', 'Compliance reporting'],
      success_criteria: ['Sustained compliance', 'Continuous improvement', 'Regulatory confidence']
    }
  ];

  return {
    critical_gaps: criticalGaps,
    remediation_roadmap: phases
  };
}

function generateRecommendations(complianceDetails: any[], _framework: string): any[] {
  const recommendations: any[] = [];

  // Generate recommendations for non-compliant requirements
  complianceDetails
    .filter(d => d.compliance_status !== 'compliant')
    .forEach((detail, index) => {
      recommendations.push({
        recommendation_id: `REC-${String(index + 1).padStart(3, '0')}`,
        category: 'technical' as const,
        priority: detail.remediation_priority,
        title: `Implement ${detail.requirement_name}`,
        description: `Address compliance gap for ${detail.requirement_id}: ${detail.description}`,
        affected_requirements: [detail.requirement_id],
        implementation_guidance: `Focus on CSF subcategories: ${detail.csf_subcategories.join(', ')}`,
        estimated_cost: detail.remediation_priority === 'critical' ? '$50K-100K' : '$10K-50K',
        estimated_effort: detail.remediation_priority === 'critical' ? '2-3 months' : '1-2 months',
        expected_benefits: [
          'Improved compliance status',
          'Reduced regulatory risk',
          'Enhanced security posture'
        ]
      });
    });

  return recommendations;
}

function generateRiskAssessment(complianceDetails: any[], _framework: string): any {
  const nonCompliantItems = complianceDetails.filter(d => d.compliance_status === 'non_compliant');
  const criticalItems = complianceDetails.filter(d => d.remediation_priority === 'critical');

  // Determine overall risk level
  let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (criticalItems.length > 0) {
    overallRiskLevel = 'critical';
  } else if (nonCompliantItems.length > complianceDetails.length * 0.3) {
    overallRiskLevel = 'high';
  } else if (nonCompliantItems.length > 0) {
    overallRiskLevel = 'medium';
  }

  const riskFactors = [
    {
      factor: 'Regulatory Compliance',
      current_level: overallRiskLevel,
      target_level: 'low',
      mitigation_measures: ['Implement missing controls', 'Regular compliance monitoring', 'Staff training']
    },
    {
      factor: 'Data Protection',
      current_level: nonCompliantItems.some(i => i.requirement_name.toLowerCase().includes('data')) ? 'high' : 'medium',
      target_level: 'low',
      mitigation_measures: ['Data classification', 'Access controls', 'Encryption implementation']
    }
  ];

  const nonComplianceRisks = nonCompliantItems.map(detail => ({
    requirement_id: detail.requirement_id,
    risk_description: `Non-compliance with ${detail.requirement_name} may result in regulatory penalties`,
    likelihood: detail.remediation_priority === 'critical' ? 'high' as const : 'medium' as const,
    impact: detail.risk_level as 'low' | 'medium' | 'high' | 'critical',
    risk_score: detail.remediation_priority === 'critical' ? 9 : 
                detail.remediation_priority === 'high' ? 6 : 3
  }));

  return {
    overall_risk_level: overallRiskLevel,
    risk_factors: riskFactors,
    non_compliance_risks: nonComplianceRisks
  };
}

function generateImplementationRoadmap(_complianceDetails: any[], _framework: string): any {
  const now = new Date();
  const phase1End = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months
  const phase2End = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months
  const phase3End = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

  return {
    total_estimated_duration: '12 months',
    estimated_budget_range: '$100K - $500K',
    phases: [
      {
        phase_number: 1,
        phase_name: 'Critical Gap Remediation',
        start_date: now.toISOString(),
        end_date: phase1End.toISOString(),
        objectives: [
          'Address critical compliance gaps',
          'Implement mandatory controls',
          'Establish baseline compliance'
        ],
        deliverables: [
          'Critical control implementations',
          'Policy and procedure updates',
          'Initial compliance assessment'
        ],
        milestones: [
          'Critical gaps identified',
          'Implementation plan approved',
          'Key controls implemented'
        ],
        resource_requirements: [
          'Compliance officer',
          'Technical implementation team',
          'Management support'
        ]
      },
      {
        phase_number: 2,
        phase_name: 'Comprehensive Implementation',
        start_date: phase1End.toISOString(),
        end_date: phase2End.toISOString(),
        objectives: [
          'Achieve full compliance',
          'Implement all required controls',
          'Establish monitoring processes'
        ],
        deliverables: [
          'Complete control implementation',
          'Compliance documentation',
          'Training programs'
        ],
        milestones: [
          'All controls implemented',
          'Staff training completed',
          'Internal audit passed'
        ],
        resource_requirements: [
          'Extended implementation team',
          'Training resources',
          'Audit support'
        ]
      },
      {
        phase_number: 3,
        phase_name: 'Continuous Monitoring',
        start_date: phase2End.toISOString(),
        end_date: phase3End.toISOString(),
        objectives: [
          'Maintain compliance status',
          'Continuous improvement',
          'Regular assessments'
        ],
        deliverables: [
          'Monitoring procedures',
          'Regular compliance reports',
          'Improvement recommendations'
        ],
        milestones: [
          'Monitoring system established',
          'Quarterly assessments',
          'Annual compliance review'
        ],
        resource_requirements: [
          'Ongoing monitoring staff',
          'Assessment tools',
          'Reporting systems'
        ]
      }
    ]
  };
}

export const generateComplianceReportTool: Tool = {
  name: 'generate_compliance_report',
  description: 'Generate comprehensive compliance reports for regulatory frameworks',
  inputSchema: {
    type: 'object',
    properties: {
      profile_id: {
        type: 'string',
        description: 'ID of the profile'
      },
      compliance_framework: {
        type: 'string',
        enum: ['iso27001', 'sox', 'hipaa', 'pci_dss', 'gdpr', 'fisma', 'fedramp', 'custom'],
        description: 'Compliance framework to report against'
      },
      report_scope: {
        type: 'string',
        enum: ['full', 'partial', 'gap_analysis', 'remediation_focused'],
        description: 'Scope of the compliance report'
      },
      include_evidence: {
        type: 'boolean',
        description: 'Whether to include evidence details'
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Whether to include remediation recommendations'
      },
      include_risk_assessment: {
        type: 'boolean',
        description: 'Whether to include risk assessment'
      },
      include_implementation_roadmap: {
        type: 'boolean',
        description: 'Whether to include implementation roadmap'
      },
      custom_framework_requirements: {
        type: 'array',
        description: 'Custom framework requirements for custom compliance framework'
      },
      assessment_date: {
        type: 'string',
        description: 'Date of the assessment (ISO 8601 format)'
      },
      assessor_name: {
        type: 'string',
        description: 'Name of the person conducting the assessment'
      },
      organization_context: {
        type: 'object',
        description: 'Organizational context for the compliance assessment'
      }
    },
    required: ['profile_id', 'compliance_framework']
  }
};

export { generateComplianceReport };