import { pluginManager } from '../search-plugin-manager'
import type { SearchPlugin } from '../search-plugins'
import type {
  EnhancedSearchPlugin,
  PluginCatalogItem,
  PluginValidationResult,
  PluginHealthStatus
} from './types'
import {
  PluginCategory,
  PluginHealthLevel,
  PluginPermissionType,
  PluginIssueType
} from './types'
import { PluginValidator, PluginUtils } from './types'
import { usePluginStateStore } from './plugin-state-manager'
import { pluginStatisticsManager } from './plugin-statistics'

/**
 * Plugin management error types
 */
export enum PluginManagementErrorType {
  PLUGIN_NOT_FOUND = 'plugin_not_found',
  INSTALLATION_FAILED = 'installation_failed',
  UNINSTALLATION_FAILED = 'uninstallation_failed',
  UPDATE_FAILED = 'update_failed',
  VALIDATION_FAILED = 'validation_failed',
  PERMISSION_DENIED = 'permission_denied',
  NETWORK_ERROR = 'network_error',
  DEPENDENCY_ERROR = 'dependency_error',
  CONFIGURATION_ERROR = 'configuration_error',
  SECURITY_ERROR = 'security_error'
}

/**
 * Plugin management error class
 */
export class PluginManagementError extends Error {
  constructor(
    public type: PluginManagementErrorType,
    message: string,
    public details?: string,
    public pluginId?: string,
    public recoverable: boolean = true,
    public suggestedAction?: string
  ) {
    super(message)
    this.name = 'PluginManagementError'
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(): string {
    switch (this.type) {
      case PluginManagementErrorType.PLUGIN_NOT_FOUND:
        return `Plugin not found. Please check if the plugin exists and try again.`
      
      case PluginManagementErrorType.INSTALLATION_FAILED:
        return `Failed to install plugin. ${this.suggestedAction || 'Please try again later.'}`
      
      case PluginManagementErrorType.UNINSTALLATION_FAILED:
        return `Failed to uninstall plugin. ${this.suggestedAction || 'Please restart the application and try again.'}`
      
      case PluginManagementErrorType.UPDATE_FAILED:
        return `Failed to update plugin. ${this.suggestedAction || 'Please check your internet connection and try again.'}`
      
      case PluginManagementErrorType.VALIDATION_FAILED:
        return `Plugin validation failed. The plugin may be corrupted or incompatible.`
      
      case PluginManagementErrorType.PERMISSION_DENIED:
        return `Permission denied. Please check if you have the necessary permissions to perform this action.`
      
      case PluginManagementErrorType.NETWORK_ERROR:
        return `Network error occurred. Please check your internet connection and try again.`
      
      case PluginManagementErrorType.DEPENDENCY_ERROR:
        return `Plugin dependency error. Some required dependencies are missing or incompatible.`
      
      case PluginManagementErrorType.CONFIGURATION_ERROR:
        return `Plugin configuration error. Please check the plugin settings and try again.`
      
      case PluginManagementErrorType.SECURITY_ERROR:
        return `Security error. The plugin may pose a security risk and cannot be installed.`
      
      default:
        return this.message
    }
  }
}

/**
 * Plugin search and filter options
 */
export interface PluginSearchOptions {
  /** Search query */
  query?: string
  /** Filter by category */
  category?: PluginCategory
  /** Filter by enabled status */
  enabled?: boolean
  /** Filter by installation status */
  installed?: boolean
  /** Sort by field */
  sortBy?: 'name' | 'category' | 'installDate' | 'lastUpdated' | 'rating' | 'downloadCount'
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
  /** Maximum results */
  limit?: number
  /** Skip results (for pagination) */
  offset?: number
}

/**
 * Plugin operation result
 */
export interface PluginOperationResult {
  /** Whether the operation was successful */
  success: boolean
  /** Error if operation failed */
  error?: PluginManagementError
  /** Additional data */
  data?: any
}

/**
 * Plugin statistics
 */
export interface PluginStatistics {
  /** Total number of plugins */
  total: number
  /** Number of installed plugins */
  installed: number
  /** Number of enabled plugins */
  enabled: number
  /** Number of plugins by category */
  byCategory: Record<PluginCategory, number>
  /** Number of plugins with health issues */
  withIssues: number
}

/**
 * Plugin management service class
 */
export class PluginManagementService {
  private static instance: PluginManagementService
  private mockCatalog: PluginCatalogItem[] = []
  private healthCheckInterval?: NodeJS.Timeout
  private stateStore: ReturnType<typeof usePluginStateStore> | null = null

