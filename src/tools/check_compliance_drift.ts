import { CSFDatabase } from "../db/database.js";

interface DriftItem {
  subcategory_id: string;
  subcategory_name: string;
  previous_maturity: number | null;
  current_maturity: number | null;
  drift_direction: 'degraded' | 'improved' | 'stable' | 'new' | 'removed';
  drift_severity: 'critical' | 'high' | 'medium' | 'low';
  drift_percentage: number;
  days_since_change: number;
}

interface DriftAlert {
  type: 'critical' | 'warning' | 'info';
  message: string;
  affected_subcategories: string[];
  recommended_action: string;
}

interface ComplianceDriftReport {
  profile_id: string;
  assessment_date: string;
  total_subcategories_evaluated: number;
  degraded_count: number;
  improved_count: number;
  stable_count: number;
  new_implementations: number;
  removed_implementations: number;
  critical_drifts: DriftItem[];
  all_drifts: DriftItem[];
  alerts: DriftAlert[];
  recommendations: string[];
  overall_compliance_trend: 'improving' | 'degrading' | 'stable';
  compliance_score_change: number;
}

function calculateDriftSeverity(
  _previousMaturity: number | null,
  currentMaturity: number | null,
  driftPercentage: number
): 'critical' | 'high' | 'medium' | 'low' {
  // Critical: Significant degradation (>40% drop or drop to 0)
  if (currentMaturity === 0 || driftPercentage <= -40) {
    return 'critical';
  }
  // High: Moderate degradation (20-40% drop)
  if (driftPercentage <= -20) {
    return 'high';
  }
  // Medium: Minor degradation or significant improvement
  if (driftPercentage <= -10 || driftPercentage >= 30) {
    return 'medium';
  }
  // Low: Minimal change
  return 'low';
}

function generateRecommendations(drifts: DriftItem[]): string[] {
  const recommendations: string[] = [];
  
  // Check for critical degradations
  const criticalDrifts = drifts.filter(d => d.drift_severity === 'critical');
  if (criticalDrifts.length > 0) {
    recommendations.push(
      `URGENT: ${criticalDrifts.length} subcategories have critically degraded. Immediate remediation required.`
    );
    recommendations.push(
      'Schedule emergency review meetings for all critical degradations within 24 hours.'
    );
  }

  // Check for high severity degradations
  const highDrifts = drifts.filter(d => d.drift_severity === 'high');
  if (highDrifts.length > 0) {
    recommendations.push(
      `Review and address ${highDrifts.length} high-severity degradations within the next week.`
    );
  }

  // Check for patterns
  const degradedCount = drifts.filter(d => d.drift_direction === 'degraded').length;
  const improvedCount = drifts.filter(d => d.drift_direction === 'improved').length;
  
  if (degradedCount > improvedCount * 2) {
    recommendations.push(
      'Overall compliance is degrading. Consider conducting a comprehensive security review.'
    );
    recommendations.push(
      'Evaluate resource allocation and team capacity for security initiatives.'
    );
  }

  // Check for stale implementations
  const staleImplementations = drifts.filter(d => d.days_since_change > 90);
  if (staleImplementations.length > 0) {
    recommendations.push(
      `${staleImplementations.length} subcategories haven't been reviewed in over 90 days. Schedule periodic reviews.`
    );
  }

  // Positive reinforcement
  if (improvedCount > 5) {
    recommendations.push(
      `Excellent progress: ${improvedCount} subcategories have improved. Continue current improvement initiatives.`
    );
  }

  // If no specific issues
  if (recommendations.length === 0) {
    recommendations.push('Compliance status is stable. Maintain current security posture and monitoring.');
  }

  return recommendations;
}

function generateAlerts(drifts: DriftItem[]): DriftAlert[] {
  const alerts: DriftAlert[] = [];

  // Critical alerts
  const criticalDrifts = drifts.filter(d => d.drift_severity === 'critical');
  if (criticalDrifts.length > 0) {
    alerts.push({
      type: 'critical',
      message: `CRITICAL: ${criticalDrifts.length} subcategories have severely degraded compliance`,
      affected_subcategories: criticalDrifts.map(d => d.subcategory_id),
      recommended_action: 'Initiate incident response protocol and conduct immediate root cause analysis'
    });
  }

  // Warning alerts
  const degradedDrifts = drifts.filter(d => d.drift_direction === 'degraded');
  if (degradedDrifts.length >= 5) {
    alerts.push({
      type: 'warning',
      message: `WARNING: ${degradedDrifts.length} subcategories show compliance degradation`,
      affected_subcategories: degradedDrifts.map(d => d.subcategory_id),
      recommended_action: 'Review security controls and update implementation plans'
    });
  }

  // Info alerts for improvements
  const improvedDrifts = drifts.filter(d => d.drift_direction === 'improved');
  if (improvedDrifts.length >= 3) {
    alerts.push({
      type: 'info',
      message: `${improvedDrifts.length} subcategories show compliance improvement`,
      affected_subcategories: improvedDrifts.map(d => d.subcategory_id),
      recommended_action: 'Document successful practices for replication across other areas'
    });
  }

  return alerts;
}

