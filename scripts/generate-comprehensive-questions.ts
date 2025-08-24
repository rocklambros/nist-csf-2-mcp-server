#!/usr/bin/env npx tsx
/**
 * Comprehensive Question Bank Generator for NIST CSF 2.0
 * Generates comprehensive assessment questions for all 106 subcategories
 * Covers risk assessment and maturity evaluation dimensions
 */

import { writeFileSync } from 'fs';
import { getDatabase, closeDatabase } from '../src/db/database.js';
import { logger } from '../src/utils/enhanced-logger.js';

interface AssessmentQuestion {
  subcategory_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'yes_no' | 'scale';
  assessment_dimension: 'risk' | 'maturity' | 'implementation' | 'effectiveness';
  weight: number;
  options: QuestionOption[];
}

interface QuestionOption {
  option_text: string;
  score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  maturity_level: 'initial' | 'developing' | 'defined' | 'managed' | 'optimizing';
}

interface ComprehensiveQuestionBank {
  metadata: {
    version: string;
    created_date: string;
    description: string;
    total_questions: number;
    subcategories_covered: number;
    assessment_dimensions: string[];
  };
  questions: AssessmentQuestion[];
}

class ComprehensiveQuestionGenerator {
  private db: any;
  
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Generate comprehensive question bank for all subcategories
   */
  async generateQuestionBank(): Promise<boolean> {
    logger.info('🚀 Generating comprehensive question bank for all 106 NIST CSF 2.0 subcategories');

    try {
      const subcategories = this.db.prepare('SELECT id, description FROM subcategories ORDER BY id').all();
      logger.info(`📊 Processing ${subcategories.length} subcategories`);

      const questions: AssessmentQuestion[] = [];

      for (const subcategory of subcategories) {
        const subcategoryQuestions = this.generateQuestionsForSubcategory(
          subcategory.id, 
          subcategory.description
        );
        questions.push(...subcategoryQuestions);
        
        if (questions.length % 50 === 0) {
          logger.info(`  ✅ Generated ${questions.length} questions so far`);
        }
      }

      const questionBank: ComprehensiveQuestionBank = {
        metadata: {
          version: "2.0",
          created_date: new Date().toISOString().split('T')[0],
          description: "Comprehensive assessment question bank for all 106 NIST CSF 2.0 subcategories",
          total_questions: questions.length,
          subcategories_covered: subcategories.length,
          assessment_dimensions: ['risk', 'maturity', 'implementation', 'effectiveness']
        },
        questions
      };

      // Write comprehensive question bank file
      const questionBankJson = JSON.stringify(questionBank, null, 2);
      writeFileSync('./comprehensive-question-bank.json', questionBankJson);

      logger.info(`🎉 Generated ${questions.length} questions for ${subcategories.length} subcategories`);
      logger.info(`📈 Average: ${Math.round(questions.length / subcategories.length)} questions per subcategory`);
      return true;

    } catch (error) {
      logger.error('💥 Question bank generation failed:', error);
      return false;
    }
  }

  /**
   * Generate comprehensive questions for a specific subcategory
   */
  private generateQuestionsForSubcategory(subcategoryId: string, description: string): AssessmentQuestion[] {
    const questions: AssessmentQuestion[] = [];
    
    // Generate 4 questions per subcategory covering different dimensions
    questions.push(this.generateRiskAssessmentQuestion(subcategoryId, description));
    questions.push(this.generateMaturityQuestion(subcategoryId, description));
    questions.push(this.generateImplementationQuestion(subcategoryId, description));
    questions.push(this.generateEffectivenessQuestion(subcategoryId, description));

    return questions;
  }

