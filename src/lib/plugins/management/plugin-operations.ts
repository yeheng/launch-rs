/**
 * Plugin operations (install, uninstall, update, enable/disable)
 */

import { pluginManager } from '../../search-plugin-manager'
import type { SearchPlugin } from '../../search-plugins'
import { usePluginStateStore } from '../plugin-state-manager'
import { pluginStatisticsManager } from '../plugin-statistics'
import { logger } from '../../logger'
import { handlePluginError } from '../../error-handler'
import type { EnhancedSearchPlugin } from '../types'
import type { 
  PluginOperationResult,
  PluginInstallationOptions,
  PluginUninstallationOptions,
  PluginUpdateOptions
} from './interfaces'
import { 
  PluginManagementErrorType,
  PluginManagementError,
  PluginErrors 
} from './errors'

/**
 * Plugin operations service
 */
export class PluginOperationsService {
  private stateStore = usePluginStateStore()

  /**
   * Install a plugin
   */
  async installPlugin(
    pluginId: string, 
    options: PluginInstallationOptions = {}
  ): Promise<PluginOperationResult> {
    try {
      logger.info(`Installing plugin: ${pluginId}`)

      // Check if plugin is already installed
      const installedPlugins = await this.getInstalledPlugins()
      if (installedPlugins.some(p => p.id === pluginId)) {
        return {
          success: false,
          error: PluginErrors.installationFailed(pluginId, 'Plugin is already installed')
        }
      }

      // Get plugin details from available plugins
      const availablePlugins = await this.getAvailablePlugins()
      const pluginToInstall = availablePlugins.find(p => p.id === pluginId)
      
      if (!pluginToInstall) {
        return {
          success: false,
          error: PluginErrors.pluginNotFound(pluginId)
        }
      }

      // Validate plugin if not skipped
      if (!options.skipValidation) {
        const validationResult = await this.validatePluginForInstallation(pluginToInstall)
        if (!validationResult.valid) {
          return {
            success: false,
            error: PluginErrors.validationFailed(pluginId, validationResult.message)
          }
        }
      }

      // Perform installation
      const installResult = await this.performInstallation(pluginToInstall, options)
      
      if (installResult.success) {
        // Update state store
        this.stateStore.setPluginEnabled(pluginId, options.enableAfterInstall ?? true)
        
        // Update statistics
        this.stateStore.recordPluginUsage(pluginId, 0, 0, false)
        
        logger.info(`Successfully installed plugin: ${pluginId}`)
      }

      return installResult

    } catch (error) {
      const appError = handlePluginError(`安装插件 ${pluginId}`, error)
      logger.error('Plugin installation failed', appError)
      
      return {
        success: false,
        error: new PluginManagementError(
          PluginManagementErrorType.INSTALLATION_FAILED,
          appError.message,
          appError.details,
          pluginId
        )
      }
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(
    pluginId: string, 
    options: PluginUninstallationOptions = {}
  ): Promise<PluginOperationResult> {
    try {
      logger.info(`Uninstalling plugin: ${pluginId}`)

      // Check if plugin exists and is installed
      const installedPlugins = await this.getInstalledPlugins()
      const pluginToUninstall = installedPlugins.find(p => p.id === pluginId)
      
      if (!pluginToUninstall) {
        return {
          success: false,
          error: PluginErrors.pluginNotFound(pluginId)
        }
      }

      // Check if plugin has dependents
      const dependents = await this.getPluginDependents(pluginId)
      if (dependents.length > 0 && !options.force) {
        return {
          success: false,
          error: PluginErrors.uninstallationFailed(
            pluginId, 
            `Plugin has dependents: ${dependents.join(', ')}`
          )
        }
      }

      // Backup configuration if requested
      if (options.backupConfig) {
        await this.backupPluginConfiguration(pluginId)
      }

      // Perform uninstallation
      const uninstallResult = await this.performUninstallation(pluginToUninstall, options)
      
      if (uninstallResult.success) {
        // Update state store
        this.stateStore.setPluginEnabled(pluginId, false)
        
        // Clear plugin data if requested
        if (options.removeData) {
          await this.clearPluginData(pluginId)
        }
        
        // Clear plugin configuration if requested
        if (options.removeConfig) {
          await this.clearPluginConfiguration(pluginId)
        }
        
        logger.info(`Successfully uninstalled plugin: ${pluginId}`)
      }

      return uninstallResult

    } catch (error) {
      const appError = handlePluginError(`卸载插件 ${pluginId}`, error)
      logger.error('Plugin uninstallation failed', appError)
      
      return {
        success: false,
        error: new PluginManagementError(
          PluginManagementErrorType.UNINSTALLATION_FAILED,
          appError.message,
          appError.details,
          pluginId
        )
      }
    }
  }

  /**
   * Update a plugin
   */
  async updatePlugin(
    pluginId: string, 
    options: PluginUpdateOptions = {}
  ): Promise<PluginOperationResult> {
    try {
      logger.info(`Updating plugin: ${pluginId}`)

      // Check if plugin exists and is installed
      const installedPlugins = await this.getInstalledPlugins()
      const pluginToUpdate = installedPlugins.find(p => p.id === pluginId)
      
      if (!pluginToUpdate) {
        return {
          success: false,
          error: PluginErrors.pluginNotFound(pluginId)
        }
      }

      // Check if update is available
      const availablePlugins = await this.getAvailablePlugins()
      const availablePlugin = availablePlugins.find(p => p.id === pluginId)
      
      if (!availablePlugin) {
        return {
          success: false,
          error: PluginErrors.updateFailed(pluginId, 'Plugin not found in available plugins')
        }
      }

      // Check if update is needed
      const currentVersion = pluginToUpdate.version
      const availableVersion = availablePlugin.version
      
      if (currentVersion === availableVersion) {
        return {
          success: false,
          error: PluginErrors.updateFailed(pluginId, 'Plugin is already up to date')
        }
      }

      // Backup current configuration if requested
      if (options.backup) {
        await this.backupPluginConfiguration(pluginId)
      }

      // Perform update
      const updateResult = await this.performUpdate(pluginToUpdate, availablePlugin, options)
      
      if (updateResult.success) {
        // Apply configuration if provided
        if (options.configuration) {
          await this.applyPluginConfiguration(pluginId, options.configuration)
        }
        
        // Enable plugin if requested
        if (options.enableAfterUpdate) {
          await this.enablePlugin(pluginId)
        }
        
        logger.info(`Successfully updated plugin: ${pluginId} from ${currentVersion} to ${availableVersion}`)
      }

      return updateResult

    } catch (error) {
      const appError = handlePluginError(`更新插件 ${pluginId}`, error)
      logger.error('Plugin update failed', appError)
      
      return {
        success: false,
        error: new PluginManagementError(
          PluginManagementErrorType.UPDATE_FAILED,
          appError.message,
          appError.details,
          pluginId
        )
      }
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<PluginOperationResult> {
    try {
      logger.info(`Enabling plugin: ${pluginId}`)

      // Check if plugin exists
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        return {
          success: false,
          error: PluginErrors.pluginNotFound(pluginId)
        }
      }

      // Check if already enabled
      if (plugin.enabled) {
        return {
          success: true,
          data: { message: 'Plugin is already enabled' }
        }
      }

      // Enable plugin
      await pluginManager.enablePlugin(pluginId)
      
      // Update state store
      this.stateStore.setPluginEnabled(pluginId, true)
      
      logger.info(`Successfully enabled plugin: ${pluginId}`)
      
      return {
        success: true,
        data: { message: 'Plugin enabled successfully' }
      }

    } catch (error) {
      const appError = handlePluginError(`启用插件 ${pluginId}`, error)
      logger.error('Plugin enable failed', appError)
      
      return {
        success: false,
        error: new PluginManagementError(
          PluginManagementErrorType.CONFIGURATION_ERROR,
          appError.message,
          appError.details,
          pluginId
        )
      }
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<PluginOperationResult> {
    try {
      logger.info(`Disabling plugin: ${pluginId}`)

      // Check if plugin exists
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        return {
          success: false,
          error: PluginErrors.pluginNotFound(pluginId)
        }
      }

      // Check if already disabled
      if (!plugin.enabled) {
        return {
          success: true,
          data: { message: 'Plugin is already disabled' }
        }
      }

      // Check if plugin is critical
      if (this.isCriticalPlugin(pluginId)) {
        return {
          success: false,
          error: PluginErrors.permissionDenied(pluginId, 'Cannot disable critical plugin')
        }
      }

      // Disable plugin
      await pluginManager.disablePlugin(pluginId)
      
      // Update state store
      this.stateStore.setPluginEnabled(pluginId, false)
      
      logger.info(`Successfully disabled plugin: ${pluginId}`)
      
      return {
        success: true,
        data: { message: 'Plugin disabled successfully' }
      }

    } catch (error) {
      const appError = handlePluginError(`禁用插件 ${pluginId}`, error)
      logger.error('Plugin disable failed', appError)
      
      return {
        success: false,
        error: new PluginManagementError(
          PluginManagementErrorType.CONFIGURATION_ERROR,
          appError.message,
          appError.details,
          pluginId
        )
      }
    }
  }

  // Helper methods
  private async getInstalledPlugins(): Promise<EnhancedSearchPlugin[]> {
    return pluginManager.getPlugins().map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      enabled: plugin.enabled,
      priority: plugin.priority,
      icon: plugin.icon,
      search: plugin.search,
      metadata: plugin.metadata || {},
      installation: {
        isInstalled: true,
        isBuiltIn: true,
        canUninstall: false,
        status: 'installed'
      },
      permissions: plugin.permissions || [],
      settings: plugin.settings || { schema: [], values: {} }
    }))
  }

  private async getAvailablePlugins(): Promise<any[]> {
    // Mock implementation - in real app, this would fetch from registry
    return []
  }

  private async validatePluginForInstallation(plugin: any): Promise<{ valid: boolean; message?: string }> {
    // Basic validation
    if (!plugin.id || !plugin.name || !plugin.version) {
      return { valid: false, message: 'Plugin missing required fields' }
    }
    
    return { valid: true }
  }

  private async performInstallation(plugin: any, options: PluginInstallationOptions): Promise<PluginOperationResult> {
    // Mock implementation
    await this.simulateAsyncOperation(1000)
    
    return {
      success: true,
      data: { 
        pluginId: plugin.id,
        version: plugin.version,
        installPath: options.installPath || 'default',
        installDate: new Date().toISOString()
      }
    }
  }

  private async performUninstallation(plugin: any, options: PluginUninstallationOptions): Promise<PluginOperationResult> {
    // Mock implementation
    await this.simulateAsyncOperation(500)
    
    return {
      success: true,
      data: { 
        pluginId: plugin.id,
        removedData: options.removeData,
        removedConfig: options.removeConfig
      }
    }
  }

  private async performUpdate(
    currentPlugin: any, 
    newPlugin: any, 
    options: PluginUpdateOptions
  ): Promise<PluginOperationResult> {
    // Mock implementation
    await this.simulateAsyncOperation(1500)
    
    return {
      success: true,
      data: { 
        pluginId: currentPlugin.id,
        fromVersion: currentPlugin.version,
        toVersion: newPlugin.version,
        backupCreated: options.backup
      }
    }
  }

  private async getPluginDependents(pluginId: string): Promise<string[]> {
    // Mock implementation - check which plugins depend on this one
    return []
  }

  private async backupPluginConfiguration(pluginId: string): Promise<void> {
    // Mock implementation
    logger.info(`Backing up configuration for plugin: ${pluginId}`)
  }

  private async clearPluginData(pluginId: string): Promise<void> {
    // Mock implementation
    this.stateStore.resetPluginMetrics(pluginId)
    logger.info(`Cleared data for plugin: ${pluginId}`)
  }

  private async clearPluginConfiguration(pluginId: string): Promise<void> {
    // Mock implementation
    logger.info(`Cleared configuration for plugin: ${pluginId}`)
  }

  private async applyPluginConfiguration(pluginId: string, config: Record<string, any>): Promise<void> {
    // Mock implementation
    logger.info(`Applied configuration for plugin: ${pluginId}`)
  }

  private isCriticalPlugin(pluginId: string): boolean {
    // Define critical plugins that cannot be disabled
    const criticalPlugins = ['core-search', 'system-integration']
    return criticalPlugins.includes(pluginId)
  }

  private async simulateAsyncOperation(delay: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}

// Export singleton instance
export const pluginOperationsService = new PluginOperationsService()