  private constructor() {
    this.initializeStateStore()
    this.initializeMockCatalog()
    this.startHealthMonitoring()
  }

  /**
   * Initialize state store
   */
  private initializeStateStore(): void {
    try {
      this.stateStore = usePluginStateStore()
    } catch (error) {
      console.warn('State store not available in PluginManagementService:', error)
    }
  }

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
   * Initialize mock catalog for development
   */
  private initializeMockCatalog(): void {
    // This would typically be loaded from a remote catalog
    this.mockCatalog = [
      {
        id: 'weather-plugin',
        name: 'Weather Plugin',
        description: 'Get current weather information and forecasts',
        version: '1.2.0',
        author: 'Weather Team',
        category: PluginCategory.UTILITIES,
        tags: ['weather', 'forecast', 'temperature'],
        downloadUrl: 'https://example.com/plugins/weather-plugin.zip',
        homepage: 'https://example.com/weather-plugin',
        screenshots: [],
        rating: 4.5,
        downloadCount: 15420,
        lastUpdated: new Date('2024-01-15'),
        minAppVersion: '1.0.0',
        permissions: [
          {
            type: PluginPermissionType.NETWORK,
            description: 'Access weather API services',
            required: true
          }
        ],
        fileSize: 2048000,
        featured: true
      },
      {
        id: 'notes-plugin',
        name: 'Quick Notes',
        description: 'Create and search through quick notes',
        version: '2.1.3',
        author: 'Productivity Team',
        category: PluginCategory.PRODUCTIVITY,
        tags: ['notes', 'text', 'search'],
        downloadUrl: 'https://example.com/plugins/notes-plugin.zip',
        screenshots: [],
        rating: 4.8,
        downloadCount: 8932,
        lastUpdated: new Date('2024-02-01'),
        minAppVersion: '1.0.0',
        permissions: [
          {
            type: PluginPermissionType.FILESYSTEM,
            description: 'Save and read note files',
            required: true
          }
        ],
        fileSize: 1536000
      }
    ]
  }

