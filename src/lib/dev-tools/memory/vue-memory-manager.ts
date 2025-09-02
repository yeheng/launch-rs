/**
 * Vue 3 内存管理工具
 * 
 * 提供 Vue 3 应用程序的内存管理和泄漏检测功能
 */

import { ref, reactive, onUnmounted, type UnwrapRef, defineComponent, h } from 'vue'
import { MemoryMonitor as BaseMemoryMonitor, type MemoryLeak } from '../../utils/memory-monitor'
import { LeakDetector } from './leak-detector'

interface VueMemoryConfig {
  /** 是否启用组件内存跟踪 */
  trackComponents?: boolean
  /** 是否启用响应式数据跟踪 */
  trackReactive?: boolean
  /** 是否启用监听器跟踪 */
  trackWatchers?: boolean
  /** 组件内存阈值（字节） */
  componentThreshold?: number
  /** 是否启用自动清理 */
  autoCleanup?: boolean
}

interface ComponentMemoryInfo {
  id: string
  name: string
  memory: number
  watchers: number
  reactiveObjects: number
  createdAt: number
  destroyedAt?: number
  warnings: string[]
}

interface VueMemoryStats {
  activeComponents: number
  totalComponents: number
  totalMemory: number
  averageComponentMemory: number
  largestComponents: ComponentMemoryInfo[]
  memoryLeaks: MemoryLeak[]
  warnings: string[]
}

/**
 * Vue 3 内存管理器
 */
export class VueMemoryManager {
  private config: Required<VueMemoryConfig>
  private memoryMonitor: BaseMemoryMonitor
  private leakDetector: LeakDetector
  private componentMap: Map<string, ComponentMemoryInfo> = new Map()
  private reactiveMap: Map<object, string> = new Map()
  private watcherMap: Map<string, number> = new Map()
  private stats: VueMemoryStats

  constructor(config: VueMemoryConfig = {}) {
    this.config = {
      trackComponents: true,
      trackReactive: true,
      trackWatchers: true,
      componentThreshold: 1024 * 1024, // 1MB
      autoCleanup: true,
      ...config
    }

    this.memoryMonitor = new BaseMemoryMonitor({
      interval: 5000,
      verboseLogging: false
    })

    this.leakDetector = new LeakDetector({
      interval: 30000,
      deepDetection: true
    })

    this.stats = reactive({
      activeComponents: 0,
      totalComponents: 0,
      totalMemory: 0,
      averageComponentMemory: 0,
      largestComponents: [],
      memoryLeaks: [],
      warnings: []
    }) as UnwrapRef<VueMemoryStats>

    this.setupEventListeners()
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.memoryMonitor.on('leak', (leak: MemoryLeak) => {
      this.stats.memoryLeaks.push(leak)
      this.addWarning(`内存泄漏检测: ${leak.type} - ${leak.location}`)
    })

    this.memoryMonitor.on('threshold', (data: any) => {
      if (data.level === 'critical') {
        this.addWarning(`内存阈值超出: ${data.type}`)
      }
    })
  }

  /**
   * 开始监控
   */
  start(): void {
    this.memoryMonitor.start()
    this.leakDetector.start()
  }

  /**
   * 停止监控
   */
  stop(): void {
    this.memoryMonitor.stop()
    this.leakDetector.stop()
  }

  /**
   * 注册组件
   */
  registerComponent(component: any): void {
    if (!this.config.trackComponents) {
      return
    }

    const componentId = this.generateComponentId(component)
    const componentInfo: ComponentMemoryInfo = {
      id: componentId,
      name: component.$?.options?.name || component.type?.name || 'Anonymous',
      memory: this.estimateComponentMemory(component),
      watchers: this.countComponentWatchers(component),
      reactiveObjects: this.countComponentReactiveObjects(component),
      createdAt: Date.now(),
      warnings: []
    }

    this.componentMap.set(componentId, componentInfo)
    this.updateStats()

    // 设置组件卸载监听
    this.setupComponentUnmount(component, componentId)
  }

  /**
   * 注销组件
   */
  unregisterComponent(component: any): void {
    if (!this.config.trackComponents) {
      return
    }

    const componentId = this.generateComponentId(component)
    const componentInfo = this.componentMap.get(componentId)
    
    if (componentInfo) {
      componentInfo.destroyedAt = Date.now()
      
      // 检查组件是否正常清理
      this.checkComponentCleanup(componentInfo)
      
      // 延迟移除组件信息，用于分析
      setTimeout(() => {
        this.componentMap.delete(componentId)
        this.updateStats()
      }, 5000) // 5秒后移除
    }
  }

