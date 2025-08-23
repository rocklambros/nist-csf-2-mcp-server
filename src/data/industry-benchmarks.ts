/**
 * Industry Benchmark Data
 * Sample benchmark data for various industries and organization sizes
 * Based on typical maturity scores observed in industry assessments
 */

export interface BenchmarkData {
  industry: string;
  organization_size: string;
  csf_function: string;
  metric_name: string;
  percentile_25: number;
  percentile_50: number;
  percentile_75: number;
  percentile_90: number;
  average_score: number;
  sample_size: number;
  data_year: number;
  source: string;
}

// Financial Services Benchmarks
export const FINANCIAL_BENCHMARKS: BenchmarkData[] = [
  // Large Financial Institutions
  {
    industry: 'Financial Services',
    organization_size: 'large',
    csf_function: 'GV',
    metric_name: 'maturity_score',
    percentile_25: 2.8,
    percentile_50: 3.5,
    percentile_75: 4.2,
    percentile_90: 4.6,
    average_score: 3.6,
    sample_size: 150,
    data_year: 2024,
    source: 'Industry Survey 2024'
  },
  {
    industry: 'Financial Services',
    organization_size: 'large',
    csf_function: 'ID',
    metric_name: 'maturity_score',
    percentile_25: 3.0,
    percentile_50: 3.8,
    percentile_75: 4.3,
    percentile_90: 4.7,
    average_score: 3.8,
    sample_size: 150,
    data_year: 2024,
    source: 'Industry Survey 2024'
  },
  {
    industry: 'Financial Services',
    organization_size: 'large',
    csf_function: 'PR',
    metric_name: 'maturity_score',
    percentile_25: 3.2,
    percentile_50: 3.9,
    percentile_75: 4.4,
    percentile_90: 4.8,
    average_score: 3.9,
    sample_size: 150,
    data_year: 2024,
    source: 'Industry Survey 2024'
  },
  {
    industry: 'Financial Services',
    organization_size: 'large',
    csf_function: 'DE',
    metric_name: 'maturity_score',
    percentile_25: 2.9,
    percentile_50: 3.6,
    percentile_75: 4.2,
    percentile_90: 4.6,
    average_score: 3.7,
    sample_size: 150,
    data_year: 2024,
    source: 'Industry Survey 2024'
  },
  {
    industry: 'Financial Services',
    organization_size: 'large',
    csf_function: 'RS',
    metric_name: 'maturity_score',
    percentile_25: 3.0,
    percentile_50: 3.7,
    percentile_75: 4.3,
    percentile_90: 4.7,
    average_score: 3.8,
    sample_size: 150,
    data_year: 2024,
    source: 'Industry Survey 2024'
  },
  {
    industry: 'Financial Services',
    organization_size: 'large',
    csf_function: 'RC',
    metric_name: 'maturity_score',
    percentile_25: 2.7,
    percentile_50: 3.4,
    percentile_75: 4.1,
    percentile_90: 4.5,
    average_score: 3.5,
    sample_size: 150,
    data_year: 2024,
    source: 'Industry Survey 2024'
  },
  // Medium Financial Organizations
  {
    industry: 'Financial Services',
    organization_size: 'medium',
    csf_function: 'GV',
    metric_name: 'maturity_score',
    percentile_25: 2.2,
    percentile_50: 2.9,
    percentile_75: 3.5,
    percentile_90: 4.0,
    average_score: 3.0,
    sample_size: 200,
    data_year: 2024,
    source: 'Industry Survey 2024'
  },
  {
    industry: 'Financial Services',
    organization_size: 'medium',
    csf_function: 'ID',
    metric_name: 'maturity_score',
    percentile_25: 2.4,
    percentile_50: 3.1,
    percentile_75: 3.7,
    percentile_90: 4.2,
    average_score: 3.2,
    sample_size: 200,
    data_year: 2024,
    source: 'Industry Survey 2024'
  }
];

