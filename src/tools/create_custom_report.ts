/**
 * Create custom cybersecurity reports with flexible templates and content
 */

import { Tool } from '../types/index.js';
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

interface CreateCustomReportParams {
  profile_id: string;
  report_name: string;
  report_description?: string;
  template_type?: 'technical' | 'executive' | 'compliance' | 'operational' | 'blank';
  custom_sections: Array<{
    section_id: string;
    section_name: string;
    section_type: 'summary' | 'metrics' | 'analysis' | 'recommendations' | 'charts' | 'tables' | 'text' | 'custom';
    content_filters?: {
      function_ids?: string[];
      subcategory_ids?: string[];
      maturity_level_min?: number;
      maturity_level_max?: number;
      implementation_status?: string[];
      date_range?: {
        start_date: string;
        end_date: string;
      };
    };
    display_options?: {
      show_charts?: boolean;
      chart_type?: 'bar' | 'pie' | 'line' | 'heatmap';
      show_trends?: boolean;
      show_comparisons?: boolean;
      group_by?: 'function' | 'category' | 'maturity' | 'status';
      sort_by?: 'name' | 'maturity' | 'date' | 'priority';
      max_items?: number;
    };
    custom_content?: string;
  }>;
  output_format?: 'json' | 'html' | 'pdf' | 'csv';
  styling_options?: {
    theme?: 'corporate' | 'minimal' | 'detailed' | 'colorful';
    include_logo?: boolean;
    header_text?: string;
    footer_text?: string;
    color_scheme?: string;
  };
  data_sources?: {
    include_assessments?: boolean;
    include_evidence?: boolean;
    include_risk_data?: boolean;
    include_historical_data?: boolean;
    external_data_sources?: string[];
  };
  distribution_settings?: {
    recipients?: string[];
    delivery_schedule?: 'on_demand' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
    access_level?: 'public' | 'internal' | 'confidential' | 'restricted';
  };
}

interface CreateCustomReportResponse {
  success: boolean;
  report?: {
    report_id: string;
    profile_id: string;
    report_name: string;
    report_description: string;
    template_type: string;
    created_date: string;
    last_generated: string;
    
    report_metadata: {
      total_sections: number;
      data_points_included: number;
      output_format: string;
      estimated_generation_time: string;
    };
    
    sections: Array<{
      section_id: string;
      section_name: string;
      section_type: string;
      content: any;
      metrics?: {
        data_points: number;
        charts_included: number;
        tables_included: number;
      };
    }>;
    
    report_statistics: {
      controls_analyzed: number;
      functions_covered: string[];
      maturity_range: {
        min: number;
        max: number;
        average: number;
      };
      compliance_summary: {
        total_controls: number;
        compliant_controls: number;
        compliance_percentage: number;
      };
    };
    
    styling_applied: {
      theme: string;
      color_scheme: string;
      branding_included: boolean;
    };
    
    export_options: {
      available_formats: string[];
      download_links?: string[];
      sharing_settings: any;
    };
  };
  error?: string;
  message?: string;
}

function validateParams(params: CreateCustomReportParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.profile_id) errors.push('profile_id is required');
  if (!params.report_name) errors.push('report_name is required');
  if (!params.custom_sections || params.custom_sections.length === 0) {
    errors.push('At least one custom section is required');
  }

  const validTemplateTypes = ['technical', 'executive', 'compliance', 'operational', 'blank'];
  if (params.template_type && !validTemplateTypes.includes(params.template_type)) {
    errors.push('Invalid template_type');
  }

  const validSectionTypes = ['summary', 'metrics', 'analysis', 'recommendations', 'charts', 'tables', 'text', 'custom'];
  params.custom_sections?.forEach((section, index) => {
    if (!section.section_id) errors.push(`Section ${index + 1}: section_id is required`);
    if (!section.section_name) errors.push(`Section ${index + 1}: section_name is required`);
    if (!validSectionTypes.includes(section.section_type)) {
      errors.push(`Section ${index + 1}: Invalid section_type`);
    }
  });

  const validOutputFormats = ['json', 'html', 'pdf', 'csv'];
  if (params.output_format && !validOutputFormats.includes(params.output_format)) {
    errors.push('Invalid output_format');
  }

  return { isValid: errors.length === 0, errors };
}

