/**
 * Tool usage analytics and performance tracking
 */

import { EventEmitter } from 'events';
import { logger } from './enhanced-logger.js';
import { metrics } from './metrics.js';

// Analytics data interfaces
interface ToolUsageStats {
  toolName: string;
  callCount: number;
  totalDuration: number;
  averageDuration: number;
  errorCount: number;
  successCount: number;
  errorRate: number;
  lastUsed: Date;
  firstUsed: Date;
}

interface UserAnalytics {
  userId?: string;
  clientId: string;
  toolsCalled: string[];
  totalCalls: number;
  totalDuration: number;
  errorCount: number;
  lastActivity: Date;
  firstActivity: Date;
}

interface PerformanceMetrics {
  timestamp: Date;
  toolName: string;
  duration: number;
  success: boolean;
  userId?: string;
  clientId: string;
  errorMessage?: string;
  parameters?: any;
}

/**
 * Analytics collector for tool usage and performance
 */
export class ToolAnalytics extends EventEmitter {
  private toolStats: Map<string, ToolUsageStats>;
  private userStats: Map<string, UserAnalytics>;
  private performanceHistory: PerformanceMetrics[];
  private flushInterval: NodeJS.Timeout | null;
  private maxHistorySize: number;
  
  constructor() {
    super();
    this.toolStats = new Map();
    this.userStats = new Map();
    this.performanceHistory = [];
    this.flushInterval = null;
    this.maxHistorySize = parseInt(process.env.ANALYTICS_MAX_HISTORY || '10000');
    
    // Start periodic flushing
    this.startPeriodicFlush();
  }
  
  /**
   * Record tool execution
   */
  recordToolExecution(
    toolName: string,
    duration: number,
    success: boolean,
    clientId: string,
    userId?: string,
    errorMessage?: string,
    parameters?: any
  ): void {
    const now = new Date();
    
    // Update tool statistics
    this.updateToolStats(toolName, duration, success, now);
    
    // Update user statistics
    this.updateUserStats(clientId, userId, toolName, duration, success, now);
    
    // Add to performance history
    this.addPerformanceRecord({
      timestamp: now,
      toolName,
      duration,
      success,
      userId,
      clientId,
      errorMessage,
      parameters
    });
    
    // Record metrics
    metrics.timing('tool_execution_duration', duration, {
      tool: toolName,
      status: success ? 'success' : 'error',
      client: clientId
    });
    
    metrics.increment('tool_executions_total', {
      tool: toolName,
      status: success ? 'success' : 'error',
      client: clientId
    });
    
    // Emit analytics event
    this.emit('toolExecution', {
      toolName,
      duration,
      success,
      clientId,
      userId,
      timestamp: now
    });
    
    // Log for debugging
    logger.debug('Tool execution recorded', {
      toolName,
      duration,
      success,
      clientId,
      userId: userId || 'anonymous'
    });
  }
  
  /**
   * Update tool statistics
   */
  private updateToolStats(toolName: string, duration: number, success: boolean, timestamp: Date): void {
    let stats = this.toolStats.get(toolName);
    
    if (!stats) {
      stats = {
        toolName,
        callCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        errorCount: 0,
        successCount: 0,
        errorRate: 0,
        lastUsed: timestamp,
        firstUsed: timestamp
      };
      this.toolStats.set(toolName, stats);
    }
    
    // Update counters
    stats.callCount++;
    stats.totalDuration += duration;
    stats.averageDuration = stats.totalDuration / stats.callCount;
    stats.lastUsed = timestamp;
    
    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }
    
    stats.errorRate = stats.errorCount / stats.callCount;
    
