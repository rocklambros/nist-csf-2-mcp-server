/**
 * Type definitions for NIST CSF GUI Backend
 * 
 * QUALITY STANDARDS ENFORCED:
 * - All exports must be used (zero unused variable tolerance)
 * - TypeScript strict mode compatibility
 * - Comprehensive type safety
 */

// Organization profile types
export interface OrganizationProfile {
  org_id: string;
  org_name: string;
  sector: string;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  current_tier?: string;
  target_tier?: string;
  created_at: string;
}

// Assessment profile types  
export interface AssessmentProfile {
  profile_id: string;
  org_id: string;
  profile_name: string;
  profile_type: 'baseline' | 'target' | 'current' | 'custom';
  description?: string;
  created_by?: string;
  created_at: string;
}

// Assessment question types
export interface AssessmentQuestion {
  id: string;
  subcategory_id: string;
  question_text: string;
  question_type: 'maturity_rating' | 'implementation_status';
  help_text?: string;
  options: QuestionOption[];
  required: boolean;
  weight: number;
}

export interface QuestionOption {
  value: string | number;
  label: string;
  description?: string;
}

// Assessment response types
export interface AssessmentResponse {
  question_id: string;
  subcategory_id: string;
  response_value: string | number;
  confidence_level: 'low' | 'medium' | 'high';
  notes?: string;
  answered_at: string;
}

// Progress tracking types
export interface AssessmentProgress {
  profile_id: string;
  workflow_id: string;
  total_questions: number;
  questions_answered: number;
  completion_percentage: number;
  current_function: string;
  current_subcategory: string;
  last_activity: string;
  estimated_completion_minutes: number;
}

// Dashboard data types
export interface DashboardData {
  profile_id: string;
  organization: OrganizationProfile;
  overall_scores: {
    risk_score: number;
    maturity_score: number;
    implementation_score: number;
    effectiveness_score: number;
  };
  function_scores: FunctionScore[];
  benchmarks: BenchmarkData;
  risk_heat_map: RiskHeatMapData[];
  recommendations: Recommendation[];
  updated_at: string;
}

export interface FunctionScore {
  function_id: 'GV' | 'ID' | 'PR' | 'DE' | 'RS' | 'RC';
  function_name: string;
  maturity_score: number;
  implementation_score: number;
  subcategories_completed: number;
  subcategories_total: number;
  completion_percentage: number;
}

export interface BenchmarkData {
  industry: string;
  organization_size: string;
  industry_average: Record<string, number>;
  percentile_ranking: Record<string, number>;
  peer_comparison: 'above_average' | 'average' | 'below_average';
}

export interface RiskHeatMapData {
  subcategory_id: string;
  subcategory_name: string;
  function_id: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  implementation_gap: number;
  priority: number;
}

export interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  subcategory_id: string;
  estimated_effort_hours: number;
  estimated_cost: number;
  impact_score: number;
  quick_win: boolean;
}

// API response wrappers
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

// MCP communication types
export interface MCPRequest {
  method: string;
  params: Record<string, any>;
  id: string;
}

export interface MCPResponse {
  success: boolean;
  data: any;
  error?: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'progress_update' | 'dashboard_update' | 'error' | 'ping';
  profile_id: string;
  data: any;
  timestamp: string;
}

// Session management types
export interface AssessmentSession {
  session_id: string;
  profile_id: string;
  workflow_id: string;
  current_question_index: number;
  questions_answered: number;
  started_at: string;
  last_activity: string;
  is_active: boolean;
}