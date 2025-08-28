/**
 * Lazy loading utilities for plugin details and metadata
 * Implements progressive loading strategies to improve performance
 */

import type { EnhancedSearchPlugin, PluginCatalogItem } from './types'
import { pluginCache, CacheKeys } from './performance-cache'
import { performanceMonitor, MetricType } from './performance-monitor'

/**
 * Lazy loading configuration
 */
export interface LazyLoadConfig {
  /** Batch size for loading items */
  batchSize: number
  /** Delay between batches in milliseconds */
  batchDelay: number
  /** Maximum concurrent requests */
  maxConcurrent: number
  /** Enable caching */
  enableCache: boolean
  /** Cache TTL in milliseconds */
  cacheTtl: number
}

/**
 * Lazy loading state
 */
export interface LazyLoadState<T> {
  /** Items that are loaded */
  loaded: Map<string, T>
  /** Items that are currently loading */
  loading: Set<string>
  /** Items that failed to load */
  failed: Set<string>
  /** Queue of items to load */
  queue: string[]
  /** Whether loading is in progress */
  isLoading: boolean
}

/**
 * Lazy loader class for plugin data
 */
export class PluginLazyLoader {
  private config: LazyLoadConfig
  private detailsState: LazyLoadState<EnhancedSearchPlugin>
  private metadataState: LazyLoadState<Partial<EnhancedSearchPlugin>>
  private loadingPromises: Map<string, Promise<any>> = new Map()

  constructor(config: Partial<LazyLoadConfig> = {}) {
    this.config = {
      batchSize: 5,
      batchDelay: 100,
      maxConcurrent: 3,
      enableCache: true,
      cacheTtl: 5 * 60 * 1000, // 5 minutes
      ...config
    }

    this.detailsState = this.createInitialState()
    this.metadataState = this.createInitialState()
  }

  /**
   * Create initial lazy loading state
   */
  private createInitialState<T>(): LazyLoadState<T> {
    return {
      loaded: new Map(),
      loading: new Set(),
      failed: new Set(),
      queue: [],
      isLoading: false
    }
  }

  /**
   * Load plugin details lazily
   */
  async loadPluginDetails(pluginId: string): Promise<EnhancedSearchPlugin | null> {
    // Check if already loaded
    if (this.detailsState.loaded.has(pluginId)) {
      return this.detailsState.loaded.get(pluginId)!
    }

    // Check cache first
    if (this.config.enableCache) {
      const cached = pluginCache.get<EnhancedSearchPlugin>(CacheKeys.pluginDetails(pluginId))
      if (cached) {
        this.detailsState.loaded.set(pluginId, cached)
        return cached
      }
    }

    // Check if already loading
    if (this.detailsState.loading.has(pluginId)) {
      const existingPromise = this.loadingPromises.get(`details:${pluginId}`)
      if (existingPromise) {
        return await existingPromise
      }
    }

    // Start loading
    this.detailsState.loading.add(pluginId)
    
    const loadPromise = this.performPluginDetailsLoad(pluginId)
    this.loadingPromises.set(`details:${pluginId}`, loadPromise)

    try {
      const result = await loadPromise
      this.detailsState.loaded.set(pluginId, result)
      this.detailsState.failed.delete(pluginId)
      
      // Cache the result
      if (this.config.enableCache) {
        pluginCache.set(CacheKeys.pluginDetails(pluginId), result, this.config.cacheTtl)
      }

      return result
    } catch (error) {
      this.detailsState.failed.add(pluginId)
      console.error(`Failed to load plugin details for ${pluginId}:`, error)
      return null
    } finally {
      this.detailsState.loading.delete(pluginId)
      this.loadingPromises.delete(`details:${pluginId}`)
    }
  }

