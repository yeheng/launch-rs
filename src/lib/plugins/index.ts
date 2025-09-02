import { pluginManager } from '../search-plugin-manager'
import {
  getAllBuiltinPlugins,
  loadAndRegisterBuiltinPlugins
} from './builtin'
import { logger } from '../logger'
import { handlePluginError } from '../error-handler'

/**
 * 注册所有内置插件
 */
export async function registerBuiltinPlugins() {
  logger.info('开始注册内置搜索插件...')
  
  try {
    // 使用动态加载机制
    const result = await loadAndRegisterBuiltinPlugins(pluginManager)
    
    if (result.success) {
      logger.info('所有内置插件注册完成')
      logger.info(`成功注册 ${result.registered.length} 个插件`)
      if (result.failed.length > 0) {
        logger.warn(`注册失败的插件: ${result.failed.join(', ')}`)
      }
    } else {
      const appError = handlePluginError('插件注册', result.error)
      logger.error('插件注册失败', appError)
    }
    
  } catch (error) {
    const appError = handlePluginError('注册内置插件', error)
    logger.error('注册内置插件时发生错误', appError)
  }
}

/**
 * 获取所有可用的插件实例（用于配置）
 */
export function getAllPluginInstances() {
  return getAllBuiltinPlugins()
}

/**
 * 插件配置接口
 */
export interface PluginConfig {
  [pluginId: string]: {
    enabled: boolean
    settings?: Record<string, any>
  }
}

/**
 * 从配置应用插件设置
 */
export async function applyPluginConfig(config: PluginConfig) {
  for (const [pluginId, pluginConfig] of Object.entries(config)) {
    const plugin = pluginManager.getPlugin(pluginId)
    if (!plugin) continue

    // 应用启用/禁用状态
    if (pluginConfig.enabled !== plugin.enabled) {
      if (pluginConfig.enabled) {
        await pluginManager.enablePlugin(pluginId)
      } else {
        await pluginManager.disablePlugin(pluginId)
      }
    }

    // 应用插件设置
    if (pluginConfig.settings && plugin.settings) {
      Object.assign(plugin.settings.values, pluginConfig.settings)
      
      // 如果有变更回调，调用它
      if (plugin.settings.onChange) {
        for (const [key, value] of Object.entries(pluginConfig.settings)) {
          plugin.settings.onChange(key, value)
        }
      }
    }
  }
}

/**
 * 获取当前插件配置
 */
export function getCurrentPluginConfig(): PluginConfig {
  const config: PluginConfig = {}
  
  for (const plugin of pluginManager.getPlugins()) {
    config[plugin.id] = {
      enabled: plugin.enabled,
      settings: plugin.settings ? { ...plugin.settings.values } : undefined
    }
  }
  
  return config
}

// 导出插件管理器实例
export { pluginManager }

// 导出统一插件加载器
export { 
  unifiedPluginLoader, 
  initializePluginSystem, 
  getPluginLoadStatus, 
  getPluginLoadStatistics,
  type PluginLoaderConfig,
  type PluginLoadStatus,
  type PluginLoadResult
} from './unified-plugin-loader'

// 导出插件管理服务类型（避免循环导入）
export type {
  PluginSearchOptions,
  PluginOperationResult,
  PluginStatistics,
  PluginConfigurationUpdateOptions,
  PluginInstallationOptions,
  PluginUninstallationOptions,
  PluginUpdateOptions,
  PluginHealthCheckOptions,
  PluginValidationOptions,
  PluginDiscoveryOptions,
  PluginDependency,
  PluginCompatibility,
  PluginPerformanceMetrics,
  PluginUsageAnalytics,
  PluginManagementEvent,
  IPluginManagementService
} from './management/interfaces'

// 导出插件管理错误类型
export {
  PluginManagementError,
  PluginManagementErrorType
} from './management/errors'

// 保持向后兼容性 - 导出旧的 pluginManagementService
// 注意：这将在未来版本中移除
export { pluginManagementService } from './plugin-management-service'

// 导出状态管理
export { pluginStateListener, usePluginStateStore } from './plugin-state-manager'

// 导出统计管理
export { pluginStatisticsManager, usePluginStatistics } from './plugin-statistics'

// 导出事件总线
export { 
  pluginEventBus, 
  eventBusUtils,
  type PluginEvent,
  type PluginLifecycleEvent,
  type PluginStateEvent,
  type PluginSearchEvent,
  type PluginErrorEvent,
  type SystemEvent,
  type EventHandler,
  type EventBusMiddleware
} from './plugin-event-bus'

// 导出插件类型系统
export * from './types'

// 导出演示功能
export { demoPluginStateManagement, testStatePersistence } from './plugin-state-demo'