  /**
   * Generate risk assessment question
   */
  private generateRiskAssessmentQuestion(subcategoryId: string, description: string): AssessmentQuestion {
    const functionCode = subcategoryId.substring(0, 2);
    const categoryCode = subcategoryId.substring(0, 5);
    
    let questionText = '';
    let options: QuestionOption[] = [];

    switch (functionCode) {
      case 'GV':
        questionText = this.generateGovernanceRiskQuestion(subcategoryId, description);
        break;
      case 'ID':
        questionText = this.generateIdentifyRiskQuestion(subcategoryId, description);
        break;
      case 'PR':
        questionText = this.generateProtectRiskQuestion(subcategoryId, description);
        break;
      case 'DE':
        questionText = this.generateDetectRiskQuestion(subcategoryId, description);
        break;
      case 'RS':
        questionText = this.generateRespondRiskQuestion(subcategoryId, description);
        break;
      case 'RC':
        questionText = this.generateRecoverRiskQuestion(subcategoryId, description);
        break;
      default:
        questionText = `How would you assess the current risk exposure related to ${description.toLowerCase()}?`;
    }

    // Standard risk assessment options
    options = [
      {
        option_text: "No significant risk identified - comprehensive controls in place",
        score: 10,
        risk_level: 'low',
        maturity_level: 'managed'
      },
      {
        option_text: "Low risk - basic controls implemented with minor gaps",
        score: 7,
        risk_level: 'low',
        maturity_level: 'defined'
      },
      {
        option_text: "Medium risk - some controls in place but significant gaps exist",
        score: 5,
        risk_level: 'medium',
        maturity_level: 'developing'
      },
      {
        option_text: "High risk - minimal or ineffective controls",
        score: 2,
        risk_level: 'high',
        maturity_level: 'initial'
      },
      {
        option_text: "Critical risk - no controls in place or complete failure",
        score: 0,
        risk_level: 'critical',
        maturity_level: 'initial'
      }
    ];

    return {
      subcategory_id: subcategoryId,
      question_text: questionText,
      question_type: 'multiple_choice',
      assessment_dimension: 'risk',
      weight: 1.0,
      options
    };
  }

  /**
   * Generate maturity assessment question
   */
  private generateMaturityQuestion(subcategoryId: string, description: string): AssessmentQuestion {
    const functionCode = subcategoryId.substring(0, 2);
    
    let questionText = '';
    
    switch (functionCode) {
      case 'GV':
        questionText = this.generateGovernanceMaturityQuestion(subcategoryId, description);
        break;
      case 'ID':
        questionText = this.generateIdentifyMaturityQuestion(subcategoryId, description);
        break;
      case 'PR':
        questionText = this.generateProtectMaturityQuestion(subcategoryId, description);
        break;
      case 'DE':
        questionText = this.generateDetectMaturityQuestion(subcategoryId, description);
        break;
      case 'RS':
        questionText = this.generateRespondMaturityQuestion(subcategoryId, description);
        break;
      case 'RC':
        questionText = this.generateRecoverMaturityQuestion(subcategoryId, description);
        break;
      default:
        questionText = `What is the maturity level of your organization's approach to ${description.toLowerCase()}?`;
    }

    // Standard maturity assessment options
    const options: QuestionOption[] = [
      {
        option_text: "Optimizing - Continuous improvement with metrics-driven optimization",
        score: 10,
        risk_level: 'low',
        maturity_level: 'optimizing'
      },
      {
        option_text: "Managed - Established processes with regular monitoring and measurement",
        score: 8,
        risk_level: 'low',
        maturity_level: 'managed'
      },
      {
        option_text: "Defined - Documented and standardized processes across the organization",
        score: 6,
        risk_level: 'medium',
        maturity_level: 'defined'
      },
      {
        option_text: "Developing - Basic processes in place but inconsistent implementation",
        score: 4,
        risk_level: 'medium',
        maturity_level: 'developing'
      },
      {
        option_text: "Initial - Ad-hoc or reactive approach with minimal structure",
        score: 2,
        risk_level: 'high',
        maturity_level: 'initial'
      }
    ];

    return {
      subcategory_id: subcategoryId,
      question_text: questionText,
      question_type: 'multiple_choice',
      assessment_dimension: 'maturity',
      weight: 1.0,
      options
    };
  }

