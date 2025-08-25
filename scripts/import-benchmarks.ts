#!/usr/bin/env tsx

/**
 * NIST CSF 2.0 Industry Benchmarks Data Import Script
 * 
 * This script imports industry benchmark data from nist_csf2_maturity_benchmark.csv
 * into the SQLite database for use by the get_industry_benchmarks MCP tool.
 */

import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CSV_FILE_PATH = path.join(__dirname, '../nist_csf2_maturity_benchmark.csv');
const DB_FILE_PATH = path.join(__dirname, '../nist_csf.db');

// Types
interface CSVRecord {
  id: string;
  industry: string;
  organization_size: string;
  csf_function: string;
  percentile_25: string;
  percentile_50: string;
  percentile_75: string;
  percentile_90: string;
  average_score: string;
  sample_size: string;
  data_year: string;
  source: string;
}

interface BenchmarkRecord {
  id: string;
  industry: string;
  organization_size: string;
  csf_function: string;
  metric_name: string;
  percentile_25: number;
  percentile_50: number;
  percentile_75: number;
  percentile_90: number;
  average_score: number;
  sample_size: number;
  data_year: number;
  source: string;
  notes: string;
}

// Organization size mapping from CSV format to database format
const SIZE_MAPPING: Record<string, string> = {
  'Small (1-100)': 'small',
  'Medium (101-1000)': 'medium', 
  'Large (1001-5000)': 'large',
  'Enterprise (5000+)': 'enterprise'
};

// Industry name mapping to standardize naming
const INDUSTRY_MAPPING: Record<string, string> = {
  'Financial Services': 'Financial Services',
  'Healthcare': 'Healthcare',
  'Manufacturing': 'Manufacturing', 
  'Retail': 'Retail',
  'Technology': 'Technology',
  'Government': 'Government',
  'Utilities': 'Energy',  // Map Utilities to Energy for consistency
  'Oil & Gas': 'Energy'   // Map Oil & Gas to Energy for consistency  
};

function parseCSV(csvContent: string): CSVRecord[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0]!.split(',').map(h => h.trim());
  const records: CSVRecord[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') continue;
    
    const values = line.split(',').map(v => v.trim());
    const record: Partial<CSVRecord> = {};
    
    headers.forEach((header, index) => {
      (record as any)[header] = values[index] || '';
    });
    
    records.push(record as CSVRecord);
  }
  
  return records;
}

function transformRecord(csvRecord: CSVRecord): BenchmarkRecord {
  const industry = INDUSTRY_MAPPING[csvRecord.industry] || csvRecord.industry;
  const organizationSize = SIZE_MAPPING[csvRecord.organization_size] || csvRecord.organization_size.toLowerCase();
  
  // Create a unique ID for the benchmark record
  const id = `${industry.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${organizationSize}_${csvRecord.csf_function.toLowerCase()}_${csvRecord.data_year || '2024'}`;
  
  return {
    id: id,
    industry: industry,
    organization_size: organizationSize,
    csf_function: csvRecord.csf_function,
    metric_name: 'maturity_score', // Default metric name
    percentile_25: parseFloat(csvRecord.percentile_25) || 0,
    percentile_50: parseFloat(csvRecord.percentile_50) || 0,
    percentile_75: parseFloat(csvRecord.percentile_75) || 0,
    percentile_90: parseFloat(csvRecord.percentile_90) || 0,
    average_score: parseFloat(csvRecord.average_score) || 0,
    sample_size: parseInt(csvRecord.sample_size) || 0,
    data_year: parseInt(csvRecord.data_year) || 2024,
    source: csvRecord.source || 'Unknown Source',
    notes: `Imported on ${new Date().toISOString().split('T')[0]}`
  };
}

