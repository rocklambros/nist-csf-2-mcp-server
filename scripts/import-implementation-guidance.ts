#!/usr/bin/env npx tsx
/**
 * Implementation Guidance Import Script
 * Imports practical implementation guidance for NIST CSF 2.0 subcategories
 */

import { readFileSync } from 'fs';
import { getDatabase, closeDatabase } from '../src/db/database.js';
import { logger } from '../src/utils/enhanced-logger.js';

interface GuidanceEntry {
  subcategory_id: string;
  subcategory_name: string;
  quick_wins: string[];
  implementation_steps: string[];
  tools_and_resources: string[];
  success_metrics: string[];
  common_pitfalls: string[];
  effort_estimate: 'Small' | 'Medium' | 'Large';
  cost_estimate: 'Low' | 'Medium' | 'High';
  prerequisites: string[];
}

interface GuidanceData {
  metadata: {
    version: string;
    created_date: string;
    description: string;
    guidance_format: any;
  };
  guidance: GuidanceEntry[];
}

interface ImportStats {
  processed: number;
  updated: number;
  failed: number;
  skipped: number;
}

class ImplementationGuidanceImporter {
  private db: any;
  private guidanceData: GuidanceData | null = null;
  
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Main import process
   */
  async importGuidance(): Promise<boolean> {
    logger.info('🚀 Starting Implementation Guidance Import');
    logger.info('📁 Source: implementation-guidance.json');

    try {
      // Load guidance data
      await this.loadGuidanceFile();
      
      // Begin transaction
      this.db.prepare('BEGIN TRANSACTION').run();
      
      try {
        // Import all guidance entries
        const importResults = await this.importAllGuidance();
        
        // Validate import
        const validationResults = await this.validateImport();
        
        // Commit transaction
        this.db.prepare('COMMIT').run();
        
        // Generate report
        this.generateFinalReport(importResults, validationResults);
        
        return validationResults.success;
        
      } catch (error) {
        this.db.prepare('ROLLBACK').run();
        throw error;
      }
      
    } catch (error) {
      logger.error('💥 Implementation guidance import failed:', error);
      return false;
    }
  }

  /**
   * Load and validate guidance JSON file
   */
  private async loadGuidanceFile(): Promise<void> {
    const guidancePath = './implementation-guidance.json';
    
    try {
      logger.info('📖 Loading implementation guidance file...');
      const fileContent = readFileSync(guidancePath, 'utf-8');
      this.guidanceData = JSON.parse(fileContent);
      
      if (!this.guidanceData?.guidance) {
        throw new Error('Invalid guidance file structure - missing guidance array');
      }
      
      const guidanceCount = this.guidanceData.guidance.length;
      const version = this.guidanceData.metadata?.version || 'unknown';
      
      logger.info(`✅ Guidance file loaded successfully`);
      logger.info(`📊 Version: ${version}`);
      logger.info(`📊 Guidance entries: ${guidanceCount}`);
      
    } catch (error) {
      throw new Error(`Failed to load guidance file '${guidancePath}': ${error}`);
    }
  }

