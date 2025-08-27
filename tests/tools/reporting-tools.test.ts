/**
 * Reporting Tools Test Suite
 * Tests for: generate_report, generate_executive_report, generate_compliance_report, generate_audit_report, create_custom_report, generate_dashboard
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { setupCompleteToolMocking } from '../helpers/database-mock.js';
import { ReportingTestHelper } from '../helpers/category-test-helpers.js';

const toolHelper = setupCompleteToolMocking('reporting');

describe('Reporting Tools', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await toolHelper.resetDatabase();
    await toolHelper.createTestOrganization();
    await toolHelper.createSampleAssessment();
    await toolHelper.createSampleReportData();
  });

  afterEach(async () => {
    await toolHelper.cleanup();
  });

  describe('Generate Report Tool', () => {
    it('should generate comprehensive assessment report', async () => {
      const { generateReport } = await import('../../src/tools/generate_report.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        report_type: 'comprehensive_assessment',
        assessment_id: toolHelper.testAssessmentId,
        output_format: 'pdf',
        include_recommendations: true
      };

      const result = await generateReport(params);

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report.report_id).toBeDefined();
      expect(result.report.title).toBeDefined();
      expect(result.report.sections).toBeDefined();
      expect(Array.isArray(result.report.sections)).toBe(true);
      expect(result.report.sections.length).toBeGreaterThan(0);
      
      // Validate essential sections
      const sectionTitles = result.report.sections.map((s: any) => s.title.toLowerCase());
      expect(sectionTitles).toEqual(expect.arrayContaining(['executive summary', 'assessment results', 'recommendations']));
    });

    it('should support multiple output formats', async () => {
      const { generateReport } = await import('../../src/tools/generate_report.js');
      
      const formats = ['pdf', 'html', 'json', 'csv'];
      
      for (const format of formats) {
        const params = {
          organization_id: toolHelper.testOrgId,
          report_type: 'gap_analysis',
          gap_analysis_id: toolHelper.testGapAnalysisId,
          output_format: format
        };

        const result = await generateReport(params);
        
        expect(result.success).toBe(true);
        expect(result.report.format).toBe(format);
        expect(result.report.content).toBeDefined();
      }
    });

    it('should include charts and visualizations when requested', async () => {
      const { generateReport } = await import('../../src/tools/generate_report.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        report_type: 'maturity_assessment',
        assessment_id: toolHelper.testAssessmentId,
        include_charts: true,
        chart_types: ['radar', 'bar', 'trend']
      };

      const result = await generateReport(params);

      expect(result.success).toBe(true);
      expect(result.report.visualizations).toBeDefined();
      expect(result.report.visualizations.length).toBeGreaterThan(0);
      
      result.report.visualizations.forEach((viz: any) => {
        expect(viz).toHaveProperty('type');
        expect(viz).toHaveProperty('data');
        expect(['radar', 'bar', 'trend']).toContain(viz.type);
      });
    });

    it('should validate report type and required parameters', async () => {
      const { generateReport } = await import('../../src/tools/generate_report.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        report_type: 'invalid_report_type'
      };

      const result = await generateReport(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid.*report type|unsupported/i);
    });
  });

  describe('Generate Executive Report Tool', () => {
    it('should create executive summary with key metrics', async () => {
      const { generateExecutiveReport } = await import('../../src/tools/generate_executive_report.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_id: toolHelper.testAssessmentId,
        report_period: 'quarterly',
        focus_areas: ['governance', 'risk', 'compliance']
      };

      const result = await generateExecutiveReport(params);

      expect(result.success).toBe(true);
      expect(result.executive_report).toBeDefined();
      expect(result.executive_report.key_findings).toBeDefined();
      expect(result.executive_report.risk_summary).toBeDefined();
      expect(result.executive_report.strategic_recommendations).toBeDefined();
      expect(result.executive_report.executive_summary).toBeDefined();
      
      // Validate executive-level content
      expect(result.executive_report.key_findings.length).toBeLessThanOrEqual(5); // Concise for executives
      expect(result.executive_report.strategic_recommendations.length).toBeLessThanOrEqual(3);
    });

    it('should include ROI analysis and business impact', async () => {
      const { generateExecutiveReport } = await import('../../src/tools/generate_executive_report.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_id: toolHelper.testAssessmentId,
        implementation_plan_id: toolHelper.testImplementationPlanId,
        include_roi_analysis: true,
        include_business_impact: true
      };

      const result = await generateExecutiveReport(params);

      expect(result.success).toBe(true);
      expect(result.executive_report.roi_analysis).toBeDefined();
      expect(result.executive_report.business_impact).toBeDefined();
      expect(result.executive_report.investment_summary).toBeDefined();
      
      // Validate financial metrics
      expect(result.executive_report.roi_analysis.payback_period).toBeDefined();
      expect(result.executive_report.roi_analysis.expected_roi_percentage).toBeDefined();
    });

    it('should provide industry benchmarking context', async () => {
      const { generateExecutiveReport } = await import('../../src/tools/generate_executive_report.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_id: toolHelper.testAssessmentId,
        include_industry_comparison: true,
        benchmark_peer_group: 'similar_size_same_industry'
      };

      const result = await generateExecutiveReport(params);

      expect(result.success).toBe(true);
      expect(result.executive_report.industry_benchmark).toBeDefined();
      expect(result.executive_report.competitive_positioning).toBeDefined();
    });

    it('should be concise and executive-appropriate', async () => {
      const { generateExecutiveReport } = await import('../../src/tools/generate_executive_report.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_id: toolHelper.testAssessmentId,
        verbosity_level: 'executive'
      };

      const result = await generateExecutiveReport(params);

      expect(result.success).toBe(true);
      
      // Validate conciseness (approximate word counts for executive consumption)
      const summaryWordCount = result.executive_report.executive_summary.split(' ').length;
      expect(summaryWordCount).toBeLessThan(500); // Executive summary should be brief
    });
  });

  describe('Generate Compliance Report Tool', () => {
    it('should generate multi-framework compliance report', async () => {
      const { generateComplianceReport } = await import('../../src/tools/generate_compliance_report.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_id: toolHelper.testAssessmentId,
        frameworks: ['ISO27001', 'SOC2', 'NIST_800_53'],
        compliance_scope: 'full'
      };

      const result = await generateComplianceReport(params);

      expect(result.success).toBe(true);
      expect(result.compliance_report).toBeDefined();
      expect(result.compliance_report.framework_mappings).toBeDefined();
      expect(result.compliance_report.compliance_gaps).toBeDefined();
      expect(result.compliance_report.overall_compliance_score).toBeDefined();
      
      // Validate framework coverage
      params.frameworks.forEach(framework => {
        expect(result.compliance_report.framework_mappings[framework]).toBeDefined();
      });
    });

    it('should identify compliance gaps and remediation steps', async () => {
      const { generateComplianceReport } = await import('../../src/tools/generate_compliance_report.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_id: toolHelper.testAssessmentId,
        frameworks: ['PCI_DSS'],
        include_remediation_plan: true
      };

      const result = await generateComplianceReport(params);

      expect(result.success).toBe(true);
      expect(result.compliance_report.compliance_gaps.length).toBeGreaterThanOrEqual(0);
      expect(result.compliance_report.remediation_plan).toBeDefined();
      
      if (result.compliance_report.compliance_gaps.length > 0) {
        result.compliance_report.compliance_gaps.forEach((gap: any) => {
          expect(gap).toHaveProperty('control_id');
          expect(gap).toHaveProperty('requirement');
          expect(gap).toHaveProperty('current_state');
          expect(gap).toHaveProperty('required_state');
        });
      }
    });

    it('should support regulatory-specific formatting', async () => {
      const { generateComplianceReport } = await import('../../src/tools/generate_compliance_report.js');
      
      const regulatoryFrameworks = ['GDPR', 'HIPAA', 'CCPA'];
      
      for (const framework of regulatoryFrameworks) {
        const params = {
          organization_id: toolHelper.testOrgId,
          assessment_id: toolHelper.testAssessmentId,
          frameworks: [framework],
          output_format: 'regulatory_standard'
        };

        const result = await generateComplianceReport(params);
        
        expect(result.success).toBe(true);
        expect(result.compliance_report.regulatory_formatting).toBe(true);
        expect(result.compliance_report.attestation_ready).toBe(true);
      }
    });

    it('should include evidence tracking and documentation', async () => {
      const { generateComplianceReport } = await import('../../src/tools/generate_compliance_report.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        assessment_id: toolHelper.testAssessmentId,
        frameworks: ['ISO27001'],
        include_evidence: true,
        evidence_level: 'detailed'
      };

      const result = await generateComplianceReport(params);

      expect(result.success).toBe(true);
      expect(result.compliance_report.evidence_inventory).toBeDefined();
      expect(result.compliance_report.documentation_status).toBeDefined();
    });
  });

  describe('Generate Audit Report Tool', () => {
    it('should generate comprehensive audit findings report', async () => {
      const { generateAuditReport } = await import('../../src/tools/generate_audit_report.js');
      
      const auditData = ReportingTestHelper.generateAuditData();
      const params = {
        organization_id: toolHelper.testOrgId,
        audit_scope: auditData.scope,
        audit_findings: auditData.findings,
        audit_period: auditData.period,
        auditor_information: auditData.auditor_info
      };

      const result = await generateAuditReport(params);

      expect(result.success).toBe(true);
      expect(result.audit_report).toBeDefined();
      expect(result.audit_report.findings_summary).toBeDefined();
      expect(result.audit_report.risk_ratings).toBeDefined();
      expect(result.audit_report.management_response).toBeDefined();
      expect(result.audit_report.corrective_actions).toBeDefined();
    });

    it('should categorize findings by severity', async () => {
      const { generateAuditReport } = await import('../../src/tools/generate_audit_report.js');
      
      const auditData = ReportingTestHelper.generateAuditData();
      const params = {
        organization_id: toolHelper.testOrgId,
        audit_findings: auditData.findings,
        categorize_by_severity: true
      };

      const result = await generateAuditReport(params);

      expect(result.success).toBe(true);
      expect(result.audit_report.findings_by_severity).toBeDefined();
      expect(result.audit_report.findings_by_severity.critical).toBeDefined();
      expect(result.audit_report.findings_by_severity.high).toBeDefined();
      expect(result.audit_report.findings_by_severity.medium).toBeDefined();
      expect(result.audit_report.findings_by_severity.low).toBeDefined();
    });

    it('should track remediation timeline and status', async () => {
      const { generateAuditReport } = await import('../../src/tools/generate_audit_report.js');
      
      const auditData = ReportingTestHelper.generateAuditData();
      const params = {
        organization_id: toolHelper.testOrgId,
        audit_findings: auditData.findings,
        track_remediation: true,
        include_timeline: true
      };

      const result = await generateAuditReport(params);

      expect(result.success).toBe(true);
      expect(result.audit_report.remediation_tracker).toBeDefined();
      expect(result.audit_report.remediation_timeline).toBeDefined();
      
      result.audit_report.corrective_actions.forEach((action: any) => {
        expect(action).toHaveProperty('target_date');
        expect(action).toHaveProperty('responsible_party');
        expect(action).toHaveProperty('status');
      });
    });

    it('should support follow-up audit reporting', async () => {
      const { generateAuditReport } = await import('../../src/tools/generate_audit_report.js');
      
      const followUpData = ReportingTestHelper.generateFollowUpAuditData();
      const params = {
        organization_id: toolHelper.testOrgId,
        audit_type: 'follow_up',
        previous_audit_id: toolHelper.testPreviousAuditId,
        follow_up_findings: followUpData.findings
      };

      const result = await generateAuditReport(params);

      expect(result.success).toBe(true);
      expect(result.audit_report.comparison_with_previous).toBeDefined();
      expect(result.audit_report.remediation_effectiveness).toBeDefined();
    });
  });

  describe('Create Custom Report Tool', () => {
    it('should create custom report with user-defined sections', async () => {
      const { createCustomReport } = await import('../../src/tools/create_custom_report.js');
      
      const customTemplate = ReportingTestHelper.generateCustomReportTemplate();
      const params = {
        organization_id: toolHelper.testOrgId,
        report_template: customTemplate,
        data_sources: ['assessments', 'gap_analysis', 'implementation_plans'],
        custom_sections: customTemplate.sections
      };

      const result = await createCustomReport(params);

      expect(result.success).toBe(true);
      expect(result.custom_report).toBeDefined();
      expect(result.custom_report.sections.length).toBe(customTemplate.sections.length);
      
      // Validate custom sections
      result.custom_report.sections.forEach((section: any, index: number) => {
        expect(section.title).toBe(customTemplate.sections[index].title);
        expect(section.content).toBeDefined();
      });
    });

    it('should support dynamic data filtering and aggregation', async () => {
      const { createCustomReport } = await import('../../src/tools/create_custom_report.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        data_filters: {
          date_range: { start: '2024-01-01', end: '2024-12-31' },
          functions: ['GV', 'ID', 'PR'],
          maturity_level: { min: 2, max: 4 }
        },
        aggregation_rules: {
          group_by: 'function',
          metrics: ['average_score', 'improvement_trend']
        }
      };

      const result = await createCustomReport(params);

      expect(result.success).toBe(true);
      expect(result.custom_report.filtered_data).toBeDefined();
      expect(result.custom_report.aggregated_metrics).toBeDefined();
    });

    it('should validate template structure and data availability', async () => {
      const { createCustomReport } = await import('../../src/tools/create_custom_report.js');
      
      const invalidTemplate = {
        sections: [
          {
            title: 'Invalid Section',
            data_source: 'non_existent_data_source',
            content_type: 'invalid_type'
          }
        ]
      };

      const params = {
        organization_id: toolHelper.testOrgId,
        report_template: invalidTemplate
      };

      const result = await createCustomReport(params);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid.*template|data source.*not found/i);
    });
  });

  describe('Generate Dashboard Tool', () => {
    it('should create real-time dashboard with key metrics', async () => {
      const { generateDashboard } = await import('../../src/tools/generate_dashboard.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        dashboard_type: 'executive',
        metrics: ['overall_maturity', 'risk_score', 'compliance_status', 'implementation_progress'],
        refresh_rate: 'hourly'
      };

      const result = await generateDashboard(params);

      expect(result.success).toBe(true);
      expect(result.dashboard).toBeDefined();
      expect(result.dashboard.widgets).toBeDefined();
      expect(Array.isArray(result.dashboard.widgets)).toBe(true);
      expect(result.dashboard.widgets.length).toBeGreaterThan(0);
      
      // Validate widget structure
      result.dashboard.widgets.forEach((widget: any) => {
        expect(widget).toHaveProperty('type');
        expect(widget).toHaveProperty('title');
        expect(widget).toHaveProperty('data');
        expect(widget).toHaveProperty('config');
      });
    });

    it('should support different dashboard types and audiences', async () => {
      const { generateDashboard } = await import('../../src/tools/generate_dashboard.js');
      
      const dashboardTypes = ['executive', 'operational', 'technical', 'compliance'];
      
      for (const type of dashboardTypes) {
        const params = {
          organization_id: toolHelper.testOrgId,
          dashboard_type: type,
          target_audience: type
        };

        const result = await generateDashboard(params);
        
        expect(result.success).toBe(true);
        expect(result.dashboard.type).toBe(type);
        expect(result.dashboard.widgets.length).toBeGreaterThan(0);
      }
    });

    it('should include interactive elements and drill-down capabilities', async () => {
      const { generateDashboard } = await import('../../src/tools/generate_dashboard.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        dashboard_type: 'operational',
        enable_interactions: true,
        enable_drilldown: true
      };

      const result = await generateDashboard(params);

      expect(result.success).toBe(true);
      expect(result.dashboard.interactive_features).toBeDefined();
      expect(result.dashboard.drilldown_paths).toBeDefined();
      
      // Validate interactive capabilities
      result.dashboard.widgets.forEach((widget: any) => {
        if (widget.interactive) {
          expect(widget.actions).toBeDefined();
          expect(Array.isArray(widget.actions)).toBe(true);
        }
      });
    });

    it('should provide alert and notification configuration', async () => {
      const { generateDashboard } = await import('../../src/tools/generate_dashboard.js');
      
      const params = {
        organization_id: toolHelper.testOrgId,
        dashboard_type: 'monitoring',
        configure_alerts: true,
        alert_thresholds: {
          risk_score: { critical: 80, warning: 60 },
          maturity_decline: { critical: -0.5, warning: -0.2 }
        }
      };

      const result = await generateDashboard(params);

      expect(result.success).toBe(true);
      expect(result.dashboard.alert_configuration).toBeDefined();
      expect(result.dashboard.notification_rules).toBeDefined();
    });
  });
});