export async function checkComplianceDrift(
  db: CSFDatabase,
  profile_id: string
): Promise<ComplianceDriftReport> {
  try {
    // Get drift analysis from database
    const driftResults = db.detectComplianceDrift(profile_id) || [];
    
    // Process and enrich drift data
    const enrichedDrifts: DriftItem[] = driftResults.map((drift: any) => {
      const driftPercentage = drift.drift_percentage || 0;
      const severity = calculateDriftSeverity(
        drift.previous_maturity,
        drift.current_maturity,
        driftPercentage
      );

      return {
        subcategory_id: drift.subcategory_id,
        subcategory_name: drift.subcategory_name || drift.subcategory_id,
        previous_maturity: drift.previous_maturity,
        current_maturity: drift.current_maturity,
        drift_direction: drift.drift_direction as DriftItem['drift_direction'],
        drift_severity: severity,
        drift_percentage: driftPercentage,
        days_since_change: drift.days_since_change || 0
      };
    });

    // Separate critical drifts
    const criticalDrifts = enrichedDrifts.filter(d => d.drift_severity === 'critical');
    
    // Count by direction
    const degradedCount = enrichedDrifts.filter(d => d.drift_direction === 'degraded').length;
    const improvedCount = enrichedDrifts.filter(d => d.drift_direction === 'improved').length;
    const stableCount = enrichedDrifts.filter(d => d.drift_direction === 'stable').length;
    const newCount = enrichedDrifts.filter(d => d.drift_direction === 'new').length;
    const removedCount = enrichedDrifts.filter(d => d.drift_direction === 'removed').length;

    // Calculate overall trend
    let overallTrend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (improvedCount > degradedCount + 2) {
      overallTrend = 'improving';
    } else if (degradedCount > improvedCount + 2) {
      overallTrend = 'degrading';
    }

    // Calculate compliance score change
    const complianceScoreChange = enrichedDrifts.reduce((sum, drift) => {
      return sum + (drift.drift_percentage || 0);
    }, 0) / Math.max(enrichedDrifts.length, 1);

    // Generate alerts and recommendations
    const alerts = generateAlerts(enrichedDrifts);
    const recommendations = generateRecommendations(enrichedDrifts);

    // Record critical drifts to history
    if (criticalDrifts.length > 0 || degradedCount > 3) {
      criticalDrifts.forEach(drift => {
        db.recordComplianceDrift({
          id: `${profile_id}_${drift.subcategory_id}_${Date.now()}`,
          profile_id,
          subcategory_id: drift.subcategory_id,
          previous_implementation: drift.previous_maturity?.toString() || 'unknown',
          current_implementation: drift.current_maturity?.toString() || 'unknown',
          drift_type: drift.drift_direction,
          drift_severity: drift.drift_severity,
          risk_impact: drift.drift_severity === 'critical' ? 'high' : 'medium',
          notification_sent: false,
          resolved: false,
          resolution_notes: null
        });
      });
    }

    // Build the report
    const report: ComplianceDriftReport = {
      profile_id,
      assessment_date: new Date().toISOString(),
      total_subcategories_evaluated: enrichedDrifts.length,
      degraded_count: degradedCount,
      improved_count: improvedCount,
      stable_count: stableCount,
      new_implementations: newCount,
      removed_implementations: removedCount,
      critical_drifts: criticalDrifts,
      all_drifts: enrichedDrifts,
      alerts,
      recommendations,
      overall_compliance_trend: overallTrend,
      compliance_score_change: Math.round(complianceScoreChange * 100) / 100
    };

    return report;
  } catch (error) {
    console.error('Error checking compliance drift:', error);
    throw new Error(`Failed to check compliance drift: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const checkComplianceDriftTool = {
  name: "check_compliance_drift",
  description: "Analyze compliance drift by comparing current assessments with previous baselines",
  inputSchema: {
    type: "object",
    properties: {
      profile_id: {
        type: "string",
        description: "ID of the profile to check for compliance drift"
      }
    },
    required: ["profile_id"]
  },
  execute: async (args: { profile_id: string }, db: CSFDatabase) => {
    return await checkComplianceDrift(db, args.profile_id);
  }
};