#!/usr/bin/env npx tsx
/**
 * Fixed Framework Import Script
 * Handles duplicates and malformed data properly
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

async function importFramework() {
  logger.info('🚀 Starting NIST CSF 2.0 framework import (fixed version)...');
  
  try {
    const db = getDatabase();
    const frameworkData = JSON.parse(readFileSync('./data/csf-2.0-framework.json', 'utf-8'));
    const elements = frameworkData.response.elements.elements;
    
    logger.info(`📊 Loaded ${elements.length} framework elements from JSON`);
    
    // Disable foreign key constraints during import
    db.prepare('PRAGMA foreign_keys = OFF').run();
    
    // Begin transaction
    db.prepare('BEGIN TRANSACTION').run();
    
    try {
      // Clear existing data
      logger.info('🧹 Clearing existing framework data...');
      db.prepare('DELETE FROM subcategories').run();
      db.prepare('DELETE FROM categories').run(); 
      db.prepare('DELETE FROM functions').run();
      
      // 1. Import Functions (should be exactly 6 unique ones)
      const allFunctions = elements.filter((e: CSFElement) => e.element_type === 'function');
      const uniqueFunctions = Array.from(
        new Map(allFunctions.map(f => [f.element_identifier, f])).values()
      );
      
      logger.info(`📝 Importing ${uniqueFunctions.length} unique functions...`);
      
      const insertFunction = db.prepare(`INSERT INTO functions (id, name, description) VALUES (?, ?, ?)`);
      uniqueFunctions.forEach((f: CSFElement) => {
        try {
          insertFunction.run(f.element_identifier, f.title, f.text);
          logger.info(`  ✅ ${f.element_identifier}: ${f.title}`);
        } catch (err) {
          logger.error(`  ❌ Failed to insert function ${f.element_identifier}:`, err);
        }
      });
      
      // 2. Import Categories (deduplicate)
      const allCategories = elements.filter((e: CSFElement) => e.element_type === 'category');
      const uniqueCategories = Array.from(
        new Map(allCategories.map(c => [c.element_identifier, c])).values()
      );
      
      logger.info(`📝 Importing ${uniqueCategories.length} unique categories (from ${allCategories.length} total)...`);
      
      const insertCategory = db.prepare(`INSERT INTO categories (id, function_id, name, description) VALUES (?, ?, ?, ?)`);
      let categoryImportCount = 0;
      
      uniqueCategories.forEach((c: CSFElement) => {
        const functionId = c.element_identifier.split('.')[0];
        
        // Check if function exists
        const functionExists = db.prepare('SELECT COUNT(*) as count FROM functions WHERE id = ?').get(functionId) as { count: number };
        
        if (functionExists.count > 0) {
          try {
            insertCategory.run(c.element_identifier, functionId, c.title, c.text);
            categoryImportCount++;
            logger.info(`  ✅ ${c.element_identifier}: ${c.title}`);
          } catch (err) {
            logger.error(`  ❌ Failed to insert category ${c.element_identifier}:`, err);
          }
        } else {
          logger.warn(`  ⚠️  Skipping category ${c.element_identifier} - function ${functionId} not found`);
        }
      });
      
      logger.info(`✅ Imported ${categoryImportCount} categories`);
      
      // 3. Import Subcategories (deduplicate)
      const allSubcategories = elements.filter((e: CSFElement) => e.element_type === 'subcategory');
      const uniqueSubcategories = Array.from(
        new Map(allSubcategories.map(s => [s.element_identifier, s])).values()
      );
      
      logger.info(`📝 Importing ${uniqueSubcategories.length} unique subcategories (from ${allSubcategories.length} total)...`);
      
      const insertSubcategory = db.prepare(`INSERT INTO subcategories (id, category_id, name, description) VALUES (?, ?, ?, ?)`);
      let subcategoryImportCount = 0;
      
      uniqueSubcategories.forEach((s: CSFElement) => {
        // Extract category ID (e.g., GV.OC-01 -> GV.OC)
        const categoryId = s.element_identifier.substring(0, s.element_identifier.lastIndexOf('-'));
        
        // Check if category exists
        const categoryExists = db.prepare('SELECT COUNT(*) as count FROM categories WHERE id = ?').get(categoryId) as { count: number };
        
        if (categoryExists.count > 0) {
          try {
            insertSubcategory.run(s.element_identifier, categoryId, s.title || '', s.text);
            subcategoryImportCount++;
            if (subcategoryImportCount <= 5) {
              logger.info(`  ✅ ${s.element_identifier}: ${s.title || '(no title)'}`);
            } else if (subcategoryImportCount === 6) {
              logger.info(`  ... (showing first 5, continuing import)`);
            }
          } catch (err) {
            logger.error(`  ❌ Failed to insert subcategory ${s.element_identifier}:`, err);
          }
        } else {
          logger.warn(`  ⚠️  Skipping subcategory ${s.element_identifier} - category ${categoryId} not found`);
        }
      });
      
      logger.info(`✅ Imported ${subcategoryImportCount} subcategories`);
      
      // Commit transaction
      db.prepare('COMMIT').run();
      
      // Re-enable foreign key constraints
      db.prepare('PRAGMA foreign_keys = ON').run();
      
      // Final count verification
      const finalCounts = {
        functions: db.prepare('SELECT COUNT(*) as count FROM functions').get() as { count: number },
        categories: db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number },
        subcategories: db.prepare('SELECT COUNT(*) as count FROM subcategories').get() as { count: number }
      };
      
      logger.info(`🎉 Framework import completed successfully:
        📊 Functions: ${finalCounts.functions.count}
        📊 Categories: ${finalCounts.categories.count}  
        📊 Subcategories: ${finalCounts.subcategories.count}`);
        
      // Basic validation
      if (finalCounts.functions.count !== 6) {
        logger.warn(`⚠️  Expected 6 functions, got ${finalCounts.functions.count}`);
      }
      if (finalCounts.subcategories.count < 100) {
        logger.warn(`⚠️  Only ${finalCounts.subcategories.count} subcategories - may be incomplete`);
      } else {
        logger.info('✅ Framework import validation passed - good subcategory count');
      }
      
    } catch (error) {
      db.prepare('ROLLBACK').run();
      db.prepare('PRAGMA foreign_keys = ON').run();
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

importFramework().catch((error) => {
  logger.error('💥 Script failed:', error);
  process.exit(1);
});