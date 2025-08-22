/**
 * Search Framework Tool - Full-text search with fuzzy matching and ranking
 */

import { z } from 'zod';
import { getFrameworkLoader } from '../services/framework-loader.js';
import { logger } from '../utils/logger.js';
import type { BaseCSFElement, ElementType } from '../types/index.js';

// Input schema for the tool
export const SearchFrameworkSchema = z.object({
  query: z.string().min(2),
  element_types: z.array(z.enum(['function', 'category', 'subcategory', 'implementation_example'])).optional(),
  limit: z.number().min(1).max(100).default(20),
  fuzzy: z.boolean().default(true),
  min_score: z.number().min(0).max(1).default(0.3)
});

export type SearchFrameworkParams = z.infer<typeof SearchFrameworkSchema>;

interface SearchResult {
  element: BaseCSFElement;
  score: number;
  matches: {
    field: string;
    snippet: string;
    exact: boolean;
  }[];
}

/**
 * Main search function for the framework
 */
export async function searchFramework(params: SearchFrameworkParams): Promise<any> {
  try {
    const framework = getFrameworkLoader();
    
    if (!framework.isLoaded()) {
      await framework.load();
    }

    const searchTerms = prepareSearchTerms(params.query);
    const results: SearchResult[] = [];
    
    // Get all elements or filter by type
    const elements = params.element_types && params.element_types.length > 0
      ? getElementsOfTypes(framework, params.element_types as ElementType[])
      : getAllElements(framework);
    
    // Search through elements
    for (const element of elements) {
      const searchResult = scoreElement(element, searchTerms, params.fuzzy);
      
      if (searchResult.score >= params.min_score) {
        results.push(searchResult);
      }
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Apply limit
    const limitedResults = results.slice(0, params.limit);
    
    // Group results by type for better organization
    const groupedResults = groupResultsByType(limitedResults);
    
    return {
      success: true,
      query: params.query,
      total_matches: results.length,
      returned: limitedResults.length,
      results: limitedResults,
      grouped_results: groupedResults,
      statistics: {
        by_type: getStatsByType(results),
        score_distribution: getScoreDistribution(results)
      }
    };
    
  } catch (error) {
    logger.error('Search Framework error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Prepare search terms for matching
 */
function prepareSearchTerms(query: string): string[] {
  // Split by spaces and filter out empty strings
  const terms = query.toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 0);
  
  // Add the full query as a term for phrase matching
  if (terms.length > 1) {
    terms.push(query.toLowerCase());
  }
  
  return terms;
}

/**
 * Score an element against search terms
 */
function scoreElement(element: BaseCSFElement, searchTerms: string[], fuzzy: boolean): SearchResult {
  const matches: SearchResult['matches'] = [];
  let totalScore = 0;
  
  // Define field weights
  const fieldWeights = {
    element_identifier: 1.5,
    title: 1.2,
    text: 1.0
  };
  
  // Search in element_identifier
  if (element.element_identifier) {
    const idScore = scoreField(element.element_identifier, searchTerms, fuzzy);
    if (idScore.score > 0) {
      totalScore += idScore.score * fieldWeights.element_identifier;
      matches.push({
        field: 'element_identifier',
        snippet: element.element_identifier,
        exact: idScore.exact
      });
    }
  }
  
  // Search in title
  if (element.title) {
    const titleScore = scoreField(element.title, searchTerms, fuzzy);
    if (titleScore.score > 0) {
      totalScore += titleScore.score * fieldWeights.title;
      matches.push({
        field: 'title',
        snippet: getSnippet(element.title, searchTerms),
        exact: titleScore.exact
      });
    }
  }
  
  // Search in text
  if (element.text) {
    const textScore = scoreField(element.text, searchTerms, fuzzy);
    if (textScore.score > 0) {
      totalScore += textScore.score * fieldWeights.text;
      matches.push({
        field: 'text',
        snippet: getSnippet(element.text, searchTerms),
        exact: textScore.exact
      });
    }
  }
  
  // Normalize score
  const maxPossibleScore = Object.values(fieldWeights).reduce((a, b) => a + b, 0);
  const normalizedScore = Math.min(totalScore / maxPossibleScore, 1);
  
  return {
    element,
    score: normalizedScore,
    matches
  };
}

/**
 * Score a field against search terms
 */
function scoreField(field: string, searchTerms: string[], fuzzy: boolean): { score: number; exact: boolean } {
  const fieldLower = field.toLowerCase();
  let score = 0;
  let exact = false;
  
  for (const term of searchTerms) {
    if (fieldLower.includes(term)) {
      // Exact match
      score += 1;
      exact = true;
    } else if (fuzzy) {
      // Fuzzy match using Levenshtein distance
      const distance = levenshteinDistance(term, fieldLower);
      const maxLength = Math.max(term.length, fieldLower.length);
      const similarity = 1 - (distance / maxLength);
      
      if (similarity > 0.7) {
        score += similarity * 0.5;
      }
      
      // Also check if term is a substring with typos
      const substringScore = fuzzySubstringMatch(term, fieldLower);
      if (substringScore > 0.7) {
        score += substringScore * 0.7;
      }
    }
  }
  
  return { score, exact };
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = Math.min(
          dp[i - 1]![j]! + 1,    // deletion
          dp[i]![j - 1]! + 1,    // insertion
          dp[i - 1]![j - 1]! + 1 // substitution
        );
      }
    }
  }
  
  return dp[m]![n]!;
}