function createDatabaseTables(db: Database.Database): void {
  console.log('Creating/verifying industry_benchmarks table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS industry_benchmarks (
      id TEXT PRIMARY KEY,
      industry TEXT NOT NULL,
      organization_size TEXT NOT NULL,
      csf_function TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      percentile_25 REAL,
      percentile_50 REAL,
      percentile_75 REAL,
      percentile_90 REAL,
      average_score REAL,
      sample_size INTEGER,
      data_year INTEGER,
      source TEXT,
      notes TEXT,
      UNIQUE(industry, organization_size, csf_function, metric_name, data_year)
    );
  `;
  
  db.exec(createTableSQL);
  
  // Create indexes for performance
  const createIndexSQL = `
    CREATE INDEX IF NOT EXISTS idx_benchmarks_industry_size 
    ON industry_benchmarks(industry, organization_size);
    
    CREATE INDEX IF NOT EXISTS idx_benchmarks_function 
    ON industry_benchmarks(csf_function);
    
    CREATE INDEX IF NOT EXISTS idx_benchmarks_year 
    ON industry_benchmarks(data_year);
  `;
  
  db.exec(createIndexSQL);
}

function insertBenchmarkData(db: Database.Database, benchmarkRecords: BenchmarkRecord[]): void {
  console.log(`Inserting ${benchmarkRecords.length} benchmark records...`);
  
  // Prepare the insert statement
  const insertSQL = `
    INSERT OR REPLACE INTO industry_benchmarks (
      id, industry, organization_size, csf_function, metric_name,
      percentile_25, percentile_50, percentile_75, percentile_90,
      average_score, sample_size, data_year, source, notes
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `;
  
  const insertStmt = db.prepare(insertSQL);
  
  // Use transaction for better performance and atomicity
  const insertMany = db.transaction((records: BenchmarkRecord[]) => {
    for (const record of records) {
      insertStmt.run(
        record.id,
        record.industry,
        record.organization_size,
        record.csf_function,
        record.metric_name,
        record.percentile_25,
        record.percentile_50,
        record.percentile_75,
        record.percentile_90,
        record.average_score,
        record.sample_size,
        record.data_year,
        record.source,
        record.notes
      );
    }
  });
  
  try {
    insertMany(benchmarkRecords);
    console.log(`✅ Successfully inserted ${benchmarkRecords.length} benchmark records`);
  } catch (error) {
    console.error('❌ Error inserting benchmark data:', error);
    throw error;
  }
}

function validateImportedData(db: Database.Database): void {
  console.log('\n📊 Validating imported data...');
  
  // Count total records
  const totalCount = db.prepare('SELECT COUNT(*) as count FROM industry_benchmarks').get() as { count: number };
  console.log(`Total benchmark records: ${totalCount.count}`);
  
  // Count by industry
  const industryStats = db.prepare(`
    SELECT industry, COUNT(*) as count 
    FROM industry_benchmarks 
    GROUP BY industry 
    ORDER BY industry
  `).all() as Array<{ industry: string; count: number }>;
  
  console.log('\nRecords by Industry:');
  industryStats.forEach(stat => {
    console.log(`  ${stat.industry}: ${stat.count} records`);
  });
  
  // Count by organization size
  const sizeStats = db.prepare(`
    SELECT organization_size, COUNT(*) as count 
    FROM industry_benchmarks 
    GROUP BY organization_size 
    ORDER BY organization_size
  `).all() as Array<{ organization_size: string; count: number }>;
  
  console.log('\nRecords by Organization Size:');
  sizeStats.forEach(stat => {
    console.log(`  ${stat.organization_size}: ${stat.count} records`);
  });
  
  // Count by CSF function
  const functionStats = db.prepare(`
    SELECT csf_function, COUNT(*) as count 
    FROM industry_benchmarks 
    GROUP BY csf_function 
    ORDER BY csf_function
  `).all() as Array<{ csf_function: string; count: number }>;
  
  console.log('\nRecords by CSF Function:');
  functionStats.forEach(stat => {
    console.log(`  ${stat.csf_function}: ${stat.count} records`);
  });
  
  // Sample data verification
  const sampleRecords = db.prepare(`
    SELECT industry, organization_size, csf_function, average_score, sample_size
    FROM industry_benchmarks 
    WHERE industry = 'Financial Services' AND organization_size = 'large'
    ORDER BY csf_function
  `).all() as Array<{ 
    industry: string; 
    organization_size: string; 
    csf_function: string; 
    average_score: number; 
    sample_size: number 
  }>;
  
  console.log('\nSample Data (Financial Services, Large Organizations):');
  sampleRecords.forEach(record => {
    console.log(`  ${record.csf_function}: avg=${record.average_score}, sample=${record.sample_size}`);
  });
}

function generateImportReport(benchmarkRecords: BenchmarkRecord[]): object {
  const report = {
    totalRecords: benchmarkRecords.length,
    industries: [...new Set(benchmarkRecords.map(r => r.industry))],
    organizationSizes: [...new Set(benchmarkRecords.map(r => r.organization_size))],
    csfFunctions: [...new Set(benchmarkRecords.map(r => r.csf_function))],
    dataYears: [...new Set(benchmarkRecords.map(r => r.data_year))],
    sources: [...new Set(benchmarkRecords.map(r => r.source))]
  };
  
  console.log('\n📋 Import Report:');
  console.log(`Total Records Processed: ${report.totalRecords}`);
  console.log(`Industries: ${report.industries.join(', ')}`);
  console.log(`Organization Sizes: ${report.organizationSizes.join(', ')}`);
  console.log(`CSF Functions: ${report.csfFunctions.join(', ')}`);
  console.log(`Data Years: ${report.dataYears.join(', ')}`);
  console.log(`Data Sources: ${report.sources.length} unique source(s)`);
  
  return report;
}

// Main execution function
async function main(): Promise<void> {
  console.log('🚀 Starting NIST CSF 2.0 Industry Benchmarks Import');
  console.log('='.repeat(60));
  
  try {
    // Check if CSV file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error(`CSV file not found: ${CSV_FILE_PATH}`);
    }
    
    console.log(`📁 Reading CSV file: ${CSV_FILE_PATH}`);
    
    // Read and parse CSV file
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
    const csvRecords = parseCSV(csvContent);
    
    console.log(`📊 Parsed ${csvRecords.length} records from CSV`);
    
    // Transform records to match database schema
    const benchmarkRecords = csvRecords.map(transformRecord);
    
    console.log(`🔄 Transformed ${benchmarkRecords.length} records for database`);
    
    // Generate import report
    generateImportReport(benchmarkRecords);
    
    // Connect to database
    console.log(`🗄️  Connecting to database: ${DB_FILE_PATH}`);
    const db = new Database(DB_FILE_PATH);
    
    // Ensure database tables exist
    createDatabaseTables(db);
    
    // Insert benchmark data
    insertBenchmarkData(db, benchmarkRecords);
    
    // Validate imported data
    validateImportedData(db);
    
    // Close database connection
    db.close();
    
    console.log('\n✅ Import completed successfully!');
    console.log('='.repeat(60));
    console.log('The industry benchmark data is now available for the get_industry_benchmarks MCP tool.');
    console.log('\nNext steps:');
    console.log('1. Test the get_industry_benchmarks tool with a sample profile');
    console.log('2. Verify benchmark comparisons are working correctly');
    console.log('3. Consider adding more recent or industry-specific data sources');
    console.log('\nTo test the import, you can run:');
    console.log('npm run test:benchmarks');
    
  } catch (error) {
    console.error('\n❌ Import failed:', (error as Error).message);
    console.error('Stack trace:', (error as Error).stack);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  parseCSV,
  transformRecord,
  createDatabaseTables,
  insertBenchmarkData,
  validateImportedData
};