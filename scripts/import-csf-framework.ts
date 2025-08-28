#!/usr/bin/env npx tsx
/**
 * NIST CSF 2.0 Framework Import Script
 * Imports complete framework from csf-2.0-framework.json in project root
 * Handles duplicates, validates data integrity, and provides comprehensive reporting
 */

import { readFileSync } from 'fs';
import { getDatabase, closeDatabase } from '../src/db/database.js';
import { logger } from '../src/utils/enhanced-logger.js';

interface CSFElement {
  doc_identifier: string;
  element_identifier: string;
  element_type: string;
  text: string;
  title: string;
}

interface CSFFrameworkData {
  response: {
    elements: {
      documents: Array<{
        doc_identifier: string;
        name: string;
        version: string;
        website: string;
      }>;
      elements: CSFElement[];
    };
  };
}

interface ImportStats {
  processed: number;
  imported: number;
  skipped: number;
  failed: number;
}

class CSFFrameworkImporter {
  private db: any;
  private frameworkData: CSFFrameworkData | null = null;
  
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Main import process
   */
  async importFramework(): Promise<boolean> {
    logger.info('🚀 Starting NIST CSF 2.0 Framework Import');
    logger.info('📁 Source: csf-2.0-framework.json (project root)');

    try {
      // Load and validate framework file
      await this.loadFrameworkFile();
      
      // Disable foreign keys during import
      this.db.prepare('PRAGMA foreign_keys = OFF').run();
      
      // Begin transaction
      this.db.prepare('BEGIN TRANSACTION').run();
      
      try {
        // Clear existing framework data
        await this.clearExistingData();
        
        // Import all framework elements
        const importResults = await this.importAllElements();
        
        // Validate import completeness
        const validationResults = await this.validateImport();
        
        // Commit transaction
        this.db.prepare('COMMIT').run();
        
        // Re-enable foreign keys
        this.db.prepare('PRAGMA foreign_keys = ON').run();
        
        // Generate final report
        this.generateFinalReport(importResults, validationResults);
        
        return validationResults.success;
        
      } catch (error) {
        // Rollback on any error
        this.db.prepare('ROLLBACK').run();
        this.db.prepare('PRAGMA foreign_keys = ON').run();
        throw error;
      }
      
    } catch (error) {
      logger.error('💥 Framework import failed:', error);
      return false;
    }
  }

  /**
   * Load and validate framework JSON file
   */
  private async loadFrameworkFile(): Promise<void> {
    const frameworkPath = './data/csf-2.0-framework.json';
    
    try {
      logger.info('📖 Loading framework file...');
      const fileContent = readFileSync(frameworkPath, 'utf-8');
      this.frameworkData = JSON.parse(fileContent);
      
      if (!this.frameworkData?.response?.elements) {
        throw new Error('Invalid framework file structure - missing response.elements');
      }
      
      const elementCount = this.frameworkData.response.elements.elements.length;
      const documentInfo = this.frameworkData.response.elements.documents[0];
      
      logger.info(`✅ Framework file loaded successfully`);
      logger.info(`📊 Document: ${documentInfo?.name} v${documentInfo?.version}`);
      logger.info(`📊 Total elements: ${elementCount}`);
      
      // Count elements by type
      const elementCounts: Record<string, number> = {};
      this.frameworkData.response.elements.elements.forEach(element => {
        elementCounts[element.element_type] = (elementCounts[element.element_type] || 0) + 1;
      });
      
      logger.info('📊 Element breakdown:', elementCounts);
      
    } catch (error) {
      throw new Error(`Failed to load framework file '${frameworkPath}': ${error}`);
    }
  }

  /**
   * Clear existing framework data
   */
  private async clearExistingData(): Promise<void> {
    logger.info('🧹 Clearing existing framework data...');
    
    // Clear in dependency order
    const clearQueries = [
      'DELETE FROM subcategories',
      'DELETE FROM categories', 
      'DELETE FROM functions'
    ];
    
    clearQueries.forEach(query => {
      const result = this.db.prepare(query).run();
      logger.info(`   Cleared ${result.changes} records from ${query.split(' ')[2]}`);
    });
  }

