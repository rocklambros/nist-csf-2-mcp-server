/**
 * Mock data generators for testing
 */

import { v4 as uuidv4 } from 'uuid';

// CSF Framework mock data
export const mockFunction = {
  id: 'GV',
  name: 'GOVERN',
  description: 'Establish and monitor cybersecurity governance'
};

export const mockCategory = {
  id: 'GV.OC',
  function_id: 'GV',
  name: 'Organizational Context',
  description: 'The organization\'s context is understood'
};

export const mockSubcategory = {
  id: 'GV.OC-01',
  category_id: 'GV.OC',
  name: 'Organizational mission understood',
  description: 'The organizational mission is understood and informs cybersecurity risk management'
};

export const mockImplementationExample = {
  id: uuidv4(),
  subcategory_id: 'GV.OC-01',
  example: 'Document organizational mission and objectives',
  industry: 'All',
  organization_size: 'All'
};

// Organization mock data
export const mockOrganization = {
  org_id: `test-org-${uuidv4()}`,
  org_name: 'Test Organization',
  industry: 'Technology',
  size: 'medium',
  current_tier: 'Tier1',
  target_tier: 'Tier3',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Profile mock data
export const mockProfile = {
  profile_id: `test-profile-${uuidv4()}`,
  org_id: mockOrganization.org_id,
  profile_name: 'Test Security Profile',
  profile_type: 'current',
  description: 'Test profile for unit testing',
  created_by: 'test-user',
  created_at: new Date().toISOString(),
  is_active: true
};

// Assessment mock data
export const mockAssessment = {
  assessment_id: uuidv4(),
  profile_id: mockProfile.profile_id,
  subcategory_id: 'GV.OC-01',
  implementation_level: 'partially_implemented',
  maturity_score: 2,
  confidence_level: 'medium',
  notes: 'Test assessment notes',
  assessed_by: 'test-assessor',
  assessed_at: new Date().toISOString()
};

// Implementation mock data
export const mockImplementation = {
  org_id: mockOrganization.org_id,
  subcategory_id: 'GV.OC-01',
  implementation_status: 'partially_implemented',
  maturity_level: 2,
  notes: 'Implementation in progress',
  assessed_by: 'test-user',
  last_assessed: new Date().toISOString()
};

// Risk assessment mock data
export const mockRiskAssessment = {
  org_id: mockOrganization.org_id,
  element_id: 'GV.OC-01',
  risk_level: 'Medium',
  likelihood: 3,
  impact: 3,
  risk_score: 0.6,
  mitigation_status: 'In Progress',
  mitigation_plan: 'Implement controls',
  assessment_date: new Date()
};

// Gap analysis mock data
export const mockGapAnalysis = {
  org_id: mockOrganization.org_id,
  category_id: 'GV.OC',
  current_score: 2,
  target_score: 4,
  gap_score: 2,
  priority: 'High',
  estimated_effort: '3 months',
  analysis_date: new Date()
};

// Progress tracking mock data
export const mockProgress = {
  id: uuidv4(),
  profile_id: mockProfile.profile_id,
  subcategory_id: 'GV.OC-01',
  target_implementation: 'fully_implemented',
  target_maturity: 4,
  current_implementation: 'partially_implemented',
  current_maturity: 2,
  completion_percentage: 50,
  status: 'on_track',
  last_updated: new Date().toISOString()
};

// Milestone mock data
export const mockMilestone = {
  milestone_id: uuidv4(),
  profile_id: mockProfile.profile_id,
  milestone_name: 'Q1 Security Goals',
  description: 'Complete governance framework',
  target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'in_progress',
  completion_percentage: 35,
  created_date: new Date().toISOString()
};

// Evidence mock data
export const mockEvidence = {
  evidence_id: uuidv4(),
  profile_id: mockProfile.profile_id,
  subcategory_id: 'GV.OC-01',
  file_name: 'security-policy.pdf',
  file_path: '/evidence/security-policy.pdf',
  file_hash: 'abc123def456789',
  evidence_type: 'document',
  description: 'Security policy documentation',
  uploaded_by: 'test-user',
  upload_date: new Date().toISOString(),
  is_valid: true
};

// Compliance mapping mock data
export const mockComplianceMapping = {
  mapping_id: uuidv4(),
  profile_id: mockProfile.profile_id,
  csf_subcategory_id: 'GV.OC-01',
  framework: 'ISO_27001',
  control_id: 'A.5.1.1',
  control_description: 'Information security policy',
  mapping_strength: 'strong',
  notes: 'Direct mapping',
  created_date: new Date().toISOString()
};

// Test data generators
export function generateMockProfiles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    ...mockProfile,
    profile_id: `test-profile-${i}`,
    profile_name: `Test Profile ${i}`,
    profile_type: ['current', 'target', 'baseline'][i % 3],
    created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
  }));
}

