/**
 * TypeScript type definitions for NIST CSF 2.0 Framework
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum CSFFunction {
  GOVERN = 'GV',
  IDENTIFY = 'ID',
  PROTECT = 'PR',
  DETECT = 'DE',
  RESPOND = 'RS',
  RECOVER = 'RC'
}

export enum ElementType {
  FUNCTION = 'function',
  CATEGORY = 'category',
  SUBCATEGORY = 'subcategory',
  IMPLEMENTATION_EXAMPLE = 'implementation_example',
  PARTY = 'party',
  WITHDRAW_REASON = 'withdraw_reason'
}

export enum PartyType {
  FIRST = 'first',
  THIRD = 'third'
}

export enum RelationshipType {
  PROJECTION = 'projection',
  RELATED_TO = 'related_to',
  SUPERSEDES = 'supersedes',
  INCORPORATED_INTO = 'incorporated_into'
}

export enum ImplementationTier {
  TIER_1_PARTIAL = 'Tier 1 - Partial',
  TIER_2_RISK_INFORMED = 'Tier 2 - Risk Informed',
  TIER_3_REPEATABLE = 'Tier 3 - Repeatable',
  TIER_4_ADAPTIVE = 'Tier 4 - Adaptive'
}

// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface CSFDocument {
  doc_identifier: string;
  name: string;
  version: string;
  website: string;
}

export interface BaseCSFElement {
  doc_identifier: string;
  element_identifier: string;
  element_type: ElementType;
  text?: string;
  title?: string;
}

export interface CSFFunctionElement extends BaseCSFElement {
  element_type: ElementType.FUNCTION;
}

export interface CSFCategory extends BaseCSFElement {
  element_type: ElementType.CATEGORY;
}

export interface CSFSubcategory extends BaseCSFElement {
  element_type: ElementType.SUBCATEGORY;
}

export interface CSFImplementationExample extends BaseCSFElement {
  element_type: ElementType.IMPLEMENTATION_EXAMPLE;
}

export interface CSFParty extends BaseCSFElement {
  element_type: ElementType.PARTY;
}

export interface CSFWithdrawReason extends BaseCSFElement {
  element_type: ElementType.WITHDRAW_REASON;
}

// ============================================================================
// RELATIONSHIP INTERFACE
// ============================================================================

export interface CSFRelationship {
  source_doc_identifier: string;
  source_element_identifier: string;
  dest_doc_identifier: string;
  dest_element_identifier: string;
  relationship_identifier: string;
  provenance_doc_identifier: string;
}

// ============================================================================
// FRAMEWORK STRUCTURE
// ============================================================================

export interface CSFFrameworkData {
  documents: CSFDocument[];
  elements: BaseCSFElement[];
  relationships?: CSFRelationship[];
  references?: any[];
}

export interface CSFFrameworkResponse {
  response: {
    requestType: number;
    elements: CSFFrameworkData;
  };
}

// ============================================================================
// ORGANIZATIONAL DATA INTERFACES
// ============================================================================

export interface OrganizationProfile {
  org_id: string;
  org_name: string;
  industry: string;
  size: string;
  current_tier?: ImplementationTier;
  target_tier?: ImplementationTier;
  created_at: Date;
  updated_at: Date;
}

export interface SubcategoryImplementation {
  id?: number;
  org_id: string;
  subcategory_id: string;
  implementation_status: 'Not Implemented' | 'Partially Implemented' | 'Largely Implemented' | 'Fully Implemented';
  maturity_level: number; // 0-5
  notes?: string;
  evidence?: string[];
  last_assessed: Date;
  assessed_by?: string;
}

export interface RiskAssessment {
  id?: number;
  org_id: string;
  element_id: string;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  likelihood: number; // 1-5
  impact: number; // 1-5
  risk_score: number;
  mitigation_status: string;
  mitigation_plan?: string;
  assessment_date: Date;
  next_review_date?: Date;
}

export interface GapAnalysis {
  id?: number;
  org_id: string;
  category_id: string;
  current_score: number; // 0-5
  target_score: number; // 0-5
  gap_score: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  estimated_effort?: string;
  target_date?: Date;
  analysis_date: Date;
}

// ============================================================================
// MCP TOOL INTERFACES
// ============================================================================

export interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface QueryParams {
  function?: CSFFunction;
  category?: string;
  subcategory?: string;
  keyword?: string;
  org_id?: string;
  limit?: number;
  offset?: number;
}

export interface AssessmentParams {
  org_id: string;
  subcategory_id: string;
  status: string;
  maturity_level?: number;
  notes?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type CSFElement = 
  | CSFFunctionElement 
  | CSFCategory 
  | CSFSubcategory 
  | CSFImplementationExample 
  | CSFParty 
  | CSFWithdrawReason;

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type ImplementationStatus = 'Not Implemented' | 'Partially Implemented' | 'Largely Implemented' | 'Fully Implemented';

// Type guards
export function isFunction(element: BaseCSFElement): element is CSFFunctionElement {
  return element.element_type === ElementType.FUNCTION;
}

export function isCategory(element: BaseCSFElement): element is CSFCategory {
  return element.element_type === ElementType.CATEGORY;
}

export function isSubcategory(element: BaseCSFElement): element is CSFSubcategory {
  return element.element_type === ElementType.SUBCATEGORY;
}

export function isImplementationExample(element: BaseCSFElement): element is CSFImplementationExample {
  return element.element_type === ElementType.IMPLEMENTATION_EXAMPLE;
}