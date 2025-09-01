/**
 * Suggest Next Actions Tool - Recommend prioritized actions based on capacity
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';

// Input schema for the tool
export const SuggestNextActionsSchema = z.object({
  profile_id: z.string().min(1),
  capacity_hours_per_week: z.number().min(1).max(168),
  time_horizon_weeks: z.number().min(1).max(12).default(4),
  focus_area: z.enum(['all', 'govern', 'identify', 'protect', 'detect', 'respond', 'recover']).default('all'),
  optimization_goal: z.enum(['quick_wins', 'risk_reduction', 'compliance', 'balanced']).default('balanced'),
  include_dependencies: z.boolean().default(true),
  include_justification: z.boolean().default(true)
});

export type SuggestNextActionsParams = z.infer<typeof SuggestNextActionsSchema>;

interface SuggestedAction {
  rank: number;
  subcategory_id: string;
  subcategory_name: string;
  function_id: string;
  function_name: string;
  current_state: {
    implementation_level: string;
    maturity_score: number;
    gap_score: number;
  };
  estimated_effort: {
    hours: number;
    weeks: number;
    complexity: 'Low' | 'Medium' | 'High';
  };
  impact: {
    risk_reduction: number;
    maturity_improvement: number;
    compliance_impact: 'Low' | 'Medium' | 'High';
  };
  dependencies: {
    blocking: string[];
    recommended: string[];
    status: 'Ready' | 'Blocked' | 'Partial';
  };
  roi_score: number;
  justification: string;
  implementation_tips: string[];
}

interface CapacityAnalysis {
  total_capacity_hours: number;
  allocated_hours: number;
  remaining_hours: number;
  utilization_percentage: number;
  feasible_actions: number;
  stretch_actions: number;
}

interface NextActionsResult {
  success: boolean;
  profile_id: string;
  assessment_date: string;
  capacity_analysis: CapacityAnalysis;
  suggested_actions: SuggestedAction[];
  action_summary: {
    total_actions: number;
    ready_to_start: number;
    blocked_by_dependencies: number;
    total_effort_hours: number;
    expected_risk_reduction: number;
    expected_maturity_gain: number;
  };
  dependencies_to_address?: {
    subcategory_id: string;
    subcategory_name: string;
    blocking_count: number;
    reason: string;
  }[];
  timeline: {
    week: number;
    actions: string[];
    hours_allocated: number;
    milestones: string[];
  }[];
  recommendations: {
    immediate_priorities: string[];
    resource_optimization: string[];
    dependency_management: string[];
    success_factors: string[];
  };
}

// Effort estimation based on implementation level
const EFFORT_ESTIMATES: Record<string, any> = {
  'not_implemented': {
    base_hours: 40,
    complexity: 'High',
    variance: 0.3
  },
  'partially_implemented': {
    base_hours: 20,
    complexity: 'Medium',
    variance: 0.2
  },
  'largely_implemented': {
    base_hours: 10,
    complexity: 'Low',
    variance: 0.1
  },
  'fully_implemented': {
    base_hours: 2,
    complexity: 'Low',
    variance: 0.05
  }
};

// Function priorities for different optimization goals
const FUNCTION_PRIORITIES: Record<string, Record<string, number>> = {
  'quick_wins': {
    'GV': 0.8,
    'ID': 1.0,
    'PR': 0.9,
    'DE': 0.7,
    'RS': 0.8,
    'RC': 0.6
  },
  'risk_reduction': {
    'GV': 1.0,
    'ID': 0.9,
    'PR': 1.0,
    'DE': 0.8,
    'RS': 0.7,
    'RC': 0.6
  },
  'compliance': {
    'GV': 1.0,
    'ID': 0.8,
    'PR': 0.9,
    'DE': 0.7,
    'RS': 0.8,
    'RC': 0.7
  },
  'balanced': {
    'GV': 0.9,
    'ID': 0.9,
    'PR': 0.9,
    'DE': 0.8,
    'RS': 0.8,
    'RC': 0.7
  }
};

/**
 * Main function to suggest next actions
 */
