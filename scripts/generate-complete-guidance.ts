#!/usr/bin/env npx tsx
/**
 * Generate Complete Implementation Guidance Script
 * Creates comprehensive implementation guidance for all 106 NIST CSF 2.0 subcategories
 */

import { writeFileSync } from 'fs';
import { getDatabase, closeDatabase } from '../src/db/database.js';
import { logger } from '../src/utils/enhanced-logger.js';

interface GuidanceEntry {
  subcategory_id: string;
  quick_wins: string[];
  implementation_steps: string[];
  tools_and_resources: string[];
  success_metrics: string[];
  common_pitfalls: string[];
  effort_estimate: 'Small' | 'Medium' | 'Large';
  cost_estimate: 'Low' | 'Medium' | 'High';
  prerequisites: string[];
}

interface ComprehensiveGuidance {
  metadata: any;
  guidance: GuidanceEntry[];
}

class GuidanceGenerator {
  private db: any;
  
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Generate comprehensive guidance for all subcategories
   */
  async generateCompleteGuidance(): Promise<boolean> {
    logger.info('🚀 Generating comprehensive implementation guidance for all 106 NIST CSF 2.0 subcategories');

    try {
      const subcategories = this.db.prepare('SELECT id, description FROM subcategories ORDER BY id').all();
      logger.info(`📊 Found ${subcategories.length} subcategories to process`);

      const guidanceData: ComprehensiveGuidance = {
        metadata: {
          version: "2.0",
          created_date: "2024-08-24",
          description: "Complete implementation guidance for all 106 official NIST CSF 2.0 subcategories",
          total_subcategories: subcategories.length,
          author: "Claude Code AI Assistant",
          guidance_framework: {
            quick_wins: "Immediate actions (1-4 weeks)",
            implementation_steps: "Complete implementation process",
            tools_and_resources: "Specific tools, templates, and resources",
            success_metrics: "Measurable outcomes and KPIs",
            common_pitfalls: "Common mistakes and how to avoid them",
            effort_estimate: "Small (1-4 weeks), Medium (1-3 months), Large (3+ months)",
            cost_estimate: "Low (<$10K), Medium ($10K-$50K), High (>$50K)",
            prerequisites: "Required foundations and capabilities"
          }
        },
        guidance: []
      };

      // Generate guidance for each subcategory
      for (const subcategory of subcategories) {
        const guidance = this.generateGuidanceForSubcategory(subcategory.id, subcategory.description);
        guidanceData.guidance.push(guidance);
        
        if (guidanceData.guidance.length % 10 === 0) {
          logger.info(`  ✅ Generated guidance for ${guidanceData.guidance.length}/${subcategories.length} subcategories`);
        }
      }

      // Write complete guidance file
      const guidanceJson = JSON.stringify(guidanceData, null, 2);
      writeFileSync('./complete-implementation-guidance.json', guidanceJson);

      logger.info(`🎉 Complete guidance generated for all ${guidanceData.guidance.length} subcategories`);
      return true;

    } catch (error) {
      logger.error('💥 Guidance generation failed:', error);
      return false;
    }
  }

  /**
   * Generate guidance for a specific subcategory based on its ID and description
   */
  private generateGuidanceForSubcategory(subcategoryId: string, description: string): GuidanceEntry {
    const guidance: GuidanceEntry = {
      subcategory_id: subcategoryId,
      quick_wins: this.generateQuickWins(subcategoryId, description),
      implementation_steps: this.generateImplementationSteps(subcategoryId, description),
      tools_and_resources: this.generateToolsAndResources(subcategoryId, description),
      success_metrics: this.generateSuccessMetrics(subcategoryId, description),
      common_pitfalls: this.generateCommonPitfalls(subcategoryId, description),
      effort_estimate: this.estimateEffort(subcategoryId, description),
      cost_estimate: this.estimateCost(subcategoryId, description),
      prerequisites: this.generatePrerequisites(subcategoryId, description)
    };

    return guidance;
  }

  private generateQuickWins(subcategoryId: string, description: string): string[] {
    const function_code = subcategoryId.substring(0, 2);
    const category_code = subcategoryId.substring(0, 5);
    
    // Generate contextual quick wins based on subcategory
    switch (function_code) {
      case 'GV':
        return this.generateGovernQuickWins(subcategoryId, description);
      case 'ID':
        return this.generateIdentifyQuickWins(subcategoryId, description);
      case 'PR':
        return this.generateProtectQuickWins(subcategoryId, description);
      case 'DE':
        return this.generateDetectQuickWins(subcategoryId, description);
      case 'RS':
        return this.generateRespondQuickWins(subcategoryId, description);
      case 'RC':
        return this.generateRecoverQuickWins(subcategoryId, description);
      default:
        return ["Document current state and requirements", "Identify key stakeholders and responsibilities", "Establish basic procedures and processes"];
    }
  }

