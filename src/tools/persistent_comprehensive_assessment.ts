/**
 * Persistent Comprehensive Assessment Tool
 * 
 * Provides resumable comprehensive assessment with persistent progress tracking.
 * Users can leave and return to continue exactly where they left off.
 */

import { z } from 'zod';
import { getDatabase } from '../db/database.js';
import { logger } from '../utils/logger.js';
import { getProgressManager } from './assessment_progress_manager.js';
import { questionBankService } from '../services/question-bank.js';

// Input schema for starting/resuming assessment
export const PersistentAssessmentSchema = z.object({
  workflow_id: z.string().min(1, 'Workflow ID is required'),
  action: z.enum(['start', 'resume', 'answer', 'get_progress', 'pause']).default('resume'),
  
  // For answering questions
  question_id: z.string().optional(),
  response_value: z.union([z.string(), z.number()]).optional(),
  confidence_level: z.enum(['low', 'medium', 'high']).default('medium'),
  notes: z.string().optional(),
  
  // For session management
  time_spent_seconds: z.number().optional(),
  save_and_continue: z.boolean().default(true)
});

export type PersistentAssessmentParams = z.infer<typeof PersistentAssessmentSchema>;

interface AssessmentResponse {
  success: boolean;
  workflow_id: string;
  action: string;
  session_state: 'not_found' | 'initialized' | 'questions_loaded' | 'in_progress' | 'paused' | 'completed';
  progress: {
    total_questions: number;
    questions_answered: number;
    completion_percentage: number;
    current_question_index: number;
  };
  next_question?: {
    question_id: string;
    question_text: string;
    question_type: string;
    subcategory_id: string;
    help_text?: string;
    options?: Array<{ value: string; label: string }>;
    examples?: Array<{ text: string; type: string }>;
  };
  message: string;
  detailed_progress?: any;
  can_resume: boolean;
  estimated_time_remaining_minutes?: number;
}

/**
 * Main persistent assessment function
 */
