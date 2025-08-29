import { z } from 'zod';
import { Tool } from '../types';
import { getDatabase } from '../db/database.js';
import { logger } from '../utils/enhanced-logger';

const ResetOrganizationalDataSchema = z.object({
  confirmation: z.literal('CONFIRM_RESET_ALL_ORGANIZATIONAL_DATA').describe('Must be exactly "CONFIRM_RESET_ALL_ORGANIZATIONAL_DATA" to proceed')
});

/**
 * Reset organizational data - removes all organization profiles, assessments, and related data
 * while preserving NIST CSF framework data, questions, and baseline information
 */
export async function resetOrganizationalData(params: unknown): Promise<any> {
  try {
    // Validate confirmation parameter
    ResetOrganizationalDataSchema.parse(params);
    
    const db = getDatabase();
    
    logger.info('Starting organizational data reset operation', {
      operation: 'reset_organizational_data',
      timestamp: new Date().toISOString()
    });

    // Count existing data before deletion for reporting
    const beforeCounts = {
      organizations: db.prepare('SELECT COUNT(*) as count FROM organization_profiles').get() as { count: number },
      profiles: db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number },
      assessments: db.prepare('SELECT COUNT(*) as count FROM profile_assessments').get() as { count: number },
      gapAnalyses: db.prepare('SELECT COUNT(*) as count FROM gap_analyses').get() as { count: number },
      priorityMatrices: db.prepare('SELECT COUNT(*) as count FROM priority_matrices').get() as { count: number },
      implementationPlans: db.prepare('SELECT COUNT(*) as count FROM implementation_plans').get() as { count: number },
      costEstimates: db.prepare('SELECT COUNT(*) as count FROM cost_estimates').get() as { count: number },
      milestones: db.prepare('SELECT COUNT(*) as count FROM milestones').get() as { count: number },
      auditTrail: db.prepare('SELECT COUNT(*) as count FROM audit_trail').get() as { count: number },
      reports: db.prepare('SELECT COUNT(*) as count FROM reports').get() as { count: number },
      evidence: db.prepare('SELECT COUNT(*) as count FROM evidence').get() as { count: number },
      questionResponses: db.prepare('SELECT COUNT(*) as count FROM question_responses').get() as { count: number }
    };

    // Execute deletion in transaction to ensure atomicity
    const deleteResult = db.transaction(() => {
      // Delete in proper order to respect foreign key constraints
      
      // 1. Delete question responses (references profiles)
      const deletedQuestionResponses = db.prepare('DELETE FROM question_responses').run();
      
      // 2. Delete evidence (references profile_assessments)
      const deletedEvidence = db.prepare('DELETE FROM evidence').run();
      
      // 3. Delete reports (references profiles/organizations)
      const deletedReports = db.prepare('DELETE FROM reports').run();
      
      // 4. Delete audit trail (references profiles/organizations)
      const deletedAuditTrail = db.prepare('DELETE FROM audit_trail').run();
      
      // 5. Delete milestones (references profiles)
      const deletedMilestones = db.prepare('DELETE FROM milestones').run();
      
      // 6. Delete cost estimates (references profiles)
      const deletedCostEstimates = db.prepare('DELETE FROM cost_estimates').run();
      
      // 7. Delete implementation plans (references profiles)
      const deletedImplementationPlans = db.prepare('DELETE FROM implementation_plans').run();
      
      // 8. Delete priority matrices (references profiles)
      const deletedPriorityMatrices = db.prepare('DELETE FROM priority_matrices').run();
      
      // 9. Delete gap analyses (references profiles)
      const deletedGapAnalyses = db.prepare('DELETE FROM gap_analyses').run();
      
      // 10. Delete profile assessments (references profiles)
      const deletedAssessments = db.prepare('DELETE FROM profile_assessments').run();
      
      // 11. Delete profiles (references organization_profiles)
      const deletedProfiles = db.prepare('DELETE FROM profiles').run();
      
      // 12. Delete organization profiles (root organizational data)
      const deletedOrganizations = db.prepare('DELETE FROM organization_profiles').run();

      return {
        questionResponses: deletedQuestionResponses.changes,
        evidence: deletedEvidence.changes,
        reports: deletedReports.changes,
        auditTrail: deletedAuditTrail.changes,
        milestones: deletedMilestones.changes,
        costEstimates: deletedCostEstimates.changes,
        implementationPlans: deletedImplementationPlans.changes,
        priorityMatrices: deletedPriorityMatrices.changes,
        gapAnalyses: deletedGapAnalyses.changes,
        assessments: deletedAssessments.changes,
        profiles: deletedProfiles.changes,
        organizations: deletedOrganizations.changes
      };
    });

    // Verify framework data is still intact
    const frameworkVerification = {
      functions: db.prepare('SELECT COUNT(*) as count FROM functions').get() as { count: number },
      categories: db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number },
      subcategories: db.prepare('SELECT COUNT(*) as count FROM subcategories').get() as { count: number },
      implementationExamples: db.prepare('SELECT COUNT(*) as count FROM implementation_examples').get() as { count: number },
      questionBank: db.prepare('SELECT COUNT(*) as count FROM question_bank').get() as { count: number },
      questionOptions: db.prepare('SELECT COUNT(*) as count FROM question_options').get() as { count: number },
      questionExamples: db.prepare('SELECT COUNT(*) as count FROM question_examples').get() as { count: number },
      questionContext: db.prepare('SELECT COUNT(*) as count FROM question_context').get() as { count: number }
    };

    const summary = {
      operation: 'reset_organizational_data',
      status: 'completed',
      timestamp: new Date().toISOString(),
      deleted_records: {
        organizations: deleteResult.organizations,
        profiles: deleteResult.profiles,
        assessments: deleteResult.assessments,
        gap_analyses: deleteResult.gapAnalyses,
        priority_matrices: deleteResult.priorityMatrices,
        implementation_plans: deleteResult.implementationPlans,
        cost_estimates: deleteResult.costEstimates,
        milestones: deleteResult.milestones,
        audit_trail: deleteResult.auditTrail,
        reports: deleteResult.reports,
        evidence: deleteResult.evidence,
        question_responses: deleteResult.questionResponses,
        total: Object.values(deleteResult).reduce((sum, count) => sum + (count as number), 0) as number
      },
      before_counts: beforeCounts,
      framework_data_preserved: {
        functions: frameworkVerification.functions.count,
        categories: frameworkVerification.categories.count,
        subcategories: frameworkVerification.subcategories.count,
        implementation_examples: frameworkVerification.implementationExamples.count,
        question_bank: frameworkVerification.questionBank.count,
        question_options: frameworkVerification.questionOptions.count,
        question_examples: frameworkVerification.questionExamples.count,
        question_context: frameworkVerification.questionContext.count
      },
      warnings: [
        'All organizational profiles have been permanently deleted',
        'All assessment data has been permanently deleted', 
        'All reports and analyses have been permanently deleted',
        'This action cannot be undone',
        'NIST CSF framework data and question bank remain intact'
      ]
    };

    logger.warn('Organizational data reset completed', {
      operation: 'reset_organizational_data',
      deleted_records: summary.deleted_records,
      framework_preserved: summary.framework_data_preserved
    });

    return {
      success: true,
      data: summary
    };

  } catch (error) {
    logger.error('Failed to reset organizational data', { 
      operation: 'reset_organizational_data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset organizational data'
    };
  }
}

export const resetOrganizationalDataTool: Tool = {
  name: 'reset_organizational_data',
  description: 'DESTRUCTIVE: Permanently removes ALL organizational profiles, assessments, and related data. Preserves NIST CSF framework data, questions, and baseline information. Requires explicit confirmation.',
  inputSchema: {
    type: 'object',
    properties: {
      confirmation: {
        type: 'string',
        enum: ['CONFIRM_RESET_ALL_ORGANIZATIONAL_DATA'],
        description: 'REQUIRED: Must be exactly "CONFIRM_RESET_ALL_ORGANIZATIONAL_DATA" to proceed with deletion'
      }
    },
    required: ['confirmation']
  }
};