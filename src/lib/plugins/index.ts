import { pluginManager } from '../search-plugin-manager'
import { AppsSearchPlugin } from './apps-plugin'
import { CalculatorPlugin, UnitConverterPlugin } from './calculator-plugin'
import { FileSearchPlugin } from './file-plugin'
// import { BookmarksPlugin, WebSearchPlugin } from './web-plugin' // 暂时禁用

/**
 * 注册所有内置插件
 */
export async function registerBuiltinPlugins() {
  console.log('开始注册内置搜索插件...')
  
  try {
    // 注册应用搜索插件
    const appsPlugin = new AppsSearchPlugin()
    await pluginManager.register(appsPlugin)

    // 注册文件搜索插件
    const filePlugin = new FileSearchPlugin()
    await pluginManager.register(filePlugin)

    // 注册计算器插件
    const calculatorPlugin = new CalculatorPlugin()
    await pluginManager.register(calculatorPlugin)

    // 注册单位转换插件
    const unitConverterPlugin = new UnitConverterPlugin()
    await pluginManager.register(unitConverterPlugin)

    // 注册Web搜索插件 - 暂时禁用
    // const webSearchPlugin = new WebSearchPlugin()
    // await pluginManager.register(webSearchPlugin)

    // 注册书签插件 - 暂时禁用
    // const bookmarksPlugin = new BookmarksPlugin()
    // await pluginManager.register(bookmarksPlugin)

    console.log('所有内置插件注册完成')
    
    // 打印插件统计信息
    const plugins = pluginManager.getPlugins()
    const enabledCount = pluginManager.getEnabledPlugins().length
    console.log(`共注册 ${plugins.length} 个插件，其中 ${enabledCount} 个已启用`)
    
  } catch (error) {
    console.error('注册内置插件时发生错误:', error)
  }
}

/**
 * 获取所有可用的插件实例（用于配置）
 */
export function getAllPluginInstances() {
  return {
    apps: AppsSearchPlugin,
    files: FileSearchPlugin,
    calculator: CalculatorPlugin,
    units: UnitConverterPlugin,
    // web: WebSearchPlugin, // 暂时禁用
    // bookmarks: BookmarksPlugin // 暂时禁用
  }
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

// 导出插件管理服务
export { pluginManagementService } from './plugin-management-service'

// 导出状态管理
export { usePluginStateStore, pluginStateListener } from './plugin-state-manager'

// 导出统计管理
export { pluginStatisticsManager, usePluginStatistics } from './plugin-statistics'

// 导出类型
export * from './types'

// 导出演示功能
export { demoPluginStateManagement, testStatePersistence } from './plugin-state-demo'
