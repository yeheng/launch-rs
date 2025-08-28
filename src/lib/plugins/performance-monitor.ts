/**
 * Performance monitoring for plugin operations
 * Tracks metrics, identifies bottlenecks, and provides optimization insights
 */

/**
 * Performance metric types
 */
export enum MetricType {
  OPERATION_TIME = 'operation_time',
  MEMORY_USAGE = 'memory_usage',
  CACHE_HIT_RATE = 'cache_hit_rate',
  SEARCH_LATENCY = 'search_latency',
  RENDER_TIME = 'render_time',
  PLUGIN_LOAD_TIME = 'plugin_load_time'
}

/**
 * Performance metric entry
 */
export interface PerformanceMetric {
  type: MetricType
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThreshold {
  type: MetricType
  warning: number
  critical: number
  unit: string
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  type: MetricType
  name: string
  level: 'warning' | 'critical'
  value: number
  threshold: number
  timestamp: number
  message: string
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  averageOperationTime: number
  totalOperations: number
  slowestOperation: { name: string; time: number }
  fastestOperation: { name: string; time: number }
  memoryUsage: {
    current: number
    peak: number
    average: number
  }
  cacheStats: {
    hitRate: number
    missRate: number
    totalRequests: number
  }
  alerts: PerformanceAlert[]
}

/**
 * Performance monitor class
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private thresholds: Map<MetricType, PerformanceThreshold> = new Map()
  private alerts: PerformanceAlert[] = []
  private maxMetrics = 10000
  private cleanupInterval?: NodeJS.Timeout

  constructor() {
    this.initializeThresholds()
    this.startCleanup()
  }

  /**
   * Initialize default performance thresholds
   */
  private initializeThresholds(): void {
    this.thresholds.set(MetricType.OPERATION_TIME, {
      type: MetricType.OPERATION_TIME,
      warning: 1000, // 1 second
      critical: 3000, // 3 seconds
      unit: 'ms'
    })

    this.thresholds.set(MetricType.MEMORY_USAGE, {
      type: MetricType.MEMORY_USAGE,
      warning: 100 * 1024 * 1024, // 100MB
      critical: 500 * 1024 * 1024, // 500MB
      unit: 'bytes'
    })

    this.thresholds.set(MetricType.CACHE_HIT_RATE, {
      type: MetricType.CACHE_HIT_RATE,
      warning: 0.7, // 70%
      critical: 0.5, // 50%
      unit: 'ratio'
    })

    this.thresholds.set(MetricType.SEARCH_LATENCY, {
      type: MetricType.SEARCH_LATENCY,
      warning: 500, // 500ms
      critical: 1000, // 1 second
      unit: 'ms'
    })

    this.thresholds.set(MetricType.RENDER_TIME, {
      type: MetricType.RENDER_TIME,
      warning: 100, // 100ms
      critical: 300, // 300ms
      unit: 'ms'
    })

    this.thresholds.set(MetricType.PLUGIN_LOAD_TIME, {
      type: MetricType.PLUGIN_LOAD_TIME,
      warning: 2000, // 2 seconds
      critical: 5000, // 5 seconds
      unit: 'ms'
    })
  }

  /**
   * Record a performance metric
   */
  recordMetric(type: MetricType, name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      type,
      name,
      value,
      timestamp: Date.now(),
      metadata
    }

    this.metrics.push(metric)

    // Check thresholds and generate alerts
    this.checkThresholds(metric)

