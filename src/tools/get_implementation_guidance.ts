/**
 * Get implementation guidance for NIST CSF controls
 */

import { Tool } from '../types/index.js';
import { Database } from 'better-sqlite3';
import { logger } from '../utils/logger.js';

interface GetImplementationGuidanceParams {
  subcategory_id: string;
  organization_size?: 'small' | 'medium' | 'large' | 'enterprise';
  industry_sector?: string;
  maturity_level?: 'basic' | 'developing' | 'defined' | 'managed' | 'optimized';
  implementation_approach?: 'phased' | 'comprehensive' | 'risk_based' | 'compliance_focused';
  budget_constraints?: 'low' | 'medium' | 'high' | 'unlimited';
  timeline_constraints?: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  existing_controls?: string[];
  regulatory_requirements?: string[];
  risk_tolerance?: 'low' | 'medium' | 'high';
}

interface GetImplementationGuidanceResponse {
  success: boolean;
  guidance?: {
    subcategory_id: string;
    subcategory_name: string;
    function_name: string;
    category_name: string;
    implementation_steps: Array<{
      step_number: number;
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      estimated_effort: string;
      prerequisites: string[];
      deliverables: string[];
    }>;
    technical_controls: Array<{
      control_name: string;
      description: string;
      implementation_approach: string;
      tools_technologies: string[];
      estimated_cost: string;
      complexity: 'low' | 'medium' | 'high';
    }>;
    administrative_controls: Array<{
      control_name: string;
      description: string;
      policy_requirements: string[];
      training_requirements: string[];
      roles_responsibilities: string[];
    }>;
    physical_controls?: Array<{
      control_name: string;
      description: string;
      implementation_requirements: string[];
      maintenance_requirements: string[];
    }>;
    industry_specific_guidance?: {
      sector: string;
      specific_considerations: string[];
      regulatory_alignment: string[];
      industry_standards: string[];
    };
    size_specific_guidance: {
      organization_size: string;
      recommended_approach: string;
      resource_considerations: string[];
      scalability_factors: string[];
    };
    implementation_timeline: {
      phase_1: { duration: string; activities: string[] };
      phase_2: { duration: string; activities: string[] };
      phase_3?: { duration: string; activities: string[] };
      total_estimated_duration: string;
    };
    success_metrics: Array<{
      metric_name: string;
      description: string;
      measurement_method: string;
      target_value: string;
    }>;
    common_pitfalls: Array<{
      pitfall: string;
      impact: string;
      mitigation: string;
    }>;
    related_subcategories: string[];
    references: Array<{
      title: string;
      url?: string;
      type: 'standard' | 'guidance' | 'tool' | 'template';
    }>;
  };
  error?: string;
  message?: string;
}

function validateParams(params: GetImplementationGuidanceParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.subcategory_id) errors.push('subcategory_id is required');

  const validSizes = ['small', 'medium', 'large', 'enterprise'];
  if (params.organization_size && !validSizes.includes(params.organization_size)) {
    errors.push('Invalid organization_size');
  }

  const validMaturityLevels = ['basic', 'developing', 'defined', 'managed', 'optimized'];
  if (params.maturity_level && !validMaturityLevels.includes(params.maturity_level)) {
    errors.push('Invalid maturity_level');
  }

  const validApproaches = ['phased', 'comprehensive', 'risk_based', 'compliance_focused'];
  if (params.implementation_approach && !validApproaches.includes(params.implementation_approach)) {
    errors.push('Invalid implementation_approach');
  }

  return { isValid: errors.length === 0, errors };
}