  /**
   * Import all framework elements with duplicate handling
   */
  private async importAllElements(): Promise<Record<string, ImportStats>> {
    if (!this.frameworkData) throw new Error('Framework data not loaded');
    
    const elements = this.frameworkData.response.elements.elements;
    const results: Record<string, ImportStats> = {};
    
    // Import in dependency order: functions -> categories -> subcategories
    const importOrder = [
      { type: 'function', handler: this.importFunctions.bind(this) },
      { type: 'category', handler: this.importCategories.bind(this) },
      { type: 'subcategory', handler: this.importSubcategories.bind(this) }
    ];
    
    for (const { type, handler } of importOrder) {
      const typeElements = elements.filter(e => e.element_type === type);
      logger.info(`\n📝 Importing ${typeElements.length} ${type} elements...`);
      
      results[type] = await handler(typeElements);
      
      logger.info(`✅ ${type} import completed: ${results[type].imported}/${results[type].processed} successful`);
      if (results[type].skipped > 0) {
        logger.info(`⚠️  Skipped ${results[type].skipped} duplicates`);
      }
      if (results[type].failed > 0) {
        logger.warn(`❌ Failed ${results[type].failed} imports`);
      }
    }
    
    return results;
  }

  /**
   * Import functions with duplicate detection
   */
  private async importFunctions(functions: CSFElement[]): Promise<ImportStats> {
    const stats: ImportStats = { processed: 0, imported: 0, skipped: 0, failed: 0 };
    
    const insertStmt = this.db.prepare(`
      INSERT INTO functions (id, name, description) VALUES (?, ?, ?)
    `);
    
    const checkStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM functions WHERE id = ?
    `);
    
    // Deduplicate by element_identifier, preferring entries with more complete data
    const uniqueFunctions = new Map<string, CSFElement>();
    functions.forEach(f => {
      const existing = uniqueFunctions.get(f.element_identifier);
      if (!existing || (f.text && f.text.length > (existing.text?.length || 0))) {
        uniqueFunctions.set(f.element_identifier, f);
      }
    });
    
    for (const func of uniqueFunctions.values()) {
      stats.processed++;
      
      try {
        // Check for existing function
        const existing = checkStmt.get(func.element_identifier) as { count: number };
        if (existing.count > 0) {
          stats.skipped++;
          continue;
        }
        
        // Insert new function (handle missing text field)
        const description = func.text || func.title || 'No description available';
        insertStmt.run(func.element_identifier, func.title, description);
        stats.imported++;
        
        logger.info(`  ✅ ${func.element_identifier}: ${func.title}`);
        
      } catch (error) {
        stats.failed++;
        logger.error(`  ❌ Failed to import function ${func.element_identifier}:`, error);
      }
    }
    
    return stats;
  }

  /**
   * Import categories with duplicate detection and parent validation
   */
  private async importCategories(categories: CSFElement[]): Promise<ImportStats> {
    const stats: ImportStats = { processed: 0, imported: 0, skipped: 0, failed: 0 };
    
    const insertStmt = this.db.prepare(`
      INSERT INTO categories (id, function_id, name, description) VALUES (?, ?, ?, ?)
    `);
    
    const checkStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM categories WHERE id = ?
    `);
    
