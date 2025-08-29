/**
 * Built-in Plugins Module
 * 
 * This module exports all built-in plugins for the launch-rs application.
 * Built-in plugins are core functionality plugins that are always available.
 */

// Import all built-in plugins
import { AppsSearchPlugin } from './apps-plugin'
import { CalculatorPlugin, UnitConverterPlugin } from './calculator-plugin'
import { FileSearchPlugin } from './file-plugin'

// Re-export the plugins
export { AppsSearchPlugin } from './apps-plugin'
export { CalculatorPlugin, UnitConverterPlugin } from './calculator-plugin'
export { FileSearchPlugin } from './file-plugin'

// Future built-in plugins can be added here:
// export { WebSearchPlugin } from './web-plugin'
// export { BookmarksPlugin } from './bookmarks-plugin'
// export { SystemPlugin } from './system-plugin'
// export { NetworkPlugin } from './network-plugin'

/**
 * Built-in plugin registry
 * 
 * This object provides easy access to all built-in plugin classes
 * for registration and configuration purposes.
 */
export const BUILTIN_PLUGINS = {
  apps: AppsSearchPlugin,
  calculator: CalculatorPlugin,
  units: UnitConverterPlugin,
  files: FileSearchPlugin,
  
  // Future plugins can be added here:
  // web: WebSearchPlugin,
  // bookmarks: BookmarksPlugin,
  // system: SystemPlugin,
  // network: NetworkPlugin,
}

/**
 * Built-in plugin metadata
 * 
 * This provides metadata about each built-in plugin for
 * UI display and configuration purposes.
 */
export const BUILTIN_PLUGIN_METADATA = {
  apps: {
    id: 'apps',
    name: 'Applications',
    description: 'Search and launch installed applications',
    category: 'system',
    version: '1.0.0',
    author: 'launch-rs',
    enabled: true,
    icon: 'ApplicationsIcon',
  },
  calculator: {
    id: 'calculator',
    name: 'Calculator',
    description: 'Mathematical calculations and expressions',
    category: 'utilities',
    version: '1.0.0',
    author: 'launch-rs',
    enabled: true,
    icon: 'CalculatorIcon',
  },
  units: {
    id: 'units',
    name: 'Unit Converter',
    description: 'Convert between different units of measurement',
    category: 'utilities',
    version: '1.0.0',
    author: 'launch-rs',
    enabled: true,
    icon: 'ConverterIcon',
  },
  files: {
    id: 'files',
    name: 'Files',
    description: 'Search and access files on your system',
    category: 'system',
    version: '1.0.0',
    author: 'launch-rs',
    enabled: true,
    icon: 'FilesIcon',
  },
}

/**
 * Get all built-in plugin instances
 * 
 * @returns Object containing all built-in plugin classes
 */
export function getAllBuiltinPlugins() {
  return BUILTIN_PLUGINS
}

/**
 * Get built-in plugin by ID
 * 
 * @param id - Plugin identifier
 * @returns Plugin class or undefined if not found
 */
export function getBuiltinPlugin(id: string) {
  return BUILTIN_PLUGINS[id as keyof typeof BUILTIN_PLUGINS]
}

/**
 * Get built-in plugin metadata by ID
 * 
 * @param id - Plugin identifier
 * @returns Plugin metadata or undefined if not found
 */
export function getBuiltinPluginMetadata(id: string) {
  return BUILTIN_PLUGIN_METADATA[id as keyof typeof BUILTIN_PLUGIN_METADATA]
}

/**
 * Check if a plugin ID corresponds to a built-in plugin
 * 
 * @param id - Plugin identifier to check
 * @returns True if the plugin is a built-in plugin
 */
export function isBuiltinPlugin(id: string) {
  return id in BUILTIN_PLUGINS
}

/**
 * Get all built-in plugin IDs
 * 
 * @returns Array of built-in plugin IDs
 */
export function getBuiltinPluginIds() {
  return Object.keys(BUILTIN_PLUGINS)
}

