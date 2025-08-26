#!/usr/bin/env tsx

/**
 * Add Implementation Examples Column Migration
 * 
 * Adds the implementation_examples column to the subcategories table
 */

import { getDatabase, closeDatabase } from '../src/db/database.js';

async function main(): Promise<void> {
  console.log('🚀 Adding implementation_examples column to subcategories table\n');
  
  try {
    const db = getDatabase();
    
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info(subcategories)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;
    
    const hasColumn = tableInfo.some(col => col.name === 'implementation_examples');
    
    if (hasColumn) {
      console.log('✅ Column implementation_examples already exists');
      return;
    }
    
    // Add the implementation_examples column
    console.log('📝 Adding implementation_examples column...');
    db.prepare(`
      ALTER TABLE subcategories 
      ADD COLUMN implementation_examples TEXT
    `).run();
    
    console.log('✅ Successfully added implementation_examples column');
    
    // Verify the column was added
    const newTableInfo = db.prepare("PRAGMA table_info(subcategories)").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;
    
    console.log('\n📊 Current subcategories table schema:');
    newTableInfo.forEach(col => {
      console.log(`   ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', (error as Error).message);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;