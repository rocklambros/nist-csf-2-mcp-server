#!/usr/bin/env npx tsx
/**
 * Complete Framework Import Script
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

interface CSFFrameworkData {
  response: {
    elements: {
      elements: CSFElement[];
    };
  };
}

async function importCompleteFramework() {
  logger.info('Starting complete framework import...');
  
  try {
    const db = getDatabase();
    
    // Check if framework file exists
    const frameworkPath = './data/csf-2.0-framework.json';
    try {
      const frameworkData: CSFFrameworkData = JSON.parse(
        readFileSync(frameworkPath, 'utf-8')
      );
      logger.info('Framework JSON loaded, beginning database import...');
      
      // Begin transaction
      db.prepare('BEGIN TRANSACTION').run();
      
      try {
        // Clear existing data in reverse dependency order
        logger.info('Clearing existing framework data...');
        db.prepare('DELETE FROM subcategories').run();
        db.prepare('DELETE FROM categories').run(); 
        db.prepare('DELETE FROM functions').run();
      
      const elements = frameworkData.response.elements.elements;
      logger.info(`Processing ${elements.length} framework elements...`);
      
      // Import Functions
      const functions = elements.filter(e => e.element_type === 'function');
      const insertFunction = db.prepare(`
        INSERT OR REPLACE INTO functions (id, name, description) VALUES (?, ?, ?)
      `);
      
      functions.forEach(f => {
        insertFunction.run(f.element_identifier, f.title, f.text);
      });
      logger.info(`Imported ${functions.length} functions`);
      
      // Import Categories  
      const categories = elements.filter(e => e.element_type === 'category');
      const insertCategory = db.prepare(`
        INSERT OR REPLACE INTO categories (id, function_id, name, description) VALUES (?, ?, ?, ?)
      `);
      
      categories.forEach(c => {
        const functionId = c.element_identifier.split('.')[0];
        insertCategory.run(c.element_identifier, functionId, c.title, c.text);
      });
      logger.info(`Imported ${categories.length} categories`);
      
      // Import Subcategories
      const subcategories = elements.filter(e => e.element_type === 'subcategory');
      const insertSubcategory = db.prepare(`
        INSERT OR REPLACE INTO subcategories (id, category_id, name, description) VALUES (?, ?, ?, ?)
      `);
      
      subcategories.forEach(s => {
        // Extract category ID from subcategory ID (e.g., GV.OC-01 -> GV.OC)
        const categoryId = s.element_identifier.substring(0, s.element_identifier.lastIndexOf('-'));
        insertSubcategory.run(s.element_identifier, categoryId, s.title || '', s.text);
      });
      logger.info(`Imported ${subcategories.length} subcategories`);
      
      // Commit transaction
      db.prepare('COMMIT').run();
      
      // Verify import
      const functionCount = db.prepare('SELECT COUNT(*) as count FROM functions').get() as { count: number };
      const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
      const subcategoryCount = db.prepare('SELECT COUNT(*) as count FROM subcategories').get() as { count: number };
      
      logger.info(`Framework import completed successfully:
        - Functions: ${functionCount.count}
        - Categories: ${categoryCount.count}  
        - Subcategories: ${subcategoryCount.count}`);
        
      // Validation checks
      if (functionCount.count < 6) {
        throw new Error(`Expected at least 6 functions, got ${functionCount.count}`);
      }
      if (subcategoryCount.count < 100) {
        throw new Error(`Expected at least 100 subcategories, got ${subcategoryCount.count}`);
      }
      
      logger.info('✅ Framework import validation passed');
      
    } catch (error) {
      // Rollback transaction on error
      db.prepare('ROLLBACK').run();
      throw error;
    }
      
  } catch (error) {
    logger.error('Framework import failed:', error);
    throw error;
  } finally {
    closeDatabase();
    logger.info('Database connection closed');
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
  logger.error('Script failed:', error);
  process.exit(1);
});