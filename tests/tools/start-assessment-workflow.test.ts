/**
 * Comprehensive tests for Start Assessment Workflow tool - Assessment orchestration
 */

import { startAssessmentWorkflow } from '../../src/tools/comprehensive_assessment_workflow.js';
import { getDatabase, closeDatabase } from '../../src/db/database.js';

describe('Start Assessment Workflow Tool', () => {
  let db: any;

  beforeAll(() => {
    db = getDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  beforeEach(() => {
    // Clean up test data before each test
    try {
      db.prepare('DELETE FROM assessment_workflows WHERE org_name LIKE ?').run('%test%');
      db.prepare('DELETE FROM profiles WHERE profile_name LIKE ?').run('%test%');
      db.prepare('DELETE FROM organization_profiles WHERE org_name LIKE ?').run('%test%');
    } catch (error) {
      // Tables might not exist yet, ignore
    }
  });

  describe('Basic Workflow Creation', () => {
    test('should create assessment workflow successfully', async () => {
      const params = {
        org_name: 'Test Assessment Org',
        sector: 'Technology',
        size: 'medium' as const,
        contact_name: 'John Doe',
        contact_email: 'john@testorg.com',
        description: 'Test organization for workflow validation'
      };

      const result = await startAssessmentWorkflow(params);
      
      expect(result.success).toBe(true);
      expect(result.workflow_id).toBeDefined();
      expect(result.profile_id).toBeDefined();
      expect(result.state).toBe('organization_setup');
      expect(result.progress.current_step).toBe(1);
      expect(result.organization.org_name).toBe(params.org_name);
    });

    test('should handle all organization sizes', async () => {
      const sizes = ['small', 'medium', 'large', 'enterprise'] as const;
      
      for (const size of sizes) {
        const params = {
          org_name: `Test Org ${size}`,
          sector: 'Healthcare',
          size: size,
          contact_name: 'Test User',
          contact_email: 'test@example.com'
        };

        const result = await startAssessmentWorkflow(params);
        expect(result.success).toBe(true);
        expect(result.organization.size).toBe(size);
      }
    });
  });

  describe('Assessment Scope Configuration', () => {
    test('should create full scope assessment by default', async () => {
      const params = {
        org_name: 'Full Scope Test Org',
        sector: 'Financial Services',
        size: 'large' as const,
        contact_name: 'Jane Smith',
        contact_email: 'jane@fullscope.com'
      };

      const result = await startAssessmentWorkflow(params);
      
      expect(result.success).toBe(true);
      expect(result.assessment_scope).toBe('full');
      expect(result.progress.total_steps).toBe(5);
      expect(result.progress.questions_remaining).toBe(424); // Full question set
    });

    test('should create specific functions assessment', async () => {
      const params = {
        org_name: 'Specific Test Org',
        sector: 'Government',
        size: 'medium' as const,
        contact_name: 'Alex Johnson',
        contact_email: 'alex@gov.org',
        assessment_scope: 'specific_functions' as const,
        target_functions: ['GV', 'ID', 'PR'] as const
      };

      const result = await startAssessmentWorkflow(params);
      
      expect(result.success).toBe(true);
      expect(result.assessment_scope).toBe('specific_functions');
      expect(result.target_functions).toEqual(['GV', 'ID', 'PR']);
      expect(result.progress.questions_remaining).toBeLessThan(424);
    });
  });

  describe('Timeline Management', () => {
    test('should set default timeline correctly', async () => {
      const params = {
        org_name: 'Timeline Test Org',
        sector: 'Manufacturing',
        size: 'small' as const,
        contact_name: 'Chris Brown',
        contact_email: 'chris@manufacturing.com'
      };

      const result = await startAssessmentWorkflow(params);
      
      expect(result.success).toBe(true);
      expect(result.timeline.time_remaining_weeks).toBe(8); // Default
      expect(result.timeline.started_at).toBeDefined();
      expect(result.timeline.estimated_completion).toBeDefined();
    });

    test('should handle custom timeline', async () => {
      const params = {
        org_name: 'Custom Timeline Org',
        sector: 'Retail',
        size: 'medium' as const,
        contact_name: 'Sam Wilson',
        contact_email: 'sam@retail.com',
        timeline_weeks: 12
      };

      const result = await startAssessmentWorkflow(params);
      
      expect(result.success).toBe(true);
      expect(result.timeline.time_remaining_weeks).toBe(12);
    });

    test('should validate timeline boundaries', async () => {
      const invalidParams = {
        org_name: 'Invalid Timeline Org',
        sector: 'Technology',
        size: 'medium' as const,
        contact_name: 'Test User',
        contact_email: 'test@example.com',
        timeline_weeks: 100 // Invalid - exceeds max of 52
      };

      await expect(startAssessmentWorkflow(invalidParams)).rejects.toThrow();
    });
  });

  describe('Input Validation', () => {
    test('should require all mandatory fields', async () => {
      const incompleteParams = {
        org_name: 'Incomplete Org',
        sector: 'Technology',
        // Missing size, contact_name, contact_email
      };

      await expect(startAssessmentWorkflow(incompleteParams as any)).rejects.toThrow();
    });

    test('should validate email format', async () => {
      const params = {
        org_name: 'Email Test Org',
        sector: 'Technology',
        size: 'medium' as const,
        contact_name: 'Test User',
        contact_email: 'invalid-email-format'
      };

      await expect(startAssessmentWorkflow(params)).rejects.toThrow();
    });

    test('should validate organization size enum', async () => {
      const params = {
        org_name: 'Size Test Org',
        sector: 'Technology',
        size: 'invalid_size' as any,
        contact_name: 'Test User',
        contact_email: 'test@example.com'
      };

      await expect(startAssessmentWorkflow(params)).rejects.toThrow();
    });
  });

  describe('Workflow State Management', () => {
    test('should initialize workflow state correctly', async () => {
      const params = {
        org_name: 'State Test Org',
        sector: 'Energy',
        size: 'large' as const,
        contact_name: 'Morgan Davis',
        contact_email: 'morgan@energy.com'
      };

      const result = await startAssessmentWorkflow(params);
      
      expect(result.success).toBe(true);
      expect(result.state).toBe('organization_setup');
      expect(result.progress.current_step).toBe(1);
      expect(result.progress.questions_answered).toBe(0);
      expect(result.progress.completion_percentage).toBe(0);
    });

    test('should provide clear next action guidance', async () => {
      const params = {
        org_name: 'Next Action Test Org',
        sector: 'Healthcare',
        size: 'enterprise' as const,
        contact_name: 'Taylor Green',
        contact_email: 'taylor@healthcare.com'
      };

      const result = await startAssessmentWorkflow(params);
      
      expect(result.success).toBe(true);
      expect(result.next_action).toBeDefined();
      expect(result.next_action.description).toBeDefined();
      expect(result.next_action.tool_to_use).toBeDefined();
      expect(result.next_action.required_data).toBeDefined();
    });
  });

  describe('Data Persistence', () => {
    test('should persist workflow data in database', async () => {
      const params = {
        org_name: 'Persistence Test Org',
        sector: 'Government',
        size: 'medium' as const,
        contact_name: 'Jordan Lee',
        contact_email: 'jordan@gov.com'
      };

      const result = await startAssessmentWorkflow(params);
      expect(result.success).toBe(true);

      // Verify workflow was persisted
      const workflow = db.getAssessmentWorkflow(result.workflow_id);
      expect(workflow).toBeDefined();
      expect(workflow.workflow_id).toBe(result.workflow_id);
      expect(workflow.state).toBe('organization_setup');

      // Verify profile was created
      const profile = db.getProfile(result.profile_id);
      expect(profile).toBeDefined();
      expect(profile.profile_id).toBe(result.profile_id);
    });
  });

  describe('Response Structure Validation', () => {
    test('should return consistent response structure', async () => {
      const params = {
        org_name: 'Structure Test Org',
        sector: 'Technology',
        size: 'medium' as const,
        contact_name: 'Casey Jordan',
        contact_email: 'casey@tech.com'
      };

      const result = await startAssessmentWorkflow(params);
      
      expect(result).toMatchObject({
        success: expect.any(Boolean),
        workflow_id: expect.any(String),
        profile_id: expect.any(String),
        state: expect.any(String),
        progress: {
          current_step: expect.any(Number),
          total_steps: expect.any(Number),
          questions_answered: expect.any(Number),
          questions_remaining: expect.any(Number),
          completion_percentage: expect.any(Number)
        },
        organization: {
          org_id: expect.any(String),
          org_name: expect.any(String),
          sector: expect.any(String),
          size: expect.any(String)
        },
        timeline: {
          started_at: expect.any(String),
          estimated_completion: expect.any(String),
          time_remaining_weeks: expect.any(Number)
        },
        next_action: expect.any(Object)
      });
    });
  });
});