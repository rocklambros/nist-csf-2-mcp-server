/**
 * Realistic test data that satisfies foreign key constraints
 * Provides complete test datasets for comprehensive testing
 */

import { v4 as uuidv4 } from 'uuid';

export const realisticTestData = {
  // Organization with realistic profile
  organization: {
    org_id: `org-${uuidv4()}`,
    org_name: 'Acme Financial Services',
    industry: 'Financial Services',
    size: 'large',
    current_tier: 'Tier1',
    target_tier: 'Tier3',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-08-26').toISOString()
  },

  // Security assessment profile
  profile: {
    profile_id: `profile-${uuidv4()}`,
    org_id: '', // Will be set to organization.org_id
    profile_name: 'Current Security Posture Assessment',
    profile_type: 'current',
    description: 'Baseline assessment of current cybersecurity implementation',
    created_by: 'security-team@acme.com',
    created_date: new Date('2024-08-01').toISOString(),
    is_active: 1
  },

  // Realistic assessments across all CSF functions
  assessments: [
    {
      profile_id: '', // Will be set
      subcategory_id: 'GV.OC-01',
      implementation_level: 'largely_implemented',
      maturity_score: 4,
      notes: 'Mission statement clearly drives security priorities. Regular review process established.',
      assessed_by: 'lead-auditor@acme.com',
      assessment_date: new Date('2024-08-15').toISOString()
    },
    {
      profile_id: '', // Will be set
      subcategory_id: 'GV.RM-01',
      implementation_level: 'partially_implemented',
      maturity_score: 3,
      notes: 'Risk management objectives defined but need better stakeholder alignment.',
      assessed_by: 'risk-manager@acme.com',
      assessment_date: new Date('2024-08-15').toISOString()
    },
    {
      profile_id: '', // Will be set
      subcategory_id: 'ID.AM-01',
      implementation_level: 'fully_implemented',
      maturity_score: 5,
      notes: 'Comprehensive asset inventory with automated discovery tools.',
      assessed_by: 'it-operations@acme.com',
      assessment_date: new Date('2024-08-16').toISOString()
    },
    {
      profile_id: '', // Will be set
      subcategory_id: 'PR.AC-01',
      implementation_level: 'largely_implemented',
      maturity_score: 4,
      notes: 'Strong identity management with MFA. Some legacy systems need updates.',
      assessed_by: 'identity-team@acme.com',
      assessment_date: new Date('2024-08-16').toISOString()
    },
    {
      profile_id: '', // Will be set
      subcategory_id: 'DE.AE-01',
      implementation_level: 'partially_implemented',
      maturity_score: 2,
      notes: 'Basic network monitoring in place. Need advanced anomaly detection.',
      assessed_by: 'soc-analyst@acme.com',
      assessment_date: new Date('2024-08-17').toISOString()
    },
    {
      profile_id: '', // Will be set
      subcategory_id: 'RS.RP-01',
      implementation_level: 'largely_implemented',
      maturity_score: 4,
      notes: 'Well-documented incident response plan. Regular drills conducted.',
      assessed_by: 'incident-response@acme.com',
      assessment_date: new Date('2024-08-17').toISOString()
    },
    {
      profile_id: '', // Will be set
      subcategory_id: 'RC.RP-01',
      implementation_level: 'partially_implemented',
      maturity_score: 3,
      notes: 'Recovery procedures exist but need better testing and automation.',
      assessed_by: 'disaster-recovery@acme.com',
      assessment_date: new Date('2024-08-18').toISOString()
    }
  ],

  // Progress tracking entries
  progressTracking: [
    {
      id: `progress-${uuidv4()}`,
      profile_id: '', // Will be set
      subcategory_id: 'GV.OC-01',
      baseline_implementation: 'Basic mission awareness',
      current_implementation: 'Mission-driven security strategy',
      target_implementation: 'Fully integrated mission-security alignment',
      baseline_maturity: 2,
      current_maturity: 4,
      target_maturity: 5,
      completion_percentage: 80,
      status: 'on_track',
      is_blocked: false,
      last_updated: new Date('2024-08-20').toISOString(),
      days_since_update: 6,
      trend: 'improving',
      notes: 'Making good progress on mission alignment initiatives'
    },
    {
      id: `progress-${uuidv4()}`,
      profile_id: '', // Will be set
      subcategory_id: 'DE.AE-01',
      baseline_implementation: 'Basic log monitoring',
      current_implementation: 'Enhanced monitoring with some automation',
      target_implementation: 'Advanced AI-powered anomaly detection',
      baseline_maturity: 1,
      current_maturity: 2,
      target_maturity: 4,
      completion_percentage: 25,
      status: 'at_risk',
      is_blocked: true,
      blocking_reason: 'Budget approval pending for advanced monitoring tools',
      last_updated: new Date('2024-08-18').toISOString(),
      days_since_update: 8,
      trend: 'stable',
      notes: 'Waiting on procurement approval for SIEM upgrade'
    }
  ],

  // Gap analysis
  gapAnalysis: [
    {
      id: `gap-${uuidv4()}`,
      org_id: '', // Will be set
      category_id: 'GV.OC',
      current_score: 3.5,
      target_score: 4.5,
      gap_score: 1.0,
      priority: 'medium',
      estimated_effort: '6 months',
      recommendations: 'Strengthen stakeholder engagement and communication processes',
      analysis_date: new Date('2024-08-10').toISOString(),
      analyst: 'governance-analyst@acme.com',
      status: 'identified',
      implementation_timeline: 'Q1 2025',
      resource_requirements: '2 FTE, executive sponsorship'
    },
    {
      id: `gap-${uuidv4()}`,
      org_id: '', // Will be set
      category_id: 'DE.AE',
      current_score: 2.0,
      target_score: 4.0,
      gap_score: 2.0,
      priority: 'high',
      estimated_effort: '12 months',
      recommendations: 'Implement advanced SIEM, establish SOC capabilities, train analysts',
      analysis_date: new Date('2024-08-10').toISOString(),
      analyst: 'security-architect@acme.com',
      status: 'planning',
      implementation_timeline: 'Q4 2024 - Q3 2025',
      resource_requirements: '5 FTE, $500K budget, executive commitment'
    }
  ],

  // Implementation plan
  implementationPlan: {
    id: `plan-${uuidv4()}`,
    gap_analysis_id: '', // Will be set to gapAnalysis[1].id
    org_id: '', // Will be set
    plan_name: 'Advanced Detection & Response Capability Implementation',
    plan_description: 'Comprehensive plan to enhance detection and response capabilities through SIEM implementation and SOC establishment',
    start_date: new Date('2024-10-01').toISOString(),
    end_date: new Date('2025-09-30').toISOString(),
    total_phases: 3,
    estimated_cost: 750000,
    available_resources: JSON.stringify({
      budget: 750000,
      personnel: ['security-architect', 'soc-manager', '3x-analysts'],
      timeline: '12 months',
      executive_sponsor: 'CISO'
    }),
    success_criteria: JSON.stringify([
      'SIEM deployed and operational',
      'SOC team hired and trained',
      '24/7 monitoring capability established',
      'Mean time to detection < 4 hours',
      'Incident response time < 30 minutes'
    ]),
    status: 'approved',
    created_by: 'security-architect@acme.com',
    created_date: new Date('2024-08-20').toISOString(),
    approved_by: 'ciso@acme.com',
    approved_date: new Date('2024-08-25').toISOString()
  },

  // Risk assessments
  riskAssessments: [
    {
      id: `risk-${uuidv4()}`,
      org_id: '', // Will be set
      element_id: 'DE.AE-01',
      element_type: 'subcategory',
      likelihood: 4,
      impact: 4,
      risk_level: 'High',
      risk_score: 16,
      mitigation_status: 'planned',
      mitigation_plan: 'Implement advanced SIEM and establish 24/7 SOC operations',
      assessment_date: new Date('2024-08-10').toISOString(),
      assessed_by: 'risk-analyst@acme.com',
      next_assessment_date: new Date('2024-11-10').toISOString(),
      risk_tolerance: 'low',
      residual_risk: 8
    },
    {
      id: `risk-${uuidv4()}`,
      org_id: '', // Will be set
      element_id: 'PR.AC-01',
      element_type: 'subcategory',
      likelihood: 2,
      impact: 3,
      risk_level: 'Medium',
      risk_score: 6,
      mitigation_status: 'in_progress',
      mitigation_plan: 'Legacy system modernization project to implement modern identity controls',
      assessment_date: new Date('2024-08-12').toISOString(),
      assessed_by: 'identity-analyst@acme.com',
      next_assessment_date: new Date('2024-11-12').toISOString(),
      risk_tolerance: 'medium',
      residual_risk: 3
    }
  ],

  // Milestones
  progressMilestones: [
    {
      id: `milestone-${uuidv4()}`,
      profile_id: '', // Will be set
      milestone_name: 'SIEM Implementation Phase 1',
      target_date: new Date('2024-12-31').toISOString(),
      status: 'pending',
      completion_percentage: 0,
      subcategories_involved: JSON.stringify(['DE.AE-01', 'DE.AE-02', 'DE.CM-01']),
      success_criteria: JSON.stringify([
        'SIEM hardware deployed',
        'Initial log sources configured',
        'Basic correlation rules implemented'
      ])
    },
    {
      id: `milestone-${uuidv4()}`,
      profile_id: '', // Will be set
      milestone_name: 'SOC Team Training Complete',
      target_date: new Date('2025-03-31').toISOString(),
      status: 'pending',
      completion_percentage: 0,
      subcategories_involved: JSON.stringify(['DE.AE-01', 'RS.RP-01', 'RS.AN-01']),
      success_criteria: JSON.stringify([
        'SOC analysts hired',
        'Training curriculum completed',
        'Certification requirements met',
        '24/7 coverage established'
      ])
    }
  ]
};

/**
 * Initialize realistic test data with proper foreign key relationships
 */
export function initializeRealisticTestData() {
  // Set up foreign key relationships
  realisticTestData.profile.org_id = realisticTestData.organization.org_id;
  
  realisticTestData.assessments.forEach(assessment => {
    assessment.profile_id = realisticTestData.profile.profile_id;
  });
  
  realisticTestData.progressTracking.forEach(progress => {
    progress.profile_id = realisticTestData.profile.profile_id;
  });
  
  realisticTestData.gapAnalysis.forEach(gap => {
    gap.org_id = realisticTestData.organization.org_id;
  });
  
  realisticTestData.implementationPlan.gap_analysis_id = realisticTestData.gapAnalysis[1].id;
  realisticTestData.implementationPlan.org_id = realisticTestData.organization.org_id;
  
  realisticTestData.riskAssessments.forEach(risk => {
    risk.org_id = realisticTestData.organization.org_id;
  });
  
  realisticTestData.progressMilestones.forEach(milestone => {
    milestone.profile_id = realisticTestData.profile.profile_id;
  });
  
  return realisticTestData;
}