    // Update gauge metrics
    metrics.gauge('tool_usage_count', stats.callCount, { tool: toolName });
    metrics.gauge('tool_average_duration', stats.averageDuration, { tool: toolName });
    metrics.gauge('tool_error_rate', stats.errorRate, { tool: toolName });
  }
  
  /**
   * Update user statistics
   */
  private updateUserStats(
    clientId: string, 
    userId: string | undefined, 
    toolName: string, 
    duration: number, 
    success: boolean, 
    timestamp: Date
  ): void {
    const key = userId || clientId;
    let stats = this.userStats.get(key);
    
    if (!stats) {
      stats = {
        userId,
        clientId,
        toolsCalled: [],
        totalCalls: 0,
        totalDuration: 0,
        errorCount: 0,
        lastActivity: timestamp,
        firstActivity: timestamp
      };
      this.userStats.set(key, stats);
    }
    
    // Update user stats
    stats.totalCalls++;
    stats.totalDuration += duration;
    stats.lastActivity = timestamp;
    
    if (!stats.toolsCalled.includes(toolName)) {
      stats.toolsCalled.push(toolName);
    }
    
    if (!success) {
      stats.errorCount++;
    }
    
    // Update user metrics
    metrics.gauge('user_total_calls', stats.totalCalls, { user: key });
    metrics.gauge('user_unique_tools', stats.toolsCalled.length, { user: key });
    metrics.gauge('user_error_count', stats.errorCount, { user: key });
  }
  
  /**
   * Add performance record
   */
  private addPerformanceRecord(record: PerformanceMetrics): void {
    this.performanceHistory.push(record);
    
    // Trim history if too large
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize * 0.8);
    }
  }
  
  /**
   * Get tool usage statistics
   */
  getToolStats(): ToolUsageStats[] {
    return Array.from(this.toolStats.values())
      .sort((a, b) => b.callCount - a.callCount);
  }
  
  /**
   * Get user analytics
   */
  getUserStats(): UserAnalytics[] {
    return Array.from(this.userStats.values())
      .sort((a, b) => b.totalCalls - a.totalCalls);
  }
  
  /**
   * Get performance metrics for a time period
   */
  getPerformanceMetrics(startTime?: Date, endTime?: Date): PerformanceMetrics[] {
    let filtered = this.performanceHistory;
    
    if (startTime) {
      filtered = filtered.filter(record => record.timestamp >= startTime);
    }
    
    if (endTime) {
      filtered = filtered.filter(record => record.timestamp <= endTime);
    }
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  /**
   * Get top performing tools
   */
  getTopTools(limit: number = 10): ToolUsageStats[] {
    return this.getToolStats().slice(0, limit);
  }
  
  /**
   * Get slowest tools
   */
  getSlowestTools(limit: number = 10): ToolUsageStats[] {
    return Array.from(this.toolStats.values())
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit);
  }
  
  /**
   * Get tools with highest error rates
   */
  getErrorProneTools(limit: number = 10): ToolUsageStats[] {
    return Array.from(this.toolStats.values())
      .filter(stats => stats.callCount >= 5) // Only tools with meaningful sample size
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, limit);
  }
  
  /**
   * Get active users
   */
  getActiveUsers(hoursBack: number = 24): UserAnalytics[] {
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return Array.from(this.userStats.values())
      .filter(user => user.lastActivity >= cutoff)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }
  
  /**
   * Generate analytics summary
   */
  generateSummary(): any {
    const totalTools = this.toolStats.size;
    const totalUsers = this.userStats.size;
    const totalExecutions = Array.from(this.toolStats.values())
      .reduce((sum, stats) => sum + stats.callCount, 0);
    const totalErrors = Array.from(this.toolStats.values())
      .reduce((sum, stats) => sum + stats.errorCount, 0);
    const overallErrorRate = totalExecutions > 0 ? totalErrors / totalExecutions : 0;
    
    const topTools = this.getTopTools(5);
    const slowestTools = this.getSlowestTools(3);
    const errorProneTools = this.getErrorProneTools(3);
    const activeUsers = this.getActiveUsers(24);
    
    return {
      overview: {
        totalTools,
        totalUsers,
        totalExecutions,
        totalErrors,
        overallErrorRate,
        timestamp: new Date().toISOString()
      },
      topTools: topTools.map(tool => ({
        name: tool.toolName,
        calls: tool.callCount,
        avgDuration: Math.round(tool.averageDuration),
        errorRate: Math.round(tool.errorRate * 100) / 100
      })),
      slowestTools: slowestTools.map(tool => ({
        name: tool.toolName,
        avgDuration: Math.round(tool.averageDuration),
        calls: tool.callCount
      })),
      errorProneTools: errorProneTools.map(tool => ({
        name: tool.toolName,
        errorRate: Math.round(tool.errorRate * 100) / 100,
        errors: tool.errorCount,
        calls: tool.callCount
      })),
      activeUsers: activeUsers.length,
      recentActivity: this.performanceHistory.slice(-10).map(record => ({
        tool: record.toolName,
        duration: record.duration,
        success: record.success,
        timestamp: record.timestamp.toISOString()
      }))
    };
  }
  
  /**
   * Export analytics data
   */
  exportData(): any {
    return {
      toolStats: Array.from(this.toolStats.entries()),
      userStats: Array.from(this.userStats.entries()),
      performanceHistory: this.performanceHistory.slice(-1000), // Last 1000 records
      summary: this.generateSummary(),
      exportedAt: new Date().toISOString()
    };
  }
  
  /**
   * Reset analytics data
   */
  reset(): void {
    this.toolStats.clear();
    this.userStats.clear();
    this.performanceHistory = [];
    
    logger.info('Analytics data reset');
    this.emit('reset');
  }
  
  /**
   * Start periodic flushing to metrics
   */
  private startPeriodicFlush(): void {
    const flushInterval = parseInt(process.env.ANALYTICS_FLUSH_INTERVAL || '300000'); // 5 minutes
    
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, flushInterval);
  }
  
  /**
   * Flush analytics to metrics system
   */
  private flushMetrics(): void {
    const summary = this.generateSummary();
    
    // Log summary
    logger.info('Analytics summary', summary);
    
    // Update system-wide metrics
    metrics.gauge('analytics_total_tools', summary.overview.totalTools);
    metrics.gauge('analytics_total_users', summary.overview.totalUsers);
    metrics.gauge('analytics_total_executions', summary.overview.totalExecutions);
    metrics.gauge('analytics_overall_error_rate', summary.overview.overallErrorRate);
    metrics.gauge('analytics_active_users', summary.activeUsers);
    
    // Emit flush event
    this.emit('flush', summary);
  }
  
  /**
   * Stop analytics collection
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Final flush
    this.flushMetrics();
    
    logger.info('Analytics collection stopped');
    this.emit('stopped');
  }
}

// Create singleton instance
export const toolAnalytics = new ToolAnalytics();

export default toolAnalytics;