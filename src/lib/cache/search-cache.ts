/**
 * 智能搜索缓存系统
 * 避免重复计算，提升搜索性能
 */

import type { SearchPlugin, SearchResult, SearchContext } from '../search-plugins'
import { logger } from '../logger'
import { handlePluginError } from '../error-handler'

/**
 * 缓存配置接口
 */
export interface SearchCacheConfig {
  /** 最大缓存条目数 */
  maxEntries: number
  /** 缓存过期时间（毫秒） */
  ttl: number
  /** 是否启用缓存 */
  enabled: boolean
  /** 压缩阈值（字节） */
  compressionThreshold: number
  /** 内存使用限制（MB） */
  memoryLimit: number
}

/**
 * 缓存统计信息
 */
export interface CacheStatistics {
  /** 总请求数 */
  totalRequests: number
  /** 缓存命中数 */
  hits: number
  /** 缓存未命中数 */
  misses: number
  /** 命中率 */
  hitRate: number
  /** 当前缓存条目数 */
  currentEntries: number
  /** 内存使用量（字节） */
  memoryUsage: number
  /** 平均响应时间（毫秒） */
  avgResponseTime: number
  /** 缓存节省时间（毫秒） */
  timeSaved: number
  /** 过期条目数 */
  expiredEntries: number
  /** 清理次数 */
  cleanupCount: number
}

/**
 * 缓存键结构
 */
export interface CacheKey {
  /** 插件ID */
  pluginId: string
  /** 搜索查询 */
  query: string
  /** 搜索参数哈希 */
  paramsHash: string
  /** 用户上下文 */
  userContext?: string
}

/**
 * 缓存值结构
 */
export interface CacheValue {
  /** 搜索结果 */
  results: SearchResult[]
  /** 缓存时间戳 */
  timestamp: number
  /** 结果数量 */
  count: number
  /** 搜索耗时（毫秒） */
  searchTime: number
  /** 结果大小（字节） */
  size: number
  /** 压缩标志 */
  compressed: boolean
}

/**
 * 搜索缓存管理器
 */
export class SearchCache {
  private config: SearchCacheConfig
  private cache = new Map<string, CacheValue>()
  private statistics: CacheStatistics
  private cleanupInterval: NodeJS.Timeout | null = null
  private compressionEnabled = false

  constructor(config: Partial<SearchCacheConfig> = {}) {
    this.config = {
      maxEntries: 1000,
      ttl: 5 * 60 * 1000, // 5分钟
      enabled: true,
      compressionThreshold: 1024 * 10, // 10KB
      memoryLimit: 50 * 1024 * 1024, // 50MB
      ...config
    }

    this.statistics = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      currentEntries: 0,
      memoryUsage: 0,
      avgResponseTime: 0,
      timeSaved: 0,
      expiredEntries: 0,
      cleanupCount: 0
    }

    // 启动定时清理
    this.startCleanupInterval()
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(pluginId: string, query: string, params?: any): string {
    const paramsHash = params ? this.hashString(JSON.stringify(params)) : ''
    const keyData: CacheKey = {
      pluginId,
      query: query.trim().toLowerCase(),
      paramsHash,
      userContext: 'default' // 可以扩展为用户特定的上下文
    }
    
    return this.hashString(JSON.stringify(keyData))
  }

  /**
   * 字符串哈希函数
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * 获取缓存值
   */
  async get(pluginId: string, query: string, params?: any): Promise<SearchResult[] | null> {
    if (!this.config.enabled) {
      return null
    }

    const startTime = performance.now()
    this.statistics.totalRequests++

    const key = this.generateCacheKey(pluginId, query, params)
    const cached = this.cache.get(key)

    if (!cached) {
      this.statistics.misses++
      this.updateStatistics()
      return null
    }

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.config.ttl) {
      this.cache.delete(key)
      this.statistics.expiredEntries++
      this.statistics.misses++
      this.updateStatistics()
      return null
    }

