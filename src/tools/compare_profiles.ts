import { CSFDatabase } from "../db/database.js";

interface ProfileComparison {
  profile_id: string;
  profile_name: string;
  org_name: string;
  industry: string;
  size: string;
  profile_type: string;
  created_at: string;
  avg_maturity: number;
  assessments_count: number;
  completed_items: number;
}

interface FunctionScore {
  profile_id: string;
  function_id: string;
  avg_maturity: number;
}

interface ComparisonMatrix {
  profiles: ProfileComparison[];
  function_scores: Record<string, Record<string, number>>;
  differences: {
    maturity_variance: number;
    highest_performer: string;
    lowest_performer: string;
    max_gap: number;
  };
  similarities: {
    common_strengths: string[];
    common_weaknesses: string[];
    correlation_score: number;
  };
  recommendations: string[];
}

export async function compareProfiles(
  db: CSFDatabase,
  profile_ids: string[]
): Promise<ComparisonMatrix> {
  try {
    // Validate input
    if (!profile_ids || profile_ids.length < 2) {
      throw new Error('At least 2 profiles are required for comparison');
    }
    
    if (profile_ids.length > 5) {
      throw new Error('Maximum 5 profiles can be compared at once');
    }
    
    // Get comparison data from database
    const comparisonData = db.compareProfiles(profile_ids);
    
    if (!comparisonData) {
      throw new Error('No comparison data found for the specified profiles');
    }
    
    // Parse the JSON data
    const profiles: ProfileComparison[] = JSON.parse(comparisonData.profiles || '[]');
    const functionScores: FunctionScore[] = JSON.parse(comparisonData.function_scores || '[]');
    
    if (profiles.length === 0) {
      throw new Error('No valid profiles found for comparison');
    }
    
    // Organize function scores by profile and function
    const scoreMatrix: Record<string, Record<string, number>> = {};
    const functionNames: Record<string, string> = {
      'GV': 'Govern',
      'ID': 'Identify',
      'PR': 'Protect',
      'DE': 'Detect',
      'RS': 'Respond',
      'RC': 'Recover'
    };
    
    // Initialize score matrix
    profiles.forEach(profile => {
      scoreMatrix[profile.profile_id] = {};
    });
    
    // Populate score matrix
    functionScores.forEach(score => {
      if (scoreMatrix[score.profile_id]) {
        scoreMatrix[score.profile_id]![score.function_id] = score.avg_maturity;
      }
    });
    
    // Calculate differences
    const maturityScores = profiles.map(p => p.avg_maturity || 0);
    const maxMaturity = Math.max(...maturityScores);
    const minMaturity = Math.min(...maturityScores);
    const variance = calculateVariance(maturityScores);
    
    const highestPerformer = profiles.find(p => p.avg_maturity === maxMaturity);
    const lowestPerformer = profiles.find(p => p.avg_maturity === minMaturity);
    
    // Identify common strengths and weaknesses
    const { strengths, weaknesses } = identifyCommonPatterns(scoreMatrix, functionNames);
    
    // Calculate correlation score
    const correlationScore = calculateCorrelation(scoreMatrix);
    
    // Generate recommendations
    const recommendations = generateComparisonRecommendations(
      profiles,
      scoreMatrix,
      strengths,
      weaknesses,
      variance
    );
    
    // Build the comparison matrix
    const comparisonMatrix: ComparisonMatrix = {
      profiles: profiles,
      function_scores: scoreMatrix,
      differences: {
        maturity_variance: Math.round(variance * 100) / 100,
        highest_performer: highestPerformer?.profile_name || 'Unknown',
        lowest_performer: lowestPerformer?.profile_name || 'Unknown',
        max_gap: Math.round((maxMaturity - minMaturity) * 100) / 100
      },
      similarities: {
        common_strengths: strengths,
        common_weaknesses: weaknesses,
        correlation_score: Math.round(correlationScore * 100) / 100
      },
      recommendations
    };
    
    return comparisonMatrix;
  } catch (error) {
    console.error('Error comparing profiles:', error);
    throw new Error(`Failed to compare profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

function identifyCommonPatterns(
  scoreMatrix: Record<string, Record<string, number>>,
  functionNames: Record<string, string>
): { strengths: string[], weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  // Check each function across all profiles
  Object.keys(functionNames).forEach(functionId => {
    const scores: number[] = [];
    
    Object.values(scoreMatrix).forEach(profileScores => {
      if (profileScores[functionId] !== undefined) {
        scores.push(profileScores[functionId]);
      }
    });
    
    if (scores.length > 0) {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      // Common strength if all profiles score above 3.5
      if (scores.every(s => s >= 3.5)) {
        strengths.push(`${functionNames[functionId]} (avg: ${avgScore.toFixed(1)})`);
      }
      
      // Common weakness if all profiles score below 2.5
      if (scores.every(s => s <= 2.5)) {
        weaknesses.push(`${functionNames[functionId]} (avg: ${avgScore.toFixed(1)})`);
      }
    }
  });
  
  // If no common patterns, identify top and bottom performers
  if (strengths.length === 0) {
    strengths.push('No common strengths identified across all profiles');
  }
  
  if (weaknesses.length === 0) {
    // Find the lowest average function
    const functionAverages: Record<string, number> = {};
    
    Object.keys(functionNames).forEach(functionId => {
      const scores: number[] = [];
      Object.values(scoreMatrix).forEach(profileScores => {
        if (profileScores[functionId] !== undefined) {
          scores.push(profileScores[functionId]);
        }
      });
      
      if (scores.length > 0) {
        functionAverages[functionId] = scores.reduce((a, b) => a + b, 0) / scores.length;
      }
    });
    
    const lowestFunction = Object.entries(functionAverages)
      .sort((a, b) => a[1] - b[1])[0];
    
    if (lowestFunction) {
      weaknesses.push(`${functionNames[lowestFunction[0]]} needs improvement (avg: ${lowestFunction[1].toFixed(1)})`);
    }
  }
  
  return { strengths, weaknesses };
}

function calculateCorrelation(scoreMatrix: Record<string, Record<string, number>>): number {
  const profileIds = Object.keys(scoreMatrix);
  
  if (profileIds.length < 2) {
    return 0;
  }
  
  // Calculate pairwise correlations
  const correlations: number[] = [];
  
  for (let i = 0; i < profileIds.length - 1; i++) {
    for (let j = i + 1; j < profileIds.length; j++) {
      const profileId1 = profileIds[i]!;
      const profileId2 = profileIds[j]!;
      const profile1 = scoreMatrix[profileId1]!;
      const profile2 = scoreMatrix[profileId2]!;
      
      // Get common functions
      const commonFunctions = Object.keys(profile1).filter(f => profile2[f] !== undefined);
      
      if (commonFunctions.length > 0) {
        // Calculate Pearson correlation
        const scores1 = commonFunctions.map(f => profile1[f]!);
        const scores2 = commonFunctions.map(f => profile2[f]!);
        
        const correlation = pearsonCorrelation(scores1, scores2);
        correlations.push(correlation);
      }
    }
  }
  
  // Return average correlation
  return correlations.length > 0 
    ? correlations.reduce((a, b) => a + b, 0) / correlations.length 
    : 0;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i]!, 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

function generateComparisonRecommendations(
  profiles: ProfileComparison[],
  scoreMatrix: Record<string, Record<string, number>>,
  _strengths: string[],
  weaknesses: string[],
  variance: number
): string[] {
  const recommendations: string[] = [];
  
  // Variance-based recommendations
  if (variance > 1) {
    recommendations.push('High variance detected: Consider knowledge sharing between high and low performers');
  }
  
  // Find best practices from top performer
  const topPerformer = profiles.reduce((prev, current) => 
    (current.avg_maturity > prev.avg_maturity) ? current : prev
  );
  
  if (topPerformer) {
    recommendations.push(`Study implementation practices from ${topPerformer.profile_name} (highest maturity: ${topPerformer.avg_maturity.toFixed(1)})`);
  }
  
  // Weakness-based recommendations
  if (weaknesses.length > 0) {
    recommendations.push(`Priority improvement areas: ${weaknesses.slice(0, 2).join(', ')}`);
  }
  
  // Industry-specific recommendations
  const industries = [...new Set(profiles.map(p => p.industry))];
  if (industries.length === 1) {
    recommendations.push(`All profiles are in ${industries[0]} - consider industry-specific benchmarking`);
  } else {
    recommendations.push('Cross-industry comparison detected - consider industry-specific requirements');
  }
  
  // Size-based recommendations
  const sizes = [...new Set(profiles.map(p => p.size))];
  if (sizes.length > 1) {
    recommendations.push('Different organization sizes detected - adjust expectations based on resource availability');
  }
  
  // Correlation-based recommendations
  const correlation = calculateCorrelation(scoreMatrix);
  if (correlation > 0.8) {
    recommendations.push('High correlation between profiles suggests similar security approaches');
  } else if (correlation < 0.3) {
    recommendations.push('Low correlation suggests diverse security strategies - opportunity for cross-learning');
  }
  
  return recommendations;
}

export const compareProfilesTool = {
  name: "compare_profiles",
  description: "Compare multiple profiles to identify differences and similarities",
  inputSchema: {
    type: "object",
    properties: {
      profile_ids: {
        type: "array",
        description: "Array of profile IDs to compare (2-5 profiles)",
        items: {
          type: "string"
        },
        minItems: 2,
        maxItems: 5
      }
    },
    required: ["profile_ids"]
  },
  execute: async (args: { profile_ids: string[] }, db: CSFDatabase) => {
    return await compareProfiles(db, args.profile_ids);
  }
};