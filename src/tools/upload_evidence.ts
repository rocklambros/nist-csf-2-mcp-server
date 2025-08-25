/**
 * Upload evidence for cybersecurity controls
 */

import { Tool } from '../types/index.js';
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

interface UploadEvidenceParams {
  profile_id: string;
  subcategory_id: string;
  file_name: string;
  file_path?: string;
  file_hash: string;
  file_size_bytes?: number;
  evidence_type: 'document' | 'screenshot' | 'log' | 'report' | 'config' | 'certificate' | 'policy' | 'procedure';
  description?: string;
  uploaded_by?: string;
  classification?: 'public' | 'internal' | 'confidential' | 'restricted';
  retention_period_days?: number;
  metadata?: any;
  bulk_upload?: boolean;
  evidence_list?: any[];
}

interface UploadEvidenceResponse {
  success: boolean;
  evidence?: {
    evidence_id: string;
    profile_id: string;
    subcategory_id: string;
    file_name: string;
    file_path: string;
    file_hash: string;
    file_size_bytes?: number;
    evidence_type: string;
    description?: string;
    uploaded_by?: string;
    upload_date: string;
    classification?: string;
    retention_period_days?: number;
    metadata?: any;
    is_valid: boolean;
  };
  bulk_upload_results?: any[];
  error?: string;
  message?: string;
}

function validateParams(params: UploadEvidenceParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!params.profile_id) errors.push('profile_id is required');
  if (!params.subcategory_id) errors.push('subcategory_id is required');
  if (!params.file_name) errors.push('file_name is required');
  if (!params.file_hash) errors.push('file_hash is required');
  if (!params.evidence_type) errors.push('evidence_type is required');

  // Validate evidence type
  const validTypes = ['document', 'screenshot', 'log', 'report', 'config', 'certificate', 'policy', 'procedure'];
  if (params.evidence_type && !validTypes.includes(params.evidence_type)) {
    errors.push('Invalid evidence_type');
  }

  // Validate file hash format (should be hex)
  if (params.file_hash && !/^[a-f0-9]+$/i.test(params.file_hash)) {
    errors.push('Invalid file_hash format');
  }

  // Validate file size
  if (params.file_size_bytes && (params.file_size_bytes < 0 || params.file_size_bytes > 100 * 1024 * 1024)) {
    errors.push('file_size_bytes must be between 0 and 100MB');
  }

  // Path traversal protection
  if (params.file_path && (params.file_path.includes('..') || params.file_path.includes('/etc/') || params.file_path.includes('C:\\'))) {
    errors.push('Invalid file path detected');
  }

  // Validate classification
  if (params.classification && !['public', 'internal', 'confidential', 'restricted'].includes(params.classification)) {
    errors.push('Invalid classification');
  }

  return { isValid: errors.length === 0, errors };
}

function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove potential XSS and script injection
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>]/g, '');
}

