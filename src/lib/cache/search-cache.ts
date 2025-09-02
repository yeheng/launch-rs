/**
 * 统一智能搜索缓存系统
 * 集成LRU缓存、智能预测和学习功能
 * 避免重复计算，提升搜索性能
 */

import type { SearchPlugin, SearchResult, SearchContext } from '../search-plugins'
import { logger } from '../logger'
import { handlePluginError } from '../error-handler'

/**
 * 使用模式分析接口
 */
export interface UsagePattern {
  /** 查询频率 */
  queryFrequency: Map<string, number>
  /** 时间模式 */
  timePatterns: Map<string, number[]>
  /** 插件使用权重 */
  pluginWeights: Map<string, number>
  /** 结果大小模式 */
  resultSizePatterns: Map<string, number>
  /** 最后使用时间 */
  lastUsed: Map<string, number>
}

/**
 * 预测缓存策略接口
 */
export interface CacheStrategy {
  /** 策略名称 */
  name: string
  /** 预测分数（0-1） */
  score: number
  /** 预测理由 */
  reason: string
  /** 建议的TTL */
  suggestedTTL: number
  /** 建议的优先级 */
  priority: 'high' | 'medium' | 'low'
}

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
  /** 访问次数（用于LRU） */
  hitCount: number
  /** 最后访问时间（用于LRU） */
  lastAccessed: number
}

/**
 * 统一搜索缓存管理器
 */
export class SearchCache {
  private config: SearchCacheConfig
  private cache = new Map<string, CacheValue>()
  private statistics: CacheStatistics
  private cleanupInterval: NodeJS.Timeout | null = null
  private compressionEnabled = false
  
  // 智能缓存功能
  private usagePatterns: UsagePattern
  private predictionModel: Map<string, number[]> = new Map()
  private isLearning = false
  private intelligentEnabled = true

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

    // 初始化智能缓存功能
    this.usagePatterns = {
      queryFrequency: new Map(),
      timePatterns: new Map(),
      pluginWeights: new Map(),
      resultSizePatterns: new Map(),
      lastUsed: new Map()
    }

    // 启动定时清理
    this.startCleanupInterval()
    
    // 加载学习数据
    this.loadLearningData()
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

    // 更新LRU统计信息
    cached.hitCount++
    cached.lastAccessed = Date.now()

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

    const now = Date.now()
    const cacheValue: CacheValue = {
      results: processedResults,
      timestamp: now,
      count: results.length,
      searchTime,
      size,
      compressed,
      hitCount: 0,
      lastAccessed: now
    }

    this.cache.set(key, cacheValue)
    
    // 检查是否需要清理
    if (this.cache.size > this.config.maxEntries) {
      await this.evictEntries()
    }

    this.updateStatistics()
    
    logger.debug('Cache set', { pluginId, query, size, compressed })
    