// Healthcare Benchmarks
export const HEALTHCARE_BENCHMARKS: BenchmarkData[] = [
  // Large Healthcare Organizations
  {
    industry: 'Healthcare',
    organization_size: 'large',
    csf_function: 'GV',
    metric_name: 'maturity_score',
    percentile_25: 2.5,
    percentile_50: 3.2,
    percentile_75: 3.9,
    percentile_90: 4.4,
    average_score: 3.3,
    sample_size: 120,
    data_year: 2024,
    source: 'Healthcare Security Study 2024'
  },
  {
    industry: 'Healthcare',
    organization_size: 'large',
    csf_function: 'ID',
    metric_name: 'maturity_score',
    percentile_25: 2.7,
    percentile_50: 3.4,
    percentile_75: 4.0,
    percentile_90: 4.5,
    average_score: 3.5,
    sample_size: 120,
    data_year: 2024,
    source: 'Healthcare Security Study 2024'
  },
  {
    industry: 'Healthcare',
    organization_size: 'large',
    csf_function: 'PR',
    metric_name: 'maturity_score',
    percentile_25: 2.8,
    percentile_50: 3.5,
    percentile_75: 4.1,
    percentile_90: 4.5,
    average_score: 3.6,
    sample_size: 120,
    data_year: 2024,
    source: 'Healthcare Security Study 2024'
  },
  // Small Healthcare Organizations
  {
    industry: 'Healthcare',
    organization_size: 'small',
    csf_function: 'GV',
    metric_name: 'maturity_score',
    percentile_25: 1.8,
    percentile_50: 2.4,
    percentile_75: 3.0,
    percentile_90: 3.5,
    average_score: 2.5,
    sample_size: 300,
    data_year: 2024,
    source: 'Healthcare Security Study 2024'
  }
];

// Manufacturing Benchmarks
export const MANUFACTURING_BENCHMARKS: BenchmarkData[] = [
  // Large Manufacturing
  {
    industry: 'Manufacturing',
    organization_size: 'large',
    csf_function: 'GV',
    metric_name: 'maturity_score',
    percentile_25: 2.3,
    percentile_50: 3.0,
    percentile_75: 3.7,
    percentile_90: 4.2,
    average_score: 3.1,
    sample_size: 100,
    data_year: 2024,
    source: 'Manufacturing Cybersecurity Report 2024'
  },
  {
    industry: 'Manufacturing',
    organization_size: 'large',
    csf_function: 'ID',
    metric_name: 'maturity_score',
    percentile_25: 2.5,
    percentile_50: 3.2,
    percentile_75: 3.8,
    percentile_90: 4.3,
    average_score: 3.3,
    sample_size: 100,
    data_year: 2024,
    source: 'Manufacturing Cybersecurity Report 2024'
  },
  {
    industry: 'Manufacturing',
    organization_size: 'large',
    csf_function: 'PR',
    metric_name: 'maturity_score',
    percentile_25: 2.4,
    percentile_50: 3.1,
    percentile_75: 3.7,
    percentile_90: 4.2,
    average_score: 3.2,
    sample_size: 100,
    data_year: 2024,
    source: 'Manufacturing Cybersecurity Report 2024'
  }
];

// Retail Benchmarks
export const RETAIL_BENCHMARKS: BenchmarkData[] = [
  // Large Retail
  {
    industry: 'Retail',
    organization_size: 'large',
    csf_function: 'GV',
    metric_name: 'maturity_score',
    percentile_25: 2.4,
    percentile_50: 3.1,
    percentile_75: 3.8,
    percentile_90: 4.3,
    average_score: 3.2,
    sample_size: 80,
    data_year: 2024,
    source: 'Retail Security Benchmark 2024'
  },
  {
    industry: 'Retail',
    organization_size: 'large',
    csf_function: 'PR',
    metric_name: 'maturity_score',
    percentile_25: 2.6,
    percentile_50: 3.3,
    percentile_75: 3.9,
    percentile_90: 4.4,
    average_score: 3.4,
    sample_size: 80,
    data_year: 2024,
    source: 'Retail Security Benchmark 2024'
  },
  // Medium Retail
  {
    industry: 'Retail',
    organization_size: 'medium',
    csf_function: 'GV',
    metric_name: 'maturity_score',
    percentile_25: 2.0,
    percentile_50: 2.6,
    percentile_75: 3.2,
    percentile_90: 3.7,
    average_score: 2.7,
    sample_size: 150,
    data_year: 2024,
    source: 'Retail Security Benchmark 2024'
  }
];