async function getImplementationGuidance(params: GetImplementationGuidanceParams, db: Database): Promise<GetImplementationGuidanceResponse> {
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

    // Get subcategory details
    const subcategory = db.prepare(`
      SELECT s.*, c.name as category_name, f.name as function_name 
      FROM subcategories s
      JOIN categories c ON s.category_id = c.id
      JOIN functions f ON c.function_id = f.id
      WHERE s.id = ?
    `).get(params.subcategory_id);

    if (!subcategory) {
      return {
        success: false,
        error: 'NotFound',
        message: 'Subcategory not found'
      };
    }

    // Generate implementation guidance based on subcategory
    const guidance = generateGuidanceContent(subcategory, params);

    logger.info('Implementation guidance retrieved', { 
      subcategory_id: params.subcategory_id 
    });

    return {
      success: true,
      guidance
    };

  } catch (error) {
    logger.error('Get implementation guidance error', error);
    return {
      success: false,
      error: 'InternalError',
      message: 'An error occurred while retrieving implementation guidance'
    };
  }
}

function generateGuidanceContent(subcategory: any, params: GetImplementationGuidanceParams): any {
  const organizationSize = params.organization_size || 'medium';
  // const _maturityLevel = params.maturity_level || 'developing'; // For future enhancement
  const approach = params.implementation_approach || 'phased';

  // Generate implementation steps based on subcategory
  const implementationSteps = generateImplementationSteps(subcategory.id, approach);
  
  // Generate technical controls
  const technicalControls = generateTechnicalControls(subcategory.id, organizationSize);
  
  // Generate administrative controls
  const administrativeControls = generateAdministrativeControls(subcategory.id);
  
  // Generate physical controls if applicable
  const physicalControls = generatePhysicalControls(subcategory.id);
  
  // Generate industry-specific guidance
  const industryGuidance = params.industry_sector ? 
    generateIndustryGuidance(subcategory.id, params.industry_sector) : undefined;
  
  // Generate size-specific guidance
  const sizeGuidance = generateSizeSpecificGuidance(subcategory.id, organizationSize);
  
  // Generate implementation timeline
  const timeline = generateImplementationTimeline(subcategory.id, organizationSize, approach);
  
  // Generate success metrics
  const successMetrics = generateSuccessMetrics(subcategory.id);
  
  // Generate common pitfalls
  const commonPitfalls = generateCommonPitfalls(subcategory.id);
  
  // Get related subcategories
  const relatedSubcategories = getRelatedSubcategories(subcategory.id);
  
  // Generate references
  const references = generateReferences(subcategory.id);

  return {
    subcategory_id: subcategory.id,
    subcategory_name: subcategory.name,
    function_name: subcategory.function_name,
    category_name: subcategory.category_name,
    implementation_steps: implementationSteps,
    technical_controls: technicalControls,
    administrative_controls: administrativeControls,
    physical_controls: physicalControls.length > 0 ? physicalControls : undefined,
    industry_specific_guidance: industryGuidance,
    size_specific_guidance: sizeGuidance,
    implementation_timeline: timeline,
    success_metrics: successMetrics,
    common_pitfalls: commonPitfalls,
    related_subcategories: relatedSubcategories,
    references
  };
}

function generateImplementationSteps(_subcategoryId: string, approach: string): any[] {
  // Base implementation steps - would be customized based on specific subcategory
  const baseSteps = [
    {
      step_number: 1,
      title: 'Assessment and Planning',
      description: 'Assess current state and develop implementation plan',
      priority: 'high' as const,
      estimated_effort: '1-2 weeks',
      prerequisites: ['Management approval', 'Resource allocation'],
      deliverables: ['Assessment report', 'Implementation plan']
    },
    {
      step_number: 2,
      title: 'Design and Configuration',
      description: 'Design control implementation and configure systems',
      priority: 'high' as const,
      estimated_effort: '2-4 weeks',
      prerequisites: ['Completed assessment', 'Technical resources'],
      deliverables: ['Design document', 'Configuration templates']
    },
    {
      step_number: 3,
      title: 'Implementation',
      description: 'Deploy and implement the control',
      priority: 'critical' as const,
      estimated_effort: '1-3 weeks',
      prerequisites: ['Approved design', 'Testing environment'],
      deliverables: ['Implemented control', 'Implementation documentation']
    },
    {
      step_number: 4,
      title: 'Testing and Validation',
      description: 'Test control effectiveness and validate implementation',
      priority: 'high' as const,
      estimated_effort: '1-2 weeks',
      prerequisites: ['Completed implementation', 'Test procedures'],
      deliverables: ['Test results', 'Validation report']
    },
    {
      step_number: 5,
      title: 'Deployment and Monitoring',
      description: 'Deploy to production and establish monitoring',
      priority: 'medium' as const,
      estimated_effort: '1 week',
      prerequisites: ['Successful testing', 'Monitoring tools'],
      deliverables: ['Production deployment', 'Monitoring dashboard']
    }
  ];

  // Customize steps based on approach
  if (approach === 'risk_based') {
    baseSteps[0]!.description = 'Conduct risk assessment and prioritize based on risk levels';
    baseSteps[0]!.prerequisites!.push('Risk assessment framework');
  }

  return baseSteps;
}

