/**
 * Create Implementation Plan Tool - Generate phased implementation roadmap
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

// Input schema for the tool
export const CreateImplementationPlanSchema = z.object({
  analysis_id: z.string().min(1),
  timeline_months: z.number().min(1).max(36),
  available_resources: z.number().min(1).max(100),
  plan_name: z.string().optional(),
  prioritization_strategy: z.enum(['risk_based', 'quick_wins', 'balanced', 'dependencies_first']).default('balanced'),
  phase_duration: z.number().min(1).max(6).default(3),
  include_dependencies: z.boolean().default(true),
  include_milestones: z.boolean().default(true)
});

export type CreateImplementationPlanParams = z.infer<typeof CreateImplementationPlanSchema>;

interface Phase {
  id: string;
  phase_number: number;
  phase_name: string;
  start_month: number;
  end_month: number;
  effort_hours: number;
  resource_count: number;
  items: PhaseItem[];
  milestones: Milestone[];
  status: string;
}

interface PhaseItem {
  id: string;
  subcategory_id: string;
  subcategory_name: string;
  priority_rank: number;
  effort_hours: number;
  dependencies: string[];
  prerequisite_items: string[];
  status: string;
}

interface Milestone {
  name: string;
  target_month: number;
  success_criteria: string;
  deliverables: string[];
}

interface ImplementationPlanResult {
  success: boolean;
  plan_id: string;
  plan_name: string;
  timeline_months: number;
  available_resources: number;
  total_phases: number;
  total_effort_hours: number;
  estimated_cost: number;
  phases: Phase[];
  dependency_graph?: {
    nodes: any[];
    edges: any[];
    critical_path: string[];
    has_cycle: boolean;
  };
  resource_allocation: {
    phase_number: number;
    resources_needed: number;
    workload_percentage: number;
    bottlenecks: string[];
  }[];
  milestones?: Milestone[];
  recommendations: {
    critical_dependencies: string[];
    resource_constraints: string[];
    risk_factors: string[];
    success_factors: string[];
  };
}

// Note: Dependency types and function dependencies are stored for future use
// They can be uncommented and utilized when dependency resolution is expanded

/**
 * Main function to create implementation plan
 */
