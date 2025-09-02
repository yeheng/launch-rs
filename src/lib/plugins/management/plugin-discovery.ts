/**
 * Plugin discovery and search functionality
 */

import { pluginManager } from '../../search-plugin-manager'
import { pluginLazyLoader } from '../lazy-loader'
import { performanceMonitor } from '../performance-monitor'
import { logger } from '../../logger'
import { handlePluginError } from '../../error-handler'
import type { EnhancedSearchPlugin, PluginCatalogItem } from '../types'
import type { PluginSearchOptions, PluginDiscoveryOptions } from './interfaces'
import { PluginManagementErrorType, PluginErrors } from './errors'

/**
 * Plugin discovery service
 */
export class PluginDiscoveryService {
  private pluginCache = new Map<string, EnhancedSearchPlugin>()
  private catalogCache = new Map<string, PluginCatalogItem[]>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get all installed plugins
   */
  async getInstalledPlugins(): Promise<EnhancedSearchPlugin[]> {
    try {
      return performanceMonitor.measureAsync('get-installed-plugins', async () => {
        const plugins = pluginManager.getPlugins()
        
        return plugins.map(plugin => this.enhancePlugin(plugin))
      })
    } catch (error) {
      const appError = handlePluginError('获取已安装插件', error)
      logger.error('Failed to get installed plugins', appError)
      throw appError
    }
  }

  /**
   * Get available plugins from catalog
   */
  async getAvailablePlugins(options: PluginDiscoveryOptions = {}): Promise<PluginCatalogItem[]> {
    try {
      const cacheKey = JSON.stringify(options)
      
      // Check cache first
      if (this.catalogCache.has(cacheKey)) {
        const cached = this.catalogCache.get(cacheKey)!
        if (Date.now() - cached.timestamp < this.CACHE_TTL) {
          return cached.data
        }
      }

      return performanceMonitor.measureAsync('get-available-plugins', async () => {
        const plugins = await this.fetchPluginsFromSources(options)
        
        // Cache the results
        this.catalogCache.set(cacheKey, {
          data: plugins,
          timestamp: Date.now()
        })
        
        return plugins
      })
    } catch (error) {
      const appError = handlePluginError('获取可用插件', error)
      logger.error('Failed to get available plugins', appError)
      throw appError
    }
  }

  /**
   * Search plugins with various filters and sorting
   */
  async searchPlugins(options: PluginSearchOptions = {}): Promise<EnhancedSearchPlugin[]> {
    try {
      return performanceMonitor.measureAsync('search-plugins', async () => {
        // Get all plugins (installed + available)
        const [installedPlugins, availablePlugins] = await Promise.all([
          this.getInstalledPlugins(),
          this.getAvailablePlugins()
        ])

        // Combine and deduplicate plugins
        const allPlugins = new Map<string, EnhancedSearchPlugin>()
        
        // Add installed plugins first
        installedPlugins.forEach(plugin => {
          allPlugins.set(plugin.id, plugin)
        })
        
        // Add available plugins (only if not already installed)
        availablePlugins.forEach(availablePlugin => {
          if (!allPlugins.has(availablePlugin.id)) {
            allPlugins.set(availablePlugin.id, this.convertCatalogToEnhanced(availablePlugin))
          }
        })

        let results = Array.from(allPlugins.values())

        // Apply filters
        results = this.applyFilters(results, options)

        // Apply sorting
        results = this.applySorting(results, options)

        // Apply pagination
        results = this.applyPagination(results, options)

        return results
      })
    } catch (error) {
      const appError = handlePluginError('搜索插件', error)
      logger.error('Failed to search plugins', appError)
      throw appError
    }
  }

  /**
   * Get plugin details with enhanced information
   */
  async getPluginDetails(pluginId: string): Promise<EnhancedSearchPlugin> {
    try {
      // Check if plugin is already cached
      if (this.pluginCache.has(pluginId)) {
        const cached = this.pluginCache.get(pluginId)!
        if (Date.now() - cached.lastUpdated < this.CACHE_TTL) {
          return cached
        }
      }

      return performanceMonitor.measureAsync(`get-plugin-details-${pluginId}`, async () => {
        // Try to get from installed plugins first
        const installedPlugin = pluginManager.getPlugin(pluginId)
        if (installedPlugin) {
          const enhanced = this.enhancePlugin(installedPlugin)
          this.pluginCache.set(pluginId, enhanced)
          return enhanced
        }

        // Try to get from available plugins
        const availablePlugins = await this.getAvailablePlugins()
        const availablePlugin = availablePlugins.find(p => p.id === pluginId)
        
        if (availablePlugin) {
          const enhanced = this.convertCatalogToEnhanced(availablePlugin)
          this.pluginCache.set(pluginId, enhanced)
          return enhanced
        }

        // Use lazy loader for detailed information
        const lazyLoaded = await pluginLazyLoader.loadPluginDetails(pluginId)
        if (lazyLoaded) {
          this.pluginCache.set(pluginId, lazyLoaded)
          return lazyLoaded
        }

        throw PluginErrors.pluginNotFound(pluginId)
      })
    } catch (error) {
      if (error instanceof PluginErrors.pluginNotFound(pluginId).constructor) {
        throw error
      }
      
      const appError = handlePluginError(`获取插件详情 ${pluginId}`, error)
      logger.error('Failed to get plugin details', appError)
      throw new PluginManagementErrorType.PLUGIN_NOT_FOUND(
        PluginManagementErrorType.PLUGIN_NOT_FOUND,
        appError.message,
        appError.details,
        pluginId
      )
    }
  }

