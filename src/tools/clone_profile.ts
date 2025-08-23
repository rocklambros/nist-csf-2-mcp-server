/**
 * Clone Profile Tool - Duplicate existing profile with modifications
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { logger } from '../utils/logger.js';

// Input schema for the tool
export const CloneProfileSchema = z.object({
  source_profile_id: z.string().min(1),
  new_name: z.string().min(1),
  modifications: z.object({
    profile_type: z.enum(['baseline', 'target', 'current', 'custom']).optional(),
    description: z.string().optional(),
    created_by: z.string().optional(),
    adjustments: z.array(z.object({
      subcategory_id: z.string(),
      implementation_level: z.enum(['not_implemented', 'partially_implemented', 'largely_implemented', 'fully_implemented']).optional(),
      maturity_score: z.number().min(0).max(5).optional(),
      notes: z.string().optional()
    })).optional()
  }).optional()
});

export type CloneProfileParams = z.infer<typeof CloneProfileSchema>;

interface CloneProfileResult {
  success: boolean;
  new_profile_id: string;
  source_profile_id: string;
  message: string;
  details?: {
    source_profile: any;
    new_profile: any;
    assessments_cloned: number;
    modifications_applied: number;
  };
}

/**
 * Main function to clone a profile
 */
export async function cloneProfile(params: CloneProfileParams): Promise<CloneProfileResult> {
  const db = getDatabase();
  
  try {
    // Verify source profile exists
    const sourceProfile = db.getProfile(params.source_profile_id);
    if (!sourceProfile) {
      return {
        success: false,
        new_profile_id: '',
        source_profile_id: params.source_profile_id,
        message: `Source profile not found: ${params.source_profile_id}`
      };
    }
    
    // Generate new profile ID
    const newProfileId = generateNewProfileId(sourceProfile.org_id, params.new_name);
    
    // Use transaction for atomicity
    const result = db.transaction(() => {
      // Clone the profile with modifications
      const profileType = params.modifications?.profile_type || sourceProfile.profile_type;
      const description = params.modifications?.description || 
        `Cloned from ${sourceProfile.profile_name} - ${new Date().toISOString()}`;
      
      // Use the cloneProfile method which handles both profile and assessments
      db.cloneProfile(params.source_profile_id, newProfileId, params.new_name);
      
      // Update profile metadata if modifications provided
      if (params.modifications?.profile_type || params.modifications?.description) {
        const updateStmt = (db as any).db.prepare(`
          UPDATE profiles 
          SET profile_type = ?, description = ?, created_by = ?
          WHERE profile_id = ?
        `);
        
        updateStmt.run(
          profileType,
          description,
          params.modifications?.created_by || sourceProfile.created_by,
          newProfileId
        );
      }
      
      // Get cloned assessments count
      const assessments = db.getProfileAssessments(newProfileId);
      let modificationsApplied = 0;
      
      // Apply assessment modifications if provided
      if (params.modifications?.adjustments && params.modifications.adjustments.length > 0) {
        modificationsApplied = applyAssessmentModifications(
          db,
          newProfileId,
          params.modifications.adjustments
        );
      }
      
      return {
        assessmentsCloned: assessments.length,
        modificationsApplied
      };
    });
    
    // Retrieve the new profile for response
    const newProfile = db.getProfile(newProfileId);
    
    return {
      success: true,
      new_profile_id: newProfileId,
      source_profile_id: params.source_profile_id,
      message: `Successfully cloned profile: ${params.new_name}`,
      details: {
        source_profile: sourceProfile,
        new_profile: newProfile,
        assessments_cloned: result.assessmentsCloned,
        modifications_applied: result.modificationsApplied
      }
    };
    
  } catch (error) {
    logger.error('Clone profile error:', error);
    
    return {
      success: false,
      new_profile_id: '',
      source_profile_id: params.source_profile_id,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generate new profile ID
 */
function generateNewProfileId(orgId: string, profileName: string): string {
  const nameSlug = profileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 20);
  
  const timestamp = Date.now().toString(36);
  return `${orgId}-${nameSlug}-${timestamp}`;
}

/**
 * Apply modifications to cloned assessments
 */
function applyAssessmentModifications(
  db: any,
  profileId: string,
  adjustments: Array<{
    subcategory_id: string;
    implementation_level?: string;
    maturity_score?: number;
    notes?: string;
  }>
): number {
  let modified = 0;
  
  for (const adjustment of adjustments) {
    try {
      // Get existing assessment
      const existing = db.getAssessmentsBySubcategory(profileId, adjustment.subcategory_id);
      
      if (existing) {
        // Update the assessment with modifications
        const updateData: any = {
          profile_id: profileId,
          subcategory_id: adjustment.subcategory_id,
          implementation_level: adjustment.implementation_level || existing.implementation_level,
          maturity_score: adjustment.maturity_score !== undefined ? 
            adjustment.maturity_score : existing.maturity_score,
          confidence_level: existing.confidence_level,
          notes: adjustment.notes || existing.notes,
          evidence: existing.evidence,
          assessed_by: 'clone_modification'
        };
        
        db.createAssessment(updateData);
        modified++;
        
        logger.info(`Modified assessment for ${adjustment.subcategory_id} in profile ${profileId}`);
      } else {
        // Create new assessment if it doesn't exist
        if (adjustment.implementation_level && adjustment.maturity_score !== undefined) {
          db.createAssessment({
            profile_id: profileId,
            subcategory_id: adjustment.subcategory_id,
            implementation_level: adjustment.implementation_level,
            maturity_score: adjustment.maturity_score,
            confidence_level: 'medium',
            notes: adjustment.notes || 'Added during profile clone',
            assessed_by: 'clone_modification'
          });
          modified++;
          
          logger.info(`Added new assessment for ${adjustment.subcategory_id} in profile ${profileId}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to modify assessment for ${adjustment.subcategory_id}:`, error);
    }
  }
  
  return modified;
}