export function generateMockAssessments(count: number, profileId?: string) {
  const levels = ['not_implemented', 'partially_implemented', 'largely_implemented', 'fully_implemented'];
  const confidenceLevels = ['low', 'medium', 'high'];
  
  // Generate a larger pool of subcategories to avoid UNIQUE constraint conflicts
  const baseSubcategories = ['GV.OC', 'GV.RM', 'GV.SC', 'GV.PO', 'ID.AM', 'ID.RA', 'ID.IM', 'ID.BE', 'ID.GV', 'PR.AC', 'PR.AT', 'PR.DS', 'PR.IP', 'PR.MA', 'PR.PT', 'DE.AE', 'DE.CM', 'DE.DP', 'RS.RP', 'RS.CO', 'RS.AN', 'RS.MI', 'RS.IM', 'RC.RP', 'RC.IM', 'RC.CO'];
  const subcategories = [];
  for (const base of baseSubcategories) {
    for (let i = 1; i <= 200; i++) {
      subcategories.push(`${base}-${i.toString().padStart(3, '0')}`);
    }
  }
  
  return Array.from({ length: count }, (_, i) => ({
    profile_id: profileId || mockProfile.profile_id,
    subcategory_id: subcategories[i % subcategories.length],
    implementation_level: levels[i % levels.length],
    maturity_score: (i % 5) + 1,
    confidence_level: confidenceLevels[i % confidenceLevels.length],
    notes: `Assessment notes ${i}`,
    assessed_by: `assessor-${i % 3}`,
    assessed_at: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString()
  }));
}

export function generateMockProgress(count: number, profileId?: string) {
  const statuses = ['on_track', 'at_risk', 'behind', 'blocked', 'completed'];
  const implementations = ['not_implemented', 'partially_implemented', 'largely_implemented'];
  
  // Use same expanded subcategory pool as assessments
  const baseSubcategories = ['GV.OC', 'GV.RM', 'GV.SC', 'GV.PO', 'ID.AM', 'ID.RA', 'ID.IM', 'ID.BE', 'ID.GV', 'PR.AC', 'PR.AT', 'PR.DS', 'PR.IP', 'PR.MA', 'PR.PT', 'DE.AE', 'DE.CM', 'DE.DP', 'RS.RP', 'RS.CO', 'RS.AN', 'RS.MI', 'RS.IM', 'RC.RP', 'RC.IM', 'RC.CO'];
  const subcategories = [];
  for (const base of baseSubcategories) {
    for (let i = 1; i <= 200; i++) {
      subcategories.push(`${base}-${i.toString().padStart(3, '0')}`);
    }
  }
  
  return Array.from({ length: count }, (_, i) => ({
    id: uuidv4(),
    profile_id: profileId || mockProfile.profile_id,
    subcategory_id: subcategories[i % subcategories.length],
    target_implementation: 'fully_implemented',
    target_maturity: 4,
    current_implementation: implementations[i % implementations.length],
    current_maturity: (i % 3) + 1,
    completion_percentage: Math.min(100, (i + 1) * 20),
    status: statuses[i % statuses.length],
    last_updated: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
  }));
}

export function generateMockEvidence(count: number) {
  const types = ['screenshot', 'document', 'log', 'report', 'config'];
  const extensions = ['.png', '.pdf', '.txt', '.html', '.json'];
  
  return Array.from({ length: count }, (_, i) => ({
    evidence_id: uuidv4(),
    profile_id: mockProfile.profile_id,
    subcategory_id: `GV.OC-0${(i % 5) + 1}`,
    file_name: `evidence-${i}${extensions[i % extensions.length]}`,
    file_path: `/evidence/evidence-${i}${extensions[i % extensions.length]}`,
    file_hash: Buffer.from(`hash-${i}`).toString('base64'),
    evidence_type: types[i % types.length],
    description: `Evidence description ${i}`,
    uploaded_by: `user-${i % 3}`,
    upload_date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    is_valid: i % 5 !== 0 // Make every 5th evidence invalid for testing
  }));
}

// Batch data for performance testing
export function generateLargeBatchData() {
  const profiles = generateMockProfiles(100);
  
  // Generate assessments that properly reference the profile IDs
  const assessments = [];
  profiles.forEach((profile, i) => {
    const profileAssessments = generateMockAssessments(5, profile.profile_id);
    assessments.push(...profileAssessments);
  });
  
  return {
    profiles: profiles,
    assessments: assessments,
    progress: generateMockProgress(200, profiles[0].profile_id),
    evidence: generateMockEvidence(150)
  };
}

// Invalid data for error testing
export const invalidInputs = {
  emptyString: '',
  nullValue: null,
  undefinedValue: undefined,
  invalidId: 'invalid-id-format',
  sqlInjection: "'; DROP TABLE users; --",
  xssAttempt: '<script>alert("XSS")</script>',
  pathTraversal: '../../../etc/passwd',
  oversizedString: 'x'.repeat(10000),
  negativeNumber: -1,
  invalidEnum: 'INVALID_VALUE',
  futureDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  malformedJSON: '{"invalid": json}',
  specialCharacters: '!@#$%^&*()_+=-`~[]{}|\\:";\'<>?,./'
};