    const functionExistsStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM functions WHERE id = ?
    `);
    
    // Deduplicate by element_identifier, preferring entries with more complete data
    const uniqueCategories = new Map<string, CSFElement>();
    categories.forEach(c => {
      const existing = uniqueCategories.get(c.element_identifier);
      if (!existing || (c.text && c.text.length > (existing.text?.length || 0))) {
        uniqueCategories.set(c.element_identifier, c);
      }
    });
    
    for (const category of uniqueCategories.values()) {
      stats.processed++;
      
      try {
        // Check for existing category
        const existing = checkStmt.get(category.element_identifier) as { count: number };
        if (existing.count > 0) {
          stats.skipped++;
          continue;
        }
        
        // Extract function ID and validate parent exists
        const functionId = category.element_identifier.split('.')[0];
        const functionExists = functionExistsStmt.get(functionId) as { count: number };
        
        if (functionExists.count === 0) {
          stats.failed++;
          logger.warn(`  ⚠️  Skipping category ${category.element_identifier} - parent function ${functionId} not found`);
          continue;
        }
        
        // Insert new category (handle missing text field)
        const description = category.text || category.title || 'No description available';
        insertStmt.run(category.element_identifier, functionId, category.title, description);
        stats.imported++;
        
        logger.info(`  ✅ ${category.element_identifier}: ${category.title}`);
        
      } catch (error) {
        stats.failed++;
        logger.error(`  ❌ Failed to import category ${category.element_identifier}:`);
        logger.error(`     Function ID: ${functionId}, Title: "${category.title}"`);
        logger.error(`     Error details:`, error);
        logger.error(`     SQL: INSERT INTO categories (id, function_id, name, description) VALUES ('${category.element_identifier}', '${functionId}', '${category.title}', '...')`);
      }
    }
    
    return stats;
  }

  /**
   * Import subcategories with duplicate detection and parent validation
   */
  private async importSubcategories(subcategories: CSFElement[]): Promise<ImportStats> {
    const stats: ImportStats = { processed: 0, imported: 0, skipped: 0, failed: 0 };
    
    const insertStmt = this.db.prepare(`
      INSERT INTO subcategories (id, category_id, name, description) VALUES (?, ?, ?, ?)
    `);
    
    const checkStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM subcategories WHERE id = ?
    `);
    
    const categoryExistsStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM categories WHERE id = ?
    `);
    
    // Deduplicate by element_identifier, preferring entries with more complete data
    const uniqueSubcategories = new Map<string, CSFElement>();
    subcategories.forEach(s => {
      const existing = uniqueSubcategories.get(s.element_identifier);
      if (!existing || (s.text && s.text.length > (existing.text?.length || 0))) {
        uniqueSubcategories.set(s.element_identifier, s);
      }
    });
    
    logger.info(`  📊 Processing ${uniqueSubcategories.size} unique subcategories (from ${subcategories.length} total)`);
    
    let logCount = 0;
    const maxLogEntries = 10;
    
    for (const subcategory of uniqueSubcategories.values()) {
      stats.processed++;
      
      try {
        // Check for existing subcategory
        const existing = checkStmt.get(subcategory.element_identifier) as { count: number };
        if (existing.count > 0) {
          stats.skipped++;
          continue;
        }
        
        // Extract category ID and validate parent exists
        const categoryId = subcategory.element_identifier.substring(
          0, 
          subcategory.element_identifier.lastIndexOf('-')
        );
        
        const categoryExists = categoryExistsStmt.get(categoryId) as { count: number };
        
        if (categoryExists.count === 0) {
          stats.failed++;
          if (logCount < maxLogEntries) {
            logger.warn(`  ⚠️  Skipping subcategory ${subcategory.element_identifier} - parent category ${categoryId} not found`);
            logCount++;
          } else if (logCount === maxLogEntries) {
            logger.warn(`  ⚠️  ... (suppressing further parent-not-found warnings)`);
            logCount++;
          }
          continue;
        }
        
        // Insert new subcategory (handle missing text field)
        const description = subcategory.text || subcategory.title || 'No description available';
        insertStmt.run(
          subcategory.element_identifier, 
          categoryId, 
          subcategory.title || '', 
          description
        );
        stats.imported++;
        
        if (logCount < 5) {
          logger.info(`  ✅ ${subcategory.element_identifier}: ${subcategory.title || '(no title)'}`);
          logCount++;
        } else if (logCount === 5) {
          logger.info(`  ✅ ... (continuing import, will show final count)`);
          logCount++;
        }
        
      } catch (error) {
        stats.failed++;
        logger.error(`  ❌ Failed to import subcategory ${subcategory.element_identifier}:`, error);
      }
    }
    
    return stats;
  }

  /**
   * Validate import completeness and data integrity
   */
  private async validateImport(): Promise<{ success: boolean; details: any }> {
    logger.info('\n🔍 Validating import completeness...');
    
    const validation = {
      success: true,
      details: {} as any
    };
    
    try {
      // Count imported elements
      const counts = {
        functions: this.db.prepare('SELECT COUNT(*) as count FROM functions').get() as { count: number },
        categories: this.db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number },
        subcategories: this.db.prepare('SELECT COUNT(*) as count FROM subcategories').get() as { count: number }
      };
      
      validation.details.counts = counts;
      
      // Expected minimums for NIST CSF 2.0
      const expectations = {
        functions: { min: 6, max: 6 },
        categories: { min: 20, max: 50 },
        subcategories: { min: 100, max: 350 }
      };
      
      // Validate counts
      for (const [type, expectation] of Object.entries(expectations)) {
        const count = counts[type as keyof typeof counts].count;
        const isValid = count >= expectation.min && count <= expectation.max;
        
        if (isValid) {
          logger.info(`  ✅ ${type}: ${count} (expected ${expectation.min}-${expectation.max})`);
        } else {
          logger.error(`  ❌ ${type}: ${count} (expected ${expectation.min}-${expectation.max})`);
          validation.success = false;
        }
      }
      
      // Test foreign key relationships
      const relationshipTests = [
        {
          name: 'Categories→Functions',
          query: `SELECT COUNT(*) as count FROM categories c 
                  LEFT JOIN functions f ON c.function_id = f.id 
                  WHERE f.id IS NULL`
        },
        {
          name: 'Subcategories→Categories',
          query: `SELECT COUNT(*) as count FROM subcategories s 
                  LEFT JOIN categories c ON s.category_id = c.id 
                  WHERE c.id IS NULL`
        }
      ];
      
      validation.details.relationships = {};
      
      for (const test of relationshipTests) {
        const result = this.db.prepare(test.query).get() as { count: number };
        const isValid = result.count === 0;
        
        validation.details.relationships[test.name] = {
          orphaned: result.count,
          valid: isValid
        };
        
        if (isValid) {
          logger.info(`  ✅ ${test.name}: No orphaned records`);
        } else {
          logger.error(`  ❌ ${test.name}: ${result.count} orphaned records`);
          validation.success = false;
        }
      }
      
      // Sample data verification
      const samples = {
        sampleFunction: this.db.prepare('SELECT id, name FROM functions LIMIT 1').get(),
        sampleCategory: this.db.prepare('SELECT id, name, function_id FROM categories LIMIT 1').get(),
        sampleSubcategory: this.db.prepare('SELECT id, name, category_id FROM subcategories LIMIT 1').get()
      };
      
      validation.details.samples = samples;
      logger.info('  📋 Sample data verified:', Object.keys(samples).length, 'samples collected');
      
    } catch (error) {
      logger.error('💥 Validation failed:', error);
      validation.success = false;
      validation.details.error = error;
    }
    
    return validation;
  }

  /**
   * Generate comprehensive final report
   */
  private generateFinalReport(importResults: Record<string, ImportStats>, validationResults: any): void {
    logger.info('\n📋 FINAL IMPORT REPORT');
    logger.info('=' .repeat(50));
    
    // Import summary
    let totalProcessed = 0;
    let totalImported = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    
    for (const [type, stats] of Object.entries(importResults)) {
      totalProcessed += stats.processed;
      totalImported += stats.imported;
      totalSkipped += stats.skipped;
      totalFailed += stats.failed;
      
      logger.info(`📊 ${type.toUpperCase()}:`);
      logger.info(`   Processed: ${stats.processed}`);
      logger.info(`   Imported:  ${stats.imported}`);
      logger.info(`   Skipped:   ${stats.skipped}`);
      logger.info(`   Failed:    ${stats.failed}`);
    }
    
    logger.info('\n📊 TOTALS:');
    logger.info(`   Processed: ${totalProcessed}`);
    logger.info(`   Imported:  ${totalImported}`);
    logger.info(`   Skipped:   ${totalSkipped}`);
    logger.info(`   Failed:    ${totalFailed}`);
    
    // Database counts
    logger.info('\n📊 FINAL DATABASE STATE:');
    logger.info(`   Functions:     ${validationResults.details.counts.functions.count}`);
    logger.info(`   Categories:    ${validationResults.details.counts.categories.count}`);
    logger.info(`   Subcategories: ${validationResults.details.counts.subcategories.count}`);
    
    // Success/failure status
    if (validationResults.success && totalFailed === 0) {
      logger.info('\n🎉 IMPORT COMPLETED SUCCESSFULLY!');
      logger.info('✅ All data imported and validated');
      logger.info('✅ Foreign key relationships intact');
      logger.info('✅ Framework ready for operational use');
    } else {
      logger.error('\n💥 IMPORT COMPLETED WITH ISSUES');
      if (totalFailed > 0) {
        logger.error(`❌ ${totalFailed} elements failed to import`);
      }
      if (!validationResults.success) {
        logger.error('❌ Validation checks failed');
      }
      logger.info('⚠️  Review logs above for specific issues');
    }
  }
}

// Command line interface
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
NIST CSF 2.0 Framework Import Script

Usage: npm run import:csf-framework

This script imports the complete NIST CSF 2.0 framework from csf-2.0-framework.json
in the project root directory. It handles:

- Duplicate detection and prevention
- Foreign key validation
- Transaction safety with rollback on errors  
- Comprehensive validation and reporting

The script will import:
- 6 Functions (GV, ID, PR, DE, RS, RC)
- 20+ Categories 
- 200+ Subcategories (complete NIST CSF 2.0)

Exit codes:
  0 = Import successful
  1 = Import failed
  `);
    process.exit(0);
  }

  try {
    const importer = new CSFFrameworkImporter();
    const success = await importer.importFramework();
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    logger.error('💥 Import script failed:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });
}

export default CSFFrameworkImporter;