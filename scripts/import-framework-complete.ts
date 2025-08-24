#!/usr/bin/env npx tsx
/**
 * Complete Framework Import Script - Production Version
 * Imports ALL NIST CSF 2.0 data from JSON into database
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

async function importCompleteFramework() {
  logger.info('🚀 Starting complete NIST CSF 2.0 framework import...');
  
  try {
    const db = getDatabase();
    const frameworkData = JSON.parse(readFileSync('./data/csf-2.0-framework.json', 'utf-8'));
    const elements = frameworkData.response.elements.elements;
    
    logger.info(`📊 Loaded ${elements.length} framework elements from JSON`);
    
    // Disable foreign key constraints during import
    db.prepare('PRAGMA foreign_keys = OFF').run();
    
    // Begin transaction
    const transaction = db.prepare('BEGIN TRANSACTION');
    transaction.run();
    
    try {
      // Clear existing data in reverse dependency order
      logger.info('🧹 Clearing existing framework data...');
      db.prepare('DELETE FROM subcategories').run();
      db.prepare('DELETE FROM categories').run(); 
      db.prepare('DELETE FROM functions').run();
      
      // 1. Import Functions
      const functions = elements.filter((e: CSFElement) => e.element_type === 'function');
      logger.info(`📝 Importing ${functions.length} functions...`);
      
      const insertFunction = db.prepare(`INSERT INTO functions (id, name, description) VALUES (?, ?, ?)`);
      functions.forEach((f: CSFElement) => {
        insertFunction.run(f.element_identifier, f.title, f.text);
      });
      
      const functionCount = db.prepare('SELECT COUNT(*) as count FROM functions').get() as { count: number };
      logger.info(`✅ Imported ${functionCount.count} functions`);
      
      // 2. Import Categories  
      const categories = elements.filter((e: CSFElement) => e.element_type === 'category');
      logger.info(`📝 Importing ${categories.length} categories...`);
      
      const insertCategory = db.prepare(`INSERT INTO categories (id, function_id, name, description) VALUES (?, ?, ?, ?)`);
      categories.forEach((c: CSFElement) => {
        const functionId = c.element_identifier.split('.')[0]; // Extract GV from GV.OC
        insertCategory.run(c.element_identifier, functionId, c.title, c.text);
      });
      
      const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
      logger.info(`✅ Imported ${categoryCount.count} categories`);
      
      // 3. Import Subcategories
      const subcategories = elements.filter((e: CSFElement) => e.element_type === 'subcategory');
      logger.info(`📝 Importing ${subcategories.length} subcategories...`);
      
      const insertSubcategory = db.prepare(`INSERT INTO subcategories (id, category_id, name, description) VALUES (?, ?, ?, ?)`);
      let subcategoryCount = 0;
      
      subcategories.forEach((s: CSFElement) => {
        // Extract category ID from subcategory ID (e.g., GV.OC-01 -> GV.OC)
        const categoryId = s.element_identifier.substring(0, s.element_identifier.lastIndexOf('-'));
        
        // Only import if category exists (some subcategories may reference non-existent categories)
        const categoryExists = db.prepare('SELECT COUNT(*) as count FROM categories WHERE id = ?').get(categoryId) as { count: number };
        
        if (categoryExists.count > 0) {
          insertSubcategory.run(s.element_identifier, categoryId, s.title || '', s.text);
          subcategoryCount++;
        } else {
          logger.warn(`⚠️  Skipping subcategory ${s.element_identifier} - category ${categoryId} not found`);
        }
      });
      
      logger.info(`✅ Imported ${subcategoryCount} subcategories`);
      
      // Commit transaction
      db.prepare('COMMIT').run();
      
      // Re-enable foreign key constraints
      db.prepare('PRAGMA foreign_keys = ON').run();
      
      // Final verification
      const finalFunctionCount = db.prepare('SELECT COUNT(*) as count FROM functions').get() as { count: number };
      const finalCategoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
      const finalSubcategoryCount = db.prepare('SELECT COUNT(*) as count FROM subcategories').get() as { count: number };
      
      logger.info(`🎉 Framework import completed successfully:
        📊 Functions: ${finalFunctionCount.count}
        📊 Categories: ${finalCategoryCount.count}  
        📊 Subcategories: ${finalSubcategoryCount.count}`);
        
      // Validation checks
      if (finalFunctionCount.count !== 6) {
        throw new Error(`❌ Expected 6 functions, got ${finalFunctionCount.count}`);
      }
      if (finalSubcategoryCount.count < 200) {
        logger.warn(`⚠️  Only ${finalSubcategoryCount.count} subcategories imported - some may have been skipped due to missing categories`);
      }
      
      logger.info('✅ Framework import validation passed');
      
      // Sample data verification
      const sampleFunction = db.prepare('SELECT * FROM functions LIMIT 1').get();
      const sampleCategory = db.prepare('SELECT * FROM categories LIMIT 1').get();  
      const sampleSubcategory = db.prepare('SELECT * FROM subcategories LIMIT 1').get();
      
      logger.info('📋 Sample data verification:', {
        function: sampleFunction,
        category: sampleCategory,
        subcategory: sampleSubcategory
      });
      
    } catch (error) {
      // Rollback transaction on error
      db.prepare('ROLLBACK').run();
      db.prepare('PRAGMA foreign_keys = ON').run(); // Re-enable FK constraints
      throw error;
    }
      
  } catch (error) {
    logger.error('💥 Framework import failed:', error);
    throw error;
  } finally {
    closeDatabase();
    logger.info('🔐 Database connection closed');
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npm run import:framework [options]

Options:
  --help     Show this help message

Examples:
  npm run import:framework
  `);
  process.exit(0);
}

// Run the import script
importCompleteFramework().catch((error) => {
  logger.error('💥 Script failed:', error);
  process.exit(1);
});