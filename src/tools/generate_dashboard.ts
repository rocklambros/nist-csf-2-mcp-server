/**
 * Generate cybersecurity dashboard with metrics and visualizations
 */

import { Tool } from '../types/index.js';
import { Database } from 'better-sqlite3';
import { logger } from '../utils/logger.js';

interface GenerateDashboardParams {
  profile_id: string;
  dashboard_type: 'executive' | 'operational' | 'technical' | 'custom';
  include_trends?: boolean;
  time_period?: '7_days' | '30_days' | '90_days' | '1_year';
  include_alerts?: boolean;
  include_recommendations?: boolean;
  function_filter?: string;
  include_subcategory_breakdown?: boolean;
  include_implementation_status?: boolean;
  include_progress_tracking?: boolean;
  custom_widgets?: string[];
  layout_configuration?: {
    columns?: number;
    theme?: string;
  };
}

interface GenerateDashboardResponse {
  success: boolean;
  dashboard?: {
    profile_id: string;
    dashboard_type: string;
    widgets: Array<{
      widget_id: string;
      widget_type: string;
      title: string;
      data: any;
      position?: { row: number; col: number };
    }>;
    summary_metrics: {
      overall_maturity: number;
      compliance_percentage: number;
      risk_score: number;
      total_assessments?: number;
      completed_controls?: number;
      pending_actions?: number;
    };
    trends?: {
      maturity_trend: Array<{ date: string; value: number }>;
      risk_trend: Array<{ date: string; value: number }>;
      compliance_trend: Array<{ date: string; value: number }>;
    };
    alerts?: Array<{
      alert_id: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      category: string;
      created_date: string;
    }>;
    recommendations?: Array<{
      recommendation_id: string;
      priority: 'low' | 'medium' | 'high';
      title: string;
      description: string;
      estimated_effort: string;
    }>;
    function_filter?: string;
    subcategory_breakdown?: any;
    implementation_status?: any;
    progress_tracking?: any;
    custom_widgets?: string[];
    layout_configuration?: any;
    generated_date: string;
  };
  error?: string;
  message?: string;
}

function validateParams(params: GenerateDashboardParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.profile_id) errors.push('profile_id is required');
  if (!params.dashboard_type) errors.push('dashboard_type is required');

  const validDashboardTypes = ['executive', 'operational', 'technical', 'custom'];
  if (!validDashboardTypes.includes(params.dashboard_type)) {
    errors.push('Invalid dashboard_type');
  }

  const validTimePeriods = ['7_days', '30_days', '90_days', '1_year'];
  if (params.time_period && !validTimePeriods.includes(params.time_period)) {
    errors.push('Invalid time_period');
  }

  return { isValid: errors.length === 0, errors };
}

