/**
 * Enhanced mock data generators for comprehensive testing
 */

import { v4 as uuidv4 } from 'uuid';

// Enhanced CSF Framework mock data with complete structure
export const enhancedFrameworkData = {
  functions: [
    { id: 'GV', name: 'GOVERN', description: 'Establish and monitor cybersecurity governance', order: 1 },
    { id: 'ID', name: 'IDENTIFY', description: 'Identify assets and risks', order: 2 },
    { id: 'PR', name: 'PROTECT', description: 'Implement safeguards', order: 3 },
    { id: 'DE', name: 'DETECT', description: 'Implement detection activities', order: 4 },
    { id: 'RS', name: 'RESPOND', description: 'Implement response activities', order: 5 },
    { id: 'RC', name: 'RECOVER', description: 'Implement recovery activities', order: 6 }
  ],

  categories: [
    // Govern categories
    { id: 'GV.OC', function_id: 'GV', name: 'Organizational Context', description: 'The organization\'s context is understood', order: 1 },
    { id: 'GV.RM', function_id: 'GV', name: 'Risk Management Strategy', description: 'Risk management strategy is established', order: 2 },
    { id: 'GV.RR', function_id: 'GV', name: 'Roles and Responsibilities', description: 'Roles and responsibilities are established', order: 3 },
    { id: 'GV.PO', function_id: 'GV', name: 'Policy', description: 'Policy is established and managed', order: 4 },
    { id: 'GV.OV', function_id: 'GV', name: 'Oversight', description: 'Oversight of cybersecurity risk is provided', order: 5 },
    { id: 'GV.SC', function_id: 'GV', name: 'Supply Chain', description: 'Supply chain cybersecurity is managed', order: 6 },

    // Identify categories
    { id: 'ID.AM', function_id: 'ID', name: 'Asset Management', description: 'Assets are managed consistent with priorities', order: 1 },
    { id: 'ID.BE', function_id: 'ID', name: 'Business Environment', description: 'Business environment is understood', order: 2 },
    { id: 'ID.GV', function_id: 'ID', name: 'Governance', description: 'Governance is understood and managed', order: 3 },
    { id: 'ID.RA', function_id: 'ID', name: 'Risk Assessment', description: 'Risk assessment is conducted regularly', order: 4 },
    { id: 'ID.RM', function_id: 'ID', name: 'Risk Management Strategy', description: 'Risk management strategy guides decisions', order: 5 },
    { id: 'ID.SC', function_id: 'ID', name: 'Supply Chain', description: 'Supply chain risk is identified and managed', order: 6 },

    // Protect categories
    { id: 'PR.AA', function_id: 'PR', name: 'Identity Management, Authentication and Access Control', description: 'Access is managed according to principles', order: 1 },
    { id: 'PR.AT', function_id: 'PR', name: 'Awareness and Training', description: 'Personnel are trained and aware', order: 2 },
    { id: 'PR.DS', function_id: 'PR', name: 'Data Security', description: 'Data is secured according to classification', order: 3 },
    { id: 'PR.IP', function_id: 'PR', name: 'Information Protection Processes and Procedures', description: 'Information protection processes are maintained', order: 4 },
    { id: 'PR.MA', function_id: 'PR', name: 'Maintenance', description: 'Maintenance is performed according to policy', order: 5 },
    { id: 'PR.PT', function_id: 'PR', name: 'Protective Technology', description: 'Technical security solutions are managed', order: 6 },

    // Detect categories
    { id: 'DE.AE', function_id: 'DE', name: 'Anomalies and Events', description: 'Anomalous activity is detected in a timely manner', order: 1 },
    { id: 'DE.CM', function_id: 'DE', name: 'Security Continuous Monitoring', description: 'The information system and assets are monitored', order: 2 },
    { id: 'DE.DP', function_id: 'DE', name: 'Detection Processes', description: 'Detection processes and procedures are maintained', order: 3 },

    // Respond categories
    { id: 'RS.RP', function_id: 'RS', name: 'Response Planning', description: 'Response processes and procedures are executed', order: 1 },
    { id: 'RS.CO', function_id: 'RS', name: 'Communications', description: 'Response activities are coordinated', order: 2 },
    { id: 'RS.AN', function_id: 'RS', name: 'Analysis', description: 'Analysis is conducted to ensure adequate response', order: 3 },
    { id: 'RS.MI', function_id: 'RS', name: 'Mitigation', description: 'Activities are performed to prevent expansion of an event', order: 4 },
    { id: 'RS.IM', function_id: 'RS', name: 'Improvements', description: 'Organizational response activities are improved', order: 5 },

    // Recover categories
    { id: 'RC.RP', function_id: 'RC', name: 'Recovery Planning', description: 'Recovery processes and procedures are executed', order: 1 },
    { id: 'RC.IM', function_id: 'RC', name: 'Improvements', description: 'Recovery planning and processes are improved', order: 2 },
    { id: 'RC.CO', function_id: 'RC', name: 'Communications', description: 'Restoration activities are coordinated', order: 3 }
  ],

  subcategories: [
    // GV.OC subcategories
    { id: 'GV.OC-01', category_id: 'GV.OC', name: 'Organizational mission is understood', description: 'The organizational mission is understood and informs cybersecurity risk management', order: 1 },
    { id: 'GV.OC-02', category_id: 'GV.OC', name: 'Internal stakeholders are understood', description: 'Internal and external stakeholders, their expectations and requirements are understood', order: 2 },
    { id: 'GV.OC-03', category_id: 'GV.OC', name: 'Legal requirements are understood', description: 'Legal, regulatory, and contractual requirements are understood and managed', order: 3 },
    { id: 'GV.OC-04', category_id: 'GV.OC', name: 'Critical objectives are understood', description: 'Critical objectives, capabilities, and services are understood and prioritized', order: 4 },
    { id: 'GV.OC-05', category_id: 'GV.OC', name: 'Outcomes are understood', description: 'Outcomes that negatively affect the organization are understood', order: 5 },

    // ID.AM subcategories
    { id: 'ID.AM-01', category_id: 'ID.AM', name: 'Physical devices and systems are inventoried', description: 'Physical devices and systems within the organization are inventoried', order: 1 },
    { id: 'ID.AM-02', category_id: 'ID.AM', name: 'Software platforms and applications are inventoried', description: 'Software platforms and applications within the organization are inventoried', order: 2 },
    { id: 'ID.AM-03', category_id: 'ID.AM', name: 'Organizational communication and data flows are mapped', description: 'Organizational communication and data flows are mapped', order: 3 },
    { id: 'ID.AM-04', category_id: 'ID.AM', name: 'External information systems are catalogued', description: 'External information systems are catalogued', order: 4 },
    { id: 'ID.AM-05', category_id: 'ID.AM', name: 'Resources are prioritized based on importance', description: 'Resources (e.g., hardware, devices, data, time, personnel, and software) are prioritized based on their classification, criticality, and business value', order: 5 },

    // PR.AA subcategories (Access Control)
    { id: 'PR.AA-01', category_id: 'PR.AA', name: 'Identities and credentials are issued, managed, verified, revoked, and audited', description: 'Identities and credentials are issued, managed, verified, revoked, and audited for authorized devices, users and processes', order: 1 },
    { id: 'PR.AA-02', category_id: 'PR.AA', name: 'Identity and credential requirements are established', description: 'Identity and credential requirements are established for authorized access to systems and assets', order: 2 },
    { id: 'PR.AA-03', category_id: 'PR.AA', name: 'Access permissions are managed and reviewed', description: 'Access permissions and authorizations are managed, incorporating the principles of least privilege and separation of duties', order: 3 },
    { id: 'PR.AA-04', category_id: 'PR.AA', name: 'Access controls are managed consistent with risk', description: 'Access controls for remote access are managed', order: 4 },
    { id: 'PR.AA-05', category_id: 'PR.AA', name: 'Network integrity is protected', description: 'Network integrity is protected (e.g., network segregation, network segmentation)', order: 5 },
    { id: 'PR.AA-06', category_id: 'PR.AA', name: 'Physical access is managed', description: 'Physical access to assets is managed', order: 6 },

    // DE.CM subcategories
    { id: 'DE.CM-01', category_id: 'DE.CM', name: 'Networks and network services are monitored', description: 'Networks and network services are monitored to find potentially malicious activity', order: 1 },
    { id: 'DE.CM-02', category_id: 'DE.CM', name: 'Physical environment is monitored', description: 'The physical environment is monitored to detect potentially malicious activity', order: 2 },
    { id: 'DE.CM-03', category_id: 'DE.CM', name: 'Personnel activity is monitored', description: 'Personnel activity is monitored to detect potentially malicious activity', order: 3 },
    { id: 'DE.CM-04', category_id: 'DE.CM', name: 'Malicious code is detected', description: 'Malicious code is detected', order: 4 },
    { id: 'DE.CM-05', category_id: 'DE.CM', name: 'Unauthorized mobile code is detected', description: 'Unauthorized mobile code is detected', order: 5 },
    { id: 'DE.CM-06', category_id: 'DE.CM', name: 'External service provider activity is monitored', description: 'External service provider activity is monitored to detect potentially malicious activity', order: 6 },
    { id: 'DE.CM-07', category_id: 'DE.CM', name: 'Monitoring is performed in accordance with strategy', description: 'Monitoring for unauthorized personnel, connections, devices, and software is performed', order: 7 },
    { id: 'DE.CM-08', category_id: 'DE.CM', name: 'Vulnerability scans are performed', description: 'Vulnerability scans are performed', order: 8 }
  ]
};