// Technology Benchmarks
export const TECHNOLOGY_BENCHMARKS: BenchmarkData[] = [
  // Large Technology Companies
  {
    industry: 'Technology',
    organization_size: 'large',
    csf_function: 'GV',
    metric_name: 'maturity_score',
    percentile_25: 3.2,
    percentile_50: 3.9,
    percentile_75: 4.4,
    percentile_90: 4.8,
    average_score: 4.0,
    sample_size: 100,
    data_year: 2024,
    source: 'Tech Industry Security Report 2024'
  },
  {
    industry: 'Technology',
    organization_size: 'large',
    csf_function: 'ID',
    metric_name: 'maturity_score',
    percentile_25: 3.4,
    percentile_50: 4.0,
    percentile_75: 4.5,
    percentile_90: 4.8,
    average_score: 4.1,
    sample_size: 100,
    data_year: 2024,
    source: 'Tech Industry Security Report 2024'
  },
  {
    industry: 'Technology',
    organization_size: 'large',
    csf_function: 'PR',
    metric_name: 'maturity_score',
    percentile_25: 3.5,
    percentile_50: 4.1,
    percentile_75: 4.6,
    percentile_90: 4.9,
    average_score: 4.2,
    sample_size: 100,
    data_year: 2024,
    source: 'Tech Industry Security Report 2024'
  },
  {
    industry: 'Technology',
    organization_size: 'large',
    csf_function: 'DE',
    metric_name: 'maturity_score',
    percentile_25: 3.3,
    percentile_50: 4.0,
    percentile_75: 4.5,
    percentile_90: 4.8,
    average_score: 4.0,
    sample_size: 100,
    data_year: 2024,
    source: 'Tech Industry Security Report 2024'
  },
  {
    industry: 'Technology',
    organization_size: 'large',
    csf_function: 'RS',
    metric_name: 'maturity_score',
    percentile_25: 3.4,
    percentile_50: 4.0,
    percentile_75: 4.5,
    percentile_90: 4.8,
    average_score: 4.1,
    sample_size: 100,
    data_year: 2024,
    source: 'Tech Industry Security Report 2024'
  },
  {
    industry: 'Technology',
    organization_size: 'large',
    csf_function: 'RC',
    metric_name: 'maturity_score',
    percentile_25: 3.1,
    percentile_50: 3.8,
    percentile_75: 4.3,
    percentile_90: 4.7,
    average_score: 3.9,
    sample_size: 100,
    data_year: 2024,
    source: 'Tech Industry Security Report 2024'
  },
  // Small Technology Companies
  {
    industry: 'Technology',
    organization_size: 'small',
    csf_function: 'GV',
    metric_name: 'maturity_score',
    percentile_25: 2.0,
    percentile_50: 2.7,
    percentile_75: 3.3,
    percentile_90: 3.8,
    average_score: 2.8,
    sample_size: 500,
    data_year: 2024,
    source: 'Tech Industry Security Report 2024'
  }
];

// Government Benchmarks
export const GOVERNMENT_BENCHMARKS: BenchmarkData[] = [
  // Federal Government
  {
    industry: 'Government',
    organization_size: 'large',
    csf_function: 'GV',
    metric_name: 'maturity_score',
    percentile_25: 2.8,
    percentile_50: 3.5,
    percentile_75: 4.1,
    percentile_90: 4.5,
    average_score: 3.6,
    sample_size: 50,
    data_year: 2024,
    source: 'Federal Cybersecurity Assessment 2024'
  },
  {
    industry: 'Government',
    organization_size: 'large',
    csf_function: 'ID',
    metric_name: 'maturity_score',
    percentile_25: 3.0,
    percentile_50: 3.7,
    percentile_75: 4.2,
    percentile_90: 4.6,
    average_score: 3.7,
    sample_size: 50,
    data_year: 2024,
    source: 'Federal Cybersecurity Assessment 2024'
  }
];

