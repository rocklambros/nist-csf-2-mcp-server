import { CSFDatabase } from "../db/database.js";
import { FrameworkLoader } from "../services/framework-loader.js";

interface ImplementationTemplateOptions {
  subcategory_id: string;
  industry?: string;
  organization_size?: 'small' | 'medium' | 'large' | 'enterprise';
  include_examples?: boolean;
  include_tools?: boolean;
  include_metrics?: boolean;
}

interface ImplementationTemplate {
  subcategory_id: string;
  subcategory_name: string;
  category_name: string;
  function_name: string;
  template: {
    overview: string;
    objectives: string[];
    implementation_steps: Array<{
      step_number: number;
      title: string;
      description: string;
      industry_considerations?: string;
      estimated_effort: string;
      required_resources: string[];
      dependencies?: string[];
    }>;
    industry_specific: {
      industry: string;
      regulatory_requirements: string[];
      best_practices: string[];
      common_challenges: string[];
      recommended_tools: string[];
    };
    example_configurations?: Array<{
      tool_name: string;
      configuration_snippet: string;
      description: string;
    }>;
    success_criteria: string[];
    metrics: Array<{
      metric_name: string;
      measurement_method: string;
      target_value: string;
      frequency: string;
    }>;
    common_pitfalls: string[];
    references: Array<{
      title: string;
      url?: string;
      description: string;
    }>;
  };
  generated_at: string;
}

// Industry-specific implementation guidance
const INDUSTRY_GUIDANCE: Record<string, Record<string, any>> = {
  'financial_services': {
    regulatory_focus: ['PCI-DSS', 'SOX', 'GLBA', 'FFIEC'],
    security_priorities: ['data encryption', 'access controls', 'audit logging', 'fraud detection'],
    common_tools: ['SIEM', 'DLP', 'PAM', 'encryption gateways'],
    risk_tolerance: 'low'
  },
  'healthcare': {
    regulatory_focus: ['HIPAA', 'HITECH', 'FDA regulations'],
    security_priorities: ['PHI protection', 'access controls', 'audit trails', 'encryption'],
    common_tools: ['HIPAA-compliant solutions', 'medical device security', 'secure messaging'],
    risk_tolerance: 'very low'
  },
  'manufacturing': {
    regulatory_focus: ['ISO 27001', 'IEC 62443', 'NIST 800-171'],
    security_priorities: ['OT security', 'supply chain', 'IP protection', 'availability'],
    common_tools: ['OT monitoring', 'network segmentation', 'industrial firewalls'],
    risk_tolerance: 'medium'
  },
  'technology': {
    regulatory_focus: ['SOC 2', 'ISO 27001', 'GDPR', 'CCPA'],
    security_priorities: ['code security', 'API protection', 'cloud security', 'DevSecOps'],
    common_tools: ['SAST', 'DAST', 'container security', 'cloud security platforms'],
    risk_tolerance: 'medium'
  },
  'government': {
    regulatory_focus: ['FISMA', 'FedRAMP', 'NIST 800-53', 'CMMC'],
    security_priorities: ['classified data', 'clearance management', 'supply chain', 'zero trust'],
    common_tools: ['approved product lists', 'FIPS-validated crypto', 'STIGs'],
    risk_tolerance: 'very low'
  },
  'retail': {
    regulatory_focus: ['PCI-DSS', 'GDPR', 'CCPA', 'state privacy laws'],
    security_priorities: ['payment security', 'customer data', 'e-commerce', 'POS systems'],
    common_tools: ['tokenization', 'web application firewalls', 'fraud detection'],
    risk_tolerance: 'medium'
  },
  'energy': {
    regulatory_focus: ['NERC CIP', 'IEC 62443', 'TSA Pipeline Security'],
    security_priorities: ['critical infrastructure', 'SCADA security', 'physical security', 'resilience'],
    common_tools: ['OT security platforms', 'anomaly detection', 'backup power systems'],
    risk_tolerance: 'low'
  }
};

