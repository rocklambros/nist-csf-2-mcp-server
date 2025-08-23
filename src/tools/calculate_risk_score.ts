/**
 * Calculate Risk Score Tool - Calculate risk based on unimplemented subcategories
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';

// Input schema for the tool
export const CalculateRiskScoreSchema = z.object({
  profile_id: z.string().min(1),
  threat_weights: z.object({
    govern: z.number().min(0).max(2).default(1.5),
    identify: z.number().min(0).max(2).default(1.3),
    protect: z.number().min(0).max(2).default(1.4),
    detect: z.number().min(0).max(2).default(1.2),
    respond: z.number().min(0).max(2).default(1.1),
    recover: z.number().min(0).max(2).default(1.0)
  }).optional(),
  include_heat_map: z.boolean().default(true),
  include_recommendations: z.boolean().default(true)
});

export type CalculateRiskScoreParams = z.infer<typeof CalculateRiskScoreSchema>;

// Removed unused SubcategoryRisk interface

interface FunctionRisk {
  function_id: string;
  function_name: string;
  weighted_risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  high_risk_count: number;
  subcategory_count: number;
  max_risk: number;
  risk_contributors: string[];
}

interface HeatMapData {
  function_id: string;
  function_name: string;
  categories: Array<{
    category_id: string;
    risk_score: number;
    risk_level: string;
    subcategories: Array<{
      subcategory_id: string;
      risk_score: number;
      implementation_status: string;
    }>;
  }>;
}

interface RiskScoreResult {
  success: boolean;
  profile_id: string;
  overall_risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  assessment_date: string;
  function_risks: FunctionRisk[];
  heat_map_data?: HeatMapData[];
  risk_summary: {
    critical_risks: number;
    high_risks: number;
    medium_risks: number;
    low_risks: number;
    top_risk_areas: string[];
    coverage_percentage: number;
  };
  recommendations?: {
    critical_actions: string[];
    risk_mitigation: string[];
    quick_improvements: string[];
  };
}

// Default threat weights by function
const DEFAULT_THREAT_WEIGHTS: Record<string, number> = {
  'GV': 1.5,  // Govern is most critical
  'ID': 1.3,  // Identify is very important
  'PR': 1.4,  // Protect is very important
  'DE': 1.2,  // Detect is important
  'RS': 1.1,  // Respond is important
  'RC': 1.0   // Recover is baseline
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
 * Main function to calculate risk score
 */
