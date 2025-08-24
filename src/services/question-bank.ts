/**
 * Question Bank Service - Generates comprehensive assessment questions
 * based on NIST CSF 2.0 subcategories with context-aware customization
 */

import { 
  AssessmentQuestion, 
  QuestionOption, 
  GetAssessmentQuestionsParams,
  QuestionContext,
  GetQuestionContextParams,
  OrganizationSize,
  AssessmentType 
} from '../types/question-bank.js';
import { ElementType } from '../types/index.js';
import { getFrameworkLoader } from './framework-loader.js';
import { logger } from '../utils/enhanced-logger.js';

export class QuestionBankService {
  private frameworkLoader = getFrameworkLoader();

  /**
   * Generate assessment questions based on parameters
   */
  async getAssessmentQuestions(params: GetAssessmentQuestionsParams): Promise<AssessmentQuestion[]> {
    try {
      const questions: AssessmentQuestion[] = [];
      
      // Get subcategories based on filters
      const subcategories = this.getFilteredSubcategories(params);
      
      for (const subcategory of subcategories) {
        const question = await this.generateQuestionForSubcategory(
          subcategory, 
          params
        );
        
        if (question) {
          questions.push(question);
        }
      }

      // Apply assessment type specific filtering and customization
      return this.customizeQuestionsForAssessmentType(questions, params);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to generate assessment questions', { error: errorMessage, params });
      throw new Error(`Failed to generate assessment questions: ${errorMessage}`);
    }
  }

  /**
   * Get detailed context for a specific question/subcategory
   */
  async getQuestionContext(params: GetQuestionContextParams): Promise<QuestionContext> {
    try {
      const subcategory = this.frameworkLoader.getElementById(params.subcategory_id);
      
      if (!subcategory || subcategory.element_type !== ElementType.SUBCATEGORY) {
        throw new Error(`Subcategory ${params.subcategory_id} not found`);
      }

      // Get category and function info
      const categoryId = params.subcategory_id.substring(0, params.subcategory_id.lastIndexOf('-'));
      const functionId = params.subcategory_id.substring(0, 2);
      
      const category = this.frameworkLoader.getElementById(categoryId);
      const functionElement = this.frameworkLoader.getElementById(functionId);

      // Get implementation examples if requested
      let implementationExamples: string[] = [];
      if (params.include_implementation_examples) {
        implementationExamples = this.getImplementationExamples(params.subcategory_id);
      }

      // Build context object
      const context: QuestionContext = {
        subcategory_id: params.subcategory_id,
        subcategory_text: subcategory.text || '',
        category_text: category?.text || '',
        function_text: functionElement?.text || '',
        implementation_examples: implementationExamples,
        references: params.include_references ? this.getReferences(params.subcategory_id) : undefined,
        related_subcategories: this.getRelatedSubcategories(params.subcategory_id),
        risk_factors: this.getRiskFactors(params.subcategory_id),
        common_challenges: this.getCommonChallenges(params.subcategory_id, params.organization_context),
        best_practices: this.getBestPractices(params.subcategory_id, params.organization_context),
        sector_specific_guidance: params.organization_context ? 
          this.getSectorSpecificGuidance(params.subcategory_id, params.organization_context.sector) : undefined
      };

      return context;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get question context', { error: errorMessage, params });
      throw new Error(`Failed to get question context: ${errorMessage}`);
    }
  }