function generateTechnicalControls(_subcategoryId: string, organizationSize: string): any[] {
  // Example technical controls - would be customized per subcategory
  return [
    {
      control_name: 'Automated Security Tools',
      description: 'Deploy automated tools for continuous monitoring and control',
      implementation_approach: organizationSize === 'small' ? 'Cloud-based SaaS solution' : 'Enterprise platform',
      tools_technologies: ['SIEM', 'Vulnerability scanners', 'Security orchestration'],
      estimated_cost: organizationSize === 'small' ? '$5K-15K annually' : '$50K-200K annually',
      complexity: organizationSize === 'small' ? 'medium' as const : 'high' as const
    },
    {
      control_name: 'Configuration Management',
      description: 'Implement configuration management and baseline controls',
      implementation_approach: 'Configuration management tools and processes',
      tools_technologies: ['Configuration management systems', 'Baseline templates', 'Change control'],
      estimated_cost: '$10K-50K setup + ongoing maintenance',
      complexity: 'medium' as const
    }
  ];
}

function generateAdministrativeControls(_subcategoryId: string): any[] {
  return [
    {
      control_name: 'Security Policies and Procedures',
      description: 'Develop and maintain security policies and procedures',
      policy_requirements: ['Security policy framework', 'Procedure documentation', 'Regular reviews'],
      training_requirements: ['Policy awareness training', 'Procedure training', 'Annual refresher'],
      roles_responsibilities: ['Security officer', 'Policy owners', 'All employees']
    },
    {
      control_name: 'Security Awareness Program',
      description: 'Establish ongoing security awareness and training program',
      policy_requirements: ['Training policy', 'Awareness materials', 'Communication plan'],
      training_requirements: ['Initial training', 'Role-based training', 'Ongoing awareness'],
      roles_responsibilities: ['HR department', 'Security team', 'Management']
    }
  ];
}

function generatePhysicalControls(subcategoryId: string): any[] {
  // Only return physical controls for relevant subcategories
  if (subcategoryId.includes('PR.AC') || subcategoryId.includes('PR.PT')) {
    return [
      {
        control_name: 'Access Control Systems',
        description: 'Physical access control and monitoring systems',
        implementation_requirements: ['Card access systems', 'Biometric controls', 'Visitor management'],
        maintenance_requirements: ['Regular system updates', 'Access review', 'Hardware maintenance']
      }
    ];
  }
  return [];
}

function generateIndustryGuidance(_subcategoryId: string, sector: string): any {
  const sectorMappings: Record<string, any> = {
    'financial': {
      sector: 'Financial Services',
      specific_considerations: ['PCI DSS compliance', 'SOX requirements', 'Customer data protection'],
      regulatory_alignment: ['FFIEC guidelines', 'NYDFS Cybersecurity Requirements'],
      industry_standards: ['ISO 27001', 'PCI DSS', 'COBIT']
    },
    'healthcare': {
      sector: 'Healthcare',
      specific_considerations: ['HIPAA compliance', 'Patient privacy', 'Medical device security'],
      regulatory_alignment: ['HIPAA Security Rule', 'FDA cybersecurity guidance'],
      industry_standards: ['HITRUST CSF', 'NIST 800-66', 'ISO 27799']
    },
    'government': {
      sector: 'Government',
      specific_considerations: ['FedRAMP compliance', 'FISMA requirements', 'Continuous monitoring'],
      regulatory_alignment: ['FISMA', 'FedRAMP', 'NIST 800-53'],
      industry_standards: ['NIST 800-53', 'ISO 27001', 'CNSSI-1253']
    }
  };

  return sectorMappings[sector] || {
    sector: 'General',
    specific_considerations: ['Industry best practices', 'Regulatory compliance', 'Business requirements'],
    regulatory_alignment: ['General data protection regulations'],
    industry_standards: ['ISO 27001', 'NIST frameworks']
  };
}

