/**
 * MCP Tool: get_question_context
 * Retrieves detailed context, guidance, and examples for specific assessment questions
 */

import { z } from 'zod';
import { questionBankService } from '../services/question-bank.js';
import { logger } from '../utils/enhanced-logger.js';

// Input validation schema
const GetQuestionContextSchema = z.object({
  subcategory_id: z.string().min(1)
    .describe('NIST CSF subcategory ID (e.g., GV.OC-01)'),
  include_implementation_examples: z.boolean().default(true)
    .describe('Include official NIST implementation examples'),
  include_references: z.boolean().default(true)
    .describe('Include reference links and documentation'),
  organization_context: z.object({
    sector: z.string()
      .describe('Organization sector (e.g., healthcare, finance, technology)'),
    size: z.enum(['small', 'medium', 'large', 'enterprise'])
      .describe('Organization size for context-appropriate guidance')
  }).optional()
    .describe('Optional organization context for personalized guidance'),
  include_risk_factors: z.boolean().default(true)
    .describe('Include common risk factors and challenges'),
  include_best_practices: z.boolean().default(true)
    .describe('Include implementation best practices'),
  language: z.string().default('en')
    .describe('Language for context text (currently only en supported)')
});

type GetQuestionContextParams = z.infer<typeof GetQuestionContextSchema>;

/**
 * Get comprehensive context and guidance for a specific assessment question
 */
