/**
 * Generate Priority Matrix Tool - Create 2x2 priority matrix for gap remediation
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';

// Input schema for the tool
export const GeneratePriorityMatrixSchema = z.object({
  profile_id: z.string().min(1),
  target_profile_id: z.string().min(1).optional(),
  matrix_type: z.enum(['effort_impact', 'risk_feasibility', 'cost_benefit']).default('effort_impact'),
  include_recommendations: z.boolean().default(true),
  include_resource_estimates: z.boolean().default(true),
  max_items_per_quadrant: z.number().min(1).max(20).default(10)
});

export type GeneratePriorityMatrixParams = z.infer<typeof GeneratePriorityMatrixSchema>;

interface MatrixItem {
  subcategory_id: string;
  subcategory_name: string;
  function_id: string;
  category_id: string;
  current_state: string;
  target_state: string;
  gap_score: number;
  x_axis_value: number;
  y_axis_value: number;
  priority_score: number;
  estimated_effort_hours: number;
  estimated_cost: number;
  risk_reduction: number;
}

interface Quadrant {
  name: string;
  description: string;
  strategy: string;
  items: MatrixItem[];
  total_items: number;
  average_gap: number;
  total_effort_hours: number;
  total_cost: number;
  average_risk_reduction: number;
  recommended_timeline: string;
}

interface PriorityMatrixResult {
  success: boolean;
  matrix_type: string;
  generation_date: string;
  profile_id: string;
  target_profile_id?: string;
  matrix_configuration: {
    x_axis_label: string;
    y_axis_label: string;
    x_axis_threshold: number;
    y_axis_threshold: number;
  };
  quadrants: {
    high_value_low_effort: Quadrant;
    high_value_high_effort: Quadrant;
    low_value_low_effort: Quadrant;
    low_value_high_effort: Quadrant;
  };
  summary: {
    total_items: number;
    quick_wins_count: number;
    strategic_initiatives_count: number;
    fill_ins_count: number;
    avoid_count: number;
    total_effort_required: number;
    total_cost_estimate: number;
    average_risk_reduction: number;
  };
  recommendations?: {
    immediate_focus: string[];
    resource_allocation: string[];
    phased_approach: string[];
    risk_mitigation: string[];
  };
  resource_estimates?: {
    team_size_required: number;
    timeline_months: number;
    budget_range: {
      minimum: number;
      maximum: number;
    };
    skill_requirements: string[];
  };
}

// Matrix type configurations
const MATRIX_CONFIGS = {
  'effort_impact': {
    x_axis_label: 'Implementation Effort (1-10)',
    y_axis_label: 'Business Impact (1-10)',
    x_axis_threshold: 5,
    y_axis_threshold: 5,
    quadrant_names: {
      high_value_low_effort: 'Quick Wins',
      high_value_high_effort: 'Strategic Initiatives',
      low_value_low_effort: 'Fill Ins',
      low_value_high_effort: 'Avoid/Deprioritize'
    }
  },
  'risk_feasibility': {
    x_axis_label: 'Implementation Feasibility (1-10)',
    y_axis_label: 'Risk Reduction (1-10)',
    x_axis_threshold: 5,
    y_axis_threshold: 5,
    quadrant_names: {
      high_value_low_effort: 'High Priority',
      high_value_high_effort: 'Important but Challenging',
      low_value_low_effort: 'Easy but Low Impact',
      low_value_high_effort: 'Low Priority'
    }
  },
  'cost_benefit': {
    x_axis_label: 'Implementation Cost (1-10)',
    y_axis_label: 'Expected Benefit (1-10)',
    x_axis_threshold: 5,
    y_axis_threshold: 5,
    quadrant_names: {
      high_value_low_effort: 'High ROI',
      high_value_high_effort: 'Strategic Investment',
      low_value_low_effort: 'Marginal Value',
      low_value_high_effort: 'Poor Investment'
    }
  }
};

/**
 * Main function to generate priority matrix
 */