  /**
   * 注册响应式对象
   */
  registerReactive(obj: object, componentId: string): void {
    if (!this.config.trackReactive) {
      return
    }

    this.reactiveMap.set(obj, componentId)
  }

  /**
   * 注销响应式对象
   */
  unregisterReactive(obj: object): void {
    if (!this.config.trackReactive) {
      return
    }

    this.reactiveMap.delete(obj)
  }

  /**
   * 注册监听器
   */
  registerWatcher(componentId: string): void {
    if (!this.config.trackWatchers) {
      return
    }

    const currentCount = this.watcherMap.get(componentId) || 0
    this.watcherMap.set(componentId, currentCount + 1)
  }

  /**
   * 注销监听器
   */
  unregisterWatcher(componentId: string): void {
    if (!this.config.trackWatchers) {
      return
    }

    const currentCount = this.watcherMap.get(componentId) || 0
    if (currentCount > 0) {
      this.watcherMap.set(componentId, currentCount - 1)
    }
  }

  /**
   * 估算组件内存使用
   */
  private estimateComponentMemory(component: any): number {
    try {
      // 简化的内存估算
      const size = this.estimateObjectSize(component)
      return size
    } catch (error) {
      return 0
    }
  }

  /**
   * 统计组件监听器数量
   */
  private countComponentWatchers(_component: any): number {
    try {
      // Vue 3 中监听器信息不易获取，这里简化实现
      return 0
    } catch (error) {
      return 0
    }
  }

  /**
   * 统计组件响应式对象数量
   */
  private countComponentReactiveObjects(component: any): number {
    try {
      let count = 0
      const traverse = (obj: any) => {
        if (obj && typeof obj === 'object') {
          if (this.reactiveMap.has(obj)) {
            count++
          }
          for (const key in obj) {
            traverse(obj[key])
          }
        }
      }
      traverse(component)
      return count
    } catch (error) {
      return 0
    }
  }

  /**
   * 设置组件卸载监听
   */
  private setupComponentUnmount(component: any, _componentId: string): void {
    if (component.$) {
      // Vue 2 组件
      component.$once('hook:beforeDestroy', () => {
        this.unregisterComponent(component)
      })
    } else if (component.__v_hook) {
      // Vue 3 组件
      const originalUnmount = component.um
      component.um = function() {
        this.unregisterComponent(component)
        originalUnmount.call(component)
      }
    }
  }

