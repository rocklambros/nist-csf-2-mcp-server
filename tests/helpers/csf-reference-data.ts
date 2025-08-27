/**
 * NIST CSF 2.0 Reference Data for Testing
 * Provides sample framework data that matches production schema
 */

export const testFrameworkData = {
  functions: [
    {
      id: 'GV',
      name: 'GOVERN',
      description: 'The organization\'s cybersecurity risk management strategy, expectations, and policy are established, communicated, and monitored',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'ID',
      name: 'IDENTIFY',
      description: 'The organization\'s current cybersecurity risks are understood',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'PR',
      name: 'PROTECT',
      description: 'Safeguards to prevent or limit the impact of potential cybersecurity events are implemented',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'DE',
      name: 'DETECT',
      description: 'Possible cybersecurity attacks and compromises are found and analyzed',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'RS',
      name: 'RESPOND',
      description: 'Actions regarding a detected cybersecurity incident are taken',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'RC',
      name: 'RECOVER',
      description: 'Assets and operations affected by a cybersecurity incident are restored',
      created_at: new Date('2024-01-01').toISOString()
    }
  ],

  categories: [
    {
      id: 'GV.OC',
      function_id: 'GV',
      name: 'Organizational Context',
      description: 'The circumstances surrounding the organization\'s cybersecurity risk management decisions are understood',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'GV.RM',
      function_id: 'GV',
      name: 'Risk Management Strategy',
      description: 'The organization\'s priorities, constraints, risk tolerance and appetite statements are established',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'ID.AM',
      function_id: 'ID',
      name: 'Asset Management',
      description: 'Assets are inventoried, classified, managed, and maintained',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'PR.AC',
      function_id: 'PR',
      name: 'Identity Management, Authentication and Access Control',
      description: 'Access to physical and logical assets is limited to authorized users, processes, and devices',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'DE.AE',
      function_id: 'DE',
      name: 'Anomalies and Events',
      description: 'Anomalous activity and potential cybersecurity events are detected and analyzed',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'RS.RP',
      function_id: 'RS',
      name: 'Response Planning',
      description: 'Response processes and procedures are executed and maintained',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'RC.RP',
      function_id: 'RC',
      name: 'Recovery Planning',
      description: 'Recovery processes and procedures are executed and maintained',
      created_at: new Date('2024-01-01').toISOString()
    }
  ],

  subcategories: [
    {
      id: 'GV.OC-01',
      category_id: 'GV.OC',
      name: 'Organizational Mission',
      description: 'The organizational mission is understood and informs cybersecurity risk management',
      outcome_examples: 'Mission statement drives security priorities',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'GV.OC-02',
      category_id: 'GV.OC',
      name: 'Stakeholder Expectations',
      description: 'Internal and external stakeholders are understood, and their cybersecurity expectations are considered',
      outcome_examples: 'Stakeholder security requirements are documented',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'GV.RM-01',
      category_id: 'GV.RM',
      name: 'Risk Management Objectives',
      description: 'Risk management objectives are established and agreed to by organizational stakeholders',
      outcome_examples: 'Clear risk management goals and metrics',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'ID.AM-01',
      category_id: 'ID.AM',
      name: 'Physical Devices and Systems',
      description: 'Physical devices and systems within the organization are inventoried',
      outcome_examples: 'Complete hardware inventory maintained',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'PR.AC-01',
      category_id: 'PR.AC',
      name: 'Identity and Credential Management',
      description: 'Identities and credentials are issued, managed, verified, revoked, and audited',
      outcome_examples: 'Identity lifecycle management processes',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'DE.AE-01',
      category_id: 'DE.AE',
      name: 'Baseline Network Operations',
      description: 'A baseline of network operations and expected data flows is established and managed',
      outcome_examples: 'Network baseline with anomaly detection',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'RS.RP-01',
      category_id: 'RS.RP',
      name: 'Response Plan Execution',
      description: 'Response plan is executed during or after an incident',
      outcome_examples: 'Documented incident response procedures',
      created_at: new Date('2024-01-01').toISOString()
    },
    {
      id: 'RC.RP-01',
      category_id: 'RC.RP',
      name: 'Recovery Plan Execution',
      description: 'Recovery plan is executed during or after a cybersecurity incident',
      outcome_examples: 'Business continuity and disaster recovery plans',
      created_at: new Date('2024-01-01').toISOString()
    }
  ]
};

export const testImplementationExamples = [
  {
    id: 'GV.OC-01.001',
    subcategory_id: 'GV.OC-01',
    title: 'Mission Alignment',
    description: 'Share the organization\'s mission to provide a basis for identifying risks that may impede that mission',
    example_type: 'process',
    organization_size: 'All',
    created_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'ID.AM-01.001',
    subcategory_id: 'ID.AM-01',
    title: 'Hardware Inventory',
    description: 'Maintain an inventory of physical devices and systems connected to the network',
    example_type: 'technical',
    organization_size: 'All',
    created_at: new Date('2024-01-01').toISOString()
  }
];