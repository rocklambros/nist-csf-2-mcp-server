#!/usr/bin/env npx tsx
/**
 * Import Comprehensive Question Bank Script
 * Loads the comprehensive question bank into the database
 */

import { readFileSync } from 'fs';
import { getDatabase, closeDatabase } from '../src/db/database.js';
import { logger } from '../src/utils/enhanced-logger.js';

interface QuestionOption {
  option_text: string;
  score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  maturity_level: 'initial' | 'developing' | 'defined' | 'managed' | 'optimizing';
}

interface AssessmentQuestion {
  subcategory_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'yes_no' | 'scale';
  assessment_dimension: 'risk' | 'maturity' | 'implementation' | 'effectiveness';
  weight: number;
  options: QuestionOption[];
}

interface ComprehensiveQuestionBank {
  metadata: any;
  questions: AssessmentQuestion[];
}

class QuestionBankImporter {
  private db: any;

  constructor() {
    this.db = getDatabase();
  }

  async importQuestionBank(): Promise<boolean> {
    logger.info('📥 Starting comprehensive question bank import');

    try {
      // Read the comprehensive question bank file
      const questionBankData = JSON.parse(
        readFileSync('./comprehensive-question-bank.json', 'utf8')
      ) as ComprehensiveQuestionBank;

      logger.info(`📊 Found ${questionBankData.questions.length} questions for ${questionBankData.metadata.subcategories_covered} subcategories`);

      // Clear existing question data (already cleared but ensure clean state)
      this.clearExistingQuestionsSync();

      // Import questions and options
      // better-sqlite3 operations are synchronous and each statement is atomic
      this.importQuestionsSync(questionBankData.questions);

      // Verify import
      this.verifyImportSync(questionBankData.questions.length);

      logger.info('✅ Comprehensive question bank import completed successfully');
      return true;

    } catch (error) {
      logger.error('💥 Question bank import failed:', error);
      return false;
    }
  }

  private clearExistingQuestionsSync(): void {
    // Clear question_responses first (references question_bank)
    const responsesDeleted = this.db.prepare('DELETE FROM question_responses').run().changes;
    logger.info(`🗑️  Cleared ${responsesDeleted} existing question responses`);

    // Clear question_examples (references question_bank)
    const examplesDeleted = this.db.prepare('DELETE FROM question_examples').run().changes;
    logger.info(`🗑️  Cleared ${examplesDeleted} existing question examples`);

    // Clear question options (references question_bank)
    const optionsDeleted = this.db.prepare('DELETE FROM question_options').run().changes;
    logger.info(`🗑️  Cleared ${optionsDeleted} existing question options`);

    // Clear questions
    const questionsDeleted = this.db.prepare('DELETE FROM question_bank').run().changes;
    logger.info(`🗑️  Cleared ${questionsDeleted} existing questions`);
  }

  private importQuestionsSync(questions: AssessmentQuestion[]): void {
    const insertQuestionStmt = this.db.prepare(`
      INSERT INTO question_bank (
        id, subcategory_id, question_text, question_type, help_text, weight
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertOptionStmt = this.db.prepare(`
      INSERT INTO question_options (
        id, question_id, option_value, option_label, option_description, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    let questionsImported = 0;
    let optionsImported = 0;

    for (const question of questions) {
      // Generate unique question ID
      const questionId = `${question.subcategory_id}_${question.assessment_dimension}`;
      
      // Create help text that includes assessment dimension
      const helpText = `This question assesses ${question.assessment_dimension} for ${question.subcategory_id}`;

      // Insert question
      insertQuestionStmt.run(
        questionId,
        question.subcategory_id,
        question.question_text,
        'multiple_choice', // Map to valid question_type
        helpText,
        question.weight
      );

      questionsImported++;

      // Insert options for this question
      for (let i = 0; i < question.options.length; i++) {
        const option = question.options[i];
        const optionId = `${questionId}_opt_${i + 1}`;
        
        // Create option description that includes risk/maturity levels
        const optionDescription = `Score: ${option.score}, Risk: ${option.risk_level}, Maturity: ${option.maturity_level}`;

        insertOptionStmt.run(
          optionId,
          questionId,
          option.score, // Use score as option_value
          option.option_text,
          optionDescription,
          i + 1 // sort_order
        );
        optionsImported++;
      }

      // Progress logging
      if (questionsImported % 50 === 0) {
        logger.info(`  ✅ Imported ${questionsImported}/${questions.length} questions`);
      }
    }

    logger.info(`📊 Imported ${questionsImported} questions with ${optionsImported} options`);
  }

  private verifyImportSync(expectedQuestions: number): void {
    // Verify question count
    const questionCount = this.db.prepare('SELECT COUNT(*) as count FROM question_bank').get().count;
    
    // Verify option count
    const optionCount = this.db.prepare('SELECT COUNT(*) as count FROM question_options').get().count;
    
    // Verify subcategory coverage
    const subcategoryCoverage = this.db.prepare(`
      SELECT COUNT(DISTINCT subcategory_id) as covered_subcategories 
      FROM question_bank
    `).get().covered_subcategories;
    
    // Get question type breakdown
    const typeBreakdown = this.db.prepare(`
      SELECT question_type, COUNT(*) as count 
      FROM question_bank 
      GROUP BY question_type 
      ORDER BY question_type
    `).all();

    // Get assessment dimension breakdown from help_text
    const dimensionBreakdown = this.db.prepare(`
      SELECT 
        CASE 
          WHEN help_text LIKE '%risk%' THEN 'risk'
          WHEN help_text LIKE '%maturity%' THEN 'maturity'
          WHEN help_text LIKE '%implementation%' THEN 'implementation'
          WHEN help_text LIKE '%effectiveness%' THEN 'effectiveness'
          ELSE 'other'
        END as dimension,
        COUNT(*) as count
      FROM question_bank 
      GROUP BY dimension
      ORDER BY dimension
    `).all();

    logger.info('\\n📊 Import Verification:');
    logger.info(`   Questions imported: ${questionCount}/${expectedQuestions}`);
    logger.info(`   Options imported: ${optionCount}`);
    logger.info(`   Subcategories covered: ${subcategoryCoverage}/106`);
    
    logger.info('\\n📈 Question Type Breakdown:');
    typeBreakdown.forEach((row: any) => {
      logger.info(`   ${row.question_type}: ${row.count} questions`);
    });

    logger.info('\\n📈 Assessment Dimension Breakdown:');
    dimensionBreakdown.forEach((row: any) => {
      logger.info(`   ${row.dimension}: ${row.count} questions`);
    });

    // Verify completeness
    if (questionCount !== expectedQuestions) {
      throw new Error(`Expected ${expectedQuestions} questions, but imported ${questionCount}`);
    }

    // Verify subcategory coverage (should be at least 100, up to 185+ depending on database)
    if (subcategoryCoverage < 100) {
      throw new Error(`Expected at least 100 subcategories covered, but only ${subcategoryCoverage} are covered`);
    }

    logger.info(`\\n🎉 Import verification successful - ${subcategoryCoverage} subcategories covered!`);
  }
}

// Run the importer
async function main() {
  const importer = new QuestionBankImporter();
  const success = await importer.importQuestionBank();
  
  closeDatabase();
  logger.info('🔐 Database connection closed');
  
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  logger.error('💥 Import script failed:', error);
  closeDatabase();
  process.exit(1);
});