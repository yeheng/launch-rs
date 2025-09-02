/**
 * 搜索引擎模块
 */

import type { IndexEntry } from './types'
import type { 
  EnhancedSearchResult, 
  SearchOptions, 
  IndexConfig, 
  IndexStatistics 
} from './interfaces'
import { 
  calculateEnhancedRelevance,
  calculateRecommendationScore,
  estimateOpenTime
} from './scoring'
import { 
  determineSearchStrategy,
  determineMatchType,
  findMatchPositions,
  getMatchedFields
} from './matching'
import { searchCacheManager } from './cache-manager'
import { getContentSnippet } from './utils'
import { logger } from '../../logger'
import { searchCache } from '../search-cache'

/**
 * 文件搜索引擎
 */
export class FileSearchEngine {
  private index: Map<string, IndexEntry>
  private config: IndexConfig
  private statistics: IndexStatistics

  constructor(index: Map<string, IndexEntry>, config: IndexConfig, statistics: IndexStatistics) {
    this.index = index
    this.config = config
    this.statistics = statistics
  }

  /**
   * 执行搜索
   */
  async search(query: string, options: SearchOptions = {}): Promise<EnhancedSearchResult[]> {
    const startTime = Date.now()

    // 检查缓存
    const cached = searchCacheManager.get(query, options)
    if (cached) {
      this.updateCacheHitRate()
      return cached
    }

    const {
      maxResults = 50,
      searchType = 'smart',
      includeContent = false,
      sortBy = 'recommendation',
      sortOrder = 'desc',
      typeFilter,
      enableCache = true
    } = options

    // 检查全局缓存
    if (enableCache) {
      const cachedResults = await searchCache.get('file-search', query, options)
      if (cachedResults) {
        return cachedResults as EnhancedSearchResult[]
      }
    }

    const results: EnhancedSearchResult[] = []
    const normalizedQuery = query.toLowerCase().trim()

    // 智能搜索策略
    const searchStrategy = determineSearchStrategy(searchType, normalizedQuery)
    
    // 并行搜索索引以提高性能
    const searchPromises = Array.from(this.index.values())
      .filter(entry => !typeFilter || typeFilter.includes(entry.category))
      .map(async (entry) => {
        const result = await this.evaluateSearchResult(entry, normalizedQuery, searchStrategy, includeContent)
        return result
      })

    const searchResults = await Promise.allSettled(searchPromises)
    
    for (const result of searchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value)
      }
    }

    // 智能排序和推荐
    this.sortResults(results, sortBy, sortOrder)

    // 限制结果数量
    const finalResults = results.slice(0, maxResults)

    // 缓存结果
    if (enableCache) {
      await searchCache.set('file-search', query, finalResults, Date.now() - startTime, options)
      searchCacheManager.set(query, options, finalResults)
    }

    // 更新统计信息
    this.updateSearchStatistics(Date.now() - startTime)

    return finalResults
  }

  /**
   * 评估单个搜索结果
   */
  private async evaluateSearchResult(
    entry: IndexEntry,
    query: string,
    strategy: 'fuzzy' | 'exact' | 'prefix' | 'hybrid',
    includeContent: boolean
  ): Promise<EnhancedSearchResult | null> {
    const score = calculateEnhancedRelevance(entry, query, strategy, this.config)
    
    if (score <= 0) {
      return null
    }

    const matchedFields = getMatchedFields(entry, query, strategy)
    const matchType = determineMatchType(entry, query, strategy)
    const matchPositions = findMatchPositions(entry, query, strategy)
    const estimatedOpenTime = estimateOpenTime(entry)
    const recommendationScore = calculateRecommendationScore(entry, query)

    return {
      entry,
      score,
      matchedFields,
      contentSnippet: includeContent ? await getContentSnippet(entry.path, query) : undefined,
      matchType,
      matchPositions,
      estimatedOpenTime,
      recommendationScore
    }
  }

  /**
   * 排序结果
   */
  private sortResults(
    results: EnhancedSearchResult[], 
    sortBy: 'relevance' | 'name' | 'modified' | 'size' | 'recommendation',
    sortOrder: 'asc' | 'desc'
  ): void {
    results.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'relevance':
          comparison = a.score - b.score
          break
        case 'name':
          comparison = a.entry.name.localeCompare(b.entry.name)
          break
        case 'modified':
          comparison = a.entry.modifiedTime - b.entry.modifiedTime
          break
        case 'size':
          comparison = a.entry.size - b.entry.size
          break
        case 'recommendation':
          // 综合排序：相关性 + 推荐分数 + 访问频率
          const aTotalScore = a.score + a.recommendationScore + Math.log(a.entry.accessCount + 1) * 5
          const bTotalScore = b.score + b.recommendationScore + Math.log(b.entry.accessCount + 1) * 5
          comparison = aTotalScore - bTotalScore
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  /**
   * 更新搜索统计信息
   */
  private updateSearchStatistics(searchTime: number): void {
    this.statistics.searchCount++
    this.statistics.averageSearchTime = 
      (this.statistics.averageSearchTime * (this.statistics.searchCount - 1) + searchTime) / 
      this.statistics.searchCount
  }

  /**
   * 更新缓存命中率
   */
  private updateCacheHitRate(): void {
    this.statistics.cacheHitRate = 
      (this.statistics.cacheHitRate * this.statistics.searchCount + 1) / 
      (this.statistics.searchCount + 1)
  }

  /**
   * 更新条目访问信息
   */
  updateAccessInfo(filePath: string): void {
    const entry = this.index.get(filePath)
    if (entry) {
      entry.accessCount++
      entry.lastAccessed = Date.now()
    }
  }

  /**
   * 获取搜索统计
   */
  getSearchStatistics(): IndexStatistics {
    return { ...this.statistics }
  }
}