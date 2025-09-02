/**
 * 内存泄漏检测器
 * 
 * 自动检测和报告内存泄漏，提供内存使用分析
 */

// 检测运行环境
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node
const isBrowser = typeof window !== 'undefined'

// 获取全局定时器函数
const getTimerFunctions = () => {
  if (isNode) {
    return {
      setInterval: (global as any).setInterval,
      clearInterval: (global as any).clearInterval
    }
  } else if (isBrowser) {
    return {
      setInterval: window.setInterval,
      clearInterval: window.clearInterval
    }
  } else {
    return {
      setInterval: () => { throw new Error('Timer functions not available') },
      clearInterval: () => { throw new Error('Timer functions not available') }
    }
  }
}

const { setInterval, clearInterval } = getTimerFunctions()

interface MemorySnapshot {
  timestamp: number
  heapUsed: number
  heapTotal: number
  rss: number
  external: number
  arrayBuffers: number
}

export interface MemoryLeak {
  id: string
  type: 'event_listener' | 'timer' | 'interval' | 'reference' | 'closure'
  location: string
  details: any
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: number
  suggestedFix: string
}

interface MemoryThreshold {
  warning: number
  critical: number
  action: 'log' | 'warn' | 'error' | 'cleanup'
}

interface MemoryMonitorConfig {
  /** 监控间隔（毫秒） */
  interval?: number
  /** 内存使用阈值 */
  thresholds?: {
    heapUsed: MemoryThreshold
    rss: MemoryThreshold
    growthRate: MemoryThreshold
  }
  /** 是否启用自动清理 */
  autoCleanup?: boolean
  /** 是否记录详细日志 */
  verboseLogging?: boolean
  /** 泄漏检测配置 */
  leakDetection?: {
    /** 检测间隔（毫秒） */
    interval?: number
    /** 连续增长次数阈值 */
    consecutiveGrowthThreshold?: number
    /** 最小增长字节 */
    minGrowthBytes?: number
    /** 增长率阈值（百分比） */
    growthRateThreshold?: number
  }
}

// 默认配置
const DEFAULT_CONFIG: Required<MemoryMonitorConfig> = {
  interval: 5000, // 5秒
  thresholds: {
    heapUsed: { warning: 100 * 1024 * 1024, critical: 200 * 1024 * 1024, action: 'warn' },
    rss: { warning: 300 * 1024 * 1024, critical: 500 * 1024 * 1024, action: 'warn' },
    growthRate: { warning: 10, critical: 20, action: 'error' }
  },
  autoCleanup: true,
  verboseLogging: false,
  leakDetection: {
    interval: 10000, // 10秒
    consecutiveGrowthThreshold: 3,
    minGrowthBytes: 1024 * 1024, // 1MB
    growthRateThreshold: 5 // 5%
  }
}

/**
 * 内存监控器
 */
export class MemoryMonitor {
  private config: Required<MemoryMonitorConfig>
  private snapshots: MemorySnapshot[] = []
  private timer?: number
  private leakTimer?: number
  private listeners: Map<string, Function> = new Map()
  private isMonitoring = false
  private consecutiveGrowthCount = 0
  private lastHeapUsed = 0
  private detectedLeaks: MemoryLeak[] = []

  constructor(config: MemoryMonitorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 开始监控
   */
  start(): void {
    if (this.isMonitoring) {
      console.warn('MemoryMonitor is already running')
      return
    }

    this.isMonitoring = true
    this.lastHeapUsed = this.getCurrentMemoryUsage().heapUsed

    // 开始定期监控
    this.timer = setInterval(() => {
      this.takeSnapshot()
      this.checkThresholds()
    }, this.config.interval)

    // 开始泄漏检测
    this.leakTimer = setInterval(() => {
      this.detectLeaks()
    }, this.config.leakDetection.interval)

    if (this.config.verboseLogging) {
      console.log('🧠 MemoryMonitor started')
    }
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false

    if (this.timer) {
      clearInterval(this.timer)
      this.timer = undefined
    }

    if (this.leakTimer) {
      clearInterval(this.leakTimer)
      this.leakTimer = undefined
    }

    if (this.config.verboseLogging) {
      console.log('🧠 MemoryMonitor stopped')
    }
  }

  /**
   * 获取当前内存使用情况
   */
  getCurrentMemoryUsage(): MemorySnapshot {
    // 检查是否在 Node.js 环境中
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      
      return {
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        rss: usage.rss,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers || 0
      }
    } else {
      // 浏览器环境或不支持的环境返回默认值
      return {
        timestamp: Date.now(),
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0,
        arrayBuffers: 0
      }
    }
  }