export async function persistentComprehensiveAssessment(params: PersistentAssessmentParams): Promise<AssessmentResponse> {
  const db = getDatabase();
  const progressManager = getProgressManager();

  try {
    const { workflow_id, action } = params;

    // Get existing session or create new one
    let session = progressManager.getAssessmentSession(workflow_id);

    switch (action) {
      case 'start':
        return await startNewAssessment(workflow_id, progressManager);

      case 'resume':
        return await resumeAssessment(workflow_id, progressManager);

      case 'answer':
        return await answerQuestion(params, progressManager);

      case 'get_progress':
        return await getProgressStatus(workflow_id, progressManager);

      case 'pause':
        return await pauseAssessment(workflow_id, progressManager);

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Persistent assessment error:', error);
    return {
      success: false,
      workflow_id: params.workflow_id,
      action: params.action,
      session_state: 'not_found',
      progress: { total_questions: 0, questions_answered: 0, completion_percentage: 0, current_question_index: 0 },
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      can_resume: false
    };
  }
}

/**
 * Start new assessment with question initialization
 */
async function startNewAssessment(workflowId: string, progressManager: any): Promise<AssessmentResponse> {
  // Get workflow details
  const db = getDatabase();
  const workflow = db.getAssessmentWorkflow(workflowId);
  
  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  // Check if session already exists
  let session = progressManager.getAssessmentSession(workflowId);
  
  if (!session) {
    // Create new session
    session = progressManager.createAssessmentSession(workflowId, workflow.profile_id);
  }

  // Load questions for the assessment
  const questions = await questionBankService.getAssessmentQuestions({
    assessment_type: 'detailed',
    organization_size: 'medium', // This should come from the workflow/profile data
    include_conditional: false,
    include_examples: true,
    include_references: false
  });

  // Initialize question progress
  const questionList = questions.map((q: any, index: number) => ({
    id: q.id,
    subcategory_id: q.subcategory_id
  }));

  progressManager.initializeQuestionProgress(session.session_id, questionList);

  // Get first question
  const nextQuestion = progressManager.getNextQuestion(session.session_id);
  
  return {
    success: true,
    workflow_id: workflowId,
    action: 'start',
    session_state: 'questions_loaded',
    progress: {
      total_questions: questionList.length,
      questions_answered: 0,
      completion_percentage: 0,
      current_question_index: 1
    },
    next_question: nextQuestion ? {
      question_id: nextQuestion.question_id,
      question_text: (nextQuestion as any).question_text,
      question_type: (nextQuestion as any).question_type,
      subcategory_id: nextQuestion.subcategory_id,
      help_text: (nextQuestion as any).help_text
    } : undefined,
    message: `Assessment started with ${questionList.length} questions. Ready to begin.`,
    can_resume: true,
    estimated_time_remaining_minutes: Math.round(questionList.length * 2) // 2 minutes per question estimate
  };
}

/**
 * Resume existing assessment
 */
async function resumeAssessment(workflowId: string, progressManager: any): Promise<AssessmentResponse> {
  const resumeResult = progressManager.resumeAssessment(workflowId);
  
  if (!resumeResult.success) {
    throw new Error(resumeResult.message);
  }

  const progressSummary = resumeResult.progress_summary;
  const nextQuestion = resumeResult.next_question;

  return {
    success: true,
    workflow_id: workflowId,
    action: 'resume',
    session_state: resumeResult.session.state,
    progress: {
      total_questions: progressSummary.total_questions,
      questions_answered: progressSummary.questions_answered,
      completion_percentage: progressSummary.completion_percentage,
      current_question_index: progressSummary.current_question_index
    },
    next_question: nextQuestion ? {
      question_id: nextQuestion.question_id,
      question_text: (nextQuestion as any).question_text,
      question_type: (nextQuestion as any).question_type,
      subcategory_id: nextQuestion.subcategory_id,
      help_text: (nextQuestion as any).help_text
    } : undefined,
    message: resumeResult.message,
    detailed_progress: progressManager.getDetailedProgress(workflowId),
    can_resume: true,
    estimated_time_remaining_minutes: Math.round((progressSummary.total_questions - progressSummary.questions_answered) * 2)
  };
}

/**
 * Answer a question and save progress
 */
async function answerQuestion(params: PersistentAssessmentParams, progressManager: any): Promise<AssessmentResponse> {
  const { workflow_id, question_id, response_value, confidence_level, notes, time_spent_seconds } = params;
  
  if (!question_id || response_value === undefined) {
    throw new Error('Question ID and response value are required for answering');
  }

  const session = progressManager.getAssessmentSession(workflow_id);
  if (!session) {
    throw new Error('No active assessment session found');
  }

  // Save the question response
  progressManager.saveQuestionProgress(session.session_id, question_id, {
    response_value,
    confidence_level,
    notes,
    time_spent_seconds,
    state: 'answered'
  });

  // Get updated progress and next question
  const progressSummary = progressManager.getProgressSummary(workflow_id);
  const nextQuestion = progressManager.getNextQuestion(session.session_id);

  // Check if assessment is complete
  const isComplete = !nextQuestion && progressSummary?.questions_answered === progressSummary?.total_questions;

  if (isComplete) {
    // Mark session as completed
    const db = getDatabase();
    db.prepare(`
      UPDATE assessment_sessions 
      SET state = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE workflow_id = ?
    `).run(workflow_id);

    // Export final responses to main assessment system
    progressManager.exportAssessmentResponses(workflow_id);
    
    return {
      success: true,
      workflow_id,
      action: 'answer',
      session_state: 'completed',
      progress: {
        total_questions: progressSummary!.total_questions,
        questions_answered: progressSummary!.questions_answered,
        completion_percentage: 100,
        current_question_index: progressSummary!.total_questions
      },
      message: `🎉 Assessment completed! All ${progressSummary!.total_questions} questions answered.`,
      detailed_progress: progressManager.getDetailedProgress(workflow_id),
      can_resume: false
    };
  }

  // Return next question for continuation
  return {
    success: true,
    workflow_id,
    action: 'answer',
    session_state: 'in_progress',
    progress: {
      total_questions: progressSummary!.total_questions,
      questions_answered: progressSummary!.questions_answered,
      completion_percentage: progressSummary!.completion_percentage,
      current_question_index: progressSummary!.current_question_index
    },
    next_question: nextQuestion ? {
      question_id: nextQuestion.question_id,
      question_text: (nextQuestion as any).question_text,
      question_type: (nextQuestion as any).question_type,
      subcategory_id: nextQuestion.subcategory_id,
      help_text: (nextQuestion as any).help_text
    } : undefined,
    message: `Question answered successfully. Progress: ${progressSummary!.questions_answered}/${progressSummary!.total_questions} (${progressSummary!.completion_percentage}%)`,
    detailed_progress: progressManager.getDetailedProgress(workflow_id),
    can_resume: true,
    estimated_time_remaining_minutes: Math.round((progressSummary!.total_questions - progressSummary!.questions_answered) * 2)
  };
}

/**
 * Get current progress status
 */
async function getProgressStatus(workflowId: string, progressManager: any): Promise<AssessmentResponse> {
  const progressSummary = progressManager.getProgressSummary(workflowId);
  
  if (!progressSummary) {
    throw new Error('No assessment session found');
  }

  return {
    success: true,
    workflow_id: workflowId,
    action: 'get_progress',
    session_state: progressSummary.state,
    progress: {
      total_questions: progressSummary.total_questions,
      questions_answered: progressSummary.questions_answered,
      completion_percentage: progressSummary.completion_percentage,
      current_question_index: progressSummary.current_question_index
    },
    next_question: progressSummary.next_question ? {
      question_id: progressSummary.next_question.question_id,
      question_text: (progressSummary.next_question as any).question_text,
      question_type: (progressSummary.next_question as any).question_type,
      subcategory_id: progressSummary.next_question.subcategory_id,
      help_text: (progressSummary.next_question as any).help_text
    } : undefined,
    message: `Assessment progress: ${progressSummary.questions_answered}/${progressSummary.total_questions} questions completed (${progressSummary.completion_percentage}%)`,
    detailed_progress: progressManager.getDetailedProgress(workflowId),
    can_resume: progressSummary.can_resume,
    estimated_time_remaining_minutes: Math.round((progressSummary.total_questions - progressSummary.questions_answered) * 2)
  };
}

/**
 * Pause assessment for later resumption
 */
async function pauseAssessment(workflowId: string, progressManager: any): Promise<AssessmentResponse> {
  progressManager.pauseAssessment(workflowId);
  const progressSummary = progressManager.getProgressSummary(workflowId);

  return {
    success: true,
    workflow_id: workflowId,
    action: 'pause',
    session_state: 'paused',
    progress: {
      total_questions: progressSummary!.total_questions,
      questions_answered: progressSummary!.questions_answered,
      completion_percentage: progressSummary!.completion_percentage,
      current_question_index: progressSummary!.current_question_index
    },
    message: `Assessment paused. You can resume anytime by calling this tool with action 'resume'. Progress saved: ${progressSummary!.questions_answered}/${progressSummary!.total_questions} questions completed.`,
    detailed_progress: progressManager.getDetailedProgress(workflowId),
    can_resume: true
  };
}

// Tool definition for MCP registration
export const persistentComprehensiveAssessmentTool = {
  name: "persistent_comprehensive_assessment",
  description: "Manage comprehensive assessment with persistent progress tracking. Users can pause and resume assessments across sessions.",
  inputSchema: {
    type: "object" as const,
    properties: {
      workflow_id: {
        type: "string",
        description: "Workflow ID from start_assessment_workflow"
      },
      action: {
        type: "string",
        enum: ["start", "resume", "answer", "get_progress", "pause"],
        default: "resume",
        description: "Action to perform: start (initialize), resume (continue from last position), answer (respond to current question), get_progress (status only), pause (save and stop)"
      },
      question_id: {
        type: "string",
        description: "Question ID when answering (required for 'answer' action)"
      },
      response_value: {
        oneOf: [
          { type: "string" },
          { type: "number" }
        ],
        description: "Response value - string for text/choice responses, number for ratings"
      },
      confidence_level: {
        type: "string",
        enum: ["low", "medium", "high"],
        default: "medium",
        description: "Confidence level in the response"
      },
      notes: {
        type: "string",
        description: "Optional notes about the response"
      },
      time_spent_seconds: {
        type: "number",
        description: "Time spent on the question (for analytics)"
      },
      save_and_continue: {
        type: "boolean",
        default: true,
        description: "Whether to automatically continue to next question after answering"
      }
    },
    required: ["workflow_id"],
    additionalProperties: false
  },
  execute: persistentComprehensiveAssessment
};