    // 记录使用模式用于智能学习
    if (this.intelligentEnabled) {
      this.recordUsagePattern(pluginId, query, results, searchTime).catch(error => {
        logger.warn('Failed to record usage pattern', error)
      })
    }
  }

  /**
   * 记录搜索使用模式
   */
  private async recordUsagePattern(
    pluginId: string, 
    query: string, 
    results: SearchResult[], 
    responseTime: number
  ): Promise<void> {
    if (!this.intelligentEnabled) return

    const normalizedQuery = query.trim().toLowerCase()
    const now = Date.now()
    const hourOfDay = new Date(now).getHours()

    // 更新查询频率
    const queryKey = `${pluginId}:${normalizedQuery}`
    const currentFreq = this.usagePatterns.queryFrequency.get(queryKey) || 0
    this.usagePatterns.queryFrequency.set(queryKey, currentFreq + 1)

    // 更新时间模式
    const timeKey = `${pluginId}:${hourOfDay}`
    const timePattern = this.usagePatterns.timePatterns.get(timeKey) || []
    timePattern.push(now)
    this.usagePatterns.timePatterns.set(timeKey, timePattern)

    // 更新插件权重
    const currentWeight = this.usagePatterns.pluginWeights.get(pluginId) || 0
    this.usagePatterns.pluginWeights.set(pluginId, currentWeight + 1)

    // 更新结果大小模式
    const resultSize = results.length
    const sizeKey = `${pluginId}:${resultSize}`
    const currentSizeFreq = this.usagePatterns.resultSizePatterns.get(sizeKey) || 0
    this.usagePatterns.resultSizePatterns.set(sizeKey, currentSizeFreq + 1)

    // 更新最后使用时间
    this.usagePatterns.lastUsed.set(queryKey, now)

    // 定期保存学习数据
    if (Math.random() < 0.1) { // 10%概率保存
      this.saveLearningData()
    }

    // 异步更新预测模型
    this.updatePredictionModel(pluginId, normalizedQuery, results, responseTime)
  }

  /**
   * 预测热门查询
   */
  async predictHotQueries(pluginId?: string): Promise<Array<{query: string, score: number}>> {
    if (!this.intelligentEnabled) return []

    const predictions: Array<{query: string, score: number}> = []
    const now = Date.now()
    const currentHour = new Date(now).getHours()

    // 分析查询频率
    for (const [queryKey, frequency] of this.usagePatterns.queryFrequency) {
      const [queryPluginId, query] = queryKey.split(':')
      
      if (pluginId && queryPluginId !== pluginId) continue

      // 计算基础分数
      let score = frequency / 100 // 归一化

      // 时间加权：最近使用的查询分数更高
      const lastUsed = this.usagePatterns.lastUsed.get(queryKey) || 0
      const timeDecay = Math.max(0, 1 - (now - lastUsed) / (24 * 60 * 60 * 1000))
      score *= (1 + timeDecay)

      // 时间模式加权：当前时段常用的查询分数更高
      const timeKey = `${queryPluginId}:${currentHour}`
      const timePattern = this.usagePatterns.timePatterns.get(timeKey) || []
      const timeUsage = timePattern.filter(timestamp => 
        now - timestamp < 7 * 24 * 60 * 60 * 1000 // 最近7天
      ).length
      score *= (1 + timeUsage / 100)

      // 插件权重
      const pluginWeight = this.usagePatterns.pluginWeights.get(queryPluginId) || 1
      score *= Math.log(pluginWeight + 1)

      predictions.push({ query, score })
    }

    // 排序并返回前N个预测
    return predictions
      .sort((a, b) => b.score - a.score)
      .slice(0, 50) // 限制预测数量
  }

  /**
   * 获取缓存策略建议
   */
  async getCacheStrategy(
    pluginId: string, 
    query: string, 
    results: SearchResult[]
  ): Promise<CacheStrategy> {
    if (!this.intelligentEnabled) {
      return {
        name: 'default',
        score: 0.5,
        reason: '智能缓存已禁用',
        suggestedTTL: 3 * 60 * 1000,
        priority: 'medium'
      }
    }

    const normalizedQuery = query.trim().toLowerCase()
    const queryKey = `${pluginId}:${normalizedQuery}`
    
    // 计算各种特征分数
    const frequency = this.usagePatterns.queryFrequency.get(queryKey) || 0
    const lastUsed = this.usagePatterns.lastUsed.get(queryKey) || 0
    const pluginWeight = this.usagePatterns.pluginWeights.get(pluginId) || 1
    const resultSize = results.length
    const now = Date.now()

    // 基础分数（基于频率）
    let score = Math.min(frequency / 10, 1) // 10次使用为满分

    // 重复使用加权
    const recencyWeight = Math.max(0, 1 - (now - lastUsed) / (24 * 60 * 60 * 1000))
    score = score * 0.7 + recencyWeight * 0.3

    // 插件流行度加权
    const pluginPopularity = Math.log(pluginWeight + 1) / Math.log(100)
    score = score * 0.8 + pluginPopularity * 0.2

    // 结果大小调整（大结果缓存价值更高）
    const sizeBonus = Math.min(resultSize / 20, 1) // 20个结果为满分
    score = score * 0.9 + sizeBonus * 0.1

    // 确定优先级
    let priority: 'high' | 'medium' | 'low' = 'medium'
    if (score > 0.8) priority = 'high'
    else if (score < 0.4) priority = 'low'

    // 自适应TTL
    let suggestedTTL = 3 * 60 * 1000 // 默认3分钟
    suggestedTTL = 60 * 1000 + (30 * 60 * 1000 - 60 * 1000) * score // 1-30分钟

    // 生成策略建议
    const strategy: CacheStrategy = {
      name: score > 0.7 ? 'aggressive' : 'conservative',
      score,
      reason: this.generateStrategyReason(frequency, recencyWeight, pluginPopularity, resultSize),
      suggestedTTL,
      priority
    }

    return strategy
  }

  /**
   * 生成策略理由
   */
  private generateStrategyReason(
    frequency: number, 
    recencyWeight: number, 
    pluginPopularity: number, 
    resultSize: number
  ): string {
    const reasons: string[] = []

    if (frequency > 5) reasons.push(`高频查询(${frequency}次)`)
    if (recencyWeight > 0.7) reasons.push('最近使用')
    if (pluginPopularity > 0.7) reasons.push('热门插件')
    if (resultSize > 10) reasons.push(`大结果集(${resultSize}项)`)

    return reasons.length > 0 ? reasons.join('，') : '标准缓存策略'
  }

  /**
   * 更新预测模型
   */
  private async updatePredictionModel(
    pluginId: string, 
    query: string, 
    results: SearchResult[], 
    responseTime: number
  ): Promise<void> {
    if (this.isLearning) return

    this.isLearning = true
    try {
      // 简单的学习算法：记录查询特征
      const features = this.extractFeatures(pluginId, query, results, responseTime)
      const queryKey = `${pluginId}:${query}`
      
      const history = this.predictionModel.get(queryKey) || []
      history.push(features.score)
      
      // 保持最近100次记录
      if (history.length > 100) {
        history.shift()
      }
      
      this.predictionModel.set(queryKey, history)
    } catch (error) {
      logger.warn('Failed to update prediction model', error)
    } finally {
      this.isLearning = false
    }
  }

  /**
   * 提取特征
   */
  private extractFeatures(
    pluginId: string, 
    query: string, 
    results: SearchResult[], 
    responseTime: number
  ): {score: number, features: number[]} {
    const queryKey = `${pluginId}:${query}`
    const frequency = this.usagePatterns.queryFrequency.get(queryKey) || 0
    const lastUsed = this.usagePatterns.lastUsed.get(queryKey) || 0
    const now = Date.now()

    // 特征向量
    const features = [
      Math.log(frequency + 1) / Math.log(100), // 频率对数
      Math.max(0, 1 - (now - lastUsed) / (24 * 60 * 60 * 1000)), // 时间衰减
      results.length / 50, // 结果数量归一化
      Math.min(responseTime / 1000, 1), // 响应时间归一化
      query.length / 100, // 查询长度归一化
    ]

    // 简单的线性模型计算分数
    const weights = [0.3, 0.25, 0.2, 0.15, 0.1]
    const score = features.reduce((sum, feature, index) => 
      sum + feature * weights[index], 0
    )

    return { score, features }
  }

  /**
   * 智能预热缓存
   */
  async intelligentWarmup(
    pluginId: string,
    searchFunction: (query: string) => Promise<SearchResult[]>
  ): Promise<void> {
    if (!this.intelligentEnabled) return

    // 预测热门查询
    const hotQueries = await this.predictHotQueries(pluginId)
    
    if (hotQueries.length === 0) return

    logger.info('Intelligent cache warmup started', { 
      pluginId, 
      predictions: hotQueries.length 
    })

    // 按优先级分组预热
    const highPriority = hotQueries.slice(0, 5)
    const mediumPriority = hotQueries.slice(5, 15)
    const lowPriority = hotQueries.slice(15, 30)

    // 分批次预热
    await this.warmupBatch(pluginId, highPriority, searchFunction, 100)
    await this.warmupBatch(pluginId, mediumPriority, searchFunction, 200)
    await this.warmupBatch(pluginId, lowPriority, searchFunction, 300)

    logger.info('Intelligent cache warmup completed', { 
      pluginId, 
      totalQueries: highPriority.length + mediumPriority.length + lowPriority.length 
    })
  }

  /**
   * 批量预热
   */
  private async warmupBatch(
    pluginId: string,
    queries: Array<{query: string, score: number}>,
    searchFunction: (query: string) => Promise<SearchResult[]>,
    delay: number
  ): Promise<void> {
    for (const { query } of queries) {
      try {
        const results = await searchFunction(query)
        const strategy = await this.getCacheStrategy(pluginId, query, results)
        
        // 使用建议的TTL
        await this.set(pluginId, query, results, Date.now())
        
        await new Promise(resolve => setTimeout(resolve, delay))
      } catch (error) {
        logger.warn('Intelligent warmup failed', { query, error })
      }
    }
  }

  /**
   * 获取学习报告
   */
  getLearningReport(): {
    totalQueries: number
    topPlugins: Array<{pluginId: string, weight: number}>
    topQueries: Array<{query: string, frequency: number}>
    timePatterns: Array<{hour: number, usage: number}>
    predictionAccuracy: number
  } {
    const totalQueries = Array.from(this.usagePatterns.queryFrequency.values())
      .reduce((sum, freq) => sum + freq, 0)

    const topPlugins = Array.from(this.usagePatterns.pluginWeights.entries())
      .map(([pluginId, weight]) => ({ pluginId, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10)

    const topQueries = Array.from(this.usagePatterns.queryFrequency.entries())
      .map(([query, frequency]) => ({ query, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)

    const timePatterns = Array.from({ length: 24 }, (_, hour) => {
      const usage = Array.from(this.usagePatterns.timePatterns.entries())
        .filter(([key]) => key.endsWith(`:${hour}`))
        .reduce((sum, [, patterns]) => sum + patterns.length, 0)
      return { hour, usage }
    })

    const predictionAccuracy = this.calculatePredictionAccuracy()

    return {
      totalQueries,
      topPlugins,
      topQueries,
      timePatterns,
      predictionAccuracy
    }
  }

  /**
   * 计算预测准确度
   */
  private calculatePredictionAccuracy(): number {
    // 简化的准确度计算
    const totalPredictions = this.predictionModel.size
    if (totalPredictions === 0) return 0

    const accuratePredictions = Array.from(this.predictionModel.values())
      .filter(history => {
        if (history.length < 2) return false
        const recent = history.slice(-5)
        const average = recent.reduce((sum, score) => sum + score, 0) / recent.length
        return average > 0.6 // 60%以上准确率
      }).length

    return accuratePredictions / totalPredictions
  }

  /**
   * 保存学习数据
   */
  private saveLearningData(): void {
    try {
      const data = {
        usagePatterns: {
          queryFrequency: Array.from(this.usagePatterns.queryFrequency.entries()),
          timePatterns: Array.from(this.usagePatterns.timePatterns.entries()),
          pluginWeights: Array.from(this.usagePatterns.pluginWeights.entries()),
          resultSizePatterns: Array.from(this.usagePatterns.resultSizePatterns.entries()),
          lastUsed: Array.from(this.usagePatterns.lastUsed.entries())
        },
        predictionModel: Array.from(this.predictionModel.entries()),
        timestamp: Date.now()
      }

      localStorage.setItem('unified-cache-data', JSON.stringify(data))
    } catch (error) {
      logger.warn('Failed to save learning data', error)
    }
  }

  /**
   * 加载学习数据
   */
  private loadLearningData(): void {
    try {
      const data = localStorage.getItem('unified-cache-data')
      if (!data) return

      const parsed = JSON.parse(data)
      
      // 恢复使用模式
      this.usagePatterns.queryFrequency = new Map(parsed.usagePatterns?.queryFrequency || [])
      this.usagePatterns.timePatterns = new Map(parsed.usagePatterns?.timePatterns || [])
      this.usagePatterns.pluginWeights = new Map(parsed.usagePatterns?.pluginWeights || [])
      this.usagePatterns.resultSizePatterns = new Map(parsed.usagePatterns?.resultSizePatterns || [])
      this.usagePatterns.lastUsed = new Map(parsed.usagePatterns?.lastUsed || [])
      
      // 恢复预测模型
      this.predictionModel = new Map(parsed.predictionModel || [])

      logger.info('Learning data loaded', { 
        timestamp: parsed.timestamp,
        queryPatterns: this.usagePatterns.queryFrequency.size 
      })
    } catch (error) {
      logger.warn('Failed to load learning data', error)
    }
  }

  /**
   * 清除学习数据
   */
  clearLearningData(): void {
    this.usagePatterns = {
      queryFrequency: new Map(),
      timePatterns: new Map(),
      pluginWeights: new Map(),
      resultSizePatterns: new Map(),
      lastUsed: new Map()
    }
    
    this.predictionModel.clear()
    
    try {
      localStorage.removeItem('unified-cache-data')
    } catch (error) {
      logger.warn('Failed to clear learning data from storage', error)
    }

    logger.info('Learning data cleared')
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
    
    return cleanedCount
  }

  /**
   * 清理过期条目（公共方法）
   */
  async cleanupExpired(): Promise<number> {
    return this.cleanup()
  }

  /**
   * 清理过期条目（向后兼容方法）
   */
  async cleanup(): Promise<number> {
    let removedCount = 0
    const now = Date.now()
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }
    
    if (removedCount > 0) {
      this.statistics.expiredEntries += removedCount
      this.updateStatistics()
    }
    
    return removedCount
  }

  /**
   * 驱逐条目（LRU策略）
   */
  private async evictEntries(): Promise<void> {
    const entries = Array.from(this.cache.entries())
    const toRemove = entries.length - this.config.maxEntries
    
    if (toRemove <= 0) return

    // 使用正确的LRU算法：优先移除访问次数最少的，如果访问次数相同则移除最久未访问的
    entries.sort((a, b) => {
      const entryA = a[1]
      const entryB = b[1]
      
      // 首先比较访问次数
      if (entryA.hitCount !== entryB.hitCount) {
        return entryA.hitCount - entryB.hitCount
      }
      
      // 如果访问次数相同，比较最后访问时间
      return entryA.lastAccessed - entryB.lastAccessed
    })
    
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
   * 获取性能指标（向后兼容方法）
   */
  getMetrics(): CacheStatistics {
    return this.getStatistics()
  }

  /**
   * 获取缓存键列表（用于调试）
   */
  getCacheKeys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 删除缓存条目
   */
  delete(pluginId: string, query: string): boolean {
    const key = this.generateCacheKey(pluginId, query)
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.updateStatistics()
    }
    return deleted
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * 记录搜索指标
   */
  recordSearchMetrics(pluginId: string, query: string, results: SearchResult[], searchTime: number): void {
    // 更新统计信息
    this.statistics.totalRequests++
    this.statistics.timeSaved += searchTime
    
    // 异步记录使用模式
    this.recordUsagePattern(pluginId, query, results, searchTime).catch(error => {
      logger.warn('Failed to record search metrics', error)
    })
  }

  /**
   * 检测性能异常
   */
  detectAnomalies(): Array<{type: string, severity: 'low' | 'medium' | 'high', message: string}> {
    const anomalies: Array<{type: string, severity: 'low' | 'medium' | 'high', message: string}> = []
    
    // 检测命中率异常
    if (this.statistics.totalRequests > 10 && this.statistics.hitRate < 20) {
      anomalies.push({
        type: 'low_hit_rate',
        severity: 'medium',
        message: `缓存命中率过低: ${this.statistics.hitRate.toFixed(1)}%`
      })
    }
    
    // 检测内存使用异常
    if (this.statistics.memoryUsage > this.config.memoryLimit * 0.8) {
      anomalies.push({
        type: 'high_memory_usage',
        severity: 'high',
        message: `内存使用过高: ${this.statistics.memoryUsage / (1024 * 1024)}MB`
      })
    }
    
    // 检测响应时间异常
    if (this.statistics.avgResponseTime > 1000) {
      anomalies.push({
        type: 'slow_response',
        severity: 'medium',
        message: `平均响应时间过长: ${this.statistics.avgResponseTime.toFixed(0)}ms`
      })
    }
    
    return anomalies
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(): {
    cacheSize: number
    memoryUsage: number
    hitRate: number
    averageResponseTime: number
    anomalies: Array<{type: string, severity: 'low' | 'medium' | 'high', message: string}>
  } {
    return {
      cacheSize: this.cache.size,
      memoryUsage: this.statistics.memoryUsage,
      hitRate: this.statistics.hitRate,
      averageResponseTime: this.statistics.avgResponseTime,
      anomalies: this.detectAnomalies()
    }
  }

  /**
   * 通用预热方法
   */
  async warmUp(data: Array<{pluginId: string, query: string, results: SearchResult[]}>): Promise<void> {
    logger.info('Cache warmup started', { itemcount: data.length })
    
    for (const item of data) {
      try {
        await this.set(item.pluginId, item.query, item.results, Date.now())
      } catch (error) {
        logger.warn('Cache warmup failed for item', { pluginId: item.pluginId, query: item.query, error })
      }
    }
    
    logger.info('Cache warmup completed', { itemCount: data.length })
  }

  /**
   * 错误处理
   */
  onError(handler: (error: Error) => void): void {
    // 简单的错误处理机制
    this.errorHandler = handler
  }

  private errorHandler: (error: Error) => void = (error) => {
    logger.error('Cache error', error)
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