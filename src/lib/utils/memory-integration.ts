/**
 * 内存管理集成工具
 * 
 * 将内存管理功能集成到现有应用架构中
 */

import { globalMemoryMonitor, createMemoryMonitor } from './memory-monitor'
import { globalLeakDetector, createLeakDetector } from './leak-detector'
import { globalVueMemoryManager, createVueMemoryManager } from './vue-memory-manager'
import { logger } from '../logger'

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
import { ref, onUnmounted } from 'vue'

// 类型导入
import type { MemoryMonitor } from './memory-monitor'
import type { LeakDetector } from './leak-detector'
import type { VueMemoryManager } from './vue-memory-manager'

interface MemoryIntegrationConfig {
  /** 是否启用全局内存监控 */
  enableGlobalMonitor?: boolean
  /** 是否启用泄漏检测 */
  enableLeakDetection?: boolean
  /** 是否启用 Vue 内存管理 */
  enableVueMemoryManager?: boolean
  /** 内存阈值配置 */
  thresholds?: {
    warning: number
    critical: number
  }
  /** 是否自动生成报告 */
  autoReport?: boolean
  /** 报告间隔（毫秒） */
  reportInterval?: number
}

interface MemoryHealth {
  status: 'healthy' | 'warning' | 'critical'
  memoryUsage: number
  leakCount: number
  componentCount: number
  recommendations: string[]
  lastCheck: number
}

/**
 * 内存管理集成器
 */
export class MemoryIntegration {
  private config: Required<MemoryIntegrationConfig>
  private memoryMonitor?: InstanceType<typeof MemoryMonitor>
  private leakDetector?: InstanceType<typeof LeakDetector>
  private vueMemoryManager?: InstanceType<typeof VueMemoryManager>
  private reportTimer?: number
  private health: MemoryHealth

  constructor(config: MemoryIntegrationConfig = {}) {
    this.config = {
      enableGlobalMonitor: true,
      enableLeakDetection: true,
      enableVueMemoryManager: true,
      thresholds: {
        warning: 100 * 1024 * 1024, // 100MB
        critical: 200 * 1024 * 1024 // 200MB
      },
      autoReport: true,
      reportInterval: 60000, // 1分钟
      ...config
    }

    this.health = {
      status: 'healthy',
      memoryUsage: 0,
      leakCount: 0,
      componentCount: 0,
      recommendations: [],
      lastCheck: Date.now()
    }

    this.initialize()
  }

  /**
   * 初始化内存管理系统
   */
  private initialize(): void {
    try {
      // 初始化全局内存监控
      if (this.config.enableGlobalMonitor) {
        this.memoryMonitor = createMemoryMonitor({
          interval: 5000,
          thresholds: {
            heapUsed: {
              warning: this.config.thresholds.warning,
              critical: this.config.thresholds.critical,
              action: 'warn'
            },
            rss: {
              warning: this.config.thresholds.warning * 3,
              critical: this.config.thresholds.critical * 3,
              action: 'warn'
            },
            growthRate: {
              warning: 10,
              critical: 20,
              action: 'error'
            }
          },
          autoCleanup: true,
          verboseLogging: process.env.NODE_ENV === 'development'
        })

        this.memoryMonitor.on('threshold', (data: any) => {
          this.handleMemoryThreshold(data)
        })

        this.memoryMonitor.on('leak', (leak: any) => {
          this.handleMemoryLeak(leak)
        })

        this.memoryMonitor.start()
      }

      // 初始化泄漏检测器
      if (this.config.enableLeakDetection) {
        this.leakDetector = createLeakDetector({
          interval: 30000,
          deepDetection: true,
          trackReferences: true
        })

        this.leakDetector.start()
      }

      // 初始化 Vue 内存管理器
      if (this.config.enableVueMemoryManager) {
        this.vueMemoryManager = createVueMemoryManager({
          trackComponents: true,
          trackReactive: true,
          trackWatchers: true,
          componentThreshold: this.config.thresholds.warning / 10,
          autoCleanup: true
        })

        this.vueMemoryManager.start()
      }

      // 启动自动报告
      if (this.config.autoReport) {
        this.startAutoReport()
      }

      logger.info('内存管理系统初始化完成')
    } catch (error) {
      logger.error('内存管理系统初始化失败:', error)
    }
  }

