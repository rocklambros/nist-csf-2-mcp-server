#!/usr/bin/env npx tsx
/**
 * NIST CSF 2.0 Subcategory Cleanup Script
 * Removes incorrect subcategories and ensures database matches official CSF 2.0 specification
 * Official count: 107 subcategories
 */

import { readFileSync } from 'fs';
import { getDatabase, closeDatabase } from '../src/db/database.js';
import { logger } from '../src/utils/enhanced-logger.js';

class SubcategoryCleanup {
  private db: any;
  private officialSubcategories: Set<string> = new Set();
  
  constructor() {
    this.db = getDatabase();
    this.loadOfficialSubcategories();
  }

  /**
   * Load the official NIST CSF 2.0 subcategories list
   */
  private loadOfficialSubcategories(): void {
    const officialList = [
      // GOVERN (GV) - 31 subcategories
      'GV.OC-01', 'GV.OC-02', 'GV.OC-03', 'GV.OC-04', 'GV.OC-05',
      'GV.RM-01', 'GV.RM-02', 'GV.RM-03', 'GV.RM-04', 'GV.RM-05', 'GV.RM-06', 'GV.RM-07',
      'GV.RR-01', 'GV.RR-02', 'GV.RR-03', 'GV.RR-04',
      'GV.PO-01', 'GV.PO-02',
      'GV.OV-01', 'GV.OV-02', 'GV.OV-03',
      'GV.SC-01', 'GV.SC-02', 'GV.SC-03', 'GV.SC-04', 'GV.SC-05', 'GV.SC-06', 'GV.SC-07', 'GV.SC-08', 'GV.SC-09', 'GV.SC-10',
      
      // IDENTIFY (ID) - 21 subcategories (note: ID.AM-06 was withdrawn)
      'ID.AM-01', 'ID.AM-02', 'ID.AM-03', 'ID.AM-04', 'ID.AM-05', 'ID.AM-07', 'ID.AM-08',
      'ID.RA-01', 'ID.RA-02', 'ID.RA-03', 'ID.RA-04', 'ID.RA-05', 'ID.RA-06', 'ID.RA-07', 'ID.RA-08', 'ID.RA-09', 'ID.RA-10',
      'ID.IM-01', 'ID.IM-02', 'ID.IM-03', 'ID.IM-04',
      
      // PROTECT (PR) - 22 subcategories  
      'PR.AA-01', 'PR.AA-02', 'PR.AA-03', 'PR.AA-04', 'PR.AA-05', 'PR.AA-06',
      'PR.AT-01', 'PR.AT-02',
      'PR.DS-01', 'PR.DS-02', 'PR.DS-10', 'PR.DS-11',
      'PR.PS-01', 'PR.PS-02', 'PR.PS-03', 'PR.PS-04', 'PR.PS-05', 'PR.PS-06',
      'PR.IR-01', 'PR.IR-02', 'PR.IR-03', 'PR.IR-04',
      
      // DETECT (DE) - 11 subcategories
      'DE.CM-01', 'DE.CM-02', 'DE.CM-03', 'DE.CM-06', 'DE.CM-09',
      'DE.AE-02', 'DE.AE-03', 'DE.AE-04', 'DE.AE-06', 'DE.AE-07', 'DE.AE-08',
      
      // RESPOND (RS) - 13 subcategories
      'RS.MA-01', 'RS.MA-02', 'RS.MA-03', 'RS.MA-04', 'RS.MA-05',
      'RS.AN-03', 'RS.AN-06', 'RS.AN-07', 'RS.AN-08',
      'RS.CO-02', 'RS.CO-03',
      'RS.MI-01', 'RS.MI-02',
      
      // RECOVER (RC) - 8 subcategories
      'RC.RP-01', 'RC.RP-02', 'RC.RP-03', 'RC.RP-04', 'RC.RP-05', 'RC.RP-06',
      'RC.CO-03', 'RC.CO-04'
    ];
    
    officialList.forEach(id => this.officialSubcategories.add(id));
    logger.info(`📋 Loaded ${this.officialSubcategories.size} official NIST CSF 2.0 subcategories`);
  }

