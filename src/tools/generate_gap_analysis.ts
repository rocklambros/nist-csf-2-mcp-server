/**
 * Generate Gap Analysis Tool - Compare current and target profiles
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

// Input schema for the tool
export const GenerateGapAnalysisSchema = z.object({
  current_profile_id: z.string().min(1),
  target_profile_id: z.string().min(1),
  organization_id: z.string().min(1).optional(),
  analysis_name: z.string().min(1).optional(),
  include_priority_matrix: z.boolean().default(true),
  include_visualizations: z.boolean().default(true),
  minimum_gap_score: z.number().min(0).max(100).default(0)
});

export type GenerateGapAnalysisParams = z.infer<typeof GenerateGapAnalysisSchema>;

interface GapItem {
  subcategory_id: string;
  subcategory_name: string;
  function_id: string;
  category_id: string;
  current_implementation: string;
  target_implementation: string;
  current_maturity: number;
  target_maturity: number;
  gap_score: number;
  risk_score: number;
  effort_score: number;
  priority_rank: number;
  improvement_required: string;
}

interface PriorityMatrix {
  quadrant: 'Quick Win' | 'Strategic Initiative' | 'Fill In' | 'Low Priority';
  items: GapItem[];
  item_count: number;
  average_gap_score: number;
  total_effort: number;
  total_impact: number;
}

interface GapAnalysisResult {
  success: boolean;
  analysis_id: string;
  analysis_date: string;
  current_profile: {
    id: string;
    name: string;
    overall_maturity: number;
    implementation_percentage: number;
  };
  target_profile: {
    id: string;
    name: string;
    overall_maturity: number;
    implementation_percentage: number;
  };
  gap_summary: {
    total_gaps: number;
    critical_gaps: number;
    high_priority_gaps: number;
    medium_priority_gaps: number;
    low_priority_gaps: number;
    average_gap_score: number;
    maximum_gap_score: number;
    total_effort_required: number;
  };
  priority_matrix?: PriorityMatrix[];
  gap_details: GapItem[];
  recommendations: {
    immediate_actions: string[];
    short_term_goals: string[];
    long_term_objectives: string[];
    resource_requirements: string[];
  };
  visualizations?: {
    gap_by_function: any;
    priority_heatmap: any;
    maturity_comparison: any;
    effort_vs_impact: any;
  };
}

/**
 * Main function to generate gap analysis
 */
export async function generateGapAnalysis(params: GenerateGapAnalysisParams): Promise<GapAnalysisResult> {
  const db = getDatabase();
  const framework = getFrameworkLoader();
  
  try {
    // Ensure framework is loaded
    if (!(framework as any).isLoaded()) {
      await (framework as any).load();
    }
    
    // Verify both profiles exist
    const currentProfile = (db as any).getProfile(params.current_profile_id);
    const targetProfile = (db as any).getProfile(params.target_profile_id);
    
    if (!currentProfile) {
      return createErrorResult(`Current profile not found: ${params.current_profile_id}`);
    }
    
    if (!targetProfile) {
      return createErrorResult(`Target profile not found: ${params.target_profile_id}`);
    }
    
    // Validate organization_id if provided
    if (params.organization_id) {
      if (currentProfile.org_id !== params.organization_id || targetProfile.org_id !== params.organization_id) {
        return createErrorResult(`Organization ID mismatch: profiles must belong to organization ${params.organization_id}`);
      }
    }
    
    // Generate unique analysis ID
    const analysisId = uuidv4();
    
    // Perform gap analysis and store results in database
    const analysisResult = (db as any).generateGapAnalysis(
      params.current_profile_id,
      params.target_profile_id,
      analysisId
    );
    
    if (!analysisResult || !(Array as any).isArray(analysisResult) || (analysisResult as any).length === 0) {
      return createErrorResult('Failed to generate gap analysis');
    }
    
    // Get detailed gap analysis data
    const gapDetails = (db as any).getGapAnalysisDetails(analysisId);
    
    // Filter by minimum gap score if specified
    const filteredGaps = (gapDetails as any).filter(
      (gap: any) => (gap as any).gap_score >= params.minimum_gap_score
    );
    
    // Calculate gap summary statistics
    const gapSummary = calculateGapSummary(filteredGaps);
    
    // Generate priority matrix if requested
    const priorityMatrix = params.include_priority_matrix
      ? generatePriorityMatrix(filteredGaps)
      : undefined;
    
    // Generate visualizations if requested
    const visualizations = params.include_visualizations
      ? generateVisualizations(filteredGaps, currentProfile, targetProfile)
      : undefined;
    
    // Generate recommendations based on gaps
    const recommendations = generateRecommendations(
      filteredGaps,
      priorityMatrix,
      gapSummary
    );
    
    // Calculate profile summaries
    const currentSummary = calculateProfileSummary(params.current_profile_id, db);
    const targetSummary = calculateProfileSummary(params.target_profile_id, db);
    
    return {
      success: true,
      analysis_id: analysisId,
      analysis_date: new Date().toISOString(),
      current_profile: {
        id: (currentProfile as any).id,
        name: (currentProfile as any).name,
        overall_maturity: (currentSummary as any).maturity,
        implementation_percentage: (currentSummary as any).implementation
      },
      target_profile: {
        id: (targetProfile as any).id,
        name: (targetProfile as any).name,
        overall_maturity: (targetSummary as any).maturity,
        implementation_percentage: (targetSummary as any).implementation
      },
      gap_summary: gapSummary,
      priority_matrix: priorityMatrix,
      gap_details: (filteredGaps as any).map(formatGapItem),
      recommendations,
      visualizations
    };
    
  } catch (error) {
    (logger as any).error('Generate gap analysis error:', error);
    return createErrorResult(
      error instanceof Error ? (error as any).message : 'Unknown error occurred'
    );
  }
}