function generateSizeSpecificGuidance(_subcategoryId: string, size: string): any {
  const sizeGuidance: Record<string, any> = {
    'small': {
      organization_size: 'Small (1-100 employees)',
      recommended_approach: 'Start with essential controls, use cloud services, focus on automation',
      resource_considerations: ['Limited budget', 'Few dedicated security staff', 'Outsourced services'],
      scalability_factors: ['Cloud-first approach', 'Managed services', 'Scalable tools']
    },
    'medium': {
      organization_size: 'Medium (101-1000 employees)',
      recommended_approach: 'Balanced approach with dedicated security resources',
      resource_considerations: ['Moderate budget', 'Some dedicated security staff', 'Mix of internal/external'],
      scalability_factors: ['Hybrid infrastructure', 'Growing security team', 'Tool integration']
    },
    'large': {
      organization_size: 'Large (1001-10000 employees)',
      recommended_approach: 'Comprehensive security program with specialized teams',
      resource_considerations: ['Significant budget', 'Dedicated security organization', 'Internal capabilities'],
      scalability_factors: ['Enterprise architecture', 'Multiple locations', 'Complex integrations']
    },
    'enterprise': {
      organization_size: 'Enterprise (10000+ employees)',
      recommended_approach: 'Mature security organization with advanced capabilities',
      resource_considerations: ['Large budget', 'Multiple security teams', 'Advanced technologies'],
      scalability_factors: ['Global operations', 'Regulatory complexity', 'Advanced threats']
    }
  };

  return sizeGuidance[size];
}

function generateImplementationTimeline(_subcategoryId: string, size: string, _approach: string): any {
  const baseDurations = {
    'small': { phase1: '2-4 weeks', phase2: '4-6 weeks', phase3: '2-3 weeks', total: '2-3 months' },
    'medium': { phase1: '3-4 weeks', phase2: '6-8 weeks', phase3: '3-4 weeks', total: '3-4 months' },
    'large': { phase1: '4-6 weeks', phase2: '8-12 weeks', phase3: '4-6 weeks', total: '4-6 months' },
    'enterprise': { phase1: '6-8 weeks', phase2: '12-16 weeks', phase3: '6-8 weeks', total: '6-8 months' }
  };

  const duration = baseDurations[size as keyof typeof baseDurations] || baseDurations['medium'];

  return {
    phase_1: {
      duration: duration.phase1,
      activities: ['Assessment', 'Planning', 'Design', 'Procurement']
    },
    phase_2: {
      duration: duration.phase2,
      activities: ['Implementation', 'Configuration', 'Testing', 'Integration']
    },
    phase_3: {
      duration: duration.phase3,
      activities: ['Deployment', 'Training', 'Documentation', 'Monitoring setup']
    },
    total_estimated_duration: duration.total
  };
}

function generateSuccessMetrics(_subcategoryId: string): any[] {
  return [
    {
      metric_name: 'Control Implementation Status',
      description: 'Percentage of control requirements implemented',
      measurement_method: 'Implementation checklist completion',
      target_value: '100% within timeline'
    },
    {
      metric_name: 'Security Effectiveness',
      description: 'Measurement of control effectiveness in preventing incidents',
      measurement_method: 'Security metrics and incident tracking',
      target_value: 'Zero security incidents related to this control'
    },
    {
      metric_name: 'Compliance Status',
      description: 'Compliance with relevant standards and regulations',
      measurement_method: 'Compliance assessment and audit results',
      target_value: '100% compliance with applicable requirements'
    }
  ];
}

