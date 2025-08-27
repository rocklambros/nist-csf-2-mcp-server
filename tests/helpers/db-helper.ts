/**
 * Database helper for tests - uses existing production database approach
 */

import Database from '../db/database.js';

let sharedTestDb: any = null;

export function getTestDatabase(): any {
  if (!sharedTestDb) {
    // Use the Database singleton which is already working
    sharedTestDb = Database.getInstance();
  }
  return sharedTestDb;
}

export function createTestProfile(overrides: any = {}): any {
  const db = getTestDatabase();
  const orgId = `test-org-${Date.now()}`;
  const profileId = `test-profile-${Date.now()}`;
  
  // Create organization using the working database methods
  db.createOrganization({
    org_id: orgId,
    org_name: 'Test Organization',
    industry: 'Technology',
    size: 'medium',
    current_tier: 'Tier1',
    target_tier: 'Tier3'
  });
  
  // Create profile using the working database methods  
  db.createProfile({
    profile_id: profileId,
    org_id: orgId,
    profile_name: 'Test Profile',
    profile_type: 'current',
    description: 'Test profile for validation',
    ...overrides
  });
  
  return {
    profile_id: profileId,
    org_id: orgId,
    profile_name: 'Test Profile',
    profile_type: 'current'
  };
}

export function cleanupTestData(): void {
  const db = getTestDatabase();
  // Clean up test data - remove anything with test- prefix
  try {
    const stmt = db.prepare('DELETE FROM organization_profiles WHERE org_id LIKE ?');
    stmt.run('test-%');
    
    const profileStmt = db.prepare('DELETE FROM profiles WHERE profile_id LIKE ?');  
    profileStmt.run('test-%');
  } catch (error) {
    console.warn('Error cleaning test data:', error);
  }
}