  /**
   * Load plugin metadata lazily
   */
  async loadPluginMetadata(pluginId: string): Promise<Partial<EnhancedSearchPlugin> | null> {
    // Check if already loaded
    if (this.metadataState.loaded.has(pluginId)) {
      return this.metadataState.loaded.get(pluginId)!
    }

    // Check cache first
    if (this.config.enableCache) {
      const cacheKey = `metadata:${pluginId}`
      const cached = pluginCache.get<Partial<EnhancedSearchPlugin>>(cacheKey)
      if (cached) {
        this.metadataState.loaded.set(pluginId, cached)
        return cached
      }
    }

    // Check if already loading
    if (this.metadataState.loading.has(pluginId)) {
      const existingPromise = this.loadingPromises.get(`metadata:${pluginId}`)
      if (existingPromise) {
        return await existingPromise
      }
    }

    // Start loading
    this.metadataState.loading.add(pluginId)
    
    const loadPromise = this.performPluginMetadataLoad(pluginId)
    this.loadingPromises.set(`metadata:${pluginId}`, loadPromise)

    try {
      const result = await loadPromise
      this.metadataState.loaded.set(pluginId, result)
      this.metadataState.failed.delete(pluginId)
      
      // Cache the result
      if (this.config.enableCache) {
        const cacheKey = `metadata:${pluginId}`
        pluginCache.set(cacheKey, result, this.config.cacheTtl)
      }

      return result
    } catch (error) {
      this.metadataState.failed.add(pluginId)
      console.error(`Failed to load plugin metadata for ${pluginId}:`, error)
      return null
    } finally {
      this.metadataState.loading.delete(pluginId)
      this.loadingPromises.delete(`metadata:${pluginId}`)
    }
  }

  /**
   * Preload plugin details in batches
   */
  async preloadPluginDetails(pluginIds: string[]): Promise<void> {
    const toLoad = pluginIds.filter(id => 
      !this.detailsState.loaded.has(id) && 
      !this.detailsState.loading.has(id) &&
      !this.detailsState.failed.has(id)
    )

    if (toLoad.length === 0) return

    const stopTiming = performanceMonitor.startTiming('preload-plugin-details')

    try {
      // Process in batches
      for (let i = 0; i < toLoad.length; i += this.config.batchSize) {
        const batch = toLoad.slice(i, i + this.config.batchSize)
        
        // Load batch concurrently
        const promises = batch.map(id => this.loadPluginDetails(id))
        await Promise.allSettled(promises)

        // Delay between batches to avoid overwhelming the system
        if (i + this.config.batchSize < toLoad.length) {
          await this.delay(this.config.batchDelay)
        }
      }
    } finally {
      stopTiming()
    }
  }

  /**
   * Preload plugin metadata in batches
   */
  async preloadPluginMetadata(pluginIds: string[]): Promise<void> {
    const toLoad = pluginIds.filter(id => 
      !this.metadataState.loaded.has(id) && 
      !this.metadataState.loading.has(id) &&
      !this.metadataState.failed.has(id)
    )

    if (toLoad.length === 0) return

    const stopTiming = performanceMonitor.startTiming('preload-plugin-metadata')

    try {
      // Process in batches
      for (let i = 0; i < toLoad.length; i += this.config.batchSize) {
        const batch = toLoad.slice(i, i + this.config.batchSize)
        
        // Load batch concurrently
        const promises = batch.map(id => this.loadPluginMetadata(id))
        await Promise.allSettled(promises)

        // Delay between batches
        if (i + this.config.batchSize < toLoad.length) {
          await this.delay(this.config.batchDelay)
        }
      }
    } finally {
      stopTiming()
    }
  }

  /**
   * Get loading state for plugin details
   */
  getDetailsLoadingState(pluginId: string): 'loaded' | 'loading' | 'failed' | 'pending' {
    if (this.detailsState.loaded.has(pluginId)) return 'loaded'
    if (this.detailsState.loading.has(pluginId)) return 'loading'
    if (this.detailsState.failed.has(pluginId)) return 'failed'
    return 'pending'
  }

  /**
   * Get loading state for plugin metadata
   */
  getMetadataLoadingState(pluginId: string): 'loaded' | 'loading' | 'failed' | 'pending' {
    if (this.metadataState.loaded.has(pluginId)) return 'loaded'
    if (this.metadataState.loading.has(pluginId)) return 'loading'
    if (this.metadataState.failed.has(pluginId)) return 'failed'
    return 'pending'
  }