function generateCommonPitfalls(_subcategoryId: string): any[] {
  return [
    {
      pitfall: 'Insufficient planning and requirements gathering',
      impact: 'Implementation delays, cost overruns, incomplete controls',
      mitigation: 'Conduct thorough assessment and planning phase, engage stakeholders'
    },
    {
      pitfall: 'Lack of stakeholder buy-in and support',
      impact: 'Resistance to change, poor adoption, implementation failures',
      mitigation: 'Engage stakeholders early, communicate benefits, provide training'
    },
    {
      pitfall: 'Inadequate testing and validation',
      impact: 'Controls may not work as expected, security gaps',
      mitigation: 'Implement comprehensive testing procedures, validate effectiveness'
    }
  ];
}

function getRelatedSubcategories(subcategoryId: string): string[] {
  // This would query the database for related subcategories
  // For now, return example related categories based on function
  const functionId = subcategoryId.split('.')[0];
  const relatedExamples: Record<string, string[]> = {
    'GV': ['GV.OC-01', 'GV.OC-02', 'GV.RM-01'],
    'ID': ['ID.AM-01', 'ID.AM-02', 'ID.RA-01'],
    'PR': ['PR.AC-01', 'PR.DS-01', 'PR.PT-01'],
    'DE': ['DE.CM-01', 'DE.AE-01', 'DE.DP-01'],
    'RS': ['RS.CO-01', 'RS.AN-01', 'RS.MI-01'],
    'RC': ['RC.RP-01', 'RC.CO-01', 'RC.IM-01']
  };

  return relatedExamples[functionId as keyof typeof relatedExamples] || [];
}

function generateReferences(_subcategoryId: string): any[] {
  return [
    {
      title: 'NIST Cybersecurity Framework 2.0',
      url: 'https://www.nist.gov/cyberframework',
      type: 'standard' as const
    },
    {
      title: 'NIST SP 800-53 Security Controls',
      url: 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
      type: 'guidance' as const
    },
    {
      title: 'Implementation Best Practices Guide',
      type: 'guidance' as const
    },
    {
      title: 'Security Control Templates',
      type: 'template' as const
    }
  ];
}

export const getImplementationGuidanceTool: Tool = {
  name: 'get_implementation_guidance',
  description: 'Get detailed implementation guidance for NIST CSF controls',
  inputSchema: {
    type: 'object',
    properties: {
      subcategory_id: {
        type: 'string',
        description: 'NIST CSF subcategory ID (e.g., GV.OC-01)'
      },
      organization_size: {
        type: 'string',
        enum: ['small', 'medium', 'large', 'enterprise'],
        description: 'Size of the organization'
      },
      industry_sector: {
        type: 'string',
        description: 'Industry sector (e.g., financial, healthcare, government)'
      },
      maturity_level: {
        type: 'string',
        enum: ['basic', 'developing', 'defined', 'managed', 'optimized'],
        description: 'Current cybersecurity maturity level'
      },
      implementation_approach: {
        type: 'string',
        enum: ['phased', 'comprehensive', 'risk_based', 'compliance_focused'],
        description: 'Preferred implementation approach'
      },
      budget_constraints: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'unlimited'],
        description: 'Budget constraints for implementation'
      },
      timeline_constraints: {
        type: 'string',
        enum: ['immediate', 'short_term', 'medium_term', 'long_term'],
        description: 'Timeline constraints for implementation'
      },
      existing_controls: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of existing security controls'
      },
      regulatory_requirements: {
        type: 'array',
        items: { type: 'string' },
        description: 'Applicable regulatory requirements'
      },
      risk_tolerance: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Organization risk tolerance level'
      }
    },
    required: ['subcategory_id']
  }
};

export { getImplementationGuidance };