async function generateDashboard(params: GenerateDashboardParams, db: Database): Promise<GenerateDashboardResponse> {
  try {
    // Validate input
    const validation = validateParams(params);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'ValidationError',
        message: validation.errors.join(', ')
      };
    }

    // Verify profile exists
    const profile = db.prepare('SELECT * FROM profiles WHERE profile_id = ?').get(params.profile_id);
    if (!profile) {
      return {
        success: false,
        error: 'NotFound',
        message: 'Profile not found'
      };
    }

    const generatedDate = new Date().toISOString();

    // Get summary metrics
    const summaryMetrics = await getSummaryMetrics(params.profile_id, db);

    // Generate widgets based on dashboard type
    const widgets = await generateWidgets(params, db);

    // Get trends if requested
    let trends;
    if (params.include_trends) {
      trends = await getTrends(params.profile_id, params.time_period || '30_days', db);
    }

    // Get alerts if requested
    let alerts;
    if (params.include_alerts) {
      alerts = await getAlerts(params.profile_id, db);
    }

    // Get recommendations if requested
    let recommendations;
    if (params.include_recommendations) {
      recommendations = await getRecommendations(params.profile_id, db);
    }

    // Get additional data based on flags
    let subcategoryBreakdown, implementationStatus, progressTracking;
    if (params.include_subcategory_breakdown) {
      subcategoryBreakdown = await getSubcategoryBreakdown(params.profile_id, params.function_filter, db);
    }
    if (params.include_implementation_status) {
      implementationStatus = await getImplementationStatus(params.profile_id, db);
    }
    if (params.include_progress_tracking) {
      progressTracking = await getProgressTracking(params.profile_id, db);
    }

    logger.info('Dashboard generated successfully', { 
      profile_id: params.profile_id,
      dashboard_type: params.dashboard_type 
    });

    return {
      success: true,
      dashboard: {
        profile_id: params.profile_id,
        dashboard_type: params.dashboard_type,
        widgets,
        summary_metrics: summaryMetrics,
        trends,
        alerts,
        recommendations,
        function_filter: params.function_filter,
        subcategory_breakdown: subcategoryBreakdown,
        implementation_status: implementationStatus,
        progress_tracking: progressTracking,
        custom_widgets: params.custom_widgets,
        layout_configuration: params.layout_configuration,
        generated_date: generatedDate
      }
    };

  } catch (error) {
    logger.error('Generate dashboard error', error);
    return {
      success: false,
      error: 'InternalError',
      message: 'An error occurred while generating dashboard'
    };
  }
}

async function getSummaryMetrics(profileId: string, db: Database) {
  try {
    // Get assessment counts and averages
    const assessmentStats = db.prepare(`
      SELECT 
        COUNT(*) as total_assessments,
        AVG(maturity_score) as avg_maturity,
        COUNT(CASE WHEN implementation_level = 'Fully Implemented' THEN 1 END) as completed_controls
      FROM assessments 
      WHERE profile_id = ?
    `).get(profileId) as any;

    // Calculate compliance percentage
    const compliancePercentage = assessmentStats.total_assessments > 0 
      ? Math.round((assessmentStats.completed_controls / assessmentStats.total_assessments) * 100)
      : 0;

    // Get risk score (simplified calculation)
    const overallMaturity = assessmentStats.avg_maturity || 1;
    const riskScore = Math.max(0.1, (5 - overallMaturity) / 4); // Inverse of maturity

    return {
      overall_maturity: Math.round(overallMaturity * 10) / 10,
      compliance_percentage: compliancePercentage,
      risk_score: Math.round(riskScore * 100) / 100,
      total_assessments: assessmentStats.total_assessments || 0,
      completed_controls: assessmentStats.completed_controls || 0,
      pending_actions: Math.max(0, (assessmentStats.total_assessments || 0) - (assessmentStats.completed_controls || 0))
    };
  } catch (error) {
    // Return default metrics on error
    return {
      overall_maturity: 1.0,
      compliance_percentage: 0,
      risk_score: 1.0,
      total_assessments: 0,
      completed_controls: 0,
      pending_actions: 0
    };
  }
}

