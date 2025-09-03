/**
 * Assessment Progress Manager - Persistent progress tracking for comprehensive assessments
 * 
 * Enables users to resume assessments exactly where they left off across sessions.
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';
import { logger } from '../utils/logger.js';

// Progress state for individual questions
export const QuestionProgressState = z.enum([
  'not_started',
  'in_progress', 
  'answered',
  'validated',
  'skipped'
]);

export type QuestionProgressStateType = z.infer<typeof QuestionProgressState>;

// Assessment session state
export const AssessmentSessionState = z.enum([
  'initialized',
  'questions_loaded',
  'in_progress',
  'paused',
  'completed',
  'abandoned'
]);

export type AssessmentSessionStateType = z.infer<typeof AssessmentSessionState>;

// Progress tracking interfaces
export interface QuestionProgress {
  id: string;
  session_id: string;
  workflow_id: string;
  question_id: string;
  subcategory_id: string;
  question_order: number;
  state: QuestionProgressStateType;
  response_value?: string | number;
  confidence_level?: string;
  notes?: string;
  time_spent_seconds?: number;
  answered_at?: string;
  last_modified: string;
}

export interface AssessmentSession {
  session_id: string;
  workflow_id: string;
  profile_id: string;
  state: AssessmentSessionStateType;
  current_question_index: number;
  total_questions: number;
  questions_answered: number;
  session_data: string; // JSON metadata
  created_at: string;
  updated_at: string;
  last_activity: string;
}

export class AssessmentProgressManager {
  private db = getDatabase();

  /**
   * Initialize progress tracking tables
   */
  initializeProgressTables(): void {
    this.db.transaction((): void => {
      // Assessment sessions table
      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS assessment_sessions (
          session_id TEXT PRIMARY KEY,
          workflow_id TEXT NOT NULL,
          profile_id TEXT NOT NULL,
          state TEXT NOT NULL DEFAULT 'initialized' CHECK(state IN ('initialized', 'questions_loaded', 'in_progress', 'paused', 'completed', 'abandoned')),
          current_question_index INTEGER DEFAULT 0,
          total_questions INTEGER DEFAULT 0,
          questions_answered INTEGER DEFAULT 0,
          session_data TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (profile_id) REFERENCES profiles(profile_id),
          UNIQUE(workflow_id)
        )
      `).run();

      // Question progress tracking table
      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS question_progress (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          workflow_id TEXT NOT NULL,
          question_id TEXT NOT NULL,
          subcategory_id TEXT NOT NULL,
          question_order INTEGER NOT NULL,
          state TEXT NOT NULL DEFAULT 'not_started' CHECK(state IN ('not_started', 'in_progress', 'answered', 'validated', 'skipped')),
          response_value TEXT,
          confidence_level TEXT,
          notes TEXT,
          time_spent_seconds INTEGER DEFAULT 0,
          answered_at DATETIME,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES assessment_sessions(session_id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES question_bank(id),
          UNIQUE(session_id, question_id)
        )
      `).run();

      // Create indexes for performance
      this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_assessment_sessions_workflow ON assessment_sessions(workflow_id);
        CREATE INDEX IF NOT EXISTS idx_assessment_sessions_profile ON assessment_sessions(profile_id);
        CREATE INDEX IF NOT EXISTS idx_assessment_sessions_state ON assessment_sessions(state);
        CREATE INDEX IF NOT EXISTS idx_question_progress_session ON question_progress(session_id);
        CREATE INDEX IF NOT EXISTS idx_question_progress_workflow ON question_progress(workflow_id);
        CREATE INDEX IF NOT EXISTS idx_question_progress_state ON question_progress(state);
        CREATE INDEX IF NOT EXISTS idx_question_progress_order ON question_progress(question_order);
      `).run();

      logger.info('Assessment progress tracking tables initialized');
    });
  }

  /**
   * Create new assessment session
   */
  createAssessmentSession(workflowId: string, profileId: string): AssessmentSession {
    const sessionId = uuidv4();
    const session: AssessmentSession = {
      session_id: sessionId,
      workflow_id: workflowId,
      profile_id: profileId,
      state: 'initialized',
      current_question_index: 0,
      total_questions: 0,
      questions_answered: 0,
      session_data: '{}',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT INTO assessment_sessions 
      (session_id, workflow_id, profile_id, state, current_question_index, total_questions, questions_answered, session_data, created_at, updated_at, last_activity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.session_id,
      session.workflow_id,
      session.profile_id,
      session.state,
      session.current_question_index,
      session.total_questions,
      session.questions_answered,
      session.session_data,
      session.created_at,
      session.updated_at,
      session.last_activity
    );

    logger.info(`Assessment session created: ${sessionId} for workflow ${workflowId}`);
    return session;
  }

  /**
   * Get assessment session by workflow ID
   */
  getAssessmentSession(workflowId: string): AssessmentSession | null {
    const result = this.db.prepare(`
      SELECT * FROM assessment_sessions WHERE workflow_id = ?
    `).get(workflowId);

    return result as AssessmentSession | null;
  }

  /**
   * Initialize question progress for a session
   */
  initializeQuestionProgress(sessionId: string, questions: Array<{ id: string; subcategory_id: string }>): void {
    this.db.transaction((): void => {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO question_progress 
        (id, session_id, workflow_id, question_id, subcategory_id, question_order, state, last_modified)
        VALUES (?, ?, ?, ?, ?, ?, 'not_started', CURRENT_TIMESTAMP)
      `);

      const session = this.db.prepare('SELECT workflow_id FROM assessment_sessions WHERE session_id = ?').get(sessionId) as { workflow_id: string };
      
      questions.forEach((question, index) => {
        stmt.run(
          uuidv4(),
          sessionId,
          session.workflow_id,
          question.id,
          question.subcategory_id,
          index + 1
        );
      });

      // Update session with total questions
      this.db.prepare(`
        UPDATE assessment_sessions 
        SET total_questions = ?, state = 'questions_loaded', updated_at = CURRENT_TIMESTAMP 
        WHERE session_id = ?
      `).run(questions.length, sessionId);

      logger.info(`Initialized progress for ${questions.length} questions in session ${sessionId}`);
    });
  }

  /**
   * Save progress for a single question
   */
  saveQuestionProgress(sessionId: string, questionId: string, response: {
    response_value?: string | number;
    confidence_level?: string;
    notes?: string;
    time_spent_seconds?: number;
    state?: QuestionProgressStateType;
  }): void {
    const progressData: Partial<QuestionProgress> = {
      response_value: response.response_value?.toString(),
      confidence_level: response.confidence_level,
      notes: response.notes,
      time_spent_seconds: response.time_spent_seconds,
      state: response.state || 'answered',
      answered_at: new Date().toISOString(),
      last_modified: new Date().toISOString()
    };

    this.db.transaction((): void => {
      // Update question progress
      this.db.prepare(`
        UPDATE question_progress 
        SET state = ?, response_value = ?, confidence_level = ?, notes = ?, 
            time_spent_seconds = ?, answered_at = ?, last_modified = ?
        WHERE session_id = ? AND question_id = ?
      `).run(
        progressData.state,
        progressData.response_value,
        progressData.confidence_level,
        progressData.notes,
        progressData.time_spent_seconds,
        progressData.answered_at,
        progressData.last_modified,
        sessionId,
        questionId
      );

      // Update session progress counters
      const answeredCount = this.db.prepare(`
        SELECT COUNT(*) as count FROM question_progress 
        WHERE session_id = ? AND state IN ('answered', 'validated')
      `).get(sessionId) as { count: number };

      const currentIndex = this.db.prepare(`
        SELECT question_order FROM question_progress 
        WHERE session_id = ? AND question_id = ?
      `).get(sessionId, questionId) as { question_order: number };

      this.db.prepare(`
        UPDATE assessment_sessions 
        SET questions_answered = ?, 
            current_question_index = ?, 
            state = CASE 
              WHEN ? >= total_questions THEN 'completed'
              ELSE 'in_progress'
            END,
            updated_at = CURRENT_TIMESTAMP,
            last_activity = CURRENT_TIMESTAMP
        WHERE session_id = ?
      `).run(
        answeredCount.count,
        currentIndex.question_order,
        answeredCount.count,
        sessionId
      );

      logger.info(`Question progress saved: ${questionId} in session ${sessionId}`);
    });
  }

  /**
   * Get next unanswered question for a session
   */
  getNextQuestion(sessionId: string): QuestionProgress | null {
    const result = this.db.prepare(`
      SELECT qp.*, qb.question_text, qb.question_type, qb.help_text
      FROM question_progress qp
      JOIN question_bank qb ON qp.question_id = qb.id
      WHERE qp.session_id = ? AND qp.state IN ('not_started', 'in_progress')
      ORDER BY qp.question_order ASC
      LIMIT 1
    `).get(sessionId);

    return result as QuestionProgress | null;
  }

  /**
   * Get assessment progress summary
   */
  getProgressSummary(workflowId: string): {
    session_id: string;
    total_questions: number;
    questions_answered: number;
    completion_percentage: number;
    current_question_index: number;
    state: AssessmentSessionStateType;
    last_activity: string;
    can_resume: boolean;
    next_question?: QuestionProgress;
  } | null {
    const session = this.getAssessmentSession(workflowId);
    if (!session) return null;

    const nextQuestion = this.getNextQuestion(session.session_id);
    
    const completionPercentage = session.total_questions > 0 
      ? Math.round((session.questions_answered / session.total_questions) * 100)
      : 0;

    return {
      session_id: session.session_id,
      total_questions: session.total_questions,
      questions_answered: session.questions_answered,
      completion_percentage: completionPercentage,
      current_question_index: session.current_question_index,
      state: session.state,
      last_activity: session.last_activity,
      can_resume: session.state === 'in_progress' || session.state === 'paused',
      next_question: nextQuestion || undefined
    };
  }

  /**
   * Resume assessment from last position
   */
  resumeAssessment(workflowId: string): {
    success: boolean;
    session: AssessmentSession | null;
    progress_summary: any;
    next_question?: QuestionProgress;
    message: string;
  } {
    const session = this.getAssessmentSession(workflowId);
    
    if (!session) {
      return {
        success: false,
        session: null,
        progress_summary: null,
        message: 'No assessment session found for this workflow'
      };
    }

    if (session.state === 'completed') {
      return {
        success: false,
        session,
        progress_summary: this.getProgressSummary(workflowId),
        message: 'Assessment already completed'
      };
    }

    // Update session to in_progress and last_activity
    this.db.prepare(`
      UPDATE assessment_sessions 
      SET state = 'in_progress', last_activity = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE workflow_id = ?
    `).run(workflowId);

    const progressSummary = this.getProgressSummary(workflowId);
    const nextQuestion = this.getNextQuestion(session.session_id);

    logger.info(`Assessment resumed: ${workflowId}, ${progressSummary?.questions_answered}/${progressSummary?.total_questions} questions completed`);

    return {
      success: true,
      session,
      progress_summary: progressSummary,
      next_question: nextQuestion || undefined,
      message: `Assessment resumed. Progress: ${progressSummary?.questions_answered}/${progressSummary?.total_questions} questions completed (${progressSummary?.completion_percentage}%)`
    };
  }

  /**
   * Pause assessment (save current state)
   */
  pauseAssessment(workflowId: string): void {
    this.db.prepare(`
      UPDATE assessment_sessions 
      SET state = 'paused', last_activity = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE workflow_id = ?
    `).run(workflowId);

    logger.info(`Assessment paused: ${workflowId}`);
  }

  /**
   * Get all answered questions for a session
   */
  getAnsweredQuestions(sessionId: string): QuestionProgress[] {
    const results = this.db.prepare(`
      SELECT qp.*, qb.question_text, qb.question_type
      FROM question_progress qp
      JOIN question_bank qb ON qp.question_id = qb.id
      WHERE qp.session_id = ? AND qp.state IN ('answered', 'validated')
      ORDER BY qp.question_order ASC
    `).all(sessionId);

    return results as QuestionProgress[];
  }

  /**
   * Get detailed progress breakdown by function/category
   */
  getDetailedProgress(workflowId: string): {
    overall: { answered: number; total: number; percentage: number };
    by_function: Array<{
      function_id: string;
      answered: number;
      total: number;
      percentage: number;
    }>;
    by_category: Array<{
      category_id: string;
      answered: number;
      total: number;
      percentage: number;
    }>;
  } | null {
    const session = this.getAssessmentSession(workflowId);
    if (!session) return null;

    // Overall progress
    const overall = this.db.prepare(`
      SELECT 
        COUNT(CASE WHEN state IN ('answered', 'validated') THEN 1 END) as answered,
        COUNT(*) as total
      FROM question_progress qp
      WHERE qp.session_id = ?
    `).get(session.session_id) as { answered: number; total: number };

    // Progress by function
    const byFunction = this.db.prepare(`
      SELECT 
        SUBSTR(qp.subcategory_id, 1, 2) as function_id,
        COUNT(CASE WHEN qp.state IN ('answered', 'validated') THEN 1 END) as answered,
        COUNT(*) as total
      FROM question_progress qp
      WHERE qp.session_id = ?
      GROUP BY SUBSTR(qp.subcategory_id, 1, 2)
      ORDER BY function_id
    `).all(session.session_id) as Array<{ function_id: string; answered: number; total: number }>;

    // Progress by category  
    const byCategory = this.db.prepare(`
      SELECT 
        SUBSTR(qp.subcategory_id, 1, INSTR(qp.subcategory_id, '-') - 1) as category_id,
        COUNT(CASE WHEN qp.state IN ('answered', 'validated') THEN 1 END) as answered,
        COUNT(*) as total
      FROM question_progress qp
      WHERE qp.session_id = ?
      GROUP BY SUBSTR(qp.subcategory_id, 1, INSTR(qp.subcategory_id, '-') - 1)
      ORDER BY category_id
    `).all(session.session_id) as Array<{ category_id: string; answered: number; total: number }>;

    return {
      overall: {
        answered: overall.answered,
        total: overall.total,
        percentage: overall.total > 0 ? Math.round((overall.answered / overall.total) * 100) : 0
      },
      by_function: byFunction.map(f => ({
        function_id: f.function_id,
        answered: f.answered,
        total: f.total,
        percentage: f.total > 0 ? Math.round((f.answered / f.total) * 100) : 0
      })),
      by_category: byCategory.map(c => ({
        category_id: c.category_id,
        answered: c.answered,
        total: c.total,
        percentage: c.total > 0 ? Math.round((c.answered / c.total) * 100) : 0
      }))
    };
  }

  /**
   * Export assessment responses for final processing
   */
  exportAssessmentResponses(workflowId: string): {
    workflow_id: string;
    profile_id: string;
    responses: Array<{
      question_id: string;
      subcategory_id: string;
      response_value: string | number;
      confidence_level: string;
      notes?: string;
      answered_at: string;
    }>;
    completion_status: {
      total_questions: number;
      answered_questions: number;
      completion_percentage: number;
      is_complete: boolean;
    };
  } | null {
    const session = this.getAssessmentSession(workflowId);
    if (!session) return null;

    const responses = this.getAnsweredQuestions(session.session_id);
    
    return {
      workflow_id: workflowId,
      profile_id: session.profile_id,
      responses: responses.map(r => ({
        question_id: r.question_id,
        subcategory_id: r.subcategory_id,
        response_value: r.response_value!,
        confidence_level: r.confidence_level || 'medium',
        notes: r.notes,
        answered_at: r.answered_at!
      })),
      completion_status: {
        total_questions: session.total_questions,
        answered_questions: session.questions_answered,
        completion_percentage: session.total_questions > 0 ? Math.round((session.questions_answered / session.total_questions) * 100) : 0,
        is_complete: session.state === 'completed'
      }
    };
  }

  /**
   * Clean up old or abandoned sessions
   */
  cleanupOldSessions(daysOld: number = 30): number {
    const result = this.db.prepare(`
      DELETE FROM assessment_sessions 
      WHERE last_activity < datetime('now', '-${daysOld} days')
      AND state IN ('abandoned', 'paused')
    `).run();

    logger.info(`Cleaned up ${result.changes} old assessment sessions`);
    return result.changes || 0;
  }
}

// Singleton instance
let progressManager: AssessmentProgressManager | null = null;

export function getProgressManager(): AssessmentProgressManager {
  if (!progressManager) {
    progressManager = new AssessmentProgressManager();
    progressManager.initializeProgressTables();
  }
  return progressManager;
}