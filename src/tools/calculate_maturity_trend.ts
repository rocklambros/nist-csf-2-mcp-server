/**
 * Calculate Maturity Trend Tool - Query historical assessments and calculate trends
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { logger } from '../utils/logger.js';

// Input schema for the tool
export const CalculateMaturityTrendSchema = z.object({
  profile_id: z.string().min(1),
  date_range: z.object({
    start_date: z.string().optional(), // ISO date string
    end_date: z.string().optional()    // ISO date string
  }).optional(),
  include_projections: z.boolean().default(true),
  include_velocity_analysis: z.boolean().default(true),
  aggregation_period: z.enum(['daily', 'weekly', 'monthly']).default('weekly')
});

export type CalculateMaturityTrendParams = z.infer<typeof CalculateMaturityTrendSchema>;

interface TrendDataPoint {
  date: string;
  function_id: string;
  function_name: string;
  maturity_score: number;
  moving_average: number;
  change_from_previous: number;
  change_percentage: number;
  cumulative_change: number;
}

interface FunctionTrend {
  function_id: string;
  function_name: string;
  current_score: number;
  initial_score: number;
  total_improvement: number;
  improvement_percentage: number;
  average_daily_velocity: number;
  trend_direction: 'improving' | 'declining' | 'stable';
  volatility_score: number;
  data_points: TrendDataPoint[];
}

interface ProjectionData {
  function_id: string;
  function_name: string;
  projected_30_days: number;
  projected_60_days: number;
  projected_90_days: number;
  days_to_next_tier: number | null;
  confidence_level: 'high' | 'medium' | 'low';
}

interface VelocityAnalysis {
  overall_velocity: number;
  acceleration: number;
  consistency_score: number;
  best_performing_period: string;
  worst_performing_period: string;
  improvement_rate_trend: 'accelerating' | 'decelerating' | 'constant';
}

interface MaturityTrendResult {
  success: boolean;
  profile_id: string;
  analysis_period: {
    start_date: string;
    end_date: string;
    total_days: number;
    data_points_analyzed: number;
  };
  overall_trend: {
    starting_maturity: number;
    current_maturity: number;
    total_improvement: number;
    improvement_percentage: number;
    trend_direction: 'improving' | 'declining' | 'stable';
  };
  function_trends: FunctionTrend[];
  time_series_data: TrendDataPoint[];
  projections?: ProjectionData[];
  velocity_analysis?: VelocityAnalysis;
  insights: {
    strengths: string[];
    concerns: string[];
    recommendations: string[];
  };
}

// Function names mapping
const FUNCTION_NAMES: Record<string, string> = {
  'GV': 'Govern',
  'ID': 'Identify',
  'PR': 'Protect',
  'DE': 'Detect',
  'RS': 'Respond',
  'RC': 'Recover'
};

// Removed unused MATURITY_TIERS constant

/**
 * Main function to calculate maturity trend
 */