async function uploadEvidence(params: UploadEvidenceParams, db: Database): Promise<UploadEvidenceResponse> {
  try {
    // Handle bulk upload
    if (params.bulk_upload && params.evidence_list) {
      const results = [];
      for (const evidence of params.evidence_list) {
        const result = await uploadEvidence({
          ...evidence,
          profile_id: params.profile_id,
          bulk_upload: false
        }, db);
        results.push(result);
      }
      return {
        success: true,
        bulk_upload_results: results
      };
    }

    // Validate input
    const validation = validateParams(params);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'ValidationError',
        message: validation.errors.join(', ')
      };
    }

    // Verify profile exists
    const profileCheck = db.prepare('SELECT profile_id FROM profiles WHERE profile_id = ?').get(params.profile_id);
    if (!profileCheck) {
      return {
        success: false,
        error: 'NotFound',
        message: 'Profile not found'
      };
    }

    // Generate evidence ID
    const evidenceId = uuidv4();
    const uploadDate = new Date().toISOString();

    // Sanitize inputs
    const sanitizedFileName = sanitizeInput(params.file_name);
    const sanitizedDescription = sanitizeInput(params.description || '');
    const sanitizedUploadedBy = sanitizeInput(params.uploaded_by || 'system');

    // Set default values
    const filePath = params.file_path || `/evidence/${params.evidence_type}s/${sanitizedFileName}`;
    const classification = params.classification || 'internal';
    const retentionDays = params.retention_period_days || 2555; // 7 years default

    // Insert evidence record
    const insertStmt = db.prepare(`
      INSERT INTO audit_evidence (
        evidence_id, profile_id, subcategory_id, file_name, file_path, file_hash,
        file_size_bytes, evidence_type, description, uploaded_by, upload_date,
        classification, retention_period_days, metadata, is_valid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertResult = insertStmt.run(
      evidenceId,
      params.profile_id,
      params.subcategory_id,
      sanitizedFileName,
      filePath,
      params.file_hash,
      params.file_size_bytes || null,
      params.evidence_type,
      sanitizedDescription,
      sanitizedUploadedBy,
      uploadDate,
      classification,
      retentionDays,
      params.metadata ? JSON.stringify(params.metadata) : null,
      true
    );

    if (insertResult.changes === 0) {
      return {
        success: false,
        error: 'DatabaseError',
        message: 'Failed to upload evidence'
      };
    }

    logger.info('Evidence uploaded successfully', { 
      evidence_id: evidenceId, 
      profile_id: params.profile_id,
      subcategory_id: params.subcategory_id 
    });

    return {
      success: true,
      evidence: {
        evidence_id: evidenceId,
        profile_id: params.profile_id,
        subcategory_id: params.subcategory_id,
        file_name: sanitizedFileName,
        file_path: filePath,
        file_hash: params.file_hash,
        file_size_bytes: params.file_size_bytes,
        evidence_type: params.evidence_type,
        description: sanitizedDescription,
        uploaded_by: sanitizedUploadedBy,
        upload_date: uploadDate,
        classification,
        retention_period_days: retentionDays,
        metadata: params.metadata,
        is_valid: true
      }
    };

  } catch (error) {
    logger.error('Upload evidence error', error);
    return {
      success: false,
      error: 'InternalError',
      message: 'An error occurred while uploading evidence'
    };
  }
}

export const uploadEvidenceTool: Tool = {
  name: 'upload_evidence',
  description: 'Upload evidence files to support cybersecurity control implementation',
  inputSchema: {
    type: 'object',
    properties: {
      profile_id: {
        type: 'string',
        description: 'ID of the profile'
      },
      subcategory_id: {
        type: 'string', 
        description: 'NIST CSF subcategory ID'
      },
      file_name: {
        type: 'string',
        description: 'Name of the evidence file'
      },
      file_path: {
        type: 'string',
        description: 'Path where the file is stored'
      },
      file_hash: {
        type: 'string',
        description: 'Hash of the file for integrity verification'
      },
      file_size_bytes: {
        type: 'number',
        description: 'Size of the file in bytes'
      },
      evidence_type: {
        type: 'string',
        enum: ['document', 'screenshot', 'log', 'report', 'config', 'certificate', 'policy', 'procedure'],
        description: 'Type of evidence being uploaded'
      },
      description: {
        type: 'string',
        description: 'Description of the evidence'
      },
      uploaded_by: {
        type: 'string',
        description: 'User who uploaded the evidence'
      },
      classification: {
        type: 'string',
        enum: ['public', 'internal', 'confidential', 'restricted'],
        description: 'Security classification of the evidence'
      },
      retention_period_days: {
        type: 'number',
        description: 'Number of days to retain the evidence'
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata for the evidence'
      },
      bulk_upload: {
        type: 'boolean',
        description: 'Whether this is a bulk upload operation'
      },
      evidence_list: {
        type: 'array',
        description: 'List of evidence items for bulk upload'
      }
    },
    required: ['profile_id', 'subcategory_id', 'file_name', 'file_hash', 'evidence_type']
  }
};

export { uploadEvidence };