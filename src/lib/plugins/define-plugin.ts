import type { Component } from 'vue'
import type { 
  SearchPlugin, 
  SearchContext, 
  SearchResultItem, 
  PluginSettingSchema,
  PluginManagerEvents 
} from '../search-plugins'
import { logger } from '../logger'
import { handlePluginError } from '../error-handler'

/**
 * 插件配置选项
 */
export interface PluginDefinitionOptions {
  /** 插件唯一标识 */
  id: string
  /** 插件名称 */
  name: string
  /** 插件描述 */
  description: string
  /** 插件图标 */
  icon?: Component
  /** 插件版本 */
  version?: string
  /** 是否启用 */
  enabled?: boolean
  /** 优先级（影响搜索结果排序） */
  priority?: number
  /** 支持的搜索前缀 */
  searchPrefixes?: string[]
  /** 插件配置项 */
  settings?: {
    schema: PluginSettingSchema[]
    values?: Record<string, any>
    onChange?: (key: string, value: any) => void
  }
  /** 初始化函数 */
  initialize?: (plugin: SearchPlugin) => Promise<void> | void
  /** 销毁函数 */
  destroy?: (plugin: SearchPlugin) => Promise<void> | void
  /** 搜索函数 */
  search: (context: SearchContext, plugin: SearchPlugin) => Promise<SearchResultItem[]> | SearchResultItem[]
  /** 事件监听器 */
  eventListeners?: Array<{
    event: keyof PluginManagerEvents
    listener: (...args: any[]) => void
  }>
  /** 元数据 */
  metadata?: {
    author?: string
    license?: string
    homepage?: string
    category?: string
    tags?: string[]
    permissions?: string[]
  }
}

/**
 * 插件内部状态
 */
interface PluginInternalState {
  initialized: boolean
  destroyed: boolean
  privateData: Map<string, any>
  eventListeners: Map<string, Array<(...args: any[]) => void>>
  errorCount: number
  lastUsed: number
}

/**
 * 插件工厂函数
 * 创建一个符合 SearchPlugin 接口的插件实例
 */
