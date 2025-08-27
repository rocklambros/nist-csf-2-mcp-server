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
    if (!framework.isLoaded()) {
      await framework.load();
    }
    
    // Verify both profiles exist
    const currentProfile = db.getProfile(params.current_profile_id);
    const targetProfile = db.getProfile(params.target_profile_id);
    
    if (!currentProfile) {
      return createErrorResult(`Current profile not found: ${params.current_profile_id}`);
    }
    
    if (!targetProfile) {
      return createErrorResult(`Target profile not found: ${params.target_profile_id}`);
    }
    
    // Generate unique analysis ID
    const analysisId = uuidv4();
    
    // Perform gap analysis and store results in database
    const analysisResult = db.generateGapAnalysis(
      params.current_profile_id,
      params.target_profile_id,
      analysisId
    );
    
    if (!analysisResult || !Array.isArray(analysisResult) || analysisResult.length === 0) {
      return createErrorResult('Failed to generate gap analysis');
    }
    
    // Get detailed gap analysis data
    const gapDetails = db.getGapAnalysisDetails(analysisId);
    
    // Filter by minimum gap score if specified
    const filteredGaps = gapDetails.filter(
      (gap: any) => gap.gap_score >= params.minimum_gap_score
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
        overall_maturity: currentSummary.maturity,
        implementation_percentage: currentSummary.implementation
      },
      target_profile: {
        id: (targetProfile as any).id,
        name: (targetProfile as any).name,
        overall_maturity: targetSummary.maturity,
        implementation_percentage: targetSummary.implementation
      },
      gap_summary: gapSummary,
      priority_matrix: priorityMatrix,
      gap_details: filteredGaps.map(formatGapItem),
      recommendations,
      visualizations
    };
    
  } catch (error) {
    logger.error('Generate gap analysis error:', error);
    return createErrorResult(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * Calculate gap summary statistics
 */
function calculateGapSummary(gaps: any[]): any {
  const criticalGaps = gaps.filter(g => g.gap_score >= 75).length;
  const highGaps = gaps.filter(g => g.gap_score >= 50 && g.gap_score < 75).length;
  const mediumGaps = gaps.filter(g => g.gap_score >= 25 && g.gap_score < 50).length;
  const lowGaps = gaps.filter(g => g.gap_score < 25).length;
  
  const avgGap = gaps.length > 0
    ? gaps.reduce((sum, g) => sum + g.gap_score, 0) / gaps.length
    : 0;
  
  const maxGap = gaps.length > 0
    ? Math.max(...gaps.map(g => g.gap_score))
    : 0;
  
  const totalEffort = gaps.reduce((sum, g) => sum + (g.effort_score || 0), 0);
  
  return {
    total_gaps: gaps.length,
    critical_gaps: criticalGaps,
    high_priority_gaps: highGaps,
    medium_priority_gaps: mediumGaps,
    low_priority_gaps: lowGaps,
    average_gap_score: Math.round(avgGap * 100) / 100,
    maximum_gap_score: maxGap,
    total_effort_required: Math.round(totalEffort * 100) / 100
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
    const impactScore = gap.risk_score || gap.gap_score / 10;
    const effortScore = gap.effort_score || 5;
    
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
  for (const quadrant of Object.values(matrix)) {
    if (quadrant.items.length > 0) {
      quadrant.item_count = quadrant.items.length;
      quadrant.average_gap_score = 
        quadrant.items.reduce((sum, item) => sum + item.gap_score, 0) / quadrant.items.length;
      quadrant.average_gap_score = Math.round(quadrant.average_gap_score * 100) / 100;
      
      result.push(quadrant);
    }
  }
  
  // Sort by priority: Quick Win > Strategic Initiative > Fill In > Low Priority
  const priorityOrder = ['Quick Win', 'Strategic Initiative', 'Fill In', 'Low Priority'];
  result.sort((a, b) => 
    priorityOrder.indexOf(a.quadrant) - priorityOrder.indexOf(b.quadrant)
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
    const funcId = gap.subcategory_id.substring(0, 2);
    if (!gapByFunction[funcId]) {
      gapByFunction[funcId] = {
        function_id: funcId,
        total_gaps: 0,
        average_gap_score: 0,
        gaps: []
      };
    }
    gapByFunction[funcId].gaps.push(gap.gap_score);
    gapByFunction[funcId].total_gaps++;
  }
  
  // Calculate averages
  for (const func of Object.values(gapByFunction)) {
    func.average_gap_score = 
      func.gaps.reduce((sum: number, g: number) => sum + g, 0) / func.gaps.length;
    func.average_gap_score = Math.round(func.average_gap_score * 100) / 100;
    delete func.gaps;
  }
  
  // Priority heatmap
  const priorityHeatmap = gaps.map(g => ({
    subcategory: g.subcategory_id,
    risk: g.risk_score || 0,
    effort: g.effort_score || 0,
    gap: g.gap_score,
    priority: g.priority_rank || 0
  }));
  
  // Maturity comparison
  const maturityComparison = {
    current: {
      profile_name: currentProfile.name,
      overall_maturity: 0,
      by_function: {} as Record<string, number>
    },
    target: {
      profile_name: targetProfile.name,
      overall_maturity: 0,
      by_function: {} as Record<string, number>
    }
  };
  
  // Effort vs Impact scatter plot data
  const effortVsImpact = gaps.map(g => ({
    subcategory: g.subcategory_id,
    effort: g.effort_score || 5,
    impact: g.risk_score || g.gap_score / 10,
    gap_score: g.gap_score,
    label: g.subcategory_name || g.subcategory_id
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
  const quickWins = priorityMatrix?.find(m => m.quadrant === 'Quick Win');
  if (quickWins && quickWins.items.length > 0) {
    const topQuickWins = quickWins.items.slice(0, 3);
    for (const item of topQuickWins) {
      recommendations.immediate_actions.push(
        `Implement ${item.subcategory_id}: ${item.improvement_required} (Gap: ${item.gap_score}%)`
      );
    }
  }
  
  // Add critical gaps to immediate actions
  const criticalGaps = gaps.filter(g => g.gap_score >= 75).slice(0, 3);
  for (const gap of criticalGaps) {
    if (!recommendations.immediate_actions.some(a => a.includes(gap.subcategory_id))) {
      recommendations.immediate_actions.push(
        `Address critical gap in ${gap.subcategory_id} (${gap.gap_score}% gap)`
      );
    }
  }
  
  // Short-term goals - Strategic Initiatives
  const strategic = priorityMatrix?.find(m => m.quadrant === 'Strategic Initiative');
  if (strategic && strategic.items.length > 0) {
    const topStrategic = strategic.items.slice(0, 3);
    for (const item of topStrategic) {
      recommendations.short_term_goals.push(
        `Plan implementation of ${item.subcategory_id}: ${item.improvement_required}`
      );
    }
  }
  
  // Long-term objectives - Based on functions with highest gaps
  const functionGaps: Record<string, number> = {};
  for (const gap of gaps) {
    const funcId = gap.subcategory_id.substring(0, 2);
    functionGaps[funcId] = (functionGaps[funcId] || 0) + gap.gap_score;
  }
  
  const sortedFunctions = Object.entries(functionGaps)
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
    recommendations.long_term_objectives.push(
      `Strengthen ${funcName} function capabilities (Total gap: ${Math.round(totalGap)})`
    );
  }
  
  // Resource requirements based on effort scores
  if (gapSummary.total_effort_required > 100) {
    recommendations.resource_requirements.push(
      'Significant resource allocation required (100+ effort points)'
    );
  }
  
  if (gapSummary.critical_gaps > 5) {
    recommendations.resource_requirements.push(
      'Dedicated security team needed for critical gap remediation'
    );
  }
  
  if (quickWins && quickWins.item_count > 10) {
    recommendations.resource_requirements.push(
      `${quickWins.item_count} quick wins available - allocate resources for rapid implementation`
    );
  }
  
  if (strategic && strategic.total_effort > 50) {
    recommendations.resource_requirements.push(
      'Multi-phase project planning required for strategic initiatives'
    );
  }
  
  return recommendations;
}

/**
 * Calculate profile summary
 */
function calculateProfileSummary(profileId: string, db: any): any {
  const assessments = db.getProfileAssessments(profileId);
  
  if (!assessments || assessments.length === 0) {
    return { maturity: 0, implementation: 0 };
  }
  
  const implemented = assessments.filter(
    (a: any) => a.implementation_level !== 'not_implemented'
  ).length;
  
  const totalMaturity = assessments.reduce(
    (sum: number, a: any) => sum + (a.maturity_score || 0), 0
  );
  
  return {
    maturity: Math.round((totalMaturity / assessments.length) * 20),
    implementation: Math.round((implemented / assessments.length) * 100)
  };
}

/**
 * Format gap item for output
 */
function formatGapItem(gap: any): GapItem {
  return {
    subcategory_id: gap.subcategory_id,
    subcategory_name: gap.subcategory_name || gap.subcategory_id,
    function_id: gap.subcategory_id.substring(0, 2),
    category_id: gap.subcategory_id.substring(0, 5),
    current_implementation: gap.current_implementation || 'not_implemented',
    target_implementation: gap.target_implementation || 'fully_implemented',
    current_maturity: gap.current_maturity || 0,
    target_maturity: gap.target_maturity || 5,
    gap_score: gap.gap_score || 0,
    risk_score: gap.risk_score || 0,
    effort_score: gap.effort_score || 5,
    priority_rank: gap.priority_rank || 999,
    improvement_required: describeImprovement(gap)
  };
}

/**
 * Describe the improvement required
 */
function describeImprovement(gap: any): string {
  const current = gap.current_implementation || 'not_implemented';
  const target = gap.target_implementation || 'fully_implemented';
  
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