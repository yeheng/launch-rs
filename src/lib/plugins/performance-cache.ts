/**
 * Performance cache for plugin management operations
 * Implements caching strategies for plugin search results and metadata
 */

import type { EnhancedSearchPlugin, PluginCatalogItem } from './types'
import type { PluginSearchOptions } from './plugin-management-service'

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  totalEntries: number
  hitRate: number
  missRate: number
  totalHits: number
  totalMisses: number
  memoryUsage: number
  oldestEntry: number
  newestEntry: number
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum number of entries */
  maxEntries: number
  /** Default TTL in milliseconds */
  defaultTtl: number
  /** Enable cache statistics */
  enableStats: boolean
  /** Auto cleanup interval in milliseconds */
  cleanupInterval: number
}

/**
 * Performance cache class
 */
export class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>()
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  }
  private cleanupTimer?: NodeJS.Timeout
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxEntries: 1000,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      enableStats: true,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config
    }

    this.startCleanupTimer()
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++
      }
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      if (this.config.enableStats) {
        this.stats.misses++
      }
      return null
    }

    // Update hit count
    entry.hits++
    if (this.config.enableStats) {
      this.stats.hits++
    }

    return entry.data
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLeastUsed()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTtl,
      hits: 0
    }

    this.cache.set(key, entry)
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete cached entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear()
    this.resetStats()
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    const entries = Array.from(this.cache.values())
    const now = Date.now()
    
    return {
      totalEntries: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      missRate: this.stats.misses / (this.stats.hits + this.stats.misses) || 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : now,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : now
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastUsed(): void {
    const entries = Array.from(this.cache.entries())
    
    // Sort by hits (ascending) and timestamp (ascending)
    entries.sort(([, a], [, b]) => {
      if (a.hits !== b.hits) {
        return a.hits - b.hits
      }
      return a.timestamp - b.timestamp
    })

    // Remove oldest 10% of entries
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1))
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0])
      if (this.config.enableStats) {
        this.stats.evictions++
      }
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key)
      }
    }

    toDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let size = 0
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2 // UTF-16 characters
      size += JSON.stringify(entry.data).length * 2
      size += 64 // Estimated overhead per entry
    }
    return size
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.clear()
  }
}

/**
 * Plugin-specific cache keys
 */
export class CacheKeys {
  static pluginList(options: PluginSearchOptions): string {
    return `plugins:list:${JSON.stringify(options)}`
  }

  static pluginDetails(pluginId: string): string {
    return `plugins:details:${pluginId}`
  }

  static pluginSearch(query: string, options: Partial<PluginSearchOptions>): string {
    return `plugins:search:${query}:${JSON.stringify(options)}`
  }

  static pluginCatalog(): string {
    return 'plugins:catalog'
  }

  static pluginStatistics(): string {
    return 'plugins:statistics'
  }

  static pluginHealth(pluginId: string): string {
    return `plugins:health:${pluginId}`
  }
}

/**
 * Global cache instance
 */
export const pluginCache = new PerformanceCache({
  maxEntries: 500,
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  enableStats: true,
  cleanupInterval: 2 * 60 * 1000 // 2 minutes
})

/**
 * Cache decorator for methods
 */
export function cached(ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`
      
      // Try to get from cache
      const cached = pluginCache.get(cacheKey)
      if (cached !== null) {
        return cached
      }

      // Execute original method
      const result = await originalMethod.apply(this, args)
      
      // Cache the result
      pluginCache.set(cacheKey, result, ttl)
      
      return result
    }

    return descriptor
  }
}