export async function calculateRiskScore(params: CalculateRiskScoreParams): Promise<RiskScoreResult> {
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
    
    // Get risk score data using complex SQL
    const riskData = db.getRiskScoreData(params.profile_id);
    
    if (!riskData || !riskData.function_risks.length) {
      return createErrorResult(params.profile_id, 'No assessment data found for risk calculation');
    }
    
    // Apply custom threat weights if provided
    const weights = params.threat_weights || {};
    const functionRisks = processFunctionRisks(
      riskData.function_risks,
      weights,
      framework
    );
    
    // Calculate overall risk metrics
    const overallRiskScore = calculateOverallRisk(functionRisks, weights);
    const riskLevel = getRiskLevel(overallRiskScore);
    
    // Generate heat map data if requested
    const heatMapData = params.include_heat_map
      ? generateHeatMapData(params.profile_id, db, framework)
      : undefined;
    
    // Calculate risk summary
    const riskSummary = calculateRiskSummary(functionRisks, riskData);
    
    // Generate recommendations if requested
    const recommendations = params.include_recommendations
      ? generateRiskRecommendations(functionRisks, riskLevel, riskSummary)
      : undefined;
    
    return {
      success: true,
      profile_id: params.profile_id,
      overall_risk_score: Math.round(overallRiskScore * 100) / 100,
      risk_level: riskLevel,
      assessment_date: new Date().toISOString(),
      function_risks: functionRisks,
      heat_map_data: heatMapData,
      risk_summary: riskSummary,
      recommendations
    };
    
  } catch (error) {
    logger.error('Calculate risk score error:', error);
    return createErrorResult(
      params.profile_id,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * Process function risks with custom weights
 */
function processFunctionRisks(
  functionRisks: any[],
  customWeights: any,
  framework: any
): FunctionRisk[] {
  const results: FunctionRisk[] = [];
  
  for (const risk of functionRisks) {
    // Get risk contributors (unimplemented subcategories)
    const riskContributors = getRiskContributors(
      risk.function_id,
      framework,
      risk.high_risk_count
    );
    
    // Apply custom weight if provided
    const functionKey = risk.function_id.toLowerCase();
    const customWeight = customWeights[functionKey];
    let adjustedRiskScore = risk.weighted_risk_score;
    
    if (customWeight !== undefined && customWeight !== DEFAULT_THREAT_WEIGHTS[risk.function_id]) {
      // Recalculate with custom weight
      const baseWeight = DEFAULT_THREAT_WEIGHTS[risk.function_id] || 1.0;
      adjustedRiskScore = (risk.weighted_risk_score / baseWeight) * customWeight;
    }
    
    results.push({
      function_id: risk.function_id,
      function_name: FUNCTION_NAMES[risk.function_id] || risk.function_id,
      weighted_risk_score: Math.round(adjustedRiskScore * 100) / 100,
      risk_level: risk.risk_level,
      high_risk_count: risk.high_risk_count,
      subcategory_count: risk.subcategory_count,
      max_risk: risk.max_risk,
      risk_contributors: riskContributors
    });
  }
  
  // Sort by risk score descending
  results.sort((a, b) => b.weighted_risk_score - a.weighted_risk_score);
  
  return results;
}

/**
 * Get risk contributors for a function
 */
function getRiskContributors(
  functionId: string,
  _framework: any,
  highRiskCount: number
): string[] {
  const contributors: string[] = [];
  
  // Map function IDs to specific risk areas
  const riskAreas: Record<string, string[]> = {
    'GV': [
      'Organizational Context gaps',
      'Risk Management Strategy missing',
      'Supply Chain Risk Management absent'
    ],
    'ID': [
      'Asset Management incomplete',
      'Risk Assessment gaps',
      'Vulnerability Management issues'
    ],
    'PR': [
      'Access Control weaknesses',
      'Data Protection gaps',
      'Security Training absent'
    ],
    'DE': [
      'Monitoring capabilities limited',
      'Detection Processes missing',
      'Anomaly detection absent'
    ],
    'RS': [
      'Response Planning incomplete',
      'Communications gaps',
      'Mitigation activities undefined'
    ],
    'RC': [
      'Recovery Planning missing',
      'Improvements not implemented',
      'Communications plan absent'
    ]
  };
  
  const areas = riskAreas[functionId] || ['Unspecified risk areas'];
  
  // Add top contributors based on high risk count
  if (highRiskCount > 0) {
    contributors.push(...areas.slice(0, Math.min(highRiskCount, 3)));
  }
  
  return contributors;
}

/**
 * Calculate overall risk score
 */
function calculateOverallRisk(
  functionRisks: FunctionRisk[],
  customWeights: any
): number {
  if (functionRisks.length === 0) return 0;
  
  let totalWeightedRisk = 0;
  let totalWeight = 0;
  
  for (const risk of functionRisks) {
    const functionKey = risk.function_id.toLowerCase();
    const weight = customWeights[functionKey] || DEFAULT_THREAT_WEIGHTS[risk.function_id] || 1.0;
    
    totalWeightedRisk += risk.weighted_risk_score * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? totalWeightedRisk / totalWeight : 0;
}

/**
 * Determine risk level from score
 */
function getRiskLevel(score: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (score >= 75) return 'Critical';
  if (score >= 50) return 'High';
  if (score >= 25) return 'Medium';
  return 'Low';
}

/**
 * Generate heat map data
 */
function generateHeatMapData(
  profileId: string,
  db: any,
  _framework: any
): HeatMapData[] {
  const heatMap: HeatMapData[] = [];
  
  // Get all assessments for the profile
  const assessments = db.getProfileAssessments(profileId);
  
  // Group by function and category
  const functionMap = new Map<string, Map<string, any[]>>();
  
  for (const assessment of assessments) {
    const functionId = assessment.subcategory_id.substring(0, 2);
    const categoryId = assessment.subcategory_id.substring(0, 5);
    
    if (!functionMap.has(functionId)) {
      functionMap.set(functionId, new Map());
    }
    
    const categoryMap = functionMap.get(functionId)!;
    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, []);
    }
    
    categoryMap.get(categoryId)!.push({
      subcategory_id: assessment.subcategory_id,
      risk_score: calculateSubcategoryRisk(assessment),
      implementation_status: assessment.implementation_level
    });
  }
  
  // Build heat map structure
  for (const [functionId, categoryMap] of functionMap) {
    const categories = [];
    
    for (const [categoryId, subcategories] of categoryMap) {
      const categoryRisk = subcategories.reduce((sum, s) => sum + s.risk_score, 0) / subcategories.length;
      
      categories.push({
        category_id: categoryId,
        risk_score: Math.round(categoryRisk * 100) / 100,
        risk_level: getRiskLevel(categoryRisk),
        subcategories: subcategories
      });
    }
    
    heatMap.push({
      function_id: functionId,
      function_name: FUNCTION_NAMES[functionId] || functionId,
      categories: categories
    });
  }
  
  return heatMap;
}

/**
 * Calculate risk for a single subcategory
 */
function calculateSubcategoryRisk(assessment: any): number {
  let baseRisk = 0;
  
  switch (assessment.implementation_level) {
    case 'not_implemented':
      baseRisk = 100;
      break;
    case 'partially_implemented':
      baseRisk = 60;
      break;
    case 'largely_implemented':
      baseRisk = 30;
      break;
    case 'fully_implemented':
      baseRisk = 0;
      break;
  }
  
  // Adjust based on maturity score
  const maturityAdjustment = (5 - (assessment.maturity_score || 0)) * 10;
  
  return Math.min(100, Math.max(0, (baseRisk + maturityAdjustment) / 2));
}

/**
 * Calculate risk summary statistics
 */
function calculateRiskSummary(
  functionRisks: FunctionRisk[],
  riskData: any
): any {
  const criticalRisks = functionRisks.filter(f => f.risk_level === 'Critical').length;
  const highRisks = functionRisks.filter(f => f.risk_level === 'High').length;
  const mediumRisks = functionRisks.filter(f => f.risk_level === 'Medium').length;
  const lowRisks = functionRisks.filter(f => f.risk_level === 'Low').length;
  
  const topRiskAreas = functionRisks
    .slice(0, 3)
    .map(f => `${f.function_name} (${f.weighted_risk_score.toFixed(1)})`);
  
  // Calculate coverage percentage (inverse of risk)
  const coveragePercentage = Math.max(0, 100 - (riskData.overall_risk_score || 0));
  
  return {
    critical_risks: criticalRisks,
    high_risks: highRisks,
    medium_risks: mediumRisks,
    low_risks: lowRisks,
    top_risk_areas: topRiskAreas,
    coverage_percentage: Math.round(coveragePercentage * 100) / 100
  };
}

/**
 * Generate risk-based recommendations
 */
function generateRiskRecommendations(
  functionRisks: FunctionRisk[],
  overallRiskLevel: string,
  _riskSummary: any
): any {
  const criticalActions: string[] = [];
  const riskMitigation: string[] = [];
  const quickImprovements: string[] = [];
  
  // Critical actions for high-risk functions
  const criticalFunctions = functionRisks.filter(f => f.risk_level === 'Critical' || f.risk_level === 'High');
  for (const func of criticalFunctions) {
    if (func.risk_contributors.length > 0) {
      criticalActions.push(
        `Address ${func.function_name}: ${func.risk_contributors[0]}`
      );
    }
  }
  
  // Risk mitigation strategies based on overall level
  if (overallRiskLevel === 'Critical') {
    riskMitigation.push(
      'Implement emergency response procedures immediately',
      'Conduct comprehensive security assessment',
      'Engage external security expertise',
      'Establish 24/7 monitoring capabilities'
    );
  } else if (overallRiskLevel === 'High') {
    riskMitigation.push(
      'Prioritize protection and detection controls',
      'Enhance incident response capabilities',
      'Implement security awareness training',
      'Deploy additional monitoring tools'
    );
  } else if (overallRiskLevel === 'Medium') {
    riskMitigation.push(
      'Strengthen existing controls',
      'Improve vulnerability management',
      'Enhance access controls',
      'Regular security assessments'
    );
  }
  
  // Quick improvements for functions with moderate risk
  const moderateFunctions = functionRisks.filter(
    f => f.weighted_risk_score >= 30 && f.weighted_risk_score < 60
  );
  for (const func of moderateFunctions) {
    quickImprovements.push(
      `Quick win: Improve ${func.function_name} (${func.high_risk_count} high-risk areas)`
    );
  }
  
  return {
    critical_actions: criticalActions.slice(0, 5),
    risk_mitigation: riskMitigation.slice(0, 4),
    quick_improvements: quickImprovements.slice(0, 3)
  };
}

/**
 * Create error result
 */
function createErrorResult(profileId: string, _message: string): RiskScoreResult {
  return {
    success: false,
    profile_id: profileId,
    overall_risk_score: 0,
    risk_level: 'Low',
    assessment_date: new Date().toISOString(),
    function_risks: [],
    risk_summary: {
      critical_risks: 0,
      high_risks: 0,
      medium_risks: 0,
      low_risks: 0,
      top_risk_areas: [],
      coverage_percentage: 0
    }
  };
}