async function createCustomReport(params: CreateCustomReportParams, db: Database): Promise<CreateCustomReportResponse> {
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

    const reportId = uuidv4();
    const createdDate = new Date().toISOString();
    const templateType = params.template_type || 'blank';
    const outputFormat = params.output_format || 'json';

    // Get base data for report generation
    const assessments = db.prepare(`
      SELECT a.*, s.name as subcategory_name, s.description as subcategory_description,
             c.name as category_name, f.name as function_name, f.id as function_id
      FROM assessments a
      JOIN subcategories s ON a.subcategory_id = s.id
      JOIN categories c ON s.category_id = c.id
      JOIN functions f ON c.function_id = f.id
      WHERE a.profile_id = ?
    `).all(params.profile_id);

    // Generate sections based on custom configuration
    const generatedSections = await generateCustomSections(params.custom_sections, assessments, db);
    
    // Calculate report statistics
    const reportStats = calculateReportStatistics(assessments, generatedSections);
    
    // Apply styling
    const stylingApplied = applyStyling(params.styling_options);
    
    // Configure export options
    const exportOptions = configureExportOptions(outputFormat, params.distribution_settings);
    
    // Calculate report metadata
    const totalDataPoints = generatedSections.reduce((sum, section) => 
      sum + (section.metrics?.data_points || 0), 0
    );

    logger.info('Custom report created successfully', { 
      report_id: reportId, 
      profile_id: params.profile_id,
      report_name: params.report_name,
      sections_count: generatedSections.length
    });

    return {
      success: true,
      report: {
        report_id: reportId,
        profile_id: params.profile_id,
        report_name: params.report_name,
        report_description: params.report_description || `Custom report: ${params.report_name}`,
        template_type: templateType,
        created_date: createdDate,
        last_generated: createdDate,
        report_metadata: {
          total_sections: generatedSections.length,
          data_points_included: totalDataPoints,
          output_format: outputFormat,
          estimated_generation_time: estimateGenerationTime(generatedSections.length, totalDataPoints)
        },
        sections: generatedSections,
        report_statistics: reportStats,
        styling_applied: stylingApplied,
        export_options: exportOptions
      }
    };

  } catch (error) {
    logger.error('Create custom report error', error);
    return {
      success: false,
      error: 'InternalError',
      message: 'An error occurred while creating custom report'
    };
  }
}

async function generateCustomSections(sections: any[], assessments: any[], _db: Database): Promise<any[]> {
  const generatedSections = [];

  for (const sectionConfig of sections) {
    // Filter data based on content filters
    const filteredData = applyContentFilters(assessments, sectionConfig.content_filters);
    
    // Generate section content based on type
    const sectionContent = generateSectionContent(
      sectionConfig.section_type, 
      filteredData, 
      sectionConfig.display_options,
      sectionConfig.custom_content
    );
    
    // Calculate section metrics
    const sectionMetrics = calculateSectionMetrics(sectionContent, sectionConfig.section_type);

    generatedSections.push({
      section_id: sectionConfig.section_id,
      section_name: sectionConfig.section_name,
      section_type: sectionConfig.section_type,
      content: sectionContent,
      metrics: sectionMetrics
    });
  }

  return generatedSections;
}

function applyContentFilters(assessments: any[], filters?: any): any[] {
  if (!filters) return assessments;

  let filteredData = [...assessments];

  // Filter by function IDs
  if (filters.function_ids && filters.function_ids.length > 0) {
    filteredData = filteredData.filter(a => 
      filters.function_ids.includes(a.function_id)
    );
  }

  // Filter by subcategory IDs
  if (filters.subcategory_ids && filters.subcategory_ids.length > 0) {
    filteredData = filteredData.filter(a => 
      filters.subcategory_ids.includes(a.subcategory_id)
    );
  }

  // Filter by maturity level range
  if (filters.maturity_level_min !== undefined) {
    filteredData = filteredData.filter(a => 
      (a.maturity_score || 0) >= filters.maturity_level_min
    );
  }
  if (filters.maturity_level_max !== undefined) {
    filteredData = filteredData.filter(a => 
      (a.maturity_score || 0) <= filters.maturity_level_max
    );
  }

  // Filter by implementation status
  if (filters.implementation_status && filters.implementation_status.length > 0) {
    filteredData = filteredData.filter(a => 
      filters.implementation_status.includes(a.implementation_level)
    );
  }

  // Filter by date range (would use actual date fields in real implementation)
  if (filters.date_range) {
    const startDate = new Date(filters.date_range.start_date);
    const endDate = new Date(filters.date_range.end_date);
    filteredData = filteredData.filter(a => {
      const assessmentDate = new Date(a.assessed_date || a.created_date || Date.now());
      return assessmentDate >= startDate && assessmentDate <= endDate;
    });
  }

  return filteredData;
}