  /**
   * 获取内存快照
   */
  private takeSnapshot(): void {
    const snapshot = this.getCurrentMemoryUsage()
    this.snapshots.push(snapshot)

    // 限制快照数量，保留最近100个
    if (this.snapshots.length > 100) {
      this.snapshots = this.snapshots.slice(-100)
    }

    this.emit('snapshot', snapshot)
  }

  /**
   * 检查内存阈值
   */
  private checkThresholds(): void {
    const current = this.getCurrentMemoryUsage()
    const thresholds = this.config.thresholds

    // 检查堆内存使用
    this.checkThreshold('heapUsed', current.heapUsed, thresholds.heapUsed)

    // 检查RSS使用
    this.checkThreshold('rss', current.rss, thresholds.rss)

    // 检查增长率
    if (this.snapshots.length >= 2) {
      const previous = this.snapshots[this.snapshots.length - 2]
      const growthRate = ((current.heapUsed - previous.heapUsed) / previous.heapUsed) * 100
      this.checkThreshold('growthRate', growthRate, thresholds.growthRate)
    }
  }

  /**
   * 检查单个阈值
   */
  private checkThreshold(type: string, value: number, threshold: MemoryThreshold): void {
    if (value >= threshold.critical) {
      this.handleThresholdExceeded(type, value, threshold, 'critical')
    } else if (value >= threshold.warning) {
      this.handleThresholdExceeded(type, value, threshold, 'warning')
    }
  }

  /**
   * 处理阈值超出
   */
  private handleThresholdExceeded(type: string, value: number, threshold: MemoryThreshold, level: 'warning' | 'critical'): void {
    const message = `Memory threshold exceeded: ${type} = ${this.formatBytes(value)} (threshold: ${this.formatBytes(type === 'growthRate' ? threshold.warning : threshold.warning)})`
    
    this.emit('threshold', { type, value, level, threshold, message })

    switch (threshold.action) {
      case 'log':
        console.log(`🧠 ${message}`)
        break
      case 'warn':
        console.warn(`🧠 ${message}`)
        break
      case 'error':
        console.error(`🧠 ${message}`)
        break
      case 'cleanup':
        console.error(`🧠 ${message}`)
        if (this.config.autoCleanup) {
          this.performCleanup()
        }
        break
    }
  }

  /**
   * 检测内存泄漏
   */
  private detectLeaks(): void {
    const current = this.getCurrentMemoryUsage()
    const growth = current.heapUsed - this.lastHeapUsed
    const growthRate = this.lastHeapUsed > 0 ? (growth / this.lastHeapUsed) * 100 : 0

    // 检查连续增长
    if (growth > (this.config.leakDetection?.minGrowthBytes || 1024 * 1024)) {
      this.consecutiveGrowthCount++
      
      if (this.consecutiveGrowthCount >= (this.config.leakDetection?.consecutiveGrowthThreshold || 3)) {
        const leak: MemoryLeak = {
          id: `leak_${Date.now()}`,
          type: 'reference',
          location: 'unknown',
          details: {
            growth: this.formatBytes(growth),
            growthRate: growthRate.toFixed(2) + '%',
            consecutiveCount: this.consecutiveGrowthCount
          },
          severity: growthRate > (this.config.leakDetection?.growthRateThreshold || 20) ? 'high' : 'medium',
          timestamp: Date.now(),
          suggestedFix: 'Check for circular references, uncleared intervals, or event listeners'
        }

        this.detectedLeaks.push(leak)
        this.emit('leak', leak)

        if (this.config.verboseLogging) {
          console.warn('🧠 Memory leak detected:', leak)
        }

        this.consecutiveGrowthCount = 0
      }
    } else {
      this.consecutiveGrowthCount = 0
    }

    this.lastHeapUsed = current.heapUsed
  }

  /**
   * 检测事件监听器泄漏
   */
  detectEventListenerLeaks(target: any, event: string, handler: Function): MemoryLeak | null {
    // 这里简化实现，实际应用中需要更复杂的追踪
    const leak: MemoryLeak = {
      id: `event_leak_${Date.now()}`,
      type: 'event_listener',
      location: `${target.constructor.name}.${event}`,
      details: {
        target: target.constructor.name,
        event: event,
        handler: handler.name || 'anonymous'
      },
      severity: 'medium',
      timestamp: Date.now(),
      suggestedFix: 'Ensure event listeners are properly removed with removeEventListener'
    }

    this.detectedLeaks.push(leak)
    this.emit('leak', leak)
    
    return leak
  }