  /**
   * Discover new plugins from various sources
   */
  async discoverNewPlugins(options: PluginDiscoveryOptions = {}): Promise<PluginCatalogItem[]> {
    try {
      logger.info('Discovering new plugins...', { options })
      
      // Get currently installed plugins to exclude them
      const installedPlugins = await this.getInstalledPlugins()
      const installedIds = new Set(installedPlugins.map(p => p.id))
      
      // Get available plugins
      const availablePlugins = await this.getAvailablePlugins(options)
      
      // Filter out already installed plugins
      const newPlugins = availablePlugins.filter(plugin => !installedIds.has(plugin.id))
      
      logger.info(`Found ${newPlugins.length} new plugins`)
      return newPlugins
      
    } catch (error) {
      const appError = handlePluginError('发现新插件', error)
      logger.error('Failed to discover new plugins', appError)
      throw appError
    }
  }

  /**
   * Search for plugins by query with relevance scoring
   */
  async searchByQuery(query: string, options: PluginSearchOptions = {}): Promise<Array<EnhancedSearchPlugin & { relevanceScore: number }>> {
    try {
      const allPlugins = await this.searchPlugins({ ...options, query: '' })
      
      if (!query.trim()) {
        return allPlugins.map(plugin => ({ ...plugin, relevanceScore: 1 }))
      }

      const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 0)
      
      return allPlugins
        .map(plugin => {
          const score = this.calculateRelevanceScore(plugin, queryTerms)
          return { ...plugin, relevanceScore: score }
        })
        .filter(plugin => plugin.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        
    } catch (error) {
      const appError = handlePluginError('按查询搜索插件', error)
      logger.error('Failed to search plugins by query', appError)
      throw appError
    }
  }

  /**
   * Get recommended plugins based on usage patterns
   */
  async getRecommendedPlugins(): Promise<PluginCatalogItem[]> {
    try {
      // Mock implementation - in real app, this would use ML algorithms
      const availablePlugins = await this.getAvailablePlugins()
      
      // Simple recommendation based on ratings and download counts
      return availablePlugins
        .filter(plugin => plugin.rating >= 4.0)
        .sort((a, b) => {
          // Sort by rating first, then by download count
          if (a.rating !== b.rating) {
            return b.rating - a.rating
          }
          return (b.downloadCount || 0) - (a.downloadCount || 0)
        })
        .slice(0, 10) // Top 10 recommendations
        
    } catch (error) {
      const appError = handlePluginError('获取推荐插件', error)
      logger.error('Failed to get recommended plugins', appError)
      throw appError
    }
  }

  /**
   * Clear plugin cache
   */
  clearCache(): void {
    this.pluginCache.clear()
    this.catalogCache.clear()
    logger.info('Plugin discovery cache cleared')
  }

  // Private helper methods
  private enhancePlugin(plugin: any): EnhancedSearchPlugin {
    return {
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      enabled: plugin.enabled,
      priority: plugin.priority,
      icon: plugin.icon,
      search: plugin.search,
      metadata: {
        author: plugin.metadata?.author || 'Unknown',
        license: plugin.metadata?.license || 'Unknown',
        keywords: plugin.metadata?.keywords || [],
        installDate: plugin.metadata?.installDate || new Date(),
        lastUpdated: plugin.metadata?.lastUpdated || new Date(),
        fileSize: plugin.metadata?.fileSize || 0,
        dependencies: plugin.metadata?.dependencies || [],
        category: plugin.metadata?.category || 'utilities'
      },
      installation: {
        isInstalled: true,
        isBuiltIn: true,
        canUninstall: false,
        status: 'installed'
      },
      permissions: plugin.permissions || [],
      settings: plugin.settings || { schema: [], values: {} },
      health: plugin.health,
      lastUpdated: Date.now()
    }
  }