    // 解压缩数据
    let results = cached.results
    if (cached.compressed) {
      results = await this.decompressData(results)
    }

    this.statistics.hits++
    const responseTime = performance.now() - startTime
    this.statistics.timeSaved += cached.searchTime - responseTime
    this.updateStatistics()

    logger.debug('Cache hit', { pluginId, query, responseTime })
    return results
  }

  /**
   * 设置缓存值
   */
  async set(
    pluginId: string, 
    query: string, 
    results: SearchResult[], 
    searchTime: number,
    params?: any
  ): Promise<void> {
    if (!this.config.enabled || results.length === 0) {
      return
    }

    const key = this.generateCacheKey(pluginId, query, params)
    
    // 计算结果大小
    const size = new Blob([JSON.stringify(results)]).size
    
    // 检查内存限制
    if (this.statistics.memoryUsage + size > this.config.memoryLimit) {
      await this.cleanup()
    }

    // 压缩大数据
    let compressed = false
    let processedResults = results
    if (size > this.config.compressionThreshold && this.compressionEnabled) {
      processedResults = await this.compressData(results)
      compressed = true
    }

    const cacheValue: CacheValue = {
      results: processedResults,
      timestamp: Date.now(),
      count: results.length,
      searchTime,
      size,
      compressed
    }

    this.cache.set(key, cacheValue)
    
    // 检查是否需要清理
    if (this.cache.size > this.config.maxEntries) {
      await this.evictEntries()
    }

    this.updateStatistics()
    
    logger.debug('Cache set', { pluginId, query, size, compressed })
  }

  /**
   * 数据压缩
   */
  private async compressData(data: SearchResult[]): Promise<SearchResult[]> {
    try {
      // 简单的压缩策略：移除不必要的字段
      const compressed = data.map(item => ({
        ...item,
        // 移除大型临时字段
        _temp: undefined,
        // 简化描述
        description: item.description ? item.description.substring(0, 200) : undefined
      }))
      
      logger.debug('Data compressed', { original: data.length, compressed: compressed.length })
      return compressed
    } catch (error) {
      logger.warn('Compression failed', error)
      return data
    }
  }

  /**
   * 数据解压缩
   */
  private async decompressData(data: SearchResult[]): Promise<SearchResult[]> {
    // 如果需要更复杂的解压缩逻辑，在这里实现
    // 目前返回原始数据
    return data
  }

  /**
   * 清理过期条目
   */
  private async cleanup(): Promise<void> {
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.ttl) {
        this.cache.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      this.statistics.expiredEntries += cleanedCount
      this.statistics.cleanupCount++
      this.updateStatistics()
      
      logger.info('Cache cleanup completed', { 
        cleanedEntries: cleanedCount,
        remainingEntries: this.cache.size
      })
    }
  }

  /**
   * 驱逐条目（LRU策略）
   */
  private async evictEntries(): Promise<void> {
    const entries = Array.from(this.cache.entries())
    const toRemove = entries.length - this.config.maxEntries
    
    if (toRemove <= 0) return

    // 简单的LRU：按时间戳排序，删除最旧的
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0])
    }

    logger.info('Cache eviction completed', { 
      removedEntries: toRemove,
      remainingEntries: this.cache.size
    })
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(): void {
    this.statistics.currentEntries = this.cache.size
    this.statistics.hitRate = this.statistics.totalRequests > 0 
      ? (this.statistics.hits / this.statistics.totalRequests) * 100 
      : 0
    
    // 计算内存使用量
    this.statistics.memoryUsage = Array.from(this.cache.values())
      .reduce((total, value) => total + value.size, 0)
    
    // 计算平均响应时间
    if (this.statistics.totalRequests > 0) {
      this.statistics.avgResponseTime = this.statistics.timeSaved / this.statistics.totalRequests
    }
  }

  /**
   * 启动定时清理
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(error => {
        logger.error('Cache cleanup failed', error)
      })
    }, 60 * 1000) // 每分钟清理一次
  }

  /**
   * 清除缓存
   */
  clear(): void {
    this.cache.clear()
    this.statistics = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      currentEntries: 0,
      memoryUsage: 0,
      avgResponseTime: 0,
      timeSaved: 0,
      expiredEntries: 0,
      cleanupCount: 0
    }
    
    logger.info('Cache cleared')
  }

  /**
   * 获取统计信息
   */
  getStatistics(): CacheStatistics {
    return { ...this.statistics }
  }

  /**
   * 获取缓存键列表（用于调试）
   */
  getCacheKeys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 删除特定插件的缓存
   */
  invalidatePlugin(pluginId: string): void {
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      try {
        const keyData = JSON.parse(key)
        if (keyData.pluginId === pluginId) {
          keysToDelete.push(key)
        }
      } catch {
        // 忽略解析错误
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
    
    logger.info('Plugin cache invalidated', { 
      pluginId, 
      removedEntries: keysToDelete.length 
    })
  }

  /**
   * 预热缓存
   */
  async warmup(
    pluginId: string, 
    queries: string[], 
    searchFunction: (query: string) => Promise<SearchResult[]>
  ): Promise<void> {
    logger.info('Cache warmup started', { pluginId, queryCount: queries.length })
    
    const batchSize = 5 // 并发限制
    const results: SearchResult[][] = []
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize)
      const batchPromises = batch.map(async (query) => {
        try {
          const startTime = performance.now()
          const searchResults = await searchFunction(query)
          const searchTime = performance.now() - startTime
          
          await this.set(pluginId, query, searchResults, searchTime)
          return searchResults
        } catch (error) {
          logger.warn('Cache warmup failed for query', { query, error })
          return []
        }
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      results.push(...batchResults
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<SearchResult[]>).value)
      )
      
      // 避免过度并发
      if (i + batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    logger.info('Cache warmup completed', { 
      pluginId, 
      totalQueries: queries.length,
      successfulQueries: results.length
    })
  }

  /**
   * 销毁缓存
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    this.clear()
    logger.info('Cache destroyed')
  }
}

/**
 * 全局搜索缓存实例
 */
export const searchCache = new SearchCache({
  maxEntries: 500,
  ttl: 3 * 60 * 1000, // 3分钟
  enabled: true,
  compressionThreshold: 1024 * 5, // 5KB
  memoryLimit: 25 * 1024 * 1024 // 25MB
})

/**
 * 带缓存的搜索装饰器
 */
export function withSearchCache(
  pluginId: string,
  searchFunction: (context: SearchContext) => Promise<SearchResultItem[]> | SearchResultItem[]
): (context: SearchContext) => Promise<SearchResultItem[]> {
  return async (context: SearchContext): Promise<SearchResultItem[]> => {
    // 尝试从缓存获取
    const cachedResults = await searchCache.get(pluginId, context.query, context)
    if (cachedResults) {
      return cachedResults as SearchResultItem[]
    }

    // 执行搜索
    const startTime = performance.now()
    const results = await searchFunction(context)
    const searchTime = performance.now() - startTime

    // 确保结果是数组类型
    const resultsArray = Array.isArray(results) ? results : []

    // 存入缓存
    await searchCache.set(pluginId, context.query, resultsArray, searchTime, context)

    return resultsArray
  }
}

/**
 * Vue组合式函数：使用搜索缓存
 */
export function useSearchCache() {
  const getCacheStats = () => searchCache.getStatistics()
  const clearCache = () => searchCache.clear()
  const invalidatePlugin = (pluginId: string) => searchCache.invalidatePlugin(pluginId)
  const getCacheKeys = () => searchCache.getCacheKeys()

  return {
    getCacheStats,
    clearCache,
    invalidatePlugin,
    getCacheKeys,
    cache: searchCache
  }
}