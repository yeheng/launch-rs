/**
 * 统一插件加载器
 * 集中管理所有插件的加载、注册、配置和生命周期管理
 */

import { pluginManager } from '../search-plugin-manager'
import { useUnifiedStateStore } from '../state/unified-state-manager'
import { pluginEventBus, eventBusUtils } from './plugin-event-bus'
import { logger } from '../logger'
import { handlePluginError } from '../error-handler'
import type { PluginConfig } from '../plugins'

/**
 * 插件加载配置接口
 */
export interface PluginLoaderConfig {
  /** 是否自动注册内置插件 */
  autoRegisterBuiltin?: boolean
  /** 是否自动启用事件监听 */
  autoEnableEvents?: boolean
  /** 插件配置覆盖 */
  pluginConfigs?: PluginConfig
  /** 加载超时时间（毫秒） */
  loadTimeout?: number
}

/**
 * 插件加载状态
 */
export enum PluginLoadStatus {
  NOT_LOADED = 'not_loaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  REGISTERED = 'registered',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error'
}

/**
 * 插件加载结果
 */
export interface PluginLoadResult {
  pluginId: string
  status: PluginLoadStatus
  error?: string
  loadTime?: number
}

/**
 * 统一插件加载器
 */
export class UnifiedPluginLoader {
  private static instance: UnifiedPluginLoader
  private config: PluginLoaderConfig
  private loadStatus: Map<string, PluginLoadStatus> = new Map()
  private loadResults: Map<string, PluginLoadResult> = new Map()
  private isLoading = false
  private eventListenersAttached = false

  /**
   * 获取单例实例
   */
  static getInstance(config?: PluginLoaderConfig): UnifiedPluginLoader {
    if (!UnifiedPluginLoader.instance) {
      UnifiedPluginLoader.instance = new UnifiedPluginLoader(config || {})
    }
    return UnifiedPluginLoader.instance
  }

  /**
   * 私有构造函数
   */
  private constructor(config: PluginLoaderConfig) {
    this.config = {
      autoRegisterBuiltin: true,
      autoEnableEvents: true,
      loadTimeout: 30000,
      ...config
    }

    // 初始化事件监听
    if (this.config.autoEnableEvents) {
      this.attachEventListeners()
    }
  }

  /**
   * 初始化插件系统
   */
  async initialize(): Promise<{
    success: boolean
    loadedCount: number
    errorCount: number
    errors: string[]
  }> {
    if (this.isLoading) {
      logger.warn('插件加载器正在初始化中...')
      return {
        success: false,
        loadedCount: 0,
        errorCount: 0,
        errors: ['插件加载器正在初始化中']
      }
    }

    this.isLoading = true
    const errors: string[] = []
    let loadedCount = 0
    let errorCount = 0

    try {
      logger.info('开始初始化统一插件系统...')

      // 发送初始化开始事件
      await pluginEventBus.emit(eventBusUtils.createPluginLifecycleEvent(
        'plugin.system.initializing',
        'system',
        {
          pluginName: 'Plugin System',
          triggeredBy: 'system',
          data: { config: this.config }
        }
      ))

      // 加载内置插件
      if (this.config.autoRegisterBuiltin) {
        const builtinResult = await this.loadBuiltinPlugins()
        loadedCount += builtinResult.loadedCount
        errorCount += builtinResult.errorCount
        errors.push(...builtinResult.errors)
      }

      // 应用插件配置
      if (this.config.pluginConfigs) {
        await this.applyPluginConfigs(this.config.pluginConfigs)
      }

      // 发送初始化完成事件
      await pluginEventBus.emit(eventBusUtils.createPluginLifecycleEvent(
        'plugin.system.initialized',
        'system',
        {
          pluginName: 'Plugin System',
          triggeredBy: 'system',
          data: {
            loadedCount,
            errorCount,
            totalPlugins: pluginManager.getPlugins().length
          }
        }
      ))

      logger.success(`插件系统初始化完成: ${loadedCount} 个成功, ${errorCount} 个失败`)
      
      return {
        success: errorCount === 0,
        loadedCount,
        errorCount,
        errors
      }

    } catch (error) {
      const appError = handlePluginError('初始化插件系统', error)
      logger.error('插件系统初始化失败', appError)
      
      errors.push(appError.message)
      
      // 发送初始化错误事件
      await pluginEventBus.emit(eventBusUtils.createPluginErrorEvent(
        'plugin.error occurred',
        'system',
        'initialization_failed',
        appError.message,
        { appError },
        'critical'
      ))

      return {
        success: false,
        loadedCount,
        errorCount: errorCount + 1,
        errors
      }
    } finally {
      this.isLoading = false
    }
  }