export async function suggestNextActions(params: SuggestNextActionsParams): Promise<NextActionsResult> {
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
    
    // Calculate total capacity
    const totalCapacityHours = (params as any).capacity_hours_per_week * (params as any).time_horizon_weeks;
    
    // Get suggested actions from database
    const dbSuggestions = (db as any).getSuggestedActions((params as any).profile_id, totalCapacityHours);
    
    if (!dbSuggestions || (dbSuggestions as any).length === 0) {
      return createErrorResult('No actionable items found for this profile');
    }
    
    // Filter by focus area if specified
    let filteredSuggestions = dbSuggestions;
    if ((params as any).focus_area !== 'all') {
      const focusFunctionId = getFunctionId((params as any).focus_area);
      filteredSuggestions = (dbSuggestions as any).filter(
        (s: any) => (s as any).function_id === focusFunctionId
      );
    }
    
    // Process and enrich suggestions
    const suggestedActions: SuggestedAction[] = [];
    let allocatedHours = 0;
    
    for (const suggestion of filteredSuggestions) {
      // Check capacity
      if (allocatedHours + (suggestion as any).estimated_hours > totalCapacityHours * 1.2) {
        break;  // Stop if we exceed capacity by more than 20%
      }
      
      // Get dependencies if requested
      const dependencies = (params as any).include_dependencies
        ? await analyzeDependencies((suggestion as any).subcategory_id, (params as any).profile_id, db, framework)
        : { blocking: [], recommended: [], status: 'Ready' as const };
      
      // Calculate impact scores
      const impact = calculateImpact(suggestion, (params as any).optimization_goal);
      
      // Generate justification
      const justification = (params as any).include_justification
        ? generateJustification(suggestion, dependencies, impact, (params as any).optimization_goal)
        : (suggestion as any).justification || 'Recommended action';
      
      // Create action object
      const action: SuggestedAction = {
        rank: (suggestedActions as any).length + 1,
        subcategory_id: (suggestion as any).subcategory_id,
        subcategory_name: (suggestion as any).subcategory_name,
        function_id: (suggestion as any).function_id,
        function_name: getFunctionName((suggestion as any).function_id),
        current_state: {
          implementation_level: (suggestion as any).implementation_level,
          maturity_score: (suggestion as any).maturity_score || 0,
          gap_score: (suggestion as any).gap_score || 0
        },
        estimated_effort: {
          hours: (suggestion as any).estimated_hours,
          weeks: (Math as any).ceil((suggestion as any).estimated_hours / (params as any).capacity_hours_per_week),
          complexity: getComplexity((suggestion as any).implementation_level)
        },
        impact,
        dependencies,
        roi_score: (suggestion as any).roi_score || 0,
        justification,
        implementation_tips: generateImplementationTips(suggestion, framework)
      };
      
      (suggestedActions as any).push(action);
      allocatedHours += (suggestion as any).estimated_hours;
    }
    
    // Create capacity analysis
    const capacityAnalysis: CapacityAnalysis = {
      total_capacity_hours: totalCapacityHours,
      allocated_hours: allocatedHours,
      remaining_hours: (Math as any).max(0, totalCapacityHours - allocatedHours),
      utilization_percentage: (Math as any).round((allocatedHours / totalCapacityHours) * 100),
      feasible_actions: (suggestedActions as any).filter(a => (a as any).dependencies.status === 'Ready').length,
      stretch_actions: (suggestedActions as any).filter(a => (a as any).dependencies.status === 'Partial').length
    };
    
    // Create action summary
    const actionSummary = {
      total_actions: (suggestedActions as any).length,
      ready_to_start: (suggestedActions as any).filter(a => (a as any).dependencies.status === 'Ready').length,
      blocked_by_dependencies: (suggestedActions as any).filter(a => (a as any).dependencies.status === 'Blocked').length,
      total_effort_hours: allocatedHours,
      expected_risk_reduction: (suggestedActions as any).reduce((sum, a) => sum + (a as any).impact.risk_reduction, 0),
      expected_maturity_gain: (suggestedActions as any).reduce((sum, a) => sum + (a as any).impact.maturity_improvement, 0)
    };
    
    // Identify dependencies to address
    const dependenciesToAddress = (params as any).include_dependencies
      ? identifyBlockingDependencies(suggestedActions, db)
      : undefined;
    
    // Create timeline
    const timeline = createTimeline(
      suggestedActions,
      (params as any).capacity_hours_per_week,
      (params as any).time_horizon_weeks
    );
    
    // Generate recommendations
    const recommendations = generateRecommendations(
      suggestedActions,
      capacityAnalysis,
      params
    );
    
    return {
      success: true,
      profile_id: (params as any).profile_id,
      assessment_date: new Date().toISOString(),
      capacity_analysis: capacityAnalysis,
      suggested_actions: suggestedActions,
      action_summary: actionSummary,
      dependencies_to_address: dependenciesToAddress,
      timeline,
      recommendations
    };
    
  } catch (error) {
    (logger as any).error('Suggest next actions error:', error);
    return createErrorResult(
      error instanceof Error ? (error as any).message : 'Unknown error occurred'
    );
  }
}

