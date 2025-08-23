/**
 * Framework Crosswalk Mappings
 * Comprehensive mappings between major compliance frameworks and NIST CSF 2.0
 */

export interface FrameworkMapping {
  framework: string;
  control_id: string;
  control_name: string;
  csf_subcategories: Array<{
    id: string;
    mapping_strength: 'strong' | 'moderate' | 'weak';
    coverage_percentage: number;
  }>;
}

// ISO 27001:2022 to NIST CSF 2.0 Mappings
export const ISO_27001_MAPPINGS: FrameworkMapping[] = [
  // Information Security Policies
  {
    framework: 'ISO_27001',
    control_id: 'A.5.1',
    control_name: 'Information security policy',
    csf_subcategories: [
      { id: 'GV.PO-01', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'GV.PO-02', mapping_strength: 'moderate', coverage_percentage: 70 }
    ]
  },
  // Asset Management
  {
    framework: 'ISO_27001',
    control_id: 'A.5.9',
    control_name: 'Inventory of information and other associated assets',
    csf_subcategories: [
      { id: 'ID.AM-01', mapping_strength: 'strong', coverage_percentage: 95 },
      { id: 'ID.AM-02', mapping_strength: 'strong', coverage_percentage: 90 }
    ]
  },
  // Access Control
  {
    framework: 'ISO_27001',
    control_id: 'A.5.15',
    control_name: 'Access control',
    csf_subcategories: [
      { id: 'PR.AC-01', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'PR.AC-03', mapping_strength: 'strong', coverage_percentage: 85 }
    ]
  },
  // Incident Management
  {
    framework: 'ISO_27001',
    control_id: 'A.5.24',
    control_name: 'Information security incident management planning',
    csf_subcategories: [
      { id: 'RS.MA-01', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'RS.MA-02', mapping_strength: 'strong', coverage_percentage: 85 }
    ]
  }
];

// SOC 2 Trust Service Criteria to NIST CSF 2.0 Mappings
export const SOC2_MAPPINGS: FrameworkMapping[] = [
  // Security Criteria
  {
    framework: 'SOC_2',
    control_id: 'CC1.1',
    control_name: 'Control Environment',
    csf_subcategories: [
      { id: 'GV.OC-01', mapping_strength: 'strong', coverage_percentage: 85 },
      { id: 'GV.OC-02', mapping_strength: 'moderate', coverage_percentage: 70 }
    ]
  },
  {
    framework: 'SOC_2',
    control_id: 'CC6.1',
    control_name: 'Logical and Physical Access Controls',
    csf_subcategories: [
      { id: 'PR.AC-01', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'PR.AC-04', mapping_strength: 'strong', coverage_percentage: 85 },
      { id: 'PR.AC-05', mapping_strength: 'moderate', coverage_percentage: 75 }
    ]
  },
  {
    framework: 'SOC_2',
    control_id: 'CC7.1',
    control_name: 'System Operations',
    csf_subcategories: [
      { id: 'DE.CM-01', mapping_strength: 'strong', coverage_percentage: 85 },
      { id: 'DE.CM-03', mapping_strength: 'moderate', coverage_percentage: 70 }
    ]
  }
];

// NIST 800-53 to NIST CSF 2.0 Mappings
export const NIST_800_53_MAPPINGS: FrameworkMapping[] = [
  // Access Control
  {
    framework: 'NIST_800-53',
    control_id: 'AC-1',
    control_name: 'Access Control Policy and Procedures',
    csf_subcategories: [
      { id: 'PR.AC-01', mapping_strength: 'strong', coverage_percentage: 95 },
      { id: 'GV.PO-01', mapping_strength: 'moderate', coverage_percentage: 75 }
    ]
  },
  {
    framework: 'NIST_800-53',
    control_id: 'AC-2',
    control_name: 'Account Management',
    csf_subcategories: [
      { id: 'PR.AC-01', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'PR.AC-04', mapping_strength: 'strong', coverage_percentage: 85 }
    ]
  },
  // Audit and Accountability
  {
    framework: 'NIST_800-53',
    control_id: 'AU-1',
    control_name: 'Audit and Accountability Policy and Procedures',
    csf_subcategories: [
      { id: 'PR.PT-01', mapping_strength: 'strong', coverage_percentage: 85 },
      { id: 'DE.AE-03', mapping_strength: 'moderate', coverage_percentage: 70 }
    ]
  },
  // Incident Response
  {
    framework: 'NIST_800-53',
    control_id: 'IR-1',
    control_name: 'Incident Response Policy and Procedures',
    csf_subcategories: [
      { id: 'RS.MA-01', mapping_strength: 'strong', coverage_percentage: 95 },
      { id: 'RS.MA-02', mapping_strength: 'strong', coverage_percentage: 90 }
    ]
  }
];

