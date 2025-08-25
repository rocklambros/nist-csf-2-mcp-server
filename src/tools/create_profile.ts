/**
 * Create Profile Tool - Create new organization and profile
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { logger } from '../utils/logger.js';

// Input schema for the tool
export const CreateProfileSchema = z.object({
  org_name: z.string().min(1),
  sector: z.string().min(1),
  size: z.enum(['small', 'medium', 'large', 'enterprise']),
  profile_type: z.enum(['baseline', 'target', 'current', 'custom']).default('current'),
  profile_name: z.string().optional(),
  description: z.string().optional(),
  created_by: z.string().optional(),
  current_tier: z.string().optional(),
  target_tier: z.string().optional()
});

export type CreateProfileParams = z.infer<typeof CreateProfileSchema>;

interface CreateProfileResult {
  success: boolean;
  profile_id: string;
  org_id: string;
  message: string;
  details?: {
    organization: any;
    profile: any;
  };
}

/**
 * Main function to create organization and profile
 */
export async function createProfile(params: CreateProfileParams): Promise<CreateProfileResult> {
  const db = getDatabase();
  
  try {
    // Validate and set defaults for parameters
    const validatedParams = CreateProfileSchema.parse(params);
    const profileType = validatedParams.profile_type || 'current';
    
    // Generate unique IDs
    const orgId = generateOrgId(validatedParams.org_name);
    const profileId = generateProfileId(orgId, profileType);
    
    // Profile name defaults to type-based name
    const profileName = validatedParams.profile_name || `${validatedParams.org_name} - ${capitalize(profileType)} Profile`;
    
    // Use transaction to ensure atomicity
    const result = db.transaction(() => {
      // Check if organization already exists
      const existingOrg = db.getOrganization(orgId);
      
      if (existingOrg) {
        // Organization exists, just create a new profile
        logger.info(`Organization ${orgId} already exists, creating new profile`);
      } else {
        // Create the organization
        db.createOrganization({
          org_id: orgId,
          org_name: validatedParams.org_name,
          industry: validatedParams.sector,
          size: validatedParams.size,
          current_tier: validatedParams.current_tier as any,
          target_tier: validatedParams.target_tier as any
        });
        logger.info(`Created organization: ${orgId}`);
      }
      
      // Create the profile
      db.createProfile({
        profile_id: profileId,
        org_id: orgId,
        profile_name: profileName,
        profile_type: profileType,
        description: validatedParams.description || `${profileType} security profile for ${validatedParams.org_name}`,
        created_by: validatedParams.created_by
      });
      logger.info(`Created profile: ${profileId}`);
      
      // Initialize default assessments based on profile type
      if (profileType === 'baseline') {
        initializeBaselineAssessments(db, profileId);
      }
      
      return {
        orgId,
        profileId
      };
    });
    
    // Retrieve created records for response
    const organization = db.getOrganization(result.orgId);
    const profile = db.getProfile(result.profileId);
    
    return {
      success: true,
      profile_id: result.profileId,
      org_id: result.orgId,
      message: `Successfully created ${profileType} profile for ${validatedParams.org_name}`,
      details: {
        organization,
        profile
      }
    };
    
  } catch (error) {
    logger.error('Create profile error:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('UNIQUE constraint')) {
        return {
          success: false,
          profile_id: '',
          org_id: '',
          message: 'Profile already exists with the same ID. Try a different name or type.'
        };
      }
    }
    
    return {
      success: false,
      profile_id: '',
      org_id: '',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generate organization ID from name
 */
function generateOrgId(orgName: string): string {
  // Create a URL-safe ID from org name
  const base = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);
  
  // Add a short random suffix to ensure uniqueness
  const suffix = Math.random().toString(36).substring(2, 6);
  return `org-${base}-${suffix}`;
}

/**
 * Generate profile ID
 */
function generateProfileId(orgId: string, profileType: string): string {
  const timestamp = Date.now().toString(36);
  return `${orgId}-${profileType}-${timestamp}`;
}

/**
 * Initialize baseline assessments for a new baseline profile
 */
function initializeBaselineAssessments(db: any, profileId: string): void {
  // Define baseline maturity scores for each CSF function
  const baselineScores = {
    'GV': 2,  // Govern - Basic governance
    'ID': 2,  // Identify - Basic asset management
    'PR': 2,  // Protect - Basic protection
    'DE': 1,  // Detect - Minimal detection
    'RS': 1,  // Respond - Minimal response
    'RC': 1   // Recover - Minimal recovery
  };
  
  const assessments: any[] = [];
  
  // Get all subcategories (this would normally come from the framework loader)
  // For now, we'll create a minimal set for demonstration
  const subcategoryPatterns = [
    'GV.OC-01', 'GV.OC-02', 'GV.OC-03',
    'ID.AM-01', 'ID.AM-02', 'ID.RA-01',
    'PR.AC-01', 'PR.AC-02', 'PR.DS-01',
    'DE.CM-01', 'DE.AE-01',
    'RS.CO-01', 'RS.AN-01',
    'RC.RP-01', 'RC.CO-01'
  ];
  
  for (const subcategoryId of subcategoryPatterns) {
    const functionId = subcategoryId.split('.')[0];
    const baseScore = baselineScores[functionId as keyof typeof baselineScores] || 1;
    
    assessments.push({
      subcategory_id: subcategoryId,
      implementation_level: getImplementationLevel(baseScore),
      maturity_score: baseScore,
      confidence_level: 'medium',
      notes: 'Baseline assessment - initial profile',
      assessed_by: 'system'
    });
  }
  
  // Bulk insert assessments
  db.createBulkAssessments(profileId, assessments);
  logger.info(`Initialized ${assessments.length} baseline assessments for profile ${profileId}`);
}

/**
 * Convert maturity score to implementation level
 */
function getImplementationLevel(score: number): string {
  if (score === 0) return 'not_implemented';
  if (score <= 1) return 'partially_implemented';
  if (score <= 3) return 'largely_implemented';
  return 'fully_implemented';
}

/**
 * Capitalize first letter
 */
function capitalize(str: string | undefined | null): string {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}