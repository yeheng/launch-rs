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

// 性能指标接口
export interface PerformanceMetrics {
  cacheSet: { total: number; average: number; min: number; max: number }
  cacheGet: { total: number; average: number; min: number; max: number }
  cacheDelete: { total: number; average: number; min: number; max: number }
  search: { total: number; average: number; min: number; max: number }
  pluginLoad: { total: number; average: number; min: number; max: number }
}

// 性能异常接口
export interface PerformanceAnomaly {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
  timestamp: number
  value: number
}

// 性能报告接口
export interface PerformanceReport {
  cacheSize: number
  memoryUsage: number
  hitRate: number
  averageResponseTime: number
  anomalies: PerformanceAnomaly[]
  timestamp: number
}

// 增强的性能缓存类
export class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>()
  private options: CacheOptions & { maxSize?: number; maxMemory?: number }
  private stats = {
    totalHits: 0,
    totalMisses: 0
  }
  private cleanupTimer: number | null = null
  private metrics: PerformanceMetrics = {
    cacheSet: { total: 0, average: 0, min: Infinity, max: 0 },
    cacheGet: { total: 0, average: 0, min: Infinity, max: 0 },
    cacheDelete: { total: 0, average: 0, min: Infinity, max: 0 },
    search: { total: 0, average: 0, min: Infinity, max: 0 },
    pluginLoad: { total: 0, average: 0, min: Infinity, max: 0 }
  }
  private errorHandler: ((error: Error) => void) | null = null

  constructor(options: Partial<CacheOptions & { maxSize?: number; maxMemory?: number }> = {}) {
    this.options = {
      maxEntries: 100,
      defaultTtl: 5000, // 5秒默认TTL
      enableStats: true,
      cleanupInterval: 30000, // 30秒清理间隔
      maxSize: 1000,
      maxMemory: 10 * 1024 * 1024, // 10MB
      ...options
    }

    // 启动自动清理
    if (this.options.cleanupInterval > 0) {
      this.startCleanupTimer()
    }
  }

  // 获取缓存大小
  get size(): number {
    return this.cache.size
  }

  // 设置缓存条目
  set<T>(key: string, data: T, ttl?: number): void {
    const startTime = performance.now()
    
    const now = Date.now()
    const entryTtl = ttl ?? this.options.defaultTtl

    // 如果缓存已满，移除最少使用的条目
    if (this.cache.size >= (this.options.maxSize || this.options.maxEntries)) {
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
    
    // 记录性能指标
    const duration = performance.now() - startTime
    this.recordMetric('cacheSet', duration)
  }

  // 获取缓存条目
  get<T>(key: string): T | null {
    const startTime = performance.now()
    
    const entry = this.cache.get(key)
    
    if (!entry) {
      if (this.options.enableStats) {
        this.stats.totalMisses++
      }
      const duration = performance.now() - startTime
      this.recordMetric('cacheGet', duration)
      return null
    }

    const now = Date.now()
    
    // 检查是否过期
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      if (this.options.enableStats) {
        this.stats.totalMisses++
      }
      const duration = performance.now() - startTime
      this.recordMetric('cacheGet', duration)
      return null
    }

    // 更新访问统计
    entry.hitCount++
    entry.lastAccessed = now
    
    if (this.options.enableStats) {
      this.stats.totalHits++
    }

    const duration = performance.now() - startTime
    this.recordMetric('cacheGet', duration)

    return entry.data as T
  }

  // 删除缓存条目
  delete(key: string): boolean {
    const startTime = performance.now()
    
    const result = this.cache.delete(key)
    
    const duration = performance.now() - startTime
    this.recordMetric('cacheDelete', duration)
    
    return result
  }

  // 清空缓存
  clear(): void {
    this.cache.clear()
    this.resetStats()
  }

  // 清理过期缓存
  cleanup(): number {
    return this.cleanupExpired()
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

  // 记录性能指标
  recordMetric(type: keyof PerformanceMetrics, duration: number): void {
    const metric = this.metrics[type]
    metric.total++
    metric.average = (metric.average * (metric.total - 1) + duration) / metric.total
    metric.min = Math.min(metric.min, duration)
    metric.max = Math.max(metric.max, duration)
  }

  // 获取性能指标
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  // 检测性能异常
  detectAnomalies(): PerformanceAnomaly[] {
    const anomalies: PerformanceAnomaly[] = []
    const now = Date.now()

    // 检查搜索性能异常
    if (this.metrics.search.total > 0 && this.metrics.search.average > 100) {
      anomalies.push({
        type: 'search',
        severity: 'medium',
        description: '搜索响应时间异常',
        timestamp: now,
        value: this.metrics.search.average
      })
    }

    // 检查缓存性能异常
    if (this.metrics.cacheGet.total > 0 && this.metrics.cacheGet.average > 10) {
      anomalies.push({
        type: 'cacheGet',
        severity: 'low',
        description: '缓存读取性能异常',
        timestamp: now,
        value: this.metrics.cacheGet.average
      })
    }

    // 检查插件加载性能异常
    if (this.metrics.pluginLoad.total > 0 && this.metrics.pluginLoad.average > 500) {
      anomalies.push({
        type: 'pluginLoad',
        severity: 'high',
        description: '插件加载时间过长',
        timestamp: now,
        value: this.metrics.pluginLoad.average
      })
    }

    return anomalies
  }

  // 生成性能报告
  generatePerformanceReport(): PerformanceReport {
    const stats = this.getStatistics()
    const anomalies = this.detectAnomalies()
    
    // 计算平均响应时间
    const totalOps = this.metrics.cacheGet.total + this.metrics.cacheSet.total + this.metrics.search.total
    const totalTime = 
      this.metrics.cacheGet.total * this.metrics.cacheGet.average +
      this.metrics.cacheSet.total * this.metrics.cacheSet.average +
      this.metrics.search.total * this.metrics.search.average
    const avgResponseTime = totalOps > 0 ? totalTime / totalOps : 0

    return {
      cacheSize: stats.totalEntries,
      memoryUsage: stats.memoryUsage,
      hitRate: stats.hitRate,
      averageResponseTime: avgResponseTime,
      anomalies,
      timestamp: Date.now()
    }
  }

  // 缓存预热
  async warmUp(data: Array<{ key: string; data: any; ttl?: number }>): Promise<void> {
    const startTime = performance.now()
    
    for (const item of data) {
      this.set(item.key, item.data, item.ttl)
    }
    
    const duration = performance.now() - startTime
    this.recordMetric('cacheSet', duration)
  }

  // 模拟内存压力
  simulateMemoryPressure(): void {
    const currentSize = this.cache.size
    const targetSize = Math.floor(currentSize * 0.5) // 减少到50%
    
    while (this.cache.size > targetSize) {
      this.evictLeastUsed()
    }
  }

  // 模拟缓存损坏
  simulateCorruption(): void {
    // 随机删除一些条目来模拟损坏
    const keys = Array.from(this.cache.keys())
    const deleteCount = Math.floor(keys.length * 0.3) // 删除30%
    
    for (let i = 0; i < deleteCount; i++) {
      const randomIndex = Math.floor(Math.random() * keys.length)
      this.cache.delete(keys[randomIndex])
      keys.splice(randomIndex, 1)
    }
  }

  // 恢复缓存
  recover(): void {
    const startTime = performance.now()
    
    // 清理过期条目
    this.cleanupExpired()
    
    // 重置统计信息
    this.resetStats()
    
    const duration = performance.now() - startTime
    this.recordMetric('cacheSet', duration)
  }

  // 设置错误处理器
  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler
  }

  // 移除过期条目
  private cleanupExpired(): number {
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

  // 移除最少使用的条目 (LRU)
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
    if (typeof window !== 'undefined') {
      this.cleanupTimer = window.setInterval(() => {
        this.cleanupExpired()
      }, this.options.cleanupInterval)
    }
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