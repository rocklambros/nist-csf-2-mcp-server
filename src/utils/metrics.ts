/**
 * Performance metrics collection and aggregation
 */

import { EventEmitter } from 'events';
import { logger } from './enhanced-logger.js';

// Metric types
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

// Metric units
export enum MetricUnit {
  MILLISECONDS = 'ms',
  SECONDS = 's',
  BYTES = 'bytes',
  COUNT = 'count',
  PERCENTAGE = 'percent',
  REQUESTS_PER_SECOND = 'req/s',
}

// Metric data point
interface MetricDataPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

// Metric configuration
interface MetricConfig {
  name: string;
  type: MetricType;
  unit: MetricUnit;
  description?: string;
  labels?: string[];
  buckets?: number[]; // For histograms
  percentiles?: number[]; // For summaries
}

// Aggregated metric data
interface AggregatedMetric {
  name: string;
  type: MetricType;
  unit: MetricUnit;
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  median?: number;
  p50?: number;
  p75?: number;
  p90?: number;
  p95?: number;
  p99?: number;
  stddev?: number;
  rate?: number; // Per second
  labels?: Record<string, any>;
}

/**
 * Metrics collector class
 */
class MetricsCollector extends EventEmitter {
  private metrics: Map<string, MetricConfig>;
  private data: Map<string, MetricDataPoint[]>;
  private timers: Map<string, number>;
  private aggregationInterval: NodeJS.Timeout | null;
  private flushInterval: number;
  private maxDataPoints: number;
  
  constructor() {
    super();
    this.metrics = new Map();
    this.data = new Map();
    this.timers = new Map();
    this.aggregationInterval = null;
    this.flushInterval = parseInt(process.env.METRICS_FLUSH_INTERVAL || '60000'); // 1 minute
    this.maxDataPoints = parseInt(process.env.METRICS_MAX_POINTS || '10000');
    
    // Register default metrics
    this.registerDefaultMetrics();
    
    // Start aggregation interval
    if (process.env.ENABLE_METRICS !== 'false') {
      this.startAggregation();
    }
  }
  
  /**
   * Register default system metrics
   */
  private registerDefaultMetrics(): void {
    // Request metrics
    this.register({
      name: 'http_request_duration',
      type: MetricType.HISTOGRAM,
      unit: MetricUnit.MILLISECONDS,
      description: 'HTTP request duration',
      labels: ['method', 'path', 'status'],
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    });
    
    this.register({
      name: 'http_requests_total',
      type: MetricType.COUNTER,
      unit: MetricUnit.COUNT,
      description: 'Total HTTP requests',
      labels: ['method', 'path', 'status'],
    });
    
    // Tool metrics
    this.register({
      name: 'tool_execution_duration',
      type: MetricType.HISTOGRAM,
      unit: MetricUnit.MILLISECONDS,
      description: 'Tool execution duration',
      labels: ['tool', 'status'],
      buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10000],
    });
    
    this.register({
      name: 'tool_executions_total',
      type: MetricType.COUNTER,
      unit: MetricUnit.COUNT,
      description: 'Total tool executions',
      labels: ['tool', 'status'],
    });
    
    // Database metrics
    this.register({
      name: 'db_query_duration',
      type: MetricType.HISTOGRAM,
      unit: MetricUnit.MILLISECONDS,
      description: 'Database query duration',
      labels: ['operation', 'table'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    });
    
    this.register({
      name: 'db_queries_total',
      type: MetricType.COUNTER,
      unit: MetricUnit.COUNT,
      description: 'Total database queries',
      labels: ['operation', 'table', 'status'],
    });
    
    // Error metrics
    this.register({
      name: 'errors_total',
      type: MetricType.COUNTER,
      unit: MetricUnit.COUNT,
      description: 'Total errors',
      labels: ['type', 'code'],
    });
    
    // System metrics
    this.register({
      name: 'memory_usage',
      type: MetricType.GAUGE,
      unit: MetricUnit.BYTES,
      description: 'Memory usage',
      labels: ['type'],
    });
    
    this.register({
      name: 'cpu_usage',
      type: MetricType.GAUGE,
      unit: MetricUnit.PERCENTAGE,
      description: 'CPU usage percentage',
    });
    
    this.register({
      name: 'active_connections',
      type: MetricType.GAUGE,
      unit: MetricUnit.COUNT,
      description: 'Active connections',
    });
  }
  
  /**
   * Register a new metric
   */
  register(config: MetricConfig): void {
    this.metrics.set(config.name, config);
    this.data.set(config.name, []);
  }
  
  /**
   * Record a metric value
   */
  record(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric) {
      logger.warn(`Metric not registered: ${name}`);
      return;
    }
    
    const dataPoints = this.data.get(name) || [];
    dataPoints.push({
      timestamp: Date.now(),
      value,
      labels,
    });
    
    // Limit data points to prevent memory issues
    if (dataPoints.length > this.maxDataPoints) {
      dataPoints.shift();
    }
    
    this.data.set(name, dataPoints);
    