  /**
   * Main cleanup process
   */
  async cleanup(): Promise<boolean> {
    logger.info('🧹 Starting NIST CSF 2.0 Subcategory Cleanup');
    logger.info('🎯 Target: 107 official subcategories');

    try {
      // Get current state
      const currentCount = this.db.prepare('SELECT COUNT(*) as count FROM subcategories').get().count;
      logger.info(`📊 Current database: ${currentCount} subcategories`);
      
      // Begin transaction
      this.db.prepare('BEGIN TRANSACTION').run();
      
      try {
        // Identify subcategories to remove
        const toRemove = await this.identifySubcategoriesToRemove();
        
        // Remove incorrect subcategories
        const removed = await this.removeIncorrectSubcategories(toRemove);
        
        // Verify final state
        const finalCount = this.db.prepare('SELECT COUNT(*) as count FROM subcategories').get().count;
        
        const expectedTotal = Array.from(this.officialSubcategories).length;
        if (finalCount !== expectedTotal) {
          throw new Error(`Expected ${expectedTotal} subcategories, but found ${finalCount} after cleanup`);
        }
        
        // Commit transaction
        this.db.prepare('COMMIT').run();
        
        logger.info(`✅ Cleanup completed successfully`);
        logger.info(`📊 Removed: ${removed} subcategories`);
        logger.info(`📊 Final count: ${finalCount} subcategories`);
        
        return true;
        
      } catch (error) {
        this.db.prepare('ROLLBACK').run();
        throw error;
      }
      
    } catch (error) {
      logger.error('💥 Subcategory cleanup failed:', error);
      return false;
    }
  }

  /**
   * Identify subcategories that should be removed
   */
  private async identifySubcategoriesToRemove(): Promise<string[]> {
    const allSubcategories = this.db.prepare('SELECT id FROM subcategories').all();
    const toRemove: string[] = [];
    
    for (const row of allSubcategories) {
      if (!this.officialSubcategories.has(row.id)) {
        toRemove.push(row.id);
      }
    }
    
    logger.info(`🔍 Found ${toRemove.length} subcategories to remove`);
    if (toRemove.length > 0) {
      logger.info(`📋 Subcategories to remove: ${toRemove.slice(0, 10).join(', ')}${toRemove.length > 10 ? '...' : ''}`);
    }
    
    return toRemove;
  }

  /**
   * Remove incorrect subcategories
   */
  private async removeIncorrectSubcategories(toRemove: string[]): Promise<number> {
    if (toRemove.length === 0) {
      logger.info('✅ No subcategories need to be removed');
      return 0;
    }

    const deleteStmt = this.db.prepare('DELETE FROM subcategories WHERE id = ?');
    let removed = 0;
    
    for (const subcategoryId of toRemove) {
      try {
        const result = deleteStmt.run(subcategoryId);
        if (result.changes > 0) {
          removed++;
          if (removed <= 10) {
            logger.info(`  🗑️  Removed: ${subcategoryId}`);
          } else if (removed === 11) {
            logger.info(`  🗑️  ... (continuing removal, will show final count)`);
          }
        }
      } catch (error) {
        logger.error(`❌ Failed to remove ${subcategoryId}:`, error);
      }
    }
    
    return removed;
  }

  /**
   * Verify final database state
   */
  private async verifyFinalState(): Promise<void> {
    const finalCount = this.db.prepare('SELECT COUNT(*) as count FROM subcategories').get().count;
    const functionCounts = this.db.prepare(`
      SELECT SUBSTR(id, 1, 2) as function_code, COUNT(*) as count 
      FROM subcategories 
      GROUP BY SUBSTR(id, 1, 2) 
      ORDER BY function_code
    `).all();
    
    logger.info('\n📊 Final Database State:');
    logger.info(`   Total subcategories: ${finalCount}`);
    
    functionCounts.forEach((row: any) => {
      logger.info(`   ${row.function_code}: ${row.count} subcategories`);
    });
    
    // Verify against official counts
    const expectedCounts: Record<string, number> = {
      'GV': 31,
      'ID': 21, 
      'PR': 22,
      'DE': 11,
      'RS': 13,
      'RC': 8
    };
    
    let allCorrect = true;
    functionCounts.forEach((row: any) => {
      const expected = expectedCounts[row.function_code];
      if (expected && row.count !== expected) {
        logger.error(`❌ ${row.function_code} has ${row.count} subcategories, expected ${expected}`);
        allCorrect = false;
      }
    });
    
    if (allCorrect && finalCount === 107) {
      logger.info('🎉 Database matches official NIST CSF 2.0 specification!');
    } else {
      throw new Error('Database does not match official specification');
    }
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npm run cleanup:subcategories

Removes incorrect subcategories to match official NIST CSF 2.0 specification.

Expected result: Exactly 107 subcategories total
- GOVERN (GV): 31 subcategories
- IDENTIFY (ID): 22 subcategories  
- PROTECT (PR): 32 subcategories
- DETECT (DE): 11 subcategories
- RESPOND (RS): 9 subcategories
- RECOVER (RC): 10 subcategories

Examples:
  npm run cleanup:subcategories
  tsx scripts/cleanup-subcategories.ts
  `);
  process.exit(0);
}

// Run the cleanup
async function main() {
  const cleanup = new SubcategoryCleanup();
  const success = await cleanup.cleanup();
  
  if (success) {
    await cleanup.verifyFinalState();
  }
  
  closeDatabase();
  logger.info('🔐 Database connection closed');
  
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  logger.error('💥 Cleanup script failed:', error);
  closeDatabase();
  process.exit(1);
});