function generateSectionContent(sectionType: string, data: any[], displayOptions?: any, customContent?: string): any {
  switch (sectionType) {
    case 'summary':
      return generateSummaryContent(data, displayOptions);
    
    case 'metrics':
      return generateMetricsContent(data, displayOptions);
    
    case 'analysis':
      return generateAnalysisContent(data, displayOptions);
    
    case 'recommendations':
      return generateRecommendationsContent(data, displayOptions);
    
    case 'charts':
      return generateChartsContent(data, displayOptions);
    
    case 'tables':
      return generateTablesContent(data, displayOptions);
    
    case 'text':
      return {
        content_type: 'text',
        text_content: customContent || 'Custom text content',
        word_count: (customContent || '').split(' ').length
      };
    
    case 'custom':
      return {
        content_type: 'custom',
        custom_data: data.slice(0, displayOptions?.max_items || 100),
        custom_content: customContent,
        item_count: Math.min(data.length, displayOptions?.max_items || 100)
      };
    
    default:
      return {
        content_type: 'default',
        data: data,
        item_count: data.length
      };
  }
}

function generateSummaryContent(data: any[], _displayOptions?: any): any {
  const totalControls = data.length;
  const fullyImplemented = data.filter(d => d.implementation_level === 'fully_implemented').length;
  const partiallyImplemented = data.filter(d => d.implementation_level === 'partially_implemented').length;
  const notImplemented = data.filter(d => d.implementation_level === 'not_implemented').length;
  
  const avgMaturity = data.length > 0 ? 
    data.reduce((sum, d) => sum + (d.maturity_score || 0), 0) / data.length : 0;

  return {
    content_type: 'summary',
    overview: {
      total_controls: totalControls,
      implementation_breakdown: {
        fully_implemented: fullyImplemented,
        partially_implemented: partiallyImplemented,
        not_implemented: notImplemented
      },
      implementation_percentage: totalControls > 0 ? 
        Math.round(((fullyImplemented + partiallyImplemented * 0.5) / totalControls) * 100) : 0,
      average_maturity: Math.round(avgMaturity * 10) / 10
    },
    key_insights: [
      `${fullyImplemented} controls are fully implemented`,
      `${partiallyImplemented} controls need improvement`,
      `Average maturity level: ${Math.round(avgMaturity * 10) / 10}/5.0`
    ]
  };
}

function generateMetricsContent(data: any[], _displayOptions?: any): any {
  const functionBreakdown = data.reduce((acc, item) => {
    const functionId = item.function_id || 'Unknown';
    if (!acc[functionId]) {
      acc[functionId] = { count: 0, total_maturity: 0 };
    }
    acc[functionId].count++;
    acc[functionId].total_maturity += item.maturity_score || 0;
    return acc;
  }, {});

  const metrics = Object.entries(functionBreakdown).map(([functionId, stats]: [string, any]) => ({
    function_id: functionId,
    control_count: stats.count,
    average_maturity: Math.round((stats.total_maturity / stats.count) * 10) / 10,
    maturity_percentage: Math.round((stats.total_maturity / stats.count / 5) * 100)
  }));

  return {
    content_type: 'metrics',
    function_metrics: metrics,
    overall_metrics: {
      total_functions: Object.keys(functionBreakdown).length,
      total_controls: data.length,
      highest_maturity_function: metrics.length > 0 ? metrics.reduce((max, curr) => 
        curr.average_maturity > (max?.average_maturity || 0) ? curr : max, metrics[0]
      ) : undefined,
      lowest_maturity_function: metrics.length > 0 ? metrics.reduce((min, curr) => 
        curr.average_maturity < (min?.average_maturity || Infinity) ? curr : min, metrics[0]
      ) : undefined
    }
  };
}

