/**
 * Track audit trail for all system activities
 */

import { Tool } from '../types/index.js';
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

interface TrackAuditTrailParams {
  profile_id?: string;
  action: string;
  resource_type: 'profile' | 'assessment' | 'evidence' | 'report' | 'user' | 'system' | 'test';
  resource_id?: string;
  performed_by: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  authentication_method?: string;
  before_state?: any;
  after_state?: any;
  modification_reason?: string;
  bulk_operation?: boolean;
  affected_resources?: Array<{ resource_id: string; action: string }>;
  batch_size?: number;
  details?: any;
  query_mode?: boolean;
  filters?: {
    action_types?: string[];
    date_range?: {
      start: string;
      end: string;
    };
    performed_by?: string;
  };
  limit?: number;
  sort_order?: 'asc' | 'desc';
}

interface TrackAuditTrailResponse {
  success: boolean;
  audit_entry?: {
    audit_id: string;
    profile_id?: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    performed_by: string;
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    authentication_method?: string;
    before_state?: any;
    after_state?: any;
    modification_reason?: string;
    bulk_operation?: boolean;
    affected_resources?: Array<{ resource_id: string; action: string }>;
    batch_size?: number;
    details?: any;
    timestamp: string;
    success?: boolean;
  };
  audit_entries?: any[];
  total_count?: number;
  error?: string;
  message?: string;
}

function validateParams(params: TrackAuditTrailParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.query_mode) {
    // Required fields for logging
    if (!params.action) errors.push('action is required');
    if (!params.resource_type) errors.push('resource_type is required');
    if (!params.performed_by) errors.push('performed_by is required');

    // Validate resource type
    const validResourceTypes = ['profile', 'assessment', 'evidence', 'report', 'user', 'system', 'test'];
    if (params.resource_type && !validResourceTypes.includes(params.resource_type)) {
      errors.push('Invalid resource_type');
    }
  }

  // Validate date range if provided
  if (params.filters?.date_range) {
    const { start, end } = params.filters.date_range;
    if (start && end && new Date(start) > new Date(end)) {
      errors.push('Invalid date range: start date must be before end date');
    }
  }

  return { isValid: errors.length === 0, errors };
}

function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potential XSS and script injection
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/[<>]/g, '')
      .replace(/DROP\s+TABLE/gi, '')
      .replace(/DELETE\s+FROM/gi, '')
      .replace(/INSERT\s+INTO/gi, '')
      .replace(/UPDATE\s+SET/gi, '');
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

