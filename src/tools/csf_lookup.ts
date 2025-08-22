/**
 * CSF Lookup Tool - Retrieve specific CSF guidance with partial matching
 */

import { z } from 'zod';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';
import type { BaseCSFElement, CSFRelationship } from '../types/index.js';

// Input schema for the tool
export const CSFLookupSchema = z.object({
  function_id: z.string().optional(),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  include_examples: z.boolean().default(true),
  include_relationships: z.boolean().default(true)
});

export type CSFLookupParams = z.infer<typeof CSFLookupSchema>;

interface LookupResult {
  element: BaseCSFElement;
  children?: BaseCSFElement[];
  examples?: BaseCSFElement[];
  relationships?: CSFRelationship[];
  parent?: BaseCSFElement;
}

/**
 * Main lookup function for CSF elements
 */
export async function csfLookup(params: CSFLookupParams): Promise<any> {
  try {
    const framework = getFrameworkLoader();
    
    if (!framework.isLoaded()) {
      await framework.load();
    }

    const results: LookupResult[] = [];
    
    // Subcategory lookup (most specific)
    if (params.subcategory_id) {
      const subcategories = lookupSubcategories(framework, params.subcategory_id);
      
      for (const subcategory of subcategories) {
        const result: LookupResult = {
          element: subcategory
        };
        
        // Get parent category
        const categoryId = extractCategoryId(subcategory.element_identifier);
        if (categoryId) {
          result.parent = framework.getCategory(categoryId);
        }
        
        // Get implementation examples
        if (params.include_examples) {
          result.examples = framework.getImplementationExamples(subcategory.element_identifier);
        }
        
        // Get relationships
        if (params.include_relationships) {
          result.relationships = framework.getRelationships(subcategory.element_identifier);
        }
        
        results.push(result);
      }
    }
    // Category lookup
    else if (params.category_id) {
      const categories = lookupCategories(framework, params.category_id);
      
      for (const category of categories) {
        const result: LookupResult = {
          element: category
        };
        
        // Get parent function
        const functionId = extractFunctionId(category.element_identifier);
        if (functionId) {
          result.parent = framework.getFunction(functionId);
        }
        
        // Get child subcategories
        result.children = framework.getSubcategoriesForCategory(category.element_identifier);
        
        // Get relationships
        if (params.include_relationships) {
          result.relationships = framework.getRelationships(category.element_identifier);
        }
        
        results.push(result);
      }
    }
    // Function lookup
    else if (params.function_id) {
      const functions = lookupFunctions(framework, params.function_id);
      
      for (const func of functions) {
        const result: LookupResult = {
          element: func
        };
        
        // Get child categories
        result.children = framework.getCategoriesForFunction(func.element_identifier);
        
        // Get relationships
        if (params.include_relationships) {
          result.relationships = framework.getRelationships(func.element_identifier);
        }
        
        results.push(result);
      }
    }
    // No specific ID provided - return all functions
    else {
      const functions = framework.getFunctions();
      for (const func of functions) {
        results.push({
          element: func,
          children: framework.getCategoriesForFunction(func.element_identifier)
        });
      }
    }
    
    return {
      success: true,
      count: results.length,
      data: results
    };
    
  } catch (error) {
    logger.error('CSF Lookup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Lookup functions with partial matching
 */
function lookupFunctions(framework: any, functionId: string): BaseCSFElement[] {
  const results: BaseCSFElement[] = [];
  const upperFunctionId = functionId.toUpperCase();
  
  // Try exact match first
  const exactMatch = framework.getFunction(upperFunctionId);
  if (exactMatch) {
    return [exactMatch];
  }
  
  // Try partial match
  const allFunctions = framework.getFunctions();
  for (const func of allFunctions) {
    if (func.element_identifier.includes(upperFunctionId) ||
        func.title?.toLowerCase().includes(functionId.toLowerCase()) ||
        func.text?.toLowerCase().includes(functionId.toLowerCase())) {
      results.push(func);
    }
  }
  
  return results;
}

/**
 * Lookup categories with partial matching
 */
function lookupCategories(framework: any, categoryId: string): BaseCSFElement[] {
  const results: BaseCSFElement[] = [];
  const upperCategoryId = categoryId.toUpperCase();
  
  // Try exact match first
  const exactMatch = framework.getCategory(upperCategoryId);
  if (exactMatch) {
    return [exactMatch];
  }
  
  // Try partial match
  const allCategories = framework.getElementsByType('category');
  for (const category of allCategories) {
    if (category.element_identifier.includes(upperCategoryId) ||
        category.title?.toLowerCase().includes(categoryId.toLowerCase()) ||
        category.text?.toLowerCase().includes(categoryId.toLowerCase())) {
      results.push(category);
    }
  }
  
  return results;
}

/**
 * Lookup subcategories with partial matching
 */
function lookupSubcategories(framework: any, subcategoryId: string): BaseCSFElement[] {
  const results: BaseCSFElement[] = [];
  const upperSubcategoryId = subcategoryId.toUpperCase();
  
  // Try exact match first
  const exactMatch = framework.getSubcategory(upperSubcategoryId);
  if (exactMatch) {
    return [exactMatch];
  }
  
  // Try partial match
  const allSubcategories = framework.getElementsByType('subcategory');
  for (const subcategory of allSubcategories) {
    if (subcategory.element_identifier.includes(upperSubcategoryId) ||
        subcategory.title?.toLowerCase().includes(subcategoryId.toLowerCase()) ||
        subcategory.text?.toLowerCase().includes(subcategoryId.toLowerCase())) {
      results.push(subcategory);
    }
  }
  
  return results;
}

/**
 * Extract function ID from category or subcategory ID
 */
function extractFunctionId(elementId: string): string | null {
  // Format: GV.OC or GV.OC-01
  const match = elementId.match(/^([A-Z]{2})\./);
  return match ? match[1]! : null;
}

/**
 * Extract category ID from subcategory ID
 */
function extractCategoryId(elementId: string): string | null {
  // Format: GV.OC-01
  const match = elementId.match(/^([A-Z]{2}\.[A-Z]{2})-\d{2}$/);
  return match ? match[1]! : null;
}