// Enhanced organization data
export const organizationTypes = {
  industries: [
    'Technology', 'Financial Services', 'Healthcare', 'Manufacturing', 
    'Retail', 'Energy', 'Government', 'Education', 'Transportation',
    'Telecommunications', 'Media', 'Real Estate', 'Construction',
    'Agriculture', 'Mining', 'Utilities', 'Professional Services'
  ],
  sizes: ['small', 'medium', 'large', 'enterprise'],
  tiers: ['Tier1', 'Tier2', 'Tier3', 'Tier4'],
  regions: ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa']
};

// Implementation levels and maturity scores
export const implementationData = {
  levels: ['Not Implemented', 'Partially Implemented', 'Largely Implemented', 'Fully Implemented'],
  maturityScores: [1, 2, 3, 4, 5],
  priorities: ['low', 'medium', 'high', 'critical'],
  statuses: ['planned', 'in_progress', 'on_track', 'at_risk', 'behind', 'blocked', 'completed']
};

// Evidence types and metadata
export const evidenceTypes = {
  types: ['document', 'screenshot', 'log', 'report', 'config', 'certificate', 'policy', 'procedure'],
  classifications: ['public', 'internal', 'confidential', 'restricted'],
  formats: ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'json', 'xml', 'csv', 'xlsx'],
  sources: ['manual_upload', 'automated_scan', 'api_integration', 'bulk_import']
};

