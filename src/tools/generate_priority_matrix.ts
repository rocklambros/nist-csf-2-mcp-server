/**
 * Generate Priority Matrix Tool - Create 2x2 priority matrix for gap remediation
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';

// Input schema for the tool
export const GeneratePriorityMatrixSchema = z.object({
  profile_id: (z as any).string().min(1),
  target_profile_id: (z as any).string().min(1).optional(),
  matrix_type: (z as any).enum(['effort_impact', 'risk_feasibility', 'cost_benefit']).default('effort_impact'),
  include_recommendations: (z as any).boolean().default(true),
  include_resource_estimates: (z as any).boolean().default(true),
  max_items_per_quadrant: (z as any).number().min(1).max(20).default(10)
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
    if (!(framework as any).isLoaded()) {
      await (framework as any).load();
    }
    
    // Verify profile exists
    const profile = (db as any).getProfile((params as any).profile_id);
    if (!profile) {
      return createErrorResult(`Profile not found: ${(params as any).profile_id}`);
    }
    
    // Get matrix data from database
    const matrixData = (params as any).target_profile_id
      ? (db as any).getPriorityMatrix((params as any).target_profile_id)
      : (db as any).getPriorityMatrixFromAssessments((params as any).profile_id);
    
    if (!matrixData || (matrixData as any).length === 0) {
      return createErrorResult('No data available for priority matrix generation');
    }
    
    // Process items for the selected matrix type
    const processedItems = processMatrixItems(
      matrixData,
      (params as any).matrix_type,
      framework
    );
    
    // Classify items into quadrants
    const quadrants = classifyIntoQuadrants(
      processedItems,
      (params as any).matrix_type,
      (params as any).max_items_per_quadrant
    );
    
    // Calculate summary statistics
    const summary = calculateSummary(quadrants);
    
    // Generate recommendations if requested
    const recommendations = (params as any).include_recommendations
      ? generateRecommendations(quadrants, summary, (params as any).matrix_type)
      : undefined;
    
    // Generate resource estimates if requested
    const resource_estimates = (params as any).include_resource_estimates
      ? generateResourceEstimates(summary, quadrants)
      : undefined;
    
    // Get matrix configuration
    const config = MATRIX_CONFIGS[(params as any).matrix_type as keyof typeof MATRIX_CONFIGS];
    
    return {
      success: true,
      matrix_type: (params as any).matrix_type,
      generation_date: new Date().toISOString(),
      profile_id: (params as any).profile_id,
      target_profile_id: (params as any).target_profile_id,
      matrix_configuration: {
        x_axis_label: (config as any).x_axis_label,
        y_axis_label: (config as any).y_axis_label,
        x_axis_threshold: (config as any).x_axis_threshold,
        y_axis_threshold: (config as any).y_axis_threshold
      },
      quadrants,
      summary,
      recommendations,
      resource_estimates
    };
    
  } catch (error) {
    (logger as any).error('Generate priority matrix error:', error);
    return createErrorResult(
      error instanceof Error ? (error as any).message : 'Unknown error occurred'
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
        xValue = (item as any).effort_score || estimateEffort(item);
        yValue = (item as any).impact_score || estimateImpact(item);
        break;
      
      case 'risk_feasibility':
        xValue = estimateFeasibility(item);
        yValue = (item as any).risk_score || estimateRiskReduction(item);
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
    
    (items as any).push({
      subcategory_id: (item as any).subcategory_id,
      subcategory_name: (item as any).subcategory_name || (item as any).subcategory_id,
      function_id: (item as any).subcategory_id.substring(0, 2),
      category_id: (item as any).subcategory_id.substring(0, 5),
      current_state: (item as any).current_implementation || (item as any).implementation_level || 'not_implemented',
      target_state: (item as any).target_implementation || 'fully_implemented',
      gap_score: (item as any).gap_score || calculateGapScore(item),
      x_axis_value: (Math as any).round(xValue * 100) / 100,
      y_axis_value: (Math as any).round(yValue * 100) / 100,
      priority_score: (Math as any).round(priorityScore * 100) / 100,
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
  const xThreshold = (config as any).x_axis_threshold;
  const yThreshold = (config as any).y_axis_threshold;
  
  const quadrants = {
    high_value_low_effort: createQuadrant(
      (config as any).quadrant_names.high_value_low_effort,
      'High value with low effort - prioritize for immediate implementation',
      'Allocate resources immediately for quick implementation'
    ),
    high_value_high_effort: createQuadrant(
      (config as any).quadrant_names.high_value_high_effort,
      'High value but requires significant effort - plan strategically',
      'Develop phased implementation plan with milestones'
    ),
    low_value_low_effort: createQuadrant(
      (config as any).quadrant_names.low_value_low_effort,
      'Low value but easy to implement - consider as fill-in work',
      'Implement during available capacity or downtime'
    ),
    low_value_high_effort: createQuadrant(
      (config as any).quadrant_names.low_value_high_effort,
      'Low value and high effort - generally avoid or deprioritize',
      'Defer or reconsider necessity'
    )
  };
  
  // Classify each item
  for (const item of items) {
    let quadrant: Quadrant;
    
    if ((item as any).y_axis_value >= yThreshold && (item as any).x_axis_value <= xThreshold) {
      quadrant = (quadrants as any).high_value_low_effort;
    } else if ((item as any).y_axis_value >= yThreshold && (item as any).x_axis_value > xThreshold) {
      quadrant = (quadrants as any).high_value_high_effort;
    } else if ((item as any).y_axis_value < yThreshold && (item as any).x_axis_value <= xThreshold) {
      quadrant = (quadrants as any).low_value_low_effort;
    } else {
      quadrant = (quadrants as any).low_value_high_effort;
    }
    
    if ((quadrant as any).items.length < maxItemsPerQuadrant) {
      (quadrant as any).items.push(item);
      (quadrant as any).total_items++;
      (quadrant as any).total_effort_hours += (item as any).estimated_effort_hours;
      (quadrant as any).total_cost += (item as any).estimated_cost;
    }
  }
  
  // Calculate statistics for each quadrant
  for (const quadrant of (Object as any).values(quadrants)) {
    if ((quadrant as any).items.length > 0) {
      (quadrant as any).average_gap = 
        (quadrant as any).items.reduce((sum, item) => sum + (item as any).gap_score, 0) / (quadrant as any).items.length;
      (quadrant as any).average_gap = (Math as any).round((quadrant as any).average_gap * 100) / 100;
      
      (quadrant as any).average_risk_reduction = 
        (quadrant as any).items.reduce((sum, item) => sum + (item as any).risk_reduction, 0) / (quadrant as any).items.length;
      (quadrant as any).average_risk_reduction = (Math as any).round((quadrant as any).average_risk_reduction * 100) / 100;
      
      // Set recommended timeline based on quadrant
      if ((quadrant as any).name.includes('Quick Win') || (quadrant as any).name.includes('High Priority')) {
        (quadrant as any).recommended_timeline = '0-3 months';
      } else if ((quadrant as any).name.includes('Strategic')) {
        (quadrant as any).recommended_timeline = '3-12 months';
      } else if ((quadrant as any).name.includes('Fill')) {
        (quadrant as any).recommended_timeline = '6-18 months';
      } else {
        (quadrant as any).recommended_timeline = 'Not recommended';
      }
    }
    
    // Sort items by priority score
    (quadrant as any).items.sort((a, b) => (b as any).priority_score - (a as any).priority_score);
  }
  
  return quadrants;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(quadrants: any): any {
  const allItems: MatrixItem[] = [];
  
  for (const quadrant of (Object as any).values(quadrants)) {
    (allItems as any).push(...(quadrant as Quadrant).items);
  }
  
  return {
    total_items: (allItems as any).length,
    quick_wins_count: (quadrants as any).high_value_low_effort.total_items,
    strategic_initiatives_count: (quadrants as any).high_value_high_effort.total_items,
    fill_ins_count: (quadrants as any).low_value_low_effort.total_items,
    avoid_count: (quadrants as any).low_value_high_effort.total_items,
    total_effort_required: (allItems as any).reduce((sum, item) => sum + (item as any).estimated_effort_hours, 0),
    total_cost_estimate: (allItems as any).reduce((sum, item) => sum + (item as any).estimated_cost, 0),
    average_risk_reduction: (allItems as any).length > 0
      ? (allItems as any).reduce((sum, item) => sum + (item as any).risk_reduction, 0) / (allItems as any).length
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
  const quickWins = (quadrants as any).high_value_low_effort;
  if ((quickWins as any).items.length > 0) {
    const topItems = (quickWins as any).items.slice(0, 3);
    for (const item of topItems) {
      (recommendations as any).immediate_focus.push(
        `Implement ${(item as any).subcategory_id}: Low effort (${(item as any).x_axis_value}/10), High impact (${(item as any).y_axis_value}/10)`
      );
    }
  }
  
  // Resource allocation
  if ((summary as any).quick_wins_count > 5) {
    (recommendations as any).resource_allocation.push(
      `Allocate dedicated team for ${(summary as any).quick_wins_count} quick wins (${(quickWins as any).total_effort_hours} hours estimated)`
    );
  }
  
  if ((summary as any).strategic_initiatives_count > 0) {
    (recommendations as any).resource_allocation.push(
      `Plan resources for ${(summary as any).strategic_initiatives_count} strategic initiatives (${(quadrants as any).high_value_high_effort.total_effort_hours} hours)`
    );
  }
  
  // Phased approach
  if ((summary as any).total_items > 10) {
    (recommendations as any).phased_approach.push(
      `Phase 1 (0-3 months): Focus on ${(summary as any).quick_wins_count} quick wins`
    );
    (recommendations as any).phased_approach.push(
      `Phase 2 (3-9 months): Tackle ${(Math as any).min(3, (summary as any).strategic_initiatives_count)} strategic initiatives`
    );
    (recommendations as any).phased_approach.push(
      `Phase 3 (9-12 months): Address ${(summary as any).fill_ins_count} fill-in items during available capacity`
    );
  }
  
  // Risk mitigation based on matrix type
  if (matrixType === 'risk_feasibility' || matrixType === 'effort_impact') {
    const highRiskItems = [...(quadrants as any).high_value_high_effort.items, ...(quadrants as any).high_value_low_effort.items]
      .filter(item => (item as any).risk_reduction > 7);
    
    if ((highRiskItems as any).length > 0) {
      (recommendations as any).risk_mitigation.push(
        `${(highRiskItems as any).length} items provide significant risk reduction (>70%)`
      );
    }
  }
  
  // Add specific recommendations based on distribution
  if ((summary as any).quick_wins_count === 0 && (summary as any).strategic_initiatives_count > 5) {
    (recommendations as any).risk_mitigation.push(
      'No quick wins identified - consider breaking down strategic initiatives into smaller tasks'
    );
  }
  
  if ((summary as any).avoid_count > (summary as any).quick_wins_count) {
    (recommendations as any).risk_mitigation.push(
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
  
  const teamSize = (Math as any).ceil((summary as any).total_effort_required / availableHours);
  
  // Calculate timeline
  const timelineMonths = (Math as any).ceil((summary as any).total_effort_required / (teamSize * monthlyHours));
  
  // Calculate budget range (assuming $100-150 per hour)
  const minRate = 100;
  const maxRate = 150;
  const budgetMin = (summary as any).total_effort_required * minRate;
  const budgetMax = (summary as any).total_effort_required * maxRate;
  
  // Determine skill requirements based on items
  const skillRequirements: Set<string> = new Set();
  
  // Analyze all items to determine skills needed
  const allItems = [
    ...(quadrants as any).high_value_low_effort.items,
    ...(quadrants as any).high_value_high_effort.items,
    ...(quadrants as any).low_value_low_effort.items
  ];
  
  for (const item of allItems) {
    const funcId = (item as any).function_id;
    switch (funcId) {
      case 'GV':
        (skillRequirements as any).add('Governance and Risk Management');
        (skillRequirements as any).add('Policy Development');
        break;
      case 'ID':
        (skillRequirements as any).add('Asset Management');
        (skillRequirements as any).add('Risk Assessment');
        break;
      case 'PR':
        (skillRequirements as any).add('Security Engineering');
        (skillRequirements as any).add('Access Control');
        break;
      case 'DE':
        (skillRequirements as any).add('Security Monitoring');
        (skillRequirements as any).add('SIEM Management');
        break;
      case 'RS':
        (skillRequirements as any).add('Incident Response');
        (skillRequirements as any).add('Crisis Management');
        break;
      case 'RC':
        (skillRequirements as any).add('Business Continuity');
        (skillRequirements as any).add('Disaster Recovery');
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
    skill_requirements: (Array as any).from(skillRequirements)
  };
}

// Helper functions for estimation

function estimateEffort(item: any): number {
  const implLevel = (item as any).current_implementation || (item as any).implementation_level || 'not_implemented';
  const baseEffort: Record<string, number> = {
    'not_implemented': 8,
    'partially_implemented': 5,
    'largely_implemented': 3,
    'fully_implemented': 1
  };
  return baseEffort[implLevel] || 5;
}

function estimateImpact(item: any): number {
  const gap = (item as any).gap_score || 50;
  return (Math as any).min(10, gap / 10);
}

function estimateFeasibility(item: any): number {
  const effort = estimateEffort(item);
  return (Math as any).max(1, 11 - effort);
}

function estimateRiskReduction(item: any): number {
  const gap = (item as any).gap_score || 50;
  const criticality = (item as any).subcategory_criticality || 5;
  return (Math as any).min(10, (gap * criticality) / 50);
}

function estimateCost(item: any): number {
  const effort = estimateEffort(item);
  const complexity = (item as any).implementation_complexity || 5;
  return (Math as any).min(10, (effort * complexity) / 10);
}

function estimateBenefit(item: any): number {
  const impact = estimateImpact(item);
  const riskReduction = estimateRiskReduction(item);
  return (Math as any).min(10, (impact + riskReduction) / 2);
}

function calculateGapScore(item: any): number {
  const current = (item as any).current_maturity || 0;
  const target = (item as any).target_maturity || 5;
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
  return (Math as any).round(8 + (effort - 1) * 17);
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