/**
 * Analyze dependencies for a subcategory
 */
async function analyzeDependencies(
  subcategoryId: string,
  profileId: string,
  db: any,
  _framework: any
): Promise<any> {
  // Get formal dependencies from database
  const dependencies = (db as any).getSubcategoryDependencies(subcategoryId);
  
  // Check implementation status of dependencies
  const assessments = (db as any).getProfileAssessments(profileId);
  const implementedMap = new Map(
    (assessments as any).map((a: any) => [(a as any).subcategory_id, (a as any).implementation_level])
  );
  
  const blocking: string[] = [];
  const recommended: string[] = [];
  
  for (const dep of dependencies) {
    const implLevel = (implementedMap as any).get((dep as any).depends_on_subcategory_id);
    
    if (!implLevel || implLevel === 'not_implemented') {
      if ((dep as any).dependency_strength >= 8) {
        (blocking as any).push((dep as any).depends_on_subcategory_id);
      } else {
        (recommended as any).push((dep as any).depends_on_subcategory_id);
      }
    }
  }
  
  // Also check function-level dependencies
  const functionId = (subcategoryId as any).substring(0, 2);
  const functionDeps = FUNCTION_DEPENDENCIES[functionId] || [];
  
  for (const depFunc of functionDeps) {
    // Check if function has any implementation
    const funcImplemented = (assessments as any).some((a: any) => 
      (a as any).subcategory_id.startsWith(depFunc) && 
      (a as any).implementation_level !== 'not_implemented'
    );
    
    if (!funcImplemented) {
      (recommended as any).push(`${depFunc} function foundation`);
    }
  }
  
  const status = (blocking as any).length > 0 ? 'Blocked' :
                 (recommended as any).length > 0 ? 'Partial' : 'Ready';
  
  return { blocking, recommended, status };
}

/**
 * Calculate impact of implementing a subcategory
 */
