/**
 * 智能缓存系统
 * 基于使用模式和机器学习的预测缓存策略
 */

import type { SearchResultItemItem } from '../search-plugins'
import { searchCache } from './search-cache'
import { logger } from '../logger'

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
 * 智能缓存配置
 */
export interface IntelligentCacheConfig {
  /** 是否启用智能缓存 */
  enabled: boolean
  /** 学习周期（小时） */
  learningPeriod: number
  /** 预测阈值 */
  predictionThreshold: number
  /** 最大预测查询数 */
  maxPredictions: number
  /** 自适应TTL */
  adaptiveTTL: boolean
  /** 最小TTL（毫秒） */
  minTTL: number
  /** 最大TTL（毫秒） */
  maxTTL: number
}

/**
 * 智能缓存管理器
 */
export class IntelligentCache {
  private config: IntelligentCacheConfig
  private usagePatterns: UsagePattern
  private predictionModel: Map<string, number[]> = new Map()
  private isLearning = false

  constructor(config: Partial<IntelligentCacheConfig> = {}) {
    this.config = {
      enabled: true,
      learningPeriod: 24, // 24小时学习周期
      predictionThreshold: 0.7,
      maxPredictions: 50,
      adaptiveTTL: true,
      minTTL: 60 * 1000, // 1分钟
      maxTTL: 30 * 60 * 1000 // 30分钟
    }

    this.usagePatterns = {
      queryFrequency: new Map(),
      timePatterns: new Map(),
      pluginWeights: new Map(),
      resultSizePatterns: new Map(),
      lastUsed: new Map()
    }

    // 从本地存储加载学习数据
    this.loadLearningData()
  }

  /**
   * 记录搜索使用
   */
  async recordSearch(
    pluginId: string, 
    query: string, 
    results: SearchResultItem[], 
    responseTime: number
  ): Promise<void> {
    if (!this.config.enabled) return

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
    if (!this.config.enabled) return []

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
      .slice(0, this.config.maxPredictions)
  }

  /**
   * 获取缓存策略建议
   */
  async getCacheStrategy(
    pluginId: string, 
    query: string, 
    results: SearchResultItem[]
  ): Promise<CacheStrategy> {
    if (!this.config.enabled) {
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
    if (this.config.adaptiveTTL) {
      suggestedTTL = this.config.minTTL + 
        (this.config.maxTTL - this.config.minTTL) * score
    }

    // 生成策略建议
    const strategy: CacheStrategy = {
      name: score > this.config.predictionThreshold ? 'aggressive' : 'conservative',
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
    results: SearchResultItem[], 
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
    results: SearchResultItem[], 
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
   * 预热智能缓存
   */
  async intelligentWarmup(
    pluginId: string,
    searchFunction: (query: string) => Promise<SearchResultItem[]>
  ): Promise<void> {
    if (!this.config.enabled) return

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
    searchFunction: (query: string) => Promise<SearchResultItem[]>,
    delay: number
  ): Promise<void> {
    for (const { query } of queries) {
      try {
        const results = await searchFunction(query)
        const strategy = await this.getCacheStrategy(pluginId, query, results)
        
        // 使用建议的TTL
        await searchCache.set(pluginId, query, results, Date.now())
        
        await new Promise(resolve => setTimeout(resolve, delay))
      } catch (error) {
        logger.warn('Intelligent warmup failed', { query, error })
      }
    }
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

      localStorage.setItem('intelligent-cache-data', JSON.stringify(data))
    } catch (error) {
      logger.warn('Failed to save learning data', error)
    }
  }

  /**
   * 加载学习数据
   */
  private loadLearningData(): void {
    try {
      const data = localStorage.getItem('intelligent-cache-data')
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
      localStorage.removeItem('intelligent-cache-data')
    } catch (error) {
      logger.warn('Failed to clear learning data from storage', error)
    }

    logger.info('Learning data cleared')
  }

  /**
   * 销毁智能缓存
   */
  destroy(): void {
    this.saveLearningData()
    this.clearLearningData()
  }
}

/**
 * 全局智能缓存实例
 */
export const intelligentCache = new IntelligentCache()

/**
 * Vue组合式函数：使用智能缓存
 */
export function useIntelligentCache() {
  const recordSearch = (
    pluginId: string, 
    query: string, 
    results: SearchResultItem[], 
    responseTime: number
  ) => intelligentCache.recordSearch(pluginId, query, results, responseTime)

  const predictHotQueries = (pluginId?: string) => intelligentCache.predictHotQueries(pluginId)
  const getCacheStrategy = (
    pluginId: string, 
    query: string, 
    results: SearchResultItem[]
  ) => intelligentCache.getCacheStrategy(pluginId, query, results)

  const intelligentWarmup = (
    pluginId: string,
    searchFunction: (query: string) => Promise<SearchResultItem[]>
  ) => intelligentCache.intelligentWarmup(pluginId, searchFunction)

  const getLearningReport = () => intelligentCache.getLearningReport()
  const clearLearningData = () => intelligentCache.clearLearningData()

  return {
    recordSearch,
    predictHotQueries,
    getCacheStrategy,
    intelligentWarmup,
    getLearningReport,
    clearLearningData,
    cache: intelligentCache
  }
}