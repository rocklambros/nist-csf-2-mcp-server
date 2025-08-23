/**
 * Estimate Implementation Cost Tool - Calculate detailed cost breakdown
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

// Input schema for the tool
export const EstimateImplementationCostSchema = z.object({
  subcategory_ids: z.array(z.string()).min(1),
  organization_size: z.enum(['small', 'medium', 'large', 'enterprise']),
  include_ongoing_costs: z.boolean().default(true),
  include_risk_adjusted: z.boolean().default(true),
  currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
  labor_rate_override: z.number().optional(),
  include_contingency: z.boolean().default(true)
});

export type EstimateImplementationCostParams = z.infer<typeof EstimateImplementationCostSchema>;

interface SubcategoryCost {
  subcategory_id: string;
  subcategory_name: string;
  function_id: string;
  labor_cost: number;
  tools_cost: number;
  training_cost: number;
  consulting_cost: number;
  total_cost: number;
  effort_hours: number;
  complexity_factor: number;
  risk_factor: number;
}

interface CostBreakdown {
  category: string;
  one_time_cost: number;
  annual_cost: number;
  three_year_total: number;
  percentage_of_total: number;
  items: {
    description: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
  }[];
}

interface CostEstimateResult {
  success: boolean;
  organization_size: string;
  currency: string;
  subcategory_count: number;
  total_effort_hours: number;
  average_labor_rate: number;
  cost_summary: {
    labor_cost: number;
    tools_cost: number;
    training_cost: number;
    consulting_cost: number;
    contingency: number;
    total_one_time: number;
    total_annual: number;
    three_year_tco: number;
  };
  cost_by_function: {
    function_id: string;
    function_name: string;
    subcategory_count: number;
    total_cost: number;
    percentage_of_total: number;
  }[];
  cost_breakdown: CostBreakdown[];
  subcategory_costs: SubcategoryCost[];
  risk_adjusted_costs?: {
    best_case: number;
    expected: number;
    worst_case: number;
    confidence_level: number;
  };
  ongoing_costs?: {
    annual_maintenance: number;
    annual_licensing: number;
    annual_training: number;
    annual_auditing: number;
    total_annual: number;
  };
  cost_optimization: {
    potential_savings: string[];
    phasing_recommendations: string[];
    bundling_opportunities: string[];
  };
}

// Cost models by organization size
const COST_MODELS = {
  small: {
    labor_rate: 100,
    overhead_multiplier: 1.2,
    tool_budget_multiplier: 0.8,
    training_budget_per_person: 1500,
    consulting_percentage: 0.2
  },
  medium: {
    labor_rate: 125,
    overhead_multiplier: 1.3,
    tool_budget_multiplier: 1.0,
    training_budget_per_person: 2000,
    consulting_percentage: 0.25
  },
  large: {
    labor_rate: 150,
    overhead_multiplier: 1.4,
    tool_budget_multiplier: 1.2,
    training_budget_per_person: 2500,
    consulting_percentage: 0.3
  },
  enterprise: {
    labor_rate: 175,
    overhead_multiplier: 1.5,
    tool_budget_multiplier: 1.5,
    training_budget_per_person: 3000,
    consulting_percentage: 0.35
  }
};

// Tool costs by function
const TOOL_COSTS: Record<string, any> = {
  'GV': {
    base_cost: 5000,
    tools: ['GRC Platform', 'Policy Management', 'Risk Register'],
    annual_license: 2000
  },
  'ID': {
    base_cost: 15000,
    tools: ['Asset Discovery', 'Vulnerability Scanner', 'Threat Intelligence'],
    annual_license: 8000
  },
  'PR': {
    base_cost: 20000,
    tools: ['PAM Solution', 'DLP', 'Encryption Tools', 'MFA'],
    annual_license: 10000
  },
  'DE': {
    base_cost: 30000,
    tools: ['SIEM', 'EDR', 'Network Monitoring', 'Log Management'],
    annual_license: 15000
  },
  'RS': {
    base_cost: 10000,
    tools: ['Incident Response Platform', 'Forensics Tools', 'Communication System'],
    annual_license: 5000
  },
  'RC': {
    base_cost: 8000,
    tools: ['Backup Solution', 'DR Tools', 'Business Continuity Software'],
    annual_license: 4000
  }
};

// Complexity factors for different subcategories
const COMPLEXITY_FACTORS: Record<string, number> = {
  'GV.OC': 1.5,  // Organizational Context - high complexity
  'GV.RM': 1.4,  // Risk Management Strategy
  'ID.AM': 1.3,  // Asset Management
  'PR.AC': 1.4,  // Identity Management and Access Control
  'DE.CM': 1.5,  // Security Continuous Monitoring
  'RS.CO': 1.2,  // Communications
  'RC.RP': 1.1   // Recovery Planning
  // Default is 1.0 for others
};

/**
 * Main function to estimate implementation cost
 */
