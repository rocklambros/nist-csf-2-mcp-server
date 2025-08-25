/**
 * Generate milestone for cybersecurity implementation progress
 */

import { Tool } from '../types/index.js';
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

interface GenerateMilestoneParams {
  profile_id: string;
  milestone_type: 'assessment' | 'implementation' | 'review' | 'audit' | 'custom';
  target_date: string;
  title?: string;
  description?: string;
  subcategory_ids?: string[];
  function_filter?: string;
  priority_level?: 'low' | 'medium' | 'high' | 'critical';
  assigned_to?: string;
  dependencies?: string[];
  success_criteria?: string[];
  estimated_effort_hours?: number;
  budget_estimate?: number;
  stakeholders?: string[];
  deliverables?: Array<{
    name: string;
    description: string;
    due_date: string;
    status?: 'not_started' | 'in_progress' | 'completed';
  }>;
}

interface GenerateMilestoneResponse {
  success: boolean;
  milestone?: {
    milestone_id: string;
    profile_id: string;
    milestone_type: string;
    title: string;
    description: string;
    target_date: string;
    priority_level: string;
    assigned_to?: string;
    status: 'planned' | 'in_progress' | 'completed' | 'overdue';
    progress_percentage: number;
    dependencies?: string[];
    success_criteria?: string[];
    estimated_effort_hours?: number;
    budget_estimate?: number;
    stakeholders?: string[];
    deliverables?: any[];
    subcategory_scope?: string[];
    function_scope?: string;
    created_date: string;
    last_updated: string;
  };
  error?: string;
  message?: string;
}

function validateParams(params: GenerateMilestoneParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.profile_id) errors.push('profile_id is required');
  if (!params.milestone_type) errors.push('milestone_type is required');
  if (!params.target_date) errors.push('target_date is required');

  const validTypes = ['assessment', 'implementation', 'review', 'audit', 'custom'];
  if (!validTypes.includes(params.milestone_type)) {
    errors.push('Invalid milestone_type');
  }

  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (params.priority_level && !validPriorities.includes(params.priority_level)) {
    errors.push('Invalid priority_level');
  }

  // Validate date format
  if (params.target_date && isNaN(Date.parse(params.target_date))) {
    errors.push('Invalid target_date format');
  }

  return { isValid: errors.length === 0, errors };
}