// Risk assessment data
export const riskData = {
  levels: ['Low', 'Medium', 'High', 'Critical'],
  likelihood: [1, 2, 3, 4, 5],
  impact: [1, 2, 3, 4, 5],
  threatFactors: ['external_threats', 'internal_threats', 'environmental_factors', 'regulatory_pressure'],
  mitigationStatus: ['Not Started', 'In Progress', 'Completed', 'On Hold']
};

// Compliance frameworks
export const complianceFrameworks = {
  frameworks: ['SOC2', 'ISO27001', 'NIST_800_53', 'PCI_DSS', 'HIPAA', 'GDPR', 'SOX', 'CCPA', 'FISMA', 'CMMC'],
  auditStandards: ['AICPA_TSC', 'SSAE_18', 'ISAE_3402', 'ISO_19011'],
  certificationBodies: ['AICPA', 'BSI', 'CISA', 'ANSI', 'NIST']
};

// Enhanced mock data generators
export class EnhancedMockDataGenerator {
  /**
   * Generate comprehensive organization data
   */
  static generateOrganization(overrides: Partial<any> = {}) {
    const industry = this.randomChoice(organizationTypes.industries);
    const size = this.randomChoice(organizationTypes.sizes);
    const region = this.randomChoice(organizationTypes.regions);
    
    return {
      org_id: `org-${uuidv4()}`,
      org_name: `${industry} Corp ${Math.floor(Math.random() * 1000)}`,
      industry,
      size,
      region,
      current_tier: this.randomChoice(organizationTypes.tiers),
      target_tier: this.randomChoice(organizationTypes.tiers.filter(t => t !== overrides.current_tier)),
      employee_count: this.getEmployeeCount(size),
      annual_revenue: this.getAnnualRevenue(size),
      risk_appetite: this.randomChoice(['low', 'medium', 'high']),
      regulatory_requirements: this.getRegulatoryRequirements(industry),
      created_date: this.randomPastDate(365),
      ...overrides
    };
  }

