import { CSFDatabase } from "../db/database.js";
import { logger } from '../utils/logger.js';
import { FrameworkLoader } from "../services/framework-loader.js";

interface PolicyTemplateOptions {
  subcategory_ids: string[];
  policy_type?: 'security' | 'operational' | 'compliance' | 'governance';
  format?: 'markdown' | 'structured';
  include_procedures?: boolean;
  include_compliance_mapping?: boolean;
}

interface PolicyTemplate {
  policy_name: string;
  policy_type: string;
  covered_subcategories: Array<{
    subcategory_id: string;
    subcategory_name: string;
    coverage_description: string;
  }>;
  template_content: string;
  compliance_mappings?: Array<{
    framework: string;
    requirements: string[];
  }>;
  metadata: {
    version: string;
    generated_at: string;
    review_cycle: string;
    approval_required: string[];
  };
}

// Policy component templates
const POLICY_SECTIONS = {
  header: (title: string, type: string) => `# ${title}

## Document Information
- **Policy Type**: ${type}
- **Version**: 1.0
- **Effective Date**: [DATE]
- **Review Cycle**: Annual
- **Owner**: [OWNER]
- **Approved By**: [APPROVER]

---

`,
  purpose: (subcategories: string[]) => `## 1. Purpose

This policy establishes the requirements and guidelines for ${subcategories.join(', ')} 
in accordance with the NIST Cybersecurity Framework 2.0 and applicable regulatory requirements.

The purpose of this policy is to:
- Define clear security requirements and expectations
- Ensure consistent implementation across the organization
- Meet compliance and regulatory obligations
- Protect organizational assets and information
- Establish accountability and responsibility

`,
  scope: () => `## 2. Scope

This policy applies to:
- All employees, contractors, and third-party personnel
- All information systems, applications, and infrastructure
- All locations and facilities
- All data classifications and types
- Cloud services and third-party systems

### Exclusions
[Define any exclusions or exceptions]

`,
  definitions: () => `## 3. Definitions

| Term | Definition |
|------|------------|
| Information Asset | Any data, system, or resource that has value to the organization |
| Risk | The potential for loss, damage, or harm to information assets |
| Control | A safeguard or countermeasure to reduce risk |
| Incident | An event that compromises security or violates policy |
| [Add relevant terms] | [Add definitions] |

`,
  policy_statement: (requirements: string[]) => `## 4. Policy Statement

The organization shall:

${requirements.map((req, i) => `${i + 1}. ${req}`).join('\n')}

### Prohibited Activities
The following activities are strictly prohibited:
- Unauthorized access to systems or data
- Circumvention of security controls
- Sharing of credentials or access tokens
- Installation of unauthorized software
- [Add specific prohibitions]

`,
  responsibilities: () => `## 5. Roles and Responsibilities

### Executive Management
- Approve and support the policy
- Provide necessary resources
- Ensure policy enforcement

### Information Security Team
- Develop and maintain security standards
- Monitor compliance with policy
- Provide guidance and support
- Investigate violations

### IT Department
- Implement technical controls
- Maintain security configurations
- Monitor system security
- Report security events

### All Personnel
- Comply with policy requirements
- Report security incidents
- Protect organizational assets
- Complete required training

### Third Parties
- Adhere to policy requirements
- Maintain confidentiality
- Report security concerns

`,
  procedures: (subcategories: any[]) => `## 6. Procedures

### Implementation Procedures
${subcategories.map(sub => `
#### ${sub.subcategory_name}
1. [Define step-by-step procedure]
2. [Include decision points]
3. [Specify tools and systems]
4. [Define approval requirements]
`).join('\n')}

### Monitoring Procedures
- Regular assessments and audits
- Continuous monitoring of controls
- Periodic reviews and updates
- Performance metrics tracking

### Incident Response Procedures
1. Detection and reporting
2. Initial assessment
3. Containment and eradication
4. Recovery and restoration
5. Lessons learned

`,
  compliance: (mappings: any[]) => `## 7. Compliance

### Regulatory Requirements
This policy addresses the following compliance requirements:

${mappings.map(m => `**${m.framework}**
${m.requirements.map((r: string) => `- ${r}`).join('\n')}`).join('\n\n')}

### Audit and Assessment
- Annual policy review and update
- Quarterly compliance assessments
- External audits as required
- Self-assessments by business units

`,
  enforcement: () => `## 8. Enforcement

### Violations
Violations of this policy may result in:
- Disciplinary action up to and including termination
- Legal action for criminal violations
- Financial penalties for regulatory violations
- Suspension or revocation of system access

### Reporting Violations
- Report to immediate supervisor
- Contact Information Security team
- Use anonymous reporting hotline
- Document all relevant details

`,
  exceptions: () => `## 9. Exceptions

### Exception Process
1. Submit written exception request
2. Include business justification
3. Identify compensating controls
4. Obtain management approval
5. Document approval and expiration

### Exception Criteria
- Temporary business need
- Technical limitations
- Cost-benefit analysis
- Risk acceptance by management

`,
  references: () => `## 10. References

### External Standards
- NIST Cybersecurity Framework 2.0
- ISO 27001:2022
- Industry-specific regulations

### Internal Documents
- Information Security Program
- Risk Management Policy
- Incident Response Plan
- Business Continuity Plan

### Related Policies
- Acceptable Use Policy
- Data Classification Policy
- Access Control Policy
- [Add related policies]

`,
  revision_history: () => `## 11. Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | [DATE] | [AUTHOR] | Initial version |
| | | | |

---

**Document Classification**: [CLASSIFICATION]
**Distribution**: [DISTRIBUTION LIST]`
};

