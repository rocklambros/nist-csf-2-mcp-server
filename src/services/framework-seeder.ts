/**
 * Framework Data Seeder
 * Seeds basic NIST CSF framework structure for question bank functionality
 */

import { getDatabase } from '../db/database.js';
import { logger } from '../utils/enhanced-logger.js';

export class FrameworkSeeder {
  private db = getDatabase();

  /**
   * Seed basic framework structure
   */
  async seedBasicFramework(): Promise<void> {
    logger.info('Seeding basic NIST CSF framework structure...');

    const transaction = this.db.prepare('BEGIN').bind();
    
    try {
      transaction.run();

      // Seed Functions
      await this.seedFunctions();
      
      // Seed Categories
      await this.seedCategories();
      
      // Seed Subcategories
      await this.seedSubcategories();

      this.db.prepare('COMMIT').run();
      logger.info('Framework structure seeded successfully');

    } catch (error) {
      this.db.prepare('ROLLBACK').run();
      logger.error('Failed to seed framework structure:', error as Error);
      throw error;
    }
  }

  private async seedFunctions(): Promise<void> {
    const insertFunction = this.db.prepare(`
      INSERT OR REPLACE INTO functions (id, name, description) VALUES (?, ?, ?)
    `);

    const functions = [
      { id: 'GV', name: 'GOVERN', description: 'The organization\'s cybersecurity risk management strategy is established' },
      { id: 'ID', name: 'IDENTIFY', description: 'The organization\'s current cybersecurity posture is understood' },
      { id: 'PR', name: 'PROTECT', description: 'Safeguards are implemented to limit or contain the impact of potential events' },
      { id: 'DE', name: 'DETECT', description: 'Activities are implemented to identify the occurrence of events' },
      { id: 'RS', name: 'RESPOND', description: 'Actions are taken regarding a detected event' },
      { id: 'RC', name: 'RECOVER', description: 'Activities are implemented to restore capabilities or services' }
    ];

    for (const func of functions) {
      insertFunction.run(func.id, func.name, func.description);
    }

    logger.info(`Seeded ${functions.length} functions`);
  }

  private async seedCategories(): Promise<void> {
    const insertCategory = this.db.prepare(`
      INSERT OR REPLACE INTO categories (id, function_id, name, description) VALUES (?, ?, ?, ?)
    `);

    const categories = [
      // Governance
      { id: 'GV.OC', function_id: 'GV', name: 'Organizational Context', description: 'The circumstances surrounding the organization\'s cybersecurity risk management decisions are understood' },
      { id: 'GV.RM', function_id: 'GV', name: 'Risk Management Strategy', description: 'The organization\'s priorities, constraints, risk tolerances, and assumptions are established' },
      { id: 'GV.RR', function_id: 'GV', name: 'Roles and Responsibilities', description: 'The organization\'s leadership and workforce understand their roles and responsibilities' },
      { id: 'GV.PO', function_id: 'GV', name: 'Policy', description: 'The organization\'s cybersecurity policy is established' },
      { id: 'GV.OV', function_id: 'GV', name: 'Oversight', description: 'Results of organization-wide cybersecurity risk assessments inform governance decisions' },
      { id: 'GV.SC', function_id: 'GV', name: 'Supply Chain Risk Management', description: 'Cyber supply chain risk management processes are identified, established, managed, monitored, and improved' },
      
      // Identify
      { id: 'ID.AM', function_id: 'ID', name: 'Asset Management', description: 'Assets within the organization are identified and managed consistent with their relative importance' },
      { id: 'ID.BE', function_id: 'ID', name: 'Business Environment', description: 'The organization\'s mission, objectives, stakeholders, and activities are understood and prioritized' },
      { id: 'ID.GV', function_id: 'ID', name: 'Governance', description: 'The policies, procedures, and processes to manage and monitor the organization\'s regulatory, legal, risk, environmental, and operational requirements are understood' },
      { id: 'ID.RA', function_id: 'ID', name: 'Risk Assessment', description: 'The organization understands the cybersecurity risk to organizational operations, organizational assets, and individuals' },
      { id: 'ID.RM', function_id: 'ID', name: 'Risk Management Strategy', description: 'The organization\'s priorities, constraints, risk tolerances, and assumptions are established and used to support operational risk decisions' },
      { id: 'ID.SC', function_id: 'ID', name: 'Supply Chain Risk Management', description: 'The organization\'s priorities, constraints, risk tolerances, and assumptions are established and used to support supply chain risk management decisions' }
    ];

    for (const category of categories) {
      insertCategory.run(category.id, category.function_id, category.name, category.description);
    }

    logger.info(`Seeded ${categories.length} categories`);
  }

