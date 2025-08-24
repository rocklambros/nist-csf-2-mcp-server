#!/usr/bin/env npx tsx
/**
 * Database Verification Script
 * Verifies that the database has been properly populated with framework data
 */

import { getDatabase, closeDatabase } from '../src/db/database.js';
import { logger } from '../src/utils/enhanced-logger.js';

interface VerificationCheck {
  name: string;
  query: string;
  expected: { min?: number; max?: number; exact?: number };
  critical: boolean;
}

async function verifyDatabase() {
  logger.info('🔍 Starting database verification...');
  
  try {
    const db = getDatabase();
    
    const checks: VerificationCheck[] = [
      {
        name: 'Functions',
        query: 'SELECT COUNT(*) as count FROM functions',
        expected: { exact: 6 },
        critical: true
      },
      {
        name: 'Categories', 
        query: 'SELECT COUNT(*) as count FROM categories',
        expected: { min: 20, max: 50 },
        critical: true
      },
      {
        name: 'Subcategories',
        query: 'SELECT COUNT(*) as count FROM subcategories', 
        expected: { min: 100 },
        critical: true
      },
      {
        name: 'Questions',
        query: 'SELECT COUNT(*) as count FROM question_bank',
        expected: { min: 3 },
        critical: false
      },
      {
        name: 'Question Options',
        query: 'SELECT COUNT(*) as count FROM question_options',
        expected: { min: 10 },
        critical: false
      },
      {
        name: 'Organization Profiles',
        query: 'SELECT COUNT(*) as count FROM organization_profiles',
        expected: { min: 0 },
        critical: false
      }
    ];
    
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    
    logger.info('📊 Running database verification checks...\n');
    
    for (const check of checks) {
      try {
        const result = db.prepare(check.query).get() as { count: number };
        const count = result.count;
        
        let status = '';
        let icon = '';
        let passed_check = true;
        
        // Check against expected values
        if (check.expected.exact !== undefined) {
          if (count === check.expected.exact) {
            status = `✅ PASS`;
            icon = '✅';
          } else {
            status = `❌ FAIL (expected exactly ${check.expected.exact})`;
            icon = '❌';
            passed_check = false;
          }
        } else {
          const minOk = check.expected.min === undefined || count >= check.expected.min;
          const maxOk = check.expected.max === undefined || count <= check.expected.max;
          
          if (minOk && maxOk) {
            status = `✅ PASS`;
            icon = '✅';
          } else {
            const range = `${check.expected.min || 0}-${check.expected.max || '∞'}`;
            status = `❌ FAIL (expected ${range})`;
            icon = '❌';
            passed_check = false;
          }
        }
        
        logger.info(`  ${icon} ${check.name.padEnd(20)} ${count.toString().padStart(6)} ${status}`);
        
        if (passed_check) {
          passed++;
        } else {
          if (check.critical) {
            failed++;
          } else {
            warnings++;
          }
        }
        
      } catch (error) {
        logger.error(`  ❌ ${check.name.padEnd(20)} ERROR: ${error}`);
        if (check.critical) {
          failed++;
        } else {
          warnings++;
        }
      }
    }
    
    logger.info('');
    logger.info('📋 Database Verification Summary:');
    logger.info(`  ✅ Passed: ${passed}`);
    logger.info(`  ❌ Failed: ${failed}`);
    logger.info(`  ⚠️  Warnings: ${warnings}`);
    
    // Sample data verification
    logger.info('\n🔍 Sample Data Verification:');
    
    try {
      const sampleFunction = db.prepare('SELECT id, name FROM functions LIMIT 1').get();
      const sampleCategory = db.prepare('SELECT id, name, function_id FROM categories LIMIT 1').get();
      const sampleSubcategory = db.prepare('SELECT id, name, category_id FROM subcategories LIMIT 1').get();
      
      logger.info('  📝 Sample Function:', sampleFunction);
      logger.info('  📝 Sample Category:', sampleCategory);
      logger.info('  📝 Sample Subcategory:', sampleSubcategory);
      
      // Test foreign key relationships
      if (sampleCategory && sampleFunction) {
        const fkTest = db.prepare(`
          SELECT c.id, c.name, f.name as function_name 
          FROM categories c 
          JOIN functions f ON c.function_id = f.id 
          LIMIT 1
        `).get();
        
        if (fkTest) {
          logger.info('  🔗 Foreign Key Test: ✅ Categories properly linked to Functions');
        } else {
          logger.error('  🔗 Foreign Key Test: ❌ Category-Function relationships broken');
          failed++;
        }
      }
      
      if (sampleSubcategory && sampleCategory) {
        const fkTest2 = db.prepare(`
          SELECT s.id, s.name, c.name as category_name 
          FROM subcategories s 
          JOIN categories c ON s.category_id = c.id 
          LIMIT 1
        `).get();
        
        if (fkTest2) {
          logger.info('  🔗 Foreign Key Test: ✅ Subcategories properly linked to Categories');
        } else {
          logger.error('  🔗 Foreign Key Test: ❌ Subcategory-Category relationships broken');
          failed++;
        }
      }
      
    } catch (error) {
      logger.error('  🔗 Sample Data Test: ❌ Error accessing sample data:', error);
      failed++;
    }
    
    // Final assessment
    logger.info('');
    if (failed === 0) {
      logger.info('🎉 DATABASE VERIFICATION PASSED - System is ready for operation!');
      return true;
    } else {
      logger.error(`💥 DATABASE VERIFICATION FAILED - ${failed} critical issues found`);
      logger.info('📋 Required actions:');
      if (failed > 0) {
        logger.info('  1. Run: npm run import:framework');
        logger.info('  2. Run: npm run seed:questions');
        logger.info('  3. Run: npm run db:verify (this script)');
      }
      return false;
    }
    
  } catch (error) {
    logger.error('💥 Database verification failed:', error);
    return false;
  } finally {
    closeDatabase();
    logger.info('🔐 Database connection closed');
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npm run db:verify

Verifies that the database has been properly populated with:
- NIST CSF 2.0 framework data (functions, categories, subcategories)
- Question bank data
- Proper foreign key relationships

Exit codes:
  0 = All checks passed
  1 = Critical checks failed
  `);
  process.exit(0);
}

// Run verification
verifyDatabase().then((success) => {
  process.exit(success ? 0 : 1);
}).catch((error) => {
  logger.error('💥 Verification script failed:', error);
  process.exit(1);
});