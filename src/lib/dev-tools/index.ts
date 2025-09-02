/**
 * 开发者插件 - 内存管理工具
 * 
 * 提供开发环境专用的内存管理和性能分析功能
 */

// 导出开发环境专用的内存管理工具
export * from './memory/leak-detector'
export * from './memory/vue-memory-manager'

// 开发者插件入口
export class MemoryDevPlugin {
  private readonly name = 'memory-dev'
  private readonly version = '1.0.0'
  private readonly description = '开发环境内存管理工具'

  constructor() {
    console.log(`🔧 ${this.name} v${this.version} - ${this.description}`)
  }

  /**
   * 初始化开发者插件
   */
  initialize(): void {
    console.log('🧠 内存管理开发者插件已初始化')
    
    // 检查是否在开发环境
    if (process.env.NODE_ENV !== 'development') {
      console.warn('⚠️ 内存管理开发者插件仅在开发环境中可用')
      return
    }

    // 这里可以添加更多的初始化逻辑
    this.setupDevTools()
  }

  /**
   * 设置开发者工具
   */
  private setupDevTools(): void {
    // 注册全局开发者工具
    if (typeof global !== 'undefined') {
      ;(global as any).__MEMORY_DEV_TOOLS__ = {
        getLeakDetector: () => require('./leak-detector').globalLeakDetector,
        getVueMemoryManager: () => require('./vue-memory-manager').globalVueMemoryManager,
        getMemoryIntegration: () => require('../../utils/memory-integration').globalMemoryIntegration
      }
    }
  }

  /**
   * 获取插件信息
   */
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      environment: process.env.NODE_ENV,
      available: process.env.NODE_ENV === 'development'
    }
  }
}

// 创建默认实例
export const memoryDevPlugin = new MemoryDevPlugin()

// 自动初始化（仅在开发环境）
if (process.env.NODE_ENV === 'development') {
  memoryDevPlugin.initialize()
}