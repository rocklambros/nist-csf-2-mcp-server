import { CSFDatabase } from "../db/database.js";
import { logger } from '../utils/logger.js';
import { 
  generateHTMLReport,
  formatDataAsJSON
} from "../utils/report-templates.js";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface ReportOptions {
  profile_id: string;
  report_type: 'executive' | 'technical' | 'audit' | 'progress';
  format: 'html' | 'json' | 'docx' | 'pdf';
  include_charts?: boolean;
  include_recommendations?: boolean;
  output_path?: string;
}

interface ReportResult {
  success: boolean;
  report_type: string;
  format: string;
  file_path?: string;
  content?: string;
  metadata: {
    profile_id: string;
    generated_at: string;
    report_size: number;
    page_count?: number;
  };
  error?: string;
}

export async function generateReport(
  db: CSFDatabase,
  options: ReportOptions
): Promise<ReportResult> {
  try {
    // Get report data based on type
    let reportData: any;
    switch (options.report_type) {
      case 'executive':
        reportData = db.getExecutiveReportData(options.profile_id);
        break;
      case 'technical':
        reportData = db.getTechnicalReportData(options.profile_id);
        break;
      case 'audit':
        reportData = db.getAuditReportData(options.profile_id);
        break;
      case 'progress':
        reportData = db.getProgressReportData(options.profile_id);
        break;
      default:
        throw new Error(`Invalid report type: ${options.report_type}`);
    }
    
    if (!reportData) {
      throw new Error('No data found for the specified profile');
    }
    
    // Format the report based on requested format
    let content: string;
    let fileName: string;
    
    switch (options.format) {
      case 'html':
        content = generateHTMLReport(reportData, options.report_type);
        fileName = `${options.report_type}_report_${Date.now()}.html`;
        break;
        
      case 'json':
        content = formatDataAsJSON(reportData);
        fileName = `${options.report_type}_report_${Date.now()}.json`;
        break;
        
      case 'docx':
        // For DOCX, we'll generate HTML and note that conversion is needed
        content = generateHTMLReport(reportData, options.report_type);
        fileName = `${options.report_type}_report_${Date.now()}.html`;
        // Note: In production, you would use a library like docx or pandoc to convert
        break;
        
      case 'pdf':
        // For PDF, we'll generate HTML and note that conversion is needed
        content = generateHTMLReport(reportData, options.report_type);
        fileName = `${options.report_type}_report_${Date.now()}.html`;
        // Note: In production, you would use a library like puppeteer or wkhtmltopdf
        break;
        
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
    
    // Determine output path
    const outputDir = options.output_path || path.join(os.tmpdir(), 'nist-csf-reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filePath = path.join(outputDir, fileName);
    
    // Write the file
    fs.writeFileSync(filePath, content, 'utf8');
    
    // Get file size
    const stats = fs.statSync(filePath);
    
    // Prepare result
    const result: ReportResult = {
      success: true,
      report_type: options.report_type,
      format: options.format,
      file_path: filePath,
      metadata: {
        profile_id: options.profile_id,
        generated_at: new Date().toISOString(),
        report_size: stats.size,
        page_count: options.format === 'html' ? estimatePageCount(content) : undefined
      }
    };
    
    // For JSON format, also include the content directly
    if (options.format === 'json') {
      result.content = content;
    }
    
    // Add note about format conversion if needed
    if (options.format === 'docx' || options.format === 'pdf') {
      result.metadata.page_count = estimatePageCount(content);
      result.error = `Note: ${options.format.toUpperCase()} generation requires additional libraries. HTML version has been generated at ${filePath}. Use a converter like pandoc (DOCX) or wkhtmltopdf (PDF) for final conversion.`;
    }
    
    return result;
  } catch (error) {
    logger.error('Error generating report:', error);
    return {
      success: false,
      report_type: options.report_type,
      format: options.format,
      error: `Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        profile_id: options.profile_id,
        generated_at: new Date().toISOString(),
        report_size: 0
      }
    };
  }
}

function estimatePageCount(htmlContent: string): number {
  // Rough estimate: ~3000 characters per page
  const charCount = htmlContent.length;
  const tableCount = (htmlContent.match(/<table/g) || []).length;
  const chartCount = (htmlContent.match(/<canvas/g) || []).length;
  
  // Base pages from text
  let pages = Math.ceil(charCount / 3000);
  
  // Add pages for tables and charts
  pages += Math.ceil(tableCount * 0.5);
  pages += chartCount;
  
  return Math.max(1, pages);
}

export const generateReportTool = {
  name: "generate_report",
  description: "Generate formatted reports for NIST CSF assessments and progress",
  inputSchema: {
    type: "object",
    properties: {
      profile_id: {
        type: "string",
        description: "ID of the profile to generate report for"
      },
      report_type: {
        type: "string",
        enum: ["executive", "technical", "audit", "progress"],
        description: "Type of report to generate"
      },
      format: {
        type: "string",
        enum: ["html", "json", "docx", "pdf"],
        description: "Output format for the report"
      },
      include_charts: {
        type: "boolean",
        description: "Include charts in the report (HTML format only)",
        default: true
      },
      include_recommendations: {
        type: "boolean",
        description: "Include recommendations in the report",
        default: true
      },
      output_path: {
        type: "string",
        description: "Optional output directory path"
      }
    },
    required: ["profile_id", "report_type", "format"]
  },
  execute: async (args: ReportOptions, db: CSFDatabase) => {
    return await generateReport(db, args);
  }
};