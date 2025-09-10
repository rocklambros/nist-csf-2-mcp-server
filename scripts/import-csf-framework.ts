#!/usr/bin/env npx tsx
/**
 * NIST CSF 2.0 Framework Import Script - CSV Based
 * Uses definitive nist_csf_function_category_subcategory_only.csv
 * Ensures clean, official NIST CSF 2.0 framework data
 */

import { readFileSync } from 'fs';
import { getDatabase, closeDatabase } from '../src/db/database.js';
import { logger } from '../src/utils/enhanced-logger.js';

interface CSVRow {
  function: string;
  category: string;
  subcategory: string;
}

class CSFFrameworkImporter {
  private db: any;
  
  constructor() {
    this.db = getDatabase();
  }

  async importFramework(): Promise<boolean> {
    try {
      logger.info('🚀 Starting NIST CSF 2.0 Framework Import from CSV');
      
      // Clear existing data
      await this.clearExistingData();
      
      // Import from CSV
      const csvPath = './nist_csf_function_category_subcategory_only.csv';
      const results = await this.importFromCSV(csvPath);
      
      logger.info('📊 FINAL IMPORT REPORT');
      logger.info('==================================================');
      logger.info(`📊 FUNCTIONS: ${results.functions} imported`);
      logger.info(`📊 CATEGORIES: ${results.categories} imported`);
      logger.info(`📊 SUBCATEGORIES: ${results.subcategories} imported`);
      logger.info('');
      logger.info('🎉 IMPORT COMPLETED SUCCESSFULLY!');
      logger.info('✅ Official NIST CSF 2.0 framework loaded from CSV');
      
      return true;
      
    } catch (error) {
      logger.error('💥 Framework import failed:', error);
      return false;
    }
  }

  private async clearExistingData(): Promise<void> {
    logger.info('🧹 Clearing existing framework data...');
    
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

  private async importFromCSV(csvPath: string) {
    logger.info(`📁 Loading CSV framework: ${csvPath}`);
    
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    const header = lines[0];
    
    const functions = new Map();
    const categories = new Map();
    const subcategories = new Map();
    
    // Parse CSV data (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const row = this.parseCSVLine(line);
      if (!row) continue;
      
      // Extract function info
      const funcMatch = row.function.match(/\(([A-Z]{2})\)/);
      if (funcMatch) {
        const functionId = funcMatch[1];
        const functionName = row.function.split('(')[0].trim();
        functions.set(functionId, {
          id: functionId,
          name: functionName,
          description: row.function
        });
      }
      
      // Extract category info
      const catMatch = row.category.match(/\(([A-Z]{2}\.[A-Z]{2})\)/);
      if (catMatch) {
        const categoryId = catMatch[1];
        const categoryName = row.category.split('(')[0].trim();
        categories.set(categoryId, {
          id: categoryId,
          function_id: categoryId.substring(0, 2),
          name: categoryName,
          description: row.category
        });
      }
      
      // Extract subcategory info
      const subcatMatch = row.subcategory.match(/^([A-Z]{2}\.[A-Z]{2}-\d{2}): (.+)$/);
      if (subcatMatch) {
        const subcategoryId = subcatMatch[1];
        const subcategoryDesc = subcatMatch[2];
        subcategories.set(subcategoryId, {
          id: subcategoryId,
          category_id: subcategoryId.substring(0, 5), // GV.OC from GV.OC-01
          description: subcategoryDesc
        });
      }
    }
    
    logger.info(`📊 Parsed: ${functions.size} functions, ${categories.size} categories, ${subcategories.size} subcategories`);
    
    // Insert functions
    const insertFunction = this.db.prepare(`
      INSERT INTO functions (id, name, description, created_at) 
      VALUES (?, ?, ?, ?)
    `);
    
    for (const func of functions.values()) {
      insertFunction.run(func.id, func.name, func.description, new Date().toISOString());
      logger.info(`  ✅ ${func.id}: ${func.name}`);
    }
    
    // Insert categories
    const insertCategory = this.db.prepare(`
      INSERT INTO categories (id, function_id, name, description, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const cat of categories.values()) {
      insertCategory.run(cat.id, cat.function_id, cat.name, cat.description, new Date().toISOString());
      logger.info(`  ✅ ${cat.id}: ${cat.name}`);
    }
    
    // Insert subcategories
    const insertSubcategory = this.db.prepare(`
      INSERT INTO subcategories (id, category_id, name, description, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    for (const subcat of subcategories.values()) {
      insertSubcategory.run(subcat.id, subcat.category_id, '', subcat.description, new Date().toISOString());
    }
    
    logger.info(`✅ subcategory import completed: ${subcategories.size}/${subcategories.size} successful`);
    
    return {
      functions: functions.size,
      categories: categories.size,
      subcategories: subcategories.size
    };
  }

  private parseCSVLine(line: string): CSVRow | null {
    try {
      // Simple CSV parsing for quoted fields
      const fields = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      fields.push(current.trim()); // Add last field
      
      if (fields.length >= 3) {
        return {
          function: fields[0].replace(/^"|"$/g, ''),
          category: fields[1].replace(/^"|"$/g, ''),
          subcategory: fields[2].replace(/^"|"$/g, '')
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to parse CSV line:', line, error);
      return null;
    }
  }
}

async function main() {
  try {
    const importer = new CSVFrameworkImporter();
    const success = await importer.importFramework();
    
    if (success) {
      logger.info('✅ Framework ready for operational use');
      process.exit(0);
    } else {
      logger.error('❌ Framework import failed');
      process.exit(1);
    }
  } catch (error) {
    logger.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

// Run import
main().catch(console.error);