/**
 * Calculate gap summary statistics
 */
function calculateGapSummary(gaps: any[]): any {
  const criticalGaps = (gaps as any).filter(g => (g as any).gap_score >= 75).length;
  const highGaps = (gaps as any).filter(g => (g as any).gap_score >= 50 && (g as any).gap_score < 75).length;
  const mediumGaps = (gaps as any).filter(g => (g as any).gap_score >= 25 && (g as any).gap_score < 50).length;
  const lowGaps = (gaps as any).filter(g => (g as any).gap_score < 25).length;
  
  const avgGap = (gaps as any).length > 0
    ? (gaps as any).reduce((sum, g) => sum + (g as any).gap_score, 0) / (gaps as any).length
    : 0;
  
  const maxGap = (gaps as any).length > 0
    ? (Math as any).max(...(gaps as any).map(g => (g as any).gap_score))
    : 0;
  
  const totalEffort = (gaps as any).reduce((sum, g) => sum + ((g as any).effort_score || 0), 0);
  
  return {
    total_gaps: (gaps as any).length,
    critical_gaps: criticalGaps,
    high_priority_gaps: highGaps,
    medium_priority_gaps: mediumGaps,
    low_priority_gaps: lowGaps,
    average_gap_score: (Math as any).round(avgGap * 100) / 100,
    maximum_gap_score: maxGap,
    total_effort_required: (Math as any).round(totalEffort * 100) / 100
  };
}

/**
 * Generate priority matrix
 */
function generatePriorityMatrix(gaps: any[]): PriorityMatrix[] {
  const matrix: Record<string, PriorityMatrix> = {
    'Quick Win': {
      quadrant: 'Quick Win',
      items: [],
      item_count: 0,
      average_gap_score: 0,
      total_effort: 0,
      total_impact: 0
    },
    'Strategic Initiative': {
      quadrant: 'Strategic Initiative',
      items: [],
      item_count: 0,
      average_gap_score: 0,
      total_effort: 0,
      total_impact: 0
    },
    'Fill In': {
      quadrant: 'Fill In',
      items: [],
      item_count: 0,
      average_gap_score: 0,
      total_effort: 0,
      total_impact: 0
    },
    'Low Priority': {
      quadrant: 'Low Priority',
      items: [],
      item_count: 0,
      average_gap_score: 0,
      total_effort: 0,
      total_impact: 0
    }
  };
  
  // Classify each gap into quadrants
  for (const gap of gaps) {
    const impactScore = (gap as any).risk_score || (gap as any).gap_score / 10;
    const effortScore = (gap as any).effort_score || 5;
    
    let quadrant: string;
    if (impactScore >= 5 && effortScore <= 5) {
      quadrant = 'Quick Win';
    } else if (impactScore >= 5 && effortScore > 5) {
      quadrant = 'Strategic Initiative';
    } else if (impactScore < 5 && effortScore <= 5) {
      quadrant = 'Fill In';
    } else {
      quadrant = 'Low Priority';
    }
    
    const item = formatGapItem(gap);
    matrix[quadrant]!.items.push(item);
    matrix[quadrant]!.total_effort += effortScore;
    matrix[quadrant]!.total_impact += impactScore;
  }
  
  // Calculate statistics for each quadrant
  const result: PriorityMatrix[] = [];
  for (const quadrant of (Object as any).values(matrix)) {
    if ((quadrant as any).items.length > 0) {
      (quadrant as any).item_count = (quadrant as any).items.length;
      (quadrant as any).average_gap_score = 
        (quadrant as any).items.reduce((sum, item) => sum + (item as any).gap_score, 0) / (quadrant as any).items.length;
      (quadrant as any).average_gap_score = (Math as any).round((quadrant as any).average_gap_score * 100) / 100;
      
      (result as any).push(quadrant);
    }
  }
  
  // Sort by priority: Quick Win > Strategic Initiative > Fill In > Low Priority
  const priorityOrder = ['Quick Win', 'Strategic Initiative', 'Fill In', 'Low Priority'];
  (result as any).sort((a, b) => 
    (priorityOrder as any).indexOf((a as any).quadrant) - (priorityOrder as any).indexOf((b as any).quadrant)
  );
  
  return result;
}

