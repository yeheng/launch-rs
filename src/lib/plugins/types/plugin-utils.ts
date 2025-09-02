/**
 * Plugin utility functions
 * 插件工具函数
 */

import type { SearchPlugin } from '../../search-plugins'
import type {
  PluginMetadata,
  PluginInstallation
} from './basic'
import type { PluginCatalogItem } from './catalog'
import type { PluginHealthStatus } from './health'
import {
  PluginCategory,
  PluginInstallationStatus
} from './basic'
import { PluginHealthLevel } from './health'

/**
 * Plugin utility functions
 * 插件工具函数
 */
export class PluginUtils {
  /**
   * Create a basic plugin metadata object
   * 创建基础插件元数据对象
   */
  static createBasicMetadata(_plugin: SearchPlugin): PluginMetadata {
    return {
      author: 'Unknown',
      license: 'Unknown',
      keywords: [],
      installDate: new Date(),
      lastUpdated: new Date(),
      fileSize: 0,
      dependencies: [],
      category: PluginCategory.UTILITIES
    }
  }
  
  /**
   * Create a basic installation object for built-in plugins
   * 为内置插件创建基础安装对象
   */
  static createBuiltInInstallation(): PluginInstallation {
    return {
      isInstalled: true,
      isBuiltIn: true,
      canUninstall: false,
      installMethod: 'builtin',
      status: PluginInstallationStatus.INSTALLED
    }
  }
  
  /**
   * Convert a basic SearchPlugin to EnhancedSearchPlugin
   * 将基础 SearchPlugin 转换为 EnhancedSearchPlugin
   */
  static enhancePlugin(plugin: SearchPlugin): any { // EnhancedSearchPlugin
    return {
      ...plugin,
      metadata: this.createBasicMetadata(plugin),
      installation: this.createBuiltInInstallation(),
      permissions: []
    }
  }
  
  /**
   * Check if a plugin meets minimum requirements
   * 检查插件是否满足最低要求
   */
  static meetsRequirements(
    plugin: PluginCatalogItem,
    currentAppVersion: string
  ): boolean {
    if (!plugin.minAppVersion) return true
    
    // Simple version comparison (assumes semantic versioning)
    // 简单版本比较（假设使用语义版本控制）
    const parseVersion = (version: string) => {
      return version.split('.').map(num => parseInt(num, 10))
    }
    
    const currentVersion = parseVersion(currentAppVersion)
    const requiredVersion = parseVersion(plugin.minAppVersion)
    
    for (let i = 0; i < Math.max(currentVersion.length, requiredVersion.length); i++) {
      const current = currentVersion[i] || 0
      const required = requiredVersion[i] || 0
      
      if (current > required) return true
      if (current < required) return false
    }
    
    return true
  }
  
  /**
   * Calculate plugin health score
   * 计算插件健康分数
   */
  static calculateHealthScore(health: PluginHealthStatus): number {
    if (health.status === PluginHealthLevel.HEALTHY) return 100
    if (health.status === PluginHealthLevel.WARNING) return 75
    if (health.status === PluginHealthLevel.ERROR) return 25
    return 0
  }
  
  /**
   * Format file size for display
   * 格式化文件大小以供显示
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }
}