async function generateMilestone(params: GenerateMilestoneParams, db: Database): Promise<GenerateMilestoneResponse> {
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

    const milestoneId = uuidv4();
    const createdDate = new Date().toISOString();

    // Generate default title and description based on type
    const defaultTitles = {
      assessment: 'Cybersecurity Assessment Milestone',
      implementation: 'Implementation Milestone',
      review: 'Security Review Milestone',
      audit: 'Audit Milestone',
      custom: 'Custom Security Milestone'
    };

    const defaultDescriptions = {
      assessment: 'Complete cybersecurity assessment for selected controls',
      implementation: 'Implement cybersecurity controls and measures',
      review: 'Review and validate security implementations',
      audit: 'Conduct security audit and compliance verification',
      custom: 'Custom cybersecurity milestone'
    };

    const title = params.title || defaultTitles[params.milestone_type];
    const description = params.description || defaultDescriptions[params.milestone_type];
    const priorityLevel = params.priority_level || 'medium';

    // Determine subcategory scope based on function filter or explicit list
    let subcategoryScope: string[] = [];
    if (params.subcategory_ids && params.subcategory_ids.length > 0) {
      subcategoryScope = params.subcategory_ids;
    } else if (params.function_filter) {
      const subcategories = db.prepare(`
        SELECT id FROM subcategories 
        WHERE id LIKE ?
      `).all(`${params.function_filter}.%`);
      subcategoryScope = subcategories.map((s: any) => s.id);
    }

    // Generate default deliverables based on milestone type
    let deliverables = params.deliverables || [] as any[];
    if (deliverables.length === 0) {
      deliverables = generateDefaultDeliverables(params.milestone_type, params.target_date);
    }

    // Create milestone record
    const insertStmt = db.prepare(`
      INSERT INTO milestones (
        milestone_id, profile_id, milestone_type, title, description, target_date,
        priority_level, assigned_to, status, progress_percentage, dependencies,
        success_criteria, estimated_effort_hours, budget_estimate, stakeholders,
        deliverables, subcategory_scope, function_scope, created_date, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertResult = insertStmt.run(
      milestoneId,
      params.profile_id,
      params.milestone_type,
      title,
      description,
      params.target_date,
      priorityLevel,
      params.assigned_to || null,
      'planned',
      0,
      params.dependencies ? JSON.stringify(params.dependencies) : null,
      params.success_criteria ? JSON.stringify(params.success_criteria) : null,
      params.estimated_effort_hours || null,
      params.budget_estimate || null,
      params.stakeholders ? JSON.stringify(params.stakeholders) : null,
      JSON.stringify(deliverables),
      subcategoryScope.length > 0 ? JSON.stringify(subcategoryScope) : null,
      params.function_filter || null,
      createdDate,
      createdDate
    );

    if (insertResult.changes === 0) {
      return {
        success: false,
        error: 'DatabaseError',
        message: 'Failed to create milestone'
      };
    }

    logger.info('Milestone generated successfully', { 
      milestone_id: milestoneId, 
      profile_id: params.profile_id,
      milestone_type: params.milestone_type
    });

    return {
      success: true,
      milestone: {
        milestone_id: milestoneId,
        profile_id: params.profile_id,
        milestone_type: params.milestone_type,
        title,
        description,
        target_date: params.target_date,
        priority_level: priorityLevel,
        assigned_to: params.assigned_to,
        status: 'planned',
        progress_percentage: 0,
        dependencies: params.dependencies,
        success_criteria: params.success_criteria,
        estimated_effort_hours: params.estimated_effort_hours,
        budget_estimate: params.budget_estimate,
        stakeholders: params.stakeholders,
        deliverables,
        subcategory_scope: subcategoryScope.length > 0 ? subcategoryScope : undefined,
        function_scope: params.function_filter,
        created_date: createdDate,
        last_updated: createdDate
      }
    };

  } catch (error) {
    logger.error('Generate milestone error', error);
    return {
      success: false,
      error: 'InternalError',
      message: 'An error occurred while generating milestone'
    };
  }
}

function generateDefaultDeliverables(milestoneType: string, targetDate: string): any[] {
  const targetDateTime = new Date(targetDate);
  const oneWeekBefore = new Date(targetDateTime.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksBefore = new Date(targetDateTime.getTime() - 14 * 24 * 60 * 60 * 1000);

  const deliverableTemplates: Record<string, any[]> = {
    assessment: [
      {
        name: 'Assessment Planning Document',
        description: 'Define scope, methodology, and timeline for assessment',
        due_date: twoWeeksBefore.toISOString(),
        status: 'not_started'
      },
      {
        name: 'Assessment Execution',
        description: 'Conduct assessment interviews and evidence collection',
        due_date: oneWeekBefore.toISOString(),
        status: 'not_started'
      },
      {
        name: 'Assessment Report',
        description: 'Final assessment report with findings and recommendations',
        due_date: targetDate,
        status: 'not_started'
      }
    ],
    implementation: [
      {
        name: 'Implementation Plan',
        description: 'Detailed plan for implementing security controls',
        due_date: twoWeeksBefore.toISOString(),
        status: 'not_started'
      },
      {
        name: 'Control Implementation',
        description: 'Execute implementation of security controls',
        due_date: oneWeekBefore.toISOString(),
        status: 'not_started'
      },
      {
        name: 'Validation Testing',
        description: 'Test and validate implemented controls',
        due_date: targetDate,
        status: 'not_started'
      }
    ],
    review: [
      {
        name: 'Review Preparation',
        description: 'Gather documentation and evidence for review',
        due_date: oneWeekBefore.toISOString(),
        status: 'not_started'
      },
      {
        name: 'Security Review',
        description: 'Conduct comprehensive security review',
        due_date: targetDate,
        status: 'not_started'
      }
    ],
    audit: [
      {
        name: 'Audit Preparation',
        description: 'Prepare audit documentation and evidence',
        due_date: twoWeeksBefore.toISOString(),
        status: 'not_started'
      },
      {
        name: 'Audit Execution',
        description: 'Conduct audit procedures and testing',
        due_date: oneWeekBefore.toISOString(),
        status: 'not_started'
      },
      {
        name: 'Audit Report',
        description: 'Finalize audit report with findings',
        due_date: targetDate,
        status: 'not_started'
      }
    ],
    custom: [
      {
        name: 'Milestone Completion',
        description: 'Complete custom milestone objectives',
        due_date: targetDate,
        status: 'not_started'
      }
    ]
  };

  return deliverableTemplates[milestoneType] || deliverableTemplates.custom || [];
}

export const generateMilestoneTool: Tool = {
  name: 'generate_milestone',
  description: 'Generate milestones for cybersecurity implementation progress',
  inputSchema: {
    type: 'object',
    properties: {
      profile_id: {
        type: 'string',
        description: 'ID of the profile'
      },
      milestone_type: {
        type: 'string',
        enum: ['assessment', 'implementation', 'review', 'audit', 'custom'],
        description: 'Type of milestone to generate'
      },
      target_date: {
        type: 'string',
        description: 'Target completion date (ISO 8601 format)'
      },
      title: {
        type: 'string',
        description: 'Custom title for the milestone'
      },
      description: {
        type: 'string',
        description: 'Description of the milestone'
      },
      subcategory_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific subcategory IDs to include in milestone scope'
      },
      function_filter: {
        type: 'string',
        description: 'CSF function to filter scope (GV, ID, PR, DE, RS, RC)'
      },
      priority_level: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        description: 'Priority level of the milestone'
      },
      assigned_to: {
        type: 'string',
        description: 'Person or team assigned to the milestone'
      },
      dependencies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Other milestone IDs this depends on'
      },
      success_criteria: {
        type: 'array',
        items: { type: 'string' },
        description: 'Criteria for successful milestone completion'
      },
      estimated_effort_hours: {
        type: 'number',
        description: 'Estimated effort in hours'
      },
      budget_estimate: {
        type: 'number',
        description: 'Budget estimate for the milestone'
      },
      stakeholders: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key stakeholders for the milestone'
      },
      deliverables: {
        type: 'array',
        description: 'Specific deliverables for the milestone'
      }
    },
    required: ['profile_id', 'milestone_type', 'target_date']
  }
};

export { generateMilestone };