/**
 * Generate visualizations data
 */
function generateVisualizations(gaps: any[], currentProfile: any, targetProfile: any): any {
  // Gap by function
  const gapByFunction: Record<string, any> = {};
  for (const gap of gaps) {
    const funcId = (gap as any).subcategory_id.substring(0, 2);
    if (!gapByFunction[funcId]) {
      gapByFunction[funcId] = {
        function_id: funcId,
        total_gaps: 0,
        average_gap_score: 0,
        gaps: []
      };
    }
    gapByFunction[funcId].gaps.push((gap as any).gap_score);
    gapByFunction[funcId].total_gaps++;
  }
  
  // Calculate averages
  for (const func of Object.values(gapByFunction)) {
    (func as any).average_gap_score = 
      (func as any).gaps.reduce((sum: number, g: number) => sum + g, 0) / (func as any).gaps.length;
    (func as any).average_gap_score = Math.round((func as any).average_gap_score * 100) / 100;
    delete (func as any).gaps;
  }
  
  // Priority heatmap
  const priorityHeatmap = (gaps as any).map(g => ({
    subcategory: (g as any).subcategory_id,
    risk: (g as any).risk_score || 0,
    effort: (g as any).effort_score || 0,
    gap: (g as any).gap_score,
    priority: (g as any).priority_rank || 0
  }));
  
  // Maturity comparison
  const maturityComparison = {
    current: {
      profile_name: (currentProfile as any).name,
      overall_maturity: 0,
      by_function: {} as Record<string, number>
    },
    target: {
      profile_name: (targetProfile as any).name,
      overall_maturity: 0,
      by_function: {} as Record<string, number>
    }
  };
  
  // Effort vs Impact scatter plot data
  const effortVsImpact = (gaps as any).map(g => ({
    subcategory: (g as any).subcategory_id,
    effort: (g as any).effort_score || 5,
    impact: (g as any).risk_score || (g as any).gap_score / 10,
    gap_score: (g as any).gap_score,
    label: (g as any).subcategory_name || (g as any).subcategory_id
  }));
  
  return {
    gap_by_function: gapByFunction,
    priority_heatmap: priorityHeatmap,
    maturity_comparison: maturityComparison,
    effort_vs_impact: effortVsImpact
  };
}

/**
 * Generate recommendations based on gap analysis
 */
function generateRecommendations(
  gaps: any[],
  priorityMatrix: PriorityMatrix[] | undefined,
  gapSummary: any
): any {
  const recommendations = {
    immediate_actions: [] as string[],
    short_term_goals: [] as string[],
    long_term_objectives: [] as string[],
    resource_requirements: [] as string[]
  };
  
  // Immediate actions - Quick Wins and Critical Gaps
  const quickWins = priorityMatrix?.find(m => (m as any).quadrant === 'Quick Win');
  if (quickWins && (quickWins as any).items.length > 0) {
    const topQuickWins = (quickWins as any).items.slice(0, 3);
    for (const item of topQuickWins) {
      (recommendations as any).immediate_actions.push(
        `Implement ${(item as any).subcategory_id}: ${(item as any).improvement_required} (Gap: ${(item as any).gap_score}%)`
      );
    }
  }
  
  // Add critical gaps to immediate actions
  const criticalGaps = (gaps as any).filter(g => (g as any).gap_score >= 75).slice(0, 3);
  for (const gap of criticalGaps) {
    if (!(recommendations as any).immediate_actions.some(a => (a as any).includes((gap as any).subcategory_id))) {
      (recommendations as any).immediate_actions.push(
        `Address critical gap in ${(gap as any).subcategory_id} (${(gap as any).gap_score}% gap)`
      );
    }
  }
  
  // Short-term goals - Strategic Initiatives
  const strategic = priorityMatrix?.find(m => (m as any).quadrant === 'Strategic Initiative');
  if (strategic && (strategic as any).items.length > 0) {
    const topStrategic = (strategic as any).items.slice(0, 3);
    for (const item of topStrategic) {
      (recommendations as any).short_term_goals.push(
        `Plan implementation of ${(item as any).subcategory_id}: ${(item as any).improvement_required}`
      );
    }
  }
  
  // Long-term objectives - Based on functions with highest gaps
  const functionGaps: Record<string, number> = {};
  for (const gap of gaps) {
    const funcId = (gap as any).subcategory_id.substring(0, 2);
    functionGaps[funcId] = (functionGaps[funcId] || 0) + (gap as any).gap_score;
  }
  
  const sortedFunctions = (Object as any).entries(functionGaps)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  
  const functionNames: Record<string, string> = {
    'GV': 'Govern',
    'ID': 'Identify',
    'PR': 'Protect',
    'DE': 'Detect',
    'RS': 'Respond',
    'RC': 'Recover'
  };
  
  for (const [funcId, totalGap] of sortedFunctions) {
    const funcName = functionNames[funcId] || funcId;
    (recommendations as any).long_term_objectives.push(
      `Strengthen ${funcName} function capabilities (Total gap: ${(Math as any).round(totalGap)})`
    );
  }
  
  // Resource requirements based on effort scores
  if ((gapSummary as any).total_effort_required > 100) {
    (recommendations as any).resource_requirements.push(
      'Significant resource allocation required (100+ effort points)'
    );
  }
  
  if ((gapSummary as any).critical_gaps > 5) {
    (recommendations as any).resource_requirements.push(
      'Dedicated security team needed for critical gap remediation'
    );
  }
  
  if (quickWins && (quickWins as any).item_count > 10) {
    (recommendations as any).resource_requirements.push(
      `${(quickWins as any).item_count} quick wins available - allocate resources for rapid implementation`
    );
  }
  
  if (strategic && (strategic as any).total_effort > 50) {
    (recommendations as any).resource_requirements.push(
      'Multi-phase project planning required for strategic initiatives'
    );
  }
  
  return recommendations;
}

