/**
 * Question Bank Data Seeder
 * Seeds comprehensive question bank data for NIST CSF subcategories
 */

import { getDatabase } from '../db/database.js';
import { logger } from '../utils/enhanced-logger.js';
import { v4 as uuidv4 } from 'uuid';

export class QuestionSeeder {
  private db = getDatabase();

  /**
   * Seed all question bank data
   */
  async seedAllQuestions(): Promise<void> {
    logger.info('Starting question bank data seeding...');

    const startTime = Date.now();
    let totalQuestions = 0;

    try {
      // Governance function questions
      totalQuestions += await this.seedGovernanceQuestions();
      
      // Identify function questions
      totalQuestions += await this.seedIdentifyQuestions();
      
      // Protect function questions
      totalQuestions += await this.seedProtectQuestions();
      
      // Detect function questions
      totalQuestions += await this.seedDetectQuestions();
      
      // Respond function questions
      totalQuestions += await this.seedRespondQuestions();
      
      // Recover function questions
      totalQuestions += await this.seedRecoverQuestions();

      const duration = Date.now() - startTime;
      logger.info(`Question bank seeding completed: ${totalQuestions} questions seeded in ${duration}ms`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to seed question bank data:', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Seed Governance function questions
   */
  private async seedGovernanceQuestions(): Promise<number> {
    let questionCount = 0;

    // GV.OC-01: Organizational Context - Mission Understanding
    this.db.seedQuestionBankData('GV.OC-01', {
      questions: [
        {
          id: uuidv4(),
          questionText: 'Rate your organization\'s current implementation level for understanding and documenting organizational mission as it relates to cybersecurity risk management.',
          questionType: 'maturity_rating',
          helpText: 'This assessment evaluates how well your organization has defined and communicated its mission in the context of cybersecurity risk management.',
          weight: 1.2,
          required: true,
          options: [
            { id: uuidv4(), value: 0, label: 'Not Implemented', description: 'No documented mission or cybersecurity context', weight: 0.0, sortOrder: 0 },
            { id: uuidv4(), value: 1, label: 'Initial', description: 'Basic mission statement exists but lacks cybersecurity context', weight: 0.2, sortOrder: 1 },
            { id: uuidv4(), value: 2, label: 'Developing', description: 'Mission includes some cybersecurity considerations', weight: 0.4, sortOrder: 2 },
            { id: uuidv4(), value: 3, label: 'Defined', description: 'Clear mission with defined cybersecurity risk context', weight: 0.6, sortOrder: 3 },
            { id: uuidv4(), value: 4, label: 'Managed', description: 'Mission regularly reviewed and updated with cybersecurity alignment', weight: 0.8, sortOrder: 4 },
            { id: uuidv4(), value: 5, label: 'Optimized', description: 'Mission dynamically aligns with evolving cybersecurity landscape', weight: 1.0, sortOrder: 5 }
          ],
          examples: [
            { id: uuidv4(), text: 'Share the organization\'s mission to provide a basis for identifying risks', type: 'implementation', sortOrder: 0 },
            { id: uuidv4(), text: 'Document how cybersecurity supports business objectives', type: 'implementation', sortOrder: 1 },
            { id: uuidv4(), text: 'Quarterly mission-risk alignment reviews', type: 'evidence', sortOrder: 2 }
          ]
        }
      ],
      context: {
        riskFactors: [
          'Governance gaps',
          'Misaligned priorities',
          'Unclear accountability',
          'Resource allocation conflicts'
        ],
        bestPractices: [
          'Start with risk assessment',
          'Engage executive leadership',
          'Document clear policies',
          'Regular review and updates'
        ],
        commonChallenges: [
          'Resource constraints',
          'Competing priorities',
          'Lack of expertise',
          'Change resistance'
        ],
        sectorGuidance: {
          healthcare: ['Consider HIPAA compliance', 'Patient safety first', 'Medical device security'],
          finance: ['Regulatory compliance focus', 'Customer data protection', 'Operational resilience'],
          technology: ['Innovation vs security balance', 'Rapid development cycles', 'Third-party integrations'],
          government: ['Public trust requirements', 'Regulatory mandates', 'Citizen service continuity']
        },
        implementationRoadmap: [
          'Assess current governance state',
          'Define cybersecurity mission alignment',
          'Establish governance framework',
          'Implement monitoring and review processes'
        ],
        relatedSubcategories: ['GV.OC-02', 'GV.OC-03', 'GV.SC-01'],
        references: ['NIST CSF 2.0 - GV.OC-01', 'ISO 27001:2022', 'COSO Framework']
      }
    });
    questionCount += 1;

    // GV.SC-01: Cybersecurity Supply Chain Risk Management Strategy
    this.db.seedQuestionBankData('GV.SC-01', {
      questions: [
        {
          id: uuidv4(),
          questionText: 'How mature is your organization\'s cybersecurity supply chain risk management strategy?',
          questionType: 'maturity_rating',
          helpText: 'Assesses the development and implementation of supply chain cybersecurity risk management strategies.',
          weight: 1.5,
          required: true,
          options: [
            { id: uuidv4(), value: 0, label: 'Not Implemented', description: 'No supply chain cybersecurity strategy', weight: 0.0, sortOrder: 0 },
            { id: uuidv4(), value: 1, label: 'Initial', description: 'Basic awareness of supply chain risks', weight: 0.2, sortOrder: 1 },
            { id: uuidv4(), value: 2, label: 'Developing', description: 'Documented strategy under development', weight: 0.4, sortOrder: 2 },
            { id: uuidv4(), value: 3, label: 'Defined', description: 'Comprehensive strategy documented and approved', weight: 0.6, sortOrder: 3 },
            { id: uuidv4(), value: 4, label: 'Managed', description: 'Strategy implemented with regular monitoring', weight: 0.8, sortOrder: 4 },
            { id: uuidv4(), value: 5, label: 'Optimized', description: 'Continuous improvement and industry leadership', weight: 1.0, sortOrder: 5 }
          ],
          examples: [
            { id: uuidv4(), text: 'Vendor security assessment program', type: 'implementation', sortOrder: 0 },
            { id: uuidv4(), text: 'Third-party risk management framework', type: 'implementation', sortOrder: 1 },
            { id: uuidv4(), text: 'Supply chain security requirements in contracts', type: 'evidence', sortOrder: 2 }
          ]
        }
      ],
      context: {
        riskFactors: [
          'Third-party vulnerabilities',
          'Supply chain attacks',
          'Vendor dependencies',
          'Compliance gaps'
        ],
        bestPractices: [
          'Risk-based vendor assessment',
          'Contractual security requirements',
          'Continuous monitoring',
          'Incident response coordination'
        ],
        commonChallenges: [
          'Vendor cooperation',
          'Visibility limitations',
          'Cost considerations',
          'Complexity management'
        ],
        sectorGuidance: {
          technology: ['Software supply chain focus', 'Open source risk management', 'DevSecOps integration'],
          healthcare: ['Medical device supply chain', 'Vendor BAAs required', 'Patient safety considerations'],
          finance: ['Regulatory oversight requirements', 'Operational resilience focus', 'Critical service providers']
        },
        implementationRoadmap: [
          'Inventory supply chain dependencies',
          'Develop risk assessment criteria',
          'Implement vendor management program',
          'Establish monitoring and response capabilities'
        ],
        relatedSubcategories: ['GV.SC-02', 'GV.SC-03', 'ID.AM-01', 'ID.AM-02'],
        references: ['NIST CSF 2.0 - GV.SC-01', 'NIST SP 800-161', 'ISO 28000']
      }
    });
    questionCount += 1;

    logger.info(`Seeded ${questionCount} Governance questions`);
    return questionCount;
  }

  /**
   * Seed Identify function questions
   */
  private async seedIdentifyQuestions(): Promise<number> {
    let questionCount = 0;

    // ID.AM-01: Asset Management - Asset Identification
    this.db.seedQuestionBankData('ID.AM-01', {
      questions: [
        {
          id: uuidv4(),
          questionText: 'Rate the maturity of your asset identification and inventory management processes.',
          questionType: 'maturity_rating',
          helpText: 'Evaluates how well your organization identifies, catalogs, and maintains an inventory of assets.',
          weight: 1.3,
          required: true,
          options: [
            { id: uuidv4(), value: 0, label: 'Not Implemented', description: 'No asset inventory exists', weight: 0.0, sortOrder: 0 },
            { id: uuidv4(), value: 1, label: 'Initial', description: 'Basic manual asset tracking', weight: 0.2, sortOrder: 1 },
            { id: uuidv4(), value: 2, label: 'Developing', description: 'Systematic inventory process in development', weight: 0.4, sortOrder: 2 },
            { id: uuidv4(), value: 3, label: 'Defined', description: 'Comprehensive asset inventory maintained', weight: 0.6, sortOrder: 3 },
            { id: uuidv4(), value: 4, label: 'Managed', description: 'Automated discovery and lifecycle management', weight: 0.8, sortOrder: 4 },
            { id: uuidv4(), value: 5, label: 'Optimized', description: 'Real-time asset visibility and intelligence', weight: 1.0, sortOrder: 5 }
          ],
          examples: [
            { id: uuidv4(), text: 'CMDB with automated discovery tools', type: 'implementation', organizationSize: 'large', sortOrder: 0 },
            { id: uuidv4(), text: 'Network scanning and asset tagging', type: 'implementation', sortOrder: 1 },
            { id: uuidv4(), text: 'Asset register with ownership and criticality', type: 'evidence', sortOrder: 2 }
          ]
        }
      ],
      context: {
        riskFactors: [
          'Asset visibility gaps',
          'Unknown or unmanaged devices',
          'Configuration drift',
          'Lifecycle management failures'
        ],
        bestPractices: [
          'Automated asset discovery',
          'Classification and criticality ranking',
          'Regular inventory validation',
          'Integration with security tools'
        ],
        commonChallenges: [
          'Shadow IT',
          'BYOD management',
          'Cloud asset visibility',
          'Legacy system integration'
        ],
        sectorGuidance: {
          technology: ['Dynamic infrastructure', 'Container and microservices tracking', 'DevOps tool integration'],
          healthcare: ['Medical device inventory', 'Biomedical equipment tracking', 'FDA compliance requirements'],
          finance: ['Trading system assets', 'Regulatory reporting requirements', 'High availability systems']
        },
        implementationRoadmap: [
          'Define asset categories and scope',
          'Deploy discovery and scanning tools',
          'Establish asset management processes',
          'Implement automated maintenance and updates'
        ],
        relatedSubcategories: ['ID.AM-02', 'ID.AM-03', 'PR.IP-01'],
        references: ['NIST CSF 2.0 - ID.AM-01', 'ISO 27001:2022 - A.8.1', 'ITIL Asset Management']
      }
    });
    questionCount += 1;

    logger.info(`Seeded ${questionCount} Identify questions`);
    return questionCount;
  }

  /**
   * Seed Protect function questions (sample implementation)
   */
  private async seedProtectQuestions(): Promise<number> {
    // Add sample protect questions here
    logger.info('Seeded 0 Protect questions (placeholder)');
    return 0;
  }

  /**
   * Seed Detect function questions (sample implementation)
   */
  private async seedDetectQuestions(): Promise<number> {
    // Add sample detect questions here
    logger.info('Seeded 0 Detect questions (placeholder)');
    return 0;
  }

  /**
   * Seed Respond function questions (sample implementation)
   */
  private async seedRespondQuestions(): Promise<number> {
    // Add sample respond questions here
    logger.info('Seeded 0 Respond questions (placeholder)');
    return 0;
  }

  /**
   * Seed Recover function questions (sample implementation)
   */
  private async seedRecoverQuestions(): Promise<number> {
    // Add sample recover questions here
    logger.info('Seeded 0 Recover questions (placeholder)');
    return 0;
  }

  /**
   * Clear all question bank data
   */
  async clearAllQuestions(): Promise<void> {
    logger.info('Clearing all question bank data...');

    const tables = [
      'question_responses',
      'question_validation_rules', 
      'question_examples',
      'question_options',
      'question_context',
      'question_bank'
    ];

    for (const table of tables) {
      this.db.prepare(`DELETE FROM ${table}`).run();
      logger.info(`Cleared ${table} table`);
    }

    logger.info('All question bank data cleared');
  }

  /**
   * Get seeding statistics
   */
  getSeedingStats(): any {
    return this.db.getQuestionBankStats();
  }
}

// Export singleton instance
export const questionSeeder = new QuestionSeeder();