/**
 * Get enabled built-in plugin IDs
 * 
 * @returns Array of enabled built-in plugin IDs
 */
export function getEnabledBuiltinPluginIds() {
  return Object.entries(BUILTIN_PLUGIN_METADATA)
    .filter(([, metadata]) => metadata.enabled)
    .map(([id]) => id)
}

/**
 * Dynamically load and register all enabled built-in plugins
 * 
 * @param pluginManager - Plugin manager instance
 * @returns Promise that resolves when all plugins are registered
 */
export async function loadAndRegisterBuiltinPlugins(pluginManager: any) {
  console.log('开始动态加载内置搜索插件...')
  
  const registeredPlugins = []
  const failedPlugins = []
  
  try {
    // Get all enabled plugin IDs
    const enabledPluginIds = getEnabledBuiltinPluginIds()
    
    for (const pluginId of enabledPluginIds) {
      try {
        // Get plugin class from registry
        const PluginClass = getBuiltinPlugin(pluginId)
        if (!PluginClass) {
          console.warn(`插件类未找到: ${pluginId}`)
          failedPlugins.push(pluginId)
          continue
        }
        
        // Create plugin instance
        const pluginInstance = new PluginClass()
        
        // Register the plugin
        await pluginManager.register(pluginInstance)
        registeredPlugins.push(pluginId)
        
        console.log(`✅ 成功注册插件: ${pluginId}`)
        
      } catch (error) {
        console.error(`❌ 注册插件失败 ${pluginId}:`, error)
        failedPlugins.push(pluginId)
      }
    }
    
    console.log(`内置插件加载完成: ${registeredPlugins.length} 个成功, ${failedPlugins.length} 个失败`)
    
    if (failedPlugins.length > 0) {
      console.warn('失败的插件:', failedPlugins)
    }
    
    // 打印插件统计信息
    const plugins = pluginManager.getPlugins()
    const enabledCount = pluginManager.getEnabledPlugins().length
    console.log(`共注册 ${plugins.length} 个插件，其中 ${enabledCount} 个已启用`)
    
    return {
      success: true,
      registered: registeredPlugins,
      failed: failedPlugins,
      total: registeredPlugins.length + failedPlugins.length
    }
    
  } catch (error) {
    console.error('动态加载内置插件时发生严重错误:', error)
    return {
      success: false,
      registered: registeredPlugins,
      failed: failedPlugins,
      total: registeredPlugins.length + failedPlugins.length,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Load built-in plugins with custom configuration
 * 
 * @param pluginManager - Plugin manager instance
 * @param config - Plugin configuration (optional)
 * @returns Promise that resolves when all plugins are loaded
 */
export async function loadBuiltinPluginsWithConfig(pluginManager: any, config?: Record<string, any>) {
  console.log('开始加载内置插件（带配置）...')
  
  const result = await loadAndRegisterBuiltinPlugins(pluginManager)
  
  // Apply custom configuration if provided
  if (config && result.success) {
    try {
      for (const [pluginId, pluginConfig] of Object.entries(config)) {
        const plugin = pluginManager.getPlugin(pluginId)
        if (!plugin) continue
        
        // Apply enabled/disabled state
        if (pluginConfig.enabled !== undefined && pluginConfig.enabled !== plugin.enabled) {
          if (pluginConfig.enabled) {
            await pluginManager.enablePlugin(pluginId)
          } else {
            await pluginManager.disablePlugin(pluginId)
          }
        }
        
        // Apply plugin settings
        if (pluginConfig.settings && plugin.settings) {
          Object.assign(plugin.settings.values, pluginConfig.settings)
          
          // Call onChange callback if available
          if (plugin.settings.onChange) {
            for (const [key, value] of Object.entries(pluginConfig.settings)) {
              plugin.settings.onChange(key, value)
            }
          }
        }
      }
      console.log('插件配置应用完成')
    } catch (error) {
      console.error('应用插件配置时发生错误:', error)
      result.success = false
      result.error = error instanceof Error ? error.message : 'Configuration error'
    }
  }
  
  return result
}