async function generateWidgets(params: GenerateDashboardParams, _db: Database) {
  const widgets = [];

  if (params.dashboard_type === 'executive') {
    widgets.push(
      {
        widget_id: 'maturity-overview',
        widget_type: 'gauge',
        title: 'Overall Maturity',
        data: { value: 2.5, max: 5, target: 4 },
        position: { row: 0, col: 0 }
      },
      {
        widget_id: 'risk-summary',
        widget_type: 'risk-meter',
        title: 'Risk Level',
        data: { level: 'Medium', score: 0.6, trend: 'decreasing' },
        position: { row: 0, col: 1 }
      },
      {
        widget_id: 'compliance-status',
        widget_type: 'donut-chart',
        title: 'Compliance Status',
        data: { compliant: 65, partial: 25, non_compliant: 10 },
        position: { row: 1, col: 0 }
      }
    );
  } else if (params.dashboard_type === 'operational') {
    widgets.push(
      {
        widget_id: 'function-breakdown',
        widget_type: 'bar-chart',
        title: 'Implementation by Function',
        data: {
          categories: ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'],
          values: [75, 60, 45, 30, 25, 20]
        },
        position: { row: 0, col: 0 }
      },
      {
        widget_id: 'recent-assessments',
        widget_type: 'table',
        title: 'Recent Assessments',
        data: {
          headers: ['Subcategory', 'Level', 'Date'],
          rows: [
            ['GV.OC-01', 'Partially Implemented', '2024-01-15'],
            ['ID.AM-01', 'Fully Implemented', '2024-01-14']
          ]
        },
        position: { row: 1, col: 0 }
      }
    );
  } else if (params.dashboard_type === 'technical') {
    widgets.push(
      {
        widget_id: 'maturity-heatmap',
        widget_type: 'heatmap',
        title: 'Maturity Heatmap',
        data: {
          functions: ['GV', 'ID', 'PR', 'DE', 'RS', 'RC'],
          categories: ['OC', 'RM', 'RR', 'PO', 'OV', 'SC'],
          values: [[3, 2, 4, 2, 3, 1], [2, 3, 2, 4, 2, 3]]
        },
        position: { row: 0, col: 0 }
      }
    );
  } else if (params.dashboard_type === 'custom' && params.custom_widgets) {
    // Generate custom widgets based on the requested widget types
    params.custom_widgets.forEach((widgetType, index) => {
      widgets.push({
        widget_id: `custom-${widgetType}-${index}`,
        widget_type: widgetType,
        title: getWidgetTitle(widgetType),
        data: getWidgetData(widgetType),
        position: { row: Math.floor(index / 2), col: index % 2 }
      });
    });
  }

  return widgets;
}

function getWidgetTitle(widgetType: string): string {
  const titles: Record<string, string> = {
    'maturity_radar': 'Maturity Radar Chart',
    'risk_heatmap': 'Risk Heatmap',
    'compliance_matrix': 'Compliance Matrix',
    'progress_timeline': 'Progress Timeline'
  };
  return titles[widgetType] || 'Custom Widget';
}

function getWidgetData(widgetType: string): any {
  const mockData: Record<string, any> = {
    'maturity_radar': {
      functions: ['Govern', 'Identify', 'Protect', 'Detect', 'Respond', 'Recover'],
      current: [3, 2, 4, 2, 3, 1],
      target: [4, 4, 4, 4, 3, 3]
    },
    'risk_heatmap': {
      risks: [
        { category: 'Cyber Threats', likelihood: 3, impact: 4, level: 'High' },
        { category: 'Data Breach', likelihood: 2, impact: 5, level: 'High' }
      ]
    },
    'compliance_matrix': {
      frameworks: ['SOC2', 'ISO27001', 'NIST'],
      compliance_rates: [85, 72, 90]
    },
    'progress_timeline': {
      milestones: [
        { date: '2024-01-01', title: 'Assessment Started', status: 'completed' },
        { date: '2024-02-01', title: 'Gap Analysis', status: 'in_progress' }
      ]
    }
  };
  return mockData[widgetType] || {};
}

async function getTrends(_profileId: string, timePeriod: string, _db: Database) {
  // Mock trend data - in real implementation, this would query historical data
  const now = new Date();
  const days = timePeriod === '7_days' ? 7 : timePeriod === '30_days' ? 30 : 90;
  
  const trends = {
    maturity_trend: [] as Array<{date: string, value: number}>,
    risk_trend: [] as Array<{date: string, value: number}>,
    compliance_trend: [] as Array<{date: string, value: number}>
  };

  for (let i = days; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '';
    trends.maturity_trend.push({ date, value: 2.0 + Math.random() * 1.5 });
    trends.risk_trend.push({ date, value: 0.3 + Math.random() * 0.4 });
    trends.compliance_trend.push({ date, value: 50 + Math.random() * 30 });
  }

  return trends;
}