export async function generatePolicyTemplate(
  _db: CSFDatabase,
  framework: FrameworkLoader,
  options: PolicyTemplateOptions
): Promise<PolicyTemplate> {
  try {
    // Validate and get subcategory details
    const subcategories = [];
    for (const id of options.subcategory_ids) {
      const subcategory = framework.getSubcategory(id);
      if (!subcategory) {
        throw new Error(`Subcategory ${id} not found`);
      }
      subcategories.push(subcategory);
    }

    // Determine policy type and name
    const policyType = options.policy_type || determinePolicyType(subcategories);
    const policyName = generatePolicyName(subcategories, policyType);

    // Generate policy requirements based on subcategories
    const requirements = generatePolicyRequirements(subcategories);

    // Generate compliance mappings if requested
    const complianceMappings = options.include_compliance_mapping !== false ?
      generateComplianceMappings(subcategories) : undefined;

    // Build policy content
    let templateContent = '';
    
    if (options.format === 'structured') {
      templateContent = generateStructuredPolicy(
        policyName,
        policyType,
        subcategories,
        requirements,
        complianceMappings,
        options.include_procedures !== false
      );
    } else {
      // Default to markdown format
      templateContent = generateMarkdownPolicy(
        policyName,
        policyType,
        subcategories,
        requirements,
        complianceMappings,
        options.include_procedures !== false
      );
    }

    // Build the response
    const template: PolicyTemplate = {
      policy_name: policyName,
      policy_type: policyType,
      covered_subcategories: subcategories.map(sub => ({
        subcategory_id: (sub as any).id || '',
        subcategory_name: sub.title || '',
        coverage_description: generateCoverageDescription(sub)
      })),
      template_content: templateContent,
      compliance_mappings: complianceMappings,
      metadata: {
        version: '1.0',
        generated_at: new Date().toISOString(),
        review_cycle: 'Annual',
        approval_required: determineApprovers(policyType)
      }
    };

    return template;
  } catch (error) {
    logger.error('Error generating policy template:', error);
    throw new Error(`Failed to generate policy template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function determinePolicyType(subcategories: any[]): string {
  // Analyze subcategories to determine most appropriate policy type
  const categories = subcategories.map(s => s.id.split('.')[0]);
  
  if (categories.some(c => c.startsWith('GV'))) {
    return 'governance';
  } else if (categories.some(c => ['PR', 'DE'].includes(c.split('-')[0]))) {
    return 'security';
  } else if (categories.some(c => ['RS', 'RC'].includes(c.split('-')[0]))) {
    return 'operational';
  } else {
    return 'compliance';
  }
}

function generatePolicyName(subcategories: any[], policyType: string): string {
  // Generate descriptive policy name based on covered subcategories
  const functions = new Set(subcategories.map(s => s.id.split('-')[0]));
  
  if (functions.size === 1) {
    const func = Array.from(functions)[0];
    const funcNames: Record<string, string> = {
      'GV': 'Governance',
      'ID': 'Identify',
      'PR': 'Protect',
      'DE': 'Detect',
      'RS': 'Respond',
      'RC': 'Recover'
    };
    return `${funcNames[func] || func} ${policyType.charAt(0).toUpperCase() + policyType.slice(1)} Policy`;
  } else {
    return `Integrated Cybersecurity ${policyType.charAt(0).toUpperCase() + policyType.slice(1)} Policy`;
  }
}

function generatePolicyRequirements(subcategories: any[]): string[] {
  const requirements: string[] = [];
  
  for (const sub of subcategories) {
    const title = sub.title.toLowerCase();
    
    // Generate requirements based on subcategory characteristics
    if (title.includes('policy') || title.includes('governance')) {
      requirements.push(`Establish and maintain ${sub.title} with clear roles and responsibilities`);
      requirements.push(`Review and update ${sub.title} at least annually`);
    }
    
    if (title.includes('risk')) {
      requirements.push(`Identify and assess risks related to ${sub.title}`);
      requirements.push(`Implement appropriate risk mitigation measures`);
      requirements.push(`Monitor and report on risk metrics`);
    }
    
    if (title.includes('access') || title.includes('identity')) {
      requirements.push(`Implement access controls based on least privilege principle`);
      requirements.push(`Maintain accurate identity and access records`);
      requirements.push(`Conduct periodic access reviews`);
    }
    
    if (title.includes('monitor') || title.includes('detect')) {
      requirements.push(`Establish continuous monitoring for ${sub.title}`);
      requirements.push(`Define alerting thresholds and escalation procedures`);
      requirements.push(`Maintain audit logs and retention requirements`);
    }
    
    if (title.includes('incident') || title.includes('response')) {
      requirements.push(`Establish incident response procedures for ${sub.title}`);
      requirements.push(`Define roles and responsibilities for incident handling`);
      requirements.push(`Conduct regular incident response exercises`);
    }
    
    if (title.includes('training') || title.includes('awareness')) {
      requirements.push(`Provide security awareness training to all personnel`);
      requirements.push(`Maintain training records and completion tracking`);
      requirements.push(`Update training content based on emerging threats`);
    }
    
    // Add generic requirement for each subcategory
    requirements.push(`Implement controls to address ${sub.title} requirements`);
  }
  
  // Remove duplicates
  return [...new Set(requirements)];
}

function generateComplianceMappings(subcategories: any[]): any[] {
  const mappings = [];
  
  // Map to common compliance frameworks based on subcategory types
  const hasAccessControl = subcategories.some(s => s.title.toLowerCase().includes('access'));
  const hasDataProtection = subcategories.some(s => s.title.toLowerCase().includes('data') || s.title.toLowerCase().includes('protect'));
  const hasIncidentResponse = subcategories.some(s => s.title.toLowerCase().includes('incident'));
  const hasRiskManagement = subcategories.some(s => s.title.toLowerCase().includes('risk'));
  
  if (hasAccessControl || hasDataProtection) {
    mappings.push({
      framework: 'ISO 27001:2022',
      requirements: [
        'A.5.15 - Access control',
        'A.5.16 - Identity management',
        'A.8.2 - Privileged access rights',
        'A.8.3 - Information access restriction'
      ]
    });
  }
  
  if (hasDataProtection) {
    mappings.push({
      framework: 'GDPR',
      requirements: [
        'Article 32 - Security of processing',
        'Article 33 - Personal data breach notification',
        'Article 25 - Data protection by design'
      ]
    });
  }
  
  if (hasIncidentResponse) {
    mappings.push({
      framework: 'NIST SP 800-61',
      requirements: [
        'Incident response planning',
        'Detection and analysis',
        'Containment, eradication, and recovery',
        'Post-incident activity'
      ]
    });
  }
  
  if (hasRiskManagement) {
    mappings.push({
      framework: 'ISO 31000',
      requirements: [
        'Risk assessment process',
        'Risk treatment',
        'Risk monitoring and review',
        'Risk communication and consultation'
      ]
    });
  }
  
  // Add SOC 2 mapping for all
  mappings.push({
    framework: 'SOC 2 Type II',
    requirements: [
      'CC6.1 - Logical and physical access controls',
      'CC7.2 - System monitoring',
      'CC3.2 - Risk assessment process',
      'CC9.2 - Disclosure of incidents'
    ]
  });
  
  return mappings;
}

function generateCoverageDescription(subcategory: any): string {
  return `This policy addresses ${subcategory.title} by establishing requirements for ${subcategory.description.toLowerCase()}`;
}

function determineApprovers(policyType: string): string[] {
  const approvers = ['Information Security Officer', 'Chief Information Officer'];
  
  switch (policyType) {
    case 'governance':
      approvers.push('Chief Executive Officer', 'Board of Directors');
      break;
    case 'compliance':
      approvers.push('Chief Compliance Officer', 'Legal Counsel');
      break;
    case 'operational':
      approvers.push('Chief Operating Officer', 'IT Director');
      break;
    case 'security':
      approvers.push('Chief Information Security Officer');
      break;
  }
  
  return approvers;
}

function generateMarkdownPolicy(
  policyName: string,
  policyType: string,
  subcategories: any[],
  requirements: string[],
  complianceMappings: any[] | undefined,
  includeProcedures: boolean
): string {
  let content = '';
  
  // Add sections
  content += POLICY_SECTIONS.header(policyName, policyType);
  content += POLICY_SECTIONS.purpose(subcategories.map(s => s.title));
  content += POLICY_SECTIONS.scope();
  content += POLICY_SECTIONS.definitions();
  content += POLICY_SECTIONS.policy_statement(requirements);
  content += POLICY_SECTIONS.responsibilities();
  
  if (includeProcedures) {
    content += POLICY_SECTIONS.procedures(subcategories);
  }
  
  if (complianceMappings) {
    content += POLICY_SECTIONS.compliance(complianceMappings);
  }
  
  content += POLICY_SECTIONS.enforcement();
  content += POLICY_SECTIONS.exceptions();
  content += POLICY_SECTIONS.references();
  content += POLICY_SECTIONS.revision_history();
  
  return content;
}

function generateStructuredPolicy(
  policyName: string,
  policyType: string,
  subcategories: any[],
  requirements: string[],
  complianceMappings: any[] | undefined,
  includeProcedures: boolean
): string {
  const policy = {
    policy_name: policyName,
    policy_type: policyType,
    version: '1.0',
    sections: {
      purpose: {
        content: `Establishes requirements for ${subcategories.map(s => s.title).join(', ')}`,
        objectives: [
          'Define security requirements',
          'Ensure compliance',
          'Protect organizational assets'
        ]
      },
      scope: {
        applies_to: ['All personnel', 'All systems', 'All data'],
        exclusions: []
      },
      policy_statements: requirements,
      roles_responsibilities: {
        'Information Security': ['Develop standards', 'Monitor compliance'],
        'IT Department': ['Implement controls', 'Maintain configurations'],
        'All Personnel': ['Comply with policy', 'Report incidents']
      },
      procedures: includeProcedures ? {
        implementation: subcategories.map(s => ({
          subcategory: s.title,
          steps: ['Define requirements', 'Implement controls', 'Test effectiveness', 'Monitor compliance']
        }))
      } : undefined,
      compliance: complianceMappings,
      enforcement: {
        violations: ['Disciplinary action', 'Access suspension', 'Legal action'],
        reporting: ['Supervisor', 'Security team', 'Anonymous hotline']
      }
    }
  };
  
  return JSON.stringify(policy, null, 2);
}

export const generatePolicyTemplateTool = {
  name: "generate_policy_template",
  description: "Generate policy document templates based on NIST CSF subcategories",
  inputSchema: {
    type: "object",
    properties: {
      subcategory_ids: {
        type: "array",
        description: "Array of NIST CSF subcategory IDs to cover in policy",
        items: {
          type: "string"
        }
      },
      policy_type: {
        type: "string",
        enum: ["security", "operational", "compliance", "governance"],
        description: "Type of policy to generate"
      },
      format: {
        type: "string",
        enum: ["markdown", "structured"],
        description: "Output format for the policy",
        default: "markdown"
      },
      include_procedures: {
        type: "boolean",
        description: "Include detailed procedures section",
        default: true
      },
      include_compliance_mapping: {
        type: "boolean",
        description: "Include compliance framework mappings",
        default: true
      }
    },
    required: ["subcategory_ids"]
  },
  execute: async (args: PolicyTemplateOptions, db: CSFDatabase, framework: FrameworkLoader) => {
    return await generatePolicyTemplate(db, framework, args);
  }
};