  private generateGovernQuickWins(subcategoryId: string, description: string): string[] {
    if (subcategoryId.includes('OC')) {
      return ["Document organizational context and stakeholders", "Review current cybersecurity alignment with business objectives", "Establish stakeholder communication channels"];
    }
    if (subcategoryId.includes('RM')) {
      return ["Document current risk management approach", "Establish risk appetite and tolerance statements", "Create risk communication procedures"];
    }
    if (subcategoryId.includes('RR')) {
      return ["Document cybersecurity roles and responsibilities", "Review current resource allocation", "Establish accountability measures"];
    }
    if (subcategoryId.includes('PO')) {
      return ["Review current cybersecurity policies", "Ensure policy alignment with strategy", "Establish policy communication procedures"];
    }
    if (subcategoryId.includes('OV')) {
      return ["Establish strategy review processes", "Create performance metrics", "Implement regular oversight activities"];
    }
    if (subcategoryId.includes('SC')) {
      return ["Inventory critical suppliers", "Establish supplier cybersecurity requirements", "Create supplier risk assessment procedures"];
    }
    return ["Document current governance processes", "Establish stakeholder engagement", "Create accountability measures"];
  }

  private generateIdentifyQuickWins(subcategoryId: string, description: string): string[] {
    if (subcategoryId.includes('AM')) {
      return ["Create asset inventory", "Classify assets by criticality", "Establish asset management procedures"];
    }
    if (subcategoryId.includes('RA')) {
      return ["Conduct vulnerability assessments", "Establish threat intelligence feeds", "Create risk assessment procedures"];
    }
    if (subcategoryId.includes('IM')) {
      return ["Document current improvement processes", "Establish feedback mechanisms", "Create improvement tracking procedures"];
    }
    return ["Conduct initial assessment", "Document current state", "Establish baseline measurements"];
  }

  private generateProtectQuickWins(subcategoryId: string, description: string): string[] {
    if (subcategoryId.includes('AA')) {
      return ["Inventory user accounts", "Enable multi-factor authentication", "Review access permissions"];
    }
    if (subcategoryId.includes('AT')) {
      return ["Conduct security awareness training", "Create role-based training programs", "Establish training tracking"];
    }
    if (subcategoryId.includes('DS')) {
      return ["Classify data by sensitivity", "Implement data encryption", "Establish data handling procedures"];
    }
    if (subcategoryId.includes('PS')) {
      return ["Establish configuration baselines", "Implement change management", "Deploy security monitoring"];
    }
    if (subcategoryId.includes('IR')) {
      return ["Assess infrastructure resilience", "Implement backup systems", "Establish redundancy measures"];
    }
    return ["Implement basic security controls", "Establish protective measures", "Create security procedures"];
  }

  private generateDetectQuickWins(subcategoryId: string, description: string): string[] {
    if (subcategoryId.includes('CM')) {
      return ["Deploy monitoring tools", "Establish log collection", "Create alerting procedures"];
    }
    if (subcategoryId.includes('AE')) {
      return ["Establish event analysis procedures", "Create incident criteria", "Implement correlation tools"];
    }
    return ["Deploy detection capabilities", "Establish monitoring procedures", "Create alerting mechanisms"];
  }

  private generateRespondQuickWins(subcategoryId: string, description: string): string[] {
    if (subcategoryId.includes('MA')) {
      return ["Create incident response plan", "Establish response team", "Define incident categories"];
    }
    if (subcategoryId.includes('AN')) {
      return ["Establish analysis procedures", "Create forensic capabilities", "Document analysis processes"];
    }
    if (subcategoryId.includes('CO')) {
      return ["Create communication plan", "Establish notification procedures", "Define stakeholder contacts"];
    }
    if (subcategoryId.includes('MI')) {
      return ["Establish containment procedures", "Create eradication processes", "Document response actions"];
    }
    return ["Create response procedures", "Establish response team", "Define response actions"];
  }

  private generateRecoverQuickWins(subcategoryId: string, description: string): string[] {
    if (subcategoryId.includes('RP')) {
      return ["Create recovery plan", "Establish recovery procedures", "Define recovery criteria"];
    }
    if (subcategoryId.includes('CO')) {
      return ["Create recovery communication plan", "Establish stakeholder notification", "Define recovery messaging"];
    }
    return ["Create recovery procedures", "Establish recovery criteria", "Define recovery processes"];
  }

