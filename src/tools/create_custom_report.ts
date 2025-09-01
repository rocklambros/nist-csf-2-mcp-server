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

  if (!(params as any).profile_id) (errors as any).push('profile_id is required');
  if (!(params as any).report_name) (errors as any).push('report_name is required');
  if (!(params as any).custom_sections || (params as any).custom_sections.length === 0) {
    (errors as any).push('At least one custom section is required');
  }

  const validTemplateTypes = ['technical', 'executive', 'compliance', 'operational', 'blank'];
  if ((params as any).template_type && !(validTemplateTypes as any).includes((params as any).template_type)) {
    (errors as any).push('Invalid template_type');
  }

  const validSectionTypes = ['summary', 'metrics', 'analysis', 'recommendations', 'charts', 'tables', 'text', 'custom'];
  (params as any).custom_sections?.forEach((section, index) => {
    if (!(section as any).section_id) (errors as any).push(`Section ${index + 1}: section_id is required`);
    if (!(section as any).section_name) (errors as any).push(`Section ${index + 1}: section_name is required`);
    if (!(validSectionTypes as any).includes((section as any).section_type)) {
      (errors as any).push(`Section ${index + 1}: Invalid section_type`);
    }
  });

  const validOutputFormats = ['json', 'html', 'pdf', 'csv'];
  if ((params as any).output_format && !(validOutputFormats as any).includes((params as any).output_format)) {
    (errors as any).push('Invalid output_format');
  }

  return { isValid: (errors as any).length === 0, errors };
}