  private async seedSubcategories(): Promise<void> {
    const insertSubcategory = this.db.prepare(`
      INSERT OR REPLACE INTO subcategories (id, category_id, name, description) VALUES (?, ?, ?, ?)
    `);

    const subcategories = [
      // GV.OC - Organizational Context
      { id: 'GV.OC-01', category_id: 'GV.OC', name: 'Organizational mission', description: 'The organizational mission is understood and informs cybersecurity risk management' },
      { id: 'GV.OC-02', category_id: 'GV.OC', name: 'Internal and external stakeholders', description: 'Internal and external stakeholders are understood, and their needs and expectations regarding cybersecurity risk management are understood and considered' },
      { id: 'GV.OC-03', category_id: 'GV.OC', name: 'Legal, regulatory, and contractual requirements', description: 'Legal, regulatory, and contractual requirements regarding cybersecurity are understood and managed' },
      { id: 'GV.OC-04', category_id: 'GV.OC', name: 'Critical objectives and supporting assets', description: 'Critical objectives and supporting assets are understood and prioritized' },
      { id: 'GV.OC-05', category_id: 'GV.OC', name: 'Outcomes of cybersecurity risk assessment activities', description: 'Outcomes of cybersecurity risk assessment activities and other organizational activities are used to establish priorities and inform senior leadership decision making' },

      // GV.SC - Supply Chain Risk Management  
      { id: 'GV.SC-01', category_id: 'GV.SC', name: 'Cybersecurity supply chain risk management strategy', description: 'A cybersecurity supply chain risk management strategy is established, implemented, and regularly updated' },
      { id: 'GV.SC-02', category_id: 'GV.SC', name: 'Cybersecurity roles and responsibilities for suppliers', description: 'Cybersecurity roles and responsibilities for suppliers, customers, and partners are established, communicated, and coordinated internally and externally' },
      { id: 'GV.SC-03', category_id: 'GV.SC', name: 'Cybersecurity supply chain risk management plans', description: 'Cybersecurity supply chain risk management plans are established and implemented' },

      // ID.AM - Asset Management
      { id: 'ID.AM-01', category_id: 'ID.AM', name: 'Asset inventory', description: 'Assets within the organization are identified and inventoried' },
      { id: 'ID.AM-02', category_id: 'ID.AM', name: 'Software inventory', description: 'Software platforms and applications within the organization are inventoried' },
      { id: 'ID.AM-03', category_id: 'ID.AM', name: 'Organizational communication and data flows', description: 'Organizational communication and data flows are mapped' },
      { id: 'ID.AM-04', category_id: 'ID.AM', name: 'External information systems', description: 'External information systems are catalogued' },
      { id: 'ID.AM-05', category_id: 'ID.AM', name: 'Resources prioritization', description: 'Resources (e.g., hardware, devices, data, time, personnel, and software) are prioritized based on their classification, criticality, and business value' }
    ];

    for (const subcategory of subcategories) {
      insertSubcategory.run(subcategory.id, subcategory.category_id, subcategory.name, subcategory.description);
    }

    logger.info(`Seeded ${subcategories.length} subcategories`);
  }

  /**
   * Check if framework data exists and is complete
   */
  frameworkDataExists(): boolean {
    try {
      // Check if we have a reasonable number of framework elements
      const functionCount = this.db.prepare('SELECT COUNT(*) as count FROM functions').get() as any;
      const categoryCount = this.db.prepare('SELECT COUNT(*) as count FROM categories').get() as any;
      const subcategoryCount = this.db.prepare('SELECT COUNT(*) as count FROM subcategories').get() as any;
      
      // If we have a good amount of framework data, consider it complete
      if (functionCount.count >= 6 && categoryCount.count >= 20 && subcategoryCount.count >= 100) {
        return true;
      }
      
      // Check if basic required subcategories exist (fallback check)
      const requiredSubcategories = ['GV.OV-01', 'ID.AM-01']; // Use subcategories we know exist
      
      for (const subcategoryId of requiredSubcategories) {
        const result = this.db.prepare('SELECT COUNT(*) as count FROM subcategories WHERE id = ?').get(subcategoryId) as any;
        if (result.count === 0) {
          logger.info(`Missing required subcategory: ${subcategoryId}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const frameworkSeeder = new FrameworkSeeder();