  /**
   * 检测定时器泄漏
   */
  detectTimerLeaks(type: 'timer' | 'interval', callback: Function): MemoryLeak | null {
    const leak: MemoryLeak = {
      id: `${type}_leak_${Date.now()}`,
      type,
      location: 'global',
      details: {
        type,
        callback: callback.name || 'anonymous'
      },
      severity: 'high',
      timestamp: Date.now(),
      suggestedFix: 'Store timer references and clear them when no longer needed'
    }

    this.detectedLeaks.push(leak)
    this.emit('leak', leak)
    
    return leak
  }

  /**
   * 执行清理操作
   */
  private performCleanup(): void {
    if (this.config.verboseLogging) {
      console.log('🧠 Performing memory cleanup...')
    }

    // 强制垃圾回收（如果可用）
    if (global.gc) {
      global.gc()
    }

    // 清理旧快照
    this.snapshots = this.snapshots.slice(-50)

    // 触发清理事件
    this.emit('cleanup', {
      before: this.getCurrentMemoryUsage(),
      after: this.getCurrentMemoryUsage()
    })

    if (this.config.verboseLogging) {
      console.log('🧠 Memory cleanup completed')
    }
  }

  /**
   * 获取内存统计
   */
  getStats(): {
    current: MemorySnapshot
    snapshots: MemorySnapshot[]
    leaks: MemoryLeak[]
    isMonitoring: boolean
    uptime: number
  } {
    return {
      current: this.getCurrentMemoryUsage(),
      snapshots: [...this.snapshots],
      leaks: [...this.detectedLeaks],
      isMonitoring: this.isMonitoring,
      uptime: this.snapshots.length > 0 ? Date.now() - this.snapshots[0].timestamp : 0
    }
  }

  /**
   * 获取内存使用报告
   */
  generateReport(): string {
    const stats = this.getStats()
    const current = stats.current
    const leaks = stats.leaks

    let report = '🧠 内存监控报告\n\n'
    
    // 当前状态
    report += '📊 当前状态:\n'
    report += `  - 堆内存使用: ${this.formatBytes(current.heapUsed)} / ${this.formatBytes(current.heapTotal)}\n`
    report += `  - RSS: ${this.formatBytes(current.rss)}\n`
    report += `  - 外部内存: ${this.formatBytes(current.external)}\n`
    report += `  - 运行时间: ${this.formatDuration(stats.uptime)}\n\n`

    // 内存趋势
    if (stats.snapshots.length >= 2) {
      const first = stats.snapshots[0]
      const growth = current.heapUsed - first.heapUsed
      const growthRate = (growth / first.heapUsed) * 100
      
      report += '📈 内存趋势:\n'
      report += `  - 总增长: ${this.formatBytes(growth)} (${growthRate.toFixed(2)}%)\n`
      report += `  - 平均增长速率: ${this.formatBytes(growth / (stats.uptime / 1000 / 60))}/分钟\n\n`
    }

    // 泄漏检测
    if (leaks.length > 0) {
      report += '⚠️ 检测到的泄漏:\n'
      leaks.slice(-5).forEach((leak, index) => {
        report += `  ${index + 1}. ${leak.type} (${leak.severity}): ${leak.location}\n`
        report += `     建议: ${leak.suggestedFix}\n`
      })
      report += '\n'
    }

    // 建议
    report += '💡 优化建议:\n'
    if (current.heapUsed > this.config.thresholds.heapUsed.warning) {
      report += '  - 内存使用较高，建议检查内存分配模式\n'
    }
    if (leaks.length > 0) {
      report += `  - 检测到 ${leaks.length} 个潜在泄漏，建议及时修复\n`
    }
    if (!global.gc) {
      report += '  - 启用 --expose-gc 标志以支持手动垃圾回收\n'
    }

    return report
  }

  /**
   * 事件监听
   */
  on(event: string, listener: Function): void {
    this.listeners.set(event, listener)
  }

  /**
   * 移除事件监听
   */
  off(event: string): void {
    this.listeners.delete(event)
  }

  /**
   * 触发事件
   */
  public emit(event: string, data: any): void {
    const listener = this.listeners.get(event)
    if (listener) {
      try {
        listener(data)
      } catch (error) {
        console.error('MemoryMonitor event listener error:', error)
      }
    }
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stop()
    this.listeners.clear()
    this.snapshots = []
    this.detectedLeaks = []
  }
}

/**
 * 创建内存监控器实例
 */
export function createMemoryMonitor(config?: MemoryMonitorConfig): MemoryMonitor {
  return new MemoryMonitor(config)
}

/**
 * 全局内存监控器实例
 */
export const globalMemoryMonitor = createMemoryMonitor({
  verboseLogging: typeof process !== 'undefined' && process.env.NODE_ENV === 'development'
})

// 自动启动（生产环境默认关闭）
if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'development' || process.env.MEMORY_MONITOR === 'true')) {
  globalMemoryMonitor.start()
}