export async function createImplementationPlan(params: CreateImplementationPlanParams): Promise<ImplementationPlanResult> {
  const db = getDatabase();
  const framework = getFrameworkLoader();
  
  try {
    // Ensure framework is loaded
    if (!framework.isLoaded()) {
      await framework.load();
    }
    
    // Get gap analysis items
    const gapItems = db.getGapAnalysisItems(params.analysis_id);
    
    if (!gapItems || gapItems.length === 0) {
      return createErrorResult('No gap analysis items found');
    }
    
    // Extract profile ID from first gap item
    const profileId = gapItems[0].current_profile_id || gapItems[0].profile_id;
    if (!profileId) {
      return createErrorResult('Unable to determine profile ID from gap analysis');
    }
    
    // Build dependency graph if requested
    const subcategoryIds = gapItems.map((item: any) => item.subcategory_id);
    const dependencyGraph = params.include_dependencies
      ? db.calculateDependencyGraph(subcategoryIds)
      : null;
    
    // Check for cycles
    if (dependencyGraph?.hasCycle) {
      logger.warn('Dependency cycle detected in implementation plan');
    }
    
    // Sort items based on strategy
    const sortedItems = sortItemsByStrategy(
      gapItems,
      params.prioritization_strategy,
      dependencyGraph
    );
    
    // Calculate phases
    const phases = calculatePhases(
      sortedItems,
      params.timeline_months,
      params.available_resources,
      params.phase_duration,
      dependencyGraph
    );
    
    // Calculate total effort
    const totalEffortHours = phases.reduce(
      (sum, phase) => sum + phase.effort_hours, 0
    );
    
    // Estimate cost (assuming $125/hour average rate)
    const estimatedCost = totalEffortHours * 125;
    
    // Generate milestones if requested
    const milestones = params.include_milestones
      ? generateMilestones(phases, params.timeline_months)
      : undefined;
    
    // Calculate resource allocation
    const resourceAllocation = calculateResourceAllocation(
      phases,
      params.available_resources
    );
    
    // Generate recommendations
    const recommendations = generateRecommendations(
      phases,
      dependencyGraph,
      resourceAllocation,
      params
    );
    
    // Create plan in database
    const planId = uuidv4();
    const planName = params.plan_name || 
      `Implementation Plan - ${new Date().toISOString().split('T')[0]}`;
    
    db.createImplementationPlan({
      id: planId,
      gap_analysis_id: params.analysis_id,
      profile_id: profileId,
      plan_name: planName,
      timeline_months: params.timeline_months,
      available_resources: String(params.available_resources),
      total_phases: phases.length,
      total_effort_hours: totalEffortHours,
      estimated_cost: estimatedCost,
      status: 'draft'
    });
    
    // Save phases and items
    for (const phase of phases) {
      db.createImplementationPhase({
        id: phase.id,
        plan_id: planId,
        phase_number: phase.phase_number,
        phase_name: phase.phase_name,
        start_month: phase.start_month,
        end_month: phase.end_month,
        effort_hours: phase.effort_hours,
        resource_count: phase.resource_count,
        status: phase.status
      });
      
      for (const item of phase.items) {
        db.createImplementationItem({
          id: item.id,
          phase_id: phase.id,
          subcategory_id: item.subcategory_id,
          priority_rank: item.priority_rank,
          effort_hours: item.effort_hours,
          dependencies: JSON.stringify(item.dependencies),
          status: item.status,
          completion_percentage: 0
        });
      }
    }
    
    return {
      success: true,
      plan_id: planId,
      plan_name: planName,
      timeline_months: params.timeline_months,
      available_resources: params.available_resources,
      total_phases: phases.length,
      total_effort_hours: totalEffortHours,
      estimated_cost: estimatedCost,
      phases,
      dependency_graph: dependencyGraph ? {
        nodes: subcategoryIds.map(id => ({
          id,
          name: gapItems.find((item: any) => item.subcategory_id === id)?.subcategory_name || id
        })),
        edges: dependencyGraph.dependencies,
        critical_path: dependencyGraph.topologicalOrder.slice(0, 10),
        has_cycle: dependencyGraph.hasCycle
      } : undefined,
      resource_allocation: resourceAllocation,
      milestones,
      recommendations
    };
    
  } catch (error) {
    logger.error('Create implementation plan error:', error);
    return createErrorResult(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * Sort items based on prioritization strategy
 */
function sortItemsByStrategy(
  items: any[],
  strategy: string,
  dependencyGraph: any
): any[] {
  const sorted = [...items];
  
  switch (strategy) {
    case 'risk_based':
      // Sort by risk score descending
      sorted.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
      break;
      
    case 'quick_wins':
      // Sort by effort ascending, then gap score descending
      sorted.sort((a, b) => {
        const effortDiff = (a.effort_score || 5) - (b.effort_score || 5);
        if (effortDiff !== 0) return effortDiff;
        return (b.gap_score || 0) - (a.gap_score || 0);
      });
      break;
      
    case 'dependencies_first':
      // Use topological order if available
      if (dependencyGraph?.topologicalOrder) {
        const orderMap = new Map(
          dependencyGraph.topologicalOrder.map((id: string, idx: number) => [id, idx])
        );
        sorted.sort((a, b) => {
          const orderA = orderMap.get(a.subcategory_id) ?? 999;
          const orderB = orderMap.get(b.subcategory_id) ?? 999;
          return (orderA as number) - (orderB as number);
        });
      }
      break;
      
    case 'balanced':
    default:
      // Balance between risk, effort, and dependencies
      sorted.sort((a, b) => {
        const scoreA = calculateBalancedScore(a, dependencyGraph);
        const scoreB = calculateBalancedScore(b, dependencyGraph);
        return scoreB - scoreA;
      });
      break;
  }
  
  return sorted;
}

/**
 * Calculate balanced prioritization score
 */
function calculateBalancedScore(item: any, dependencyGraph: any): number {
  const riskWeight = 0.4;
  const effortWeight = 0.3;
  const gapWeight = 0.3;
  
  const riskScore = (item.risk_score || 0) / 10;
  const effortScore = (10 - (item.effort_score || 5)) / 10;
  const gapScore = (item.gap_score || 0) / 100;
  
  let score = (riskScore * riskWeight) + (effortScore * effortWeight) + (gapScore * gapWeight);
  
  // Boost score if item has no dependencies
  if (dependencyGraph) {
    const hasDependencies = dependencyGraph.dependencies.some(
      (dep: any) => dep.from_id === item.subcategory_id
    );
    if (!hasDependencies) {
      score *= 1.2;
    }
  }
  
  return score;
}

/**
 * Calculate implementation phases
 */
function calculatePhases(
  items: any[],
  timelineMonths: number,
  availableResources: number,
  phaseDuration: number,
  dependencyGraph: any
): Phase[] {
  const phases: Phase[] = [];
  const numPhases = Math.ceil(timelineMonths / phaseDuration);
  const hoursPerResource = 160; // Monthly hours per resource
  const capacityPerPhase = availableResources * phaseDuration * hoursPerResource;
  
  // Initialize phases
  for (let i = 0; i < numPhases; i++) {
    phases.push({
      id: uuidv4(),
      phase_number: i + 1,
      phase_name: getPhaseName(i + 1, numPhases),
      start_month: i * phaseDuration + 1,
      end_month: Math.min((i + 1) * phaseDuration, timelineMonths),
      effort_hours: 0,
      resource_count: availableResources,
      items: [],
      milestones: [],
      status: 'pending'
    });
  }
  
  // Distribute items across phases
  const assignedItems = new Set<string>();
  
  for (const item of items) {
    // Find appropriate phase considering dependencies
    let targetPhase = 0;
    
    if (dependencyGraph) {
      // Check if dependencies are already assigned
      const deps = dependencyGraph.dependencies.filter(
        (dep: any) => dep.from_id === item.subcategory_id
      );
      
      for (const dep of deps) {
        const depPhase = phases.findIndex(p => 
          p.items.some(i => i.subcategory_id === dep.to_id)
        );
        if (depPhase >= 0) {
          targetPhase = Math.max(targetPhase, depPhase + 1);
        }
      }
    }
    
    // Find phase with capacity
    while (targetPhase < phases.length) {
      const phase = phases[targetPhase];
      if (!phase) break;
      const itemEffort = estimateItemEffort(item);
      
      if (phase.effort_hours + itemEffort <= capacityPerPhase) {
        phase.items.push({
          id: uuidv4(),
          subcategory_id: item.subcategory_id,
          subcategory_name: item.subcategory_name || item.subcategory_id,
          priority_rank: item.priority_rank || 999,
          effort_hours: itemEffort,
          dependencies: item.dependencies || [],
          prerequisite_items: [],
          status: 'pending'
        });
        
        phase.effort_hours += itemEffort;
        assignedItems.add(item.subcategory_id);
        break;
      }
      
      targetPhase++;
    }
    
    // If no phase has capacity, add to last phase
    if (!assignedItems.has(item.subcategory_id)) {
      const lastPhase = phases[phases.length - 1];
      if (!lastPhase) continue;
      const itemEffort = estimateItemEffort(item);
      
      lastPhase.items.push({
        id: uuidv4(),
        subcategory_id: item.subcategory_id,
        subcategory_name: item.subcategory_name || item.subcategory_id,
        priority_rank: item.priority_rank || 999,
        effort_hours: itemEffort,
        dependencies: item.dependencies || [],
        prerequisite_items: [],
        status: 'pending'
      });
      
      lastPhase.effort_hours += itemEffort;
    }
  }
  
  return phases;
}

/**
 * Get phase name based on position
 */
function getPhaseName(phaseNumber: number, totalPhases: number): string {
  if (phaseNumber === 1) {
    return 'Foundation & Quick Wins';
  } else if (phaseNumber === 2) {
    return 'Core Implementation';
  } else if (phaseNumber === totalPhases) {
    return 'Optimization & Maturity';
  } else if (phaseNumber === totalPhases - 1) {
    return 'Advanced Controls';
  } else {
    return `Phase ${phaseNumber}: Capability Building`;
  }
}

/**
 * Estimate effort hours for an item
 */
function estimateItemEffort(item: any): number {
  const baseEffort: Record<string, number> = {
    'not_implemented': 80,
    'partially_implemented': 40,
    'largely_implemented': 20,
    'fully_implemented': 5
  };
  
  const implLevel = item.current_implementation || item.implementation_level || 'not_implemented';
  let effort = baseEffort[implLevel] || 40;
  
  // Adjust based on function
  const functionId = item.subcategory_id.substring(0, 2);
  const functionMultiplier: Record<string, number> = {
    'GV': 1.2,  // Governance typically requires more effort
    'ID': 1.0,
    'PR': 1.1,
    'DE': 1.3,  // Detection tools require more setup
    'RS': 0.9,
    'RC': 0.8
  };
  
  effort *= functionMultiplier[functionId] || 1.0;
  
  return Math.round(effort);
}

/**
 * Generate milestones
 */
function generateMilestones(phases: Phase[], timelineMonths: number): Milestone[] {
  const milestones: Milestone[] = [];
  
  // Foundation milestone
  if (phases.length > 0) {
    milestones.push({
      name: 'Foundation Complete',
      target_month: phases[0]?.end_month || 3,
      success_criteria: 'Core governance and identification controls implemented',
      deliverables: [
        'Risk management framework established',
        'Asset inventory complete',
        'Basic policies documented'
      ]
    });
  }
  
  // Mid-point milestone
  const midPoint = Math.floor(phases.length / 2);
  if (midPoint > 0 && midPoint < phases.length) {
    milestones.push({
      name: 'Core Capabilities Operational',
      target_month: phases[midPoint]?.end_month || 6,
      success_criteria: '50% of identified gaps addressed',
      deliverables: [
        'Protection controls implemented',
        'Detection capabilities operational',
        'Initial response procedures tested'
      ]
    });
  }
  
  // Final milestone
  milestones.push({
    name: 'Target Maturity Achieved',
    target_month: timelineMonths,
    success_criteria: 'All planned implementations complete',
    deliverables: [
      'All critical gaps closed',
      'Continuous improvement process established',
      'Metrics and reporting operational'
    ]
  });
  
  return milestones;
}

/**
 * Calculate resource allocation
 */
function calculateResourceAllocation(
  phases: Phase[],
  availableResources: number
): any[] {
  const hoursPerResource = 160;
  const allocation = [];
  
  for (const phase of phases) {
    const monthlyHours = phase.effort_hours / 
      (phase.end_month - phase.start_month + 1);
    const resourcesNeeded = Math.ceil(monthlyHours / hoursPerResource);
    const workloadPercentage = (resourcesNeeded / availableResources) * 100;
    
    const bottlenecks = [];
    if (workloadPercentage > 100) {
      bottlenecks.push('Insufficient resources - consider extending timeline');
    } else if (workloadPercentage > 80) {
      bottlenecks.push('High resource utilization - limited flexibility');
    }
    
    allocation.push({
      phase_number: phase.phase_number,
      resources_needed: resourcesNeeded,
      workload_percentage: Math.round(workloadPercentage),
      bottlenecks
    });
  }
  
  return allocation;
}

/**
 * Generate recommendations
 */
function generateRecommendations(
  phases: Phase[],
  dependencyGraph: any,
  resourceAllocation: any[],
  params: CreateImplementationPlanParams
): any {
  const recommendations = {
    critical_dependencies: [] as string[],
    resource_constraints: [] as string[],
    risk_factors: [] as string[],
    success_factors: [] as string[]
  };
  
  // Critical dependencies
  if (dependencyGraph?.hasCycle) {
    recommendations.critical_dependencies.push(
      'Circular dependencies detected - review and resolve before implementation'
    );
  }
  
  if (dependencyGraph?.topologicalOrder) {
    const critical = dependencyGraph.topologicalOrder.slice(0, 3);
    recommendations.critical_dependencies.push(
      `Priority items: ${critical.join(', ')}`
    );
  }
  
  // Resource constraints
  const overloadedPhases = resourceAllocation.filter(a => a.workload_percentage > 80);
  if (overloadedPhases.length > 0) {
    recommendations.resource_constraints.push(
      `${overloadedPhases.length} phases have >80% resource utilization`
    );
    recommendations.resource_constraints.push(
      'Consider adding resources or extending timeline'
    );
  }
  
  // Risk factors
  if (params.timeline_months < 12) {
    recommendations.risk_factors.push(
      'Aggressive timeline - ensure adequate change management'
    );
  }
  
  if (phases.some(p => p.items.length > 20)) {
    recommendations.risk_factors.push(
      'Large number of concurrent implementations - consider phased approach'
    );
  }
  
  // Success factors
  recommendations.success_factors.push(
    'Establish clear governance and oversight',
    'Regular progress reviews and milestone tracking',
    'Maintain flexibility to adjust based on learnings'
  );
  
  if (params.prioritization_strategy === 'quick_wins') {
    recommendations.success_factors.push(
      'Early wins will build momentum and stakeholder buy-in'
    );
  }
  
  return recommendations;
}

/**
 * Create error result
 */
function createErrorResult(message: string): ImplementationPlanResult {
  return {
    success: false,
    plan_id: '',
    plan_name: 'Error',
    timeline_months: 0,
    available_resources: 0,
    total_phases: 0,
    total_effort_hours: 0,
    estimated_cost: 0,
    phases: [],
    resource_allocation: [],
    recommendations: {
      critical_dependencies: [message],
      resource_constraints: [],
      risk_factors: [],
      success_factors: []
    }
  };
}