  /**
   * Clear loaded data
   */
  clear(): void {
    this.detailsState = this.createInitialState()
    this.metadataState = this.createInitialState()
    this.loadingPromises.clear()
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      details: {
        loaded: this.detailsState.loaded.size,
        loading: this.detailsState.loading.size,
        failed: this.detailsState.failed.size,
        queue: this.detailsState.queue.length
      },
      metadata: {
        loaded: this.metadataState.loaded.size,
        loading: this.metadataState.loading.size,
        failed: this.metadataState.failed.size,
        queue: this.metadataState.queue.length
      },
      activePromises: this.loadingPromises.size
    }
  }

  /**
   * Perform actual plugin details loading
   */
  private async performPluginDetailsLoad(pluginId: string): Promise<EnhancedSearchPlugin> {
    return performanceMonitor.measureAsync(`load-plugin-details-${pluginId}`, async () => {
      // Simulate loading delay for demo
      await this.delay(Math.random() * 500 + 200)
      
      // In a real implementation, this would:
      // 1. Fetch plugin details from API or file system
      // 2. Load plugin configuration
      // 3. Check plugin health status
      // 4. Load plugin permissions and metadata
      
      // For now, return mock data
      const mockPlugin: EnhancedSearchPlugin = {
        id: pluginId,
        name: `Plugin ${pluginId}`,
        description: `Detailed description for plugin ${pluginId}`,
        version: '1.0.0',
        enabled: true,
        icon: 'PluginIcon',
        search: async () => [],
        metadata: {
          author: 'Plugin Author',
          license: 'MIT',
          keywords: ['plugin', 'search'],
          installDate: new Date(),
          lastUpdated: new Date(),
          fileSize: 1024 * 1024,
          dependencies: [],
          category: 'utilities' as any
        },
        installation: {
          isInstalled: true,
          isBuiltIn: false,
          canUninstall: true,
          status: 'installed' as any
        },
        permissions: [],
        settings: []
      }

      return mockPlugin
    })
  }

  /**
   * Perform actual plugin metadata loading
   */
  private async performPluginMetadataLoad(pluginId: string): Promise<Partial<EnhancedSearchPlugin>> {
    return performanceMonitor.measureAsync(`load-plugin-metadata-${pluginId}`, async () => {
      // Simulate loading delay
      await this.delay(Math.random() * 200 + 100)
      
      // In a real implementation, this would load lightweight metadata
      const mockMetadata: Partial<EnhancedSearchPlugin> = {
        id: pluginId,
        name: `Plugin ${pluginId}`,
        version: '1.0.0',
        enabled: true,
        metadata: {
          author: 'Plugin Author',
          fileSize: 1024 * 1024,
          installDate: new Date(),
          lastUpdated: new Date(),
          category: 'utilities' as any,
          license: 'MIT',
          keywords: ['plugin'],
          dependencies: []
        }
      }

      return mockMetadata
    })
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Global lazy loader instance
 */
export const pluginLazyLoader = new PluginLazyLoader({
  batchSize: 3,
  batchDelay: 150,
  maxConcurrent: 2,
  enableCache: true,
  cacheTtl: 10 * 60 * 1000 // 10 minutes
})

/**
 * Composable for using lazy loading in Vue components
 */
export function usePluginLazyLoading() {
  const loadPluginDetails = (pluginId: string) => {
    return pluginLazyLoader.loadPluginDetails(pluginId)
  }

  const loadPluginMetadata = (pluginId: string) => {
    return pluginLazyLoader.loadPluginMetadata(pluginId)
  }

  const preloadDetails = (pluginIds: string[]) => {
    return pluginLazyLoader.preloadPluginDetails(pluginIds)
  }

  const preloadMetadata = (pluginIds: string[]) => {
    return pluginLazyLoader.preloadPluginMetadata(pluginIds)
  }

  const getDetailsState = (pluginId: string) => {
    return pluginLazyLoader.getDetailsLoadingState(pluginId)
  }

  const getMetadataState = (pluginId: string) => {
    return pluginLazyLoader.getMetadataLoadingState(pluginId)
  }

  const getStatistics = () => {
    return pluginLazyLoader.getStatistics()
  }

  return {
    loadPluginDetails,
    loadPluginMetadata,
    preloadDetails,
    preloadMetadata,
    getDetailsState,
    getMetadataState,
    getStatistics
  }
}