  /**
   * 加载内置插件
   */
  private async loadBuiltinPlugins(): Promise<{
    loadedCount: number
    errorCount: number
    errors: string[]
  }> {
    const errors: string[] = []
    let loadedCount = 0
    let errorCount = 0

    try {
      // 动态导入内置插件模块
      const { loadAndRegisterBuiltinPlugins } = await import('./builtin')
      
      // 发送插件加载开始事件
      await pluginEventBus.emit(eventBusUtils.createPluginLifecycleEvent(
        'plugin.loading.started',
        'builtin',
        {
          pluginName: 'Built-in Plugins',
          triggeredBy: 'system'
        }
      ))

      const startTime = Date.now()
      const result = await loadAndRegisterBuiltinPlugins(pluginManager)
      const loadTime = Date.now() - startTime

      if (result.success) {
        loadedCount = result.registered.length
        errorCount = result.failed.length

        // 更新插件状态
        for (const pluginId of result.registered) {
          this.updatePluginStatus(pluginId, PluginLoadStatus.REGISTERED, { loadTime })
          
          // 发送插件注册成功事件
          await pluginEventBus.emit(eventBusUtils.createPluginLifecycleEvent(
            'plugin.registered',
            pluginId,
            {
              pluginName: pluginId,
              triggeredBy: 'system',
              data: { loadTime }
            }
          ))
        }

        // 处理失败的插件
        for (const pluginId of result.failed) {
          this.updatePluginStatus(pluginId, PluginLoadStatus.ERROR, {
            error: `注册失败: ${pluginId}`
          })
          errors.push(`插件 ${pluginId} 注册失败`)
        }

        // 发送插件加载完成事件
        await pluginEventBus.emit(eventBusUtils.createPluginLifecycleEvent(
          'plugin.loading.completed',
          'builtin',
          {
            pluginName: 'Built-in Plugins',
            triggeredBy: 'system',
            data: {
              registered: result.registered,
              failed: result.failed,
              loadTime
            }
          }
        ))

      } else {
        errorCount = result.failed.length
        errors.push(`内置插件加载失败: ${result.error}`)
      }

    } catch (error) {
      const appError = handlePluginError('加载内置插件', error)
      logger.error('加载内置插件失败', appError)
      
      errors.push(appError.message)
      errorCount++
    }

    return { loadedCount, errorCount, errors }
  }

  /**
   * 应用插件配置
   */
  private async applyPluginConfigs(configs: PluginConfig): Promise<void> {
    try {
      // 发送配置应用开始事件
      await pluginEventBus.emit(eventBusUtils.createPluginStateEvent(
        'plugin.state.configured',
        'system',
        {
          configChange: {
            key: 'system_configs',
            oldValue: {},
            newValue: configs
          }
        }
      ))

      for (const [pluginId, pluginConfig] of Object.entries(configs)) {
        try {
          const plugin = pluginManager.getPlugin(pluginId)
          if (!plugin) continue

          // 应用启用/禁用状态
          if (pluginConfig.enabled !== undefined && pluginConfig.enabled !== plugin.enabled) {
            if (pluginConfig.enabled) {
              await pluginManager.enablePlugin(pluginId)
              this.updatePluginStatus(pluginId, PluginLoadStatus.ENABLED)
            } else {
              await pluginManager.disablePlugin(pluginId)
              this.updatePluginStatus(pluginId, PluginLoadStatus.DISABLED)
            }
          }

          // 应用插件设置
          if (pluginConfig.settings && plugin.settings) {
            Object.assign(plugin.settings.values, pluginConfig.settings)
            
            // 调用变更回调
            if (plugin.settings.onChange) {
              for (const [key, value] of Object.entries(pluginConfig.settings)) {
                plugin.settings.onChange(key, value)
              }
            }
          }

          // 发送插件配置变更事件
          await pluginEventBus.emit(eventBusUtils.createPluginStateEvent(
            'plugin.state.configured',
            pluginId,
            {
              configChange: {
                key: 'settings',
                oldValue: {},
                newValue: pluginConfig.settings
              }
            }
          ))

        } catch (error) {
          const appError = handlePluginError(`应用插件配置 ${pluginId}`, error)
          logger.error(`应用插件配置失败 ${pluginId}`, appError)
          
          this.updatePluginStatus(pluginId, PluginLoadStatus.ERROR, {
            error: appError.message
          })
        }
      }

    } catch (error) {
      const appError = handlePluginError('应用插件配置', error)
      logger.error('应用插件配置时发生错误', appError)
      
      await pluginEventBus.emit(eventBusUtils.createPluginErrorEvent(
        'plugin.error occurred',
        'system',
        'config_application_failed',
        appError.message,
        { appError },
        'medium'
      ))
    }
  }