export async function estimateImplementationCost(params: EstimateImplementationCostParams): Promise<CostEstimateResult> {
  const db = getDatabase();
  const framework = getFrameworkLoader();
  
  try {
    // Ensure framework is loaded
    if (!framework.isLoaded()) {
      await framework.load();
    }
    
    // Get cost model for organization size
    const costModel = COST_MODELS[params.organization_size];
    const laborRate = params.labor_rate_override || costModel.labor_rate;
    
    // Calculate costs for each subcategory
    const subcategoryCosts: SubcategoryCost[] = [];
    
    for (const subcategoryId of params.subcategory_ids) {
      // Check if we have a cached estimate
      let estimate = db.getCostEstimate(subcategoryId, params.organization_size);
      
      if (!estimate) {
        // Calculate new estimate
        estimate = calculateSubcategoryCost(
          subcategoryId,
          params.organization_size,
          laborRate,
          framework
        );
        
        // Save to database
        db.createCostEstimate({
          id: uuidv4(),
          subcategory_id: subcategoryId,
          organization_size: params.organization_size,
          labor_cost: estimate.labor_cost,
          tools_cost: estimate.tools_cost,
          training_cost: estimate.training_cost,
          total_cost: estimate.total_cost,
          effort_hours: estimate.effort_hours
        });
      }
      
      const subcategory = framework.getSubcategory(subcategoryId);
      
      subcategoryCosts.push({
        subcategory_id: subcategoryId,
        subcategory_name: (subcategory && 'name' in subcategory ? subcategory.name : subcategoryId) as string,
        function_id: subcategoryId.substring(0, 2),
        labor_cost: estimate.labor_cost,
        tools_cost: estimate.tools_cost,
        training_cost: estimate.training_cost,
        consulting_cost: estimate.labor_cost * costModel.consulting_percentage,
        total_cost: estimate.total_cost,
        effort_hours: estimate.effort_hours,
        complexity_factor: COMPLEXITY_FACTORS[subcategoryId] || 1.0,
        risk_factor: calculateRiskFactor(subcategoryId)
      });
    }
    
    // Calculate summary
    const summary = calculateCostSummary(subcategoryCosts, params);
    
    // Calculate cost by function
    const costByFunction = calculateCostByFunction(subcategoryCosts);
    
    // Generate detailed breakdown
    const costBreakdown = generateCostBreakdown(
      subcategoryCosts,
      params.organization_size,
      laborRate
    );
    
    // Calculate risk-adjusted costs if requested
    const riskAdjustedCosts = params.include_risk_adjusted
      ? calculateRiskAdjustedCosts(summary.total_one_time)
      : undefined;
    
    // Calculate ongoing costs if requested
    const ongoingCosts = params.include_ongoing_costs
      ? calculateOngoingCosts(subcategoryCosts, params.organization_size)
      : undefined;
    
    // Generate optimization recommendations
    const costOptimization = generateOptimizationRecommendations(
      subcategoryCosts,
      params.organization_size
    );
    
    return {
      success: true,
      organization_size: params.organization_size,
      currency: params.currency,
      subcategory_count: params.subcategory_ids.length,
      total_effort_hours: subcategoryCosts.reduce((sum, c) => sum + c.effort_hours, 0),
      average_labor_rate: laborRate,
      cost_summary: summary,
      cost_by_function: costByFunction,
      cost_breakdown: costBreakdown,
      subcategory_costs: subcategoryCosts,
      risk_adjusted_costs: riskAdjustedCosts,
      ongoing_costs: ongoingCosts,
      cost_optimization: costOptimization
    };
    
  } catch (error) {
    logger.error('Estimate implementation cost error:', error);
    return createErrorResult(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * Calculate cost for a single subcategory
 */
function calculateSubcategoryCost(
  subcategoryId: string,
  organizationSize: string,
  laborRate: number,
  _framework: any
): any {
  const functionId = subcategoryId.substring(0, 2);
  const costModel = COST_MODELS[organizationSize as keyof typeof COST_MODELS];
  const complexityFactor = COMPLEXITY_FACTORS[subcategoryId] || 1.0;
  
  // Base effort hours
  let effortHours = 40; // Default 1 week
  
  // Adjust based on function
  const functionEffort: Record<string, number> = {
    'GV': 60,  // Governance takes more time
    'ID': 40,
    'PR': 50,
    'DE': 80,  // Detection tools take longest
    'RS': 30,
    'RC': 35
  };
  
  effortHours = (functionEffort[functionId] || 40) * complexityFactor;
  
  // Adjust for organization size
  const sizeMultiplier: Record<string, number> = {
    'small': 0.8,
    'medium': 1.0,
    'large': 1.3,
    'enterprise': 1.6
  };
  
  effortHours *= sizeMultiplier[organizationSize] || 1.0;
  
  // Calculate costs
  const laborCost = effortHours * laborRate * costModel.overhead_multiplier;
  
  // Tools cost based on function
  const toolConfig = TOOL_COSTS[functionId] || { base_cost: 10000 };
  const toolsCost = toolConfig.base_cost * costModel.tool_budget_multiplier;
  
  // Training cost based on team size
  const teamSize = organizationSize === 'small' ? 2 : 
                   organizationSize === 'medium' ? 5 :
                   organizationSize === 'large' ? 10 : 20;
  const trainingCost = teamSize * costModel.training_budget_per_person;
  
  const totalCost = laborCost + toolsCost + trainingCost;
  
  return {
    labor_cost: Math.round(laborCost),
    tools_cost: Math.round(toolsCost),
    training_cost: Math.round(trainingCost),
    total_cost: Math.round(totalCost),
    effort_hours: Math.round(effortHours)
  };
}

/**
 * Calculate risk factor for a subcategory
 */
function calculateRiskFactor(subcategoryId: string): number {
  const functionId = subcategoryId.substring(0, 2);
  
  // Higher risk for critical functions
  const functionRisk: Record<string, number> = {
    'GV': 1.2,  // Governance failures have high impact
    'ID': 1.0,
    'PR': 1.3,  // Protection failures are critical
    'DE': 1.1,
    'RS': 1.2,
    'RC': 1.0
  };
  
  return functionRisk[functionId] || 1.0;
}

/**
 * Calculate cost summary
 */
function calculateCostSummary(
  subcategoryCosts: SubcategoryCost[],
  params: EstimateImplementationCostParams
): any {
  const laborCost = subcategoryCosts.reduce((sum, c) => sum + c.labor_cost, 0);
  const toolsCost = subcategoryCosts.reduce((sum, c) => sum + c.tools_cost, 0);
  const trainingCost = subcategoryCosts.reduce((sum, c) => sum + c.training_cost, 0);
  const consultingCost = subcategoryCosts.reduce((sum, c) => sum + c.consulting_cost, 0);
  
  const subtotal = laborCost + toolsCost + trainingCost + consultingCost;
  const contingency = params.include_contingency ? subtotal * 0.15 : 0;
  
  const totalOneTime = subtotal + contingency;
  
  // Annual costs
  let totalAnnual = 0;
  for (const cost of subcategoryCosts) {
    const functionId = cost.function_id;
    const toolConfig = TOOL_COSTS[functionId];
    if (toolConfig) {
      totalAnnual += toolConfig.annual_license;
    }
  }
  
  // Add maintenance (15% of tools cost)
  totalAnnual += toolsCost * 0.15;
  
  const threeYearTCO = totalOneTime + (totalAnnual * 3);
  
  return {
    labor_cost: Math.round(laborCost),
    tools_cost: Math.round(toolsCost),
    training_cost: Math.round(trainingCost),
    consulting_cost: Math.round(consultingCost),
    contingency: Math.round(contingency),
    total_one_time: Math.round(totalOneTime),
    total_annual: Math.round(totalAnnual),
    three_year_tco: Math.round(threeYearTCO)
  };
}

/**
 * Calculate cost by function
 */
function calculateCostByFunction(subcategoryCosts: SubcategoryCost[]): any[] {
  const functionMap = new Map<string, any>();
  const totalCost = subcategoryCosts.reduce((sum, c) => sum + c.total_cost, 0);
  
  for (const cost of subcategoryCosts) {
    const functionId = cost.function_id;
    
    if (!functionMap.has(functionId)) {
      functionMap.set(functionId, {
        function_id: functionId,
        function_name: getFunctionName(functionId),
        subcategory_count: 0,
        total_cost: 0
      });
    }
    
    const func = functionMap.get(functionId);
    func.subcategory_count++;
    func.total_cost += cost.total_cost;
  }
  
  const result = Array.from(functionMap.values());
  
  // Calculate percentages
  for (const func of result) {
    func.percentage_of_total = Math.round((func.total_cost / totalCost) * 100);
  }
  
  // Sort by cost descending
  result.sort((a, b) => b.total_cost - a.total_cost);
  
  return result;
}

/**
 * Generate detailed cost breakdown
 */
function generateCostBreakdown(
  subcategoryCosts: SubcategoryCost[],
  organizationSize: string,
  laborRate: number
): CostBreakdown[] {
  const breakdown: CostBreakdown[] = [];
  const totalCost = subcategoryCosts.reduce((sum, c) => sum + c.total_cost, 0);
  
  // Labor costs
  const laborItems = subcategoryCosts.map(c => ({
    description: `${c.subcategory_name} implementation`,
    quantity: c.effort_hours,
    unit_cost: laborRate,
    total_cost: c.labor_cost
  }));
  
  const totalLabor = laborItems.reduce((sum, i) => sum + i.total_cost, 0);
  
  breakdown.push({
    category: 'Labor & Professional Services',
    one_time_cost: totalLabor,
    annual_cost: 0,
    three_year_total: totalLabor,
    percentage_of_total: Math.round((totalLabor / totalCost) * 100),
    items: laborItems
  });
  
  // Tools and Software
  const toolsItems: any[] = [];
  const processedFunctions = new Set<string>();
  
  for (const cost of subcategoryCosts) {
    const functionId = cost.function_id;
    if (!processedFunctions.has(functionId)) {
      const toolConfig = TOOL_COSTS[functionId];
      if (toolConfig) {
        for (const tool of toolConfig.tools) {
          toolsItems.push({
            description: tool,
            quantity: 1,
            unit_cost: toolConfig.base_cost / toolConfig.tools.length,
            total_cost: toolConfig.base_cost / toolConfig.tools.length
          });
        }
        processedFunctions.add(functionId);
      }
    }
  }
  
  const totalTools = toolsItems.reduce((sum, i) => sum + i.total_cost, 0);
  const annualLicenses = Array.from(processedFunctions).reduce((sum, funcId) => {
    return sum + (TOOL_COSTS[funcId]?.annual_license || 0);
  }, 0);
  
  breakdown.push({
    category: 'Tools & Software',
    one_time_cost: totalTools,
    annual_cost: annualLicenses,
    three_year_total: totalTools + (annualLicenses * 3),
    percentage_of_total: Math.round((totalTools / totalCost) * 100),
    items: toolsItems
  });
  
  // Training
  const teamSize = organizationSize === 'small' ? 2 : 
                   organizationSize === 'medium' ? 5 :
                   organizationSize === 'large' ? 10 : 20;
  
  const trainingItems = [
    {
      description: 'Security awareness training',
      quantity: teamSize,
      unit_cost: 500,
      total_cost: teamSize * 500
    },
    {
      description: 'Technical training and certifications',
      quantity: Math.ceil(teamSize / 2),
      unit_cost: 3000,
      total_cost: Math.ceil(teamSize / 2) * 3000
    },
    {
      description: 'Tabletop exercises and drills',
      quantity: 4,
      unit_cost: 2000,
      total_cost: 8000
    }
  ];
  
  const totalTraining = trainingItems.reduce((sum, i) => sum + i.total_cost, 0);
  
  breakdown.push({
    category: 'Training & Development',
    one_time_cost: totalTraining,
    annual_cost: totalTraining * 0.3,  // 30% annual refresh
    three_year_total: totalTraining + (totalTraining * 0.3 * 3),
    percentage_of_total: Math.round((totalTraining / totalCost) * 100),
    items: trainingItems
  });
  
  return breakdown;
}

/**
 * Calculate risk-adjusted costs
 */
function calculateRiskAdjustedCosts(baselineCost: number): any {
  // Use three-point estimation
  const bestCase = baselineCost * 0.8;  // 20% under budget
  const expected = baselineCost;
  const worstCase = baselineCost * 1.5;  // 50% over budget
  
  // PERT calculation
  const pertEstimate = (bestCase + (4 * expected) + worstCase) / 6;
  
  // Standard deviation (for future use)
  // const stdDev = (worstCase - bestCase) / 6;
  
  // Confidence level (within 1 standard deviation)
  const confidenceLevel = 68;  // 68% confidence
  
  return {
    best_case: Math.round(bestCase),
    expected: Math.round(pertEstimate),
    worst_case: Math.round(worstCase),
    confidence_level: confidenceLevel
  };
}

/**
 * Calculate ongoing costs
 */
function calculateOngoingCosts(
  subcategoryCosts: SubcategoryCost[],
  organizationSize: string
): any {
  const functionIds = new Set(subcategoryCosts.map(c => c.function_id));
  
  // Annual licensing
  let annualLicensing = 0;
  for (const functionId of functionIds) {
    const toolConfig = TOOL_COSTS[functionId];
    if (toolConfig) {
      annualLicensing += toolConfig.annual_license;
    }
  }
  
  // Maintenance (15% of tools cost)
  const totalToolsCost = subcategoryCosts.reduce((sum, c) => sum + c.tools_cost, 0);
  const annualMaintenance = totalToolsCost * 0.15;
  
  // Training refresh (30% of initial training)
  const totalTrainingCost = subcategoryCosts.reduce((sum, c) => sum + c.training_cost, 0);
  const annualTraining = totalTrainingCost * 0.3;
  
  // Auditing costs
  const auditDays = organizationSize === 'small' ? 5 :
                    organizationSize === 'medium' ? 10 :
                    organizationSize === 'large' ? 15 : 20;
  const annualAuditing = auditDays * 8 * 200;  // Days * hours * rate
  
  const totalAnnual = annualLicensing + annualMaintenance + annualTraining + annualAuditing;
  
  return {
    annual_maintenance: Math.round(annualMaintenance),
    annual_licensing: Math.round(annualLicensing),
    annual_training: Math.round(annualTraining),
    annual_auditing: Math.round(annualAuditing),
    total_annual: Math.round(totalAnnual)
  };
}

/**
 * Generate cost optimization recommendations
 */
function generateOptimizationRecommendations(
  subcategoryCosts: SubcategoryCost[],
  organizationSize: string
): any {
  const recommendations = {
    potential_savings: [] as string[],
    phasing_recommendations: [] as string[],
    bundling_opportunities: [] as string[]
  };
  
  // Analyze for potential savings
  const totalCost = subcategoryCosts.reduce((sum, c) => sum + c.total_cost, 0);
  
  if (organizationSize === 'small' || organizationSize === 'medium') {
    recommendations.potential_savings.push(
      'Consider cloud-based security solutions to reduce upfront costs',
      'Leverage managed security services for 24/7 monitoring',
      'Use open-source tools where appropriate (with support contracts)'
    );
  }
  
  // Phasing recommendations
  const highCostItems = subcategoryCosts.filter(c => c.total_cost > totalCost * 0.1);
  if (highCostItems.length > 3) {
    recommendations.phasing_recommendations.push(
      `Phase implementation of ${highCostItems.length} high-cost items over multiple quarters`,
      'Prioritize quick wins and foundational controls in Phase 1',
      'Defer advanced capabilities until core controls are operational'
    );
  }
  
  // Bundling opportunities
  const functionGroups = new Map<string, number>();
  for (const cost of subcategoryCosts) {
    functionGroups.set(cost.function_id, (functionGroups.get(cost.function_id) || 0) + 1);
  }
  
  for (const [functionId, count] of functionGroups) {
    if (count >= 3) {
      recommendations.bundling_opportunities.push(
        `Bundle ${count} ${getFunctionName(functionId)} subcategories for vendor discounts`,
        `Consider platform approach for ${getFunctionName(functionId)} to reduce integration costs`
      );
    }
  }
  
  // Add general recommendations
  if (subcategoryCosts.length > 10) {
    recommendations.bundling_opportunities.push(
      'Negotiate enterprise agreement for comprehensive security platform',
      'Consider multi-year contracts for better pricing'
    );
  }
  
  return recommendations;
}

/**
 * Get function name
 */
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

/**
 * Create error result
 */
function createErrorResult(message: string): CostEstimateResult {
  return {
    success: false,
    organization_size: '',
    currency: 'USD',
    subcategory_count: 0,
    total_effort_hours: 0,
    average_labor_rate: 0,
    cost_summary: {
      labor_cost: 0,
      tools_cost: 0,
      training_cost: 0,
      consulting_cost: 0,
      contingency: 0,
      total_one_time: 0,
      total_annual: 0,
      three_year_tco: 0
    },
    cost_by_function: [],
    cost_breakdown: [],
    subcategory_costs: [],
    cost_optimization: {
      potential_savings: [message],
      phasing_recommendations: [],
      bundling_opportunities: []
    }
  };
}