    // Emit event for real-time monitoring
    this.emit('metric', {
      name,
      value,
      labels,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Increment a counter
   */
  increment(name: string, labels?: Record<string, string>, value: number = 1): void {
    this.record(name, value, labels);
  }
  
  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    this.record(name, value, labels);
  }
  
  /**
   * Start a timer
   */
  startTimer(name: string): () => number {
    const start = process.hrtime.bigint();
    const timerId = `${name}_${Date.now()}_${Math.random()}`;
    
    this.timers.set(timerId, Number(start));
    
    return () => {
      const end = process.hrtime.bigint();
      const startTime = this.timers.get(timerId);
      if (startTime) {
        const duration = Number(end - BigInt(startTime)) / 1000000; // Convert to ms
        this.timers.delete(timerId);
        return duration;
      }
      return 0;
    };
  }
  
  /**
   * Record a timing
   */
  timing(name: string, duration: number, labels?: Record<string, string>): void {
    this.record(name, duration, labels);
  }
  
  /**
   * Aggregate metrics data
   */
  aggregate(name: string, startTime?: number, endTime?: number): AggregatedMetric | null {
    const metric = this.metrics.get(name);
    const dataPoints = this.data.get(name);
    
    if (!metric || !dataPoints || dataPoints.length === 0) {
      return null;
    }
    
    // Filter by time range if specified
    const filteredPoints = dataPoints.filter(point => {
      if (startTime && point.timestamp < startTime) return false;
      if (endTime && point.timestamp > endTime) return false;
      return true;
    });
    
    if (filteredPoints.length === 0) {
      return null;
    }
    
    const values = filteredPoints.map(p => p.value);
    values.sort((a, b) => a - b);
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const median = values[Math.floor(values.length / 2)];
    
    // Calculate percentiles
    const percentile = (p: number) => {
      const index = Math.ceil((p / 100) * values.length) - 1;
      return values[Math.max(0, index)];
    };
    
    // Calculate standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stddev = Math.sqrt(variance);
    
    // Calculate rate (per second)
    const timeRange = filteredPoints.length > 0 
      ? ((filteredPoints[filteredPoints.length - 1]?.timestamp || 0) - (filteredPoints[0]?.timestamp || 0)) / 1000
      : 0;
    const rate = timeRange > 0 ? values.length / timeRange : 0;
    
    return {
      name: metric.name,
      type: metric.type,
      unit: metric.unit,
      count: values.length,
      sum,
      min: values[0] || 0,
      max: values[values.length - 1] || 0,
      mean,
      median,
      p50: percentile(50),
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      stddev,
      rate,
    };
  }
  
  /**
   * Get all metrics aggregated
   */
  getAllMetrics(): AggregatedMetric[] {
    const results: AggregatedMetric[] = [];
    
    for (const [name] of this.metrics) {
      const aggregated = this.aggregate(name);
      if (aggregated) {
        results.push(aggregated);
      }
    }
    
    return results;
  }
  
  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    
    for (const [name, metric] of this.metrics) {
      const dataPoints = this.data.get(name) || [];
      
      // Add metric description
      if (metric.description) {
        lines.push(`# HELP ${name} ${metric.description}`);
      }
      lines.push(`# TYPE ${name} ${metric.type}`);
      
      // Group by labels
      const labelGroups = new Map<string, number>();
      
      for (const point of dataPoints) {
        const labelStr = point.labels ? 
          Object.entries(point.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',') : '';
        
        const key = labelStr ? `${name}{${labelStr}}` : name;
        const current = labelGroups.get(key) || 0;
        
        if (metric.type === MetricType.COUNTER) {
          labelGroups.set(key, current + point.value);
        } else {
          labelGroups.set(key, point.value);
        }
      }
      
      // Output values
      for (const [key, value] of labelGroups) {
        lines.push(`${key} ${value}`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Export metrics as JSON
   */
  exportJSON(): Record<string, any> {
    const result: Record<string, any> = {
      timestamp: new Date().toISOString(),
      metrics: {},
    };
    
    for (const [name] of this.metrics) {
      const aggregated = this.aggregate(name);
      if (aggregated) {
        result.metrics[name] = aggregated;
      }
    }
    
    return result;
  }
  
  /**
   * Start aggregation interval
   */
  private startAggregation(): void {
    this.aggregationInterval = setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }
  
  /**
   * Flush metrics to log
   */
  private flushMetrics(): void {
    const metrics = this.getAllMetrics();
    
    for (const metric of metrics) {
      logger.logMetric(metric.name, metric.mean, metric.unit, {
        count: metric.count,
        min: metric.min,
        max: metric.max,
        p95: metric.p95,
        p99: metric.p99,
      });
    }
    
    // Collect system metrics
    this.collectSystemMetrics();
    
    // Emit aggregated metrics event
    this.emit('aggregated', metrics);
  }
  
  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    
    this.gauge('memory_usage', memUsage.heapUsed, { type: 'heap_used' });
    this.gauge('memory_usage', memUsage.heapTotal, { type: 'heap_total' });
    this.gauge('memory_usage', memUsage.rss, { type: 'rss' });
    this.gauge('memory_usage', memUsage.external, { type: 'external' });
    
    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    const totalCpu = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.gauge('cpu_usage', totalCpu);
  }
  
  /**
   * Reset all metrics
   */
  reset(): void {
    for (const [name] of this.data) {
      this.data.set(name, []);
    }
  }
  
  /**
   * Stop metrics collection
   */
  stop(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
  }
}

// Create singleton instance
export const metrics = new MetricsCollector();

// Export types and enums
export type { MetricConfig, AggregatedMetric };
export { MetricsCollector };

export default metrics;