  /**
   * 附加事件监听器
   */
  private attachEventListeners(): void {
    if (this.eventListenersAttached) return

    try {
      // 监听插件管理器事件
      pluginManager.on('plugin:registered', async (plugin) => {
        this.updatePluginStatus(plugin.id, PluginLoadStatus.REGISTERED)
        
        await pluginEventBus.emit(eventBusUtils.createPluginLifecycleEvent(
          'plugin.registered',
          plugin.id,
          {
            pluginName: plugin.name,
            triggeredBy: 'system'
          }
        ))
      })

      pluginManager.on('plugin:enabled', async (pluginId) => {
        this.updatePluginStatus(pluginId, PluginLoadStatus.ENABLED)
        
        await pluginEventBus.emit(eventBusUtils.createPluginLifecycleEvent(
          'plugin.enabled',
          pluginId,
          {
            triggeredBy: 'system'
          }
        ))
      })

      pluginManager.on('plugin:disabled', async (pluginId) => {
        this.updatePluginStatus(pluginId, PluginLoadStatus.DISABLED)
        
        await pluginEventBus.emit(eventBusUtils.createPluginLifecycleEvent(
          'plugin.disabled',
          pluginId,
          {
            triggeredBy: 'system'
          }
        ))
      })

      pluginManager.on('plugin:configured', async (pluginId, config) => {
        await pluginEventBus.emit(eventBusUtils.createPluginStateEvent(
          'plugin.state.configured',
          pluginId,
          {
            configChange: {
              key: 'settings',
              oldValue: {},
              newValue: config
            }
          }
        ))
      })

      // 监听搜索事件
      pluginManager.on('search:start', async (query) => {
        await pluginEventBus.emit(eventBusUtils.createPluginSearchEvent(
          'plugin.search.started',
          query
        ))
      })

      pluginManager.on('search:results', async (results) => {
        await pluginEventBus.emit(eventBusUtils.createPluginSearchEvent(
          'plugin.search.results',
          'unknown',
          {
            resultCount: results.length,
            results
          }
        ))
      })

      pluginManager.on('search:end', async (query, resultCount) => {
        await pluginEventBus.emit(eventBusUtils.createPluginSearchEvent(
          'plugin.search.completed',
          query,
          {
            resultCount
          }
        ))
      })

      this.eventListenersAttached = true
      logger.debug('插件加载器事件监听器已附加')

    } catch (error) {
      const appError = handlePluginError('附加事件监听器', error)
      logger.error('附加事件监听器失败', appError)
    }
  }

  /**
   * 更新插件状态
   */
  private updatePluginStatus(
    pluginId: string,
    status: PluginLoadStatus,
    data: { error?: string; loadTime?: number } = {}
  ): void {
    this.loadStatus.set(pluginId, status)
    
    const result: PluginLoadResult = {
      pluginId,
      status,
      ...data
    }
    
    this.loadResults.set(pluginId, result)

    // 同步到统一状态管理器
    try {
      const stateStore = useUnifiedStateStore()
      
      if (status === PluginLoadStatus.ENABLED) {
        stateStore.setPluginEnabled(pluginId, true)
      } else if (status === PluginLoadStatus.DISABLED) {
        stateStore.setPluginEnabled(pluginId, false)
      }
      
      // 记录加载时间
      if (data.loadTime) {
        const metrics = stateStore.getPluginMetrics(pluginId)
        stateStore.updateNestedState(`plugins.usageMetrics.${pluginId}`, {
          ...metrics,
          lastUsed: Date.now()
        })
      }
    } catch (error) {
      logger.warn(`同步插件状态到统一状态管理器失败: ${pluginId}`, error)
    }
  }

  /**
   * 获取插件加载状态
   */
  getPluginStatus(pluginId: string): PluginLoadStatus {
    return this.loadStatus.get(pluginId) || PluginLoadStatus.NOT_LOADED
  }

  /**
   * 获取所有插件加载状态
   */
  getAllPluginStatus(): Map<string, PluginLoadStatus> {
    return new Map(this.loadStatus)
  }