export async function generatePriorityMatrix(params: GeneratePriorityMatrixParams): Promise<PriorityMatrixResult> {
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
      return createErrorResult(`Profile not found: ${params.profile_id}`);
    }
    
    // Get matrix data from database
    const matrixData = params.target_profile_id
      ? db.getPriorityMatrix(params.target_profile_id)
      : db.getPriorityMatrixFromAssessments(params.profile_id);
    
    if (!matrixData || matrixData.length === 0) {
      return createErrorResult('No data available for priority matrix generation');
    }
    
    // Process items for the selected matrix type
    const processedItems = processMatrixItems(
      matrixData,
      params.matrix_type,
      framework
    );
    
    // Classify items into quadrants
    const quadrants = classifyIntoQuadrants(
      processedItems,
      params.matrix_type,
      params.max_items_per_quadrant
    );
    
    // Calculate summary statistics
    const summary = calculateSummary(quadrants);
    
    // Generate recommendations if requested
    const recommendations = params.include_recommendations
      ? generateRecommendations(quadrants, summary, params.matrix_type)
      : undefined;
    
    // Generate resource estimates if requested
    const resource_estimates = params.include_resource_estimates
      ? generateResourceEstimates(summary, quadrants)
      : undefined;
    
    // Get matrix configuration
    const config = MATRIX_CONFIGS[params.matrix_type as keyof typeof MATRIX_CONFIGS];
    
    return {
      success: true,
      matrix_type: params.matrix_type,
      generation_date: new Date().toISOString(),
      profile_id: params.profile_id,
      target_profile_id: params.target_profile_id,
      matrix_configuration: {
        x_axis_label: config.x_axis_label,
        y_axis_label: config.y_axis_label,
        x_axis_threshold: config.x_axis_threshold,
        y_axis_threshold: config.y_axis_threshold
      },
      quadrants,
      summary,
      recommendations,
      resource_estimates
    };
    
  } catch (error) {
    logger.error('Generate priority matrix error:', error);
    return createErrorResult(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * Process matrix items based on matrix type
 */
function processMatrixItems(
  data: any[],
  matrixType: string,
  _framework: any
): MatrixItem[] {
  const items: MatrixItem[] = [];
  
  for (const item of data) {
    let xValue: number, yValue: number;
    
    switch (matrixType) {
      case 'effort_impact':
        xValue = item.effort_score || estimateEffort(item);
        yValue = item.impact_score || estimateImpact(item);
        break;
      
      case 'risk_feasibility':
        xValue = estimateFeasibility(item);
        yValue = item.risk_score || estimateRiskReduction(item);
        break;
      
      case 'cost_benefit':
        xValue = estimateCost(item);
        yValue = estimateBenefit(item);
        break;
      
      default:
        xValue = 5;
        yValue = 5;
    }
    
    const priorityScore = calculatePriorityScore(xValue, yValue, matrixType);
    
    items.push({
      subcategory_id: item.subcategory_id,
      subcategory_name: item.subcategory_name || item.subcategory_id,
      function_id: item.subcategory_id.substring(0, 2),
      category_id: item.subcategory_id.substring(0, 5),
      current_state: item.current_implementation || item.implementation_level || 'not_implemented',
      target_state: item.target_implementation || 'fully_implemented',
      gap_score: item.gap_score || calculateGapScore(item),
      x_axis_value: Math.round(xValue * 100) / 100,
      y_axis_value: Math.round(yValue * 100) / 100,
      priority_score: Math.round(priorityScore * 100) / 100,
      estimated_effort_hours: estimateEffortHours(item),
      estimated_cost: estimateCostDollars(item),
      risk_reduction: estimateRiskReduction(item)
    });
  }
  
  return items;
}

/**
 * Classify items into quadrants
 */
function classifyIntoQuadrants(
  items: MatrixItem[],
  matrixType: string,
  maxItemsPerQuadrant: number
): any {
  const config = MATRIX_CONFIGS[matrixType as keyof typeof MATRIX_CONFIGS];
  const xThreshold = config.x_axis_threshold;
  const yThreshold = config.y_axis_threshold;
  
  const quadrants = {
    high_value_low_effort: createQuadrant(
      config.quadrant_names.high_value_low_effort,
      'High value with low effort - prioritize for immediate implementation',
      'Allocate resources immediately for quick implementation'
    ),
    high_value_high_effort: createQuadrant(
      config.quadrant_names.high_value_high_effort,
      'High value but requires significant effort - plan strategically',
      'Develop phased implementation plan with milestones'
    ),
    low_value_low_effort: createQuadrant(
      config.quadrant_names.low_value_low_effort,
      'Low value but easy to implement - consider as fill-in work',
      'Implement during available capacity or downtime'
    ),
    low_value_high_effort: createQuadrant(
      config.quadrant_names.low_value_high_effort,
      'Low value and high effort - generally avoid or deprioritize',
      'Defer or reconsider necessity'
    )
  };
  
  // Classify each item
  for (const item of items) {
    let quadrant: Quadrant;
    
    if (item.y_axis_value >= yThreshold && item.x_axis_value <= xThreshold) {
      quadrant = quadrants.high_value_low_effort;
    } else if (item.y_axis_value >= yThreshold && item.x_axis_value > xThreshold) {
      quadrant = quadrants.high_value_high_effort;
    } else if (item.y_axis_value < yThreshold && item.x_axis_value <= xThreshold) {
      quadrant = quadrants.low_value_low_effort;
    } else {
      quadrant = quadrants.low_value_high_effort;
    }
    
    if (quadrant.items.length < maxItemsPerQuadrant) {
      quadrant.items.push(item);
      quadrant.total_items++;
      quadrant.total_effort_hours += item.estimated_effort_hours;
      quadrant.total_cost += item.estimated_cost;
    }
  }
  
  // Calculate statistics for each quadrant
  for (const quadrant of Object.values(quadrants)) {
    if (quadrant.items.length > 0) {
      quadrant.average_gap = 
        quadrant.items.reduce((sum, item) => sum + item.gap_score, 0) / quadrant.items.length;
      quadrant.average_gap = Math.round(quadrant.average_gap * 100) / 100;
      
      quadrant.average_risk_reduction = 
        quadrant.items.reduce((sum, item) => sum + item.risk_reduction, 0) / quadrant.items.length;
      quadrant.average_risk_reduction = Math.round(quadrant.average_risk_reduction * 100) / 100;
      
      // Set recommended timeline based on quadrant
      if (quadrant.name.includes('Quick Win') || quadrant.name.includes('High Priority')) {
        quadrant.recommended_timeline = '0-3 months';
      } else if (quadrant.name.includes('Strategic')) {
        quadrant.recommended_timeline = '3-12 months';
      } else if (quadrant.name.includes('Fill')) {
        quadrant.recommended_timeline = '6-18 months';
      } else {
        quadrant.recommended_timeline = 'Not recommended';
      }
    }
    
    // Sort items by priority score
    quadrant.items.sort((a, b) => b.priority_score - a.priority_score);
  }
  
  return quadrants;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(quadrants: any): any {
  const allItems: MatrixItem[] = [];
  
  for (const quadrant of Object.values(quadrants)) {
    allItems.push(...(quadrant as Quadrant).items);
  }
  
  return {
    total_items: allItems.length,
    quick_wins_count: quadrants.high_value_low_effort.total_items,
    strategic_initiatives_count: quadrants.high_value_high_effort.total_items,
    fill_ins_count: quadrants.low_value_low_effort.total_items,
    avoid_count: quadrants.low_value_high_effort.total_items,
    total_effort_required: allItems.reduce((sum, item) => sum + item.estimated_effort_hours, 0),
    total_cost_estimate: allItems.reduce((sum, item) => sum + item.estimated_cost, 0),
    average_risk_reduction: allItems.length > 0
      ? allItems.reduce((sum, item) => sum + item.risk_reduction, 0) / allItems.length
      : 0
  };
}

/**
 * Generate recommendations based on matrix analysis
 */
function generateRecommendations(
  quadrants: any,
  summary: any,
  matrixType: string
): any {
  const recommendations = {
    immediate_focus: [] as string[],
    resource_allocation: [] as string[],
    phased_approach: [] as string[],
    risk_mitigation: [] as string[]
  };
  
  // Immediate focus - Quick Wins
  const quickWins = quadrants.high_value_low_effort;
  if (quickWins.items.length > 0) {
    const topItems = quickWins.items.slice(0, 3);
    for (const item of topItems) {
      recommendations.immediate_focus.push(
        `Implement ${item.subcategory_id}: Low effort (${item.x_axis_value}/10), High impact (${item.y_axis_value}/10)`
      );
    }
  }
  
  // Resource allocation
  if (summary.quick_wins_count > 5) {
    recommendations.resource_allocation.push(
      `Allocate dedicated team for ${summary.quick_wins_count} quick wins (${quickWins.total_effort_hours} hours estimated)`
    );
  }
  
  if (summary.strategic_initiatives_count > 0) {
    recommendations.resource_allocation.push(
      `Plan resources for ${summary.strategic_initiatives_count} strategic initiatives (${quadrants.high_value_high_effort.total_effort_hours} hours)`
    );
  }
  
  // Phased approach
  if (summary.total_items > 10) {
    recommendations.phased_approach.push(
      `Phase 1 (0-3 months): Focus on ${summary.quick_wins_count} quick wins`
    );
    recommendations.phased_approach.push(
      `Phase 2 (3-9 months): Tackle ${Math.min(3, summary.strategic_initiatives_count)} strategic initiatives`
    );
    recommendations.phased_approach.push(
      `Phase 3 (9-12 months): Address ${summary.fill_ins_count} fill-in items during available capacity`
    );
  }
  
  // Risk mitigation based on matrix type
  if (matrixType === 'risk_feasibility' || matrixType === 'effort_impact') {
    const highRiskItems = [...quadrants.high_value_high_effort.items, ...quadrants.high_value_low_effort.items]
      .filter(item => item.risk_reduction > 7);
    
    if (highRiskItems.length > 0) {
      recommendations.risk_mitigation.push(
        `${highRiskItems.length} items provide significant risk reduction (>70%)`
      );
    }
  }
  
  // Add specific recommendations based on distribution
  if (summary.quick_wins_count === 0 && summary.strategic_initiatives_count > 5) {
    recommendations.risk_mitigation.push(
      'No quick wins identified - consider breaking down strategic initiatives into smaller tasks'
    );
  }
  
  if (summary.avoid_count > summary.quick_wins_count) {
    recommendations.risk_mitigation.push(
      'High number of low-value/high-effort items - review requirements and consider alternatives'
    );
  }
  
  return recommendations;
}

/**
 * Generate resource estimates
 */
function generateResourceEstimates(summary: any, quadrants: any): any {
  // Calculate team size based on effort
  const monthlyHours = 160;
  const totalMonths = 12;
  const availableHours = monthlyHours * totalMonths;
  
  const teamSize = Math.ceil(summary.total_effort_required / availableHours);
  
  // Calculate timeline
  const timelineMonths = Math.ceil(summary.total_effort_required / (teamSize * monthlyHours));
  
  // Calculate budget range (assuming $100-150 per hour)
  const minRate = 100;
  const maxRate = 150;
  const budgetMin = summary.total_effort_required * minRate;
  const budgetMax = summary.total_effort_required * maxRate;
  
  // Determine skill requirements based on items
  const skillRequirements: Set<string> = new Set();
  
  // Analyze all items to determine skills needed
  const allItems = [
    ...quadrants.high_value_low_effort.items,
    ...quadrants.high_value_high_effort.items,
    ...quadrants.low_value_low_effort.items
  ];
  
  for (const item of allItems) {
    const funcId = item.function_id;
    switch (funcId) {
      case 'GV':
        skillRequirements.add('Governance and Risk Management');
        skillRequirements.add('Policy Development');
        break;
      case 'ID':
        skillRequirements.add('Asset Management');
        skillRequirements.add('Risk Assessment');
        break;
      case 'PR':
        skillRequirements.add('Security Engineering');
        skillRequirements.add('Access Control');
        break;
      case 'DE':
        skillRequirements.add('Security Monitoring');
        skillRequirements.add('SIEM Management');
        break;
      case 'RS':
        skillRequirements.add('Incident Response');
        skillRequirements.add('Crisis Management');
        break;
      case 'RC':
        skillRequirements.add('Business Continuity');
        skillRequirements.add('Disaster Recovery');
        break;
    }
  }
  
  return {
    team_size_required: teamSize,
    timeline_months: timelineMonths,
    budget_range: {
      minimum: budgetMin,
      maximum: budgetMax
    },
    skill_requirements: Array.from(skillRequirements)
  };
}

// Helper functions for estimation

function estimateEffort(item: any): number {
  const implLevel = item.current_implementation || item.implementation_level || 'not_implemented';
  const baseEffort: Record<string, number> = {
    'not_implemented': 8,
    'partially_implemented': 5,
    'largely_implemented': 3,
    'fully_implemented': 1
  };
  return baseEffort[implLevel] || 5;
}

function estimateImpact(item: any): number {
  const gap = item.gap_score || 50;
  return Math.min(10, gap / 10);
}

function estimateFeasibility(item: any): number {
  const effort = estimateEffort(item);
  return Math.max(1, 11 - effort);
}

function estimateRiskReduction(item: any): number {
  const gap = item.gap_score || 50;
  const criticality = item.subcategory_criticality || 5;
  return Math.min(10, (gap * criticality) / 50);
}

function estimateCost(item: any): number {
  const effort = estimateEffort(item);
  const complexity = item.implementation_complexity || 5;
  return Math.min(10, (effort * complexity) / 10);
}

function estimateBenefit(item: any): number {
  const impact = estimateImpact(item);
  const riskReduction = estimateRiskReduction(item);
  return Math.min(10, (impact + riskReduction) / 2);
}

function calculateGapScore(item: any): number {
  const current = item.current_maturity || 0;
  const target = item.target_maturity || 5;
  return ((target - current) / 5) * 100;
}

function calculatePriorityScore(x: number, y: number, matrixType: string): number {
  switch (matrixType) {
    case 'effort_impact':
      // High impact, low effort = high priority
      return (y * 10) + ((10 - x) * 5);
      
    case 'risk_feasibility':
      // High risk reduction, high feasibility = high priority
      return (y * 10) + (x * 5);
      
    case 'cost_benefit':
      // High benefit, low cost = high priority
      return (y * 10) + ((10 - x) * 5);
      
    default:
      return 50;
  }
}

function estimateEffortHours(item: any): number {
  const effort = estimateEffort(item);
  // Map effort score to hours (1=8hrs, 10=160hrs)
  return Math.round(8 + (effort - 1) * 17);
}

function estimateCostDollars(item: any): number {
  const hours = estimateEffortHours(item);
  const ratePerHour = 125; // Average rate
  return hours * ratePerHour;
}

/**
 * Create empty quadrant
 */
function createQuadrant(name: string, description: string, strategy: string): Quadrant {
  return {
    name,
    description,
    strategy,
    items: [],
    total_items: 0,
    average_gap: 0,
    total_effort_hours: 0,
    total_cost: 0,
    average_risk_reduction: 0,
    recommended_timeline: ''
  };
}

/**
 * Create error result
 */
function createErrorResult(message: string): PriorityMatrixResult {
  return {
    success: false,
    matrix_type: 'error',
    generation_date: new Date().toISOString(),
    profile_id: '',
    matrix_configuration: {
      x_axis_label: '',
      y_axis_label: '',
      x_axis_threshold: 0,
      y_axis_threshold: 0
    },
    quadrants: {
      high_value_low_effort: createQuadrant('Error', message, ''),
      high_value_high_effort: createQuadrant('Error', message, ''),
      low_value_low_effort: createQuadrant('Error', message, ''),
      low_value_high_effort: createQuadrant('Error', message, '')
    },
    summary: {
      total_items: 0,
      quick_wins_count: 0,
      strategic_initiatives_count: 0,
      fill_ins_count: 0,
      avoid_count: 0,
      total_effort_required: 0,
      total_cost_estimate: 0,
      average_risk_reduction: 0
    }
  };
}

