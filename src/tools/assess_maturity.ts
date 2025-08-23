/**
 * Assess Maturity Tool - Calculate maturity tier for each function
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';

// Input schema for the tool
export const AssessMaturitySchema = z.object({
  profile_id: z.string().min(1),
  include_recommendations: z.boolean().default(true),
  include_subcategory_details: z.boolean().default(false)
});

export type AssessMaturityParams = z.infer<typeof AssessMaturitySchema>;

interface FunctionMaturity {
  function_id: string;
  function_name: string;
  maturity_tier: 'Partial' | 'Risk-Informed' | 'Repeatable' | 'Adaptive';
  implementation_percentage: number;
  avg_maturity_score: number;
  min_maturity_score: number;
  max_maturity_score: number;
  total_subcategories: number;
  implemented_count: number;
  confidence_level: number;
  weak_areas?: string[];
  recommendations?: string[];
}

interface MaturityAssessmentResult {
  success: boolean;
  profile_id: string;
  overall_maturity_tier: string;
  overall_maturity_score: number;
  assessment_date: string;
  function_breakdown: FunctionMaturity[];
  statistics: {
    total_functions: number;
    functions_at_adaptive: number;
    functions_at_repeatable: number;
    functions_at_risk_informed: number;
    functions_at_partial: number;
    overall_implementation_percentage: number;
    weakest_function: string;
    strongest_function: string;
  };
  recommendations?: {
    immediate_priorities: string[];
    strategic_improvements: string[];
    quick_wins: string[];
  };
}

// Maturity tier definitions
const MATURITY_TIERS = {
  'Partial': {
    min: 0,
    max: 25,
    description: 'Ad-hoc, reactive approach with minimal formal processes',
    color: '#FF6B6B',
    recommendations: [
      'Establish basic cybersecurity policies and procedures',
      'Create an asset inventory',
      'Implement basic access controls',
      'Develop incident response plan'
    ]
  },
  'Risk-Informed': {
    min: 26,
    max: 50,
    description: 'Risk-aware with some formal processes and regular assessments',
    color: '#FFA500',
    recommendations: [
      'Implement risk assessment methodology',
      'Enhance monitoring capabilities',
      'Formalize security training program',
      'Establish metrics and KPIs'
    ]
  },
  'Repeatable': {
    min: 51,
    max: 75,
    description: 'Consistent, repeatable processes with regular improvements',
    color: '#FFD700',
    recommendations: [
      'Automate security processes',
      'Implement continuous monitoring',
      'Enhance threat intelligence',
      'Conduct regular tabletop exercises'
    ]
  },
  'Adaptive': {
    min: 76,
    max: 100,
    description: 'Advanced, adaptive security with continuous improvement',
    color: '#4CAF50',
    recommendations: [
      'Implement predictive analytics',
      'Enhance automation and orchestration',
      'Lead industry collaboration',
      'Pioneer emerging security practices'
    ]
  }
};

// Function names mapping
const FUNCTION_NAMES: Record<string, string> = {
  'GV': 'Govern',
  'ID': 'Identify', 
  'PR': 'Protect',
  'DE': 'Detect',
  'RS': 'Respond',
  'RC': 'Recover'
};

/**
 * Main function to assess maturity
 */
