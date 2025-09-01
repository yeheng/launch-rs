import type { PluginSearchOptions } from './plugin-management-service'

// 缓存条目接口
export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hitCount: number
  lastAccessed: number
}

// 缓存统计信息
export interface CacheStatistics {
  totalEntries: number
  totalHits: number
  totalMisses: number
  hitRate: number
  memoryUsage: number
  oldestEntry: number | null
  newestEntry: number | null
}

// 缓存配置选项
export interface CacheOptions {
  maxEntries: number
  defaultTtl: number
  enableStats: boolean
  cleanupInterval: number
}

// 性能缓存类
export class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>()
  private options: CacheOptions
  private stats = {
    totalHits: 0,
    totalMisses: 0
  }
  private cleanupTimer: number | null = null

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      maxEntries: 100,
      defaultTtl: 5000, // 5秒默认TTL
      enableStats: true,
      cleanupInterval: 30000, // 30秒清理间隔
      ...options
    }

    // 启动自动清理
    if (this.options.cleanupInterval > 0) {
      this.startCleanupTimer()
    }
  }

  // 设置缓存条目
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const entryTtl = ttl ?? this.options.defaultTtl

    // 如果缓存已满，移除最少使用的条目
    if (this.cache.size >= this.options.maxEntries) {
      this.evictLeastUsed()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: entryTtl,
      hitCount: 0,
      lastAccessed: now
    }

    this.cache.set(key, entry)
  }

  // 获取缓存条目
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      if (this.options.enableStats) {
        this.stats.totalMisses++
      }
      return null
    }

    const now = Date.now()
    
    // 检查是否过期
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      if (this.options.enableStats) {
        this.stats.totalMisses++
      }
      return null
    }

    // 更新访问统计
    entry.hitCount++
    entry.lastAccessed = now
    
    if (this.options.enableStats) {
      this.stats.totalHits++
    }

    return entry.data as T
  }

  // 删除缓存条目
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  // 清空缓存
  clear(): void {
    this.cache.clear()
    this.resetStats()
  }

  // 获取缓存统计信息
  getStatistics(): CacheStatistics {
    const entries = Array.from(this.cache.values())
    const now = Date.now()
    
    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      hitRate: this.stats.totalHits + this.stats.totalMisses > 0 
        ? this.stats.totalHits / (this.stats.totalHits + this.stats.totalMisses)
        : 0,
      memoryUsage: this.calculateMemoryUsage(),
      oldestEntry: entries.length > 0 
        ? Math.min(...entries.map(e => e.timestamp))
        : null,
      newestEntry: entries.length > 0 
        ? Math.max(...entries.map(e => e.timestamp))
        : null
    }
  }

  // 移除过期条目
  cleanupExpired(): number {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }

    return removedCount
  }

  // 移除最少使用的条目
  private evictLeastUsed(): void {
    if (this.cache.size === 0) return

    let leastUsedKey: string | null = null
    let leastUsedCount = Infinity
    let oldestAccessTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      // 优先移除访问次数最少的，如果访问次数相同则移除最久未访问的
      if (entry.hitCount < leastUsedCount || 
          (entry.hitCount === leastUsedCount && entry.lastAccessed < oldestAccessTime)) {
        leastUsedKey = key
        leastUsedCount = entry.hitCount
        oldestAccessTime = entry.lastAccessed
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey)
    }
  }

  // 计算内存使用量（估算）
  private calculateMemoryUsage(): number {
    let size = 0
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2 // 字符串字节估算
      size += JSON.stringify(entry.data).length * 2
      size += 64 // 条目元数据估算
    }
    return size
  }

  // 重置统计信息
  private resetStats(): void {
    this.stats.totalHits = 0
    this.stats.totalMisses = 0
  }

  // 启动清理定时器
  private startCleanupTimer(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanupExpired()
    }, this.options.cleanupInterval)
  }

  // 销毁缓存实例
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }
}

// 缓存键生成工具
export class CacheKeys {
  // 插件搜索缓存键
  static pluginSearch(query: string, options: PluginSearchOptions): string {
    const normalizedOptions = {
      query: options.query || '',
      category: options.category || '',
      sortBy: options.sortBy || 'name',
      enabled: options.enabled ?? true,
      limit: options.limit || 50
    }
    
    return `plugin-search:${query}:${JSON.stringify(normalizedOptions)}`
  }

  // 插件详情缓存键
  static pluginDetails(pluginId: string): string {
    return `plugin-details:${pluginId}`
  }

  // 插件元数据缓存键
  static pluginMetadata(pluginId: string): string {
    return `plugin-metadata:${pluginId}`
  }

  // 搜索结果缓存键
  static searchResults(query: string, timestamp?: number): string {
    const ts = timestamp || Date.now()
    return `search-results:${query}:${Math.floor(ts / 60000)}` // 按分钟分组
  }

  // 用户偏好缓存键
  static userPreference(userId: string, key: string): string {
    return `user-pref:${userId}:${key}`
  }
}

// 默认缓存实例
export const defaultCache = new PerformanceCache({
  maxEntries: 200,
  defaultTtl: 10000, // 10秒
  enableStats: true,
  cleanupInterval: 60000 // 1分钟清理间隔
})