export async function calculateMaturityTrend(params: CalculateMaturityTrendParams): Promise<MaturityTrendResult> {
  const db = getDatabase();
  
  try {
    // Verify profile exists
    const profile = db.getProfile(params.profile_id);
    if (!profile) {
      return createErrorResult(params.profile_id, `Profile not found: ${params.profile_id}`);
    }
    
    // Set date range (default to last 90 days)
    const endDate = params.date_range?.end_date || new Date().toISOString().split('T')[0];
    const startDate = params.date_range?.start_date || 
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get maturity trend data using complex SQL with window functions
    const trendData = db.getMaturityTrend(params.profile_id, startDate, endDate);
    
    if (!trendData || trendData.length === 0) {
      return createErrorResult(params.profile_id, 'No historical assessment data found');
    }
    
    // Process and aggregate trend data
    const { functionTrends, timeSeriesData } = processTrendData(
      trendData,
      params.aggregation_period
    );
    
    // Calculate overall trend
    const overallTrend = calculateOverallTrend(functionTrends, timeSeriesData);
    
    // Generate projections if requested
    const projections = params.include_projections
      ? generateProjections(functionTrends)
      : undefined;
    
    // Perform velocity analysis if requested
    const velocityAnalysis = params.include_velocity_analysis
      ? analyzeVelocity(timeSeriesData, functionTrends)
      : undefined;
    
    // Generate insights
    const insights = generateInsights(
      functionTrends,
      overallTrend,
      velocityAnalysis,
      projections
    );
    
    // Calculate analysis period
    const analysisPeriod = {
      start_date: startDate!,
      end_date: endDate!,
      total_days: Math.ceil((new Date(endDate!).getTime() - new Date(startDate!).getTime()) / (1000 * 60 * 60 * 24)),
      data_points_analyzed: trendData.length
    };
    
    return {
      success: true,
      profile_id: params.profile_id,
      analysis_period: analysisPeriod,
      overall_trend: overallTrend,
      function_trends: functionTrends,
      time_series_data: timeSeriesData,
      projections,
      velocity_analysis: velocityAnalysis,
      insights
    };
    
  } catch (error) {
    logger.error('Calculate maturity trend error:', error);
    return createErrorResult(
      params.profile_id,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * Process and aggregate trend data
 */
function processTrendData(
  rawData: any[],
  _aggregationPeriod: string
): { functionTrends: FunctionTrend[], timeSeriesData: TrendDataPoint[] } {
  const functionMap = new Map<string, any[]>();
  const processedData: TrendDataPoint[] = [];
  
  // Group data by function
  for (const row of rawData) {
    const dataPoint: TrendDataPoint = {
      date: row.assessment_date,
      function_id: row.function_id,
      function_name: FUNCTION_NAMES[row.function_id] || row.function_id,
      maturity_score: row.maturity_score,
      moving_average: row.moving_avg_7d || row.maturity_score,
      change_from_previous: row.daily_change || 0,
      change_percentage: row.change_percentage || 0,
      cumulative_change: row.total_change || 0
    };
    
    processedData.push(dataPoint);
    
    if (!functionMap.has(row.function_id)) {
      functionMap.set(row.function_id, []);
    }
    functionMap.get(row.function_id)!.push(dataPoint);
  }
  
  // Calculate function trends
  const functionTrends: FunctionTrend[] = [];
  
  for (const [functionId, dataPoints] of functionMap) {
    if (dataPoints.length === 0) continue;
    
    // Sort by date
    dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const initial = dataPoints[0];
    const current = dataPoints[dataPoints.length - 1];
    const totalImprovement = current.maturity_score - initial.maturity_score;
    const improvementPercentage = initial.maturity_score > 0
      ? (totalImprovement / initial.maturity_score) * 100
      : 0;
    
    // Calculate volatility (standard deviation of changes)
    const changes = dataPoints.map(d => d.change_from_previous);
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance = changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length;
    const volatility = Math.sqrt(variance);
    
    // Calculate average daily velocity
    const daysDiff = Math.max(1, 
      (new Date(current.date).getTime() - new Date(initial.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const avgDailyVelocity = totalImprovement / daysDiff;
    
    // Determine trend direction
    let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
    if (totalImprovement > 0.1) trendDirection = 'improving';
    else if (totalImprovement < -0.1) trendDirection = 'declining';
    
    functionTrends.push({
      function_id: functionId,
      function_name: FUNCTION_NAMES[functionId] || functionId,
      current_score: Math.round(current.maturity_score * 100) / 100,
      initial_score: Math.round(initial.maturity_score * 100) / 100,
      total_improvement: Math.round(totalImprovement * 100) / 100,
      improvement_percentage: Math.round(improvementPercentage * 100) / 100,
      average_daily_velocity: Math.round(avgDailyVelocity * 1000) / 1000,
      trend_direction: trendDirection,
      volatility_score: Math.round(volatility * 100) / 100,
      data_points: dataPoints
    });
  }
  
  return { functionTrends, timeSeriesData: processedData };
}

/**
 * Calculate overall trend
 */
function calculateOverallTrend(
  functionTrends: FunctionTrend[],
  _timeSeriesData: TrendDataPoint[]
): any {
  if (functionTrends.length === 0) {
    return {
      starting_maturity: 0,
      current_maturity: 0,
      total_improvement: 0,
      improvement_percentage: 0,
      trend_direction: 'stable'
    };
  }
  
  const avgInitial = functionTrends.reduce((sum, f) => sum + f.initial_score, 0) / functionTrends.length;
  const avgCurrent = functionTrends.reduce((sum, f) => sum + f.current_score, 0) / functionTrends.length;
  const totalImprovement = avgCurrent - avgInitial;
  const improvementPercentage = avgInitial > 0 ? (totalImprovement / avgInitial) * 100 : 0;
  
  let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
  if (totalImprovement > 0.1) trendDirection = 'improving';
  else if (totalImprovement < -0.1) trendDirection = 'declining';
  
  return {
    starting_maturity: Math.round(avgInitial * 100) / 100,
    current_maturity: Math.round(avgCurrent * 100) / 100,
    total_improvement: Math.round(totalImprovement * 100) / 100,
    improvement_percentage: Math.round(improvementPercentage * 100) / 100,
    trend_direction: trendDirection
  };
}

/**
 * Generate projections based on trends
 */
function generateProjections(functionTrends: FunctionTrend[]): ProjectionData[] {
  const projections: ProjectionData[] = [];
  
  for (const trend of functionTrends) {
    // Skip if no meaningful trend
    if (Math.abs(trend.average_daily_velocity) < 0.001) {
      continue;
    }
    
    // Project future scores
    const projected30 = trend.current_score + (trend.average_daily_velocity * 30);
    const projected60 = trend.current_score + (trend.average_daily_velocity * 60);
    const projected90 = trend.current_score + (trend.average_daily_velocity * 90);
    
    // Calculate days to next tier
    let daysToNextTier: number | null = null;
    const nextTierThreshold = getNextTierThreshold(trend.current_score);
    
    if (nextTierThreshold && trend.average_daily_velocity > 0) {
      daysToNextTier = Math.ceil((nextTierThreshold - trend.current_score) / trend.average_daily_velocity);
    }
    
    // Determine confidence level based on volatility
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (trend.volatility_score < 0.1) confidence = 'high';
    else if (trend.volatility_score > 0.3) confidence = 'low';
    
    projections.push({
      function_id: trend.function_id,
      function_name: trend.function_name,
      projected_30_days: Math.min(5, Math.max(0, Math.round(projected30 * 100) / 100)),
      projected_60_days: Math.min(5, Math.max(0, Math.round(projected60 * 100) / 100)),
      projected_90_days: Math.min(5, Math.max(0, Math.round(projected90 * 100) / 100)),
      days_to_next_tier: daysToNextTier,
      confidence_level: confidence
    });
  }
  
  return projections;
}

/**
 * Analyze velocity and acceleration
 */
function analyzeVelocity(
  timeSeriesData: TrendDataPoint[],
  functionTrends: FunctionTrend[]
): VelocityAnalysis {
  // Calculate overall velocity
  const overallVelocity = functionTrends.reduce((sum, f) => sum + f.average_daily_velocity, 0) / functionTrends.length;
  
  // Group data by periods for velocity analysis
  const periodMap = new Map<string, number[]>();
  
  for (const point of timeSeriesData) {
    const weekKey = getWeekKey(point.date);
    if (!periodMap.has(weekKey)) {
      periodMap.set(weekKey, []);
    }
    periodMap.get(weekKey)!.push(point.change_from_previous);
  }
  
  // Calculate period velocities
  const periodVelocities: { period: string; velocity: number }[] = [];
  for (const [period, changes] of periodMap) {
    const avgVelocity = changes.reduce((a, b) => a + b, 0) / changes.length;
    periodVelocities.push({ period, velocity: avgVelocity });
  }
  
  // Sort to find best and worst periods
  periodVelocities.sort((a, b) => b.velocity - a.velocity);
  const bestPeriod = periodVelocities[0]?.period || 'N/A';
  const worstPeriod = periodVelocities[periodVelocities.length - 1]?.period || 'N/A';
  
  // Calculate acceleration (change in velocity over time)
  let acceleration = 0;
  if (periodVelocities.length >= 2) {
    const recentVelocity = periodVelocities.slice(0, Math.ceil(periodVelocities.length / 2))
      .reduce((sum, p) => sum + p.velocity, 0) / Math.ceil(periodVelocities.length / 2);
    const earlierVelocity = periodVelocities.slice(Math.ceil(periodVelocities.length / 2))
      .reduce((sum, p) => sum + p.velocity, 0) / (periodVelocities.length - Math.ceil(periodVelocities.length / 2));
    acceleration = recentVelocity - earlierVelocity;
  }
  
  // Calculate consistency score (inverse of volatility)
  const avgVolatility = functionTrends.reduce((sum, f) => sum + f.volatility_score, 0) / functionTrends.length;
  const consistencyScore = Math.max(0, 1 - avgVolatility);
  
  // Determine improvement rate trend
  let improvementTrend: 'accelerating' | 'decelerating' | 'constant' = 'constant';
  if (acceleration > 0.01) improvementTrend = 'accelerating';
  else if (acceleration < -0.01) improvementTrend = 'decelerating';
  
  return {
    overall_velocity: Math.round(overallVelocity * 1000) / 1000,
    acceleration: Math.round(acceleration * 1000) / 1000,
    consistency_score: Math.round(consistencyScore * 100) / 100,
    best_performing_period: bestPeriod,
    worst_performing_period: worstPeriod,
    improvement_rate_trend: improvementTrend
  };
}

/**
 * Generate insights from trend analysis
 */
function generateInsights(
  functionTrends: FunctionTrend[],
  overallTrend: any,
  velocityAnalysis?: VelocityAnalysis,
  projections?: ProjectionData[]
): any {
  const strengths: string[] = [];
  const concerns: string[] = [];
  const recommendations: string[] = [];
  
  // Identify strengths
  const improvingFunctions = functionTrends.filter(f => f.trend_direction === 'improving');
  if (improvingFunctions.length > 0) {
    strengths.push(`${improvingFunctions.length} functions showing improvement`);
    
    const bestImprover = improvingFunctions.sort((a, b) => b.total_improvement - a.total_improvement)[0];
    if (bestImprover) {
      strengths.push(`${bestImprover.function_name} improved by ${bestImprover.improvement_percentage.toFixed(1)}%`);
    }
  }
  
  if (velocityAnalysis?.consistency_score && velocityAnalysis.consistency_score > 0.7) {
    strengths.push('Consistent improvement pattern detected');
  }
  
  if (velocityAnalysis?.improvement_rate_trend === 'accelerating') {
    strengths.push('Improvement rate is accelerating');
  }
  
  // Identify concerns
  const decliningFunctions = functionTrends.filter(f => f.trend_direction === 'declining');
  if (decliningFunctions.length > 0) {
    concerns.push(`${decliningFunctions.length} functions showing decline`);
    for (const func of decliningFunctions) {
      concerns.push(`${func.function_name} declined by ${Math.abs(func.total_improvement).toFixed(2)} points`);
    }
  }
  
  const volatileFunctions = functionTrends.filter(f => f.volatility_score > 0.3);
  if (volatileFunctions.length > 0) {
    concerns.push(`${volatileFunctions.length} functions showing high volatility`);
  }
  
  if (velocityAnalysis?.improvement_rate_trend === 'decelerating') {
    concerns.push('Improvement rate is slowing down');
  }
  
  // Generate recommendations
  if (overallTrend.trend_direction === 'improving') {
    recommendations.push('Maintain current improvement momentum');
  } else if (overallTrend.trend_direction === 'declining') {
    recommendations.push('Urgent review needed to reverse declining trend');
  }
  
  // Function-specific recommendations
  for (const trend of functionTrends) {
    if (trend.current_score < 2 && trend.average_daily_velocity < 0.01) {
      recommendations.push(`Accelerate improvements in ${trend.function_name} (currently at ${trend.current_score.toFixed(2)})`);
    }
  }
  
  // Projection-based recommendations
  if (projections) {
    const nearTierAdvancements = projections.filter(p => p.days_to_next_tier && p.days_to_next_tier <= 30);
    for (const proj of nearTierAdvancements) {
      recommendations.push(`${proj.function_name} can advance to next tier in ${proj.days_to_next_tier} days with sustained effort`);
    }
  }
  
  return {
    strengths: strengths.slice(0, 5),
    concerns: concerns.slice(0, 5),
    recommendations: recommendations.slice(0, 5)
  };
}


/**
 * Helper function to get next tier threshold
 */
function getNextTierThreshold(currentScore: number): number | null {
  if (currentScore <= 1.25) return 1.26;
  if (currentScore <= 2.5) return 2.51;
  if (currentScore <= 3.75) return 3.76;
  return null; // Already at highest tier
}

/**
 * Helper function to get week key from date
 */
function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const week = Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Create error result
 */
function createErrorResult(profileId: string, message: string): MaturityTrendResult {
  return {
    success: false,
    profile_id: profileId,
    analysis_period: {
      start_date: '',
      end_date: '',
      total_days: 0,
      data_points_analyzed: 0
    },
    overall_trend: {
      starting_maturity: 0,
      current_maturity: 0,
      total_improvement: 0,
      improvement_percentage: 0,
      trend_direction: 'stable'
    },
    function_trends: [],
    time_series_data: [],
    insights: {
      strengths: [],
      concerns: [message],
      recommendations: []
    }
  };
}