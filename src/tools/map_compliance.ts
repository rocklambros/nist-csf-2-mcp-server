import { CSFDatabase } from "../db/database.js";
import { 
  ALL_FRAMEWORK_MAPPINGS, 
  FRAMEWORK_METADATA
} from "../data/framework-crosswalks.js";

interface ControlMapping {
  framework: string;
  control_id: string;
}

interface MappingResult {
  profile_id: string;
  framework: string;
  framework_version: string;
  total_controls_mapped: number;
  csf_subcategories_covered: number;
  coverage_analysis: {
    fully_covered: number;
    partially_covered: number;
    not_covered: number;
    overall_coverage_percentage: number;
  };
  gap_identification: {
    unmapped_controls: string[];
    weak_mappings: Array<{
      control_id: string;
      subcategory_id: string;
      coverage_percentage: number;
      recommendation: string;
    }>;
    uncovered_subcategories: string[];
  };
  mapping_summary: Array<{
    control_id: string;
    control_name: string;
    mapped_subcategories: Array<{
      id: string;
      mapping_strength: string;
      coverage_percentage: number;
    }>;
  }>;
  recommendations: string[];
}

export async function mapCompliance(
  db: CSFDatabase,
  profile_id: string,
  existing_controls: ControlMapping[]
): Promise<MappingResult> {
  try {
    // Group controls by framework
    const controlsByFramework = existing_controls.reduce((acc, control) => {
      if (!acc[control.framework]) {
        acc[control.framework] = [];
      }
      acc[control.framework]!.push(control.control_id);
      return acc;
    }, {} as Record<string, string[]>);

    // Process each framework
    const results: MappingResult[] = [];
    
    for (const [framework, controlIds] of Object.entries(controlsByFramework)) {
      const frameworkMappings = ALL_FRAMEWORK_MAPPINGS.filter(m => m.framework === framework);
      const metadata = FRAMEWORK_METADATA[framework as keyof typeof FRAMEWORK_METADATA] || { full_name: framework, version: 'unknown', description: framework };
      
      let totalMapped = 0;
      const coveredSubcategories = new Set<string>();
      const unmappedControls: string[] = [];
      const weakMappings: any[] = [];
      const mappingSummary: any[] = [];
      
      for (const controlId of controlIds) {
        const mapping = frameworkMappings.find(m => m.control_id === controlId);
        
        if (mapping) {
          totalMapped++;
          
          // Store the mapping summary
          mappingSummary.push({
            control_id: mapping.control_id,
            control_name: mapping.control_name,
            mapped_subcategories: mapping.csf_subcategories
          });
          
          // Process each subcategory mapping
          for (const subMapping of mapping.csf_subcategories) {
            coveredSubcategories.add(subMapping.id);
            
            // Store in database
            db.upsertComplianceMapping({
              profile_id,
              framework,
              framework_version: metadata.version,
              control_id: mapping.control_id,
              control_name: mapping.control_name,
              control_description: `${metadata.full_name} - ${mapping.control_name}`,
              csf_subcategory_id: subMapping.id,
              mapping_type: 'direct',
              mapping_strength: subMapping.mapping_strength,
              coverage_percentage: subMapping.coverage_percentage,
              implementation_guidance: generateImplementationGuidance(framework, controlId, subMapping.id),
              notes: `Mapped from ${framework} control ${controlId}`
            });
            
            // Track weak mappings
            if (subMapping.coverage_percentage < 70 || subMapping.mapping_strength === 'weak') {
              weakMappings.push({
                control_id: controlId,
                subcategory_id: subMapping.id,
                coverage_percentage: subMapping.coverage_percentage,
                recommendation: `Strengthen mapping between ${controlId} and ${subMapping.id} with additional controls`
              });
            }
          }
        } else {
          unmappedControls.push(controlId);
        }
      }
      
      // Analyze coverage
      const coverageAnalysis = db.analyzeComplianceCoverage(profile_id, framework) || {
        fully_covered: 0,
        partially_covered: 0,
        not_covered: 0,
        avg_coverage: 0,
        gap_subcategories: '[]'
      };
      
      // Parse gap subcategories
      let gapSubcategories: any[] = [];
      try {
        gapSubcategories = JSON.parse(coverageAnalysis.gap_subcategories || '[]');
      } catch {
        gapSubcategories = [];
      }
      
      // Generate recommendations
      const recommendations = generateRecommendations(
        framework,
        unmappedControls,
        weakMappings,
        gapSubcategories
      );
      
      // Record coverage analysis
      db.recordComplianceCoverage({
        profile_id,
        framework,
        total_controls: controlIds.length,
        mapped_controls: totalMapped,
        fully_covered: coverageAnalysis.fully_covered || 0,
        partially_covered: coverageAnalysis.partially_covered || 0,
        not_covered: coverageAnalysis.not_covered || 0,
        coverage_percentage: coverageAnalysis.avg_coverage || 0,
        gap_count: unmappedControls.length + gapSubcategories.length,
        critical_gaps: JSON.stringify({
          unmapped_controls: unmappedControls,
          gap_subcategories: gapSubcategories.map(g => g.subcategory_id)
        })
      });
      
      results.push({
        profile_id,
        framework,
        framework_version: metadata.version,
        total_controls_mapped: totalMapped,
        csf_subcategories_covered: coveredSubcategories.size,
        coverage_analysis: {
          fully_covered: coverageAnalysis.fully_covered || 0,
          partially_covered: coverageAnalysis.partially_covered || 0,
          not_covered: coverageAnalysis.not_covered || 0,
          overall_coverage_percentage: Math.round(coverageAnalysis.avg_coverage || 0)
        },
        gap_identification: {
          unmapped_controls: unmappedControls,
          weak_mappings: weakMappings,
          uncovered_subcategories: gapSubcategories.map(g => g.subcategory_id)
        },
        mapping_summary: mappingSummary,
        recommendations
      });
    }
    
    // Return the first framework result (or aggregate if multiple frameworks)
    if (results.length === 0) {
      throw new Error('No framework mappings found');
    } else if (results.length === 1) {
      return results[0]!;
    } else {
      // Aggregate multiple framework results
      return aggregateResults(profile_id, results);
    }
  } catch (error) {
    console.error('Error mapping compliance:', error);
    throw new Error(`Failed to map compliance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateImplementationGuidance(framework: string, _controlId: string, _subcategoryId: string): string {
  const guidanceMap: Record<string, string> = {
    'ISO_27001': 'Implement according to ISO 27001 Annex A requirements with documented procedures',
    'SOC_2': 'Align with Trust Service Criteria and maintain evidence for audit',
    'NIST_800-53': 'Follow NIST SP 800-53 implementation guidance with tailoring as appropriate',
    'CIS': 'Apply CIS Implementation Groups based on organization size and risk',
    'NIST_800-171': 'Ensure CUI protection requirements are met with documented compliance',
    'IEC_62443': 'Apply to industrial control systems with appropriate security levels',
    'PCI-DSS': 'Implement for cardholder data environment with quarterly validation',
    'HIPAA': 'Apply administrative, physical, and technical safeguards for ePHI'
  };
  
  return guidanceMap[framework] || 'Implement control according to framework requirements';
}

function generateRecommendations(
  framework: string,
  unmappedControls: string[],
  weakMappings: any[],
  gapSubcategories: any[]
): string[] {
  const recommendations: string[] = [];
  
  if (unmappedControls.length > 0) {
    recommendations.push(
      `${unmappedControls.length} ${framework} controls could not be automatically mapped. Manual review required for: ${unmappedControls.slice(0, 3).join(', ')}${unmappedControls.length > 3 ? '...' : ''}`
    );
  }
  
  if (weakMappings.length > 0) {
    recommendations.push(
      `${weakMappings.length} mappings have weak coverage (<70%). Consider supplementing with additional controls.`
    );
  }
  
  if (gapSubcategories.length > 0) {
    recommendations.push(
      `${gapSubcategories.length} CSF subcategories have insufficient coverage. Priority focus areas: ${gapSubcategories.slice(0, 3).map(g => g.subcategory_id).join(', ')}`
    );
  }
  
  // Framework-specific recommendations
  const frameworkRecs: Record<string, string> = {
    'ISO_27001': 'Consider implementing ISO 27001 ISMS for comprehensive coverage',
    'SOC_2': 'Prepare for SOC 2 audit by documenting control evidence',
    'NIST_800-53': 'Apply appropriate control baselines (Low/Moderate/High)',
    'PCI-DSS': 'Ensure quarterly vulnerability scans and annual penetration testing',
    'HIPAA': 'Conduct risk assessment and implement required safeguards'
  };
  
  if (frameworkRecs[framework]) {
    recommendations.push(frameworkRecs[framework]);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Excellent coverage! Continue monitoring and maintaining compliance.');
  }
  
  return recommendations;
}

function aggregateResults(profile_id: string, results: MappingResult[]): MappingResult {
  // Aggregate multiple framework results into a single response
  const totalControls = results.reduce((sum, r) => sum + r.total_controls_mapped, 0);
  const allSubcategories = new Set<string>();
  const allUnmapped: string[] = [];
  const allWeakMappings: any[] = [];
  const allRecommendations: string[] = [];
  
  results.forEach(r => {
    r.mapping_summary.forEach(m => {
      m.mapped_subcategories.forEach(s => allSubcategories.add(s.id));
    });
    allUnmapped.push(...r.gap_identification.unmapped_controls.map(c => `${r.framework}:${c}`));
    allWeakMappings.push(...r.gap_identification.weak_mappings);
    allRecommendations.push(...r.recommendations.map(rec => `[${r.framework}] ${rec}`));
  });
  
  return {
    profile_id,
    framework: 'MULTIPLE',
    framework_version: 'Various',
    total_controls_mapped: totalControls,
    csf_subcategories_covered: allSubcategories.size,
    coverage_analysis: {
      fully_covered: results.reduce((sum, r) => sum + r.coverage_analysis.fully_covered, 0),
      partially_covered: results.reduce((sum, r) => sum + r.coverage_analysis.partially_covered, 0),
      not_covered: results.reduce((sum, r) => sum + r.coverage_analysis.not_covered, 0),
      overall_coverage_percentage: Math.round(
        results.reduce((sum, r) => sum + r.coverage_analysis.overall_coverage_percentage, 0) / results.length
      )
    },
    gap_identification: {
      unmapped_controls: allUnmapped,
      weak_mappings: allWeakMappings,
      uncovered_subcategories: Array.from(new Set(results.flatMap(r => r.gap_identification.uncovered_subcategories)))
    },
    mapping_summary: results.flatMap(r => r.mapping_summary),
    recommendations: allRecommendations
  };
}

export const mapComplianceTool = {
  name: "map_compliance",
  description: "Map existing compliance framework controls to NIST CSF subcategories",
  inputSchema: {
    type: "object",
    properties: {
      profile_id: {
        type: "string",
        description: "ID of the profile to map compliance for"
      },
      existing_controls: {
        type: "array",
        description: "Array of existing compliance controls to map",
        items: {
          type: "object",
          properties: {
            framework: {
              type: "string",
              enum: ["ISO_27001", "SOC_2", "NIST_800-53", "CIS", "NIST_800-171", "IEC_62443", "PCI-DSS", "HIPAA"],
              description: "Compliance framework"
            },
            control_id: {
              type: "string",
              description: "Control ID within the framework"
            }
          },
          required: ["framework", "control_id"]
        }
      }
    },
    required: ["profile_id", "existing_controls"]
  },
  execute: async (args: { profile_id: string; existing_controls: ControlMapping[] }, db: CSFDatabase) => {
    return await mapCompliance(db, args.profile_id, args.existing_controls);
  }
};