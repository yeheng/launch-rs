/**
 * 内存泄漏检测工具
 * 
 * 提供高级内存泄漏检测和诊断功能
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

const { setInterval } = getTimerFunctions()

import { MemoryMonitor as BaseMemoryMonitor } from './memory-monitor'

interface LeakDetectorConfig {
  /** 检测间隔（毫秒） */
  interval?: number
  /** 是否启用深度检测 */
  deepDetection?: boolean
  /** 是否跟踪对象引用 */
  trackReferences?: boolean
  /** 最大检测深度 */
  maxDepth?: number
  /** 排除的检测路径 */
  excludePatterns?: string[]
}

interface ObjectInfo {
  id: string
  type: string
  size: number
  references: string[]
  path: string
  timestamp: number
}

interface MemoryAnalysis {
  totalObjects: number
  totalSize: number
  largestObjects: ObjectInfo[]
  potentialLeaks: ObjectInfo[]
  circularReferences: Array<{
    path: string
    size: number
    cycle: string[]
  }>
  recommendations: string[]
}

/**
 * 高级内存泄漏检测器
 */
export class LeakDetector {
  private config: Required<LeakDetectorConfig>
  private memoryMonitor: BaseMemoryMonitor
  private objectMap: Map<string, ObjectInfo> = new Map()
  private timer?: number
  private isRunning = false

  constructor(config: LeakDetectorConfig = {}) {
    this.config = {
      interval: 30000, // 30秒
      deepDetection: true,
      trackReferences: true,
      maxDepth: 10,
      excludePatterns: [
        'node_modules',
        '.cache',
        '.tmp',
        'temp'
      ],
      ...config
    }

    this.memoryMonitor = new BaseMemoryMonitor({
      interval: this.config.interval,
      verboseLogging: false
    })
  }

  /**
   * 开始检测
   */
  start(): void {
    if (this.isRunning) {
      console.warn('LeakDetector is already running')
      return
    }

    this.isRunning = true
    this.memoryMonitor.start()

    // 开始定期检测
    this.timer = setInterval(() => {
      this.performLeakDetection()
    }, this.config.interval)

    console.log('🔍 LeakDetector started')
  }

  /**
   * 停止检测
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    this.memoryMonitor.stop()

    if (this.timer) {
      window.clearInterval(this.timer)
      this.timer = undefined
    }

    console.log('🔍 LeakDetector stopped')
  }

  /**
   * 执行泄漏检测
   */
  private async performLeakDetection(): Promise<void> {
    try {
      const analysis = await this.analyzeMemory()
      
      if (analysis.potentialLeaks.length > 0) {
        this.reportPotentialLeaks(analysis.potentialLeaks)
      }

      if (analysis.circularReferences.length > 0) {
        this.reportCircularReferences(analysis.circularReferences)
      }

      // 发送分析结果
      this.memoryMonitor.emit('analysis', analysis)
    } catch (error) {
      console.error('Leak detection failed:', error)
    }
  }

  /**
   * 分析内存使用情况
   */
  private async analyzeMemory(): Promise<MemoryAnalysis> {
    const analysis: MemoryAnalysis = {
      totalObjects: 0,
      totalSize: 0,
      largestObjects: [],
      potentialLeaks: [],
      circularReferences: [],
      recommendations: []
    }

    if (this.config.deepDetection) {
      // 深度检测 - 分析全局对象和闭包
      await this.performDeepDetection(analysis)
    }

    // 生成优化建议
    this.generateRecommendations(analysis)

    return analysis
  }

  /**
   * 执行深度检测
   */
  private async performDeepDetection(analysis: MemoryAnalysis): Promise<void> {
    // 检测全局对象
    const globalObjects = this.analyzeGlobalObjects()
    analysis.totalObjects += globalObjects.length
    analysis.totalSize += globalObjects.reduce((sum, obj) => sum + obj.size, 0)
    analysis.largestObjects.push(...globalObjects.slice(0, 10))

    // 检测事件监听器
    const eventListeners = this.analyzeEventListeners()
    analysis.totalObjects += eventListeners.length
    analysis.totalSize += eventListeners.reduce((sum, obj) => sum + obj.size, 0)

    // 检测定时器
    const timers = this.analyzeTimers()
    analysis.totalObjects += timers.length
    analysis.totalSize += timers.reduce((sum, obj) => sum + obj.size, 0)

    // 检测闭包
    if (this.config.trackReferences) {
      const closureResults = this.analyzeClosures()
      analysis.totalObjects += closureResults.length
      analysis.totalSize += closureResults.reduce((sum, obj) => sum + obj.size, 0)
    }

    // 检测循环引用
    if (this.config.deepDetection) {
      analysis.circularReferences = this.detectCircularReferences()
    }

    // 识别潜在泄漏
    const allObjects = [
      ...globalObjects,
      ...eventListeners,
      ...timers
    ]
    analysis.potentialLeaks = this.identifyPotentialLeaks(allObjects)
  }

  /**
   * 分析全局对象
   */
  private analyzeGlobalObjects(): ObjectInfo[] {
    const objects: ObjectInfo[] = []
    const globalObj = global as any

    for (const key in globalObj) {
      if (this.shouldExclude(key)) {
        continue
      }

      try {
        const value = globalObj[key]
        if (value && typeof value === 'object') {
          const size = this.estimateObjectSize(value)
          objects.push({
            id: `global_${key}`,
            type: value.constructor?.name || 'Object',
            size,
            references: this.getObjectReferences(value),
            path: `global.${key}`,
            timestamp: Date.now()
          })
        }
      } catch (error) {
        // 忽略访问错误
      }
    }

    return objects.sort((a, b) => b.size - a.size)
  }