// CIS Controls to NIST CSF 2.0 Mappings
export const CIS_MAPPINGS: FrameworkMapping[] = [
  {
    framework: 'CIS',
    control_id: 'CIS-1',
    control_name: 'Inventory and Control of Enterprise Assets',
    csf_subcategories: [
      { id: 'ID.AM-01', mapping_strength: 'strong', coverage_percentage: 95 },
      { id: 'ID.AM-02', mapping_strength: 'strong', coverage_percentage: 90 }
    ]
  },
  {
    framework: 'CIS',
    control_id: 'CIS-2',
    control_name: 'Inventory and Control of Software Assets',
    csf_subcategories: [
      { id: 'ID.AM-02', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'PR.IP-02', mapping_strength: 'moderate', coverage_percentage: 75 }
    ]
  },
  {
    framework: 'CIS',
    control_id: 'CIS-6',
    control_name: 'Access Control Management',
    csf_subcategories: [
      { id: 'PR.AC-01', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'PR.AC-03', mapping_strength: 'strong', coverage_percentage: 85 },
      { id: 'PR.AC-04', mapping_strength: 'strong', coverage_percentage: 85 }
    ]
  }
];

// NIST 800-171 to NIST CSF 2.0 Mappings
export const NIST_800_171_MAPPINGS: FrameworkMapping[] = [
  {
    framework: 'NIST_800-171',
    control_id: '3.1.1',
    control_name: 'Limit system access to authorized users',
    csf_subcategories: [
      { id: 'PR.AC-01', mapping_strength: 'strong', coverage_percentage: 95 },
      { id: 'PR.AC-03', mapping_strength: 'strong', coverage_percentage: 90 }
    ]
  },
  {
    framework: 'NIST_800-171',
    control_id: '3.3.1',
    control_name: 'Create and retain system audit logs',
    csf_subcategories: [
      { id: 'PR.PT-01', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'DE.AE-03', mapping_strength: 'strong', coverage_percentage: 85 }
    ]
  },
  {
    framework: 'NIST_800-171',
    control_id: '3.6.1',
    control_name: 'Establish incident response capability',
    csf_subcategories: [
      { id: 'RS.MA-01', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'RS.MA-02', mapping_strength: 'strong', coverage_percentage: 85 }
    ]
  }
];

// IEC 62443 to NIST CSF 2.0 Mappings
export const IEC_62443_MAPPINGS: FrameworkMapping[] = [
  {
    framework: 'IEC_62443',
    control_id: 'SR-1.1',
    control_name: 'Human user identification and authentication',
    csf_subcategories: [
      { id: 'PR.AC-01', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'PR.AC-07', mapping_strength: 'strong', coverage_percentage: 85 }
    ]
  },
  {
    framework: 'IEC_62443',
    control_id: 'SR-2.1',
    control_name: 'Authorization enforcement',
    csf_subcategories: [
      { id: 'PR.AC-04', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'PR.AC-03', mapping_strength: 'moderate', coverage_percentage: 75 }
    ]
  },
  {
    framework: 'IEC_62443',
    control_id: 'SR-3.1',
    control_name: 'Communication integrity',
    csf_subcategories: [
      { id: 'PR.DS-02', mapping_strength: 'strong', coverage_percentage: 85 },
      { id: 'PR.DS-05', mapping_strength: 'moderate', coverage_percentage: 70 }
    ]
  }
];