  /**
   * Start health monitoring for plugins
   */
  private startHealthMonitoring(): void {
    // Check plugin health every 5 minutes
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks()
    }, 5 * 60 * 1000)
  }

  /**
   * Perform health checks on all plugins
   */
  private async performHealthChecks(): Promise<void> {
    const plugins = await this.getInstalledPlugins()
    
    for (const plugin of plugins) {
      try {
        await this.checkPluginHealth(plugin.id)
      } catch (error) {
        console.warn(`Health check failed for plugin ${plugin.id}:`, error)
      }
    }
  }

  /**
   * Get all installed plugins as enhanced plugins
   */
  async getInstalledPlugins(): Promise<EnhancedSearchPlugin[]> {
    try {
      const plugins = pluginManager.getPlugins()
      return plugins.map(plugin => this.enhancePlugin(plugin))
    } catch (error) {
      throw new PluginManagementError(
        PluginManagementErrorType.PLUGIN_NOT_FOUND,
        'Failed to retrieve installed plugins',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        true,
        'Please restart the application and try again'
      )
    }
  }

  /**
   * Get available plugins from catalog
   */
  async getAvailablePlugins(): Promise<PluginCatalogItem[]> {
    try {
      // In a real implementation, this would fetch from a remote catalog
      return [...this.mockCatalog]
    } catch (error) {
      throw new PluginManagementError(
        PluginManagementErrorType.NETWORK_ERROR,
        'Failed to retrieve available plugins',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        true,
        'Please check your internet connection and try again'
      )
    }
  }

  /**
   * Search and filter plugins
   */
  async searchPlugins(options: PluginSearchOptions = {}): Promise<EnhancedSearchPlugin[]> {
    try {
      let plugins = await this.getInstalledPlugins()

      // Apply filters
      if (options.query) {
        const query = options.query.toLowerCase()
        plugins = plugins.filter(plugin =>
          plugin.name.toLowerCase().includes(query) ||
          plugin.description.toLowerCase().includes(query) ||
          plugin.metadata.keywords.some(keyword => keyword.toLowerCase().includes(query))
        )
      }

      if (options.category !== undefined) {
        plugins = plugins.filter(plugin => plugin.metadata.category === options.category)
      }

      if (options.enabled !== undefined) {
        plugins = plugins.filter(plugin => plugin.enabled === options.enabled)
      }

      if (options.installed !== undefined) {
        plugins = plugins.filter(plugin => plugin.installation.isInstalled === options.installed)
      }

      // Apply sorting
      if (options.sortBy) {
        plugins.sort((a, b) => {
          let aValue: any, bValue: any

          switch (options.sortBy) {
            case 'name':
              aValue = a.name
              bValue = b.name
              break
            case 'category':
              aValue = a.metadata.category
              bValue = b.metadata.category
              break
            case 'installDate':
              aValue = a.metadata.installDate
              bValue = b.metadata.installDate
              break
            case 'lastUpdated':
              aValue = a.metadata.lastUpdated
              bValue = b.metadata.lastUpdated
              break
            case 'rating':
              aValue = a.metadata.rating || 0
              bValue = b.metadata.rating || 0
              break
            case 'downloadCount':
              aValue = a.metadata.downloadCount || 0
              bValue = b.metadata.downloadCount || 0
              break
            default:
              return 0
          }

          if (aValue < bValue) return options.sortOrder === 'desc' ? 1 : -1
          if (aValue > bValue) return options.sortOrder === 'desc' ? -1 : 1
          return 0
        })
      }

      // Apply pagination
      if (options.offset) {
        plugins = plugins.slice(options.offset)
      }
      if (options.limit) {
        plugins = plugins.slice(0, options.limit)
      }

      return plugins
    } catch (error) {
      throw new PluginManagementError(
        PluginManagementErrorType.PLUGIN_NOT_FOUND,
        'Failed to search plugins',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        true,
        'Please try again with different search criteria'
      )
    }
  }

  /**
   * Get plugin details by ID
   */
  async getPluginDetails(pluginId: string): Promise<EnhancedSearchPlugin> {
    try {
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        throw new PluginManagementError(
          PluginManagementErrorType.PLUGIN_NOT_FOUND,
          `Plugin with ID '${pluginId}' not found`,
          undefined,
          pluginId,
          false,
          'Please check the plugin ID and try again'
        )
      }

      return this.enhancePlugin(plugin)
    } catch (error) {
      if (error instanceof PluginManagementError) {
        throw error
      }
      throw new PluginManagementError(
        PluginManagementErrorType.PLUGIN_NOT_FOUND,
        'Failed to get plugin details',
        error instanceof Error ? error.message : 'Unknown error',
        pluginId,
        true,
        'Please try again later'
      )
    }
  }

  /**
   * Install a plugin
   */
  async installPlugin(pluginId: string): Promise<PluginOperationResult> {
    try {
      // Find plugin in catalog
      const catalogItem = this.mockCatalog.find(item => item.id === pluginId)
      if (!catalogItem) {
        throw new PluginManagementError(
          PluginManagementErrorType.PLUGIN_NOT_FOUND,
          `Plugin '${pluginId}' not found in catalog`,
          undefined,
          pluginId,
          false,
          'Please check the plugin ID and try again'
        )
      }

      // Validate plugin before installation
      const validationResult = await this.validatePlugin(catalogItem)
      if (!validationResult.isValid) {
        throw new PluginManagementError(
          PluginManagementErrorType.VALIDATION_FAILED,
          'Plugin validation failed',
          validationResult.errors.map(e => e.message).join(', '),
          pluginId,
          false,
          'Please contact the plugin author for support'
        )
      }

      // Check security assessment
      if (validationResult.security.level === 'dangerous') {
        throw new PluginManagementError(
          PluginManagementErrorType.SECURITY_ERROR,
          'Plugin poses security risks',
          validationResult.security.issues.map(i => i.description).join(', '),
          pluginId,
          false,
          'Please verify the plugin source and try again'
        )
      }

      // Simulate installation process
      await this.simulateAsyncOperation(2000) // 2 second delay

      // In a real implementation, this would:
      // 1. Download the plugin package
      // 2. Validate the package integrity
      // 3. Extract and install files
      // 4. Register the plugin with the manager
      // 5. Update installation status

      return {
        success: true,
        data: {
          pluginId,
          message: 'Plugin installed successfully'
        }
      }
    } catch (error) {
      const pluginError = error instanceof PluginManagementError 
        ? error 
        : new PluginManagementError(
            PluginManagementErrorType.INSTALLATION_FAILED,
            'Plugin installation failed',
            error instanceof Error ? error.message : 'Unknown error',
            pluginId,
            true,
            'Please try again later'
          )

      return {
        success: false,
        error: pluginError
      }
    }
  }

  /**
   * Uninstall a plugin with comprehensive cleanup
   */
  async uninstallPlugin(pluginId: string): Promise<PluginOperationResult> {
    try {
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        throw new PluginManagementError(
          PluginManagementErrorType.PLUGIN_NOT_FOUND,
          `Plugin '${pluginId}' not found`,
          undefined,
          pluginId,
          false,
          'Plugin may have already been uninstalled'
        )
      }

      const enhancedPlugin = this.enhancePlugin(plugin)
      
      // Check if plugin can be uninstalled
      if (!enhancedPlugin.installation.canUninstall) {
        throw new PluginManagementError(
          PluginManagementErrorType.PERMISSION_DENIED,
          'Plugin cannot be uninstalled',
          'This is a built-in plugin that cannot be removed',
          pluginId,
          false,
          'You can disable the plugin instead'
        )
      }

      // Check for dependent plugins
      const dependents = await this.getPluginDependents(pluginId)
      if (dependents.length > 0) {
        throw new PluginManagementError(
          PluginManagementErrorType.DEPENDENCY_ERROR,
          'Plugin has dependencies',
          `The following plugins depend on this plugin: ${dependents.join(', ')}`,
          pluginId,
          true,
          'Disable or uninstall dependent plugins first'
        )
      }

      // Step 1: Disable plugin first if it's enabled
      if (plugin.enabled) {
        console.log(`Disabling plugin ${pluginId} before uninstallation...`)
        const disableResult = await this.disablePlugin(pluginId)
        if (!disableResult.success) {
          throw new PluginManagementError(
            PluginManagementErrorType.UNINSTALLATION_FAILED,
            'Failed to disable plugin before uninstallation',
            disableResult.error?.message,
            pluginId,
            true,
            'Please disable the plugin manually and try again'
          )
        }
      }

      // Step 2: Perform cleanup operations
      await this.performPluginCleanup(pluginId, enhancedPlugin)

      // Step 3: Simulate uninstallation process
      await this.simulateAsyncOperation(1500) // 1.5 second delay

      // Step 4: Unregister from plugin manager
      await pluginManager.unregister(pluginId)

      console.log(`Plugin ${pluginId} uninstalled successfully`)

      return {
        success: true,
        data: {
          pluginId,
          message: 'Plugin uninstalled successfully',
          cleanupDetails: {
            filesRemoved: true,
            configurationCleared: true,
            dependenciesResolved: true
          }
        }
      }
    } catch (error) {
      const pluginError = error instanceof PluginManagementError 
        ? error 
        : new PluginManagementError(
            PluginManagementErrorType.UNINSTALLATION_FAILED,
            'Plugin uninstallation failed',
            error instanceof Error ? error.message : 'Unknown error',
            pluginId,
            true,
            'Please restart the application and try again'
          )

      return {
        success: false,
        error: pluginError
      }
    }
  }

  /**
   * Get plugins that depend on the specified plugin
   */
  private async getPluginDependents(pluginId: string): Promise<string[]> {
    try {
      const allPlugins = await this.getInstalledPlugins()
      const dependents: string[] = []

      for (const plugin of allPlugins) {
        if (plugin.metadata.dependencies.includes(pluginId)) {
          dependents.push(plugin.name)
        }
      }

      return dependents
    } catch (error) {
      console.warn(`Failed to check plugin dependents for ${pluginId}:`, error)
      return []
    }
  }

  /**
   * Perform comprehensive plugin cleanup
   */
  private async performPluginCleanup(pluginId: string, plugin: EnhancedSearchPlugin): Promise<void> {
    console.log(`Starting cleanup for plugin ${pluginId}...`)

    try {
      // Step 1: Clear plugin configuration and settings
      await this.clearPluginConfiguration(pluginId)

      // Step 2: Remove plugin files (simulated)
      await this.removePluginFiles(pluginId, plugin.installation.installPath)

      // Step 3: Clear plugin cache and temporary data
      await this.clearPluginCache(pluginId)

      // Step 4: Remove plugin from search indexes
      await this.removeFromSearchIndexes(pluginId)

      // Step 5: Clean up plugin-specific user data
      await this.cleanupPluginUserData(pluginId)

      // Step 6: Update plugin registry
      await this.updatePluginRegistry(pluginId, 'uninstalled')

      console.log(`Cleanup completed for plugin ${pluginId}`)
    } catch (error) {
      console.error(`Cleanup failed for plugin ${pluginId}:`, error)
      throw new PluginManagementError(
        PluginManagementErrorType.UNINSTALLATION_FAILED,
        'Plugin cleanup failed',
        error instanceof Error ? error.message : 'Unknown error',
        pluginId,
        true,
        'Some plugin data may remain on the system'
      )
    }
  }

  /**
   * Clear plugin configuration and settings
   */
  private async clearPluginConfiguration(pluginId: string): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Remove plugin settings from configuration files
      // 2. Clear plugin preferences from user settings
      // 3. Remove plugin-specific configuration entries
      
      console.log(`Clearing configuration for plugin ${pluginId}`)
      await this.simulateAsyncOperation(200)
    } catch (error) {
      console.warn(`Failed to clear configuration for plugin ${pluginId}:`, error)
    }
  }

  /**
   * Remove plugin files from the file system
   */
  private async removePluginFiles(pluginId: string, installPath?: string): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Remove plugin directory and all files
      // 2. Remove plugin assets and resources
      // 3. Clean up any temporary files created by the plugin
      
      console.log(`Removing files for plugin ${pluginId} from ${installPath || 'default location'}`)
      await this.simulateAsyncOperation(300)
    } catch (error) {
      console.warn(`Failed to remove files for plugin ${pluginId}:`, error)
    }
  }

  /**
   * Clear plugin cache and temporary data
   */
  private async clearPluginCache(pluginId: string): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Clear plugin-specific cache entries
      // 2. Remove temporary files and data
      // 3. Clear plugin search results cache
      
      console.log(`Clearing cache for plugin ${pluginId}`)
      await this.simulateAsyncOperation(100)
    } catch (error) {
      console.warn(`Failed to clear cache for plugin ${pluginId}:`, error)
    }
  }

  /**
   * Remove plugin from search indexes
   */
  private async removeFromSearchIndexes(pluginId: string): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Remove plugin from search indexes
      // 2. Update search result rankings
      // 3. Clear plugin-specific search data
      
      console.log(`Removing plugin ${pluginId} from search indexes`)
      await this.simulateAsyncOperation(150)
    } catch (error) {
      console.warn(`Failed to remove plugin ${pluginId} from search indexes:`, error)
    }
  }

  /**
   * Clean up plugin-specific user data
   */
  private async cleanupPluginUserData(pluginId: string): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Remove plugin-created user files
      // 2. Clear plugin-specific databases
      // 3. Remove plugin bookmarks and favorites
      
      console.log(`Cleaning up user data for plugin ${pluginId}`)
      await this.simulateAsyncOperation(250)
    } catch (error) {
      console.warn(`Failed to cleanup user data for plugin ${pluginId}:`, error)
    }
  }

  /**
   * Update plugin registry with new status
   */
  private async updatePluginRegistry(pluginId: string, status: string): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Update plugin registry database
      // 2. Mark plugin as uninstalled
      // 3. Update plugin statistics
      
      console.log(`Updating registry for plugin ${pluginId} with status: ${status}`)
      await this.simulateAsyncOperation(100)
    } catch (error) {
      console.warn(`Failed to update registry for plugin ${pluginId}:`, error)
    }
  }

  /**
   * Update a plugin
   */
  async updatePlugin(pluginId: string): Promise<PluginOperationResult> {
    try {
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        throw new PluginManagementError(
          PluginManagementErrorType.PLUGIN_NOT_FOUND,
          `Plugin '${pluginId}' not found`,
          undefined,
          pluginId,
          false,
          'Plugin may have been uninstalled'
        )
      }

      // Find latest version in catalog
      const catalogItem = this.mockCatalog.find(item => item.id === pluginId)
      if (!catalogItem) {
        throw new PluginManagementError(
          PluginManagementErrorType.PLUGIN_NOT_FOUND,
          `Plugin '${pluginId}' not found in catalog`,
          undefined,
          pluginId,
          false,
          'Plugin may no longer be available'
        )
      }

      // Check if update is needed
      if (plugin.version === catalogItem.version) {
        return {
          success: true,
          data: {
            pluginId,
            message: 'Plugin is already up to date'
          }
        }
      }

      // Validate new version
      const validationResult = await this.validatePlugin(catalogItem)
      if (!validationResult.isValid) {
        throw new PluginManagementError(
          PluginManagementErrorType.VALIDATION_FAILED,
          'Plugin update validation failed',
          validationResult.errors.map(e => e.message).join(', '),
          pluginId,
          false,
          'Please contact the plugin author for support'
        )
      }

      // Simulate update process
      await this.simulateAsyncOperation(3000) // 3 second delay

      // In a real implementation, this would:
      // 1. Download the new version
      // 2. Backup current version
      // 3. Stop the current plugin
      // 4. Replace plugin files
      // 5. Restart the plugin
      // 6. Verify the update

      return {
        success: true,
        data: {
          pluginId,
          oldVersion: plugin.version,
          newVersion: catalogItem.version,
          message: 'Plugin updated successfully'
        }
      }
    } catch (error) {
      const pluginError = error instanceof PluginManagementError 
        ? error 
        : new PluginManagementError(
            PluginManagementErrorType.UPDATE_FAILED,
            'Plugin update failed',
            error instanceof Error ? error.message : 'Unknown error',
            pluginId,
            true,
            'Please check your internet connection and try again'
          )

      return {
        success: false,
        error: pluginError
      }
    }
  }

  /**
   * Validate a plugin
   */
  async validatePlugin(plugin: PluginCatalogItem | string): Promise<PluginValidationResult> {
    try {
      if (typeof plugin === 'string') {
        // Validate by plugin path
        return await PluginValidator.validatePlugin(plugin)
      } else {
        // Validate catalog item permissions
        return PluginValidator.validatePermissions(plugin.permissions)
      }
    } catch (error) {
      throw new PluginManagementError(
        PluginManagementErrorType.VALIDATION_FAILED,
        'Plugin validation failed',
        error instanceof Error ? error.message : 'Unknown error',
        typeof plugin === 'string' ? undefined : plugin.id,
        true,
        'Please try again or contact support'
      )
    }
  }

  /**
   * Check plugin health
   */
  async checkPluginHealth(pluginId: string): Promise<PluginHealthStatus> {
    try {
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        throw new PluginManagementError(
          PluginManagementErrorType.PLUGIN_NOT_FOUND,
          `Plugin '${pluginId}' not found`,
          undefined,
          pluginId
        )
      }

      // Simulate health check
      const healthStatus: PluginHealthStatus = {
        status: plugin.enabled ? PluginHealthLevel.HEALTHY : PluginHealthLevel.WARNING,
        lastCheck: new Date(),
        issues: [],
        metrics: {
          avgSearchTime: Math.random() * 100,
          memoryUsage: Math.random() * 1024 * 1024,
          cpuUsage: Math.random() * 10,
          errorCount: Math.floor(Math.random() * 5),
          successRate: 95 + Math.random() * 5
        }
      }

      // Add issues based on status
      if (!plugin.enabled) {
        healthStatus.issues.push({
          type: PluginIssueType.CONFIGURATION,
          message: 'Plugin is disabled',
          severity: 'low',
          suggestedFix: 'Enable the plugin to restore functionality'
        })
      }

      return healthStatus
    } catch (error) {
      if (error instanceof PluginManagementError) {
        throw error
      }
      throw new PluginManagementError(
        PluginManagementErrorType.PLUGIN_NOT_FOUND,
        'Failed to check plugin health',
        error instanceof Error ? error.message : 'Unknown error',
        pluginId
      )
    }
  }

  /**
   * Get plugin statistics
   */
  async getPluginStatistics(): Promise<PluginStatistics> {
    try {
      const plugins = await this.getInstalledPlugins()
      
      const stats: PluginStatistics = {
        total: plugins.length,
        installed: plugins.filter(p => p.installation.isInstalled).length,
        enabled: plugins.filter(p => p.enabled).length,
        byCategory: {} as Record<PluginCategory, number>,
        withIssues: 0
      }

      // Initialize category counts
      Object.values(PluginCategory).forEach(category => {
        stats.byCategory[category] = 0
      })

      // Count by category and health issues
      for (const plugin of plugins) {
        stats.byCategory[plugin.metadata.category]++
        
        if (plugin.health && plugin.health.issues.length > 0) {
          stats.withIssues++
        }
      }

      return stats
    } catch (error) {
      throw new PluginManagementError(
        PluginManagementErrorType.PLUGIN_NOT_FOUND,
        'Failed to get plugin statistics',
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        true,
        'Please try again later'
      )
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<PluginOperationResult> {
    try {
      await pluginManager.enablePlugin(pluginId)
      return {
        success: true,
        data: {
          pluginId,
          message: 'Plugin enabled successfully'
        }
      }
    } catch (error) {
      const pluginError = new PluginManagementError(
        PluginManagementErrorType.CONFIGURATION_ERROR,
        'Failed to enable plugin',
        error instanceof Error ? error.message : 'Unknown error',
        pluginId,
        true,
        'Please check plugin configuration and try again'
      )

      return {
        success: false,
        error: pluginError
      }
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<PluginOperationResult> {
    try {
      await pluginManager.disablePlugin(pluginId)
      return {
        success: true,
        data: {
          pluginId,
          message: 'Plugin disabled successfully'
        }
      }
    } catch (error) {
      const pluginError = new PluginManagementError(
        PluginManagementErrorType.CONFIGURATION_ERROR,
        'Failed to disable plugin',
        error instanceof Error ? error.message : 'Unknown error',
        pluginId,
        true,
        'Please try again later'
      )

      return {
        success: false,
        error: pluginError
      }
    }
  }

  /**
   * Enhance a basic SearchPlugin with additional metadata
   */
  private enhancePlugin(plugin: SearchPlugin): EnhancedSearchPlugin {
    const enhanced = PluginUtils.enhancePlugin(plugin)
    
    // Add health status
    enhanced.health = {
      status: plugin.enabled ? PluginHealthLevel.HEALTHY : PluginHealthLevel.WARNING,
      lastCheck: new Date(),
      issues: plugin.enabled ? [] : [{
        type: PluginIssueType.CONFIGURATION,
        message: 'Plugin is disabled',
        severity: 'low' as const,
        suggestedFix: 'Enable the plugin to restore functionality'
      }]
    }

    return enhanced
  }

  /**
   * Get plugin configuration
   */
  getPluginConfiguration(pluginId: string): Record<string, any> {
    if (!this.stateStore) {
      return {}
    }
    return this.stateStore.getPluginConfig(pluginId)
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfiguration(
    pluginId: string, 
    config: Record<string, any>
  ): Promise<PluginManagementResult> {
    try {
      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        throw new PluginManagementError(
          PluginManagementErrorType.PLUGIN_NOT_FOUND,
          `Plugin ${pluginId} not found`,
          undefined,
          pluginId,
          false,
          'Please check the plugin ID and try again'
        )
      }

      // Validate configuration if plugin has schema
      if (plugin.settings?.schema) {
        const validationResult = PluginValidator.validateConfiguration(config, plugin.settings.schema)
        if (!validationResult.isValid) {
          throw new PluginManagementError(
            PluginManagementErrorType.CONFIGURATION_ERROR,
            'Plugin configuration validation failed',
            validationResult.errors.map(e => e.message).join(', '),
            pluginId,
            true,
            'Please check the configuration values and try again'
          )
        }
      }

      // Update configuration in plugin manager
      pluginManager.setPluginConfig(pluginId, config)

      return {
        success: true,
        pluginId,
        message: 'Plugin configuration updated successfully'
      }
    } catch (error) {
      const pluginError = error instanceof PluginManagementError 
        ? error 
        : new PluginManagementError(
            PluginManagementErrorType.CONFIGURATION_ERROR,
            'Failed to update plugin configuration',
            error instanceof Error ? error.message : 'Unknown error',
            pluginId,
            true,
            'Please try again later'
          )

      return {
        success: false,
        error: pluginError
      }
    }
  }

  /**
   * Get plugin statistics
   */
  getPluginStatistics() {
    return pluginStatisticsManager.getStatistics()
  }

  /**
   * Get plugin usage metrics
   */
  getPluginMetrics(pluginId: string) {
    return pluginStatisticsManager.getUsageTrends()
  }

  /**
   * Get plugin health summary
   */
  getPluginHealthSummary() {
    return pluginStatisticsManager.getHealthSummary()
  }

  /**
   * Get plugin recommendations
   */
  getPluginRecommendations() {
    return pluginStatisticsManager.getRecommendations()
  }

  /**
   * Export plugin state
   */
  exportPluginState() {
    return pluginManager.exportPluginState()
  }

  /**
   * Import plugin state
   */
  async importPluginState(state: any): Promise<PluginManagementResult> {
    try {
      pluginManager.importPluginState(state)
      
      return {
        success: true,
        message: 'Plugin state imported successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: new PluginManagementError(
          PluginManagementErrorType.CONFIGURATION_ERROR,
          'Failed to import plugin state',
          error instanceof Error ? error.message : 'Unknown error',
          undefined,
          true,
          'Please check the state data and try again'
        )
      }
    }
  }

  /**
   * Reset plugin metrics
   */
  async resetPluginMetrics(pluginId?: string): Promise<PluginManagementResult> {
    try {
      if (pluginId) {
        pluginManager.resetPluginMetrics(pluginId)
      } else {
        pluginManager.resetAllMetrics()
      }

      return {
        success: true,
        pluginId,
        message: pluginId 
          ? `Metrics reset for plugin ${pluginId}` 
          : 'All plugin metrics reset successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: new PluginManagementError(
          PluginManagementErrorType.CONFIGURATION_ERROR,
          'Failed to reset plugin metrics',
          error instanceof Error ? error.message : 'Unknown error',
          pluginId,
          true,
          'Please try again later'
        )
      }
    }
  }

  /**
   * Get plugin enabled state
   */
  isPluginEnabled(pluginId: string): boolean {
    if (!this.stateStore) {
      const plugin = pluginManager.getPlugin(pluginId)
      return plugin?.enabled ?? false
    }
    return this.stateStore.isPluginEnabled(pluginId)
  }

  /**
   * Set plugin enabled state
   */
  async setPluginEnabled(pluginId: string, enabled: boolean): Promise<PluginManagementResult> {
    try {
      if (enabled) {
        await pluginManager.enablePlugin(pluginId)
      } else {
        await pluginManager.disablePlugin(pluginId)
      }

      return {
        success: true,
        pluginId,
        message: `Plugin ${enabled ? 'enabled' : 'disabled'} successfully`
      }
    } catch (error) {
      return {
        success: false,
        error: new PluginManagementError(
          PluginManagementErrorType.CONFIGURATION_ERROR,
          `Failed to ${enabled ? 'enable' : 'disable'} plugin`,
          error instanceof Error ? error.message : 'Unknown error',
          pluginId,
          true,
          'Please try again later'
        )
      }
    }
  }

  /**
   * Simulate async operation with delay
   */
  private async simulateAsyncOperation(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = undefined
    }
  }
}

// Export singleton instance
export const pluginManagementService = PluginManagementService.getInstance()