  /**
   * Import all guidance entries
   */
  private async importAllGuidance(): Promise<ImportStats> {
    if (!this.guidanceData) throw new Error('Guidance data not loaded');
    
    const stats: ImportStats = { processed: 0, updated: 0, failed: 0, skipped: 0 };
    
    const updateStmt = this.db.prepare(`
      UPDATE subcategories 
      SET implementation_guidance = ?
      WHERE id = ?
    `);
    
    const checkStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM subcategories WHERE id = ?
    `);

    logger.info(`\n📝 Processing ${this.guidanceData.guidance.length} guidance entries...`);
    
    for (const entry of this.guidanceData.guidance) {
      stats.processed++;
      
      try {
        // Verify subcategory exists
        const exists = checkStmt.get(entry.subcategory_id) as { count: number };
        if (exists.count === 0) {
          stats.failed++;
          logger.warn(`  ⚠️  Subcategory ${entry.subcategory_id} not found in database`);
          continue;
        }
        
        // Format guidance as structured JSON
        const guidanceJson = this.formatGuidance(entry);
        
        // Update subcategory with guidance
        updateStmt.run(guidanceJson, entry.subcategory_id);
        stats.updated++;
        
        logger.info(`  ✅ ${entry.subcategory_id}: Implementation guidance added`);
        
      } catch (error) {
        stats.failed++;
        logger.error(`  ❌ Failed to import guidance for ${entry.subcategory_id}:`, error);
      }
    }
    
    logger.info(`\n✅ Guidance import completed: ${stats.updated}/${stats.processed} successful`);
    
    return stats;
  }

  /**
   * Format guidance entry as structured JSON for database storage
   */
  private formatGuidance(entry: GuidanceEntry): string {
    const guidance = {
      quick_wins: entry.quick_wins,
      implementation_steps: entry.implementation_steps,
      tools_and_resources: entry.tools_and_resources,
      success_metrics: entry.success_metrics,
      common_pitfalls: entry.common_pitfalls,
      effort_estimate: entry.effort_estimate,
      cost_estimate: entry.cost_estimate,
      prerequisites: entry.prerequisites,
      last_updated: new Date().toISOString()
    };
    
    return JSON.stringify(guidance, null, 2);
  }

  /**
   * Validate import completeness
   */
  private async validateImport(): Promise<{ success: boolean; details: any }> {
    logger.info('\n🔍 Validating guidance import...');
    
    const totalSubcategories = this.db.prepare('SELECT COUNT(*) as count FROM subcategories').get() as { count: number };
    const withGuidance = this.db.prepare('SELECT COUNT(*) as count FROM subcategories WHERE implementation_guidance IS NOT NULL AND length(implementation_guidance) > 0').get() as { count: number };
    
    const coverage = (withGuidance.count / totalSubcategories.count * 100).toFixed(1);
    
    logger.info(`  📊 Total subcategories: ${totalSubcategories.count}`);
    logger.info(`  📊 With guidance: ${withGuidance.count}`);
    logger.info(`  📊 Coverage: ${coverage}%`);
    
    const success = withGuidance.count > 0;
    
    if (success) {
      logger.info('  ✅ Implementation guidance import validation passed');
    } else {
      logger.error('  ❌ No implementation guidance was imported');
    }
    
    return {
      success,
      details: {
        total: totalSubcategories.count,
        with_guidance: withGuidance.count,
        coverage: coverage
      }
    };
  }

  /**
   * Generate final import report
   */
  private generateFinalReport(importStats: ImportStats, validation: any): void {
    logger.info('\n📋 IMPLEMENTATION GUIDANCE IMPORT REPORT');
    logger.info('==================================================');
    logger.info(`📊 PROCESSING SUMMARY:`);
    logger.info(`   Processed: ${importStats.processed}`);
    logger.info(`   Updated:   ${importStats.updated}`);
    logger.info(`   Failed:    ${importStats.failed}`);
    logger.info(`   Skipped:   ${importStats.skipped}`);
    logger.info(`\n📊 DATABASE COVERAGE:`);
    logger.info(`   Total subcategories: ${validation.details.total}`);
    logger.info(`   With guidance:       ${validation.details.with_guidance}`);
    logger.info(`   Coverage:           ${validation.details.coverage}%`);
    
    if (validation.success) {
      logger.info('\n🎉 IMPLEMENTATION GUIDANCE IMPORT COMPLETED SUCCESSFULLY!');
    } else {
      logger.error('\n💥 IMPLEMENTATION GUIDANCE IMPORT FAILED!');
    }
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npm run import:guidance

Imports practical implementation guidance for NIST CSF 2.0 subcategories from implementation-guidance.json

The guidance file should contain structured implementation advice including:
- Quick wins (immediate actions)
- Implementation steps (detailed process)
- Tools and resources needed
- Success metrics
- Common pitfalls
- Effort and cost estimates
- Prerequisites

Examples:
  npm run import:guidance
  tsx scripts/import-implementation-guidance.ts
  `);
  process.exit(0);
}

// Run the import
async function main() {
  const importer = new ImplementationGuidanceImporter();
  const success = await importer.importGuidance();
  
  closeDatabase();
  logger.info('🔐 Database connection closed');
  
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  logger.error('💥 Import script failed:', error);
  closeDatabase();
  process.exit(1);
});