function calculateImpact(suggestion: any, optimizationGoal: string): any {
  const priorities = FUNCTION_PRIORITIES[optimizationGoal as keyof typeof FUNCTION_PRIORITIES];
  const functionPriority = priorities?.[(suggestion as any).function_id] || 1.0;
  
  // Risk reduction based on gap score and function priority
  const riskReduction = ((suggestion as any).gap_score / 100) * functionPriority * 10;
  
  // Maturity improvement
  const currentMaturity = (suggestion as any).maturity_score || 0;
  const targetMaturity = 5;
  const maturityImprovement = ((targetMaturity - currentMaturity) / 5) * 5;
  
  // Compliance impact based on function
  const complianceMap: Record<string, 'Low' | 'Medium' | 'High'> = {
    'GV': 'High',
    'ID': 'Medium',
    'PR': 'High',
    'DE': 'Medium',
    'RS': 'Medium',
    'RC': 'Low'
  };
  
  return {
    risk_reduction: (Math as any).round(riskReduction * 10) / 10,
    maturity_improvement: (Math as any).round(maturityImprovement * 10) / 10,
    compliance_impact: complianceMap[(suggestion as any).function_id] || 'Medium'
  };
}

/**
 * Generate justification for an action
 */
function generateJustification(
  suggestion: any,
  dependencies: any,
  impact: any,
  optimizationGoal: string
): string {
  const justifications: string[] = [];
  
  // Primary justification based on existing data
  if ((suggestion as any).justification) {
    (justifications as any).push((suggestion as any).justification);
  }
  
  // Goal-specific justification
  switch (optimizationGoal) {
    case 'quick_wins':
      if ((suggestion as any).estimated_hours <= 20) {
        (justifications as any).push(`Quick implementation (${(suggestion as any).estimated_hours}h) with immediate value`);
      }
      break;
      
    case 'risk_reduction':
      if ((impact as any).risk_reduction >= 5) {
        (justifications as any).push(`High risk reduction potential (${(impact as any).risk_reduction}/10)`);
      }
      break;
      
    case 'compliance':
      if ((impact as any).compliance_impact === 'High') {
        (justifications as any).push('Critical for regulatory compliance');
      }
      break;
      
    case 'balanced':
      if ((suggestion as any).roi_score >= 2) {
        (justifications as any).push(`Excellent ROI score (${(suggestion as any).roi_score.toFixed(2)})`);
      }
      break;
  }
  
  // Dependency status
  if ((dependencies as any).status === 'Ready') {
    (justifications as any).push('No blocking dependencies - ready to start');
  } else if ((dependencies as any).status === 'Blocked') {
    (justifications as any).push(`Blocked by ${(dependencies as any).blocking.length} dependencies`);
  }
  
  // Gap severity
  if ((suggestion as any).gap_score >= 80) {
    (justifications as any).push('Critical gap requiring immediate attention');
  }
  
  return (justifications as any).join('. ') || 'Recommended based on assessment';
}

/**
 * Generate implementation tips
 */
function generateImplementationTips(suggestion: any, framework: any): string[] {
  const tips: string[] = [];
  const subcategory = (framework as any).getSubcategory((suggestion as any).subcategory_id);
  
  // Function-specific tips
  const functionTips: Record<string, string[]> = {
    'GV': [
      'Start with policy documentation',
      'Engage leadership for buy-in',
      'Establish clear roles and responsibilities'
    ],
    'ID': [
      'Begin with asset inventory',
      'Use automated discovery tools',
      'Document data flows and dependencies'
    ],
    'PR': [
      'Implement in phases to minimize disruption',
      'Start with high-risk areas',
      'Ensure user training is included'
    ],
    'DE': [
      'Deploy monitoring incrementally',
      'Establish baselines before alerting',
      'Integrate with existing tools where possible'
    ],
    'RS': [
      'Document procedures clearly',
      'Conduct tabletop exercises',
      'Establish communication channels'
    ],
    'RC': [
      'Test recovery procedures regularly',
      'Document lessons learned',
      'Maintain offline backups'
    ]
  };
  
  const funcTips = functionTips[(suggestion as any).function_id];
  if (funcTips) {
    (tips as any).push(...(funcTips as any).slice(0, 2));
  }
  
  // Implementation level specific tips
  if ((suggestion as any).implementation_level === 'not_implemented') {
    (tips as any).push('Consider starting with a pilot or proof of concept');
  } else if ((suggestion as any).implementation_level === 'partially_implemented') {
    (tips as any).push('Build on existing foundation');
    (tips as any).push('Address identified gaps systematically');
  }
  
  // Add implementation examples if available
  if (subcategory && 'implementation_examples' in subcategory && 
      Array.isArray((subcategory as any).implementation_examples) && 
      (subcategory as any).implementation_examples.length > 0) {
    (tips as any).push(`Reference: ${(subcategory as any).implementation_examples[0]}`);
  }
  
  return (tips as any).slice(0, 3);
}