    // Cleanup old metrics if needed
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics * 0.8)
    }
  }

  /**
   * Start timing an operation
   */
  startTiming(operationName: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      this.recordMetric(MetricType.OPERATION_TIME, operationName, duration)
    }
  }

  /**
   * Measure async operation
   */
  async measureAsync<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    const stopTiming = this.startTiming(operationName)
    try {
      const result = await operation()
      return result
    } finally {
      stopTiming()
    }
  }

  /**
   * Measure sync operation
   */
  measure<T>(operationName: string, operation: () => T): T {
    const stopTiming = this.startTiming(operationName)
    try {
      return operation()
    } finally {
      stopTiming()
    }
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage(name: string): void {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory
      this.recordMetric(MetricType.MEMORY_USAGE, name, memory.usedJSHeapSize, {
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      })
    }
  }

  /**
   * Record cache performance
   */
  recordCachePerformance(hitRate: number, totalRequests: number): void {
    this.recordMetric(MetricType.CACHE_HIT_RATE, 'cache_performance', hitRate, {
      totalRequests
    })
  }

  /**
   * Get performance statistics
   */
  getStatistics(): PerformanceStats {
    const operationMetrics = this.metrics.filter(m => m.type === MetricType.OPERATION_TIME)
    const memoryMetrics = this.metrics.filter(m => m.type === MetricType.MEMORY_USAGE)
    const cacheMetrics = this.metrics.filter(m => m.type === MetricType.CACHE_HIT_RATE)

    const stats: PerformanceStats = {
      averageOperationTime: 0,
      totalOperations: operationMetrics.length,
      slowestOperation: { name: '', time: 0 },
      fastestOperation: { name: '', time: Infinity },
      memoryUsage: {
        current: 0,
        peak: 0,
        average: 0
      },
      cacheStats: {
        hitRate: 0,
        missRate: 0,
        totalRequests: 0
      },
      alerts: [...this.alerts]
    }

    // Calculate operation statistics
    if (operationMetrics.length > 0) {
      const totalTime = operationMetrics.reduce((sum, m) => sum + m.value, 0)
      stats.averageOperationTime = totalTime / operationMetrics.length

      const slowest = operationMetrics.reduce((max, m) => m.value > max.value ? m : max)
      const fastest = operationMetrics.reduce((min, m) => m.value < min.value ? m : min)

      stats.slowestOperation = { name: slowest.name, time: slowest.value }
      stats.fastestOperation = { name: fastest.name, time: fastest.value }
    }

    // Calculate memory statistics
    if (memoryMetrics.length > 0) {
      const latest = memoryMetrics[memoryMetrics.length - 1]
      const peak = memoryMetrics.reduce((max, m) => Math.max(max, m.value), 0)
      const average = memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length

      stats.memoryUsage = {
        current: latest.value,
        peak,
        average
      }
    }

    // Calculate cache statistics
    if (cacheMetrics.length > 0) {
      const latest = cacheMetrics[cacheMetrics.length - 1]
      stats.cacheStats = {
        hitRate: latest.value,
        missRate: 1 - latest.value,
        totalRequests: latest.metadata?.totalRequests || 0
      }
    }

    return stats
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: MetricType, limit?: number): PerformanceMetric[] {
    const filtered = this.metrics.filter(m => m.type === type)
    return limit ? filtered.slice(-limit) : filtered
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 10): PerformanceAlert[] {
    return this.alerts.slice(-limit)
  }

  /**
   * Clear all metrics and alerts
   */
  clear(): void {
    this.metrics = []
    this.alerts = []
  }

  /**
   * Set performance threshold
   */
  setThreshold(type: MetricType, warning: number, critical: number, unit: string): void {
    this.thresholds.set(type, { type, warning, critical, unit })
  }

  /**
   * Check thresholds and generate alerts
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.type)
    if (!threshold) return

    let level: 'warning' | 'critical' | null = null
    let thresholdValue = 0

    if (metric.type === MetricType.CACHE_HIT_RATE) {
      // For cache hit rate, lower values are worse
      if (metric.value < threshold.critical) {
        level = 'critical'
        thresholdValue = threshold.critical
      } else if (metric.value < threshold.warning) {
        level = 'warning'
        thresholdValue = threshold.warning
      }
    } else {
      // For other metrics, higher values are worse
      if (metric.value > threshold.critical) {
        level = 'critical'
        thresholdValue = threshold.critical
      } else if (metric.value > threshold.warning) {
        level = 'warning'
        thresholdValue = threshold.warning
      }
    }

    if (level) {
      const alert: PerformanceAlert = {
        type: metric.type,
        name: metric.name,
        level,
        value: metric.value,
        threshold: thresholdValue,
        timestamp: metric.timestamp,
        message: this.generateAlertMessage(metric, level, thresholdValue, threshold.unit)
      }

      this.alerts.push(alert)

      // Keep only recent alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-50)
      }
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    metric: PerformanceMetric,
    level: 'warning' | 'critical',
    threshold: number,
    unit: string
  ): string {
    const formattedValue = this.formatValue(metric.value, unit)
    const formattedThreshold = this.formatValue(threshold, unit)

    switch (metric.type) {
      case MetricType.OPERATION_TIME:
        return `Operation "${metric.name}" took ${formattedValue}, exceeding ${level} threshold of ${formattedThreshold}`
      
      case MetricType.MEMORY_USAGE:
        return `Memory usage for "${metric.name}" is ${formattedValue}, exceeding ${level} threshold of ${formattedThreshold}`
      
      case MetricType.CACHE_HIT_RATE:
        return `Cache hit rate is ${formattedValue}, below ${level} threshold of ${formattedThreshold}`
      
      case MetricType.SEARCH_LATENCY:
        return `Search latency for "${metric.name}" is ${formattedValue}, exceeding ${level} threshold of ${formattedThreshold}`
      
      case MetricType.RENDER_TIME:
        return `Render time for "${metric.name}" is ${formattedValue}, exceeding ${level} threshold of ${formattedThreshold}`
      
      case MetricType.PLUGIN_LOAD_TIME:
        return `Plugin load time for "${metric.name}" is ${formattedValue}, exceeding ${level} threshold of ${formattedThreshold}`
      
      default:
        return `Performance ${level}: ${metric.name} = ${formattedValue} (threshold: ${formattedThreshold})`
    }
  }

  /**
   * Format value with appropriate unit
   */
  private formatValue(value: number, unit: string): string {
    switch (unit) {
      case 'ms':
        return `${Math.round(value)}ms`
      
      case 'bytes':
        if (value > 1024 * 1024 * 1024) {
          return `${(value / (1024 * 1024 * 1024)).toFixed(2)}GB`
        } else if (value > 1024 * 1024) {
          return `${(value / (1024 * 1024)).toFixed(2)}MB`
        } else if (value > 1024) {
          return `${(value / 1024).toFixed(2)}KB`
        }
        return `${value} bytes`
      
      case 'ratio':
        return `${(value * 100).toFixed(1)}%`
      
      default:
        return value.toString()
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000) // 24 hours
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
      this.alerts = this.alerts.filter(a => a.timestamp > cutoff)
    }, 60 * 60 * 1000) // Run every hour
  }

  /**
   * Destroy monitor and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.clear()
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor()

/**
 * Performance monitoring decorator
 */
export function monitored(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const name = operationName || `${target.constructor.name}.${propertyKey}`

    descriptor.value = async function (...args: any[]) {
      return await performanceMonitor.measureAsync(name, () => originalMethod.apply(this, args))
    }

    return descriptor
  }
}