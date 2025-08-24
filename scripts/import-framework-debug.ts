#!/usr/bin/env npx tsx
/**
 * Debug Framework Import Script
 * Tests framework import with detailed logging
 */

import { readFileSync } from 'fs';
import { getDatabase, closeDatabase } from '../src/db/database.js';
import { logger } from '../src/utils/enhanced-logger.js';

async function debugFrameworkImport() {
  logger.info('Starting debug framework import...');
  
  try {
    const db = getDatabase();
    const frameworkData = JSON.parse(readFileSync('./data/csf-2.0-framework.json', 'utf-8'));
    
    const elements = frameworkData.response.elements.elements;
    logger.info(`Loaded ${elements.length} total elements`);
    
    // Count by type
    const byType: Record<string, number> = {};
    elements.forEach((e: any) => byType[e.element_type] = (byType[e.element_type] || 0) + 1);
    logger.info('Element counts by type:', byType);
    
    // Test inserting just functions first
    const functions = elements.filter((e: any) => e.element_type === 'function');
    logger.info(`Found ${functions.length} functions:`, functions.map((f: any) => f.element_identifier));
    
    // Disable foreign key constraints during import
    db.prepare('PRAGMA foreign_keys = OFF').run();
    
    // Clear and insert functions
    db.prepare('DELETE FROM functions').run();
    const insertFunction = db.prepare(`INSERT OR REPLACE INTO functions (id, name, description) VALUES (?, ?, ?)`);
    
    functions.forEach((f: any) => {
      logger.info(`Inserting function: ${f.element_identifier} - ${f.title}`);
      try {
        insertFunction.run(f.element_identifier, f.title, f.text);
      } catch (err) {
        logger.error(`Failed to insert function ${f.element_identifier}:`, err);
        throw err;
      }
    });
    
    // Re-enable foreign key constraints
    db.prepare('PRAGMA foreign_keys = ON').run();
    
    // Verify functions
    const count = db.prepare('SELECT COUNT(*) as count FROM functions').get() as { count: number };
    logger.info(`✅ Successfully inserted ${count.count} functions`);
    
  } catch (error) {
    logger.error('Debug import failed:', error);
    throw error;
  } finally {
    closeDatabase();
  }
}

debugFrameworkImport().catch(console.error);