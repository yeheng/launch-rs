/**
 * Plugin configuration management functionality
 */

import { handlePluginError } from '../../error-handler'
import { logger } from '../../logger'
import { pluginManager } from '../../search-plugin-manager'
import { usePluginStateStore } from '../plugin-state-manager'
import { PluginErrors, PluginManagementErrorType, createPluginManagementError } from './errors'
import type { PluginConfigurationUpdateOptions } from './interfaces'

/**
 * Plugin configuration service
 */
export class PluginConfigurationService {
  private stateStore: ReturnType<typeof usePluginStateStore> | null = null

  /**
   * Update plugin configuration
   */
  async updatePluginConfiguration(
    pluginId: string, 
    config: PluginConfigurationUpdateOptions
  ): Promise<{ success: boolean; error?: any; data?: any }> {
    try {
      logger.info(`Updating configuration for plugin: ${pluginId}`, { config })

      // Check if plugin exists
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        return {
          success: false,
          error: PluginErrors.pluginNotFound(pluginId)
        }
      }

      const updates: Record<string, any> = {}

      // Update settings
      if (config.settings) {
        await this.updatePluginSettings(pluginId, config.settings)
        updates.settings = config.settings
      }

      // Update permissions (if supported)
      if (config.permissions && 'permissions' in plugin) {
        await this.updatePluginPermissions(pluginId, config.permissions)
        updates.permissions = config.permissions
      }

      // Update metadata
      if (config.metadata) {
        await this.updatePluginMetadata(pluginId, config.metadata)
        updates.metadata = config.metadata
      }

      // Update enabled status
      if (config.enabled !== undefined) {
        await this.setPluginEnabled(pluginId, config.enabled)
        updates.enabled = config.enabled
      }

      // Save configuration to state store
      await this.savePluginConfiguration(pluginId, updates)

      logger.info(`Successfully updated configuration for plugin: ${pluginId}`)
      
      return {
        success: true,
        data: {
          pluginId,
          updated: updates,
          timestamp: Date.now()
        }
      }

    } catch (error) {
      const appError = handlePluginError(`更新插件配置 ${pluginId}`, error)
      logger.error('Plugin configuration update failed', appError)
      
      return {
        success: false,
        error: createPluginManagementError(
          PluginManagementErrorType.CONFIGURATION_ERROR,
          appError.message,
          { details: appError.details, pluginId }
        )
      }
    }
  }

  /**
   * Get plugin configuration
   */
  async getPluginConfiguration(pluginId: string): Promise<Record<string, any>> {
    try {
      logger.info(`Getting configuration for plugin: ${pluginId}`)

      // Check if plugin exists
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        throw PluginErrors.pluginNotFound(pluginId)
      }

      // Get configuration from state store
      const stateStore = this.getStateStore()
      const config = stateStore ? stateStore.getPluginConfig(pluginId) : {}
      
      // Add plugin metadata
      const fullConfig = {
        id: pluginId,
        enabled: plugin.enabled,
        settings: plugin.settings ? { ...plugin.settings.values } : {},
        permissions: ('permissions' in plugin) ? plugin.permissions : [],
        metadata: ('metadata' in plugin) ? plugin.metadata : {},
        customConfig: config || {},
        lastUpdated: Date.now()
      }

      logger.info(`Successfully retrieved configuration for plugin: ${pluginId}`)
      return fullConfig

    } catch (error) {
      const appError = handlePluginError(`获取插件配置 ${pluginId}`, error)
      logger.error('Failed to get plugin configuration', appError)
      throw appError
    }
  }

  /**
   * Reset plugin configuration to defaults
   */
  async resetPluginConfiguration(pluginId: string): Promise<{ success: boolean; error?: any; data?: any }> {
    try {
      logger.info(`Resetting configuration for plugin: ${pluginId}`)

      // Check if plugin exists
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        return {
          success: false,
          error: PluginErrors.pluginNotFound(pluginId)
        }
      }

      // Reset to default settings
      if (plugin.settings && plugin.settings.schema) {
        const defaultSettings = this.extractDefaultSettings(plugin.settings.schema)
        await this.updatePluginSettings(pluginId, defaultSettings)
      }

      // Clear custom configuration from state store
      const stateStore = this.getStateStore()
      if (stateStore) {
        stateStore.setPluginConfig(pluginId, {})
      }

      logger.info(`Successfully reset configuration for plugin: ${pluginId}`)
      
      return {
        success: true,
        data: {
          pluginId,
          resetAt: Date.now()
        }
      }

    } catch (error) {
      const appError = handlePluginError(`重置插件配置 ${pluginId}`, error)
      logger.error('Failed to reset plugin configuration', appError)
      
      return {
        success: false,
        error: createPluginManagementError(
          PluginManagementErrorType.CONFIGURATION_ERROR,
          appError.message,
          { details: appError.details, pluginId }
        )
      }
    }
  }

  /**
   * Export plugin configuration
   */
  async exportPluginConfiguration(pluginId: string): Promise<string> {
    try {
      logger.info(`Exporting configuration for plugin: ${pluginId}`)

      const config = await this.getPluginConfiguration(pluginId)
      
      const exportData = {
        pluginId,
        version: '1.0',
        exportedAt: Date.now(),
        configuration: config
      }

      return JSON.stringify(exportData, null, 2)

    } catch (error) {
      const appError = handlePluginError(`导出插件配置 ${pluginId}`, error)
      logger.error('Failed to export plugin configuration', appError)
      throw appError
    }
  }

  /**
   * Import plugin configuration
   */
  async importPluginConfiguration(pluginId: string, configData: string): Promise<{ success: boolean; error?: any; data?: any }> {
    try {
      logger.info(`Importing configuration for plugin: ${pluginId}`)

      // Parse configuration data
      let parsedConfig: any
      try {
        parsedConfig = JSON.parse(configData)
      } catch (error) {
        return {
          success: false,
          error: PluginErrors.configurationError(pluginId, 'Invalid JSON format')
        }
      }

      // Validate configuration structure
      if (!this.validateImportedConfiguration(parsedConfig)) {
        return {
          success: false,
          error: PluginErrors.configurationError(pluginId, 'Invalid configuration structure')
        }
      }

      // Apply configuration
      const result = await this.updatePluginConfiguration(pluginId, {
        settings: parsedConfig.configuration.settings,
        permissions: parsedConfig.configuration.permissions,
        metadata: parsedConfig.configuration.metadata,
        enabled: parsedConfig.configuration.enabled
      })

      if (result.success) {
        logger.info(`Successfully imported configuration for plugin: ${pluginId}`)
        return {
          success: true,
          data: {
            pluginId,
            importedAt: Date.now(),
            version: parsedConfig.version
          }
        }
      }

      return result

    } catch (error) {
      const appError = handlePluginError(`导入插件配置 ${pluginId}`, error)
      logger.error('Failed to import plugin configuration', appError)
      
      return {
        success: false,
        error: createPluginManagementError(
          PluginManagementErrorType.CONFIGURATION_ERROR,
          appError.message,
          { details: appError.details, pluginId }
        )
      }
    }
  }

  /**
   * Get all plugin configurations
   */
  async getAllPluginConfigurations(): Promise<Record<string, any>> {
    try {
      logger.info('Getting all plugin configurations')

      const plugins = pluginManager.getPlugins()
      const configurations: Record<string, any> = {}

      for (const plugin of plugins) {
        try {
          const config = await this.getPluginConfiguration(plugin.id)
          configurations[plugin.id] = config
        } catch (error) {
          logger.warn(`Failed to get configuration for plugin: ${plugin.id}`, { error })
          configurations[plugin.id] = { error: 'Failed to load configuration' }
        }
      }

      logger.info(`Successfully retrieved configurations for ${Object.keys(configurations).length} plugins`)
      return configurations

    } catch (error) {
      const appError = handlePluginError('获取所有插件配置', error)
      logger.error('Failed to get all plugin configurations', appError)
      throw appError
    }
  }

  /**
   * Backup all plugin configurations
   */
  async backupAllConfigurations(): Promise<string> {
    try {
      logger.info('Backing up all plugin configurations')

      const configurations = await this.getAllPluginConfigurations()
      
      const backupData = {
        version: '1.0',
        backupAt: Date.now(),
        pluginCount: Object.keys(configurations).length,
        configurations
      }

      return JSON.stringify(backupData, null, 2)

    } catch (error) {
      const appError = handlePluginError('备份所有插件配置', error)
      logger.error('Failed to backup plugin configurations', appError)
      throw appError
    }
  }

  /**
   * Restore plugin configurations from backup
   */
  async restoreConfigurationsFromBackup(backupData: string): Promise<{ success: boolean; error?: any; data?: any }> {
    try {
      logger.info('Restoring plugin configurations from backup')

      // Parse backup data
      let parsedBackup: any
      try {
        parsedBackup = JSON.parse(backupData)
      } catch (error) {
        return {
          success: false,
          error: PluginErrors.configurationError('system', 'Invalid backup JSON format')
        }
      }

      // Validate backup structure
      if (!this.validateBackupStructure(parsedBackup)) {
        return {
          success: false,
          error: PluginErrors.configurationError('system', 'Invalid backup structure')
        }
      }

      // Restore configurations
      const results: Record<string, any> = {}
      let successCount = 0
      let failureCount = 0

      for (const [pluginId, config] of Object.entries(parsedBackup.configurations)) {
        try {
          const result = await this.updatePluginConfiguration(pluginId, {
            settings: (config as any).settings,
            permissions: (config as any).permissions,
            metadata: (config as any).metadata,
            enabled: (config as any).enabled
          })
          
          results[pluginId] = result.success ? 'success' : 'failed'
          if (result.success) {
            successCount++
          } else {
            failureCount++
          }
        } catch (error) {
          results[pluginId] = 'error'
          failureCount++
        }
      }

      logger.info(`Configuration restore completed: ${successCount} success, ${failureCount} failures`)
      
      return {
        success: true,
        data: {
          pluginCount: Object.keys(parsedBackup.configurations).length,
          successCount,
          failureCount,
          results,
          restoredAt: Date.now()
        }
      }

    } catch (error) {
      const appError = handlePluginError('从备份恢复插件配置', error)
      logger.error('Failed to restore plugin configurations from backup', appError)
      
      return {
        success: false,
        error: createPluginManagementError(
          PluginManagementErrorType.CONFIGURATION_ERROR,
          appError.message
        )
      }
    }
  }

  /**
   * Set plugin enabled status
   */
  async setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
    try {
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        throw PluginErrors.pluginNotFound(pluginId)
      }

      if (enabled && !plugin.enabled) {
        await pluginManager.enablePlugin(pluginId)
      } else if (!enabled && plugin.enabled) {
        await pluginManager.disablePlugin(pluginId)
      }

      const stateStore = this.getStateStore()
      if (stateStore) {
        stateStore.setPluginEnabled(pluginId, enabled)
      }
      
      logger.info(`Plugin ${pluginId} ${enabled ? 'enabled' : 'disabled'}`)

    } catch (error) {
      const appError = handlePluginError(`设置插件状态 ${pluginId}`, error)
      logger.error('Failed to set plugin enabled status', appError)
      throw appError
    }
  }

  // Private helper methods
  private async updatePluginSettings(pluginId: string, settings: Record<string, any>): Promise<void> {
    const plugin = pluginManager.getPlugin(pluginId)
    if (!plugin || !plugin.settings) return

    // Validate settings against schema
    if (plugin.settings.schema) {
      const validationResult = this.validateSettings(settings, plugin.settings.schema)
      if (!validationResult.valid) {
        throw PluginErrors.configurationError(pluginId, `Invalid settings: ${validationResult.message}`)
      }
    }

    // Update settings
    Object.assign(plugin.settings.values, settings)

    // Call change callbacks if available
    if (plugin.settings.onChange) {
      for (const [key, value] of Object.entries(settings)) {
        plugin.settings.onChange(key, value)
      }
    }
  }

  private async updatePluginPermissions(pluginId: string, permissions: string[]): Promise<void> {
    const plugin = pluginManager.getPlugin(pluginId)
    if (!plugin || !('permissions' in plugin)) return

    // Validate permissions
    const validPermissions = this.validatePermissions(permissions)
    plugin.permissions = validPermissions
  }

  private async updatePluginMetadata(pluginId: string, metadata: Record<string, any>): Promise<void> {
    const plugin = pluginManager.getPlugin(pluginId)
    if (!plugin || !('metadata' in plugin)) return

    // Update metadata
    Object.assign(plugin.metadata as Record<string, any>, metadata)
  }

  private async savePluginConfiguration(pluginId: string, config: Record<string, any>): Promise<void> {
    const stateStore = this.getStateStore()
    if (stateStore) {
      stateStore.setPluginConfig(pluginId, config)
    }
  }

  private extractDefaultSettings(schema: any[]): Record<string, any> {
    const defaults: Record<string, any> = {}
    
    for (const field of schema) {
      if (field.defaultValue !== undefined) {
        defaults[field.key] = field.defaultValue
      }
    }
    
    return defaults
  }

  private validateSettings(settings: Record<string, any>, schema: any[]): { valid: boolean; message?: string } {
    const schemaMap = new Map(schema.map(field => [field.key, field]))
    
    for (const [key, value] of Object.entries(settings)) {
      const field = schemaMap.get(key)
      if (!field) {
        return { valid: false, message: `Unknown setting: ${key}` }
      }
      
      // Type validation
      if (field.type && typeof value !== field.type) {
        return { valid: false, message: `Invalid type for ${key}: expected ${field.type}` }
      }
      
      // Range validation
      if (field.min !== undefined && value < field.min) {
        return { valid: false, message: `${key} must be at least ${field.min}` }
      }
      
      if (field.max !== undefined && value > field.max) {
        return { valid: false, message: `${key} must be at most ${field.max}` }
      }
      
      // Enum validation
      if (field.enum && !field.enum.includes(value)) {
        return { valid: false, message: `${key} must be one of: ${field.enum.join(', ')}` }
      }
    }
    
    return { valid: true }
  }

  private validatePermissions(permissions: string[]): string[] {
    // Filter out invalid or dangerous permissions
    const validPermissions = [
      'filesystem:read',
      'filesystem:write',
      'network:http',
      'network:https',
      'system:process',
      'system:clipboard',
      'ui:dialog',
      'ui:notification'
    ]
    
    return permissions.filter(permission => 
      validPermissions.includes(permission) || 
      permission.startsWith('custom:')
    )
  }

  private validateImportedConfiguration(config: any): boolean {
    return (
      config &&
      typeof config === 'object' &&
      config.pluginId &&
      config.configuration &&
      typeof config.configuration === 'object'
    )
  }

  private validateBackupStructure(backup: any): boolean {
    return (
      backup &&
      typeof backup === 'object' &&
      backup.version &&
      backup.configurations &&
      typeof backup.configurations === 'object'
    )
  }

  /**
   * Get state store with lazy loading
   */
  private getStateStore(): ReturnType<typeof usePluginStateStore> | null {
    if (this.stateStore) {
      return this.stateStore
    }
    
    try {
      // 检查 Pinia 是否已经激活
      const { getActivePinia } = require('pinia')
      const pinia = getActivePinia()
      
      if (!pinia) {
        logger.warn('Pinia not yet activated, state store not available')
        return null
      }
      
      this.stateStore = usePluginStateStore()
      return this.stateStore
    } catch (error) {
      const appError = handlePluginError('Failed to initialize state store', error)
      logger.warn('Failed to initialize state store', appError)
      return null
    }
  }
}

// Export singleton instance
export const pluginConfigurationService = new PluginConfigurationService()
