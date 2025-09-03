import { CSFDatabase } from "../db/database.js";
import { logger } from "../utils/logger.js";
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface EvidenceFile {
  file_path: string;
  evidence_type?: 'screenshot' | 'document' | 'log' | 'report' | 'config' | 'other';
  description?: string;
  tags?: string[];
}

interface ValidateEvidenceOptions {
  assessment_id: string;
  evidence_files: EvidenceFile[];
  profile_id?: string;
  subcategory_id?: string;
  uploaded_by?: string;
  auto_validate?: boolean;
}

interface ValidationResult {
  success: boolean;
  evidence_ids: string[];
  validation_report: {
    total_files: number;
    valid_files: number;
    invalid_files: number;
    total_size: number;
    file_details: Array<{
      file_name: string;
      evidence_id?: string;
      status: 'success' | 'error';
      file_size?: number;
      file_type?: string;
      file_hash?: string;
      error?: string;
      validation_status?: string;
    }>;
    completeness_check: {
      has_documentation: boolean;
      has_screenshots: boolean;
      has_configs: boolean;
      has_logs: boolean;
      completeness_score: number;
    };
    recommendations: string[];
  };
  errors: string[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  screenshot: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'],
  document: ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.odt'],
  log: ['.log', '.txt', '.csv', '.json'],
  report: ['.pdf', '.html', '.doc', '.docx', '.xlsx', '.csv'],
  config: ['.json', '.yaml', '.yml', '.xml', '.conf', '.ini', '.toml'],
  other: [] // Any file type
};

export async function validateEvidence(
  db: CSFDatabase,
  options: ValidateEvidenceOptions
): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    evidence_ids: [],
    validation_report: {
      total_files: options.evidence_files.length,
      valid_files: 0,
      invalid_files: 0,
      total_size: 0,
      file_details: [],
      completeness_check: {
        has_documentation: false,
        has_screenshots: false,
        has_configs: false,
        has_logs: false,
        completeness_score: 0
      },
      recommendations: []
    },
    errors: []
  };

  try {
    // Get assessment details if not provided
    let profileId = options.profile_id;
    let subcategoryId = options.subcategory_id;
    
    if (!profileId || !subcategoryId) {
      const assessment = db.getAssessment(options.assessment_id);
      if (!assessment) {
        throw new Error(`Assessment ${options.assessment_id} not found`);
      }
      profileId = profileId || assessment.profile_id;
      subcategoryId = subcategoryId || assessment.subcategory_id;
    }

    if (!profileId || !subcategoryId) {
      throw new Error('Unable to determine profile_id or subcategory_id');
    }

    // Process each evidence file
    for (const evidenceFile of options.evidence_files) {
      const fileDetail: any = {
        file_name: path.basename(evidenceFile.file_path),
        status: 'success' as const
      };

      try {
        // Validate file exists
        if (!fs.existsSync(evidenceFile.file_path)) {
          throw new Error(`File not found: ${evidenceFile.file_path}`);
        }

        // Get file stats
        const stats = fs.statSync(evidenceFile.file_path);
        const fileSize = stats.size;
        
        // Check file size
        if (fileSize > MAX_FILE_SIZE) {
          throw new Error(`File size ${formatFileSize(fileSize)} exceeds maximum ${formatFileSize(MAX_FILE_SIZE)}`);
        }

        // Determine file type
        const fileExt = path.extname(evidenceFile.file_path).toLowerCase();
        const fileType = getFileType(fileExt);
        const evidenceType = evidenceFile.evidence_type || inferEvidenceType(fileExt);

        // Validate file type for evidence type
        if (evidenceType !== 'other' && !isFileTypeAllowed(fileExt, evidenceType)) {
          throw new Error(`File type ${fileExt} not allowed for evidence type ${evidenceType}`);
        }

        // Calculate file hash
        const fileContent = fs.readFileSync(evidenceFile.file_path);
        const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

        // Add evidence to database
        const evidenceId = db.addAuditEvidence({
          assessment_id: options.assessment_id,
          profile_id: profileId,
          subcategory_id: subcategoryId,
          file_name: fileDetail.file_name,
          file_type: fileType,
          file_size: fileSize,
          file_hash: fileHash,
          uploaded_by: options.uploaded_by,
          evidence_type: evidenceType,
          description: evidenceFile.description,
          tags: evidenceFile.tags,
          metadata: {
            original_path: evidenceFile.file_path,
            upload_timestamp: new Date().toISOString()
          }
        });

        // Auto-validate if requested
        if (options.auto_validate) {
          const validationStatus = performAutoValidation(
            evidenceType,
            fileSize,
            fileExt
          );
          
          db.validateEvidence(
            evidenceId,
            validationStatus.status,
            validationStatus.notes,
            'auto-validator'
          );
          
          fileDetail.validation_status = validationStatus.status;
        }

        // Update file detail
        fileDetail.evidence_id = evidenceId;
        fileDetail.file_size = fileSize;
        fileDetail.file_type = fileType;
        fileDetail.file_hash = fileHash;
        
        result.evidence_ids.push(evidenceId);
        result.validation_report.valid_files++;
        result.validation_report.total_size += fileSize;

        // Update completeness check
        updateCompletenessCheck(
          result.validation_report.completeness_check,
          evidenceType
        );

      } catch (error) {
        fileDetail.status = 'error';
        fileDetail.error = error instanceof Error ? error.message : 'Unknown error';
        result.validation_report.invalid_files++;
        result.errors.push(`${fileDetail.file_name}: ${fileDetail.error}`);
        result.success = false;
      }

      result.validation_report.file_details.push(fileDetail);
    }

    // Calculate completeness score
    const completeness = result.validation_report.completeness_check;
    let score = 0;
    if (completeness.has_documentation) score += 25;
    if (completeness.has_screenshots) score += 25;
    if (completeness.has_configs) score += 25;
    if (completeness.has_logs) score += 25;
    completeness.completeness_score = score;

    // Generate recommendations
    result.validation_report.recommendations = generateRecommendations(
      result.validation_report.completeness_check,
      result.validation_report.file_details
    );

    // Get overall validation report from database
    if (profileId) {
      // const dbReport = db.getEvidenceValidationReport(profileId);
      // Merge with current report if needed - reserved for future enhancement
    }

  } catch (error) {
    logger.error('Error validating evidence:', error);
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

function getFileType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.log': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.conf': 'text/plain',
    '.ini': 'text/plain',
    '.toml': 'text/plain'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

function inferEvidenceType(extension: string): string {
  const ext = extension.toLowerCase();
  
  if (ALLOWED_FILE_TYPES.screenshot?.includes(ext)) return 'screenshot';
  if (ALLOWED_FILE_TYPES.document?.includes(ext)) return 'document';
  if (ALLOWED_FILE_TYPES.log?.includes(ext)) return 'log';
  if (ALLOWED_FILE_TYPES.report?.includes(ext)) return 'report';
  if (ALLOWED_FILE_TYPES.config?.includes(ext)) return 'config';
  
  return 'other';
}

function isFileTypeAllowed(extension: string, evidenceType: string): boolean {
  const allowedTypes = ALLOWED_FILE_TYPES[evidenceType];
  if (!allowedTypes) return false;
  if (allowedTypes.length === 0) return true; // 'other' type allows all
  return allowedTypes.includes(extension.toLowerCase());
}

function performAutoValidation(
  evidenceType: string,
  fileSize: number,
  fileExt: string
): { status: 'validated' | 'rejected'; notes: string } {
  const issues: string[] = [];
  
  // Check file size thresholds
  if (fileSize < 100) {
    issues.push('File appears to be empty or too small');
  }
  
  // Type-specific validation
  switch (evidenceType) {
    case 'screenshot':
      if (fileSize < 10000) {
        issues.push('Screenshot file size unusually small');
      }
      break;
    case 'document':
      if (fileSize < 1000) {
        issues.push('Document appears to be empty');
      }
      break;
    case 'log':
      if (fileSize > 5 * 1024 * 1024) {
        issues.push('Log file very large - consider rotating or filtering');
      }
      break;
    case 'config':
      if (fileSize > 1024 * 1024) {
        issues.push('Configuration file unusually large');
      }
      break;
  }
  
  // Check for suspicious extensions
  const suspiciousExtensions = ['.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1'];
  if (suspiciousExtensions.includes(fileExt.toLowerCase())) {
    issues.push('Potentially dangerous file type');
  }
  
  if (issues.length > 0) {
    return {
      status: 'rejected',
      notes: `Auto-validation failed: ${issues.join('; ')}`
    };
  }
  
  return {
    status: 'validated',
    notes: 'Auto-validated: File passed basic validation checks'
  };
}

function updateCompletenessCheck(
  completeness: any,
  evidenceType: string
): void {
  switch (evidenceType) {
    case 'document':
    case 'report':
      completeness.has_documentation = true;
      break;
    case 'screenshot':
      completeness.has_screenshots = true;
      break;
    case 'config':
      completeness.has_configs = true;
      break;
    case 'log':
      completeness.has_logs = true;
      break;
  }
}

function generateRecommendations(
  completeness: any,
  fileDetails: any[]
): string[] {
  const recommendations: string[] = [];
  
  if (!completeness.has_documentation) {
    recommendations.push('Add documentation or reports to provide context for the assessment');
  }
  
  if (!completeness.has_screenshots) {
    recommendations.push('Include screenshots to visually demonstrate implementation');
  }
  
  if (!completeness.has_configs) {
    recommendations.push('Add configuration files to show technical implementation details');
  }
  
  if (!completeness.has_logs) {
    recommendations.push('Include log files to demonstrate operational evidence');
  }
  
  if (completeness.completeness_score < 50) {
    recommendations.push('Evidence collection is incomplete - aim for at least 50% coverage across evidence types');
  }
  
  const errorCount = fileDetails.filter(f => f.status === 'error').length;
  if (errorCount > 0) {
    recommendations.push(`Fix ${errorCount} file validation error(s) before proceeding`);
  }
  
  const totalSize = fileDetails.reduce((sum, f) => sum + (f.file_size || 0), 0);
  if (totalSize > 50 * 1024 * 1024) {
    recommendations.push('Consider archiving older evidence to reduce storage requirements');
  }
  
  return recommendations;
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export const validateEvidenceTool = {
  name: "validate_evidence",
  description: "Validate and store evidence files for assessments",
  inputSchema: {
    type: "object",
    properties: {
      assessment_id: {
        type: "string",
        description: "ID of the assessment to attach evidence to"
      },
      evidence_files: {
        type: "array",
        description: "Array of evidence files to validate",
        items: {
          type: "object",
          properties: {
            file_path: {
              type: "string",
              description: "Path to the evidence file"
            },
            evidence_type: {
              type: "string",
              enum: ["screenshot", "document", "log", "report", "config", "other"],
              description: "Type of evidence"
            },
            description: {
              type: "string",
              description: "Description of the evidence"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags for categorizing evidence"
            }
          },
          required: ["file_path"]
        }
      },
      profile_id: {
        type: "string",
        description: "Profile ID (optional if can be determined from assessment)"
      },
      subcategory_id: {
        type: "string",
        description: "Subcategory ID (optional if can be determined from assessment)"
      },
      uploaded_by: {
        type: "string",
        description: "Name or ID of the uploader"
      },
      auto_validate: {
        type: "boolean",
        description: "Automatically validate files based on type and size",
        default: false
      }
    },
    required: ["assessment_id", "evidence_files"]
  },
  execute: async (args: ValidateEvidenceOptions, db: CSFDatabase) => {
    return await validateEvidence(db, args);
  }
};