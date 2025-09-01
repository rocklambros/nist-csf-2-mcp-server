import { CSFDatabase } from "../db/database.js";
import { 
  ALL_BENCHMARKS, 
  INDUSTRY_METADATA,
  BenchmarkData 
} from "../data/industry-benchmarks.js";

interface BenchmarkComparison {
  profile_id: string;
  industry: string;
  organization_size: string;
  benchmark_year: number;
  function_comparisons: Array<{
    function_id: string;
    function_name: string;
    organization_score: number;
    industry_average: number;
    industry_median: number;
    percentile_ranking: string;
    variance_from_average: number;
    performance_indicator: 'above_average' | 'average' | 'below_average';
  }>;
  overall_performance: {
    average_maturity: number;
    industry_average: number;
    percentile_estimate: string;
    strengths: string[];
    improvement_areas: string[];
  };
  peer_comparison: {
    total_organizations_in_benchmark: number;
    organization_rank_estimate: string;
    top_quartile_gap: number;
    recommendations: string[];
  };
  industry_insights: {
    typical_frameworks: string[];
    critical_functions: string[];
    industry_trends: string[];
  };
}

export async function getIndustryBenchmarks(
  db: CSFDatabase,
  profile_id: string,
  industry: string,
  organization_size: string
): Promise<BenchmarkComparison> {
  try {
    // Load benchmark data into database if not already present
    await loadBenchmarkData(db, industry, organization_size);
    
    // Get profile's current maturity scores
    const profileComparison = db.compareProfileToBenchmark(profile_id, industry, organization_size);
    
    // Get benchmark data for the industry
    const benchmarks = db.getIndustryBenchmarks(industry, organization_size);
    
    // Process function comparisons
    const functionComparisons: any[] = [];
    const strengths: string[] = [];
    const improvementAreas: string[] = [];
    let totalOrgScore = 0;
    let totalIndustryAvg = 0;
    let functionCount = 0;
    
    // Map function IDs to names
    const functionNames: Record<string, string> = {
      'GV': 'Govern',
      'ID': 'Identify',
      'PR': 'Protect',
      'DE': 'Detect',
      'RS': 'Respond',
      'RC': 'Recover'
    };
    
    profileComparison.forEach((comp: any) => {
      const functionName = functionNames[comp.function_id] || comp.function_id;
      const orgScore = comp.organization_score || 0;
      const industryAvg = comp.industry_average || 0;
      
      functionComparisons.push({
        function_id: comp.function_id,
        function_name: functionName,
        organization_score: Math.round(orgScore * 10) / 10,
        industry_average: Math.round(industryAvg * 10) / 10,
        industry_median: Math.round((comp.industry_median || 0) * 10) / 10,
        percentile_ranking: comp.percentile_ranking || 'Not Available',
        variance_from_average: Math.round((comp.variance_from_average || 0) * 10) / 10,
        performance_indicator: getPerformanceIndicator(orgScore, industryAvg)
      });
      
      // Track strengths and weaknesses
      if (orgScore > industryAvg + 0.5) {
        strengths.push(`${functionName} (${Math.round(orgScore * 10) / 10} vs industry ${Math.round(industryAvg * 10) / 10})`);
      } else if (orgScore < industryAvg - 0.5) {
        improvementAreas.push(`${functionName} (${Math.round(orgScore * 10) / 10} vs industry ${Math.round(industryAvg * 10) / 10})`);
      }
      
      totalOrgScore += orgScore;
      totalIndustryAvg += industryAvg;
      functionCount++;
    });
    
    // Calculate overall performance
    const avgOrgScore = functionCount > 0 ? totalOrgScore / functionCount : 0;
    const avgIndustryScore = functionCount > 0 ? totalIndustryAvg / functionCount : 0;
    
    // Estimate percentile ranking
    const percentileEstimate = estimatePercentile(avgOrgScore, benchmarks);
    
    // Calculate top quartile gap
    const topQuartileScores = benchmarks
      .filter(b => b.metric_name === 'maturity_score')
      .map(b => b.percentile_75);
    const avgTopQuartile = topQuartileScores.length > 0 
      ? topQuartileScores.reduce((a, b) => a + b, 0) / topQuartileScores.length 
      : 4.0;
    const topQuartileGap = Math.max(0, avgTopQuartile - avgOrgScore);
    
    // Get industry metadata
    const industryMeta = INDUSTRY_METADATA[industry as keyof typeof INDUSTRY_METADATA] || {
      typical_frameworks: [],
      critical_functions: [],
      description: industry
    };
    
    // Generate recommendations
    const recommendations = generateRecommendations(
      avgOrgScore,
      avgIndustryScore,
      topQuartileGap,
      improvementAreas,
      industryMeta
    );
    
    // Generate industry trends
    const industryTrends = generateIndustryTrends(industry, organization_size);
    
    // Calculate sample size
    const sampleSize = benchmarks.length > 0 && benchmarks[0].sample_size 
      ? benchmarks[0].sample_size 
      : 100;
    
    return {
      profile_id,
      industry,
      organization_size,
      benchmark_year: 2024,
      function_comparisons: functionComparisons,
      overall_performance: {
        average_maturity: Math.round(avgOrgScore * 10) / 10,
        industry_average: Math.round(avgIndustryScore * 10) / 10,
        percentile_estimate: percentileEstimate,
        strengths: strengths.length > 0 ? strengths : ['No significant strengths identified'],
        improvement_areas: improvementAreas.length > 0 ? improvementAreas : ['No critical gaps identified']
      },
      peer_comparison: {
        total_organizations_in_benchmark: sampleSize,
        organization_rank_estimate: estimateRank(avgOrgScore, sampleSize, percentileEstimate),
        top_quartile_gap: Math.round(topQuartileGap * 10) / 10,
        recommendations
      },
      industry_insights: {
        typical_frameworks: industryMeta.typical_frameworks || [],
        critical_functions: industryMeta.critical_functions || [],
        industry_trends: industryTrends
      }
    };
  } catch (error) {
    console.error('Error getting industry benchmarks:', error);
    throw new Error(`Failed to get industry benchmarks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function loadBenchmarkData(db: CSFDatabase, industry: string, organizationSize: string): Promise<void> {
  // Check if data already exists
  const existing = db.getIndustryBenchmarks(industry, organizationSize);
  if (existing.length > 0) {
    return; // Data already loaded
  }
  
  // Load relevant benchmark data
  const relevantBenchmarks = ALL_BENCHMARKS.filter(
    b => b.industry === industry && b.organization_size === organizationSize
  );
  
  // If no exact match, try to find similar data
  if (relevantBenchmarks.length === 0) {
    // Try same industry, different size
    const similarBenchmarks = ALL_BENCHMARKS.filter(b => b.industry === industry);
    if (similarBenchmarks.length > 0) {
      // Adjust scores based on organization size
      similarBenchmarks.forEach(b => {
        const adjusted = adjustBenchmarkForSize(b, organizationSize);
        db.upsertIndustryBenchmark({
          ...adjusted,
          id: `${adjusted.industry}_${adjusted.organization_size}_${adjusted.csf_function}_${adjusted.metric_name}`
        });
      });
    } else {
      // Use cross-industry average
      createDefaultBenchmarks(db, industry, organizationSize);
    }
  } else {
    // Load exact matches
    relevantBenchmarks.forEach(b => {
      db.upsertIndustryBenchmark({
        ...b,
        id: `${b.industry}_${b.organization_size}_${b.csf_function}_${b.metric_name}`
      });
    });
  }
}

function adjustBenchmarkForSize(benchmark: BenchmarkData, targetSize: string): BenchmarkData {
  // Adjustment factors based on organization size
  const sizeAdjustments: Record<string, number> = {
    'small': -0.8,
    'medium': -0.4,
    'large': 0,
    'enterprise': 0.2
  };
  
  const sourceAdjustment = sizeAdjustments[benchmark.organization_size] || 0;
  const targetAdjustment = sizeAdjustments[targetSize] || 0;
  const adjustment = targetAdjustment - sourceAdjustment;
  
  return {
    ...benchmark,
    organization_size: targetSize,
    percentile_25: Math.max(1, benchmark.percentile_25 + adjustment),
    percentile_50: Math.max(1, benchmark.percentile_50 + adjustment),
    percentile_75: Math.max(1, benchmark.percentile_75 + adjustment),
    percentile_90: Math.max(1, benchmark.percentile_90 + adjustment),
    average_score: Math.max(1, benchmark.average_score + adjustment)
  };
}

function createDefaultBenchmarks(db: CSFDatabase, industry: string, organizationSize: string): void {
  // Create default benchmarks based on organization size
  const defaultScores: Record<string, any> = {
    'small': { p25: 1.8, p50: 2.4, p75: 3.0, p90: 3.5, avg: 2.5 },
    'medium': { p25: 2.2, p50: 2.9, p75: 3.5, p90: 4.0, avg: 3.0 },
    'large': { p25: 2.7, p50: 3.4, p75: 4.0, p90: 4.5, avg: 3.5 },
    'enterprise': { p25: 3.0, p50: 3.7, p75: 4.3, p90: 4.7, avg: 3.8 }
  };
  
  const scores = defaultScores[organizationSize] || defaultScores['medium'];
  const functions = ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'];
  
  functions.forEach(func => {
    db.upsertIndustryBenchmark({
      id: `${industry}_${organizationSize}_${func}_maturity_score`,
      industry,
      organization_size: organizationSize,
      csf_function: func,
      metric_name: 'maturity_score',
      percentile_25: scores.p25,
      percentile_50: scores.p50,
      percentile_75: scores.p75,
      percentile_90: scores.p90,
      average_score: scores.avg,
      sample_size: 50,
      data_year: 2024,
      source: 'Industry Estimate'
    });
  });
}

function getPerformanceIndicator(orgScore: number, industryAvg: number): 'above_average' | 'average' | 'below_average' {
  if (orgScore > industryAvg + 0.3) {
    return 'above_average';
  } else if (orgScore < industryAvg - 0.3) {
    return 'below_average';
  } else {
    return 'average';
  }
}

function estimatePercentile(score: number, benchmarks: any[]): string {
  if (benchmarks.length === 0) {
    return 'No data available';
  }
  
  const maturityBenchmarks = benchmarks.filter(b => b.metric_name === 'maturity_score');
  if (maturityBenchmarks.length === 0) {
    return 'No maturity data';
  }
  
  // Average the percentiles across functions
  let percentileSum = 0;
  let count = 0;
  
  maturityBenchmarks.forEach(b => {
    if (score >= b.percentile_90) {
      percentileSum += 95;
    } else if (score >= b.percentile_75) {
      percentileSum += 82;
    } else if (score >= b.percentile_50) {
      percentileSum += 62;
    } else if (score >= b.percentile_25) {
      percentileSum += 37;
    } else {
      percentileSum += 12;
    }
    count++;
  });
  
  const avgPercentile = count > 0 ? Math.round(percentileSum / count) : 50;
  
  if (avgPercentile >= 90) return 'Top 10%';
  if (avgPercentile >= 75) return 'Top 25%';
  if (avgPercentile >= 50) return 'Above Median';
  if (avgPercentile >= 25) return 'Below Median';
  return 'Bottom 25%';
}

function estimateRank(_score: number, sampleSize: number, percentile: string): string {
  const percentileMap: Record<string, number> = {
    'Top 10%': 0.05,
    'Top 25%': 0.175,
    'Above Median': 0.4,
    'Below Median': 0.6,
    'Bottom 25%': 0.875,
    'No data available': 0.5
  };
  
  const percentileValue = percentileMap[percentile] || 0.5;
  const estimatedRank = Math.round(sampleSize * percentileValue);
  
  return `Approximately ${estimatedRank} out of ${sampleSize} organizations`;
}

function generateRecommendations(
  orgScore: number,
  industryAvg: number,
  topQuartileGap: number,
  improvementAreas: string[],
  industryMeta: any
): string[] {
  const recommendations: string[] = [];
  
  // Performance-based recommendations
  if (orgScore < industryAvg - 0.5) {
    recommendations.push('Priority: Bring maturity up to industry average through focused improvements');
  }
  
  if (topQuartileGap > 1.0) {
    recommendations.push(`Develop roadmap to close ${Math.round(topQuartileGap * 10) / 10} point gap to top quartile performers`);
  }
  
  // Function-specific recommendations
  if (improvementAreas.length > 0) {
    recommendations.push(`Focus on improving: ${improvementAreas.slice(0, 2).join(', ')}`);
  }
  
  // Framework recommendations
  if (industryMeta.typical_frameworks && industryMeta.typical_frameworks.length > 0) {
    recommendations.push(`Consider aligning with industry-standard frameworks: ${industryMeta.typical_frameworks.slice(0, 2).join(', ')}`);
  }
  
  // Critical function recommendations
  if (industryMeta.critical_functions && industryMeta.critical_functions.length > 0) {
    recommendations.push(`Prioritize industry-critical functions: ${industryMeta.critical_functions.join(', ')}`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Maintain current performance and focus on continuous improvement');
  }
  
  return recommendations;
}

function generateIndustryTrends(industry: string, _organizationSize: string): string[] {
  
  // Industry-specific trends
  const industryTrends: Record<string, string[]> = {
    'Financial Services': [
      'Increased focus on cloud security and API protection',
      'Growing adoption of zero-trust architecture',
      'Enhanced fraud detection through AI/ML'
    ],
    'Healthcare': [
      'Expanding telehealth security requirements',
      'Medical device security becoming critical',
      'Increased ransomware preparedness'
    ],
    'Manufacturing': [
      'OT/IT convergence driving security transformation',
      'Supply chain security gaining prominence',
      'Industrial IoT security challenges'
    ],
    'Retail': [
      'E-commerce security and PCI compliance focus',
      'Customer data privacy regulations tightening',
      'Omnichannel security complexity'
    ],
    'Technology': [
      'DevSecOps integration accelerating',
      'Software supply chain security critical',
      'API security and container security focus'
    ],
    'Government': [
      'Zero trust mandate implementation',
      'Supply chain risk management requirements',
      'Continuous diagnostics and mitigation'
    ],
    'Energy': [
      'Critical infrastructure protection priorities',
      'Grid modernization security challenges',
      'Increased nation-state threat activity'
    ]
  };
  
  return industryTrends[industry] || [
    'Increasing regulatory compliance requirements',
    'Growing focus on supply chain security',
    'Shift toward risk-based security strategies'
  ];
}

export const getIndustryBenchmarksTool = {
  name: "get_industry_benchmarks",
  description: "Compare organization against industry benchmarks and peer organizations",
  inputSchema: {
    type: "object",
    properties: {
      profile_id: {
        type: "string",
        description: "ID of the profile to benchmark"
      },
      industry: {
        type: "string",
        enum: ["Financial Services", "Healthcare", "Manufacturing", "Retail", "Technology", "Government", "Energy"],
        description: "Industry sector"
      },
      organization_size: {
        type: "string",
        enum: ["small", "medium", "large", "enterprise"],
        description: "Organization size"
      }
    },
    required: ["profile_id", "industry", "organization_size"]
  },
  execute: async (args: { profile_id: string; industry: string; organization_size: string }, db: CSFDatabase) => {
    return await getIndustryBenchmarks(db, args.profile_id, args.industry, args.organization_size);
  }
};