  /**
   * Generate implementation assessment question
   */
  private generateImplementationQuestion(subcategoryId: string, description: string): AssessmentQuestion {
    const functionCode = subcategoryId.substring(0, 2);
    
    let questionText = '';
    
    switch (functionCode) {
      case 'GV':
        questionText = this.generateGovernanceImplementationQuestion(subcategoryId, description);
        break;
      case 'ID':
        questionText = this.generateIdentifyImplementationQuestion(subcategoryId, description);
        break;
      case 'PR':
        questionText = this.generateProtectImplementationQuestion(subcategoryId, description);
        break;
      case 'DE':
        questionText = this.generateDetectImplementationQuestion(subcategoryId, description);
        break;
      case 'RS':
        questionText = this.generateRespondImplementationQuestion(subcategoryId, description);
        break;
      case 'RC':
        questionText = this.generateRecoverImplementationQuestion(subcategoryId, description);
        break;
      default:
        questionText = `What is the current implementation status of ${description.toLowerCase()} in your organization?`;
    }

    // Standard implementation assessment options
    const options: QuestionOption[] = [
      {
        option_text: "Fully implemented and operational across all applicable areas",
        score: 10,
        risk_level: 'low',
        maturity_level: 'managed'
      },
      {
        option_text: "Mostly implemented with minor gaps or limited scope",
        score: 7,
        risk_level: 'low',
        maturity_level: 'defined'
      },
      {
        option_text: "Partially implemented in some areas but inconsistent",
        score: 5,
        risk_level: 'medium',
        maturity_level: 'developing'
      },
      {
        option_text: "In planning or early implementation stages",
        score: 3,
        risk_level: 'medium',
        maturity_level: 'developing'
      },
      {
        option_text: "Not implemented or only conceptual understanding",
        score: 0,
        risk_level: 'high',
        maturity_level: 'initial'
      }
    ];

    return {
      subcategory_id: subcategoryId,
      question_text: questionText,
      question_type: 'multiple_choice',
      assessment_dimension: 'implementation',
      weight: 1.0,
      options
    };
  }

  /**
   * Generate effectiveness assessment question
   */
  private generateEffectivenessQuestion(subcategoryId: string, description: string): AssessmentQuestion {
    const functionCode = subcategoryId.substring(0, 2);
    
    let questionText = '';
    
    switch (functionCode) {
      case 'GV':
        questionText = this.generateGovernanceEffectivenessQuestion(subcategoryId, description);
        break;
      case 'ID':
        questionText = this.generateIdentifyEffectivenessQuestion(subcategoryId, description);
        break;
      case 'PR':
        questionText = this.generateProtectEffectivenessQuestion(subcategoryId, description);
        break;
      case 'DE':
        questionText = this.generateDetectEffectivenessQuestion(subcategoryId, description);
        break;
      case 'RS':
        questionText = this.generateRespondEffectivenessQuestion(subcategoryId, description);
        break;
      case 'RC':
        questionText = this.generateRecoverEffectivenessQuestion(subcategoryId, description);
        break;
      default:
        questionText = `How effective are your current measures for ${description.toLowerCase()}?`;
    }

    // Standard effectiveness assessment options
    const options: QuestionOption[] = [
      {
        option_text: "Highly effective with measurable positive outcomes and continuous improvement",
        score: 10,
        risk_level: 'low',
        maturity_level: 'optimizing'
      },
      {
        option_text: "Generally effective with good results and regular monitoring",
        score: 7,
        risk_level: 'low',
        maturity_level: 'managed'
      },
      {
        option_text: "Moderately effective but with room for improvement",
        score: 5,
        risk_level: 'medium',
        maturity_level: 'defined'
      },
      {
        option_text: "Limited effectiveness with inconsistent results",
        score: 3,
        risk_level: 'medium',
        maturity_level: 'developing'
      },
      {
        option_text: "Ineffective or not able to measure effectiveness",
        score: 1,
        risk_level: 'high',
        maturity_level: 'initial'
      }
    ];

    return {
      subcategory_id: subcategoryId,
      question_text: questionText,
      question_type: 'multiple_choice',
      assessment_dimension: 'effectiveness',
      weight: 1.0,
      options
    };
  }

