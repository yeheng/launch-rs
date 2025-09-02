/**
 * Main plugin management service - coordinates all plugin management operations
 */

import { pluginManager } from '../../search-plugin-manager'
import { pluginDiscoveryService } from './plugin-discovery'
import { pluginOperationsService } from './plugin-operations'
import { pluginHealthService } from './plugin-health'
import { pluginConfigurationService } from './plugin-configuration'
import { pluginStatisticsManager } from '../plugin-statistics'
import { logger } from '../../logger'
import { handlePluginError } from '../../error-handler'
import type { 
  EnhancedSearchPlugin, 
  PluginCatalogItem, 
  PluginHealthStatus, 
  PluginManagementResult, 
  PluginValidationResult 
} from '../types'
import type { 
  PluginSearchOptions,
  PluginInstallationOptions,
  PluginUninstallationOptions,
  PluginUpdateOptions,
  PluginConfigurationUpdateOptions,
  PluginHealthCheckOptions,
  PluginValidationOptions,
  PluginStatistics,
  PluginPerformanceMetrics,
  PluginUsageAnalytics,
  PluginManagementEvent
} from './interfaces'
import type { PluginManagementError } from './errors'

/**
 * Main plugin management service class
 * Coordinates all plugin management operations
 */
export class PluginManagementService {
  private static instance: PluginManagementService
  private eventHandlers: Map<string, Function[]> = new Map()
  private isInitialized = false

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): PluginManagementService {
    if (!PluginManagementService.instance) {
      PluginManagementService.instance = new PluginManagementService()
    }
    return PluginManagementService.instance
  }

  /**
   * Initialize the plugin management service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Plugin management service already initialized')
      return
    }

    try {
      logger.info('Initializing plugin management service')

      // Initialize all sub-services
      await this.initializeSubServices()

      // Set up event handlers
      this.setupEventHandlers()

      // Perform initial health checks
      await this.performInitialHealthChecks()

      this.isInitialized = true
      logger.info('Plugin management service initialized successfully')

    } catch (error) {
      const appError = handlePluginError('初始化插件管理服务', error)
      logger.error('Failed to initialize plugin management service', appError)
      throw appError
    }
  }

  // Plugin discovery and search methods
  async getInstalledPlugins(): Promise<EnhancedSearchPlugin[]> {
    this.ensureInitialized()
    return pluginDiscoveryService.getInstalledPlugins()
  }

  async getAvailablePlugins(): Promise<PluginCatalogItem[]> {
    this.ensureInitialized()
    return pluginDiscoveryService.getAvailablePlugins()
  }

  async searchPlugins(options: PluginSearchOptions = {}): Promise<EnhancedSearchPlugin[]> {
    this.ensureInitialized()
    return pluginDiscoveryService.searchPlugins(options)
  }

  async getPluginDetails(pluginId: string): Promise<EnhancedSearchPlugin> {
    this.ensureInitialized()
    return pluginDiscoveryService.getPluginDetails(pluginId)
  }

  // Plugin lifecycle management methods
  async installPlugin(
    pluginId: string, 
    options?: PluginInstallationOptions
  ): Promise<{ success: boolean; error?: PluginManagementError; data?: any }> {
    this.ensureInitialized()
    
    const result = await pluginOperationsService.installPlugin(pluginId, options)
    await this.emitEvent('install', pluginId, result)
    
    return result
  }

  async uninstallPlugin(
    pluginId: string, 
    options?: PluginUninstallationOptions
  ): Promise<{ success: boolean; error?: PluginManagementError; data?: any }> {
    this.ensureInitialized()
    
    const result = await pluginOperationsService.uninstallPlugin(pluginId, options)
    await this.emitEvent('uninstall', pluginId, result)
    
    return result
  }

  async updatePlugin(
    pluginId: string, 
    options?: PluginUpdateOptions
  ): Promise<{ success: boolean; error?: PluginManagementError; data?: any }> {
    this.ensureInitialized()
    
    const result = await pluginOperationsService.updatePlugin(pluginId, options)
    await this.emitEvent('update', pluginId, result)
    
    return result
  }

  async enablePlugin(pluginId: string): Promise<{ success: boolean; error?: PluginManagementError; data?: any }> {
    this.ensureInitialized()
    
    const result = await pluginOperationsService.enablePlugin(pluginId)
    await this.emitEvent('enable', pluginId, result)
    
    return result
  }

  async disablePlugin(pluginId: string): Promise<{ success: boolean; error?: PluginManagementError; data?: any }> {
    this.ensureInitialized()
    
    const result = await pluginOperationsService.disablePlugin(pluginId)
    await this.emitEvent('disable', pluginId, result)
    
    return result
  }

  // Plugin configuration methods
  async updatePluginConfiguration(
    pluginId: string, 
    config: PluginConfigurationUpdateOptions
  ): Promise<{ success: boolean; error?: any; data?: any }> {
    this.ensureInitialized()
    
    const result = await pluginConfigurationService.updatePluginConfiguration(pluginId, config)
    await this.emitEvent('configure', pluginId, result)
    
    return result
  }

  async getPluginConfiguration(pluginId: string): Promise<Record<string, any>> {
    this.ensureInitialized()
    return pluginConfigurationService.getPluginConfiguration(pluginId)
  }

  async resetPluginConfiguration(pluginId: string): Promise<{ success: boolean; error?: any; data?: any }> {
    this.ensureInitialized()
    return pluginConfigurationService.resetPluginConfiguration(pluginId)
  }

  async exportPluginConfiguration(pluginId: string): Promise<string> {
    this.ensureInitialized()
    return pluginConfigurationService.exportPluginConfiguration(pluginId)
  }

  async importPluginConfiguration(pluginId: string, configData: string): Promise<{ success: boolean; error?: any; data?: any }> {
    this.ensureInitialized()
    return pluginConfigurationService.importPluginConfiguration(pluginId, configData)
  }

  // Plugin validation and health methods
  async validatePlugin(
    plugin: PluginCatalogItem | string, 
    options?: PluginValidationOptions
  ): Promise<PluginValidationResult> {
    this.ensureInitialized()
    return pluginHealthService.validatePlugin(plugin, options)
  }

  async checkPluginHealth(
    pluginId: string, 
    options?: PluginHealthCheckOptions
  ): Promise<PluginHealthStatus> {
    this.ensureInitialized()
    
    const health = await pluginHealthService.checkPluginHealth(pluginId, options)
    await this.emitEvent('health_check', pluginId, { success: true, data: health })
    
    return health
  }

  async performSystemHealthCheck(): Promise<{
    overall: 'healthy' | 'warning' | 'error'
    plugins: Record<string, PluginHealthStatus>
    summary: {
      total: number
      healthy: number
      warnings: number
      errors: number
    }
  }> {
    this.ensureInitialized()
    return pluginHealthService.performSystemHealthCheck()
  }

  async getHealthRecommendations(pluginId?: string): Promise<Array<{
    pluginId: string
    type: 'fix' | 'optimize' | 'update' | 'disable'
    priority: 'low' | 'medium' | 'high'
    title: string
    description: string
    action: string
  }>> {
    this.ensureInitialized()
    return pluginHealthService.getHealthRecommendations(pluginId)
  }

  // Plugin statistics and analytics methods
  async getPluginStatistics(): Promise<PluginStatistics> {
    this.ensureInitialized()
    return pluginStatisticsManager.getStatistics()
  }

  async getPluginPerformanceMetrics(pluginId: string): Promise<PluginPerformanceMetrics> {
    this.ensureInitialized()
    
    const metrics = pluginStatisticsManager.getUsageTrends()
    return {
      avgResponseTime: metrics.avgSearchTime,
      successRate: 100, // Mock calculation
      errorCount: 0,    // Mock calculation
      requestCount: metrics.totalSearches,
      lastActivity: Date.now(),
      memoryUsage: 0,   // Mock calculation
      cpuUsage: 0      // Mock calculation
    }
  }

  async getPluginUsageAnalytics(pluginId: string): Promise<PluginUsageAnalytics> {
    this.ensureInitialized()
    
    // Mock implementation
    return {
      totalUsage: 0,
      frequency: 0,
      avgDuration: 0,
      peakTimes: [],
      usagePatterns: []
    }
  }

  // Plugin state management methods
  exportPluginState(): any {
    this.ensureInitialized()
    return pluginManager.exportPluginState()
  }

  async importPluginState(state: any): Promise<PluginManagementResult> {
    this.ensureInitialized()
    
    try {
      pluginManager.importPluginState(state)
      return {
        success: true,
        message: 'Plugin state imported successfully'
      }
    } catch (error) {
      const appError = handlePluginError('导入插件状态', error)
      return {
        success: false,
        error: appError
      }
    }
  }

  async resetPluginMetrics(pluginId?: string): Promise<PluginManagementResult> {
    this.ensureInitialized()
    
    try {
      if (pluginId) {
        // Reset specific plugin metrics
        const stateStore = pluginStatisticsManager['stateStore']
        if (stateStore) {
          stateStore.resetPluginMetrics(pluginId)
        }
      } else {
        // Reset all plugin metrics
        // This would require a method in the statistics manager
      }
      
      return {
        success: true,
        message: `Plugin metrics reset for ${pluginId || 'all plugins'}`
      }
    } catch (error) {
      const appError = handlePluginError('重置插件指标', error)
      return {
        success: false,
        error: appError
      }
    }
  }

  // Plugin discovery methods
  async discoverNewPlugins(options?: any): Promise<PluginCatalogItem[]> {
    this.ensureInitialized()
    return pluginDiscoveryService.discoverNewPlugins(options)
  }

  async searchByQuery(query: string, options?: PluginSearchOptions): Promise<Array<EnhancedSearchPlugin & { relevanceScore: number }>> {
    this.ensureInitialized()
    return pluginDiscoveryService.searchByQuery(query, options)
  }

  async getRecommendedPlugins(): Promise<PluginCatalogItem[]> {
    this.ensureInitialized()
    return pluginDiscoveryService.getRecommendedPlugins()
  }

  // Configuration management methods
  async getAllPluginConfigurations(): Promise<Record<string, any>> {
    this.ensureInitialized()
    return pluginConfigurationService.getAllPluginConfigurations()
  }

  async backupAllConfigurations(): Promise<string> {
    this.ensureInitialized()
    return pluginConfigurationService.backupAllConfigurations()
  }

  async restoreConfigurationsFromBackup(backupData: string): Promise<{ success: boolean; error?: any; data?: any }> {
    this.ensureInitialized()
    return pluginConfigurationService.restoreConfigurationsFromBackup(backupData)
  }

  // Event management methods
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // Utility methods
  async clearCache(): Promise<void> {
    this.ensureInitialized()
    pluginDiscoveryService.clearCache()
    logger.info('Plugin management service cache cleared')
  }

  async getServiceStatus(): Promise<{
    initialized: boolean
    pluginCount: number
    enabledPlugins: number
    systemHealth: 'healthy' | 'warning' | 'error'
    lastHealthCheck: number
  }> {
    try {
      const stats = await this.getPluginStatistics()
      const healthCheck = await this.performSystemHealthCheck()
      
      return {
        initialized: this.isInitialized,
        pluginCount: stats.total,
        enabledPlugins: stats.enabled,
        systemHealth: healthCheck.overall,
        lastHealthCheck: Date.now()
      }
    } catch (error) {
      const appError = handlePluginError('获取服务状态', error)
      logger.error('Failed to get service status', appError)
      
      return {
        initialized: this.isInitialized,
        pluginCount: 0,
        enabledPlugins: 0,
        systemHealth: 'error',
        lastHealthCheck: 0
      }
    }
  }

  // Private helper methods
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Plugin management service is not initialized')
    }
  }

  private async initializeSubServices(): Promise<void> {
    // Initialize any sub-services that need initialization
    logger.info('Initializing sub-services')
  }

  private setupEventHandlers(): void {
    logger.info('Setting up event handlers')
    
    // Set up default event handlers for logging
    this.on('install', (pluginId, result) => {
      if (result.success) {
        logger.info(`Plugin installed: ${pluginId}`)
      } else {
        logger.error(`Plugin installation failed: ${pluginId}`, { error: result.error })
      }
    })
    
    this.on('uninstall', (pluginId, result) => {
      if (result.success) {
        logger.info(`Plugin uninstalled: ${pluginId}`)
      } else {
        logger.error(`Plugin uninstallation failed: ${pluginId}`, { error: result.error })
      }
    })
  }

  private async performInitialHealthChecks(): Promise<void> {
    try {
      logger.info('Performing initial health checks')
      
      // Perform system health check
      const healthCheck = await this.performSystemHealthCheck()
      logger.info('Initial health check completed', { 
        overall: healthCheck.overall,
        summary: healthCheck.summary 
      })
      
    } catch (error) {
      const appError = handlePluginError('初始健康检查', error)
      logger.warn('Initial health check failed', appError)
      // Don't throw here - non-critical failure
    }
  }

  private async emitEvent(
    type: PluginManagementEvent['type'],
    pluginId: string,
    result: { success: boolean; error?: any; data?: any }
  ): Promise<void> {
    const event: PluginManagementEvent = {
      type,
      pluginId,
      timestamp: Date.now(),
      data: result.data,
      result: result.success ? 'success' : 'failed',
      error: result.error?.message
    }

    const handlers = this.eventHandlers.get(type)
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(event)
        } catch (error) {
          logger.error(`Event handler failed for ${type}`, { error })
        }
      }
    }
  }
}

// Export singleton instance
export const pluginManagementService = PluginManagementService.getInstance()