function generateAnalysisContent(data: any[], displayOptions?: any): any {
  const maturityDistribution = {
    'level_1': data.filter(d => (d.maturity_score || 0) >= 1 && (d.maturity_score || 0) < 2).length,
    'level_2': data.filter(d => (d.maturity_score || 0) >= 2 && (d.maturity_score || 0) < 3).length,
    'level_3': data.filter(d => (d.maturity_score || 0) >= 3 && (d.maturity_score || 0) < 4).length,
    'level_4': data.filter(d => (d.maturity_score || 0) >= 4 && (d.maturity_score || 0) < 5).length,
    'level_5': data.filter(d => (d.maturity_score || 0) === 5).length
  };

  const gapAnalysis = data
    .filter(d => (d.maturity_score || 0) < 3)
    .map(d => ({
      subcategory_id: d.subcategory_id,
      subcategory_name: d.subcategory_name,
      current_maturity: d.maturity_score || 0,
      gap_severity: d.maturity_score <= 1 ? 'critical' : 'moderate',
      recommended_actions: generateRecommendedActions(d)
    }));

  return {
    content_type: 'analysis',
    maturity_analysis: {
      distribution: maturityDistribution,
      overall_trend: analyzeMaturityTrend(data),
      improvement_opportunities: gapAnalysis.length
    },
    gap_analysis: gapAnalysis.slice(0, displayOptions?.max_items || 10),
    risk_assessment: {
      high_risk_controls: data.filter(d => (d.maturity_score || 0) <= 2).length,
      medium_risk_controls: data.filter(d => (d.maturity_score || 0) === 3).length,
      low_risk_controls: data.filter(d => (d.maturity_score || 0) >= 4).length
    }
  };
}

function generateRecommendationsContent(data: any[], _displayOptions?: any): any {
  const lowMaturityControls = data.filter(d => (d.maturity_score || 0) <= 2);
  
  const recommendations = lowMaturityControls
    .slice(0, _displayOptions?.max_items || 10)
    .map((control, index) => ({
      recommendation_id: `REC-${String(index + 1).padStart(3, '0')}`,
      priority: control.maturity_score <= 1 ? 'critical' : 'high',
      control_id: control.subcategory_id,
      control_name: control.subcategory_name,
      current_state: control.implementation_level || 'not_implemented',
      recommended_actions: generateRecommendedActions(control),
      estimated_effort: estimateImplementationEffort(control),
      expected_timeline: estimateImplementationTimeline(control),
      business_impact: assessBusinessImpact(control)
    }));

  return {
    content_type: 'recommendations',
    priority_recommendations: recommendations,
    summary: {
      total_recommendations: recommendations.length,
      critical_priority: recommendations.filter(r => r.priority === 'critical').length,
      high_priority: recommendations.filter(r => r.priority === 'high').length,
      estimated_total_effort: `${recommendations.length * 2}-${recommendations.length * 4} weeks`
    }
  };
}