/**
 * Fuzzy substring matching
 */
function fuzzySubstringMatch(needle: string, haystack: string): number {
  const needleLen = needle.length;
  const haystackLen = haystack.length;
  
  if (needleLen > haystackLen) return 0;
  
  let bestScore = 0;
  
  for (let i = 0; i <= haystackLen - needleLen; i++) {
    const substring = haystack.substr(i, needleLen);
    const distance = levenshteinDistance(needle, substring);
    const similarity = 1 - (distance / needleLen);
    bestScore = Math.max(bestScore, similarity);
  }
  
  return bestScore;
}

/**
 * Get a snippet of text around matching terms
 */
function getSnippet(text: string, searchTerms: string[], maxLength: number = 150): string {
  const textLower = text.toLowerCase();
  let bestStart = 0;
  let bestEnd = Math.min(text.length, maxLength);
  
  // Find the position of the first matching term
  for (const term of searchTerms) {
    const index = textLower.indexOf(term);
    if (index !== -1) {
      // Center the snippet around the match
      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + term.length + 100);
      
      if (start < bestStart || bestStart === 0) {
        bestStart = start;
        bestEnd = end;
      }
      break;
    }
  }
  
  let snippet = text.substring(bestStart, bestEnd);
  
  // Add ellipsis if truncated
  if (bestStart > 0) snippet = '...' + snippet;
  if (bestEnd < text.length) snippet = snippet + '...';
  
  return snippet;
}

/**
 * Get all elements from the framework
 */
function getAllElements(framework: any): BaseCSFElement[] {
  const data = framework.getFrameworkData();
  return data?.elements || [];
}

/**
 * Get elements of specific types
 */
function getElementsOfTypes(framework: any, types: ElementType[]): BaseCSFElement[] {
  const elements: BaseCSFElement[] = [];
  
  for (const type of types) {
    elements.push(...framework.getElementsByType(type));
  }
  
  return elements;
}

/**
 * Group results by element type
 */
function groupResultsByType(results: SearchResult[]): Record<string, SearchResult[]> {
  const grouped: Record<string, SearchResult[]> = {};
  
  for (const result of results) {
    const type = result.element.element_type;
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(result);
  }
  
  return grouped;
}

/**
 * Get statistics by element type
 */
function getStatsByType(results: SearchResult[]): Record<string, number> {
  const stats: Record<string, number> = {};
  
  for (const result of results) {
    const type = result.element.element_type;
    stats[type] = (stats[type] || 0) + 1;
  }
  
  return stats;
}

/**
 * Get score distribution statistics
 */
function getScoreDistribution(results: SearchResult[]): any {
  if (results.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0 };
  }
  
  const scores = results.map(r => r.score).sort((a, b) => a - b);
  const sum = scores.reduce((a, b) => a + b, 0);
  
  return {
    min: scores[0],
    max: scores[scores.length - 1],
    avg: sum / scores.length,
    median: scores[Math.floor(scores.length / 2)]
  };
}