export async function assessMaturity(params: AssessMaturityParams): Promise<MaturityAssessmentResult> {
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
      return createErrorResult(params.profile_id, `Profile not found: ${params.profile_id}`);
    }
    
    // Get maturity data by function using complex SQL
    const functionMaturityData = db.getMaturityByFunction(params.profile_id);
    
    if (!functionMaturityData || functionMaturityData.length === 0) {
      return createErrorResult(params.profile_id, 'No assessment data found for this profile');
    }
    
    // Get comprehensive analysis for additional insights
    const comprehensiveAnalysis = db.getComprehensiveMaturityAnalysis(params.profile_id);
    
    // Process function breakdown
    const functionBreakdown = processFunctionMaturity(
      functionMaturityData,
      comprehensiveAnalysis,
      params.include_recommendations,
      params.include_subcategory_details
    );
    
    // Calculate overall metrics
    const overallMetrics = calculateOverallMetrics(functionBreakdown);
    
    // Generate recommendations if requested
    const recommendations = params.include_recommendations
      ? generateRecommendations(functionBreakdown, overallMetrics)
      : undefined;
    
    return {
      success: true,
      profile_id: params.profile_id,
      overall_maturity_tier: overallMetrics.overall_tier,
      overall_maturity_score: overallMetrics.overall_score,
      assessment_date: new Date().toISOString(),
      function_breakdown: functionBreakdown,
      statistics: {
        total_functions: functionBreakdown.length,
        functions_at_adaptive: functionBreakdown.filter(f => f.maturity_tier === 'Adaptive').length,
        functions_at_repeatable: functionBreakdown.filter(f => f.maturity_tier === 'Repeatable').length,
        functions_at_risk_informed: functionBreakdown.filter(f => f.maturity_tier === 'Risk-Informed').length,
        functions_at_partial: functionBreakdown.filter(f => f.maturity_tier === 'Partial').length,
        overall_implementation_percentage: overallMetrics.overall_implementation_percentage,
        weakest_function: overallMetrics.weakest_function,
        strongest_function: overallMetrics.strongest_function
      },
      recommendations
    };
    
  } catch (error) {
    logger.error('Assess maturity error:', error);
    return createErrorResult(
      params.profile_id,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * Process function maturity data
 */
function processFunctionMaturity(
  functionData: any[],
  comprehensiveData: any[],
  includeRecommendations: boolean,
  includeDetails: boolean
): FunctionMaturity[] {
  const results: FunctionMaturity[] = [];
  
  // Create a map of comprehensive data by function
  const comprehensiveMap = new Map();
  for (const item of comprehensiveData) {
    comprehensiveMap.set(item.function_id, item);
  }
  
  for (const func of functionData) {
    const comprehensive = comprehensiveMap.get(func.function_id);
    
    const functionMaturity: FunctionMaturity = {
      function_id: func.function_id,
      function_name: FUNCTION_NAMES[func.function_id] || func.function_id,
      maturity_tier: func.maturity_tier,
      implementation_percentage: func.implementation_percentage,
      avg_maturity_score: func.avg_maturity,
      min_maturity_score: func.min_maturity,
      max_maturity_score: func.max_maturity,
      total_subcategories: func.total_subcategories,
      implemented_count: func.implemented_count,
      confidence_level: func.avg_confidence
    };
    
    // Add weak areas if available
    if (comprehensive?.weak_subcategories && includeDetails) {
      functionMaturity.weak_areas = comprehensive.weak_subcategories
        ? comprehensive.weak_subcategories.split(',').filter(Boolean)
        : [];
    }
    
    // Add tier-specific recommendations
    if (includeRecommendations) {
      functionMaturity.recommendations = generateFunctionRecommendations(
        func.function_id,
        func.maturity_tier,
        func.implementation_percentage
      );
    }
    
    results.push(functionMaturity);
  }
  
  return results;
}

/**
 * Calculate overall metrics
 */
function calculateOverallMetrics(functionBreakdown: FunctionMaturity[]): any {
  const totalImplemented = functionBreakdown.reduce((sum, f) => sum + f.implemented_count, 0);
  const totalSubcategories = functionBreakdown.reduce((sum, f) => sum + f.total_subcategories, 0);
  const overallPercentage = (totalImplemented / totalSubcategories) * 100;
  
  const avgMaturity = functionBreakdown.reduce((sum, f) => sum + f.avg_maturity_score, 0) / functionBreakdown.length;
  
  // Determine overall tier
  let overallTier = 'Partial';
  if (overallPercentage > 75) overallTier = 'Adaptive';
  else if (overallPercentage > 50) overallTier = 'Repeatable';
  else if (overallPercentage > 25) overallTier = 'Risk-Informed';
  
  // Find weakest and strongest functions
  const sorted = [...functionBreakdown].sort((a, b) => a.implementation_percentage - b.implementation_percentage);
  
  return {
    overall_score: Math.round(avgMaturity * 100) / 100,
    overall_tier: overallTier,
    overall_implementation_percentage: Math.round(overallPercentage * 100) / 100,
    weakest_function: sorted[0]?.function_name || 'Unknown',
    strongest_function: sorted[sorted.length - 1]?.function_name || 'Unknown'
  };
}

/**
 * Generate recommendations based on assessment
 */
function generateRecommendations(
  functionBreakdown: FunctionMaturity[],
  overallMetrics: any
): any {
  const immediatePriorities: string[] = [];
  const strategicImprovements: string[] = [];
  const quickWins: string[] = [];
  
  // Identify functions needing immediate attention
  const weakFunctions = functionBreakdown.filter(f => f.maturity_tier === 'Partial');
  for (const func of weakFunctions) {
    immediatePriorities.push(
      `Urgent: Improve ${func.function_name} function (currently at ${func.implementation_percentage.toFixed(1)}%)`
    );
  }
  
  // Identify strategic improvements for mid-tier functions
  const midFunctions = functionBreakdown.filter(f => 
    f.maturity_tier === 'Risk-Informed' || f.maturity_tier === 'Repeatable'
  );
  for (const func of midFunctions) {
    if (func.max_maturity_score - func.min_maturity_score > 2) {
      strategicImprovements.push(
        `Standardize ${func.function_name} practices to reduce variation (current range: ${func.min_maturity_score}-${func.max_maturity_score})`
      );
    }
  }
  
  // Identify quick wins
  for (const func of functionBreakdown) {
    if (func.implementation_percentage >= 60 && func.implementation_percentage < 75) {
      quickWins.push(
        `${func.function_name} is close to next tier (${func.implementation_percentage.toFixed(1)}%) - small improvements will yield tier advancement`
      );
    }
  }
  
  // Add overall recommendations based on tier
  const tierRecs = MATURITY_TIERS[overallMetrics.overall_tier as keyof typeof MATURITY_TIERS];
  if (tierRecs) {
    strategicImprovements.push(...tierRecs.recommendations);
  }
  
  return {
    immediate_priorities: immediatePriorities.slice(0, 5),
    strategic_improvements: strategicImprovements.slice(0, 5),
    quick_wins: quickWins.slice(0, 3)
  };
}

/**
 * Generate function-specific recommendations
 */
function generateFunctionRecommendations(
  functionId: string,
  tier: string,
  percentage: number
): string[] {
  const recommendations: string[] = [];
  
  // Function-specific recommendations based on NIST CSF
  const functionRecs: Record<string, Record<string, string[]>> = {
    'GV': {
      'Partial': [
        'Establish organizational cybersecurity policy',
        'Define roles and responsibilities',
        'Create risk management strategy'
      ],
      'Risk-Informed': [
        'Implement supply chain risk management',
        'Enhance oversight mechanisms',
        'Develop performance metrics'
      ]
    },
    'ID': {
      'Partial': [
        'Create comprehensive asset inventory',
        'Document business environment',
        'Perform initial risk assessment'
      ],
      'Risk-Informed': [
        'Implement automated asset discovery',
        'Enhance vulnerability management',
        'Improve threat intelligence'
      ]
    },
    'PR': {
      'Partial': [
        'Implement basic access controls',
        'Establish data protection policies',
        'Create security awareness training'
      ],
      'Risk-Informed': [
        'Deploy advanced authentication',
        'Implement encryption standards',
        'Enhance protective technology'
      ]
    },
    'DE': {
      'Partial': [
        'Deploy basic monitoring tools',
        'Establish detection baselines',
        'Create alerting procedures'
      ],
      'Risk-Informed': [
        'Implement SIEM solution',
        'Enhance anomaly detection',
        'Improve continuous monitoring'
      ]
    },
    'RS': {
      'Partial': [
        'Create incident response plan',
        'Establish communication protocols',
        'Define escalation procedures'
      ],
      'Risk-Informed': [
        'Implement incident management platform',
        'Conduct regular drills',
        'Enhance forensics capabilities'
      ]
    },
    'RC': {
      'Partial': [
        'Create recovery plan',
        'Define backup procedures',
        'Establish communication plan'
      ],
      'Risk-Informed': [
        'Implement automated recovery',
        'Enhance redundancy',
        'Improve lessons learned process'
      ]
    }
  };
  
  const funcRecs = functionRecs[functionId]?.[tier];
  if (funcRecs) {
    recommendations.push(...funcRecs);
  }
  
  // Add percentage-based recommendation
  if (percentage < 25) {
    recommendations.push(`Critical: This function needs immediate attention (only ${percentage.toFixed(1)}% implemented)`);
  } else if (percentage < 50) {
    recommendations.push(`Important: Focus on closing gaps to reach Risk-Informed tier`);
  } else if (percentage < 75) {
    recommendations.push(`Good progress: ${(75 - percentage).toFixed(1)}% improvement needed for Repeatable tier`);
  }
  
  return recommendations.slice(0, 3);
}

/**
 * Create error result
 */
function createErrorResult(profileId: string, _message: string): MaturityAssessmentResult {
  return {
    success: false,
    profile_id: profileId,
    overall_maturity_tier: 'Unknown',
    overall_maturity_score: 0,
    assessment_date: new Date().toISOString(),
    function_breakdown: [],
    statistics: {
      total_functions: 0,
      functions_at_adaptive: 0,
      functions_at_repeatable: 0,
      functions_at_risk_informed: 0,
      functions_at_partial: 0,
      overall_implementation_percentage: 0,
      weakest_function: 'N/A',
      strongest_function: 'N/A'
    }
  };
}