  // GOVERN (GV) Question Generators
  private generateGovernanceRiskQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('OC')) {
      return "What is the risk level associated with your organization's cybersecurity context and stakeholder management?";
    }
    if (subcategoryId.includes('RM')) {
      return "How would you assess the risk exposure from your current cybersecurity risk management approach?";
    }
    if (subcategoryId.includes('RR')) {
      return "What risk level exists regarding cybersecurity roles, responsibilities, and resource allocation?";
    }
    if (subcategoryId.includes('PO')) {
      return "How would you rate the risk associated with your cybersecurity policy framework?";
    }
    if (subcategoryId.includes('OV')) {
      return "What is the risk level related to cybersecurity strategy oversight and performance management?";
    }
    if (subcategoryId.includes('SC')) {
      return "How would you assess the cybersecurity risk from your supply chain and third-party relationships?";
    }
    return `What is the risk level associated with ${description.toLowerCase()}?`;
  }

  private generateGovernanceMaturityQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('OC')) {
      return "What is the maturity level of your organizational cybersecurity context management?";
    }
    if (subcategoryId.includes('RM')) {
      return "How mature is your cybersecurity risk management program?";
    }
    if (subcategoryId.includes('RR')) {
      return "What is the maturity of your cybersecurity roles and responsibilities framework?";
    }
    if (subcategoryId.includes('PO')) {
      return "How mature is your cybersecurity policy development and management process?";
    }
    if (subcategoryId.includes('OV')) {
      return "What is the maturity level of your cybersecurity oversight and governance processes?";
    }
    if (subcategoryId.includes('SC')) {
      return "How mature is your cybersecurity supply chain risk management program?";
    }
    return `What is the maturity level of ${description.toLowerCase()}?`;
  }

  private generateGovernanceImplementationQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('OC')) {
      return "How well implemented is your organizational cybersecurity context identification and management?";
    }
    if (subcategoryId.includes('RM')) {
      return "What is the implementation status of your cybersecurity risk management strategy?";
    }
    if (subcategoryId.includes('RR')) {
      return "How completely are cybersecurity roles and responsibilities implemented across your organization?";
    }
    if (subcategoryId.includes('PO')) {
      return "What is the implementation status of your cybersecurity policies?";
    }
    if (subcategoryId.includes('OV')) {
      return "How well implemented are your cybersecurity oversight and performance management processes?";
    }
    if (subcategoryId.includes('SC')) {
      return "What is the implementation status of cybersecurity requirements in your supply chain management?";
    }
    return `What is the implementation status of ${description.toLowerCase()}?`;
  }

  private generateGovernanceEffectivenessQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('OC')) {
      return "How effective is your organization at maintaining accurate cybersecurity context and stakeholder engagement?";
    }
    if (subcategoryId.includes('RM')) {
      return "How effective is your cybersecurity risk management program at reducing actual risk?";
    }
    if (subcategoryId.includes('RR')) {
      return "How effective are your cybersecurity roles and responsibilities in achieving security objectives?";
    }
    if (subcategoryId.includes('PO')) {
      return "How effective are your cybersecurity policies at guiding organizational behavior?";
    }
    if (subcategoryId.includes('OV')) {
      return "How effective is your cybersecurity oversight in improving security posture?";
    }
    if (subcategoryId.includes('SC')) {
      return "How effective are your cybersecurity supply chain risk management efforts?";
    }
    return `How effective are your efforts related to ${description.toLowerCase()}?`;
  }

  // IDENTIFY (ID) Question Generators
  private generateIdentifyRiskQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('AM')) {
      return "What is the risk level associated with your current asset management and inventory practices?";
    }
    if (subcategoryId.includes('RA')) {
      return "How would you assess the risk from your current risk assessment and vulnerability management approach?";
    }
    if (subcategoryId.includes('IM')) {
      return "What risk level exists regarding your cybersecurity improvement processes?";
    }
    return `What is the risk level associated with ${description.toLowerCase()}?`;
  }

  private generateIdentifyMaturityQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('AM')) {
      return "How mature is your asset management and inventory program?";
    }
    if (subcategoryId.includes('RA')) {
      return "What is the maturity level of your risk assessment and vulnerability management processes?";
    }
    if (subcategoryId.includes('IM')) {
      return "How mature are your cybersecurity improvement and learning processes?";
    }
    return `What is the maturity level of ${description.toLowerCase()}?`;
  }

  private generateIdentifyImplementationQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('AM')) {
      return "How well implemented are your asset identification and management processes?";
    }
    if (subcategoryId.includes('RA')) {
      return "What is the implementation status of your risk assessment and vulnerability management program?";
    }
    if (subcategoryId.includes('IM')) {
      return "How completely implemented are your cybersecurity improvement processes?";
    }
    return `What is the implementation status of ${description.toLowerCase()}?`;
  }

  private generateIdentifyEffectivenessQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('AM')) {
      return "How effective is your asset management program at maintaining accurate inventories and classifications?";
    }
    if (subcategoryId.includes('RA')) {
      return "How effective are your risk assessment processes at identifying and prioritizing actual risks?";
    }
    if (subcategoryId.includes('IM')) {
      return "How effective are your cybersecurity improvement processes at enhancing security posture?";
    }
    return `How effective are your efforts related to ${description.toLowerCase()}?`;
  }

  // PROTECT (PR) Question Generators
  private generateProtectRiskQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('AA')) {
      return "What is the risk level associated with your current access control and identity management?";
    }
    if (subcategoryId.includes('AT')) {
      return "How would you assess the risk from inadequate cybersecurity awareness and training?";
    }
    if (subcategoryId.includes('DS')) {
      return "What risk level exists regarding your data security and privacy protection measures?";
    }
    if (subcategoryId.includes('PS')) {
      return "How would you rate the risk associated with your platform and system security?";
    }
    if (subcategoryId.includes('IR')) {
      return "What is the risk level related to your infrastructure resilience and recovery capabilities?";
    }
    return `What is the risk level associated with ${description.toLowerCase()}?`;
  }

  private generateProtectMaturityQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('AA')) {
      return "How mature is your access control and identity management program?";
    }
    if (subcategoryId.includes('AT')) {
      return "What is the maturity level of your cybersecurity awareness and training program?";
    }
    if (subcategoryId.includes('DS')) {
      return "How mature are your data security and privacy protection processes?";
    }
    if (subcategoryId.includes('PS')) {
      return "What is the maturity of your platform and system security management?";
    }
    if (subcategoryId.includes('IR')) {
      return "How mature is your infrastructure resilience and business continuity program?";
    }
    return `What is the maturity level of ${description.toLowerCase()}?`;
  }

  private generateProtectImplementationQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('AA')) {
      return "How well implemented are your access control and identity management systems?";
    }
    if (subcategoryId.includes('AT')) {
      return "What is the implementation status of your cybersecurity awareness and training programs?";
    }
    if (subcategoryId.includes('DS')) {
      return "How completely implemented are your data security and privacy protection measures?";
    }
    if (subcategoryId.includes('PS')) {
      return "What is the implementation status of your platform and system security controls?";
    }
    if (subcategoryId.includes('IR')) {
      return "How well implemented are your infrastructure resilience and recovery capabilities?";
    }
    return `What is the implementation status of ${description.toLowerCase()}?`;
  }

  private generateProtectEffectivenessQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('AA')) {
      return "How effective are your access controls at preventing unauthorized access?";
    }
    if (subcategoryId.includes('AT')) {
      return "How effective is your cybersecurity training at changing employee behavior?";
    }
    if (subcategoryId.includes('DS')) {
      return "How effective are your data security measures at protecting sensitive information?";
    }
    if (subcategoryId.includes('PS')) {
      return "How effective are your platform security controls at preventing system compromises?";
    }
    if (subcategoryId.includes('IR')) {
      return "How effective is your infrastructure at maintaining resilience during disruptions?";
    }
    return `How effective are your efforts related to ${description.toLowerCase()}?`;
  }

  // DETECT (DE) Question Generators
  private generateDetectRiskQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('CM')) {
      return "What is the risk level from gaps in your continuous monitoring and detection capabilities?";
    }
    if (subcategoryId.includes('AE')) {
      return "How would you assess the risk from your current adverse event analysis and response processes?";
    }
    return `What is the risk level associated with ${description.toLowerCase()}?`;
  }

  private generateDetectMaturityQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('CM')) {
      return "How mature is your continuous monitoring and detection program?";
    }
    if (subcategoryId.includes('AE')) {
      return "What is the maturity level of your adverse event analysis and detection processes?";
    }
    return `What is the maturity level of ${description.toLowerCase()}?`;
  }

  private generateDetectImplementationQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('CM')) {
      return "How well implemented are your continuous monitoring and detection systems?";
    }
    if (subcategoryId.includes('AE')) {
      return "What is the implementation status of your adverse event analysis capabilities?";
    }
    return `What is the implementation status of ${description.toLowerCase()}?`;
  }

  private generateDetectEffectivenessQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('CM')) {
      return "How effective are your monitoring systems at detecting cybersecurity events?";
    }
    if (subcategoryId.includes('AE')) {
      return "How effective is your adverse event analysis at identifying and escalating threats?";
    }
    return `How effective are your efforts related to ${description.toLowerCase()}?`;
  }

  // RESPOND (RS) Question Generators
  private generateRespondRiskQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('MA')) {
      return "What is the risk level associated with your incident response management capabilities?";
    }
    if (subcategoryId.includes('AN')) {
      return "How would you assess the risk from gaps in your incident analysis processes?";
    }
    if (subcategoryId.includes('CO')) {
      return "What risk level exists regarding your incident response communication and coordination?";
    }
    if (subcategoryId.includes('MI')) {
      return "How would you rate the risk associated with your incident mitigation and containment abilities?";
    }
    return `What is the risk level associated with ${description.toLowerCase()}?`;
  }

  private generateRespondMaturityQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('MA')) {
      return "How mature is your incident response management program?";
    }
    if (subcategoryId.includes('AN')) {
      return "What is the maturity level of your incident analysis and forensics capabilities?";
    }
    if (subcategoryId.includes('CO')) {
      return "How mature are your incident response communication and coordination processes?";
    }
    if (subcategoryId.includes('MI')) {
      return "What is the maturity of your incident mitigation and containment procedures?";
    }
    return `What is the maturity level of ${description.toLowerCase()}?`;
  }

  private generateRespondImplementationQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('MA')) {
      return "How well implemented are your incident response management procedures?";
    }
    if (subcategoryId.includes('AN')) {
      return "What is the implementation status of your incident analysis and forensics capabilities?";
    }
    if (subcategoryId.includes('CO')) {
      return "How completely implemented are your incident communication and coordination protocols?";
    }
    if (subcategoryId.includes('MI')) {
      return "What is the implementation status of your incident mitigation and containment measures?";
    }
    return `What is the implementation status of ${description.toLowerCase()}?`;
  }

  private generateRespondEffectivenessQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('MA')) {
      return "How effective is your incident response management at minimizing impact?";
    }
    if (subcategoryId.includes('AN')) {
      return "How effective are your incident analysis processes at determining root cause?";
    }
    if (subcategoryId.includes('CO')) {
      return "How effective is your incident communication at coordinating response efforts?";
    }
    if (subcategoryId.includes('MI')) {
      return "How effective are your mitigation measures at containing and eliminating threats?";
    }
    return `How effective are your efforts related to ${description.toLowerCase()}?`;
  }

  // RECOVER (RC) Question Generators
  private generateRecoverRiskQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('RP')) {
      return "What is the risk level associated with your recovery planning and execution capabilities?";
    }
    if (subcategoryId.includes('CO')) {
      return "How would you assess the risk from your recovery communication and coordination processes?";
    }
    return `What is the risk level associated with ${description.toLowerCase()}?`;
  }

  private generateRecoverMaturityQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('RP')) {
      return "How mature is your recovery planning and business continuity program?";
    }
    if (subcategoryId.includes('CO')) {
      return "What is the maturity level of your recovery communication and stakeholder coordination?";
    }
    return `What is the maturity level of ${description.toLowerCase()}?`;
  }

  private generateRecoverImplementationQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('RP')) {
      return "How well implemented are your recovery planning and execution procedures?";
    }
    if (subcategoryId.includes('CO')) {
      return "What is the implementation status of your recovery communication protocols?";
    }
    return `What is the implementation status of ${description.toLowerCase()}?`;
  }

  private generateRecoverEffectivenessQuestion(subcategoryId: string, description: string): string {
    if (subcategoryId.includes('RP')) {
      return "How effective are your recovery procedures at restoring normal operations?";
    }
    if (subcategoryId.includes('CO')) {
      return "How effective is your recovery communication at coordinating restoration efforts?";
    }
    return `How effective are your efforts related to ${description.toLowerCase()}?`;
  }
}

// Run the generator
async function main() {
  const generator = new ComprehensiveQuestionGenerator();
  const success = await generator.generateQuestionBank();
  
  closeDatabase();
  logger.info('🔐 Database connection closed');
  
  if (success) {
    logger.info('✅ Comprehensive question bank generated successfully');
  } else {
    logger.error('❌ Failed to generate comprehensive question bank');
  }
  
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  logger.error('💥 Question generator script failed:', error);
  closeDatabase();
  process.exit(1);
});