async function createCustomReport(params: CreateCustomReportParams, db: Database): Promise<CreateCustomReportResponse> {
  try {
    // Validate input
    const validation = validateParams(params);
    if (!(validation as any).isValid) {
      return {
        success: false,
        error: 'ValidationError',
        message: (validation as any).errors.join(', ')
      };
    }

    // Verify profile exists
    const profile = (db as any).prepare('SELECT * FROM profiles WHERE profile_id = ?').get((params as any).profile_id);
    if (!profile) {
      return {
        success: false,
        error: 'NotFound',
        message: 'Profile not found'
      };
    }

    const reportId = uuidv4();
    const createdDate = new Date().toISOString();
    const templateType = (params as any).template_type || 'blank';
    const outputFormat = (params as any).output_format || 'json';

    // Get base data for report generation
    const assessments = (db as any).prepare(`
      SELECT a.*, (s as any).name as subcategory_name, (s as any).description as subcategory_description,
             (c as any).name as category_name, (f as any).name as function_name, (f as any).id as function_id
      FROM assessments a
      JOIN subcategories s ON (a as any).subcategory_id = (s as any).id
      JOIN categories c ON (s as any).category_id = (c as any).id
      JOIN functions f ON (c as any).function_id = (f as any).id
      WHERE (a as any).profile_id = ?
    `).all((params as any).profile_id);

    // Generate sections based on custom configuration
    const generatedSections = await generateCustomSections((params as any).custom_sections, assessments, db);
    
    // Calculate report statistics
    const reportStats = calculateReportStatistics(assessments, generatedSections);
    
    // Apply styling
    const stylingApplied = applyStyling((params as any).styling_options);
    
    // Configure export options
    const exportOptions = configureExportOptions(outputFormat, (params as any).distribution_settings);
    
    // Calculate report metadata
    const totalDataPoints = (generatedSections as any).reduce((sum, section) => 
      sum + ((section as any).metrics?.data_points || 0), 0
    );

    (logger as any).info('Custom report created successfully', { 
      report_id: reportId, 
      profile_id: (params as any).profile_id,
      report_name: (params as any).report_name,
      sections_count: (generatedSections as any).length
    });

    return {
      success: true,
      report: {
        report_id: reportId,
        profile_id: (params as any).profile_id,
        report_name: (params as any).report_name,
        report_description: (params as any).report_description || `Custom report: ${(params as any).report_name}`,
        template_type: templateType,
        created_date: createdDate,
        last_generated: createdDate,
        report_metadata: {
          total_sections: (generatedSections as any).length,
          data_points_included: totalDataPoints,
          output_format: outputFormat,
          estimated_generation_time: estimateGenerationTime((generatedSections as any).length, totalDataPoints)
        },
        sections: generatedSections,
        report_statistics: reportStats,
        styling_applied: stylingApplied,
        export_options: exportOptions
      }
    };

  } catch (error) {
    (logger as any).error('Create custom report error', error);
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
    const filteredData = applyContentFilters(assessments, (sectionConfig as any).content_filters);
    
    // Generate section content based on type
    const sectionContent = generateSectionContent(
      (sectionConfig as any).section_type, 
      filteredData, 
      (sectionConfig as any).display_options,
      (sectionConfig as any).custom_content
    );
    
    // Calculate section metrics
    const sectionMetrics = calculateSectionMetrics(sectionContent, (sectionConfig as any).section_type);

    (generatedSections as any).push({
      section_id: (sectionConfig as any).section_id,
      section_name: (sectionConfig as any).section_name,
      section_type: (sectionConfig as any).section_type,
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
  if ((filters as any).function_ids && (filters as any).function_ids.length > 0) {
    filteredData = (filteredData as any).filter(a => 
      (filters as any).function_ids.includes((a as any).function_id)
    );
  }

  // Filter by subcategory IDs
  if ((filters as any).subcategory_ids && (filters as any).subcategory_ids.length > 0) {
    filteredData = (filteredData as any).filter(a => 
      (filters as any).subcategory_ids.includes((a as any).subcategory_id)
    );
  }

  // Filter by maturity level range
  if ((filters as any).maturity_level_min !== undefined) {
    filteredData = (filteredData as any).filter(a => 
      ((a as any).maturity_score || 0) >= (filters as any).maturity_level_min
    );
  }
  if ((filters as any).maturity_level_max !== undefined) {
    filteredData = (filteredData as any).filter(a => 
      ((a as any).maturity_score || 0) <= (filters as any).maturity_level_max
    );
  }

  // Filter by implementation status
  if ((filters as any).implementation_status && (filters as any).implementation_status.length > 0) {
    filteredData = (filteredData as any).filter(a => 
      (filters as any).implementation_status.includes((a as any).implementation_level)
    );
  }

  // Filter by date range (would use actual date fields in real implementation)
  if ((filters as any).date_range) {
    const startDate = new Date((filters as any).date_range.start_date);
    const endDate = new Date((filters as any).date_range.end_date);
    filteredData = (filteredData as any).filter(a => {
      const assessmentDate = new Date((a as any).assessed_date || (a as any).created_date || Date.now());
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
        custom_data: (data as any).slice(0, (displayOptions as any)?.max_items || 100),
        custom_content: customContent,
        item_count: Math.min((data as any).length, (displayOptions as any)?.max_items || 100)
      };
    
    default:
      return {
        content_type: 'default',
        data: data,
        item_count: (data as any).length
      };
  }
}

function generateSummaryContent(data: any[], _displayOptions?: any): any {
  const totalControls = (data as any).length;
  const fullyImplemented = (data as any).filter(d => (d as any).implementation_level === 'fully_implemented').length;
  const partiallyImplemented = (data as any).filter(d => (d as any).implementation_level === 'partially_implemented').length;
  const notImplemented = (data as any).filter(d => (d as any).implementation_level === 'not_implemented').length;
  
  const avgMaturity = (data as any).length > 0 ? 
    (data as any).reduce((sum, d) => sum + ((d as any).maturity_score || 0), 0) / (data as any).length : 0;

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
  const functionBreakdown = (data as any).reduce((acc, item) => {
    const functionId = (item as any).function_id || 'Unknown';
    if (!acc[functionId]) {
      acc[functionId] = { count: 0, total_maturity: 0 };
    }
    acc[functionId].count++;
    acc[functionId].total_maturity += (item as any).maturity_score || 0;
    return acc;
  }, {} as any);

  const metrics = Object.entries(functionBreakdown).map(([functionId, stats]: [string, any]) => ({
    function_id: functionId,
    control_count: (stats as any).count,
    average_maturity: Math.round(((stats as any).total_maturity / (stats as any).count) * 10) / 10,
    maturity_percentage: Math.round(((stats as any).total_maturity / (stats as any).count / 5) * 100)
  }));

  return {
    content_type: 'metrics',
    function_metrics: metrics,
    overall_metrics: {
      total_functions: Object.keys(functionBreakdown).length,
      total_controls: (data as any).length,
      highest_maturity_function: (metrics as any).length > 0 ? (metrics as any).reduce((max, curr) => 
        (curr as any).average_maturity > (max?.average_maturity || 0) ? curr : max, metrics[0]
      ) : undefined,
      lowest_maturity_function: (metrics as any).length > 0 ? (metrics as any).reduce((min, curr) => 
        (curr as any).average_maturity < (min?.average_maturity || Infinity) ? curr : min, metrics[0]
      ) : undefined
    }
  };
}

function generateAnalysisContent(data: any[], displayOptions?: any): any {
  const maturityDistribution = {
    'level_1': (data as any).filter(d => ((d as any).maturity_score || 0) >= 1 && ((d as any).maturity_score || 0) < 2).length,
    'level_2': (data as any).filter(d => ((d as any).maturity_score || 0) >= 2 && ((d as any).maturity_score || 0) < 3).length,
    'level_3': (data as any).filter(d => ((d as any).maturity_score || 0) >= 3 && ((d as any).maturity_score || 0) < 4).length,
    'level_4': (data as any).filter(d => ((d as any).maturity_score || 0) >= 4 && ((d as any).maturity_score || 0) < 5).length,
    'level_5': (data as any).filter(d => ((d as any).maturity_score || 0) === 5).length
  };

  const gapAnalysis = data
    .filter(d => ((d as any).maturity_score || 0) < 3)
    .map(d => ({
      subcategory_id: (d as any).subcategory_id,
      subcategory_name: (d as any).subcategory_name,
      current_maturity: (d as any).maturity_score || 0,
      gap_severity: (d as any).maturity_score <= 1 ? 'critical' : 'moderate',
      recommended_actions: generateRecommendedActions(d)
    }));

  return {
    content_type: 'analysis',
    maturity_analysis: {
      distribution: maturityDistribution,
      overall_trend: analyzeMaturityTrend(data),
      improvement_opportunities: (gapAnalysis as any).length
    },
    gap_analysis: (gapAnalysis as any).slice(0, displayOptions?.max_items || 10),
    risk_assessment: {
      high_risk_controls: (data as any).filter(d => ((d as any).maturity_score || 0) <= 2).length,
      medium_risk_controls: (data as any).filter(d => ((d as any).maturity_score || 0) === 3).length,
      low_risk_controls: (data as any).filter(d => ((d as any).maturity_score || 0) >= 4).length
    }
  };
}

function generateRecommendationsContent(data: any[], _displayOptions?: any): any {
  const lowMaturityControls = (data as any).filter(d => ((d as any).maturity_score || 0) <= 2);
  
  const recommendations = lowMaturityControls
    .slice(0, _displayOptions?.max_items || 10)
    .map((control, index) => ({
      recommendation_id: `REC-${String(index + 1).padStart(3, '0')}`,
      priority: (control as any).maturity_score <= 1 ? 'critical' : 'high',
      control_id: (control as any).subcategory_id,
      control_name: (control as any).subcategory_name,
      current_state: (control as any).implementation_level || 'not_implemented',
      recommended_actions: generateRecommendedActions(control),
      estimated_effort: estimateImplementationEffort(control),
      expected_timeline: estimateImplementationTimeline(control),
      business_impact: assessBusinessImpact(control)
    }));

  return {
    content_type: 'recommendations',
    priority_recommendations: recommendations,
    summary: {
      total_recommendations: (recommendations as any).length,
      critical_priority: (recommendations as any).filter(r => (r as any).priority === 'critical').length,
      high_priority: (recommendations as any).filter(r => (r as any).priority === 'high').length,
      estimated_total_effort: `${(recommendations as any).length * 2}-${(recommendations as any).length * 4} weeks`
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
        return ((b as any).maturity_score || 0) - ((a as any).maturity_score || 0);
      case 'date':
        return new Date((b as any).assessed_date || (b as any).created_date || 0).getTime() - 
               new Date((a as any).assessed_date || (a as any).created_date || 0).getTime();
      case 'priority': {
        const priorityOrder: Record<string, number> = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return (priorityOrder[(b as any).priority] || 0) - (priorityOrder[(a as any).priority] || 0);
      }
      default: // name
        return ((a as any).subcategory_name || '').localeCompare((b as any).subcategory_name || '');
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
      rows: (sortedData as any).slice(0, maxItems).map(item => [
        (item as any).subcategory_id,
        (item as any).subcategory_name,
        (item as any).function_name,
        (item as any).implementation_level || 'Not Assessed',
        (item as any).maturity_score || 0,
        formatDate((item as any).assessed_date || (item as any).created_date)
      ])
    },
    table_summary: {
      total_rows: (sortedData as any).length,
      displayed_rows: Math.min((sortedData as any).length, maxItems),
      sorted_by: sortBy
    }
  };
}

// Helper functions
function generateRecommendedActions(control: any): string[] {
  const actions = [];
  
  if (!(control as any).implementation_level || (control as any).implementation_level === 'not_implemented') {
    (actions as any).push('Develop and implement control procedures');
    (actions as any).push('Assign responsible personnel');
    (actions as any).push('Establish monitoring mechanisms');
  } else if ((control as any).implementation_level === 'partially_implemented') {
    (actions as any).push('Complete implementation of all control requirements');
    (actions as any).push('Enhance existing procedures');
    (actions as any).push('Improve documentation and evidence collection');
  }
  
  if (((control as any).maturity_score || 0) <= 2) {
    (actions as any).push('Establish regular review and improvement processes');
    (actions as any).push('Implement metrics and measurement');
  }

  return actions;
}

function estimateImplementationEffort(control: any): string {
  const maturity = (control as any).maturity_score || 0;
  if (maturity <= 1) return '4-8 weeks';
  if (maturity <= 2) return '2-4 weeks';
  if (maturity <= 3) return '1-2 weeks';
  return '1 week';
}

function estimateImplementationTimeline(control: any): string {
  const maturity = (control as any).maturity_score || 0;
  if (maturity <= 1) return '2-3 months';
  if (maturity <= 2) return '1-2 months';
  return '2-4 weeks';
}

function assessBusinessImpact(control: any): string {
  if ((control as any).subcategory_id.includes('GV')) return 'High - Governance and oversight';
  if ((control as any).subcategory_id.includes('ID')) return 'Medium - Asset and risk visibility';
  if ((control as any).subcategory_id.includes('PR')) return 'High - Core protection capabilities';
  if ((control as any).subcategory_id.includes('DE')) return 'Medium - Threat detection';
  if ((control as any).subcategory_id.includes('RS')) return 'High - Incident response';
  if ((control as any).subcategory_id.includes('RC')) return 'Medium - Recovery capabilities';
  return 'Medium - Security posture improvement';
}

function analyzeMaturityTrend(data: any[]): string {
  // Mock trend analysis - would use historical data in real implementation
  const avgMaturity = (data as any).reduce((sum, d) => sum + ((d as any).maturity_score || 0), 0) / (data as any).length;
  if (avgMaturity >= 3.5) return 'Strong - Mature controls';
  if (avgMaturity >= 2.5) return 'Improving - Good progress';
  if (avgMaturity >= 1.5) return 'Developing - Needs attention';
  return 'Initial - Significant improvement needed';
}

function prepareChartData(data: any[], _chartType: string, groupBy?: string): any {
  const grouping = groupBy || 'function';
  
  const grouped = (data as any).reduce((acc, item) => {
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
      data: Object.values(grouped).map((items: any) => {
        const itemArray = items as any[];
        return (itemArray as any).reduce((sum, item) => sum + ((item as any).maturity_score || 0), 0) / (itemArray as any).length;
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
  return (colors as any).slice(0, count);
}

function calculateSectionMetrics(content: any, sectionType: string): any {
  switch (sectionType) {
    case 'charts':
      return {
        data_points: (content as any).chart_data?.datasets?.[0]?.data?.length || 0,
        charts_included: 1,
        tables_included: 0
      };
    case 'tables':
      return {
        data_points: (content as any).table_data?.rows?.length || 0,
        charts_included: 0,
        tables_included: 1
      };
    case 'metrics':
      return {
        data_points: (content as any).function_metrics?.length || 0,
        charts_included: 0,
        tables_included: 0
      };
    default:
      return {
        data_points: Array.isArray((content as any).data) ? (content as any).data.length : 0,
        charts_included: 0,
        tables_included: 0
      };
  }
}

function calculateReportStatistics(assessments: any[], _sections: any[]): any {
  const functions = Array.from(new Set((assessments as any).map(a => (a as any).function_id)));
  const maturityScores = (assessments as any).map(a => (a as any).maturity_score || 0).filter(s => s > 0);
  const compliantControls = (assessments as any).filter(a => 
    (a as any).implementation_level === 'fully_implemented' || (a as any).implementation_level === 'largely_implemented'
  ).length;

  return {
    controls_analyzed: (assessments as any).length,
    functions_covered: functions,
    maturity_range: {
      min: Math.min(...maturityScores),
      max: Math.max(...maturityScores),
      average: (maturityScores as any).length > 0 ? 
        Math.round(((maturityScores as any).reduce((sum, s) => sum + s, 0) / (maturityScores as any).length) * 10) / 10 : 0
    },
    compliance_summary: {
      total_controls: (assessments as any).length,
      compliant_controls: compliantControls,
      compliance_percentage: (assessments as any).length > 0 ? 
        Math.round((compliantControls / (assessments as any).length) * 100) : 0
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