/**
 * Identify blocking dependencies
 */
function identifyBlockingDependencies(actions: SuggestedAction[], _db: any): any[] {
  const blockingMap = new Map<string, any>();
  
  for (const action of actions) {
    for (const blockingId of (action as any).dependencies.blocking) {
      if (!(blockingMap as any).has(blockingId)) {
        (blockingMap as any).set(blockingId, {
          subcategory_id: blockingId,
          subcategory_name: blockingId,  // Would need framework lookup for real name
          blocking_count: 0,
          reason: 'Prerequisite for other actions'
        });
      }
      (blockingMap as any).get(blockingId).blocking_count++;
    }
  }
  
  // Sort by blocking count
  const result = (Array as any).from((blockingMap as any).values());
  (result as any).sort((a, b) => (b as any).blocking_count - (a as any).blocking_count);
  
  return (result as any).slice(0, 5);  // Top 5 blockers
}

/**
 * Create implementation timeline
 */
function createTimeline(
  actions: SuggestedAction[],
  weeklyCapacity: number,
  horizonWeeks: number
): any[] {
  const timeline: any[] = [];
  let currentWeek = 1;
  let weekHours = 0;
  let weekActions: string[] = [];
  
  for (const action of actions) {
    // Check if action fits in current week
    if (weekHours + (action as any).estimated_effort.hours > weeklyCapacity) {
      // Save current week
      if ((weekActions as any).length > 0) {
        (timeline as any).push({
          week: currentWeek,
          actions: [...weekActions],
          hours_allocated: weekHours,
          milestones: generateWeeklyMilestones(weekActions, currentWeek)
        });
      }
      
      // Start new week
      currentWeek++;
      weekHours = 0;
      weekActions = [];
      
      if (currentWeek > horizonWeeks) {
        break;
      }
    }
    
    // Add action to current week
    (weekActions as any).push(`${(action as any).subcategory_id}: ${(action as any).subcategory_name}`);
    weekHours += (action as any).estimated_effort.hours;
  }
  
  // Add final week
  if ((weekActions as any).length > 0 && currentWeek <= horizonWeeks) {
    (timeline as any).push({
      week: currentWeek,
      actions: weekActions,
      hours_allocated: weekHours,
      milestones: generateWeeklyMilestones(weekActions, currentWeek)
    });
  }
  
  return timeline;
}

/**
 * Generate weekly milestones
 */
function generateWeeklyMilestones(actions: string[], week: number): string[] {
  const milestones: string[] = [];
  
  if (week === 1) {
    (milestones as any).push('Implementation kickoff');
  }
  
  if ((actions as any).some(a => (a as any).includes('GV'))) {
    (milestones as any).push('Governance framework update');
  }
  
  if ((actions as any).length >= 3) {
    (milestones as any).push(`Complete ${(actions as any).length} implementations`);
  }
  
  return milestones;
}

/**
 * Generate recommendations
 */