// PCI-DSS to NIST CSF 2.0 Mappings
export const PCI_DSS_MAPPINGS: FrameworkMapping[] = [
  {
    framework: 'PCI-DSS',
    control_id: '1.1',
    control_name: 'Establish firewall and router configuration standards',
    csf_subcategories: [
      { id: 'PR.AC-05', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'PR.PT-04', mapping_strength: 'moderate', coverage_percentage: 75 }
    ]
  },
  {
    framework: 'PCI-DSS',
    control_id: '2.1',
    control_name: 'Change default passwords',
    csf_subcategories: [
      { id: 'PR.AC-01', mapping_strength: 'strong', coverage_percentage: 85 },
      { id: 'PR.IP-01', mapping_strength: 'moderate', coverage_percentage: 70 }
    ]
  },
  {
    framework: 'PCI-DSS',
    control_id: '8.1',
    control_name: 'Assign unique ID to each user',
    csf_subcategories: [
      { id: 'PR.AC-01', mapping_strength: 'strong', coverage_percentage: 95 },
      { id: 'PR.AC-07', mapping_strength: 'strong', coverage_percentage: 90 }
    ]
  },
  {
    framework: 'PCI-DSS',
    control_id: '10.1',
    control_name: 'Implement audit trails',
    csf_subcategories: [
      { id: 'PR.PT-01', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'DE.AE-03', mapping_strength: 'strong', coverage_percentage: 85 }
    ]
  }
];

// HIPAA to NIST CSF 2.0 Mappings
export const HIPAA_MAPPINGS: FrameworkMapping[] = [
  {
    framework: 'HIPAA',
    control_id: '164.308(a)(1)',
    control_name: 'Security Management Process',
    csf_subcategories: [
      { id: 'ID.RA-01', mapping_strength: 'strong', coverage_percentage: 85 },
      { id: 'GV.RM-01', mapping_strength: 'moderate', coverage_percentage: 75 }
    ]
  },
  {
    framework: 'HIPAA',
    control_id: '164.308(a)(3)',
    control_name: 'Workforce Security',
    csf_subcategories: [
      { id: 'PR.AC-01', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'PR.AC-04', mapping_strength: 'strong', coverage_percentage: 85 }
    ]
  },
  {
    framework: 'HIPAA',
    control_id: '164.308(a)(4)',
    control_name: 'Information Access Management',
    csf_subcategories: [
      { id: 'PR.AC-03', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'PR.AC-04', mapping_strength: 'strong', coverage_percentage: 85 }
    ]
  },
  {
    framework: 'HIPAA',
    control_id: '164.308(a)(6)',
    control_name: 'Security Incident Procedures',
    csf_subcategories: [
      { id: 'RS.MA-01', mapping_strength: 'strong', coverage_percentage: 90 },
      { id: 'RS.AN-01', mapping_strength: 'moderate', coverage_percentage: 75 }
    ]
  }
];

// Aggregate all mappings
export const ALL_FRAMEWORK_MAPPINGS = [
  ...ISO_27001_MAPPINGS,
  ...SOC2_MAPPINGS,
  ...NIST_800_53_MAPPINGS,
  ...CIS_MAPPINGS,
  ...NIST_800_171_MAPPINGS,
  ...IEC_62443_MAPPINGS,
  ...PCI_DSS_MAPPINGS,
  ...HIPAA_MAPPINGS
];

// Framework metadata
export const FRAMEWORK_METADATA = {
  'ISO_27001': {
    full_name: 'ISO/IEC 27001:2022',
    version: '2022',
    description: 'Information security management systems'
  },
  'SOC_2': {
    full_name: 'SOC 2 Type II',
    version: '2017',
    description: 'Service Organization Control 2'
  },
  'NIST_800-53': {
    full_name: 'NIST SP 800-53',
    version: 'Rev 5',
    description: 'Security and Privacy Controls'
  },
  'CIS': {
    full_name: 'CIS Critical Security Controls',
    version: 'v8',
    description: 'Center for Internet Security Controls'
  },
  'NIST_800-171': {
    full_name: 'NIST SP 800-171',
    version: 'Rev 2',
    description: 'Protecting Controlled Unclassified Information'
  },
  'IEC_62443': {
    full_name: 'IEC 62443',
    version: '4-2',
    description: 'Industrial communication networks security'
  },
  'PCI-DSS': {
    full_name: 'PCI Data Security Standard',
    version: '4.0',
    description: 'Payment Card Industry Data Security Standard'
  },
  'HIPAA': {
    full_name: 'HIPAA Security Rule',
    version: '2013',
    description: 'Health Insurance Portability and Accountability Act'
  }
};