  /**
   * Generate realistic profile data
   */
  static generateProfile(orgId?: string, overrides: Partial<any> = {}) {
    const profileTypes = ['current', 'target', 'baseline'];
    const type = overrides.profile_type || this.randomChoice(profileTypes);
    
    return {
      profile_id: `profile-${uuidv4()}`,
      org_id: orgId || `org-${uuidv4()}`,
      profile_name: `${type.charAt(0).toUpperCase() + type.slice(1)} State Profile`,
      profile_type: type,
      description: `${type} state cybersecurity profile for organizational assessment`,
      created_by: this.randomChoice(['admin', 'security-team', 'consultant', 'ciso']),
      created_date: this.randomPastDate(180),
      last_modified: this.randomPastDate(30),
      is_active: Math.random() > 0.1, // 90% chance of being active
      version: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}`,
      ...overrides
    };
  }

  /**
   * Generate comprehensive assessment data
   */
  static generateAssessment(profileId?: string, overrides: Partial<any> = {}) {
    const subcategoryId = overrides.subcategory_id || this.randomChoice(
      enhancedFrameworkData.subcategories.map(s => s.id)
    );
    const implementationLevel = this.randomChoice(implementationData.levels);
    const maturityScore = this.getMaturityScore(implementationLevel);
    
    return {
      assessment_id: uuidv4(),
      profile_id: profileId || `profile-${uuidv4()}`,
      subcategory_id: subcategoryId,
      implementation_level: implementationLevel,
      maturity_score: maturityScore,
      confidence_level: this.randomChoice(['low', 'medium', 'high']),
      notes: this.generateAssessmentNotes(implementationLevel),
      assessed_by: this.randomChoice(['internal-team', 'external-auditor', 'consultant', 'self-assessment']),
      assessment_date: this.randomPastDate(90),
      last_reviewed: this.randomPastDate(30),
      next_review_date: this.randomFutureDate(90),
      priority: this.randomChoice(implementationData.priorities),
      effort_estimate_hours: Math.floor(Math.random() * 200) + 10,
      cost_estimate: Math.floor(Math.random() * 50000) + 1000,
      ...overrides
    };
  }

  /**
   * Generate realistic evidence data
   */
  static generateEvidence(profileId?: string, overrides: Partial<any> = {}) {
    const evidenceType = this.randomChoice(evidenceTypes.types);
    const format = this.getFormatForType(evidenceType);
    const classification = this.randomChoice(evidenceTypes.classifications);
    
    return {
      evidence_id: uuidv4(),
      profile_id: profileId || `profile-${uuidv4()}`,
      subcategory_id: this.randomChoice(enhancedFrameworkData.subcategories.map(s => s.id)),
      file_name: this.generateFileName(evidenceType, format),
      file_path: `/evidence/${evidenceType}s/${this.generateFileName(evidenceType, format)}`,
      file_hash: this.generateFileHash(),
      file_size_bytes: Math.floor(Math.random() * 10485760) + 1024, // 1KB to 10MB
      evidence_type: evidenceType,
      classification: classification,
      description: this.generateEvidenceDescription(evidenceType),
      uploaded_by: this.randomChoice(['auditor', 'security-team', 'admin', 'consultant']),
      upload_date: this.randomPastDate(60),
      source: this.randomChoice(evidenceTypes.sources),
      retention_period_days: this.getRetentionPeriod(classification),
      is_valid: Math.random() > 0.05, // 95% valid
      validation_status: this.randomChoice(['pending', 'validated', 'rejected', 'expired']),
      metadata: this.generateEvidenceMetadata(evidenceType),
      ...overrides
    };
  }

  /**
   * Generate progress tracking data
   */
  static generateProgress(profileId?: string, overrides: Partial<any> = {}) {
    const currentMaturity = Math.floor(Math.random() * 4) + 1;
    const targetMaturity = Math.max(currentMaturity + 1, 5);
    const progressPercentage = Math.floor((currentMaturity / targetMaturity) * 100);
    
    return {
      progress_id: uuidv4(),
      profile_id: profileId || `profile-${uuidv4()}`,
      subcategory_id: this.randomChoice(enhancedFrameworkData.subcategories.map(s => s.id)),
      target_implementation: this.randomChoice(implementationData.levels.slice(1)), // Exclude "Not Implemented"
      target_maturity: targetMaturity,
      target_date: this.randomFutureDate(180),
      current_implementation: this.randomChoice(implementationData.levels),
      current_maturity: currentMaturity,
      progress_percentage: progressPercentage,
      status: this.getStatusFromProgress(progressPercentage),
      last_updated: this.randomPastDate(7),
      milestones: this.generateMilestones(),
      blockers: this.generateBlockers(),
      estimated_completion: this.estimateCompletion(progressPercentage),
      ...overrides
    };
  }

  /**
   * Generate risk assessment data
   */
  static generateRiskAssessment(orgId?: string, overrides: Partial<any> = {}) {
    const likelihood = this.randomChoice(riskData.likelihood);
    const impact = this.randomChoice(riskData.impact);
    const riskScore = (likelihood * impact) / 25; // Normalized to 0-1
    const riskLevel = this.getRiskLevel(riskScore);
    
    return {
      risk_id: uuidv4(),
      org_id: orgId || `org-${uuidv4()}`,
      element_id: this.randomChoice(enhancedFrameworkData.subcategories.map(s => s.id)),
      risk_level: riskLevel,
      likelihood,
      impact,
      risk_score: riskScore,
      threat_sources: this.generateThreatSources(),
      vulnerabilities: this.generateVulnerabilities(),
      existing_controls: this.generateExistingControls(),
      mitigation_status: this.randomChoice(riskData.mitigationStatus),
      mitigation_plan: this.generateMitigationPlan(),
      residual_risk: Math.max(0.1, riskScore - Math.random() * 0.5),
      assessment_date: this.randomPastDate(30),
      next_review_date: this.randomFutureDate(90),
      assessed_by: this.randomChoice(['risk-team', 'security-team', 'external-consultant']),
      ...overrides
    };
  }

  /**
   * Generate compliance mapping data
   */
  static generateComplianceMapping(profileId?: string, overrides: Partial<any> = {}) {
    const framework = this.randomChoice(complianceFrameworks.frameworks);
    const subcategoryId = this.randomChoice(enhancedFrameworkData.subcategories.map(s => s.id));
    
    return {
      mapping_id: uuidv4(),
      profile_id: profileId || `profile-${uuidv4()}`,
      csf_subcategory_id: subcategoryId,
      framework,
      control_id: this.generateControlId(framework),
      control_description: this.generateControlDescription(framework),
      mapping_strength: this.randomChoice(['weak', 'moderate', 'strong', 'exact']),
      compliance_status: this.randomChoice(['compliant', 'partial', 'non-compliant', 'not-applicable']),
      gap_analysis: this.generateGapAnalysis(),
      remediation_required: Math.random() > 0.6,
      last_assessed: this.randomPastDate(60),
      notes: `Mapping between NIST CSF ${subcategoryId} and ${framework}`,
      created_date: this.randomPastDate(180),
      ...overrides
    };
  }

  /**
   * Generate audit trail entry
   */
  static generateAuditEntry(profileId?: string, overrides: Partial<any> = {}) {
    const actions = [
      'profile_created', 'assessment_added', 'evidence_uploaded', 'progress_updated',
      'report_generated', 'user_login', 'data_exported', 'settings_changed'
    ];
    const resourceTypes = ['profile', 'assessment', 'evidence', 'report', 'user', 'system'];
    
    const action = this.randomChoice(actions);
    const resourceType = this.randomChoice(resourceTypes);
    
    return {
      audit_id: uuidv4(),
      profile_id: profileId,
      action,
      resource_type: resourceType,
      resource_id: uuidv4(),
      performed_by: this.randomChoice(['admin', 'user', 'system', 'auditor']),
      ip_address: this.generateIPAddress(),
      user_agent: this.generateUserAgent(),
      session_id: uuidv4(),
      timestamp: this.randomPastDate(30),
      details: this.generateAuditDetails(action, resourceType),
      success: Math.random() > 0.05, // 95% success rate
      ...overrides
    };
  }

  // Helper methods
  private static randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private static randomPastDate(maxDaysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * maxDaysAgo));
    return date.toISOString();
  }

  private static randomFutureDate(maxDaysAhead: number): string {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * maxDaysAhead) + 1);
    return date.toISOString();
  }

  private static getEmployeeCount(size: string): number {
    const ranges = {
      small: [1, 50],
      medium: [51, 250], 
      large: [251, 1000],
      enterprise: [1001, 10000]
    };
    const range = ranges[size] || [1, 50];
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  }

  private static getAnnualRevenue(size: string): number {
    const ranges = {
      small: [100000, 5000000],
      medium: [5000000, 50000000],
      large: [50000000, 500000000],
      enterprise: [500000000, 10000000000]
    };
    const range = ranges[size] || [100000, 5000000];
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
  }

  private static getRegulatoryRequirements(industry: string): string[] {
    const industryRequirements = {
      'Financial Services': ['SOX', 'PCI_DSS', 'GLBA', 'FFIEC'],
      'Healthcare': ['HIPAA', 'HITECH', 'FDA_21_CFR_Part_11'],
      'Government': ['FISMA', 'FedRAMP', 'CMMC', 'NIST_800_53'],
      'Technology': ['GDPR', 'CCPA', 'SOC2'],
      'Energy': ['NERC_CIP', 'ICS_CERT'],
      'Education': ['FERPA', 'GLBA']
    };
    return industryRequirements[industry] || ['GDPR', 'SOC2'];
  }

  private static getMaturityScore(implementationLevel: string): number {
    const scores = {
      'Not Implemented': 1,
      'Partially Implemented': 2,
      'Largely Implemented': 3,
      'Fully Implemented': 4
    };
    return scores[implementationLevel] || 1;
  }

  private static generateAssessmentNotes(implementationLevel: string): string {
    const templates = {
      'Not Implemented': [
        'Control has not been implemented. Requires immediate attention.',
        'No current implementation in place. Planning required.',
        'This control is not addressed in current processes.'
      ],
      'Partially Implemented': [
        'Basic implementation in place but needs enhancement.',
        'Some processes exist but are not comprehensive.',
        'Initial steps taken but significant work remains.'
      ],
      'Largely Implemented': [
        'Most requirements are met with minor gaps.',
        'Good implementation with some areas for improvement.',
        'Well established with occasional lapses.'
      ],
      'Fully Implemented': [
        'Complete implementation meets all requirements.',
        'Comprehensive implementation with regular monitoring.',
        'Excellent implementation with continuous improvement.'
      ]
    };
    const options = templates[implementationLevel] || templates['Not Implemented'];
    return this.randomChoice(options);
  }

  private static getFormatForType(evidenceType: string): string {
    const typeFormats = {
      document: ['pdf', 'doc', 'docx'],
      screenshot: ['png', 'jpg'],
      log: ['txt', 'log'],
      report: ['pdf', 'xlsx', 'csv'],
      config: ['json', 'xml', 'txt'],
      certificate: ['pem', 'crt', 'p12'],
      policy: ['pdf', 'doc', 'docx'],
      procedure: ['pdf', 'doc', 'docx']
    };
    const formats = typeFormats[evidenceType] || ['pdf'];
    return this.randomChoice(formats);
  }

  private static generateFileName(type: string, format: string): string {
    const names = {
      document: ['security-policy', 'procedure-manual', 'compliance-doc'],
      screenshot: ['dashboard-view', 'config-screen', 'audit-interface'],
      log: ['security-audit', 'access-log', 'system-events'],
      report: ['compliance-report', 'audit-findings', 'risk-assessment'],
      config: ['system-config', 'security-settings', 'network-config'],
      certificate: ['ssl-cert', 'ca-certificate', 'client-cert'],
      policy: ['information-security-policy', 'access-control-policy'],
      procedure: ['incident-response', 'backup-procedure', 'recovery-plan']
    };
    const baseName = this.randomChoice(names[type] || ['evidence']);
    const timestamp = Math.floor(Math.random() * 1000);
    return `${baseName}-${timestamp}.${format}`;
  }

  private static generateFileHash(): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  private static generateEvidenceDescription(type: string): string {
    const descriptions = {
      document: 'Policy or procedure document supporting control implementation',
      screenshot: 'Visual evidence of system configuration or interface',
      log: 'System or application log file showing security events',
      report: 'Formal report documenting assessment or audit findings',
      config: 'System configuration file or settings export',
      certificate: 'Digital certificate for authentication or encryption',
      policy: 'Organizational policy document',
      procedure: 'Step-by-step procedure documentation'
    };
    return descriptions[type] || 'Evidence supporting cybersecurity control implementation';
  }

  private static getRetentionPeriod(classification: string): number {
    const periods = {
      public: 365 * 1, // 1 year
      internal: 365 * 3, // 3 years  
      confidential: 365 * 7, // 7 years
      restricted: 365 * 10 // 10 years
    };
    return periods[classification] || 365 * 3;
  }

  private static generateEvidenceMetadata(type: string) {
    const baseMetadata = {
      created_by: this.randomChoice(['system', 'user', 'automated-tool']),
      file_version: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}`,
      checksum: this.generateFileHash().substring(0, 16)
    };