  /**
   * 获取插件加载结果
   */
  getPluginLoadResult(pluginId: string): PluginLoadResult | undefined {
    return this.loadResults.get(pluginId)
  }

  /**
   * 获取所有插件加载结果
   */
  getAllPluginLoadResults(): PluginLoadResult[] {
    return Array.from(this.loadResults.values())
  }

  /**
   * 获取加载统计
   */
  getLoadStatistics(): {
    total: number
    loaded: number
    enabled: number
    disabled: number
    errors: number
    averageLoadTime: number
  } {
    const results = this.getAllPluginLoadResults()
    const total = results.length
    const loaded = results.filter(r => 
      r.status === PluginLoadStatus.REGISTERED || 
      r.status === PluginLoadStatus.ENABLED
    ).length
    const enabled = results.filter(r => r.status === PluginLoadStatus.ENABLED).length
    const disabled = results.filter(r => r.status === PluginLoadStatus.DISABLED).length
    const errors = results.filter(r => r.status === PluginLoadStatus.ERROR).length
    
    const loadTimes = results
      .filter(r => r.loadTime !== undefined)
      .map(r => r.loadTime!)
    
    const averageLoadTime = loadTimes.length > 0 
      ? Math.round(loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length)
      : 0

    return {
      total,
      loaded,
      enabled,
      disabled,
      errors,
      averageLoadTime
    }
  }

  /**
   * 重新加载插件
   */
  async reloadPlugin(pluginId: string): Promise<boolean> {
    try {
      logger.info(`重新加载插件: ${pluginId}`)
      
      // 发送重新加载事件
      await pluginEventBus.emit(eventBusUtils.createPluginLifecycleEvent(
        'plugin.loading.started',
        pluginId,
        {
          triggeredBy: 'user',
          data: { action: 'reload' }
        }
      ))

      // 先取消注册
      await pluginManager.unregister(pluginId)
      
      // 重新注册
      const { getBuiltinPlugin } = await import('./builtin')
      const PluginClass = getBuiltinPlugin(pluginId)
      
      if (PluginClass) {
        const pluginInstance = new PluginClass()
        await pluginManager.register(pluginInstance)
        
        this.updatePluginStatus(pluginId, PluginLoadStatus.REGISTERED)
        
        await pluginEventBus.emit(eventBusUtils.createPluginLifecycleEvent(
          'plugin.registered',
          pluginId,
          {
            triggeredBy: 'user',
            data: { action: 'reload' }
          }
        ))
        
        logger.success(`插件重新加载成功: ${pluginId}`)
        return true
      } else {
        throw new Error(`插件类未找到: ${pluginId}`)
      }
      
    } catch (error) {
      const appError = handlePluginError(`重新加载插件 ${pluginId}`, error)
      logger.error(`插件重新加载失败: ${pluginId}`, appError)
      
      this.updatePluginStatus(pluginId, PluginLoadStatus.ERROR, {
        error: appError.message
      })
      
      return false
    }
  }

  /**
   * 销毁插件加载器
   */
  destroy(): void {
    try {
      // 清理状态
      this.loadStatus.clear()
      this.loadResults.clear()
      
      // 发送销毁事件
      pluginEventBus.emit(eventBusUtils.createPluginLifecycleEvent(
        'plugin.system.destroyed',
        'system',
        {
          pluginName: 'Plugin System',
          triggeredBy: 'system'
        }
      ))
      
      logger.info('插件加载器已销毁')
    } catch (error) {
      const appError = handlePluginError('销毁插件加载器', error)
      logger.error('销毁插件加载器失败', appError)
    }
  }
}

// 全局插件加载器实例
export const unifiedPluginLoader = UnifiedPluginLoader.getInstance()

/**
 * 便捷函数：初始化插件系统
 */
export async function initializePluginSystem(config?: PluginLoaderConfig): Promise<{
  success: boolean
  loadedCount: number
  errorCount: number
  errors: string[]
}> {
  const loader = UnifiedPluginLoader.getInstance(config)
  return await loader.initialize()
}

/**
 * 便捷函数：获取插件加载状态
 */
export function getPluginLoadStatus(pluginId: string): PluginLoadStatus {
  return unifiedPluginLoader.getPluginStatus(pluginId)
}

/**
 * 便捷函数：获取插件加载统计
 */
export function getPluginLoadStatistics() {
  return unifiedPluginLoader.getLoadStatistics()
}