  /**
   * 检查组件清理
   */
  private checkComponentCleanup(componentInfo: ComponentMemoryInfo): void {
    const lifespan = componentInfo.destroyedAt! - componentInfo.createdAt
    
    // 检查组件生命周期是否过短
    if (lifespan < 1000) { // 小于1秒
      componentInfo.warnings.push('组件生命周期过短，可能存在频繁创建销毁问题')
    }

    // 检查组件内存使用
    if (componentInfo.memory > this.config.componentThreshold) {
      componentInfo.warnings.push('组件内存使用超过阈值')
    }

    // 检查监听器数量
    if (componentInfo.watchers > 10) {
      componentInfo.warnings.push('组件监听器数量过多')
    }

    // 检查响应式对象数量
    if (componentInfo.reactiveObjects > 50) {
      componentInfo.warnings.push('组件响应式对象数量过多')
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    const activeComponents = Array.from(this.componentMap.values()).filter(info => !info.destroyedAt)
    
    this.stats.activeComponents = activeComponents.length
    this.stats.totalComponents = this.componentMap.size
    this.stats.totalMemory = activeComponents.reduce((sum, info) => sum + info.memory, 0)
    this.stats.averageComponentMemory = this.stats.activeComponents > 0 ? 
      this.stats.totalMemory / this.stats.activeComponents : 0
    
    // 更新最大组件列表
    this.stats.largestComponents = activeComponents
      .sort((a, b) => b.memory - a.memory)
      .slice(0, 10)

    // 收集所有警告
    this.stats.warnings = Array.from(this.componentMap.values())
      .flatMap(info => info.warnings)
  }

  /**
   * 添加警告
   */
  private addWarning(message: string): void {
    this.stats.warnings.push(message)
  }

  /**
   * 生成组件ID
   */
  private generateComponentId(component: any): string {
    if (component._uid) {
      return `vue2_${component._uid}`
    }
    if (component.uid) {
      return `vue3_${component.uid}`
    }
    return `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 估算对象大小
   */
  private estimateObjectSize(obj: any): number {
    try {
      const json = JSON.stringify(obj)
      return json.length * 2 // 粗略估算
    } catch (error) {
      return 1024
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): VueMemoryStats {
    return { ...this.stats }
  }

  /**
   * 获取内存报告
   */
  generateReport(): string {
    const stats = this.getStats()
    const memoryStats = this.memoryMonitor.getStats()
    
    let report = '🧠 Vue 内存管理报告\n\n'
    
    // 组件统计
    report += '📊 组件统计:\n'
    report += `  - 活跃组件: ${stats.activeComponents}\n`
    report += `  - 总组件数: ${stats.totalComponents}\n`
    report += `  - 总内存: ${this.formatBytes(stats.totalMemory)}\n`
    report += `  - 平均内存: ${this.formatBytes(stats.averageComponentMemory)}\n\n`

    // 最大组件
    if (stats.largestComponents.length > 0) {
      report += '🔍 最大组件:\n'
      stats.largestComponents.slice(0, 5).forEach((comp, index) => {
        report += `  ${index + 1}. ${comp.name}: ${this.formatBytes(comp.memory)}\n`
      })
      report += '\n'
    }

    // 警告
    if (stats.warnings.length > 0) {
      report += '⚠️ 警告:\n'
      stats.warnings.slice(0, 5).forEach((warning, index) => {
        report += `  ${index + 1}. ${warning}\n`
      })
      report += '\n'
    }

    // 内存泄漏
    if (stats.memoryLeaks.length > 0) {
      report += '🚨 内存泄漏:\n'
      stats.memoryLeaks.slice(0, 3).forEach((leak, index) => {
        report += `  ${index + 1}. ${leak.type}: ${leak.location}\n`
      })
      report += '\n'
    }

    // 系统内存
    report += '💻 系统内存:\n'
    report += `  - 堆内存: ${this.formatBytes(memoryStats.current.heapUsed)}\n`
    report += `  - RSS: ${this.formatBytes(memoryStats.current.rss)}\n`
    report += `  - 运行时间: ${this.formatDuration(memoryStats.uptime)}\n`

    return report
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
    this.componentMap.clear()
    this.reactiveMap.clear()
    this.watcherMap.clear()
  }
}

/**
 * 创建 Vue 内存管理器实例
 */
export function createVueMemoryManager(config?: VueMemoryConfig): VueMemoryManager {
  return new VueMemoryManager(config)
}

// 导出类型
export type { VueMemoryConfig, ComponentMemoryInfo, VueMemoryStats }

/**
 * Vue 3 组合式 API - 内存管理
 */
export function useMemoryManager(config?: VueMemoryConfig) {
  const memoryManager = createVueMemoryManager(config)
  const stats = ref(memoryManager.getStats())
  const isMonitoring = ref(false)

  // 开始监控
  const startMonitoring = () => {
    memoryManager.start()
    isMonitoring.value = true
  }

  // 停止监控
  const stopMonitoring = () => {
    memoryManager.stop()
    isMonitoring.value = false
  }

  // 获取报告
  const getReport = () => {
    return memoryManager.generateReport()
  }

  // 自动开始监控
  if (process.env.NODE_ENV === 'development') {
    startMonitoring()
  }

  // 组件卸载时停止监控
  onUnmounted(() => {
    stopMonitoring()
  })

  // 定期更新统计
  const updateInterval = setInterval(() => {
    stats.value = memoryManager.getStats()
  }, 5000)

  onUnmounted(() => {
    clearInterval(updateInterval)
  })

  return {
    stats,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getReport,
    // 低级访问
    memoryManager
  }
}

/**
 * 内存监控组件
 */
export const MemoryMonitor = defineComponent({
  name: 'MemoryMonitor',
  
  setup() {
    const { stats: _stats, isMonitoring, startMonitoring, stopMonitoring, getReport } = useMemoryManager()
    const showDialog = ref(false)
    const report = ref('')

    const showReport = () => {
      report.value = getReport()
      showDialog.value = true
    }

    return () => h('div', {
      class: 'memory-monitor'
    }, [
      h('button', {
        onClick: showReport,
        class: 'memory-monitor-button',
        title: '内存监控'
      }, '🧠'),
      
      showDialog.value && h('div', {
        class: 'memory-monitor-dialog'
      }, [
        h('div', {
          class: 'memory-monitor-header'
        }, [
          h('h3', '内存监控报告'),
          h('button', {
            onClick: () => showDialog.value = false
          }, '×')
        ]),
        
        h('pre', {
          class: 'memory-monitor-report'
        }, report.value),
        
        h('div', {
          class: 'memory-monitor-actions'
        }, [
          h('button', {
            onClick: isMonitoring.value ? stopMonitoring : startMonitoring
          }, isMonitoring.value ? '停止监控' : '开始监控')
        ])
      ])
    ])
  }
})

/**
 * 全局 Vue 内存管理器实例
 */
export const globalVueMemoryManager = createVueMemoryManager({
  trackComponents: process.env.NODE_ENV === 'development',
  trackReactive: true,
  trackWatchers: true
})