async function getAlerts(_profileId: string, _db: Database) {
  return [
    {
      alert_id: 'alert-001',
      severity: 'high' as const,
      message: 'Multiple high-risk controls are not implemented',
      category: 'Risk Management',
      created_date: new Date().toISOString()
    },
    {
      alert_id: 'alert-002',
      severity: 'medium' as const,
      message: 'Assessment data is older than 90 days for some controls',
      category: 'Data Quality',
      created_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

async function getRecommendations(_profileId: string, _db: Database) {
  return [
    {
      recommendation_id: 'rec-001',
      priority: 'high' as const,
      title: 'Implement Identity Management Controls',
      description: 'Focus on implementing PR.AC controls to improve access management',
      estimated_effort: '4-6 weeks'
    },
    {
      recommendation_id: 'rec-002',
      priority: 'medium' as const,
      title: 'Enhance Detection Capabilities',
      description: 'Improve monitoring and detection through DE.CM subcategories',
      estimated_effort: '2-3 weeks'
    }
  ];
}

async function getSubcategoryBreakdown(profileId: string, functionFilter: string | undefined, db: Database) {
  let query = `
    SELECT s.id, s.name, a.implementation_level, a.maturity_score
    FROM subcategories s
    LEFT JOIN assessments a ON s.id = a.subcategory_id AND a.profile_id = ?
  `;
  const params = [profileId];

  if (functionFilter) {
    query += ' WHERE s.id LIKE ?';
    params.push(`${functionFilter}.%`);
  }

  const results = db.prepare(query).all(...params);
  return results;
}

async function getImplementationStatus(profileId: string, db: Database) {
  const statusCounts = db.prepare(`
    SELECT 
      implementation_level,
      COUNT(*) as count
    FROM assessments 
    WHERE profile_id = ?
    GROUP BY implementation_level
  `).all(profileId);

  return statusCounts;
}

async function getProgressTracking(profileId: string, db: Database) {
  try {
    const progress = db.prepare(`
      SELECT 
        subcategory_id,
        target_implementation,
        current_implementation,
        progress_percentage,
        status
      FROM progress_tracking 
      WHERE profile_id = ?
    `).all(profileId);

    return progress;
  } catch (error) {
    // Return empty array if progress_tracking table doesn't exist
    return [];
  }
}

export const generateDashboardTool: Tool = {
  name: 'generate_dashboard',
  description: 'Generate cybersecurity dashboard with metrics and visualizations',
  inputSchema: {
    type: 'object',
    properties: {
      profile_id: {
        type: 'string',
        description: 'ID of the profile'
      },
      dashboard_type: {
        type: 'string',
        enum: ['executive', 'operational', 'technical', 'custom'],
        description: 'Type of dashboard to generate'
      },
      include_trends: {
        type: 'boolean',
        description: 'Whether to include trend data'
      },
      time_period: {
        type: 'string',
        enum: ['7_days', '30_days', '90_days', '1_year'],
        description: 'Time period for trends and metrics'
      },
      include_alerts: {
        type: 'boolean',
        description: 'Whether to include alerts'
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Whether to include recommendations'
      },
      function_filter: {
        type: 'string',
        description: 'Filter dashboard by CSF function'
      },
      include_subcategory_breakdown: {
        type: 'boolean',
        description: 'Whether to include subcategory breakdown'
      },
      include_implementation_status: {
        type: 'boolean',
        description: 'Whether to include implementation status'
      },
      include_progress_tracking: {
        type: 'boolean',
        description: 'Whether to include progress tracking data'
      },
      custom_widgets: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of custom widgets to include'
      },
      layout_configuration: {
        type: 'object',
        description: 'Layout configuration for the dashboard'
      }
    },
    required: ['profile_id', 'dashboard_type']
  }
};

export { generateDashboard };