export async function getQuestionContext(params: GetQuestionContextParams) {
  const startTime = Date.now();
  
  try {
    // Validate input parameters
    const validatedParams = GetQuestionContextSchema.parse(params);
    
    logger.info('Retrieving question context', {
      subcategory_id: validatedParams.subcategory_id,
      organization_sector: validatedParams.organization_context?.sector,
      organization_size: validatedParams.organization_context?.size,
      include_examples: validatedParams.include_implementation_examples
    });

    // Get context from question bank service
    const context = await questionBankService.getQuestionContext(validatedParams as any);

    // Enhance context with additional guidance
    const enhancedContext = await enhanceContextWithGuidance(context, validatedParams);

    const response = {
      success: true,
      subcategory_id: validatedParams.subcategory_id,
      context: enhancedContext,
      guidance: {
        assessment_tips: getAssessmentTips(validatedParams.subcategory_id),
        evidence_suggestions: getEvidenceSuggestions(validatedParams.subcategory_id, validatedParams.organization_context),
        common_pitfalls: getCommonPitfalls(validatedParams.subcategory_id),
        maturity_indicators: getMaturityIndicators(validatedParams.subcategory_id)
      },
      metadata: {
        function: context.subcategory_id.substring(0, 2),
        category: context.subcategory_id.substring(0, context.subcategory_id.lastIndexOf('-')),
        complexity_level: getComplexityLevel(validatedParams.subcategory_id),
        typical_implementation_time: getTypicalImplementationTime(validatedParams.subcategory_id, validatedParams.organization_context?.size),
        related_frameworks: getRelatedFrameworks(validatedParams.subcategory_id),
        generation_time: Date.now() - startTime
      }
    };

    logger.info('Question context retrieved successfully', {
      subcategory_id: validatedParams.subcategory_id,
      context_elements: Object.keys(enhancedContext).length,
      guidance_elements: Object.keys(response.guidance).length,
      duration: Date.now() - startTime
    });

    return response;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to retrieve question context', {
      error: errorMessage,
      subcategory_id: params.subcategory_id,
      duration: Date.now() - startTime
    });

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input parameters',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
          received: 'received' in e ? (e as any).received : 'unknown'
        }))
      };
    }

    return {
      success: false,
      error: 'Failed to retrieve question context',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Enhance context with additional guidance based on parameters
 */
async function enhanceContextWithGuidance(context: any, params: GetQuestionContextParams) {
  const enhanced = { ...context };

  // Add assessment-specific guidance
  if (params.include_risk_factors && enhanced.risk_factors) {
    enhanced.risk_assessment_guidance = generateRiskAssessmentGuidance(enhanced.risk_factors);
  }

  if (params.include_best_practices && enhanced.best_practices) {
    enhanced.implementation_roadmap = generateImplementationRoadmap(enhanced.best_practices, params.organization_context);
  }

  // Add contextual examples based on organization
  if (params.organization_context) {
    enhanced.contextualized_examples = generateContextualizedExamples(
      params.subcategory_id,
      params.organization_context.sector,
      params.organization_context.size
    );
  }

  return enhanced;
}

/**
 * Generate risk assessment guidance
 */
function generateRiskAssessmentGuidance(riskFactors: string[]): any {
  return {
    risk_evaluation_steps: [
      'Identify applicable risk factors from your environment',
      'Assess likelihood of each risk factor occurring',
      'Evaluate potential impact on business operations',
      'Prioritize risks based on likelihood and impact',
      'Develop mitigation strategies for high-priority risks'
    ],
    risk_factors: riskFactors.map(factor => ({
      factor,
      assessment_questions: [
        `How likely is "${factor}" to occur in your environment?`,
        `What would be the business impact if "${factor}" materialized?`,
        `What controls do you have in place to mitigate "${factor}"?`
      ]
    }))
  };
}

/**
 * Generate implementation roadmap
 */
function generateImplementationRoadmap(bestPractices: string[], orgContext?: any): any {
  const phases = [
    {
      phase: 'Assessment & Planning',
      duration: orgContext?.size === 'small' ? '2-4 weeks' : '4-8 weeks',
      activities: ['Current state assessment', 'Gap analysis', 'Resource planning', 'Stakeholder alignment']
    },
    {
      phase: 'Foundation',
      duration: orgContext?.size === 'small' ? '1-2 months' : '2-4 months',
      activities: ['Policy development', 'Process documentation', 'Initial training', 'Tool procurement']
    },
    {
      phase: 'Implementation',
      duration: orgContext?.size === 'small' ? '2-3 months' : '4-6 months',
      activities: ['Control implementation', 'System configuration', 'Process rollout', 'Team training']
    },
    {
      phase: 'Optimization',
      duration: 'Ongoing',
      activities: ['Performance monitoring', 'Continuous improvement', 'Regular reviews', 'Advanced automation']
    }
  ];

  return {
    recommended_approach: bestPractices,
    implementation_phases: phases,
    success_factors: [
      'Executive sponsorship and support',
      'Clear roles and responsibilities',
      'Adequate resource allocation',
      'Regular progress monitoring',
      'Stakeholder communication and training'
    ]
  };
}

/**
 * Generate contextualized examples
 */
function generateContextualizedExamples(subcategoryId: string, sector: string, size: string): any {
  const examples: Record<string, Record<string, string[]>> = {
    'GV.OC-01': {
      'healthcare': [
        'Document how cybersecurity protects patient care delivery and medical device safety',
        'Align security strategy with HIPAA compliance and patient safety requirements'
      ],
      'finance': [
        'Connect cybersecurity strategy to financial service availability and customer trust',
        'Document regulatory compliance requirements (PCI-DSS, SOX, etc.) in security strategy'
      ],
      'technology': [
        'Link cybersecurity to intellectual property protection and customer data privacy',
        'Document security requirements for software development and service delivery'
      ]
    }
  };

  return examples[subcategoryId]?.[sector] || [
    `Customize implementation based on ${sector} sector requirements`,
    `Consider ${size} organization constraints and capabilities`
  ];
}

/**
 * Get assessment tips for specific subcategory
 */
function getAssessmentTips(subcategoryId: string): string[] {
  const tipMap: Record<string, string[]> = {
    'GV.OC-01': [
      'Look for documented mission statements that explicitly mention cybersecurity',
      'Check if cybersecurity risks are included in business impact assessments',
      'Verify that security strategy aligns with business objectives',
      'Ensure leadership understands and communicates the connection'
    ],
    'GV.RM-01': [
      'Review board meeting minutes for cybersecurity risk discussions',
      'Check if risk objectives are measurable and time-bound',
      'Verify senior leadership agreement and sign-off on risk objectives',
      'Look for integration with enterprise risk management frameworks'
    ]
  };

  return tipMap[subcategoryId] || [
    'Document current implementation with specific examples',
    'Consider both technical and process-based evidence',
    'Evaluate effectiveness, not just existence of controls',
    'Look for continuous improvement and monitoring mechanisms'
  ];
}

/**
 * Get evidence suggestions
 */
function getEvidenceSuggestions(_subcategoryId: string, orgContext?: any): string[] {
  const baseEvidence = [
    'Policy documents and procedures',
    'Meeting minutes and decision records',
    'Training materials and completion records',
    'Audit reports and assessment findings',
    'Monitoring reports and metrics'
  ];

  if (orgContext?.sector === 'healthcare') {
    baseEvidence.push('HIPAA compliance documentation', 'Patient safety incident reports');
  } else if (orgContext?.sector === 'finance') {
    baseEvidence.push('Regulatory filing documentation', 'Financial audit reports');
  }

  return baseEvidence;
}

/**
 * Get common pitfalls
 */
function getCommonPitfalls(_subcategoryId: string): string[] {
  return [
    'Confusing documented policies with actual implementation',
    'Overestimating maturity based on planned vs. active controls',
    'Not considering effectiveness and continuous monitoring',
    'Focusing on technical controls while ignoring governance aspects',
    'Assuming compliance equals cybersecurity maturity'
  ];
}

/**
 * Get maturity indicators for different levels
 */
function getMaturityIndicators(_subcategoryId: string): any {
  return {
    'Level 0 - Not Implemented': [
      'No documented processes or controls',
      'Ad hoc or reactive approaches only',
      'No assigned responsibilities or accountability'
    ],
    'Level 1 - Initial': [
      'Basic processes documented but not consistently followed',
      'Limited training or awareness',
      'Reactive approach to incidents and issues'
    ],
    'Level 2 - Developing': [
      'Processes documented and generally followed',
      'Basic monitoring and measurement in place',
      'Some proactive risk management activities'
    ],
    'Level 3 - Defined': [
      'Well-documented, communicated, and consistently followed processes',
      'Regular monitoring, measurement, and reporting',
      'Proactive risk management with defined procedures'
    ],
    'Level 4 - Managed': [
      'Processes monitored for effectiveness and efficiency',
      'Data-driven decision making and continuous improvement',
      'Integration with enterprise risk management'
    ],
    'Level 5 - Optimized': [
      'Continuous improvement based on lessons learned and best practices',
      'Advanced automation and optimization',
      'Industry leadership and innovation'
    ]
  };
}

/**
 * Get complexity level for implementation
 */
function getComplexityLevel(subcategoryId: string): string {
  const complexityMap: Record<string, string> = {
    'GV.OC-01': 'Medium',
    'GV.RM-01': 'High',
    'ID.AM-01': 'Medium',
    'PR.AC-01': 'High'
  };

  return complexityMap[subcategoryId] || 'Medium';
}

/**
 * Get typical implementation time
 */
function getTypicalImplementationTime(subcategoryId: string, orgSize?: string): string {
  const baseTimeMap: Record<string, Record<string, string>> = {
    'GV.OC-01': {
      'small': '2-4 weeks',
      'medium': '1-2 months',
      'large': '2-3 months',
      'enterprise': '3-6 months'
    }
  };

  return baseTimeMap[subcategoryId]?.[orgSize || 'medium'] || '1-3 months';
}

/**
 * Get related frameworks and standards
 */
function getRelatedFrameworks(subcategoryId: string): string[] {
  const functionId = subcategoryId.substring(0, 2);
  
  const frameworkMap: Record<string, string[]> = {
    'GV': ['ISO 27001', 'COBIT', 'COSO', 'NIST Risk Management Framework'],
    'ID': ['ISO 27001', 'NIST SP 800-53', 'CIS Controls'],
    'PR': ['ISO 27001', 'NIST SP 800-53', 'CIS Controls', 'PCI-DSS'],
    'DE': ['NIST SP 800-61', 'ISO 27035', 'SANS Incident Response'],
    'RS': ['NIST SP 800-61', 'ISO 27035', 'SANS Incident Response'],
    'RC': ['ISO 22301', 'NIST SP 800-34', 'Business Continuity Planning']
  };

  return frameworkMap[functionId] || ['ISO 27001', 'NIST SP 800-53'];
}

// Export tool definition for MCP server
export const getQuestionContextTool = {
  name: 'get_question_context',
  description: 'Retrieve detailed context, guidance, and examples for specific NIST CSF assessment questions with sector and size-specific recommendations',
  inputSchema: {
    type: 'object',
    properties: {
      subcategory_id: {
        type: 'string',
        minLength: 1,
        description: 'NIST CSF subcategory ID (e.g., GV.OC-01)'
      },
      include_implementation_examples: {
        type: 'boolean',
        default: true,
        description: 'Include official NIST implementation examples'
      },
      include_references: {
        type: 'boolean',
        default: true,
        description: 'Include reference links and documentation'
      },
      organization_context: {
        type: 'object',
        properties: {
          sector: {
            type: 'string',
            description: 'Organization sector (e.g., healthcare, finance, technology)'
          },
          size: {
            type: 'string',
            enum: ['small', 'medium', 'large', 'enterprise'],
            description: 'Organization size for context-appropriate guidance'
          }
        },
        required: ['sector', 'size'],
        description: 'Optional organization context for personalized guidance'
      },
      include_risk_factors: {
        type: 'boolean',
        default: true,
        description: 'Include common risk factors and challenges'
      },
      include_best_practices: {
        type: 'boolean',
        default: true,
        description: 'Include implementation best practices'
      },
      language: {
        type: 'string',
        default: 'en',
        description: 'Language for context text (currently only en supported)'
      }
    },
    required: ['subcategory_id']
  }
};