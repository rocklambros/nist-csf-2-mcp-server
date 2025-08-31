/**
 * Quick Assessment Tool - Simplified assessment questionnaire
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';

// Input schema for the tool - now supports both interactive and pre-answered modes
export const QuickAssessmentSchema = z.object({
  profile_id: z.string().min(1),
  // Make simplified_answers optional to enable interactive mode
  simplified_answers: z.object({
    govern: z.enum(['yes', 'no', 'partial']),
    identify: z.enum(['yes', 'no', 'partial']),
    protect: z.enum(['yes', 'no', 'partial']),
    detect: z.enum(['yes', 'no', 'partial']),
    respond: z.enum(['yes', 'no', 'partial']),
    recover: z.enum(['yes', 'no', 'partial'])
  }).optional(),
  assessed_by: z.string().optional(),
  confidence_level: z.enum(['low', 'medium', 'high']).default('medium'),
  notes: z.object({
    govern: z.string().optional(),
    identify: z.string().optional(),
    protect: z.string().optional(),
    detect: z.string().optional(),
    respond: z.string().optional(),
    recover: z.string().optional()
  }).optional(),
  // Add interactive mode flag
  interactive: z.boolean().default(true)
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
  // Add interactive questioning support
  requires_input?: boolean;
  questions?: Array<{
    function: string;
    function_name: string;
    question: string;
    examples: string[];
    valid_answers: string[];
  }>;
  // Keep existing structure for completed assessments
  initial_maturity_scores?: {
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
  // Add next steps guidance
  next_steps?: string;
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

// Interactive assessment questions for each function
const ASSESSMENT_QUESTIONS = {
  govern: {
    function_name: "GOVERN (GV)",
    question: "Does your organization have established cybersecurity governance, policies, and risk management processes in place?",
    examples: [
      "✅ YES: We have documented cybersecurity policies, assigned roles/responsibilities, and regular risk assessments",
      "🔄 PARTIAL: We have some policies and processes but they're not comprehensive or consistently applied", 
      "❌ NO: We lack formal cybersecurity governance, policies, or risk management processes"
    ]
  },
  identify: {
    function_name: "IDENTIFY (ID)",
    question: "Has your organization identified and documented its assets, business environment, vulnerabilities, and threats?",
    examples: [
      "✅ YES: We have comprehensive asset inventories, vulnerability assessments, and threat intelligence",
      "🔄 PARTIAL: We know most of our assets and some vulnerabilities but documentation is incomplete",
      "❌ NO: We lack visibility into our assets, vulnerabilities, or threat landscape"
    ]
  },
  protect: {
    function_name: "PROTECT (PR)", 
    question: "Are appropriate safeguards in place to ensure delivery of critical infrastructure services and protect against cybersecurity events?",
    examples: [
      "✅ YES: We have strong access controls, data protection, security training, and protective technologies",
      "🔄 PARTIAL: We have basic protections but gaps exist in access control, training, or technology",
      "❌ NO: We have minimal cybersecurity protections and significant security gaps"
    ]
  },
  detect: {
    function_name: "DETECT (DE)",
    question: "Do you have appropriate activities and technologies to identify cybersecurity events in a timely manner?",
    examples: [
      "✅ YES: We have comprehensive monitoring, logging, and detection capabilities with trained staff",
      "🔄 PARTIAL: We have some monitoring and logging but limited detection capabilities or coverage",
      "❌ NO: We have minimal monitoring and would struggle to detect cybersecurity incidents"
    ]
  },
  respond: {
    function_name: "RESPOND (RS)",
    question: "Are appropriate activities in place to take action regarding detected cybersecurity incidents?",
    examples: [
      "✅ YES: We have tested incident response plans, trained teams, and established communication procedures",
      "🔄 PARTIAL: We have basic incident response procedures but limited testing or training",
      "❌ NO: We lack formal incident response capabilities or procedures"
    ]
  },
  recover: {
    function_name: "RECOVER (RC)",
    question: "Are appropriate activities in place to maintain plans for resilience and restore services impaired by cybersecurity incidents?",
    examples: [
      "✅ YES: We have tested recovery plans, backup systems, and business continuity procedures",
      "🔄 PARTIAL: We have some recovery capabilities but limited testing or incomplete coverage",
      "❌ NO: We lack comprehensive recovery and business continuity plans"
    ]
  }
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
        message: `Profile not found: ${params.profile_id}`
      };
    }
    
    // INTERACTIVE MODE: If no answers provided, present questions
    if (!params.simplified_answers && params.interactive !== false) {
      return {
        success: true,
        profile_id: params.profile_id,
        message: `Ready to begin quick assessment for profile: ${profile.profile_name}`,
        requires_input: true,
        questions: Object.entries(ASSESSMENT_QUESTIONS).map(([key, data]) => ({
          function: key,
          function_name: data.function_name,
          question: data.question,
          examples: data.examples,
          valid_answers: ['yes', 'partial', 'no']
        })),
        next_steps: `Please provide your answers using the quick_assessment tool again with the 'simplified_answers' parameter. For each function (govern, identify, protect, detect, respond, recover), answer 'yes', 'partial', or 'no' based on the questions above.

Example:
{
  "profile_id": "${params.profile_id}",
  "simplified_answers": {
    "govern": "partial",
    "identify": "yes", 
    "protect": "partial",
    "detect": "no",
    "respond": "partial",
    "recover": "no"
  },
  "assessed_by": "Your Name",
  "confidence_level": "medium"
}`
      };
    }

    // VALIDATION: Ensure we have answers
    if (!params.simplified_answers) {
      return {
        success: false,
        profile_id: params.profile_id,
        message: "Assessment answers are required. Please provide simplified_answers or use interactive mode."
      };
    }
    
    // ASSESSMENT PROCESSING: Generate assessments for all subcategories based on provided answers
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
      message: `Quick assessment completed successfully for profile: ${profile.profile_name}. Assessment based on your responses to ${Object.keys(params.simplified_answers).length} framework functions.`,
      initial_maturity_scores: maturityScores,
      details: result,
      next_steps: "You can now use generate_gap_analysis, generate_report, or other analysis tools to review your assessment results."
    };
    
  } catch (error) {
    logger.error('Quick assessment error:', error);
    
    return {
      success: false,
      profile_id: params.profile_id,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
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