  /**
   * Generate a question for a specific subcategory
   */
  private async generateQuestionForSubcategory(
    subcategory: any, 
    params: GetAssessmentQuestionsParams
  ): Promise<AssessmentQuestion | null> {
    try {
      const subcategoryId = subcategory.element_identifier;
      const categoryId = subcategoryId.substring(0, subcategoryId.lastIndexOf('-'));
      const functionId = subcategoryId.substring(0, 2);

      // Get question text based on subcategory
      const questionText = this.generateQuestionText(subcategory, params.assessment_type);
      
      // Get options based on assessment type
      const options = this.generateQuestionOptions(params.assessment_type, params.organization_size);
      
      // Get help text and examples
      const helpText = this.generateHelpText(subcategory);
      const examples = params.include_examples ? this.getImplementationExamples(subcategoryId) : undefined;
      const references = params.include_references ? this.getReferences(subcategoryId) : undefined;

      const question: AssessmentQuestion = {
        subcategory_id: subcategoryId,
        question_text: questionText,
        question_type: this.getQuestionType(params.assessment_type),
        options,
        help_text: helpText,
        examples,
        references,
        category: categoryId,
        function: functionId,
        weight: this.getQuestionWeight(subcategoryId, params.organization_size),
        required: this.isQuestionRequired(subcategoryId, params.assessment_type),
        conditional_logic: this.getConditionalLogic(subcategoryId)
      };

      return question;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Failed to generate question for subcategory', { 
        subcategory_id: subcategory.element_identifier, 
        error: errorMessage 
      });
      return null;
    }
  }

  /**
   * Get filtered subcategories based on parameters
   */
  private getFilteredSubcategories(params: GetAssessmentQuestionsParams): any[] {
    if (params.subcategory_ids?.length) {
      // Filter by specific subcategory IDs
      const subcategories = [];
      for (const id of params.subcategory_ids) {
        const subcategory = this.frameworkLoader.getElementById(id);
        if (subcategory && subcategory.element_type === ElementType.SUBCATEGORY) {
          subcategories.push(subcategory);
        }
      }
      return subcategories;
    }

    // Get all subcategories and filter
    let subcategories = this.frameworkLoader.getElementsByType(ElementType.SUBCATEGORY);
    
    if (params.function) {
      subcategories = subcategories.filter(sub => sub.element_identifier.startsWith(params.function!));
    }

    if (params.category) {
      subcategories = subcategories.filter(sub => 
        sub.element_identifier.substring(0, sub.element_identifier.lastIndexOf('-')) === params.category
      );
    }

    return subcategories;
  }

  /**
   * Generate question text based on subcategory and assessment type
   */
  private generateQuestionText(subcategory: any, assessmentType?: AssessmentType): string {
    const baseText = subcategory.text;
    
    switch (assessmentType) {
      case 'quick':
        return `How well does your organization implement: ${baseText}?`;
      case 'detailed':
        return `Rate your organization's current implementation level for: ${baseText}`;
      case 'custom':
        return `Assess your organization's maturity in: ${baseText}`;
      default:
        return `Evaluate your organization's implementation of: ${baseText}`;
    }
  }

  /**
   * Generate question options based on assessment type
   */
  private generateQuestionOptions(assessmentType?: AssessmentType, _orgSize?: OrganizationSize): QuestionOption[] {
    switch (assessmentType) {
      case 'quick':
        return [
          { value: 0, label: 'Not Implemented', description: 'No implementation or planning in place' },
          { value: 1, label: 'Partially Implemented', description: 'Some basic measures in place' },
          { value: 2, label: 'Largely Implemented', description: 'Most requirements met with minor gaps' },
          { value: 3, label: 'Fully Implemented', description: 'Complete implementation with regular review' }
        ];
        
      case 'detailed':
        return [
          { value: 0, label: 'Not Implemented', description: 'No processes, controls, or documentation in place', weight: 0 },
          { value: 1, label: 'Initial/Ad Hoc', description: 'Minimal processes, informal documentation', weight: 0.25 },
          { value: 2, label: 'Developing', description: 'Basic processes defined, some documentation', weight: 0.5 },
          { value: 3, label: 'Defined', description: 'Formal processes documented and communicated', weight: 0.75 },
          { value: 4, label: 'Managed', description: 'Processes monitored and measured for effectiveness', weight: 0.9 },
          { value: 5, label: 'Optimized', description: 'Continuous improvement with advanced automation', weight: 1.0 }
        ];
        
      default:
        return [
          { value: 0, label: 'No Implementation', description: 'Not addressed' },
          { value: 1, label: 'Basic Implementation', description: 'Minimal coverage' },
          { value: 2, label: 'Standard Implementation', description: 'Adequate coverage' },
          { value: 3, label: 'Advanced Implementation', description: 'Comprehensive coverage' },
          { value: 4, label: 'Leading Practice', description: 'Industry-leading implementation' }
        ];
    }
  }

  /**
   * Get question type based on assessment type
   */
  private getQuestionType(assessmentType?: AssessmentType): AssessmentQuestion['question_type'] {
    switch (assessmentType) {
      case 'quick':
        return 'implementation_status';
      case 'detailed':
        return 'maturity_rating';
      default:
        return 'maturity_rating';
    }
  }

  /**
   * Generate help text for a subcategory
   */
  private generateHelpText(subcategory: any): string {
    return `This question evaluates your organization's implementation of ${subcategory.element_identifier}. ` +
           `Consider your current processes, documentation, monitoring, and effectiveness when responding.`;
  }

  /**
   * Get implementation examples for a subcategory
   */
  private getImplementationExamples(subcategoryId: string): string[] {
    try {
      const examples = this.frameworkLoader.getImplementationExamples(subcategoryId);
      return examples.map(ex => ex.text || '').filter(text => text.length > 0) || [];
    } catch (error) {
      logger.warn('Failed to get implementation examples', { subcategory_id: subcategoryId });
      return [];
    }
  }

  /**
   * Get references for a subcategory
   */
  private getReferences(subcategoryId: string): string[] {
    // In a real implementation, this would pull from reference data
    return [
      `NIST CSF 2.0 - ${subcategoryId}`,
      'https://www.nist.gov/cyberframework'
    ];
  }

  /**
   * Get related subcategories
   */
  private getRelatedSubcategories(subcategoryId: string): string[] {
    // Get subcategories from the same category
    const categoryId = subcategoryId.substring(0, subcategoryId.lastIndexOf('-'));
    const related = this.frameworkLoader.getSubcategoriesForCategory(categoryId);
    
    return related
      .filter(sub => sub.element_identifier !== subcategoryId)
      .map(sub => sub.element_identifier)
      .slice(0, 5);
  }

  /**
   * Get risk factors for a subcategory
   */
  private getRiskFactors(subcategoryId: string): string[] {
    // Default risk factors - in production this would be more sophisticated
    const functionId = subcategoryId.substring(0, 2);
    
    const riskFactorMap: Record<string, string[]> = {
      'GV': ['Governance gaps', 'Policy violations', 'Compliance failures'],
      'ID': ['Asset visibility gaps', 'Unknown vulnerabilities', 'Threat intelligence gaps'],
      'PR': ['Control failures', 'Access violations', 'Data exposure'],
      'DE': ['Detection blind spots', 'Alert fatigue', 'False positives'],
      'RS': ['Incident response delays', 'Communication failures', 'Recovery planning gaps'],
      'RC': ['Business continuity failures', 'Data loss', 'Reputation damage']
    };

    return riskFactorMap[functionId] || ['Implementation gaps', 'Resource constraints', 'Skills shortages'];
  }

  /**
   * Get common challenges for implementation
   */
  private getCommonChallenges(_subcategoryId: string, orgContext?: { sector: string; size: string }): string[] {
    const baseRisks = ['Resource constraints', 'Skills gaps', 'Technology limitations'];
    
    if (orgContext?.size === 'small') {
      baseRisks.push('Limited budget', 'Competing priorities');
    } else if (orgContext?.size === 'enterprise') {
      baseRisks.push('Organizational complexity', 'Legacy system integration');
    }

    return baseRisks;
  }

  /**
   * Get best practices for implementation
   */
  private getBestPractices(_subcategoryId: string, _orgContext?: { sector: string; size: string }): string[] {
    return [
      'Start with risk assessment',
      'Engage stakeholders early',
      'Document processes clearly',
      'Implement monitoring and measurement',
      'Plan for continuous improvement'
    ];
  }

  /**
   * Get sector-specific guidance
   */
  private getSectorSpecificGuidance(_subcategoryId: string, sector: string): string[] {
    const guidanceMap: Record<string, string[]> = {
      'healthcare': ['Consider HIPAA compliance', 'Focus on patient data protection', 'Medical device security'],
      'finance': ['Meet PCI-DSS requirements', 'Focus on transaction security', 'Regulatory reporting'],
      'government': ['Follow FedRAMP guidelines', 'Consider classification levels', 'Public sector accountability'],
      'technology': ['Secure development practices', 'Intellectual property protection', 'Customer data privacy']
    };

    return guidanceMap[sector] || ['Industry-standard practices', 'Regulatory compliance', 'Stakeholder expectations'];
  }

  /**
   * Get question weight based on criticality and organization size
   */
  private getQuestionWeight(subcategoryId: string, orgSize?: OrganizationSize): number {
    // Critical subcategories get higher weights
    const criticalSubcategories = [
      'GV.OC-01', 'GV.RM-01', 'ID.AM-01', 'PR.AC-01', 'DE.CM-01', 'RS.RP-01', 'RC.RP-01'
    ];

    let weight = 1.0;
    
    if (criticalSubcategories.includes(subcategoryId)) {
      weight = 1.5;
    }

    // Adjust based on organization size
    if (orgSize === 'small' && subcategoryId.startsWith('GV')) {
      weight *= 1.2; // Governance more critical for small orgs
    }

    return weight;
  }

  /**
   * Determine if question is required
   */
  private isQuestionRequired(subcategoryId: string, assessmentType?: AssessmentType): boolean {
    if (assessmentType === 'quick') {
      return true; // All questions required in quick assessment
    }

    // Core subcategories are always required
    const coreSubcategories = [
      'GV.OC-01', 'GV.RM-01', 'ID.AM-01', 'PR.AC-01', 
      'DE.CM-01', 'RS.RP-01', 'RC.RP-01'
    ];

    return coreSubcategories.includes(subcategoryId);
  }

  /**
   * Get conditional logic for questions
   */
  private getConditionalLogic(_subcategoryId: string) {
    // Example: Some questions only show based on previous answers
    // This would be expanded with real business logic
    return undefined;
  }

  /**
   * Customize questions based on assessment type
   */
  private customizeQuestionsForAssessmentType(
    questions: AssessmentQuestion[], 
    params: GetAssessmentQuestionsParams
  ): AssessmentQuestion[] {
    let filteredQuestions = [...questions];

    // Apply assessment type specific filtering
    if (params.assessment_type === 'quick') {
      // For quick assessment, limit to core questions from each function
      const coreQuestions = filteredQuestions.filter(q => q.required);
      if (coreQuestions.length > 0) {
        filteredQuestions = coreQuestions;
      } else {
        // Fallback: first question from each category
        const categoryMap = new Map<string, AssessmentQuestion>();
        filteredQuestions.forEach(q => {
          if (!categoryMap.has(q.category)) {
            categoryMap.set(q.category, q);
          }
        });
        filteredQuestions = Array.from(categoryMap.values());
      }
    }

    // Sort by function, then category, then subcategory
    return filteredQuestions.sort((a, b) => {
      if (a.function !== b.function) {
        return a.function.localeCompare(b.function);
      }
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.subcategory_id.localeCompare(b.subcategory_id);
    });
  }
}

// Export singleton instance
export const questionBankService = new QuestionBankService();