function generateRecommendations(
  actions: SuggestedAction[],
  capacity: CapacityAnalysis,
  params: SuggestNextActionsParams
): any {
  const recommendations = {
    immediate_priorities: [] as string[],
    resource_optimization: [] as string[],
    dependency_management: [] as string[],
    success_factors: [] as string[]
  };
  
  // Immediate priorities
  const readyActions = (actions as any).filter(a => (a as any).dependencies.status === 'Ready');
  if ((readyActions as any).length > 0) {
    const firstAction = readyActions[0];
    if (firstAction) {
      (recommendations as any).immediate_priorities.push(
        `Start with ${(firstAction as any).subcategory_id}: ${(firstAction as any).subcategory_name}`
      );
      
      if ((firstAction as any).estimated_effort.complexity === 'Low') {
        (recommendations as any).immediate_priorities.push(
          'Low complexity - ideal for building momentum'
        );
      }
    }
  }
  
  // Resource optimization
  if ((capacity as any).utilization_percentage > 90) {
    (recommendations as any).resource_optimization.push(
      'High utilization - consider increasing capacity or extending timeline'
    );
  } else if ((capacity as any).utilization_percentage < 60) {
    (recommendations as any).resource_optimization.push(
      'Capacity available - consider accelerating implementation'
    );
  }
  
  if ((capacity as any).remaining_hours > 20) {
    (recommendations as any).resource_optimization.push(
      `${(capacity as any).remaining_hours}h available for additional quick wins`
    );
  }
  
  // Dependency management
  const blockedActions = (actions as any).filter(a => (a as any).dependencies.status === 'Blocked');
  if ((blockedActions as any).length > 0) {
    (recommendations as any).dependency_management.push(
      `Address dependencies to unblock ${(blockedActions as any).length} actions`
    );
  }
  
  // Success factors
  (recommendations as any).success_factors.push(
    'Maintain regular progress tracking',
    'Adjust priorities based on learnings'
  );
  
  if ((params as any).optimization_goal === 'quick_wins') {
    (recommendations as any).success_factors.push(
      'Celebrate early wins to build momentum'
    );
  } else if ((params as any).optimization_goal === 'risk_reduction') {
    (recommendations as any).success_factors.push(
      'Focus on highest risk areas first'
    );
  }
  
  return recommendations;
}

// Helper functions

function getFunctionId(focusArea: string): string {
  const mapping: Record<string, string> = {
    'govern': 'GV',
    'identify': 'ID',
    'protect': 'PR',
    'detect': 'DE',
    'respond': 'RS',
    'recover': 'RC'
  };
  return mapping[focusArea] || '';
}

function getFunctionName(functionId: string): string {
  const names: Record<string, string> = {
    'GV': 'Govern',
    'ID': 'Identify',
    'PR': 'Protect',
    'DE': 'Detect',
    'RS': 'Respond',
    'RC': 'Recover'
  };
  return names[functionId] || functionId;
}

function getComplexity(implementationLevel: string): 'Low' | 'Medium' | 'High' {
  const effort = EFFORT_ESTIMATES[implementationLevel];
  return effort?.complexity || 'Medium';
}

// Function dependencies
const FUNCTION_DEPENDENCIES: Record<string, string[]> = {
  'GV': [],
  'ID': ['GV'],
  'PR': ['GV', 'ID'],
  'DE': ['ID', 'PR'],
  'RS': ['DE', 'PR'],
  'RC': ['RS', 'PR']
};

/**
 * Create error result
 */
function createErrorResult(message: string): NextActionsResult {
  return {
    success: false,
    profile_id: '',
    assessment_date: new Date().toISOString(),
    capacity_analysis: {
      total_capacity_hours: 0,
      allocated_hours: 0,
      remaining_hours: 0,
      utilization_percentage: 0,
      feasible_actions: 0,
      stretch_actions: 0
    },
    suggested_actions: [],
    action_summary: {
      total_actions: 0,
      ready_to_start: 0,
      blocked_by_dependencies: 0,
      total_effort_hours: 0,
      expected_risk_reduction: 0,
      expected_maturity_gain: 0
    },
    timeline: [],
    recommendations: {
      immediate_priorities: [message],
      resource_optimization: [],
      dependency_management: [],
      success_factors: []
    }
  };
}