/**
 * Type definitions for the comprehensive question bank system
 */

export interface AssessmentQuestion {
  subcategory_id: string;
  question_text: string;
  question_type: 'maturity_rating' | 'implementation_status' | 'yes_no' | 'multiple_choice';
  options: QuestionOption[];
  help_text?: string;
  examples?: string[];
  references?: string[];
  category: string;
  function: string;
  weight?: number;
  required?: boolean;
  conditional_logic?: ConditionalLogic;
}

export interface QuestionOption {
  value: number | string;
  label: string;
  description?: string;
  weight?: number;
}

export interface ConditionalLogic {
  show_if?: {
    question_id: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  };
  hide_if?: {
    question_id: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  };
}

export interface GetAssessmentQuestionsParams {
  function?: 'GV' | 'ID' | 'PR' | 'DE' | 'RS' | 'RC';
  category?: string;
  subcategory_ids?: string[];
  assessment_type?: 'detailed' | 'quick' | 'custom';
  organization_size?: 'small' | 'medium' | 'large' | 'enterprise';
  include_conditional?: boolean;
  include_examples?: boolean;
  include_references?: boolean;
  language?: string;
}

export interface QuestionResponse {
  subcategory_id: string;
  response_value: number | string;
  confidence_level?: 'low' | 'medium' | 'high';
  evidence?: string;
  notes?: string;
  assessed_by?: string;
  assessment_date?: string;
}

export interface ValidateAssessmentResponsesParams {
  profile_id: string;
  responses: QuestionResponse[];
  assessment_type?: 'detailed' | 'quick' | 'custom';
  require_all_questions?: boolean;
}

export interface ValidationResult {
  is_valid: boolean;
  missing_required?: string[];
  invalid_responses?: {
    subcategory_id: string;
    issue: string;
    expected: any;
    received: any;
  }[];
  completeness_percentage?: number;
  warnings?: string[];
}

export interface GetQuestionContextParams {
  subcategory_id: string;
  include_implementation_examples?: boolean;
  include_references?: boolean;
  organization_context?: {
    sector: string;
    size: string;
  };
}

export interface QuestionContext {
  subcategory_id: string;
  subcategory_text: string;
  category_text: string;
  function_text: string;
  implementation_examples?: string[];
  references?: string[];
  related_subcategories?: string[];
  risk_factors?: string[];
  common_challenges?: string[];
  best_practices?: string[];
  sector_specific_guidance?: string[];
}

export type AssessmentType = 'detailed' | 'quick' | 'custom';
export type OrganizationSize = 'small' | 'medium' | 'large' | 'enterprise';
export type CSFFunction = 'GV' | 'ID' | 'PR' | 'DE' | 'RS' | 'RC';