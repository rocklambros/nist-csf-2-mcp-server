/**
 * Quick Assessment Tool - Simplified assessment questionnaire
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';

// Input schema for the tool
export const QuickAssessmentSchema = z.object({
  profile_id: z.string().min(1),
  simplified_answers: z.object({
    govern: z.enum(['yes', 'no', 'partial']),
    identify: z.enum(['yes', 'no', 'partial']),
    protect: z.enum(['yes', 'no', 'partial']),
    detect: z.enum(['yes', 'no', 'partial']),
    respond: z.enum(['yes', 'no', 'partial']),
    recover: z.enum(['yes', 'no', 'partial'])
  }),
  assessed_by: z.string().optional(),
  confidence_level: z.enum(['low', 'medium', 'high']).default('medium'),
  notes: z.object({
    govern: z.string().optional(),
    identify: z.string().optional(),
    protect: z.string().optional(),
    detect: z.string().optional(),
    respond: z.string().optional(),
    recover: z.string().optional()
  }).optional()
});

export type QuickAssessmentParams = z.infer<typeof QuickAssessmentSchema>;

interface MaturityMapping {
  yes: {
    score: number;
    implementation: 'largely_implemented' | 'fully_implemented';
  };
  partial: {
    score: number;
    implementation: 'partially_implemented' | 'largely_implemented';
  };
  no: {
    score: number;
    implementation: 'not_implemented' | 'partially_implemented';
  };
}

interface QuickAssessmentResult {
  success: boolean;
  profile_id: string;
  message: string;
  initial_maturity_scores: {
    govern: number;
    identify: number;
    protect: number;
    detect: number;
    respond: number;
    recover: number;
    overall_average: number;
  };
  details?: {
    assessmentsCreated: number;
    subcategoriesAssessed: string[];
    functionSummaries: Array<{
      function: string;
      average_score: number;
      subcategory_count: number;
    }>;
  };
}

// Maturity mappings for each function based on simplified answers
const MATURITY_MAPPINGS: Record<string, MaturityMapping> = {
  govern: {
    yes: { score: 4, implementation: 'fully_implemented' },
    partial: { score: 2, implementation: 'partially_implemented' },
    no: { score: 0, implementation: 'not_implemented' }
  },
  identify: {
    yes: { score: 4, implementation: 'fully_implemented' },
    partial: { score: 2, implementation: 'partially_implemented' },
    no: { score: 0, implementation: 'not_implemented' }
  },
  protect: {
    yes: { score: 3, implementation: 'largely_implemented' },
    partial: { score: 2, implementation: 'partially_implemented' },
    no: { score: 1, implementation: 'partially_implemented' }
  },
  detect: {
    yes: { score: 3, implementation: 'largely_implemented' },
    partial: { score: 1, implementation: 'partially_implemented' },
    no: { score: 0, implementation: 'not_implemented' }
  },
  respond: {
    yes: { score: 3, implementation: 'largely_implemented' },
    partial: { score: 1, implementation: 'partially_implemented' },
    no: { score: 0, implementation: 'not_implemented' }
  },
  recover: {
    yes: { score: 3, implementation: 'largely_implemented' },
    partial: { score: 1, implementation: 'partially_implemented' },
    no: { score: 0, implementation: 'not_implemented' }
  }
};

// CSF Function ID mapping
const FUNCTION_ID_MAP: Record<string, string> = {
  govern: 'GV',
  identify: 'ID',
  protect: 'PR',
  detect: 'DE',
  respond: 'RS',
  recover: 'RC'
};

/**
 * Main function to perform quick assessment
 */