  /**
   * 分析事件监听器
   */
  private analyzeEventListeners(): ObjectInfo[] {
    const listeners: ObjectInfo[] = []
    
    // 这里简化实现，实际应用中需要更复杂的事件监听器追踪
    // 可以通过重写 addEventListener/removeEventListener 来实现
    
    return listeners
  }

  /**
   * 分析定时器
   */
  private analyzeTimers(): ObjectInfo[] {
    const timers: ObjectInfo[] = []
    
    // 检测未清理的定时器
    // 这里简化实现，实际应用中需要维护定时器注册表
    
    return timers
  }

  /**
   * 分析闭包
   */
  private analyzeClosures(): ObjectInfo[] {
    const closures: ObjectInfo[] = []
    
    // 闭包检测需要复杂的静态分析
    // 这里简化实现，实际应用中需要AST分析
    
    return closures
  }

  /**
   * 检测循环引用
   */
  private detectCircularReferences(): Array<{
    path: string
    size: number
    cycle: string[]
  }> {
    const circularRefs: Array<{
      path: string
      size: number
      cycle: string[]
    }> = []

    // 简化的循环引用检测
    // 实际应用中需要更复杂的图算法
    
    return circularRefs
  }

  /**
   * 识别潜在泄漏
   */
  private identifyPotentialLeaks(objects: ObjectInfo[]): ObjectInfo[] {
    const potentialLeaks: ObjectInfo[] = []

    for (const obj of objects) {
      // 大对象检测
      if (obj.size > 10 * 1024 * 1024) { // 10MB
        potentialLeaks.push(obj)
        continue
      }

      // 长期存在的对象
      const age = Date.now() - obj.timestamp
      if (age > 5 * 60 * 1000) { // 5分钟
        potentialLeaks.push(obj)
        continue
      }

      // 特定类型检测
      if (obj.type === 'Array' && obj.references.length > 100) {
        potentialLeaks.push(obj)
        continue
      }
    }

    return potentialLeaks
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(analysis: MemoryAnalysis): void {
    const recommendations: string[] = []

    // 基于对象数量的建议
    if (analysis.totalObjects > 10000) {
      recommendations.push('对象数量较多，建议检查对象创建和销毁模式')
    }

    // 基于内存大小的建议
    if (analysis.totalSize > 100 * 1024 * 1024) { // 100MB
      recommendations.push('内存使用较高，建议优化数据结构或实现分页加载')
    }

    // 基于大对象的建议
    if (analysis.largestObjects.length > 0 && analysis.largestObjects[0].size > 50 * 1024 * 1024) {
      recommendations.push('存在大对象，建议考虑数据分片或懒加载')
    }

    // 基于循环引用的建议
    if (analysis.circularReferences.length > 0) {
      recommendations.push('检测到循环引用，建议使用 WeakMap 或手动清理引用')
    }

    // 基于潜在泄漏的建议
    if (analysis.potentialLeaks.length > 0) {
      recommendations.push(`检测到 ${analysis.potentialLeaks.length} 个潜在泄漏，建议及时处理`)
    }

    analysis.recommendations = recommendations
  }

  /**
   * 报告潜在泄漏
   */
  private reportPotentialLeaks(leaks: ObjectInfo[]): void {
    console.warn('🔍 检测到潜在内存泄漏:')
    leaks.slice(0, 5).forEach((leak, index) => {
      console.warn(`  ${index + 1}. ${leak.path} (${leak.type}, ${this.formatBytes(leak.size)})`)
    })
  }

  /**
   * 报告循环引用
   */
  private reportCircularReferences(circularRefs: Array<{
    path: string
    size: number
    cycle: string[]
  }>): void {
    console.warn('🔍 检测到循环引用:')
    circularRefs.slice(0, 3).forEach((ref, index) => {
      console.warn(`  ${index + 1}. ${ref.path} (${this.formatBytes(ref.size)})`)
      console.warn(`     循环路径: ${ref.cycle.join(' -> ')}`)
    })
  }

  /**
   * 获取对象引用
   */
  private getObjectReferences(obj: any): string[] {
    const references: string[] = []
    
    try {
      // 简化的引用检测
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
          if (obj[key] && typeof obj[key] === 'object') {
            references.push(key)
          }
        }
      }
    } catch (error) {
      // 忽略访问错误
    }

    return references
  }

  /**
   * 估算对象大小
   */
  private estimateObjectSize(obj: any): number {
    try {
      // 简化的大小估算
      const json = JSON.stringify(obj)
      return json.length * 2 // 粗略估算
    } catch (error) {
      return 1024 // 默认1KB
    }
  }

  /**
   * 检查是否应该排除
   */
  private shouldExclude(path: string): boolean {
    return this.config.excludePatterns.some(pattern => {
      try {
        const regex = new RegExp(pattern)
        return regex.test(path)
      } catch {
        return path.includes(pattern)
      }
    })
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
   * 获取检测统计
   */
  getStats(): {
    isRunning: boolean
    objectCount: number
    detectedLeaks: number
    lastAnalysis?: MemoryAnalysis
  } {
    return {
      isRunning: this.isRunning,
      objectCount: this.objectMap.size,
      detectedLeaks: this.objectMap.size,
      lastAnalysis: undefined // 可以存储最后一次分析结果
    }
  }

  /**
   * 手动触发检测
   */
  async triggerDetection(): Promise<MemoryAnalysis> {
    return this.analyzeMemory()
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stop()
    this.objectMap.clear()
  }
}

/**
 * 创建泄漏检测器实例
 */
export function createLeakDetector(config?: LeakDetectorConfig): LeakDetector {
  return new LeakDetector(config)
}

/**
 * 全局泄漏检测器实例
 */
export const globalLeakDetector = createLeakDetector({
  deepDetection: process.env.NODE_ENV === 'development',
  trackReferences: true
})