export function definePlugin(options: PluginDefinitionOptions): SearchPlugin {
  // 设置默认值
  const defaults = {
    version: '1.0.0',
    enabled: true,
    priority: 50,
    searchPrefixes: [] as string[],
    metadata: {}
  }

  const config = { ...defaults, ...options }
  
  // 内部状态
  const internalState: PluginInternalState = {
    initialized: false,
    destroyed: false,
    privateData: new Map(),
    eventListeners: new Map(),
    errorCount: 0,
    lastUsed: 0
  }

  // 创建插件实例
  const plugin: SearchPlugin = {
    id: config.id,
    name: config.name,
    description: config.description,
    icon: config.icon || null,
    version: config.version,
    enabled: config.enabled,
    priority: config.priority,
    searchPrefixes: config.searchPrefixes,
    settings: config.settings ? {
      schema: config.settings.schema,
      values: config.settings.values || {},
      onChange: config.settings.onChange
    } : undefined,

    async initialize(): Promise<void> {
      if (internalState.initialized) {
        logger.warn(`插件 ${config.id} 已经初始化过了`)
        return
      }

      try {
        // 调用用户自定义初始化函数
        if (config.initialize) {
          await config.initialize(this)
        }

        // 注册事件监听器
        if (config.eventListeners) {
          for (const { event, listener } of config.eventListeners) {
            this.on(event, listener as any)
          }
        }

        internalState.initialized = true
        logger.info(`插件 ${config.id} 初始化完成`)
      } catch (error) {
        internalState.errorCount++
        const appError = handlePluginError(`插件 ${config.id} 初始化`, error)
        logger.error(`插件 ${config.id} 初始化失败`, appError)
        throw error
      }
    },

    async destroy(): Promise<void> {
      if (internalState.destroyed) {
        return
      }

      try {
        // 调用用户自定义销毁函数
        if (config.destroy) {
          await config.destroy(this)
        }

        // 清理事件监听器
        internalState.eventListeners.clear()
        internalState.privateData.clear()
        
        internalState.destroyed = true
        logger.info(`插件 ${config.id} 已销毁`)
      } catch (error) {
        internalState.errorCount++
        const appError = handlePluginError(`插件 ${config.id} 销毁`, error)
        logger.error(`插件 ${config.id} 销毁失败`, appError)
        throw error
      }
    },

    async search(context: SearchContext): Promise<SearchResultItem[]> {
      if (!internalState.initialized) {
        logger.warn(`插件 ${config.id} 尚未初始化，尝试自动初始化`)
        await this.initialize()
      }

      if (internalState.destroyed) {
        logger.error(`插件 ${config.id} 已销毁，无法执行搜索`)
        return []
      }

      try {
        const startTime = Date.now()
        const results = await config.search(context, this)
        const endTime = Date.now()
        
        // 更新使用统计
        internalState.lastUsed = endTime
        internalState.privateData.set('lastSearchTime', endTime - startTime)
        internalState.privateData.set('totalSearches', (internalState.privateData.get('totalSearches') || 0) + 1)
        
        return results
      } catch (error) {
        internalState.errorCount++
        const appError = handlePluginError(`插件 ${config.id} 搜索`, error)
        logger.error(`插件 ${config.id} 搜索失败`, appError)
        return []
      }
    },

    // 事件处理方法
    on<K extends keyof PluginManagerEvents>(event: K, listener: PluginManagerEvents[K]): void {
      if (!internalState.eventListeners.has(event)) {
        internalState.eventListeners.set(event, [])
      }
      internalState.eventListeners.get(event)!.push(listener)
    },

    off<K extends keyof PluginManagerEvents>(event: K, listener: PluginManagerEvents[K]): void {
      const listeners = internalState.eventListeners.get(event)
      if (listeners) {
        const index = listeners.indexOf(listener)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    },

    emit<K extends keyof PluginManagerEvents>(event: K, ...args: Parameters<PluginManagerEvents[K]>): void {
      const listeners = internalState.eventListeners.get(event)
      if (listeners) {
        listeners.forEach(listener => {
          try {
            listener(...args)
          } catch (error) {
            logger.error(`插件 ${config.id} 事件监听器执行失败`, error)
          }
        })
      }
    },

    // 扩展方法：获取插件统计信息
    getStats() {
      return {
        initialized: internalState.initialized,
        destroyed: internalState.destroyed,
        errorCount: internalState.errorCount,
        lastUsed: internalState.lastUsed,
        totalSearches: internalState.privateData.get('totalSearches') || 0,
        lastSearchTime: internalState.privateData.get('lastSearchTime') || 0,
        privateDataSize: internalState.privateData.size
      }
    },

    // 扩展方法：存储私有数据
    setPrivateData(key: string, value: any): void {
      internalState.privateData.set(key, value)
    },

    // 扩展方法：获取私有数据
    getPrivateData<T = any>(key: string): T | undefined {
      return internalState.privateData.get(key)
    },

    // 扩展方法：检查健康状态
    isHealthy(): boolean {
      return internalState.initialized && 
             !internalState.destroyed && 
             internalState.errorCount < 10
    }
  }

  return plugin
}

/**
 * 创建简单插件的便捷函数
 */
export function createSimplePlugin(options: Omit<PluginDefinitionOptions, 'version' | 'priority' | 'searchPrefixes'> & {
  priority?: number
  searchPrefixes?: string[]
}): SearchPlugin {
  return definePlugin({
    ...options,
    version: '1.0.0',
    priority: options.priority || 50,
    searchPrefixes: options.searchPrefixes || []
  })
}

/**
 * 创建搜索前缀插件的便捷函数
 */
export function createPrefixPlugin(
  prefix: string, 
  options: Omit<PluginDefinitionOptions, 'searchPrefixes'> & {
    priority?: number
  }
): SearchPlugin {
  return definePlugin({
    ...options,
    searchPrefixes: [prefix],
    priority: options.priority || 75
  })
}

/**
 * 批量创建插件的便捷函数
 */
export function definePlugins(definitions: PluginDefinitionOptions[]): SearchPlugin[] {
  return definitions.map(definePlugin)
}

/**
 * 插件验证工具
 */
export const pluginUtils = {
  /**
   * 验证插件配置
   */
  validateOptions(options: PluginDefinitionOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!options.id || typeof options.id !== 'string') {
      errors.push('插件ID必须是非空字符串')
    }
    
    if (!options.name || typeof options.name !== 'string') {
      errors.push('插件名称必须是非空字符串')
    }
    
    if (!options.description || typeof options.description !== 'string') {
      errors.push('插件描述必须是非空字符串')
    }
    
    if (typeof options.search !== 'function') {
      errors.push('搜索函数必须提供')
    }
    
    if (options.priority && (typeof options.priority !== 'number' || options.priority < 0)) {
      errors.push('优先级必须是大于等于0的数字')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  },

  /**
   * 检查插件ID冲突
   */
  checkIdConflicts(plugins: SearchPlugin[]): string[] {
    const idMap = new Map<string, SearchPlugin[]>()
    const conflicts: string[] = []
    
    for (const plugin of plugins) {
      if (!idMap.has(plugin.id)) {
        idMap.set(plugin.id, [])
      }
      idMap.get(plugin.id)!.push(plugin)
    }
    
    for (const [id, pluginList] of idMap) {
      if (pluginList.length > 1) {
        conflicts.push(`插件ID冲突: ${id} 被使用了 ${pluginList.length} 次`)
      }
    }
    
    return conflicts
  },

  /**
   * 获取插件摘要信息
   */
  getPluginSummary(plugin: SearchPlugin) {
    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      enabled: plugin.enabled,
      priority: plugin.priority,
      hasSettings: !!plugin.settings,
      prefixCount: plugin.searchPrefixes?.length || 0
    }
  }
}