export async function quickAssessment(params: QuickAssessmentParams): Promise<QuickAssessmentResult> {
  const db = getDatabase();
  const framework = getFrameworkLoader();
  
  try {
    // Ensure framework is loaded
    if (!framework.isLoaded()) {
      await framework.load();
    }
    
    // Verify profile exists
    const profile = db.getProfile(params.profile_id);
    if (!profile) {
      return {
        success: false,
        profile_id: params.profile_id,
        message: `Profile not found: ${params.profile_id}`,
        initial_maturity_scores: {
          govern: 0, identify: 0, protect: 0, detect: 0, respond: 0, recover: 0, overall_average: 0
        }
      };
    }
    
    // Generate assessments for all subcategories based on simplified answers
    const assessments = generateAssessments(
      framework,
      params.simplified_answers,
      params.confidence_level,
      params.assessed_by,
      params.notes
    );
    
    // Store assessments in database using transaction
    const result = db.transaction(() => {
      // Bulk insert all assessments
      db.createBulkAssessments(params.profile_id, assessments);
      
      // Calculate summary statistics
      const functionSummaries = calculateFunctionSummaries(assessments);
      
      return {
        assessmentsCreated: assessments.length,
        subcategoriesAssessed: assessments.map(a => a.subcategory_id),
        functionSummaries
      };
    });
    
    // Calculate initial maturity scores
    const maturityScores = calculateMaturityScores(params.simplified_answers);
    
    return {
      success: true,
      profile_id: params.profile_id,
      message: `Quick assessment completed successfully for profile: ${profile.profile_name}`,
      initial_maturity_scores: maturityScores,
      details: result
    };
    
  } catch (error) {
    logger.error('Quick assessment error:', error);
    
    return {
      success: false,
      profile_id: params.profile_id,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      initial_maturity_scores: {
        govern: 0, identify: 0, protect: 0, detect: 0, respond: 0, recover: 0, overall_average: 0
      }
    };
  }
}

/**
 * Generate assessments for all subcategories based on simplified answers
 */
function generateAssessments(
  framework: any,
  answers: QuickAssessmentParams['simplified_answers'],
  confidenceLevel: string,
  assessedBy?: string,
  notes?: any
): any[] {
  const assessments: any[] = [];
  
  // Get all subcategories from framework
  const allSubcategories = framework.getElementsByType('subcategory');
  
  for (const subcategory of allSubcategories) {
    // Extract function from subcategory ID (e.g., "GV.OC-01" -> "GV")
    const functionId = subcategory.element_identifier.split('.')[0];
    const functionKey = getFunctionKey(functionId);
    
    if (!functionKey || !answers[functionKey as keyof typeof answers]) {
      continue;
    }
    
    const answer = answers[functionKey as keyof typeof answers];
    const mapping = MATURITY_MAPPINGS[functionKey];
    if (!mapping) continue;
    const scoreInfo = mapping[answer];
    
    // Add some variance to scores based on subcategory specifics
    const variance = getSubcategoryVariance(subcategory.element_identifier);
    const adjustedScore = Math.max(0, Math.min(5, scoreInfo.score + variance));
    
    assessments.push({
      subcategory_id: subcategory.element_identifier,
      implementation_level: scoreInfo.implementation,
      maturity_score: adjustedScore,
      confidence_level: confidenceLevel,
      notes: notes?.[functionKey as keyof typeof notes] || 
        `Quick assessment - ${answer} implementation for ${functionKey}`,
      evidence: JSON.stringify({
        quick_assessment: true,
        function_answer: answer,
        assessed_at: new Date().toISOString()
      }),
      assessed_by: assessedBy || 'quick_assessment_tool'
    });
  }
  
  return assessments;
}

/**
 * Get function key from function ID
 */
function getFunctionKey(functionId: string): string | null {
  const reverseMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(FUNCTION_ID_MAP)) {
    reverseMap[value] = key;
  }
  return reverseMap[functionId] || null;
}

/**
 * Get variance for subcategory to add realism to scores
 */
function getSubcategoryVariance(subcategoryId: string): number {
  // Create deterministic variance based on subcategory ID
  const hash = subcategoryId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variance = (hash % 3) - 1; // Returns -1, 0, or 1
  return variance * 0.5; // Scale down to -0.5, 0, or 0.5
}

/**
 * Calculate function summaries from assessments
 */
function calculateFunctionSummaries(assessments: any[]): any[] {
  const functionGroups: Record<string, number[]> = {};
  
  for (const assessment of assessments) {
    const functionId = assessment.subcategory_id.split('.')[0];
    if (!functionGroups[functionId]) {
      functionGroups[functionId] = [];
    }
    functionGroups[functionId].push(assessment.maturity_score);
  }
  
  const summaries = [];
  for (const [functionId, scores] of Object.entries(functionGroups)) {
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    summaries.push({
      function: functionId,
      average_score: Math.round(average * 100) / 100,
      subcategory_count: scores.length
    });
  }
  
  return summaries;
}

/**
 * Calculate initial maturity scores from simplified answers
 */
function calculateMaturityScores(answers: QuickAssessmentParams['simplified_answers']): any {
  const scores: any = {};
  let total = 0;
  
  for (const [key, answer] of Object.entries(answers)) {
    const mapping = MATURITY_MAPPINGS[key];
    if (mapping) {
      scores[key] = mapping[answer].score;
      total += scores[key];
    }
  }
  
  scores.overall_average = Math.round((total / 6) * 100) / 100;
  
  return scores;
}