function generateChartsContent(data: any[], _displayOptions?: any): any {
  const chartType = _displayOptions?.chart_type || 'bar';
  const chartData = prepareChartData(data, chartType, _displayOptions?.group_by);

  return {
    content_type: 'charts',
    chart_type: chartType,
    chart_data: chartData,
    chart_options: {
      title: `Security Control Analysis - ${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
      show_legend: true,
      show_values: _displayOptions?.show_comparisons || true,
      color_scheme: _displayOptions?.color_scheme || 'default'
    }
  };
}

function generateTablesContent(data: any[], displayOptions?: any): any {
  const sortBy = displayOptions?.sort_by || 'name';
  const maxItems = displayOptions?.max_items || 50;
  
  const sortedData = [...data].sort((a, b) => {
    switch (sortBy) {
      case 'maturity':
        return (b.maturity_score || 0) - (a.maturity_score || 0);
      case 'date':
        return new Date(b.assessed_date || b.created_date || 0).getTime() - 
               new Date(a.assessed_date || a.created_date || 0).getTime();
      case 'priority':
        const priorityOrder: Record<string, number> = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      default: // name
        return (a.subcategory_name || '').localeCompare(b.subcategory_name || '');
    }
  });

  return {
    content_type: 'tables',
    table_data: {
      headers: [
        'Control ID',
        'Control Name',
        'Function',
        'Implementation Status',
        'Maturity Score',
        'Last Assessed'
      ],
      rows: sortedData.slice(0, maxItems).map(item => [
        item.subcategory_id,
        item.subcategory_name,
        item.function_name,
        item.implementation_level || 'Not Assessed',
        item.maturity_score || 0,
        formatDate(item.assessed_date || item.created_date)
      ])
    },
    table_summary: {
      total_rows: sortedData.length,
      displayed_rows: Math.min(sortedData.length, maxItems),
      sorted_by: sortBy
    }
  };
}

// Helper functions
function generateRecommendedActions(control: any): string[] {
  const actions = [];
  
  if (!control.implementation_level || control.implementation_level === 'not_implemented') {
    actions.push('Develop and implement control procedures');
    actions.push('Assign responsible personnel');
    actions.push('Establish monitoring mechanisms');
  } else if (control.implementation_level === 'partially_implemented') {
    actions.push('Complete implementation of all control requirements');
    actions.push('Enhance existing procedures');
    actions.push('Improve documentation and evidence collection');
  }
  
  if ((control.maturity_score || 0) <= 2) {
    actions.push('Establish regular review and improvement processes');
    actions.push('Implement metrics and measurement');
  }

  return actions;
}

function estimateImplementationEffort(control: any): string {
  const maturity = control.maturity_score || 0;
  if (maturity <= 1) return '4-8 weeks';
  if (maturity <= 2) return '2-4 weeks';
  if (maturity <= 3) return '1-2 weeks';
  return '1 week';
}

function estimateImplementationTimeline(control: any): string {
  const maturity = control.maturity_score || 0;
  if (maturity <= 1) return '2-3 months';
  if (maturity <= 2) return '1-2 months';
  return '2-4 weeks';
}

function assessBusinessImpact(control: any): string {
  if (control.subcategory_id.includes('GV')) return 'High - Governance and oversight';
  if (control.subcategory_id.includes('ID')) return 'Medium - Asset and risk visibility';
  if (control.subcategory_id.includes('PR')) return 'High - Core protection capabilities';
  if (control.subcategory_id.includes('DE')) return 'Medium - Threat detection';
  if (control.subcategory_id.includes('RS')) return 'High - Incident response';
  if (control.subcategory_id.includes('RC')) return 'Medium - Recovery capabilities';
  return 'Medium - Security posture improvement';
}

function analyzeMaturityTrend(data: any[]): string {
  // Mock trend analysis - would use historical data in real implementation
  const avgMaturity = data.reduce((sum, d) => sum + (d.maturity_score || 0), 0) / data.length;
  if (avgMaturity >= 3.5) return 'Strong - Mature controls';
  if (avgMaturity >= 2.5) return 'Improving - Good progress';
  if (avgMaturity >= 1.5) return 'Developing - Needs attention';
  return 'Initial - Significant improvement needed';
}

function prepareChartData(data: any[], _chartType: string, groupBy?: string): any {
  const grouping = groupBy || 'function';
  
  const grouped = data.reduce((acc, item) => {
    const key = item[`${grouping}_name`] || item[grouping] || 'Unknown';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  return {
    labels: Object.keys(grouped),
    datasets: [{
      label: 'Average Maturity Score',
      data: Object.values(grouped).map((items: unknown) => {
        const itemArray = items as any[];
        return itemArray.reduce((sum, item) => sum + (item.maturity_score || 0), 0) / itemArray.length;
      }),
      backgroundColor: generateColors(Object.keys(grouped).length)
    }]
  };
}

function generateColors(count: number): string[] {
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
  ];
  return colors.slice(0, count);
}

function calculateSectionMetrics(content: any, sectionType: string): any {
  switch (sectionType) {
    case 'charts':
      return {
        data_points: content.chart_data?.datasets?.[0]?.data?.length || 0,
        charts_included: 1,
        tables_included: 0
      };
    case 'tables':
      return {
        data_points: content.table_data?.rows?.length || 0,
        charts_included: 0,
        tables_included: 1
      };
    case 'metrics':
      return {
        data_points: content.function_metrics?.length || 0,
        charts_included: 0,
        tables_included: 0
      };
    default:
      return {
        data_points: Array.isArray(content.data) ? content.data.length : 0,
        charts_included: 0,
        tables_included: 0
      };
  }
}

function calculateReportStatistics(assessments: any[], _sections: any[]): any {
  const functions = [...new Set(assessments.map(a => a.function_id))];
  const maturityScores = assessments.map(a => a.maturity_score || 0).filter(s => s > 0);
  const compliantControls = assessments.filter(a => 
    a.implementation_level === 'fully_implemented' || a.implementation_level === 'largely_implemented'
  ).length;

  return {
    controls_analyzed: assessments.length,
    functions_covered: functions,
    maturity_range: {
      min: Math.min(...maturityScores),
      max: Math.max(...maturityScores),
      average: maturityScores.length > 0 ? 
        Math.round((maturityScores.reduce((sum, s) => sum + s, 0) / maturityScores.length) * 10) / 10 : 0
    },
    compliance_summary: {
      total_controls: assessments.length,
      compliant_controls: compliantControls,
      compliance_percentage: assessments.length > 0 ? 
        Math.round((compliantControls / assessments.length) * 100) : 0
    }
  };
}

function applyStyling(stylingOptions?: any): any {
  return {
    theme: stylingOptions?.theme || 'corporate',
    color_scheme: stylingOptions?.color_scheme || 'default',
    branding_included: stylingOptions?.include_logo || false
  };
}

function configureExportOptions(outputFormat: string, distributionSettings?: any): any {
  const availableFormats = ['json', 'html', 'pdf', 'csv'];
  
  return {
    available_formats: availableFormats,
    download_links: [`/api/reports/download?format=${outputFormat}`],
    sharing_settings: {
      access_level: distributionSettings?.access_level || 'internal',
      recipients: distributionSettings?.recipients || [],
      delivery_schedule: distributionSettings?.delivery_schedule || 'on_demand'
    }
  };
}

function estimateGenerationTime(sectionCount: number, dataPoints: number): string {
  const baseTime = 2; // 2 seconds base
  const sectionTime = sectionCount * 0.5; // 0.5 seconds per section
  const dataTime = Math.ceil(dataPoints / 1000) * 0.1; // 0.1 seconds per 1000 data points
  
  const totalSeconds = baseTime + sectionTime + dataTime;
  
  if (totalSeconds < 60) {
    return `${Math.ceil(totalSeconds)} seconds`;
  } else {
    return `${Math.ceil(totalSeconds / 60)} minutes`;
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Not assessed';
  return new Date(dateString).toLocaleDateString();
}

export const createCustomReportTool: Tool = {
  name: 'create_custom_report',
  description: 'Create custom cybersecurity reports with flexible templates and content',
  inputSchema: {
    type: 'object',
    properties: {
      profile_id: {
        type: 'string',
        description: 'ID of the profile'
      },
      report_name: {
        type: 'string',
        description: 'Name of the custom report'
      },
      report_description: {
        type: 'string',
        description: 'Description of the custom report'
      },
      template_type: {
        type: 'string',
        enum: ['technical', 'executive', 'compliance', 'operational', 'blank'],
        description: 'Base template type for the report'
      },
      custom_sections: {
        type: 'array',
        description: 'Array of custom sections to include in the report',
        items: {
          type: 'object',
          properties: {
            section_id: { type: 'string' },
            section_name: { type: 'string' },
            section_type: {
              type: 'string',
              enum: ['summary', 'metrics', 'analysis', 'recommendations', 'charts', 'tables', 'text', 'custom']
            },
            content_filters: { type: 'object' },
            display_options: { type: 'object' },
            custom_content: { type: 'string' }
          },
          required: ['section_id', 'section_name', 'section_type']
        }
      },
      output_format: {
        type: 'string',
        enum: ['json', 'html', 'pdf', 'csv'],
        description: 'Output format for the report'
      },
      styling_options: {
        type: 'object',
        description: 'Styling and branding options for the report'
      },
      data_sources: {
        type: 'object',
        description: 'Data sources to include in the report'
      },
      distribution_settings: {
        type: 'object',
        description: 'Distribution and sharing settings'
      }
    },
    required: ['profile_id', 'report_name', 'custom_sections']
  }
};

export { createCustomReport };