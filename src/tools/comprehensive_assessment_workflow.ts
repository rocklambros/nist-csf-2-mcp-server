/**
 * Comprehensive Assessment Workflow Tool
 * Manages the complete NIST CSF 2.0 assessment process with real user input
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { logger } from '../utils/logger.js';

// Workflow state enum
export const AssessmentWorkflowState = z.enum([
  'not_started',
  'organization_setup',
  'questions_ready', 
  'in_progress',
  'completed',
  'validated'
]);

export type AssessmentWorkflowStateType = z.infer<typeof AssessmentWorkflowState>;

// Input schema for starting the workflow
export const StartAssessmentWorkflowSchema = z.object({
  org_name: z.string().min(1, 'Organization name is required'),
  sector: z.string().min(1, 'Industry sector is required'),
  size: z.enum(['small', 'medium', 'large', 'enterprise'], {
    errorMap: () => ({ message: 'Organization size must be small, medium, large, or enterprise' })
  }),
  contact_name: z.string().min(1, 'Contact name is required'),
  contact_email: z.string().email('Valid email address is required'),
  description: z.string().optional(),
  assessment_scope: z.enum(['full', 'specific_functions']).default('full'),
  target_functions: z.array(z.enum(['GV', 'ID', 'PR', 'DE', 'RS', 'RC'])).optional(),
  timeline_weeks: z.number().min(1).max(52).default(8)
});

export type StartAssessmentWorkflowParams = z.infer<typeof StartAssessmentWorkflowSchema>;

// Workflow database record interface
interface WorkflowRecord {
  workflow_id: string;
  profile_id: string;
  state: AssessmentWorkflowStateType;
  started_at: string;
  timeline_weeks: number;
  assessment_scope: string;
  target_functions?: string;
  org_id: string;
}

// Progress data interface
interface ProgressData {
  current_step: number;
  total_steps: number;
  questions_answered: number;
  questions_remaining: number;
  completion_percentage: number;
}

// Next action data interface
interface NextActionData {
  description: string;
  required_data?: {
    profile_id?: string;
    responses?: string;
    workflow_id?: string;
    message?: string;
    assessment_type?: string;
    parameters?: {
      assessment_type?: string;
      organization_size?: string;
      subcategory_ids?: string[];
    };
  };
  tool_to_use?: string;
}

// Assessment workflow status response
interface AssessmentWorkflowStatus {
  success: boolean;
  workflow_id: string;
  profile_id: string;
  state: AssessmentWorkflowStateType;
  progress: {
    current_step: number;
    total_steps: number;
    questions_answered: number;
    questions_remaining: number;
    completion_percentage: number;
  };
  next_action: NextActionData;
  organization: {
    org_id: string;
    org_name: string;
    sector: string;
    size: string;
  };
  timeline?: {
    started_at: string;
    estimated_completion: string;
    time_remaining_weeks: number;
  };
}

/**
 * Start a comprehensive NIST CSF 2.0 assessment workflow
 * This ensures no fake data is used - requires real organizational input
 */