  /**
   * 处理内存阈值
   */
  private handleMemoryThreshold(data: any): void {
    logger.warn('内存阈值告警:', data)

    // 更新健康状态
    this.updateHealthStatus()

    // 触发内存清理
    if (data.level === 'critical' && this.config.autoReport) {
      this.performMemoryCleanup()
    }
  }

  /**
   * 处理内存泄漏
   */
  private handleMemoryLeak(leak: any): void {
    logger.error('内存泄漏检测:', leak)

    // 更新健康状态
    this.updateHealthStatus()

    // 生成详细报告
    if (this.config.autoReport) {
      this.generateDetailedReport()
    }
  }

  /**
   * 更新健康状态
   */
  private updateHealthStatus(): void {
    const currentMemory = this.memoryMonitor?.getCurrentMemoryUsage()
    const stats = this.vueMemoryManager?.getStats()
    
    if (!currentMemory) {
      return
    }

    this.health.memoryUsage = currentMemory.heapUsed
    this.health.leakCount = this.memoryMonitor?.getStats().leaks.length || 0
    this.health.componentCount = stats?.activeComponents || 0
    this.health.lastCheck = Date.now()

    // 确定健康状态
    if (currentMemory.heapUsed >= this.config.thresholds.critical) {
      this.health.status = 'critical'
    } else if (currentMemory.heapUsed >= this.config.thresholds.warning) {
      this.health.status = 'warning'
    } else {
      this.health.status = 'healthy'
    }

    // 生成建议
    this.generateRecommendations()
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(): void {
    const recommendations: string[] = []

    // 基于内存使用的建议
    switch (this.health.status) {
      case 'critical':
        recommendations.push('立即执行内存清理操作')
        recommendations.push('检查并修复内存泄漏')
        recommendations.push('考虑重启应用程序')
        break
      case 'warning':
        recommendations.push('优化内存使用模式')
        recommendations.push('检查大对象和缓存策略')
        break
      case 'healthy':
        recommendations.push('继续保持良好的内存管理实践')
        break
    }

    // 基于组件数量的建议
    if (this.health.componentCount > 100) {
      recommendations.push('组件数量较多，考虑使用虚拟滚动或分页')
    }

    // 基于泄漏数量的建议
    if (this.health.leakCount > 0) {
      recommendations.push(`检测到 ${this.health.leakCount} 个内存泄漏，需要及时修复`)
    }

    this.health.recommendations = recommendations
  }

  /**
   * 执行内存清理
   */
  public performMemoryCleanup(): void {
    logger.info('执行内存清理操作...')

    try {
      // 强制垃圾回收
      if (global.gc) {
        global.gc()
        logger.info('手动垃圾回收完成')
      }

      // 清理 Vue 组件缓存
      if (this.vueMemoryManager) {
        // 这里可以添加 Vue 特定的清理逻辑
      }

      // 清理其他缓存
      this.clearCaches()

      logger.info('内存清理完成')
    } catch (error) {
      logger.error('内存清理失败:', error)
    }
  }

  /**
   * 清理缓存
   */
  private clearCaches(): void {
    // 清理各种缓存
    // 这里可以根据应用需求添加具体的缓存清理逻辑
  }

  /**
   * 启动自动报告
   */
  private startAutoReport(): void {
    this.reportTimer = setInterval(() => {
      this.generateHealthReport()
    }, this.config.reportInterval)
  }

  /**
   * 生成健康报告
   */
  private generateHealthReport(): void {
    this.updateHealthStatus()
    
    const report = this.getHealthReport()
    
    if (this.health.status !== 'healthy') {
      logger.warn('内存健康报告:', report)
    }
  }

  /**
   * 生成详细报告
   */
  private generateDetailedReport(): void {
    const report = this.getDetailedReport()
    logger.info('详细内存报告:', report)
  }

  /**
   * 获取健康状态
   */
  getHealth(): MemoryHealth {
    this.updateHealthStatus()
    return { ...this.health }
  }

  /**
   * 获取健康报告
   */
  getHealthReport(): string {
    this.updateHealthStatus()
    
    let report = '🧠 内存健康报告\n\n'
    report += `状态: ${this.getHealthStatusEmoji()} ${this.health.status}\n`
    report += `内存使用: ${this.formatBytes(this.health.memoryUsage)}\n`
    report += `泄漏数量: ${this.health.leakCount}\n`
    report += `组件数量: ${this.health.componentCount}\n`
    report += `最后检查: ${new Date(this.health.lastCheck).toLocaleString()}\n\n`

    if (this.health.recommendations.length > 0) {
      report += '💡 建议:\n'
      this.health.recommendations.forEach((rec, index) => {
        report += `  ${index + 1}. ${rec}\n`
      })
    }

    return report
  }

  /**
   * 获取详细报告
   */
  getDetailedReport(): string {
    let report = this.getHealthReport()
    report += '\n' + '='.repeat(50) + '\n\n'

    // 添加监控器报告
    if (this.memoryMonitor) {
      report += this.memoryMonitor.generateReport()
      report += '\n'
    }

    // 添加 Vue 内存管理器报告
    if (this.vueMemoryManager) {
      report += this.vueMemoryManager.generateReport()
      report += '\n'
    }

    return report
  }

  /**
   * 获取健康状态表情符号
   */
  private getHealthStatusEmoji(): string {
    switch (this.health.status) {
      case 'healthy': return '✅'
      case 'warning': return '⚠️'
      case 'critical': return '🚨'
      default: return '❓'
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
   * 手动触发内存分析
   */
  async triggerAnalysis(): Promise<any> {
    const results: any = {}

    if (this.memoryMonitor) {
      results.monitor = this.memoryMonitor.getStats()
    }

    if (this.leakDetector) {
      results.leaks = await this.leakDetector.triggerDetection()
    }

    if (this.vueMemoryManager) {
      results.vue = this.vueMemoryManager.getStats()
    }

    return results
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    return {
      health: this.getHealth(),
      monitor: this.memoryMonitor?.getStats(),
      vue: this.vueMemoryManager?.getStats(),
      config: this.config
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    // 停止定时器
    if (this.reportTimer) {
      clearInterval(this.reportTimer)
      this.reportTimer = undefined
    }

    // 销毁组件
    if (this.memoryMonitor) {
      this.memoryMonitor.destroy()
    }

    if (this.leakDetector) {
      this.leakDetector.destroy()
    }

    if (this.vueMemoryManager) {
      this.vueMemoryManager.destroy()
    }

    logger.info('内存管理系统已销毁')
  }
}

/**
 * 创建内存管理集成实例
 */
export function createMemoryIntegration(config?: MemoryIntegrationConfig): MemoryIntegration {
  return new MemoryIntegration(config)
}

/**
 * 全局内存管理集成实例
 */
export const globalMemoryIntegration = createMemoryIntegration({
  enableGlobalMonitor: process.env.NODE_ENV === 'development',
  enableLeakDetection: process.env.NODE_ENV === 'development',
  enableVueMemoryManager: process.env.NODE_ENV === 'development',
  autoReport: true,
  reportInterval: 300000 // 5分钟
})

/**
 * 应用内存管理钩子
 */
export function useAppMemory() {
  const health = ref(globalMemoryIntegration.getHealth())
  const stats = ref(globalMemoryIntegration.getStats())
  const isMonitoring = ref(true)

  // 更新健康状态
  const updateHealth = () => {
    health.value = globalMemoryIntegration.getHealth()
  }

  // 更新统计信息
  const updateStats = () => {
    stats.value = globalMemoryIntegration.getStats()
  }

  // 获取报告
  const getHealthReport = () => {
    return globalMemoryIntegration.getHealthReport()
  }

  const getDetailedReport = () => {
    return globalMemoryIntegration.getDetailedReport()
  }

  // 触发分析
  const triggerAnalysis = async () => {
    return await globalMemoryIntegration.triggerAnalysis()
  }

  // 执行清理
  const performCleanup = () => {
    globalMemoryIntegration.performMemoryCleanup()
  }

  // 定期更新
  const updateInterval = setInterval(() => {
    updateHealth()
    updateStats()
  }, 10000)

  // 组件卸载时清理
  onUnmounted(() => {
    clearInterval(updateInterval)
  })

  return {
    health,
    stats,
    isMonitoring,
    updateHealth,
    updateStats,
    getHealthReport,
    getDetailedReport,
    triggerAnalysis,
    performCleanup
  }
}

// 导出便捷函数
export {
  globalMemoryMonitor,
  globalLeakDetector,
  globalVueMemoryManager
}