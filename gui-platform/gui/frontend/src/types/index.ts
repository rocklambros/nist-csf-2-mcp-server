/**
 * Type definitions for NIST CSF Assessment GUI Frontend
 * 
 * QUALITY STANDARDS ENFORCED:
 * - All exports must be used (zero unused variable tolerance)
 * - TypeScript strict mode compatibility
 * - Comprehensive type safety
 */

// Organization and profile types
export interface OrganizationProfile {
  org_id: string;
  org_name: string;
  sector: string;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  industry: string;
  current_tier?: string;
  target_tier?: string;
  created_at: string;
}

export interface AssessmentProfile {
  profile_id: string;
  org_id: string;
  profile_name: string;
  profile_type: 'baseline' | 'target' | 'current' | 'custom';
  description?: string;
  created_by?: string;
  created_at: string;
  organization?: OrganizationProfile;
}

// Assessment workflow types
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
  can_resume: boolean;
}

// Question and response types
export interface AssessmentQuestion {
  question_id: string;
  subcategory_id: string;
  question_text: string;
  question_type: 'maturity_rating' | 'implementation_status';
  help_text?: string;
  options?: QuestionOption[];
  required: boolean;
  weight: number;
}

export interface QuestionOption {
  value: string | number;
  label: string;
  description?: string;
}

export interface QuestionResponse {
  question_id: string;
  subcategory_id: string;
  response_value: string | number;
  confidence_level: 'low' | 'medium' | 'high';
  notes?: string;
  time_spent_seconds?: number;
}

// Dashboard and visualization types
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

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'subscribe_assessment' | 'progress_update' | 'dashboard_update' | 'ping';
  profile_id?: string;
  workflow_id?: string;
  data?: any;
  timestamp: string;
}

// Connection status types
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// NIST CSF Framework types
export interface NISTFunction {
  id: 'GV' | 'ID' | 'PR' | 'DE' | 'RS' | 'RC';
  name: string;
  description: string;
  color: string;
  icon: string;
  subcategories: NISTSubcategory[];
}

export interface NISTSubcategory {
  id: string;
  function_id: string;
  name: string;
  description: string;
  questions_count: number;
  completion_status: 'not_started' | 'in_progress' | 'completed';
  maturity_score?: number;
  implementation_score?: number;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Assessment session types
export interface AssessmentSession {
  session_id: string;
  profile_id: string;
  workflow_id: string;
  started_at: string;
  last_activity: string;
  current_question_index: number;
  is_active: boolean;
}