/**
 * Calculate profile summary
 */
function calculateProfileSummary(profileId: string, db: any): any {
  const assessments = (db as any).getProfileAssessments(profileId);
  
  if (!assessments || (assessments as any).length === 0) {
    return { maturity: 0, implementation: 0 };
  }
  
  const implemented = (assessments as any).filter(
    (a: any) => (a as any).implementation_level !== 'not_implemented'
  ).length;
  
  const totalMaturity = (assessments as any).reduce(
    (sum: number, a: any) => sum + ((a as any).maturity_score || 0), 0
  );
  
  return {
    maturity: (Math as any).round((totalMaturity / (assessments as any).length) * 20),
    implementation: (Math as any).round((implemented / (assessments as any).length) * 100)
  };
}

/**
 * Format gap item for output
 */
function formatGapItem(gap: any): GapItem {
  return {
    subcategory_id: (gap as any).subcategory_id,
    subcategory_name: (gap as any).subcategory_name || (gap as any).subcategory_id,
    function_id: (gap as any).subcategory_id.substring(0, 2),
    category_id: (gap as any).subcategory_id.substring(0, 5),
    current_implementation: (gap as any).current_implementation || 'not_implemented',
    target_implementation: (gap as any).target_implementation || 'fully_implemented',
    current_maturity: (gap as any).current_maturity || 0,
    target_maturity: (gap as any).target_maturity || 5,
    gap_score: (gap as any).gap_score || 0,
    risk_score: (gap as any).risk_score || 0,
    effort_score: (gap as any).effort_score || 5,
    priority_rank: (gap as any).priority_rank || 999,
    improvement_required: describeImprovement(gap)
  };
}

/**
 * Describe the improvement required
 */
function describeImprovement(gap: any): string {
  const current = (gap as any).current_implementation || 'not_implemented';
  const target = (gap as any).target_implementation || 'fully_implemented';
  
  const improvements: Record<string, Record<string, string>> = {
    'not_implemented': {
      'partially_implemented': 'Begin initial implementation',
      'largely_implemented': 'Implement comprehensive controls',
      'fully_implemented': 'Full implementation required'
    },
    'partially_implemented': {
      'largely_implemented': 'Expand current implementation',
      'fully_implemented': 'Complete full implementation'
    },
    'largely_implemented': {
      'fully_implemented': 'Finalize remaining gaps'
    }
  };
  
  return improvements[current]?.[target] || 'Improvement required';
}

/**
 * Create error result
 */
function createErrorResult(message: string): GapAnalysisResult {
  return {
    success: false,
    analysis_id: '',
    analysis_date: new Date().toISOString(),
    current_profile: {
      id: '',
      name: 'Error',
      overall_maturity: 0,
      implementation_percentage: 0
    },
    target_profile: {
      id: '',
      name: 'Error',
      overall_maturity: 0,
      implementation_percentage: 0
    },
    gap_summary: {
      total_gaps: 0,
      critical_gaps: 0,
      high_priority_gaps: 0,
      medium_priority_gaps: 0,
      low_priority_gaps: 0,
      average_gap_score: 0,
      maximum_gap_score: 0,
      total_effort_required: 0
    },
    gap_details: [],
    recommendations: {
      immediate_actions: [message],
      short_term_goals: [],
      long_term_objectives: [],
      resource_requirements: []
    }
  };
}