// Energy/Utilities Benchmarks
export const ENERGY_BENCHMARKS: BenchmarkData[] = [
  // Large Energy Companies
  {
    industry: 'Energy',
    organization_size: 'large',
    csf_function: 'GV',
    metric_name: 'maturity_score',
    percentile_25: 2.7,
    percentile_50: 3.4,
    percentile_75: 4.0,
    percentile_90: 4.5,
    average_score: 3.5,
    sample_size: 60,
    data_year: 2024,
    source: 'Energy Sector Security Study 2024'
  },
  {
    industry: 'Energy',
    organization_size: 'large',
    csf_function: 'ID',
    metric_name: 'maturity_score',
    percentile_25: 2.9,
    percentile_50: 3.6,
    percentile_75: 4.2,
    percentile_90: 4.6,
    average_score: 3.7,
    sample_size: 60,
    data_year: 2024,
    source: 'Energy Sector Security Study 2024'
  },
  {
    industry: 'Energy',
    organization_size: 'large',
    csf_function: 'PR',
    metric_name: 'maturity_score',
    percentile_25: 3.0,
    percentile_50: 3.7,
    percentile_75: 4.2,
    percentile_90: 4.6,
    average_score: 3.8,
    sample_size: 60,
    data_year: 2024,
    source: 'Energy Sector Security Study 2024'
  }
];

// Aggregate all benchmarks
export const ALL_BENCHMARKS: BenchmarkData[] = [
  ...FINANCIAL_BENCHMARKS,
  ...HEALTHCARE_BENCHMARKS,
  ...MANUFACTURING_BENCHMARKS,
  ...RETAIL_BENCHMARKS,
  ...TECHNOLOGY_BENCHMARKS,
  ...GOVERNMENT_BENCHMARKS,
  ...ENERGY_BENCHMARKS
];

// Industry metadata
export const INDUSTRY_METADATA = {
  'Financial Services': {
    description: 'Banks, credit unions, insurance, investment firms',
    typical_frameworks: ['SOC_2', 'ISO_27001', 'NIST_800-53'],
    critical_functions: ['PR', 'DE', 'RS']
  },
  'Healthcare': {
    description: 'Hospitals, clinics, health systems, medical devices',
    typical_frameworks: ['HIPAA', 'ISO_27001', 'NIST_800-53'],
    critical_functions: ['PR', 'ID', 'RS']
  },
  'Manufacturing': {
    description: 'Industrial manufacturing, OT/IT convergence',
    typical_frameworks: ['IEC_62443', 'ISO_27001', 'NIST_800-53'],
    critical_functions: ['ID', 'PR', 'DE']
  },
  'Retail': {
    description: 'E-commerce, brick-and-mortar, payment processing',
    typical_frameworks: ['PCI-DSS', 'ISO_27001', 'SOC_2'],
    critical_functions: ['PR', 'DE', 'RS']
  },
  'Technology': {
    description: 'Software, SaaS, cloud services, IT services',
    typical_frameworks: ['SOC_2', 'ISO_27001', 'NIST_800-53'],
    critical_functions: ['PR', 'ID', 'DE']
  },
  'Government': {
    description: 'Federal, state, local government agencies',
    typical_frameworks: ['NIST_800-53', 'NIST_800-171', 'ISO_27001'],
    critical_functions: ['GV', 'ID', 'PR']
  },
  'Energy': {
    description: 'Electric utilities, oil & gas, renewable energy',
    typical_frameworks: ['NERC_CIP', 'IEC_62443', 'NIST_800-53'],
    critical_functions: ['ID', 'PR', 'DE']
  }
};