async function trackAuditTrail(params: TrackAuditTrailParams, db: Database): Promise<TrackAuditTrailResponse> {
  try {
    // Validate input
    const validation = validateParams(params);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'ValidationError',
        message: validation.errors.join(', ')
      };
    }

    // Handle query mode
    if (params.query_mode) {
      return await queryAuditTrail(params, db);
    }

    // Generate audit ID
    const auditId = uuidv4();
    const timestamp = new Date().toISOString();

    // Sanitize inputs
    const sanitizedAction = sanitizeInput(params.action);
    const sanitizedPerformedBy = sanitizeInput(params.performed_by);
    const sanitizedDetails = sanitizeInput(params.details);
    const sanitizedBeforeState = sanitizeInput(params.before_state);
    const sanitizedAfterState = sanitizeInput(params.after_state);

    // Create audit trail entry
    const insertStmt = db.prepare(`
      INSERT INTO audit_trail (
        audit_id, profile_id, action, resource_type, resource_id, performed_by,
        ip_address, user_agent, session_id, authentication_method,
        before_state, after_state, modification_reason, bulk_operation,
        affected_resources, batch_size, details, timestamp, success
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertResult = insertStmt.run(
      auditId,
      params.profile_id || null,
      sanitizedAction,
      params.resource_type,
      params.resource_id || null,
      sanitizedPerformedBy,
      params.ip_address || null,
      params.user_agent || null,
      params.session_id || null,
      params.authentication_method || null,
      sanitizedBeforeState ? JSON.stringify(sanitizedBeforeState) : null,
      sanitizedAfterState ? JSON.stringify(sanitizedAfterState) : null,
      params.modification_reason || null,
      params.bulk_operation || false,
      params.affected_resources ? JSON.stringify(params.affected_resources) : null,
      params.batch_size || null,
      sanitizedDetails ? JSON.stringify(sanitizedDetails) : null,
      timestamp,
      true
    );

    if (insertResult.changes === 0) {
      return {
        success: false,
        error: 'DatabaseError',
        message: 'Failed to create audit trail entry'
      };
    }

    logger.info('Audit trail entry created', { 
      audit_id: auditId, 
      action: sanitizedAction,
      resource_type: params.resource_type,
      performed_by: sanitizedPerformedBy
    });

    return {
      success: true,
      audit_entry: {
        audit_id: auditId,
        profile_id: params.profile_id,
        action: sanitizedAction,
        resource_type: params.resource_type,
        resource_id: params.resource_id,
        performed_by: sanitizedPerformedBy,
        ip_address: params.ip_address,
        user_agent: params.user_agent,
        session_id: params.session_id,
        authentication_method: params.authentication_method,
        before_state: sanitizedBeforeState,
        after_state: sanitizedAfterState,
        modification_reason: params.modification_reason,
        bulk_operation: params.bulk_operation,
        affected_resources: params.affected_resources,
        batch_size: params.batch_size,
        details: sanitizedDetails,
        timestamp,
        success: true
      }
    };

  } catch (error) {
    logger.error('Track audit trail error', error);
    return {
      success: false,
      error: 'InternalError',
      message: 'An error occurred while creating audit trail entry'
    };
  }
}

async function queryAuditTrail(params: TrackAuditTrailParams, db: Database): Promise<TrackAuditTrailResponse> {
  try {
    let query = 'SELECT * FROM audit_trail WHERE 1=1';
    const queryParams: any[] = [];

    // Apply filters
    if (params.profile_id) {
      query += ' AND profile_id = ?';
      queryParams.push(params.profile_id);
    }

    if (params.filters?.action_types && params.filters.action_types.length > 0) {
      const placeholders = params.filters.action_types.map(() => '?').join(',');
      query += ` AND action IN (${placeholders})`;
      queryParams.push(...params.filters.action_types);
    }

    if (params.filters?.performed_by) {
      query += ' AND performed_by = ?';
      queryParams.push(params.filters.performed_by);
    }

    if (params.filters?.date_range) {
      if (params.filters.date_range.start) {
        query += ' AND timestamp >= ?';
        queryParams.push(params.filters.date_range.start);
      }
      if (params.filters.date_range.end) {
        query += ' AND timestamp <= ?';
        queryParams.push(params.filters.date_range.end);
      }
    }

    // Add ordering
    const sortOrder = params.sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY timestamp ${sortOrder}`;

    // Add limit
    if (params.limit) {
      query += ' LIMIT ?';
      queryParams.push(params.limit);
    }

    // Get count query
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count').split(' ORDER BY')[0]!.split(' LIMIT')[0]!;
    const countResult = db.prepare(countQuery).get(...queryParams.slice(0, -1)) as { count: number } | undefined;
    const totalCount = countResult?.count || 0;

    // Execute main query
    const results = db.prepare(query).all(...queryParams);

    // Parse JSON fields
    const parsedResults = results.map((row: any) => ({
      ...row,
      before_state: row.before_state ? JSON.parse(row.before_state) : null,
      after_state: row.after_state ? JSON.parse(row.after_state) : null,
      affected_resources: row.affected_resources ? JSON.parse(row.affected_resources) : null,
      details: row.details ? JSON.parse(row.details) : null
    }));

    return {
      success: true,
      audit_entries: parsedResults,
      total_count: totalCount
    };

  } catch (error) {
    logger.error('Query audit trail error', error);
    return {
      success: false,
      error: 'InternalError',
      message: 'An error occurred while querying audit trail'
    };
  }
}

export const trackAuditTrailTool: Tool = {
  name: 'track_audit_trail',
  description: 'Track audit trail for all system activities',
  inputSchema: {
    type: 'object',
    properties: {
      profile_id: {
        type: 'string',
        description: 'ID of the profile (optional)'
      },
      action: {
        type: 'string',
        description: 'Action performed'
      },
      resource_type: {
        type: 'string',
        enum: ['profile', 'assessment', 'evidence', 'report', 'user', 'system', 'test'],
        description: 'Type of resource affected'
      },
      resource_id: {
        type: 'string',
        description: 'ID of the resource affected'
      },
      performed_by: {
        type: 'string',
        description: 'User or system that performed the action'
      },
      ip_address: {
        type: 'string',
        description: 'IP address of the user'
      },
      user_agent: {
        type: 'string',
        description: 'User agent string'
      },
      session_id: {
        type: 'string',
        description: 'Session ID'
      },
      authentication_method: {
        type: 'string',
        description: 'Authentication method used'
      },
      before_state: {
        type: 'object',
        description: 'State before the action'
      },
      after_state: {
        type: 'object',
        description: 'State after the action'
      },
      modification_reason: {
        type: 'string',
        description: 'Reason for the modification'
      },
      bulk_operation: {
        type: 'boolean',
        description: 'Whether this is a bulk operation'
      },
      affected_resources: {
        type: 'array',
        description: 'List of resources affected in bulk operation'
      },
      batch_size: {
        type: 'number',
        description: 'Number of resources in batch operation'
      },
      details: {
        type: 'object',
        description: 'Additional details about the action'
      },
      query_mode: {
        type: 'boolean',
        description: 'Whether to query existing audit trail entries'
      },
      filters: {
        type: 'object',
        description: 'Filters for querying audit trail'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return'
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort order for results'
      }
    },
    required: []
  }
};

export { trackAuditTrail };