#!/usr/bin/env tsx

/**
 * Import Implementation Examples Script
 * 
 * Parses nist-csf-implementation-examples.csv and updates the subcategories table
 * with implementation examples stored as JSON arrays.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase, closeDatabase } from '../src/db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSV file path
const CSV_FILE = path.join(__dirname, '../nist-csf-implementation-examples.csv');

/**
 * Parse CSV content into structured data
 */
function parseCSV(content: string): Map<string, string[]> {
  const lines = content.split('\n');
  const examples = new Map<string, string[]>(); // Map<subcategory_id, string[]>
  
  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line - handle commas within quoted fields
    const fields = parseCSVLine(line);
    if (fields.length < 3) continue;
    
    const subcategoryId = fields[0].trim();
    const example = fields[2].trim();
    
    if (!subcategoryId || !example) continue;
    
    // Group examples by subcategory ID
    if (!examples.has(subcategoryId)) {
      examples.set(subcategoryId, []);
    }
    examples.get(subcategoryId)!.push(example);
  }
  
  return examples;
}

/**
 * Parse a single CSV line, handling commas within quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        currentField += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      fields.push(currentField);
      currentField = '';
      i++;
    } else {
      // Regular character
      currentField += char;
      i++;
    }
  }
  
  // Add final field
  fields.push(currentField);
  
  return fields;
}

/**
 * Update subcategories table with implementation examples
 */
async function updateDatabase(examplesMap: Map<string, string[]>): Promise<{ updatedCount: number; notFoundCount: number }> {
  const db = getDatabase();
  
  console.log(`Updating ${examplesMap.size} subcategories with implementation examples...`);
  
  let updatedCount = 0;
  let notFoundCount = 0;
  
  for (const [subcategoryId, examples] of examplesMap) {
    try {
      // Check if subcategory exists
      const existingSubcategory = db.prepare(
        'SELECT id, implementation_examples FROM subcategories WHERE id = ?'
      ).get(subcategoryId) as { id: string; implementation_examples: string | null } | undefined;
      
      if (!existingSubcategory) {
        console.warn(`⚠️  Subcategory not found: ${subcategoryId}`);
        notFoundCount++;
        continue;
      }
      
      // Parse existing examples (if any)
      let existingExamples: string[] = [];
      if (existingSubcategory.implementation_examples) {
        try {
          existingExamples = JSON.parse(existingSubcategory.implementation_examples);
        } catch (error) {
          console.warn(`⚠️  Invalid JSON in existing examples for ${subcategoryId}, replacing...`);
        }
      }
      
      // Merge with new examples (avoid duplicates)
      const allExamples = [...existingExamples];
      for (const example of examples) {
        if (!allExamples.includes(example)) {
          allExamples.push(example);
        }
      }
      
      // Update the subcategory with JSON array of examples
      const updateStmt = db.prepare(`
        UPDATE subcategories 
        SET implementation_examples = ? 
        WHERE id = ?
      `);
      
      updateStmt.run(JSON.stringify(allExamples), subcategoryId);
      updatedCount++;
      
      console.log(`✅ Updated ${subcategoryId} with ${examples.length} examples (total: ${allExamples.length})`);
      
    } catch (error) {
      console.error(`❌ Error updating ${subcategoryId}:`, (error as Error).message);
    }
  }
  
  console.log(`\n📊 Import Summary:`);
  console.log(`   - Successfully updated: ${updatedCount} subcategories`);
  console.log(`   - Not found: ${notFoundCount} subcategories`);
  console.log(`   - Total examples processed: ${Array.from(examplesMap.values()).flat().length}`);
  
  return { updatedCount, notFoundCount };
}

/**
 * Validate the import results
 */
async function validateImport(): Promise<void> {
  const db = getDatabase();
  
  console.log('\n🔍 Validating import results...');
  
  // Count subcategories with implementation examples
  const withExamples = db.prepare(`
    SELECT COUNT(*) as count 
    FROM subcategories 
    WHERE implementation_examples IS NOT NULL 
    AND implementation_examples != '[]'
    AND implementation_examples != ''
  `).get() as { count: number };
  
  // Get sample of updated subcategories
  const samples = db.prepare(`
    SELECT id, 
           json_array_length(implementation_examples) as example_count,
           substr(implementation_examples, 1, 100) || '...' as sample_examples
    FROM subcategories 
    WHERE implementation_examples IS NOT NULL 
    AND implementation_examples != '[]'
    ORDER BY example_count DESC
    LIMIT 5
  `).all() as Array<{ id: string; example_count: number; sample_examples: string }>;
  
  console.log(`📈 ${withExamples.count} subcategories now have implementation examples`);
  console.log('\n🎯 Top subcategories by example count:');
  samples.forEach(sample => {
    console.log(`   ${sample.id}: ${sample.example_count} examples`);
    console.log(`   Sample: ${sample.sample_examples}`);
  });
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Implementation Examples Import\n');
  
  try {
    // Check if CSV file exists
    if (!fs.existsSync(CSV_FILE)) {
      throw new Error(`CSV file not found: ${CSV_FILE}`);
    }
    
    // Read and parse CSV file
    console.log('📖 Reading CSV file...');
    const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
    const examplesMap = parseCSV(csvContent);
    
    console.log(`📋 Parsed ${examplesMap.size} unique subcategories with examples`);
    console.log(`📝 Total examples: ${Array.from(examplesMap.values()).flat().length}\n`);
    
    // Update database
    const results = await updateDatabase(examplesMap);
    
    // Validate results
    await validateImport();
    
    console.log('\n✅ Import completed successfully!');
    
  } catch (error) {
    console.error('❌ Import failed:', (error as Error).message);
    process.exit(1);
  } finally {
    // Close database connection
    closeDatabase();
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { parseCSV, updateDatabase, validateImport };