#!/usr/bin/env npx tsx
/**
 * Question Bank Seeding Script
 * Seeds the database with comprehensive question bank data
 */

import { questionSeeder } from '../src/services/question-seeder.js';
import { frameworkSeeder } from '../src/services/framework-seeder.js';
import { logger } from '../src/utils/enhanced-logger.js';
import { getDatabase, closeDatabase } from '../src/db/database.js';

async function main() {
  logger.info('Starting question bank seeding script...');

  try {
    // Ensure database is initialized
    const db = getDatabase();
    logger.info('Database connection established');

    // Clear existing data if requested
    if (process.argv.includes('--clear')) {
      logger.info('Clearing existing question data...');
      await questionSeeder.clearAllQuestions();
    }

    // Ensure framework data exists
    if (!frameworkSeeder.frameworkDataExists()) {
      logger.info('Framework data not found, seeding basic framework structure...');
      await frameworkSeeder.seedBasicFramework();
    } else {
      logger.info('Framework data already exists');
    }

    // Seed all questions
    await questionSeeder.seedAllQuestions();

    // Display statistics
    const stats = questionSeeder.getSeedingStats();
    logger.info('Seeding completed successfully:', {
      totalQuestions: stats.total_questions,
      questionsByType: stats.questions_by_type,
      questionsByFunction: stats.questions_by_function,
      totalResponses: stats.total_responses
    });

  } catch (error) {
    logger.error('Failed to seed question bank data:', error);
    process.exit(1);
  } finally {
    // Close database connection
    closeDatabase();
    logger.info('Database connection closed');
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npm run seed:questions [options]

Options:
  --clear    Clear all existing question data before seeding
  --help     Show this help message

Examples:
  npm run seed:questions
  npm run seed:questions -- --clear
  `);
  process.exit(0);
}

// Run the seeding script
main().catch((error) => {
  logger.error('Script failed:', error);
  process.exit(1);
});