export async function startAssessmentWorkflow(params: StartAssessmentWorkflowParams): Promise<AssessmentWorkflowStatus> {
  const db = getDatabase();
  
  try {
    // Validate input parameters
    const validatedParams = StartAssessmentWorkflowSchema.parse(params);
    
    logger.info('Starting comprehensive assessment workflow', {
      org_name: validatedParams.org_name,
      sector: validatedParams.sector,
      size: validatedParams.size,
      scope: validatedParams.assessment_scope
    });
    
    // Generate unique IDs
    const workflowId = generateWorkflowId();
    const orgId = generateOrgId(validatedParams.org_name);
    const profileId = generateProfileId(orgId, 'current');
    
    // Use transaction to ensure data consistency
    const result = db.transaction(() => {
      // Create organization WITHOUT any fake assessment data
      db.createOrganization({
        org_id: orgId,
        org_name: validatedParams.org_name,
        industry: validatedParams.sector,
        size: validatedParams.size,
        // Do NOT set current_tier or target_tier - these must be determined through assessment
      });
      
      // Create assessment profile WITHOUT any fake assessments
      db.createProfile({
        profile_id: profileId,
        org_id: orgId,
        profile_name: `${validatedParams.org_name} - Comprehensive Assessment`,
        profile_type: 'current',
        description: validatedParams.description || `Comprehensive NIST CSF 2.0 assessment for ${validatedParams.org_name}`,
        created_by: validatedParams.contact_name
      });
      
      // Create workflow tracking record
      db.createAssessmentWorkflow({
        workflow_id: workflowId,
        profile_id: profileId,
        org_id: orgId,
        state: 'organization_setup',
        assessment_scope: validatedParams.assessment_scope,
        target_functions: validatedParams.target_functions,
        timeline_weeks: validatedParams.timeline_weeks,
        started_at: new Date().toISOString(),
        contact_name: validatedParams.contact_name,
        contact_email: validatedParams.contact_email
      });
      
      return { workflowId, orgId, profileId };
    });
    
    // Calculate next steps based on scope
    const totalQuestions = await calculateTotalQuestions(
      validatedParams.assessment_scope,
      validatedParams.target_functions
    );
    
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + (validatedParams.timeline_weeks * 7));
    
    return {
      success: true,
      workflow_id: result.workflowId,
      profile_id: result.profileId,
      state: 'organization_setup',
      progress: {
        current_step: 1,
        total_steps: 5, // Setup, Questions, Assessment, Analysis, Validation
        questions_answered: 0,
        questions_remaining: totalQuestions,
        completion_percentage: 0
      },
      next_action: {
        description: 'Organization created successfully. Next step: Review and begin assessment questions',
        tool_to_use: 'get_assessment_questions',
        required_data: {
          message: 'Use get_assessment_questions tool to retrieve the assessment questions for your organization',
          parameters: {
            assessment_type: 'detailed',
            organization_size: validatedParams.size,
            ...(validatedParams.target_functions && { 
              subcategory_ids: validatedParams.target_functions 
            })
          }
        }
      },
      organization: {
        org_id: result.orgId,
        org_name: validatedParams.org_name,
        sector: validatedParams.sector,
        size: validatedParams.size
      },
      timeline: {
        started_at: new Date().toISOString(),
        estimated_completion: estimatedCompletion.toISOString(),
        time_remaining_weeks: validatedParams.timeline_weeks
      }
    };
    
  } catch (error) {
    logger.error('Failed to start assessment workflow', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        workflow_id: '',
        profile_id: '',
        state: 'not_started',
        progress: {
          current_step: 0,
          total_steps: 0,
          questions_answered: 0,
          questions_remaining: 0,
          completion_percentage: 0
        },
        next_action: {
          description: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`
        },
        organization: {
          org_id: '',
          org_name: '',
          sector: '',
          size: ''
        }
      };
    }
    
    return {
      success: false,
      workflow_id: '',
      profile_id: '',
      state: 'not_started',
      progress: {
        current_step: 0,
        total_steps: 0,
        questions_answered: 0,
        questions_remaining: 0,
        completion_percentage: 0
      },
      next_action: {
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      },
      organization: {
        org_id: '',
        org_name: '',
        sector: '',
        size: ''
      }
    };
  }
}

/**
 * Check assessment workflow status
 */
export const CheckAssessmentWorkflowSchema = z.object({
  workflow_id: z.string().min(1, 'Workflow ID is required')
});

export async function checkAssessmentWorkflowStatus(params: { workflow_id: string }): Promise<AssessmentWorkflowStatus> {
  const db = getDatabase();
  
  try {
    const validatedParams = CheckAssessmentWorkflowSchema.parse(params);
    
    // Get workflow status from database
    const workflow = db.getAssessmentWorkflow(validatedParams.workflow_id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${validatedParams.workflow_id}`);
    }
    
    // Get organization details
    const organization = db.getOrganization(workflow.org_id as string);
    if (!organization) {
      throw new Error(`Organization not found: ${workflow.org_id}`);
    }
    
    // Calculate progress
    const progress = await calculateWorkflowProgress(workflow as WorkflowRecord);
    
    // Determine next action
    const nextAction = determineNextAction(workflow as WorkflowRecord, progress, organization);
    
    return {
      success: true,
      workflow_id: workflow.workflow_id as string,
      profile_id: workflow.profile_id as string,
      state: workflow.state as AssessmentWorkflowStateType,
      progress,
      next_action: nextAction,
      organization: {
        org_id: organization.org_id as string,
        org_name: organization.org_name as string,
        sector: organization.industry as string,
        size: organization.size as string
      },
      timeline: workflow.started_at ? {
        started_at: workflow.started_at as string,
        estimated_completion: (workflow.estimated_completion as string) || '',
        time_remaining_weeks: calculateTimeRemaining(workflow.started_at as string, workflow.timeline_weeks as number)
      } : undefined
    };
    
  } catch (error) {
    logger.error('Failed to check workflow status', error);
    
    return {
      success: false,
      workflow_id: params.workflow_id,
      profile_id: '',
      state: 'not_started',
      progress: {
        current_step: 0,
        total_steps: 0,
        questions_answered: 0,
        questions_remaining: 0,
        completion_percentage: 0
      },
      next_action: {
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      },
      organization: {
        org_id: '',
        org_name: '',
        sector: '',
        size: ''
      }
    };
  }
}

