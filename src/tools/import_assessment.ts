import { CSFDatabase } from "../db/database.js";
import { logger } from "../utils/logger.js";
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ImportOptions {
  file_path: string;
  format: 'csv' | 'excel' | 'json';
  profile_id: string;
  conflict_mode?: 'skip' | 'overwrite' | 'merge';
  validate_only?: boolean;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  total_rows: number;
  validation_errors: Array<{
    row: number;
    field: string;
    error: string;
  }>;
  import_errors: Array<{
    subcategory_id: string;
    error: string;
  }>;
  metadata: {
    profile_id: string;
    file_name: string;
    format: string;
    conflict_mode: string;
    imported_at: string;
    file_hash: string;
  };
}

export async function importAssessment(
  db: CSFDatabase,
  options: ImportOptions
): Promise<ImportResult> {
  try {
    // Validate file exists
    if (!fs.existsSync(options.file_path)) {
      throw new Error(`File not found: ${options.file_path}`);
    }

    // Read file
    const fileContent = fs.readFileSync(options.file_path, 'utf8');
    const fileName = path.basename(options.file_path);
    
    // Calculate file hash for tracking
    const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

    // Parse file based on format
    let parsedData: any[] = [];
    
    switch (options.format) {
      case 'json':
        parsedData = parseJSON(fileContent);
        break;
      case 'csv':
        parsedData = parseCSV(fileContent);
        break;
      case 'excel':
        parsedData = parseExcelCSV(fileContent);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    // Validate data structure
    const validationErrors = db.getImportValidationErrors(parsedData, options.format);
    
    // If validate_only flag is set, return validation results without importing
    if (options.validate_only) {
      return {
        success: validationErrors.length === 0,
        imported: 0,
        skipped: 0,
        total_rows: parsedData.length,
        validation_errors: validationErrors,
        import_errors: [],
        metadata: {
          profile_id: options.profile_id,
          file_name: fileName,
          format: options.format,
          conflict_mode: options.conflict_mode || 'overwrite',
          imported_at: new Date().toISOString(),
          file_hash: fileHash
        }
      };
    }

    // Stop if there are validation errors
    if (validationErrors.length > 0) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        total_rows: parsedData.length,
        validation_errors: validationErrors,
        import_errors: [],
        metadata: {
          profile_id: options.profile_id,
          file_name: fileName,
          format: options.format,
          conflict_mode: options.conflict_mode || 'overwrite',
          imported_at: new Date().toISOString(),
          file_hash: fileHash
        }
      };
    }

    // Convert parsed data to assessment format
    const assessments = parsedData.map(row => ({
      subcategory_id: row.subcategory_id,
      implementation_level: row.implementation_level,
      maturity_score: Number(row.maturity_score) || 0,
      notes: row.notes || row.comments || '',
      assessed_by: row.assessed_by || 'imported'
    }));

    // Import assessments using batch operation with transaction
    const importResult = db.importAssessmentBatch(
      options.profile_id,
      assessments,
      options.conflict_mode || 'overwrite'
    );

    return {
      success: importResult.errors.length === 0,
      imported: importResult.imported,
      skipped: importResult.skipped,
      total_rows: parsedData.length,
      validation_errors: [],
      import_errors: importResult.errors,
      metadata: {
        profile_id: options.profile_id,
        file_name: fileName,
        format: options.format,
        conflict_mode: options.conflict_mode || 'overwrite',
        imported_at: new Date().toISOString(),
        file_hash: fileHash
      }
    };
  } catch (error) {
    logger.error('Error importing assessment:', error);
    return {
      success: false,
      imported: 0,
      skipped: 0,
      total_rows: 0,
      validation_errors: [],
      import_errors: [{
        subcategory_id: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      }],
      metadata: {
        profile_id: options.profile_id,
        file_name: path.basename(options.file_path),
        format: options.format,
        conflict_mode: options.conflict_mode || 'overwrite',
        imported_at: new Date().toISOString(),
        file_hash: ''
      }
    };
  }
}

function parseJSON(content: string): any[] {
  try {
    const data = JSON.parse(content);
    
    // Handle different JSON structures
    if (Array.isArray(data)) {
      return data;
    } else if (data.assessments && Array.isArray(data.assessments)) {
      return data.assessments;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      throw new Error('Invalid JSON structure. Expected array of assessments.');
    }
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseCSV(content: string): any[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must have header and at least one data row');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]!).map(h => h.toLowerCase().trim());
  
  // Map common header variations
  const headerMap: Record<string, string> = {
    'subcategory': 'subcategory_id',
    'subcategory id': 'subcategory_id',
    'control': 'subcategory_id',
    'control id': 'subcategory_id',
    'implementation': 'implementation_level',
    'implementation status': 'implementation_level',
    'status': 'implementation_level',
    'maturity': 'maturity_score',
    'maturity level': 'maturity_score',
    'score': 'maturity_score',
    'note': 'notes',
    'comment': 'notes',
    'comments': 'notes',
    'assessor': 'assessed_by',
    'assessed by': 'assessed_by',
    'reviewer': 'assessed_by'
  };

  // Normalize headers
  const normalizedHeaders = headers.map(h => {
    const mapped = headerMap[h];
    return mapped || h.replace(/\s+/g, '_');
  });

  // Check required headers
  if (!normalizedHeaders.includes('subcategory_id')) {
    throw new Error('CSV must have subcategory_id column');
  }
  if (!normalizedHeaders.includes('implementation_level')) {
    throw new Error('CSV must have implementation_level column');
  }

  // Parse data rows
  const data: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]!);
    if (values.length === 0 || values.every(v => !v)) {
      continue; // Skip empty rows
    }

    const row: any = {};
    normalizedHeaders.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }

  return data;
}

function parseExcelCSV(content: string): any[] {
  // Remove BOM if present
  const cleanContent = content.replace(/^\uFEFF/, '');
  return parseCSV(cleanContent);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

export const importAssessmentTool = {
  name: "import_assessment",
  description: "Import assessment data from CSV, Excel, or JSON files",
  inputSchema: {
    type: "object",
    properties: {
      file_path: {
        type: "string",
        description: "Path to the file to import"
      },
      format: {
        type: "string",
        enum: ["csv", "excel", "json"],
        description: "File format"
      },
      profile_id: {
        type: "string",
        description: "ID of the profile to import assessments into"
      },
      conflict_mode: {
        type: "string",
        enum: ["skip", "overwrite", "merge"],
        description: "How to handle conflicts with existing assessments",
        default: "overwrite"
      },
      validate_only: {
        type: "boolean",
        description: "Only validate the file without importing",
        default: false
      }
    },
    required: ["file_path", "format", "profile_id"]
  },
  execute: async (args: ImportOptions, db: CSFDatabase) => {
    return await importAssessment(db, args);
  }
};