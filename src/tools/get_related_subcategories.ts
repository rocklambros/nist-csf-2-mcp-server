/**
 * Get Related Subcategories Tool - Analyze relationships between subcategories
 */

import { z } from 'zod';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';
import type { BaseCSFElement } from '../types/index.js';

// Input schema for the tool
export const GetRelatedSubcategoriesSchema = z.object({
  subcategory_id: z.string(),
  relationship_types: z.array(z.enum(['projection', 'related_to', 'supersedes', 'incorporated_into'])).optional(),
  include_bidirectional: z.boolean().default(true),
  depth: z.number().min(1).max(3).default(1),
  include_details: z.boolean().default(true)
});

export type GetRelatedSubcategoriesParams = z.infer<typeof GetRelatedSubcategoriesSchema>;

interface RelatedSubcategory {
  subcategory: BaseCSFElement;
  relationship: {
    type: string;
    direction: 'outgoing' | 'incoming' | 'bidirectional';
    relationship_id: string;
    distance: number;
  };
  category?: BaseCSFElement;
  function?: BaseCSFElement;
  implementation_examples?: BaseCSFElement[];
}

interface RelationshipAnalysis {
  source_subcategory: BaseCSFElement;
  related_subcategories: RelatedSubcategory[];
  relationship_summary: {
    total_relationships: number;
    by_type: Record<string, number>;
    by_direction: {
      outgoing: number;
      incoming: number;
      bidirectional: number;
    };
    by_function: Record<string, number>;
  };
  clusters?: {
    function: string;
    subcategories: BaseCSFElement[];
  }[];
}

/**
 * Main function to get related subcategories
 */