    const typeSpecificMetadata = {
      screenshot: {
        screen_resolution: this.randomChoice(['1920x1080', '2560x1440', '1366x768']),
        browser: this.randomChoice(['Chrome 119.0', 'Firefox 118.0', 'Safari 17.0']),
        capture_tool: this.randomChoice(['Snipping Tool', 'Screenshot API', 'Manual Capture'])
      },
      log: {
        log_level: this.randomChoice(['INFO', 'WARN', 'ERROR', 'DEBUG']),
        source_system: this.randomChoice(['SIEM', 'Firewall', 'Application', 'Database']),
        entries_count: Math.floor(Math.random() * 10000) + 100
      },
      config: {
        config_type: this.randomChoice(['system', 'application', 'network', 'security']),
        last_modified: this.randomPastDate(30),
        applied_by: this.randomChoice(['admin', 'system', 'automation'])
      }
    };

    return { ...baseMetadata, ...(typeSpecificMetadata[type] || {}) };
  }

  private static getStatusFromProgress(percentage: number): string {
    if (percentage >= 95) return 'completed';
    if (percentage >= 75) return 'on_track';
    if (percentage >= 50) return 'in_progress';
    if (percentage >= 25) return 'at_risk';
    if (percentage > 0) return 'behind';
    return 'blocked';
  }

  private static generateMilestones() {
    return Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({
      milestone_id: uuidv4(),
      name: `Milestone ${i + 1}`,
      target_date: this.randomFutureDate(60 + i * 30),
      status: this.randomChoice(['pending', 'in_progress', 'completed'])
    }));
  }

  private static generateBlockers() {
    const blockerTypes = ['budget', 'resources', 'technology', 'compliance', 'vendor'];
    return Array.from({ length: Math.floor(Math.random() * 3) }, () => ({
      blocker_id: uuidv4(),
      type: this.randomChoice(blockerTypes),
      description: 'Blocking issue requiring resolution',
      severity: this.randomChoice(['low', 'medium', 'high']),
      created_date: this.randomPastDate(30)
    }));
  }

  private static estimateCompletion(progressPercentage: number): string {
    const remainingDays = Math.floor((100 - progressPercentage) * 2); // Rough estimate
    const date = new Date();
    date.setDate(date.getDate() + remainingDays);
    return date.toISOString();
  }

  private static getRiskLevel(riskScore: number): string {
    if (riskScore >= 0.8) return 'Critical';
    if (riskScore >= 0.6) return 'High';
    if (riskScore >= 0.4) return 'Medium';
    return 'Low';
  }

  private static generateThreatSources(): string[] {
    const sources = [
      'External hackers', 'Malicious insiders', 'State-sponsored actors',
      'Competitors', 'Natural disasters', 'System failures', 'Human error'
    ];
    return Array.from({ length: Math.floor(Math.random() * 3) + 1 }, 
      () => this.randomChoice(sources));
  }

  private static generateVulnerabilities(): string[] {
    const vulnerabilities = [
      'Unpatched systems', 'Weak passwords', 'Missing encryption',
      'Inadequate access controls', 'Lack of monitoring', 'Poor configuration'
    ];
    return Array.from({ length: Math.floor(Math.random() * 3) + 1 }, 
      () => this.randomChoice(vulnerabilities));
  }

  private static generateExistingControls(): string[] {
    const controls = [
      'Firewall protection', 'Antivirus software', 'Access control lists',
      'Security awareness training', 'Incident response plan', 'Backup systems'
    ];
    return Array.from({ length: Math.floor(Math.random() * 4) + 1 }, 
      () => this.randomChoice(controls));
  }

  private static generateMitigationPlan(): string {
    const plans = [
      'Implement additional security controls and monitoring',
      'Enhance staff training and awareness programs',
      'Upgrade systems and apply security patches',
      'Strengthen access controls and authentication',
      'Develop comprehensive incident response procedures'
    ];
    return this.randomChoice(plans);
  }

  private static generateControlId(framework: string): string {
    const controlIds = {
      'SOC2': ['CC1.1', 'CC2.1', 'CC3.1', 'CC4.1', 'CC5.1', 'CC6.1'],
      'ISO27001': ['A.5.1.1', 'A.6.1.1', 'A.7.1.1', 'A.8.1.1', 'A.9.1.1'],
      'NIST_800_53': ['AC-1', 'AT-1', 'AU-1', 'CA-1', 'CM-1', 'CP-1'],
      'PCI_DSS': ['1.1', '2.1', '3.1', '4.1', '5.1', '6.1'],
      'HIPAA': ['164.308(a)(1)', '164.308(a)(2)', '164.308(a)(3)']
    };
    const ids = controlIds[framework] || ['CTRL-001', 'CTRL-002', 'CTRL-003'];
    return this.randomChoice(ids);
  }

  private static generateControlDescription(framework: string): string {
    return `${framework} control requirement for cybersecurity implementation`;
  }

  private static generateGapAnalysis(): string {
    const gaps = [
      'Minor documentation gaps identified',
      'Implementation needs enhancement',
      'Monitoring and reporting require improvement',
      'No significant gaps identified',
      'Control testing needed'
    ];
    return this.randomChoice(gaps);
  }

  private static generateIPAddress(): string {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  private static generateUserAgent(): string {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/119.0.0.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/17.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/118.0'
    ];
    return this.randomChoice(agents);
  }

  private static generateAuditDetails(action: string, resourceType: string) {
    return {
      action_description: `${action} performed on ${resourceType}`,
      changes_made: Math.random() > 0.5 ? ['field1_updated', 'field2_added'] : [],
      metadata: {
        request_id: uuidv4(),
        duration_ms: Math.floor(Math.random() * 5000) + 100
      }
    };
  }

  /**
   * Generate complete test dataset for a scenario
   */
  static generateCompleteScenario(scenarioName: string = 'default') {
    const org = this.generateOrganization();
    const currentProfile = this.generateProfile(org.org_id, { profile_type: 'current' });
    const targetProfile = this.generateProfile(org.org_id, { profile_type: 'target' });
    
    const assessments = Array.from({ length: 15 }, () => 
      this.generateAssessment(currentProfile.profile_id)
    );
    
    const targetAssessments = Array.from({ length: 15 }, () => 
      this.generateAssessment(targetProfile.profile_id)
    );
    
    const evidence = Array.from({ length: 8 }, () => 
      this.generateEvidence(currentProfile.profile_id)
    );
    
    const progress = Array.from({ length: 10 }, () => 
      this.generateProgress(currentProfile.profile_id)
    );
    
    const risks = Array.from({ length: 12 }, () => 
      this.generateRiskAssessment(org.org_id)
    );
    
    const compliance = Array.from({ length: 6 }, () => 
      this.generateComplianceMapping(currentProfile.profile_id)
    );
    
    const auditTrail = Array.from({ length: 20 }, () => 
      this.generateAuditEntry(currentProfile.profile_id)
    );

    return {
      scenario: scenarioName,
      organization: org,
      profiles: [currentProfile, targetProfile],
      assessments: [...assessments, ...targetAssessments],
      evidence,
      progress,
      risks,
      compliance,
      auditTrail,
      metadata: {
        generated_date: new Date().toISOString(),
        total_records: assessments.length + targetAssessments.length + evidence.length + 
                      progress.length + risks.length + compliance.length + auditTrail.length + 3,
        scenario_type: scenarioName
      }
    };
  }
}

// Export for backwards compatibility
export const {
  generateMockProfiles,
  generateMockAssessments, 
  generateMockProgress,
  generateMockEvidence,
  generateLargeBatchData,
  invalidInputs
} = require('./mock-data.js');