// Helper functions
function generateWorkflowId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `workflow-${timestamp}-${random}`;
}

function generateOrgId(orgName: string): string {
  const base = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);
  
  const suffix = Math.random().toString(36).substring(2, 6);
  return `org-${base}-${suffix}`;
}

function generateProfileId(orgId: string, profileType: string): string {
  const timestamp = Date.now().toString(36);
  return `${orgId}-${profileType}-${timestamp}`;
}

async function calculateTotalQuestions(
  scope: string,
  targetFunctions?: string[]
): Promise<number> {
  if (scope === 'full') {
    return 424; // All CSF subcategories × 4 questions each
  }
  
  if (scope === 'specific_functions' && targetFunctions) {
    // Estimate questions per function
    const questionsPerFunction = Math.floor(424 / 6); // Roughly 70 questions per function
    return targetFunctions.length * questionsPerFunction;
  }
  
  return 424; // Default to full assessment
}

async function calculateWorkflowProgress(workflow: WorkflowRecord): Promise<ProgressData> {
  const db = getDatabase();
  
  // Get answered questions count
  const answeredQuestions = db.getAnsweredQuestionsCount(workflow.profile_id);
  const totalQuestions = await calculateTotalQuestions(
    workflow.assessment_scope,
    workflow.target_functions ? JSON.parse(workflow.target_functions) : undefined
  );
  
  const completionPercentage = totalQuestions > 0 
    ? Math.round((answeredQuestions / totalQuestions) * 100)
    : 0;
  
  // Determine current step based on state
  let currentStep = 1;
  switch (workflow.state) {
    case 'organization_setup': currentStep = 1; break;
    case 'questions_ready': currentStep = 2; break;
    case 'in_progress': currentStep = 3; break;
    case 'completed': currentStep = 4; break;
    case 'validated': currentStep = 5; break;
  }
  
  return {
    current_step: currentStep,
    total_steps: 5,
    questions_answered: answeredQuestions,
    questions_remaining: totalQuestions - answeredQuestions,
    completion_percentage: completionPercentage
  };
}