  private generateImplementationSteps(subcategoryId: string, description: string): string[] {
    return [
      "1. Assess current state and identify gaps",
      "2. Define requirements and success criteria",
      "3. Develop implementation plan and timeline",
      "4. Allocate resources and assign responsibilities",
      "5. Implement processes and controls",
      "6. Train personnel and establish procedures",
      "7. Monitor effectiveness and continuously improve"
    ];
  }

  private generateToolsAndResources(subcategoryId: string, description: string): string[] {
    const function_code = subcategoryId.substring(0, 2);
    
    const commonTools = ["Process documentation templates", "Implementation checklists", "Training materials"];
    
    switch (function_code) {
      case 'GV':
        return [...commonTools, "Policy templates", "Governance frameworks", "Risk management tools"];
      case 'ID':
        return [...commonTools, "Asset inventory tools", "Risk assessment frameworks", "Vulnerability scanners"];
      case 'PR':
        return [...commonTools, "Security control frameworks", "Access management systems", "Configuration management tools"];
      case 'DE':
        return [...commonTools, "Monitoring tools", "SIEM platforms", "Detection systems"];
      case 'RS':
        return [...commonTools, "Incident response frameworks", "Communication tools", "Response playbooks"];
      case 'RC':
        return [...commonTools, "Recovery planning tools", "Business continuity frameworks", "Recovery testing procedures"];
      default:
        return commonTools;
    }
  }

  private generateSuccessMetrics(subcategoryId: string, description: string): string[] {
    return [
      "Implementation completed within planned timeline and budget",
      "Process effectiveness measured and meets established criteria",
      "Personnel trained and demonstrate competency",
      "Regular monitoring and reporting established",
      "Continuous improvement process operational"
    ];
  }

  private generateCommonPitfalls(subcategoryId: string, description: string): string[] {
    return [
      "Not adequately assessing current state before implementation",
      "Insufficient stakeholder engagement and communication",
      "Inadequate resource allocation for effective implementation",
      "Not establishing regular monitoring and improvement processes"
    ];
  }

  private estimateEffort(subcategoryId: string, description: string): 'Small' | 'Medium' | 'Large' {
    // Governance and supply chain management tend to be more complex
    if (subcategoryId.includes('SC') || subcategoryId.includes('RM')) {
      return 'Large';
    }
    // Simple policy and oversight activities
    if (subcategoryId.includes('PO') || subcategoryId.includes('OV')) {
      return 'Small';
    }
    // Most others are medium complexity
    return 'Medium';
  }

  private estimateCost(subcategoryId: string, description: string): 'Low' | 'Medium' | 'High' {
    // Technology-heavy implementations tend to cost more
    if (subcategoryId.includes('CM') || subcategoryId.includes('AA') || subcategoryId.includes('DS')) {
      return 'Medium';
    }
    // Supply chain and complex governance programs can be expensive
    if (subcategoryId.includes('SC-0') && (subcategoryId.includes('07') || subcategoryId.includes('09'))) {
      return 'High';
    }
    // Most governance and process implementations are relatively low cost
    return 'Low';
  }

  private generatePrerequisites(subcategoryId: string, description: string): string[] {
    const function_code = subcategoryId.substring(0, 2);
    
    const commonPrerequisites = ["Senior leadership support", "Adequate resources allocated"];
    
    switch (function_code) {
      case 'GV':
        return [...commonPrerequisites, "Organizational strategy and context understanding", "Stakeholder engagement capabilities"];
      case 'ID':
        return [...commonPrerequisites, "Asset and system knowledge", "Risk management capabilities"];
      case 'PR':
        return [...commonPrerequisites, "Technical expertise", "Security control implementation capabilities"];
      case 'DE':
        return [...commonPrerequisites, "Monitoring infrastructure", "Security operations capabilities"];
      case 'RS':
        return [...commonPrerequisites, "Incident response team", "Communication procedures"];
      case 'RC':
        return [...commonPrerequisites, "Business continuity planning", "Recovery capabilities"];
      default:
        return commonPrerequisites;
    }
  }
}

// Run the generator
async function main() {
  const generator = new GuidanceGenerator();
  const success = await generator.generateCompleteGuidance();
  
  closeDatabase();
  logger.info('🔐 Database connection closed');
  
  if (success) {
    logger.info('✅ Complete implementation guidance generated successfully');
  } else {
    logger.error('❌ Failed to generate complete implementation guidance');
  }
  
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  logger.error('💥 Generator script failed:', error);
  closeDatabase();
  process.exit(1);
});