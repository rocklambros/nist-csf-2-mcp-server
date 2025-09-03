import { CSFDatabase } from "../db/database.js";
import { logger } from '../utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface ExportOptions {
  profile_id: string;
  format: 'csv' | 'json' | 'excel';
  include_assessments?: boolean;
  include_progress?: boolean;
  include_compliance?: boolean;
  include_milestones?: boolean;
  output_path?: string;
  return_as_base64?: boolean;
}

interface ExportResult {
  success: boolean;
  format: string;
  file_path?: string;
  base64_data?: string;
  metadata: {
    profile_id: string;
    exported_at: string;
    record_count: number;
    file_size: number;
    included_sections: string[];
  };
  error?: string;
}

export async function exportData(
  db: CSFDatabase,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    // Get all profile data
    const data = db.exportProfileData(options.profile_id);
    
    if (!data) {
      throw new Error('No data found for the specified profile');
    }
    
    // Parse the JSON data
    const profileInfo = JSON.parse(data.profile_info || '{}');
    const assessments = JSON.parse(data.assessments || '[]');
    const progress = JSON.parse(data.progress || '[]');
    const compliance = JSON.parse(data.compliance || '[]');
    const milestones = JSON.parse(data.milestones || '[]');
    
    // Build export data based on options
    const exportData: any = {
      profile: profileInfo,
      export_metadata: {
        exported_at: new Date().toISOString(),
        profile_id: options.profile_id,
        profile_name: profileInfo.profile_name,
        organization: profileInfo.org_name
      }
    };
    
    const includedSections: string[] = ['profile'];
    let recordCount = 1;
    
    if (options.include_assessments !== false) {
      exportData.assessments = assessments;
      includedSections.push('assessments');
      recordCount += assessments.length;
    }
    
    if (options.include_progress !== false) {
      exportData.progress_tracking = progress;
      includedSections.push('progress_tracking');
      recordCount += progress.length;
    }
    
    if (options.include_compliance !== false) {
      exportData.compliance_mappings = compliance;
      includedSections.push('compliance_mappings');
      recordCount += compliance.length;
    }
    
    if (options.include_milestones !== false) {
      exportData.milestones = milestones;
      includedSections.push('milestones');
      recordCount += milestones.length;
    }
    
    // Format the data based on requested format
    let content: string;
    let fileName: string;
    
    switch (options.format) {
      case 'json':
        content = JSON.stringify(exportData, null, 2);
        fileName = `export_${options.profile_id}_${Date.now()}.json`;
        break;
        
      case 'csv':
        content = convertToCSV(exportData);
        fileName = `export_${options.profile_id}_${Date.now()}.csv`;
        break;
        
      case 'excel':
        // For Excel, we'll create CSV that can be opened in Excel
        content = convertToExcelCSV(exportData);
        fileName = `export_${options.profile_id}_${Date.now()}.csv`;
        break;
        
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
    
    // Prepare result
    const result: ExportResult = {
      success: true,
      format: options.format,
      metadata: {
        profile_id: options.profile_id,
        exported_at: new Date().toISOString(),
        record_count: recordCount,
        file_size: content.length,
        included_sections: includedSections
      }
    };
    
    // Handle output
    if (options.return_as_base64) {
      // Return as base64 encoded string
      result.base64_data = Buffer.from(content).toString('base64');
    } else {
      // Write to file
      const outputDir = options.output_path || path.join(os.tmpdir(), 'nist-csf-exports');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, content, 'utf8');
      
      result.file_path = filePath;
      result.metadata.file_size = fs.statSync(filePath).size;
    }
    
    // Add note for Excel format
    if (options.format === 'excel') {
      result.error = 'Note: Native Excel format requires additional libraries. CSV format has been generated which can be opened in Excel.';
    }
    
    return result;
  } catch (error) {
    logger.error('Error exporting data:', error);
    return {
      success: false,
      format: options.format,
      error: `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        profile_id: options.profile_id,
        exported_at: new Date().toISOString(),
        record_count: 0,
        file_size: 0,
        included_sections: []
      }
    };
  }
}

function convertToCSV(data: any): string {
  const csvSections: string[] = [];
  
  // Profile Information
  csvSections.push('PROFILE INFORMATION');
  csvSections.push('Field,Value');
  if (data.profile) {
    Object.entries(data.profile).forEach(([key, value]) => {
      csvSections.push(`"${key}","${value}"`);
    });
  }
  csvSections.push('');
  
  // Assessments
  if (data.assessments && data.assessments.length > 0) {
    csvSections.push('ASSESSMENTS');
    csvSections.push('Subcategory ID,Implementation Level,Maturity Score,Notes,Assessed At,Assessed By');
    data.assessments.forEach((a: any) => {
      csvSections.push(
        `"${a.subcategory_id}","${a.implementation_level || ''}",${a.maturity_score || 0},"${a.notes || ''}","${a.assessed_at || ''}","${a.assessed_by || ''}"`
      );
    });
    csvSections.push('');
  }
  
  // Progress Tracking
  if (data.progress_tracking && data.progress_tracking.length > 0) {
    csvSections.push('PROGRESS TRACKING');
    csvSections.push('Subcategory ID,Current Implementation,Current Maturity,Completion %,Status,Blocked,Last Updated');
    data.progress_tracking.forEach((p: any) => {
      csvSections.push(
        `"${p.subcategory_id}","${p.current_implementation || ''}",${p.current_maturity || 0},${p.completion_percentage || 0},"${p.status || ''}",${p.is_blocked ? 'Yes' : 'No'},"${p.last_updated || ''}"`
      );
    });
    csvSections.push('');
  }
  
  // Compliance Mappings
  if (data.compliance_mappings && data.compliance_mappings.length > 0) {
    csvSections.push('COMPLIANCE MAPPINGS');
    csvSections.push('Framework,Control ID,Control Name,CSF Subcategory,Mapping Strength,Coverage %');
    data.compliance_mappings.forEach((c: any) => {
      csvSections.push(
        `"${c.framework}","${c.control_id}","${c.control_name || ''}","${c.csf_subcategory_id}","${c.mapping_strength || ''}",${c.coverage_percentage || 0}`
      );
    });
    csvSections.push('');
  }
  
  // Milestones
  if (data.milestones && data.milestones.length > 0) {
    csvSections.push('MILESTONES');
    csvSections.push('Milestone Name,Target Date,Completion Date,Status,Completion %');
    data.milestones.forEach((m: any) => {
      csvSections.push(
        `"${m.milestone_name}","${m.target_date || ''}","${m.completion_date || ''}","${m.status || ''}",${m.completion_percentage || 0}`
      );
    });
  }
  
  return csvSections.join('\n');
}

function convertToExcelCSV(data: any): string {
  // Similar to CSV but with Excel-specific formatting
  // Add BOM for Excel to recognize UTF-8
  const BOM = '\uFEFF';
  const csv = convertToCSV(data);
  
  // Replace some formatting for better Excel compatibility
  const excelFormatted = csv
    .replace(/,(?=\s*$)/gm, ',""') // Add empty string for trailing commas
    .replace(/^,/gm, '"",'); // Add empty string for leading commas
  
  return BOM + excelFormatted;
}

export const exportDataTool = {
  name: "export_data",
  description: "Export profile assessment data in various formats",
  inputSchema: {
    type: "object",
    properties: {
      profile_id: {
        type: "string",
        description: "ID of the profile to export"
      },
      format: {
        type: "string",
        enum: ["csv", "json", "excel"],
        description: "Export format"
      },
      include_assessments: {
        type: "boolean",
        description: "Include assessment data",
        default: true
      },
      include_progress: {
        type: "boolean",
        description: "Include progress tracking data",
        default: true
      },
      include_compliance: {
        type: "boolean",
        description: "Include compliance mapping data",
        default: true
      },
      include_milestones: {
        type: "boolean",
        description: "Include milestone data",
        default: true
      },
      output_path: {
        type: "string",
        description: "Optional output directory path"
      },
      return_as_base64: {
        type: "boolean",
        description: "Return data as base64 encoded string instead of file",
        default: false
      }
    },
    required: ["profile_id", "format"]
  },
  execute: async (args: ExportOptions, db: CSFDatabase) => {
    return await exportData(db, args);
  }
};