// Size-based implementation approaches - not currently used but kept for reference
/*
const SIZE_APPROACHES = {
  small: {
    approach: 'Essential controls with managed services',
    resource_constraints: 'Limited IT staff and budget',
    recommended_strategy: 'Cloud-first, SaaS solutions, outsourced monitoring',
    typical_timeline: '3-6 months per control'
  },
  medium: {
    approach: 'Balanced in-house and outsourced capabilities',
    resource_constraints: 'Dedicated security team but limited specialists',
    recommended_strategy: 'Hybrid cloud, mix of tools, selective outsourcing',
    typical_timeline: '2-4 months per control'
  },
  large: {
    approach: 'Comprehensive in-house capabilities',
    resource_constraints: 'Multiple teams but competing priorities',
    recommended_strategy: 'Enterprise platforms, automation, centers of excellence',
    typical_timeline: '1-3 months per control'
  },
  enterprise: {
    approach: 'Mature security program with specialized teams',
    resource_constraints: 'Complexity and scale challenges',
    recommended_strategy: 'Platform consolidation, automation, AI/ML integration',
    typical_timeline: '1-2 months per control'
  }
};
*/

export async function getImplementationTemplate(
  _db: CSFDatabase,
  framework: FrameworkLoader,
  options: ImplementationTemplateOptions
): Promise<ImplementationTemplate> {
  try {
    // Get subcategory details from framework
    const subcategory = framework.getSubcategory(options.subcategory_id);
    if (!subcategory) {
      throw new Error(`Subcategory ${options.subcategory_id} not found`);
    }

    // Get category and function details
    const categoryId = options.subcategory_id.split('.')[0]!;
    const category = framework.getCategory(categoryId)!;
    const functionId = categoryId.split('-')[0]!;
    const func = framework.getFunction(functionId);

    if (!category || !func) {
      throw new Error(`Unable to find category or function for ${options.subcategory_id}`);
    }

    const industry = options.industry || 'general';
    const orgSize = options.organization_size || 'medium';
    const industryGuide = INDUSTRY_GUIDANCE[industry] || INDUSTRY_GUIDANCE.technology!;

    // Generate implementation steps
    const implementationSteps = generateImplementationSteps(
      subcategory,
      industry,
      orgSize
    );

    // Generate example configurations if requested
    const exampleConfigs = options.include_examples !== false ? 
      generateExampleConfigurations(subcategory, industry) : undefined;

    // Generate metrics
    const metrics = options.include_metrics !== false ?
      generateMetrics(subcategory) : [];

    // Build the template
    const template: ImplementationTemplate = {
      subcategory_id: options.subcategory_id,
      subcategory_name: subcategory.title || '',
      category_name: category?.title || '',
      function_name: func?.title || '',
      template: {
        overview: generateOverview(subcategory, category, func),
        objectives: generateObjectives(subcategory),
        implementation_steps: implementationSteps,
        industry_specific: {
          industry: industry,
          regulatory_requirements: industryGuide.regulatory_focus || [],
          best_practices: generateIndustryBestPractices(subcategory, industry),
          common_challenges: generateIndustryChallenges(subcategory, industry),
          recommended_tools: industryGuide.common_tools || []
        },
        example_configurations: exampleConfigs,
        success_criteria: generateSuccessCriteria(subcategory),
        metrics: metrics,
        common_pitfalls: generateCommonPitfalls(subcategory),
        references: generateReferences(subcategory, industry)
      },
      generated_at: new Date().toISOString()
    };

    return template;
  } catch (error) {
    console.error('Error generating implementation template:', error);
    throw new Error(`Failed to generate template: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateOverview(subcategory: any, category: any, func: any): string {
  return `This implementation guide provides a structured approach to implementing ${subcategory.title} ` +
    `as part of the ${category.title} category within the ${func.title} function of the NIST CSF 2.0 framework. ` +
    `\n\n${subcategory.description}\n\n` +
    `This control is essential for establishing ${func.description.toLowerCase()} and supports ` +
    `the broader objective of ${category.description.toLowerCase()}.`;
}

function generateObjectives(subcategory: any): string[] {
  const objectives = [
    `Establish and maintain ${subcategory.title.toLowerCase()} capabilities`,
    `Ensure alignment with organizational risk management strategy`,
    `Meet regulatory and compliance requirements`,
    `Enable continuous monitoring and improvement`,
    `Integrate with existing security controls and processes`
  ];

  // Add subcategory-specific objectives based on keywords
  const title = subcategory.title.toLowerCase();
  if (title.includes('policy')) {
    objectives.push('Develop and communicate clear policies and procedures');
  }
  if (title.includes('risk')) {
    objectives.push('Identify and assess relevant risks');
    objectives.push('Implement appropriate risk mitigation measures');
  }
  if (title.includes('monitor')) {
    objectives.push('Establish continuous monitoring capabilities');
    objectives.push('Define alerting thresholds and response procedures');
  }
  if (title.includes('incident')) {
    objectives.push('Establish incident response procedures');
    objectives.push('Ensure timely detection and response');
  }

  return objectives;
}

function generateImplementationSteps(
  subcategory: any,
  industry: string,
  orgSize: string
): any[] {
  const steps = [];
  
  // Step 1: Assessment
  steps.push({
    step_number: 1,
    title: 'Current State Assessment',
    description: 'Evaluate existing capabilities and identify gaps related to ' + subcategory.title,
    industry_considerations: getIndustryConsideration(industry, 'assessment'),
    estimated_effort: getEffortEstimate(orgSize, 'assessment'),
    required_resources: ['Security team', 'Business stakeholders', 'Assessment tools'],
    dependencies: ['Management approval', 'Stakeholder availability']
  });

  // Step 2: Planning
  steps.push({
    step_number: 2,
    title: 'Implementation Planning',
    description: 'Develop detailed implementation plan including timeline, resources, and success criteria',
    industry_considerations: getIndustryConsideration(industry, 'planning'),
    estimated_effort: getEffortEstimate(orgSize, 'planning'),
    required_resources: ['Project manager', 'Security architect', 'Budget approval'],
    dependencies: ['Assessment completion', 'Resource allocation']
  });

  // Step 3: Design
  steps.push({
    step_number: 3,
    title: 'Solution Design',
    description: 'Design technical and procedural controls to address ' + subcategory.title,
    industry_considerations: getIndustryConsideration(industry, 'design'),
    estimated_effort: getEffortEstimate(orgSize, 'design'),
    required_resources: ['Security architect', 'Technical specialists', 'Design tools'],
    dependencies: ['Requirements finalization', 'Architecture review']
  });

  // Step 4: Implementation
  steps.push({
    step_number: 4,
    title: 'Control Implementation',
    description: 'Deploy and configure controls according to the approved design',
    industry_considerations: getIndustryConsideration(industry, 'implementation'),
    estimated_effort: getEffortEstimate(orgSize, 'implementation'),
    required_resources: ['Implementation team', 'Tools and technologies', 'Test environment'],
    dependencies: ['Design approval', 'Change management approval']
  });

  // Step 5: Testing
  steps.push({
    step_number: 5,
    title: 'Testing and Validation',
    description: 'Verify controls are functioning as designed and meeting objectives',
    industry_considerations: getIndustryConsideration(industry, 'testing'),
    estimated_effort: getEffortEstimate(orgSize, 'testing'),
    required_resources: ['QA team', 'Test cases', 'Test data'],
    dependencies: ['Implementation completion', 'Test environment']
  });

  // Step 6: Documentation
  steps.push({
    step_number: 6,
    title: 'Documentation and Training',
    description: 'Create documentation and train relevant personnel',
    industry_considerations: getIndustryConsideration(industry, 'documentation'),
    estimated_effort: getEffortEstimate(orgSize, 'documentation'),
    required_resources: ['Technical writers', 'Training team', 'Documentation tools'],
    dependencies: ['Testing completion', 'Stakeholder availability']
  });

  // Step 7: Deployment
  steps.push({
    step_number: 7,
    title: 'Production Deployment',
    description: 'Roll out controls to production environment',
    industry_considerations: getIndustryConsideration(industry, 'deployment'),
    estimated_effort: getEffortEstimate(orgSize, 'deployment'),
    required_resources: ['Operations team', 'Change management', 'Monitoring tools'],
    dependencies: ['Testing approval', 'Production access']
  });

  // Step 8: Monitoring
  steps.push({
    step_number: 8,
    title: 'Monitoring and Optimization',
    description: 'Establish ongoing monitoring and continuous improvement',
    industry_considerations: getIndustryConsideration(industry, 'monitoring'),
    estimated_effort: getEffortEstimate(orgSize, 'monitoring'),
    required_resources: ['SOC team', 'Monitoring tools', 'Metrics dashboard'],
    dependencies: ['Deployment completion', 'Monitoring infrastructure']
  });

  return steps;
}

function getIndustryConsideration(industry: string, phase: string): string {
  const considerations: Record<string, Record<string, string>> = {
    financial_services: {
      assessment: 'Include PCI-DSS and SOX compliance requirements in assessment',
      planning: 'Plan for regulatory reporting and audit requirements',
      design: 'Ensure design meets financial industry security standards',
      implementation: 'Implement with consideration for transaction integrity',
      testing: 'Include compliance validation and penetration testing',
      documentation: 'Ensure audit-ready documentation',
      deployment: 'Deploy with minimal impact to trading hours',
      monitoring: 'Implement real-time fraud detection and compliance monitoring'
    },
    healthcare: {
      assessment: 'Evaluate HIPAA compliance and PHI protection requirements',
      planning: 'Include HIPAA Security Rule requirements in planning',
      design: 'Design with PHI encryption and access controls',
      implementation: 'Implement HIPAA-compliant logging and auditing',
      testing: 'Conduct HIPAA compliance testing',
      documentation: 'Create HIPAA-required documentation',
      deployment: 'Deploy with clinical system availability in mind',
      monitoring: 'Monitor for PHI access and potential breaches'
    },
    government: {
      assessment: 'Assess against NIST 800-53 and FISMA requirements',
      planning: 'Plan for FedRAMP or agency-specific requirements',
      design: 'Design to meet federal security standards',
      implementation: 'Use FIPS-validated cryptography',
      testing: 'Conduct security control assessments per NIST guidelines',
      documentation: 'Create System Security Plan (SSP) documentation',
      deployment: 'Follow federal change control procedures',
      monitoring: 'Implement continuous monitoring per NIST guidelines'
    }
  };

  const industryConsiderations = considerations[industry] || considerations.financial_services;
  return industryConsiderations![phase] || 'Apply industry best practices';
}

function getEffortEstimate(orgSize: string, phase: string): string {
  const estimates: Record<string, Record<string, string>> = {
    small: {
      assessment: '1-2 weeks',
      planning: '1 week',
      design: '2-3 weeks',
      implementation: '3-4 weeks',
      testing: '1-2 weeks',
      documentation: '1 week',
      deployment: '1 week',
      monitoring: 'Ongoing (2-4 hours/week)'
    },
    medium: {
      assessment: '2-3 weeks',
      planning: '1-2 weeks',
      design: '3-4 weeks',
      implementation: '4-6 weeks',
      testing: '2-3 weeks',
      documentation: '1-2 weeks',
      deployment: '1-2 weeks',
      monitoring: 'Ongoing (4-8 hours/week)'
    },
    large: {
      assessment: '3-4 weeks',
      planning: '2-3 weeks',
      design: '4-6 weeks',
      implementation: '6-8 weeks',
      testing: '3-4 weeks',
      documentation: '2-3 weeks',
      deployment: '2-3 weeks',
      monitoring: 'Ongoing (dedicated team)'
    },
    enterprise: {
      assessment: '4-6 weeks',
      planning: '3-4 weeks',
      design: '6-8 weeks',
      implementation: '8-12 weeks',
      testing: '4-6 weeks',
      documentation: '3-4 weeks',
      deployment: '3-4 weeks',
      monitoring: 'Ongoing (24x7 SOC)'
    }
  };

  const sizeEstimates = estimates[orgSize] || estimates.medium;
  return sizeEstimates![phase] || '2-4 weeks';
}

function generateExampleConfigurations(subcategory: any, _industry: string): any[] {
  const examples = [];
  const title = subcategory.title.toLowerCase();

  // Add relevant example configurations based on subcategory
  if (title.includes('access') || title.includes('authentication')) {
    examples.push({
      tool_name: 'Active Directory',
      configuration_snippet: `# Group Policy for Access Control
Computer Configuration > Policies > Windows Settings > Security Settings
- Account Policies > Password Policy
  - Minimum password length: 14 characters
  - Password complexity: Enabled
  - Maximum password age: 90 days
- Account Lockout Policy
  - Account lockout threshold: 5 invalid attempts
  - Account lockout duration: 30 minutes`,
      description: 'Configure domain-wide access control policies'
    });
  }

  if (title.includes('logging') || title.includes('monitor')) {
    examples.push({
      tool_name: 'Splunk',
      configuration_snippet: `# inputs.conf
[monitor:///var/log/secure]
disabled = false
index = security
sourcetype = linux_secure

[monitor:///var/log/audit/audit.log]
disabled = false
index = audit
sourcetype = linux_audit`,
      description: 'Configure log collection for security events'
    });
  }

  if (title.includes('encrypt')) {
    examples.push({
      tool_name: 'OpenSSL',
      configuration_snippet: `# Generate encryption keys
openssl genrsa -aes256 -out private_key.pem 4096
openssl rsa -in private_key.pem -pubout -out public_key.pem

# Encrypt data
openssl rsautl -encrypt -pubin -inkey public_key.pem -in data.txt -out data.enc`,
      description: 'Implement data encryption using industry-standard algorithms'
    });
  }

  if (title.includes('backup') || title.includes('recovery')) {
    examples.push({
      tool_name: 'Veeam Backup',
      configuration_snippet: `# Backup Job Configuration
- Schedule: Daily at 2:00 AM
- Retention: 30 days
- Backup Mode: Incremental with weekly full
- Encryption: AES-256
- Compression: Optimal
- Verification: Enable backup file verification
- Application-Aware Processing: Enabled`,
      description: 'Configure automated backup with encryption and verification'
    });
  }

  return examples;
}

function generateSuccessCriteria(subcategory: any): string[] {
  const criteria = [
    'Control is fully implemented and operational',
    'All identified gaps have been addressed',
    'Documentation is complete and approved',
    'Personnel are trained on new procedures',
    'Monitoring and alerting are functional',
    'Compliance requirements are met'
  ];

  const title = subcategory.title.toLowerCase();
  if (title.includes('policy')) {
    criteria.push('Policies are approved and communicated');
    criteria.push('Policy exceptions are documented and approved');
  }
  if (title.includes('risk')) {
    criteria.push('Risk register is updated');
    criteria.push('Risk mitigation measures are in place');
  }
  if (title.includes('incident')) {
    criteria.push('Incident response procedures are tested');
    criteria.push('Response times meet SLA requirements');
  }

  return criteria;
}

function generateMetrics(subcategory: any): any[] {
  const metrics = [];
  const title = subcategory.title.toLowerCase();

  // Add general metrics
  metrics.push({
    metric_name: 'Implementation Coverage',
    measurement_method: 'Percentage of systems/processes covered by control',
    target_value: '100%',
    frequency: 'Monthly'
  });

  metrics.push({
    metric_name: 'Control Effectiveness',
    measurement_method: 'Testing results and audit findings',
    target_value: '>95% pass rate',
    frequency: 'Quarterly'
  });

  // Add specific metrics based on subcategory
  if (title.includes('incident')) {
    metrics.push({
      metric_name: 'Mean Time to Detect (MTTD)',
      measurement_method: 'Average time from incident occurrence to detection',
      target_value: '<1 hour',
      frequency: 'Monthly'
    });
    metrics.push({
      metric_name: 'Mean Time to Respond (MTTR)',
      measurement_method: 'Average time from detection to initial response',
      target_value: '<4 hours',
      frequency: 'Monthly'
    });
  }

  if (title.includes('access')) {
    metrics.push({
      metric_name: 'Unauthorized Access Attempts',
      measurement_method: 'Count of blocked access attempts',
      target_value: 'Trending downward',
      frequency: 'Weekly'
    });
  }

  if (title.includes('training') || title.includes('awareness')) {
    metrics.push({
      metric_name: 'Training Completion Rate',
      measurement_method: 'Percentage of required personnel trained',
      target_value: '100%',
      frequency: 'Quarterly'
    });
  }

  return metrics;
}

function generateIndustryBestPractices(_subcategory: any, industry: string): string[] {
  const practices = [
    'Align implementation with industry frameworks and standards',
    'Leverage industry-specific threat intelligence',
    'Participate in industry information sharing groups',
    'Benchmark against industry peers'
  ];

  if (industry === 'financial_services') {
    practices.push('Implement financial industry security standards (PCI-DSS, SWIFT)');
    practices.push('Use financial-grade encryption and key management');
  } else if (industry === 'healthcare') {
    practices.push('Ensure HIPAA compliance throughout implementation');
    practices.push('Implement medical device security controls');
  } else if (industry === 'government') {
    practices.push('Follow NIST implementation guidelines');
    practices.push('Use FIPS-validated security controls');
  }

  return practices;
}

function generateIndustryChallenges(_subcategory: any, industry: string): string[] {
  const challenges = [
    'Resource constraints and budget limitations',
    'Legacy system integration',
    'Skill gaps and training requirements',
    'Balancing security with operational efficiency'
  ];

  if (industry === 'financial_services') {
    challenges.push('Meeting multiple regulatory requirements simultaneously');
    challenges.push('Managing third-party and vendor risks');
  } else if (industry === 'healthcare') {
    challenges.push('Protecting PHI while enabling care delivery');
    challenges.push('Securing medical devices and IoT');
  } else if (industry === 'manufacturing') {
    challenges.push('Securing OT/IT convergence');
    challenges.push('Managing supply chain risks');
  }

  return challenges;
}

function generateCommonPitfalls(_subcategory: any): string[] {
  return [
    'Underestimating implementation complexity and timeline',
    'Insufficient stakeholder engagement and buy-in',
    'Inadequate testing before production deployment',
    'Lack of ongoing monitoring and maintenance',
    'Poor documentation and knowledge transfer',
    'Failure to integrate with existing processes',
    'Not considering scalability requirements',
    'Ignoring user experience and usability'
  ];
}

function generateReferences(_subcategory: any, industry: string): any[] {
  const references = [
    {
      title: 'NIST Cybersecurity Framework 2.0',
      url: 'https://www.nist.gov/cyberframework',
      description: 'Official NIST CSF documentation and resources'
    },
    {
      title: 'NIST SP 800-53 Security Controls',
      url: 'https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final',
      description: 'Detailed security control catalog'
    }
  ];

  // Add industry-specific references
  if (industry === 'financial_services') {
    references.push({
      title: 'FFIEC Cybersecurity Assessment Tool',
      url: 'https://www.ffiec.gov/cyberassessmenttool.htm',
      description: 'Financial industry cybersecurity assessment'
    });
  } else if (industry === 'healthcare') {
    references.push({
      title: 'HIPAA Security Rule',
      url: 'https://www.hhs.gov/hipaa/for-professionals/security',
      description: 'Healthcare security requirements'
    });
  } else if (industry === 'government') {
    references.push({
      title: 'Federal Information Security Modernization Act (FISMA)',
      url: 'https://www.cisa.gov/federal-information-security-modernization-act',
      description: 'Federal cybersecurity requirements'
    });
  }

  return references;
}

export const getImplementationTemplateTool = {
  name: "get_implementation_template",
  description: "Generate detailed implementation guide for NIST CSF subcategories",
  inputSchema: {
    type: "object",
    properties: {
      subcategory_id: {
        type: "string",
        description: "NIST CSF subcategory ID (e.g., GV.OC-01)"
      },
      industry: {
        type: "string",
        enum: ["financial_services", "healthcare", "manufacturing", "technology", "government", "retail", "energy"],
        description: "Industry sector for specific guidance"
      },
      organization_size: {
        type: "string",
        enum: ["small", "medium", "large", "enterprise"],
        description: "Organization size for resource planning"
      },
      include_examples: {
        type: "boolean",
        description: "Include example configurations",
        default: true
      },
      include_tools: {
        type: "boolean",
        description: "Include recommended tools",
        default: true
      },
      include_metrics: {
        type: "boolean",
        description: "Include success metrics",
        default: true
      }
    },
    required: ["subcategory_id"]
  },
  execute: async (args: ImplementationTemplateOptions, db: CSFDatabase, framework: FrameworkLoader) => {
    return await getImplementationTemplate(db, framework, args);
  }
};