function determineNextAction(workflow: WorkflowRecord, progress: ProgressData, organization?: any): NextActionData {
  switch (workflow.state) {
    case 'organization_setup':
      return {
        description: 'Ready to begin assessment. Use get_assessment_questions to retrieve questions.',
        tool_to_use: 'get_assessment_questions',
        required_data: {
          assessment_type: 'detailed',
          parameters: {
            assessment_type: 'detailed',
            organization_size: organization?.size
          }
        }
      };
      
    case 'questions_ready':
      return {
        description: 'Questions are ready. Begin answering assessment questions using validate_assessment_responses.',
        tool_to_use: 'validate_assessment_responses',
        required_data: {
          profile_id: workflow.profile_id,
          responses: 'Submit your responses to the assessment questions'
        }
      };
      
    case 'in_progress':
      return {
        description: `Continue assessment - ${progress.questions_remaining} questions remaining (${progress.completion_percentage}% complete).`,
        tool_to_use: 'validate_assessment_responses',
        required_data: {
          profile_id: workflow.profile_id,
          responses: 'Continue submitting responses to assessment questions'
        }
      };
      
    case 'completed':
      return {
        description: 'Assessment complete! You can now run maturity analysis, gap analysis, and generate reports.',
        tool_to_use: 'assess_maturity',
        required_data: {
          profile_id: workflow.profile_id
        }
      };
      
    case 'validated':
      return {
        description: 'Assessment validated and complete. All analysis tools are now available.',
        tool_to_use: 'generate_report'
      };
      
    default:
      return {
        description: 'Assessment workflow state unknown. Please start a new assessment.',
        tool_to_use: 'start_assessment_workflow'
      };
  }
}

function calculateTimeRemaining(startedAt: string, timelineWeeks: number): number {
  const startDate = new Date(startedAt);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (timelineWeeks * 7));
  
  const now = new Date();
  const remainingMs = endDate.getTime() - now.getTime();
  const remainingWeeks = Math.ceil(remainingMs / (7 * 24 * 60 * 60 * 1000));
  
  return Math.max(0, remainingWeeks);
}

// ============================================================================
// TOOL EXPORTS
// ============================================================================

export const startAssessmentWorkflowTool = {
  name: 'start_assessment_workflow',
  description: 'Start a comprehensive NIST CSF 2.0 assessment workflow with authentic data collection. Prevents fake data generation and ensures real organizational responses.',
  inputSchema: {
    type: 'object',
    properties: {
      org_name: { 
        type: 'string', 
        description: 'Organization name (required)' 
      },
      sector: { 
        type: 'string', 
        description: 'Industry sector (required)' 
      },
      size: { 
        type: 'string', 
        enum: ['small', 'medium', 'large', 'enterprise'],
        description: 'Organization size (required)' 
      },
      contact_name: { 
        type: 'string', 
        description: 'Contact person name (required)' 
      },
      contact_email: { 
        type: 'string', 
        description: 'Contact email address (required)' 
      },
      description: { 
        type: 'string', 
        description: 'Optional organization description' 
      },
      assessment_scope: { 
        type: 'string', 
        enum: ['full', 'specific_functions'],
        description: 'Assessment scope - full framework or specific functions',
        default: 'full'
      },
      target_functions: { 
        type: 'array',
        items: {
          type: 'string',
          enum: ['GV', 'ID', 'PR', 'DE', 'RS', 'RC']
        },
        description: 'Target functions for specific_functions scope (optional)' 
      },
      timeline_weeks: { 
        type: 'number',
        minimum: 1,
        maximum: 52,
        description: 'Expected timeline in weeks (1-52)',
        default: 8
      }
    },
    required: ['org_name', 'sector', 'size', 'contact_name', 'contact_email']
  }
};

export const checkAssessmentWorkflowStatusTool = {
  name: 'check_assessment_workflow_status',
  description: 'Monitor and track assessment workflow progress with detailed status reporting. Provides comprehensive status updates on assessment workflows.',
  inputSchema: {
    type: 'object',
    properties: {
      workflow_id: { 
        type: 'string', 
        description: 'Workflow ID to check status for (required)' 
      }
    },
    required: ['workflow_id']
  }
};