export async function getRelatedSubcategories(params: GetRelatedSubcategoriesParams): Promise<any> {
  try {
    const framework = getFrameworkLoader();
    
    if (!framework.isLoaded()) {
      await framework.load();
    }

    // Get the source subcategory
    const sourceSubcategory = framework.getSubcategory(params.subcategory_id);
    if (!sourceSubcategory) {
      return {
        success: false,
        error: `Subcategory not found: ${params.subcategory_id}`
      };
    }

    // Find related subcategories
    const relatedMap = new Map<string, RelatedSubcategory>();
    const visited = new Set<string>();
    
    findRelatedSubcategories(
      framework,
      sourceSubcategory.element_identifier,
      params,
      relatedMap,
      visited,
      1,
      params.depth
    );

    // Convert map to array and sort by distance
    const relatedSubcategories = Array.from(relatedMap.values())
      .sort((a, b) => a.relationship.distance - b.relationship.distance);

    // Add additional details if requested
    if (params.include_details) {
      for (const related of relatedSubcategories) {
        // Get category and function
        const categoryId = extractCategoryId(related.subcategory.element_identifier);
        if (categoryId) {
          related.category = framework.getCategory(categoryId);
          const functionId = extractFunctionId(categoryId);
          if (functionId) {
            related.function = framework.getFunction(functionId);
          }
        }
        
        // Get implementation examples
        related.implementation_examples = framework.getImplementationExamples(
          related.subcategory.element_identifier
        );
      }
    }

    // Create relationship analysis
    const analysis: RelationshipAnalysis = {
      source_subcategory: sourceSubcategory,
      related_subcategories: relatedSubcategories,
      relationship_summary: generateSummary(relatedSubcategories),
      clusters: identifyClusters(relatedSubcategories)
    };

    return {
      success: true,
      data: analysis
    };
    
  } catch (error) {
    logger.error('Get Related Subcategories error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Recursively find related subcategories
 */
function findRelatedSubcategories(
  framework: any,
  currentId: string,
  params: GetRelatedSubcategoriesParams,
  relatedMap: Map<string, RelatedSubcategory>,
  visited: Set<string>,
  currentDepth: number,
  maxDepth: number
): void {
  if (currentDepth > maxDepth || visited.has(currentId)) {
    return;
  }
  
  visited.add(currentId);
  
  // Get all relationships for current element
  const relationships = framework.getRelationships(currentId);
  
  for (const rel of relationships) {
    // Filter by relationship type if specified
    if (params.relationship_types && params.relationship_types.length > 0) {
      const relType = inferRelationshipType(rel.relationship_identifier);
      if (!params.relationship_types.includes(relType as any)) {
        continue;
      }
    }
    
    // Determine the related element ID and direction
    let relatedId: string;
    let direction: 'outgoing' | 'incoming';
    
    if (rel.source_element_identifier === currentId) {
      relatedId = rel.dest_element_identifier;
      direction = 'outgoing';
    } else {
      relatedId = rel.source_element_identifier;
      direction = 'incoming';
      
      // Skip incoming relationships if not bidirectional
      if (!params.include_bidirectional) {
        continue;
      }
    }
    
    // Get the related element
    const relatedElement = framework.getElementById(relatedId);
    if (!relatedElement || relatedElement.element_type !== 'subcategory') {
      continue;
    }
    
    // Check if we already have this relationship at a shorter distance
    const existingRelated = relatedMap.get(relatedId);
    if (!existingRelated || existingRelated.relationship.distance > currentDepth) {
      // Add or update the related subcategory
      relatedMap.set(relatedId, {
        subcategory: relatedElement,
        relationship: {
          type: inferRelationshipType(rel.relationship_identifier),
          direction: direction,
          relationship_id: rel.relationship_identifier,
          distance: currentDepth
        }
      });
      
      // Recursively find relationships from this subcategory
      if (currentDepth < maxDepth) {
        findRelatedSubcategories(
          framework,
          relatedId,
          params,
          relatedMap,
          visited,
          currentDepth + 1,
          maxDepth
        );
      }
    }
  }
}

/**
 * Infer relationship type from relationship identifier
 */
function inferRelationshipType(relationshipId: string): string {
  // Common patterns in relationship identifiers
  if (relationshipId.toLowerCase().includes('projection')) {
    return 'projection';
  } else if (relationshipId.toLowerCase().includes('supersedes')) {
    return 'supersedes';
  } else if (relationshipId.toLowerCase().includes('incorporated')) {
    return 'incorporated_into';
  } else {
    return 'related_to';
  }
}

/**
 * Generate relationship summary statistics
 */
function generateSummary(relatedSubcategories: RelatedSubcategory[]): RelationshipAnalysis['relationship_summary'] {
  const summary: RelationshipAnalysis['relationship_summary'] = {
    total_relationships: relatedSubcategories.length,
    by_type: {},
    by_direction: {
      outgoing: 0,
      incoming: 0,
      bidirectional: 0
    },
    by_function: {}
  };
  
  for (const related of relatedSubcategories) {
    // Count by type
    const type = related.relationship.type;
    summary.by_type[type] = (summary.by_type[type] || 0) + 1;
    
    // Count by direction
    summary.by_direction[related.relationship.direction]++;
    
    // Count by function
    if (related.function) {
      const funcId = related.function.element_identifier;
      summary.by_function[funcId] = (summary.by_function[funcId] || 0) + 1;
    }
  }
  
  return summary;
}

/**
 * Identify clusters of related subcategories by function
 */
function identifyClusters(relatedSubcategories: RelatedSubcategory[]): RelationshipAnalysis['clusters'] {
  const clusterMap = new Map<string, BaseCSFElement[]>();
  
  for (const related of relatedSubcategories) {
    if (related.function) {
      const funcId = related.function.element_identifier;
      if (!clusterMap.has(funcId)) {
        clusterMap.set(funcId, []);
      }
      clusterMap.get(funcId)!.push(related.subcategory);
    }
  }
  
  // Convert to array and filter out single-element clusters
  const clusters = Array.from(clusterMap.entries())
    .filter(([_, subcategories]) => subcategories.length > 1)
    .map(([function_id, subcategories]) => ({
      function: function_id,
      subcategories
    }));
  
  return clusters.length > 0 ? clusters : undefined;
}

/**
 * Extract function ID from category ID
 */
function extractFunctionId(categoryId: string): string | null {
  const match = categoryId.match(/^([A-Z]{2})\./);
  return match ? match[1]! : null;
}

/**
 * Extract category ID from subcategory ID
 */
function extractCategoryId(subcategoryId: string): string | null {
  const match = subcategoryId.match(/^([A-Z]{2}\.[A-Z]{2})-\d{2}$/);
  return match ? match[1]! : null;
}