  private convertCatalogToEnhanced(catalogItem: PluginCatalogItem): EnhancedSearchPlugin {
    return {
      id: catalogItem.id,
      name: catalogItem.name,
      description: catalogItem.description,
      version: catalogItem.version,
      enabled: false,
      priority: catalogItem.priority || 50,
      icon: catalogItem.icon,
      search: async () => [], // Mock search function
      metadata: {
        author: catalogItem.author,
        license: catalogItem.license,
        keywords: catalogItem.keywords,
        installDate: new Date(),
        lastUpdated: catalogItem.lastUpdated,
        fileSize: catalogItem.fileSize,
        dependencies: catalogItem.dependencies,
        category: catalogItem.category
      },
      installation: {
        isInstalled: false,
        isBuiltIn: false,
        canUninstall: true,
        status: 'available'
      },
      permissions: catalogItem.permissions || [],
      settings: { schema: [], values: {} },
      health: {
        status: 'healthy',
        lastCheck: Date.now(),
        issues: []
      },
      lastUpdated: Date.now()
    }
  }

  private async fetchPluginsFromSources(options: PluginDiscoveryOptions): Promise<PluginCatalogItem[]> {
    // Mock implementation - in real app, this would fetch from multiple sources
    const mockPlugins: PluginCatalogItem[] = [
      {
        id: 'sample-plugin-1',
        name: 'Sample Plugin 1',
        description: 'A sample plugin for testing',
        version: '1.0.0',
        author: 'Test Author',
        license: 'MIT',
        category: 'utilities' as any,
        keywords: ['sample', 'test'],
        fileSize: 1024 * 1024,
        dependencies: [],
        permissions: [],
        rating: 4.5,
        downloadCount: 1000,
        lastUpdated: new Date()
      }
    ]
    
    return mockPlugins
  }

  private applyFilters(plugins: EnhancedSearchPlugin[], options: PluginSearchOptions): EnhancedSearchPlugin[] {
    let filtered = plugins

    if (options.category) {
      filtered = filtered.filter(p => p.metadata.category === options.category)
    }

    if (options.enabled !== undefined) {
      filtered = filtered.filter(p => p.enabled === options.enabled)
    }

    if (options.installed !== undefined) {
      filtered = filtered.filter(p => 
        options.installed ? p.installation.isInstalled : !p.installation.isInstalled
      )
    }

    if (options.query) {
      const query = options.query.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.metadata.keywords.some(k => k.toLowerCase().includes(query))
      )
    }

    return filtered
  }

  private applySorting(plugins: EnhancedSearchPlugin[], options: PluginSearchOptions): EnhancedSearchPlugin[] {
    if (!options.sortBy) {
      return plugins
    }

    const sortOrder = options.sortOrder === 'desc' ? -1 : 1

    return [...plugins].sort((a, b) => {
      switch (options.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name) * sortOrder
        case 'category':
          return a.metadata.category.localeCompare(b.metadata.category) * sortOrder
        case 'installDate':
          return (a.metadata.installDate.getTime() - b.metadata.installDate.getTime()) * sortOrder
        case 'lastUpdated':
          return (a.lastUpdated - b.lastUpdated) * sortOrder
        case 'rating':
          return ((b.health?.rating || 0) - (a.health?.rating || 0)) * sortOrder
        case 'downloadCount':
          return ((b.installation.downloadCount || 0) - (a.installation.downloadCount || 0)) * sortOrder
        default:
          return 0
      }
    })
  }

  private applyPagination(plugins: EnhancedSearchPlugin[], options: PluginSearchOptions): EnhancedSearchPlugin[] {
    if (!options.limit && !options.offset) {
      return plugins
    }

    const start = options.offset || 0
    const end = options.limit ? start + options.limit : plugins.length
    
    return plugins.slice(start, end)
  }

  private calculateRelevanceScore(plugin: EnhancedSearchPlugin, queryTerms: string[]): number {
    let score = 0
    
    const searchText = `${plugin.name} ${plugin.description} ${plugin.metadata.keywords.join(' ')}`.toLowerCase()
    
    queryTerms.forEach(term => {
      // Exact match in name gets highest score
      if (plugin.name.toLowerCase().includes(term)) {
        score += 10
      }
      
      // Match in description gets medium score
      if (plugin.description.toLowerCase().includes(term)) {
        score += 5
      }
      
      // Match in keywords gets lower score
      if (plugin.metadata.keywords.some(k => k.toLowerCase().includes(term))) {
        score += 2
      }
      
      // Count occurrences in full text
      const occurrences = (searchText.match(new RegExp(term, 'g')) || []).length
      score += occurrences
    })
    
    return score
  }
}

// Export singleton instance
export const pluginDiscoveryService = new PluginDiscoveryService()