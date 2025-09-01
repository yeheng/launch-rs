/**
 * 优化的文件搜索索引系统
 * 集成缓存、智能搜索和性能优化
 */

import { logger } from '../logger'
import { handlePluginError } from '../error-handler'
import { searchCache } from './search-cache'

/**
 * 索引条目接口
 */
export interface IndexEntry {
  /** 文件路径 */
  path: string
  /** 文件名 */
  name: string
  /** 文件扩展名 */
  extension: string
  /** 文件大小（字节） */
  size: number
  /** 修改时间 */
  modifiedTime: number
  /** 文件类型 */
  type: 'file' | 'directory'
  /** 权限标记 */
  permissions?: string
  /** 文件所有者 */
  owner?: string
  /** 文件组 */
  group?: string
  /** 内容哈希（用于重复检测） */
  contentHash?: string
  /** 文件标签/关键词 */
  tags: string[]
  /** 访问频率 */
  accessCount: number
  /** 最后访问时间 */
  lastAccessed: number
  /** 文件类型分类 */
  category: FileType
  /** 搜索权重 */
  weight: number
}

/**
 * 文件类型分类
 */
export enum FileType {
  DOCUMENT = 'document',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  CODE = 'code',
  ARCHIVE = 'archive',
  EXECUTABLE = 'executable',
  SYSTEM = 'system',
  OTHER = 'other'
}

/**
 * 搜索策略枚举
 */
export enum SearchStrategy {
  EXACT = 'exact',
  PREFIX = 'prefix', 
  FUZZY = 'fuzzy',
  HYBRID = 'hybrid'
}

/**
 * 搜索配置接口
 */
export interface SearchConfig {
  /** 最大结果数 */
  maxResults: number
  /** 搜索深度 */
  searchDepth: number
  /** 是否包含隐藏文件 */
  includeHidden: boolean
  /** 搜索权重配置 */
  searchWeights: {
    exactWeight: number
    prefixWeight: number
    containWeight: number
    fuzzyWeight: number
    accessWeight: number
    recentWeight: number
    sizeWeight: number
    typeWeight: number
  }
  /** 性能配置 */
  performance: {
    enableParallel: boolean
    maxParallelSearches: number
    enableCache: boolean
    cacheSize: number
    indexUpdateInterval: number
    maxMemoryUsage: number
  }
  /** 搜索策略 */
  searchStrategy: SearchStrategy
}

/**
 * 索引配置
 */
export interface IndexConfig {
  /** 索引更新间隔（毫秒） */
  updateInterval: number
  /** 最大索引条目数 */
  maxEntries: number
  /** 索引深度 */
  maxDepth: number
  /** 包含的文件扩展名 */
  includedExtensions: string[]
  /** 排除的文件扩展名 */
  excludedExtensions: string[]
  /** 排除的目录 */
  excludedDirectories: string[]
  /** 是否启用内容索引 */
  enableContentIndex: boolean
  /** 内容索引的最小文件大小 */
  contentIndexMinSize: number
  /** 内容索引的最大文件大小 */
  contentIndexMaxSize: number
  /** 搜索优化配置 */
  search: {
    /** 模糊搜索阈值 */
    fuzzyThreshold: number
    /** 前缀匹配权重 */
    prefixWeight: number
    /** 包含匹配权重 */
    containWeight: number
    /** 类型偏好权重 */
    typePreferenceWeight: number
    /** 访问频率权重 */
    accessWeight: number
    /** 智能预测权重 */
    predictionWeight: number
  }
  /** 性能优化 */
  performance: {
    /** 并发索引数量 */
    concurrentIndexing: number
    /** 批量处理大小 */
    batchSize: number
    /** 内存限制（MB） */
    memoryLimit: number
    /** 启用压缩 */
    enableCompression: boolean
  }
}

/**
 * 增强的搜索结果
 */
export interface EnhancedSearchResult {
  /** 索引条目 */
  entry: IndexEntry
  /** 相关性分数 */
  score: number
  /** 匹配的字段 */
  matchedFields: string[]
  /** 内容片段（如果启用内容索引） */
  contentSnippet?: string
  /** 匹配类型 */
  matchType: 'exact' | 'prefix' | 'contain' | 'fuzzy'
  /** 匹配位置 */
  matchPositions: Array<{ start: number; end: number }>
  /** 预估打开时间 */
  estimatedOpenTime: number
  /** 智能推荐分数 */
  recommendationScore: number
}

/**
 * 索引统计
 */
export interface IndexStatistics {
  /** 总文件数 */
  totalFiles: number
  /** 总目录数 */
  totalDirectories: number
  /** 索引大小（字节） */
  indexSize: number
  /** 最后更新时间 */
  lastUpdated: number
  /** 平均索引时间 */
  averageIndexTime: number
  /** 搜索次数 */
  searchCount: number
  /** 平均搜索时间 */
  averageSearchTime: number
  /** 缓存命中率 */
  cacheHitRate: number
  /** 索引健康度 */
  healthScore: number
}

/**
 * 文件搜索索引管理器
 */
export class FileSearchIndex {
  private config: IndexConfig
  private index = new Map<string, IndexEntry>()
  private searchCache = new Map<string, FileSearchResult[]>()
  private statistics: IndexStatistics
  private updateTimer: NodeJS.Timeout | null = null
  private isIndexing = false

  constructor(config: Partial<IndexConfig> = {}) {
    this.config = {
      updateInterval: 5 * 60 * 1000, // 5分钟
      maxEntries: 100000,
      maxDepth: 5,
      includedExtensions: [],
      excludedExtensions: ['.tmp', '.log', '.cache', '.DS_Store'],
      excludedDirectories: ['.git', 'node_modules', '.idea', '.vscode', 'dist', 'build'],
      enableContentIndex: true,
      contentIndexMinSize: 1024, // 1KB
      contentIndexMaxSize: 1024 * 1024 * 10, // 10MB
      search: {
        fuzzyThreshold: 0.6,
        prefixWeight: 1.0,
        containWeight: 0.7,
        typePreferenceWeight: 0.3,
        accessWeight: 0.2,
        predictionWeight: 0.4
      },
      performance: {
        concurrentIndexing: 3,
        batchSize: 100,
        memoryLimit: 50,
        enableCompression: true
      },
      ...config
    }

    this.statistics = {
      totalFiles: 0,
      totalDirectories: 0,
      indexSize: 0,
      lastUpdated: 0,
      averageIndexTime: 0,
      searchCount: 0,
      averageSearchTime: 0,
      cacheHitRate: 0,
      healthScore: 100
    }

    // 启动自动更新
    this.startAutoUpdate()
  }

  /**
   * 构建索引
   */
  async buildIndex(rootPath: string = process.cwd()): Promise<void> {
    if (this.isIndexing) {
      logger.warn('索引构建已在进行中')
      return
    }

    this.isIndexing = true
    const startTime = Date.now()

    try {
      logger.info('开始构建文件搜索索引', { rootPath })

      // 清空现有索引
      this.index.clear()

      // 递归构建索引
      await this.indexDirectory(rootPath, 0)

      // 更新统计信息
      const indexTime = Date.now() - startTime
      this.statistics.lastUpdated = Date.now()
      this.statistics.averageIndexTime = 
        (this.statistics.averageIndexTime + indexTime) / 2
      this.statistics.totalFiles = Array.from(this.index.values())
        .filter(entry => entry.type === 'file').length
      this.statistics.totalDirectories = Array.from(this.index.values())
        .filter(entry => entry.type === 'directory').length
      this.statistics.indexSize = this.calculateIndexSize()

      logger.info('文件搜索索引构建完成', {
        totalFiles: this.statistics.totalFiles,
        totalDirectories: this.statistics.totalDirectories,
        indexTime: `${indexTime}ms`,
        indexSize: `${(this.statistics.indexSize / 1024 / 1024).toFixed(2)}MB`
      })
    } catch (error) {
      const appError = handlePluginError('构建文件索引', error)
      logger.error('构建文件索引失败', appError)
    } finally {
      this.isIndexing = false
    }
  }

  /**
   * 递归索引目录
   */
  private async indexDirectory(dirPath: string, depth: number): Promise<void> {
    if (depth > this.config.maxDepth) {
      return
    }

    try {
      // 这里应该使用实际的文件系统API
      // 由于在浏览器环境中，我们需要通过Tauri命令来访问文件系统
      // 这里提供一个模拟实现

      const entries = await this.getDirectoryEntries(dirPath)

      for (const entry of entries) {
        const fullPath = `${dirPath}/${entry.name}`

        // 检查是否应该排除
        if (this.shouldExclude(entry.name, fullPath, entry.type)) {
          continue
        }

        const indexEntry: IndexEntry = {
          path: fullPath,
          name: entry.name,
          extension: entry.type === 'file' ? this.getExtension(entry.name) : '',
          size: entry.size || 0,
          modifiedTime: entry.modifiedTime || Date.now(),
          type: entry.type,
          permissions: entry.permissions,
          owner: entry.owner,
          group: entry.group,
          tags: this.generateTags(entry),
          accessCount: 0,
          lastAccessed: 0
        }

        // 内容索引
        if (entry.type === 'file' && this.config.enableContentIndex) {
          if (entry.size >= this.config.contentIndexMinSize && 
              entry.size <= this.config.contentIndexMaxSize) {
            indexEntry.contentHash = await this.generateContentHash(fullPath)
          }
        }

        this.index.set(fullPath, indexEntry)

        // 递归索引子目录
        if (entry.type === 'directory') {
          await this.indexDirectory(fullPath, depth + 1)
        }
      }
    } catch (error) {
      logger.warn(`索引目录失败: ${dirPath}`, error)
    }
  }

  /**
   * 搜索文件 - 优化版本
   */
  async search(query: string, options: {
    maxResults?: number
    searchType?: 'fuzzy' | 'exact' | 'prefix' | 'smart'
    includeContent?: boolean
    sortBy?: 'relevance' | 'name' | 'modified' | 'size' | 'recommendation'
    sortOrder?: 'asc' | 'desc'
    typeFilter?: FileType[]
    enableCache?: boolean
  } = {}): Promise<EnhancedSearchResult[]> {
    const startTime = Date.now()

    // 检查缓存
    const cacheKey = this.generateCacheKey(query, options)
    const cached = this.searchCache.get(cacheKey)
    if (cached) {
      this.statistics.cacheHitRate = 
        (this.statistics.cacheHitRate * this.statistics.searchCount + 1) / 
        (this.statistics.searchCount + 1)
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
    const searchStrategy = this.determineSearchStrategy(searchType, normalizedQuery)
    
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
    }

    // 更新统计信息
    const searchTime = Date.now() - startTime
    this.statistics.searchCount++
    this.statistics.averageSearchTime = 
      (this.statistics.averageSearchTime * (this.statistics.searchCount - 1) + searchTime) / 
      this.statistics.searchCount

    // 缓存结果
    this.searchCache.set(cacheKey, finalResults)
    // 限制缓存大小
    if (this.searchCache.size > 1000) {
      this.cleanupSearchCache()
    }

    return finalResults
  }

  /**
   * 确定搜索策略
   */
  private determineSearchStrategy(
    searchType: 'fuzzy' | 'exact' | 'prefix' | 'smart',
    query: string
  ): 'fuzzy' | 'exact' | 'prefix' | 'hybrid' {
    if (searchType !== 'smart') {
      return searchType
    }

    // 智能策略选择
    if (query.length <= 2) {
      return 'prefix' // 短查询使用前缀匹配
    } else if (query.includes('.') && query.startsWith('.')) {
      return 'exact' // 扩展名查询使用精确匹配
    } else if (query.includes(' ') || query.length > 10) {
      return 'fuzzy' // 复杂查询使用模糊匹配
    } else {
      return 'hybrid' // 混合策略
    }
  }

  /**
   * 评估搜索结果
   */
  private async evaluateSearchResult(
    entry: IndexEntry,
    query: string,
    strategy: 'fuzzy' | 'exact' | 'prefix' | 'hybrid',
    includeContent: boolean
  ): Promise<EnhancedSearchResult | null> {
    const score = await this.calculateEnhancedRelevance(entry, query, strategy, includeContent)
    
    if (score <= 0) {
      return null
    }

    const matchedFields = this.getMatchedFields(entry, query, strategy)
    const matchType = this.determineMatchType(entry, query, strategy)
    const matchPositions = this.findMatchPositions(entry, query, strategy)
    const estimatedOpenTime = this.estimateOpenTime(entry)
    const recommendationScore = this.calculateRecommendationScore(entry, query)

    return {
      entry,
      score,
      matchedFields,
      contentSnippet: includeContent ? await this.getContentSnippet(entry.path, query) : undefined,
      matchType,
      matchPositions,
      estimatedOpenTime,
      recommendationScore
    }
  }

  /**
   * 计算增强的相关性分数
   */
  private async calculateEnhancedRelevance(
    entry: IndexEntry,
    query: string,
    strategy: 'fuzzy' | 'exact' | 'prefix' | 'hybrid',
    includeContent: boolean
  ): Promise<number> {
    let score = 0

    switch (strategy) {
      case 'exact':
        score += this.calculateExactMatchScore(entry, query)
        break
      case 'prefix':
        score += this.calculatePrefixMatchScore(entry, query)
        break
      case 'fuzzy':
        score += this.calculateFuzzyMatchScore(entry, query)
        break
      case 'hybrid':
        score += Math.max(
          this.calculateExactMatchScore(entry, query),
          this.calculatePrefixMatchScore(entry, query),
          this.calculateFuzzyMatchScore(entry, query) * 0.8
        )
        break
    }

    // 应用权重调整
    score += this.calculateWeightBonus(entry)
    score += this.calculateRecencyBonus(entry)
    score += this.calculateTypePreferenceBonus(entry)

    return Math.round(score * 100) / 100
  }

  /**
   * 计算精确匹配分数
   */
  private calculateExactMatchScore(entry: IndexEntry, query: string): number {
    let score = 0
    const nameLower = entry.name.toLowerCase()
    
    if (nameLower === query) {
      score += 100
    }
    
    // 扩展名匹配
    if (query.startsWith('.') && entry.extension === query.substring(1)) {
      score += 90
    }
    
    return score
  }

  /**
   * 计算前缀匹配分数
   */
  private calculatePrefixMatchScore(entry: IndexEntry, query: string): number {
    let score = 0
    const nameLower = entry.name.toLowerCase()
    
    if (nameLower.startsWith(query)) {
      score += 80 * this.config.search.prefixWeight
    }
    
    // 路径前缀匹配
    const pathLower = entry.path.toLowerCase()
    if (pathLower.includes(query)) {
      score += 40
    }
    
    return score
  }

  /**
   * 计算模糊匹配分数
   */
  private calculateFuzzyMatchScore(entry: IndexEntry, query: string): number {
    let score = 0
    const nameLower = entry.name.toLowerCase()
    
    if (nameLower.includes(query)) {
      score += 60 * this.config.search.containWeight
    }
    
    // 计算编辑距离分数
    const distance = this.calculateLevenshteinDistance(nameLower, query)
    const maxLength = Math.max(nameLower.length, query.length)
    const similarity = 1 - (distance / maxLength)
    
    if (similarity >= this.config.search.fuzzyThreshold) {
      score += similarity * 50
    }
    
    return score
  }

  /**
   * 计算编辑距离
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * 计算权重奖励
   */
  private calculateWeightBonus(entry: IndexEntry): number {
    let bonus = 0
    
    // 访问频率权重
    bonus += Math.log(entry.accessCount + 1) * this.config.search.accessWeight
    
    // 文件类型偏好权重
    if (entry.category === FileType.DOCUMENT || entry.category === FileType.CODE) {
      bonus += 5 * this.config.search.typePreferenceWeight
    }
    
    return bonus
  }

  /**
   * 计算时间性奖励
   */
  private calculateRecencyBonus(entry: IndexEntry): number {
    const recency = Math.max(0, 1 - (Date.now() - entry.lastAccessed) / (30 * 24 * 60 * 60 * 1000))
    return recency * 10
  }

  /**
   * 计算类型偏好奖励
   */
  private calculateTypePreferenceBonus(entry: IndexEntry): number {
    const preferences = {
      [FileType.DOCUMENT]: 8,
      [FileType.CODE]: 7,
      [FileType.IMAGE]: 5,
      [FileType.OTHER]: 3
    }
    
    return preferences[entry.category] || 0
  }

  /**
   * 确定匹配类型
   */
  private determineMatchType(
    entry: IndexEntry,
    query: string,
    strategy: string
  ): EnhancedSearchResult['matchType'] {
    const nameLower = entry.name.toLowerCase()
    
    if (nameLower === query) {
      return 'exact'
    } else if (nameLower.startsWith(query)) {
      return 'prefix'
    } else if (nameLower.includes(query)) {
      return 'contain'
    } else {
      return 'fuzzy'
    }
  }

  /**
   * 查找匹配位置
   */
  private findMatchPositions(
    entry: IndexEntry,
    query: string,
    strategy: string
  ): Array<{ start: number; end: number }> {
    const positions: Array<{ start: number; end: number }> = []
    const nameLower = entry.name.toLowerCase()
    const queryLower = query.toLowerCase()
    
    let index = 0
    while ((index = nameLower.indexOf(queryLower, index)) !== -1) {
      positions.push({ start: index, end: index + queryLower.length })
      index += queryLower.length
    }
    
    return positions
  }

  /**
   * 估算打开时间
   */
  private estimateOpenTime(entry: IndexEntry): number {
    if (entry.type === 'directory') return 50
    
    if (entry.size < 1024 * 1024) return 100
    if (entry.size < 10 * 1024 * 1024) return 200
    if (entry.size < 100 * 1024 * 1024) return 500
    return 1000
  }

  /**
   * 计算推荐分数
   */
  private calculateRecommendationScore(entry: IndexEntry, query: string): number {
    let score = 0
    
    // 基于访问频率
    score += Math.min(entry.accessCount * 2, 20)
    
    // 基于文件类型和查询的相关性
    if (entry.category === FileType.DOCUMENT && query.includes('doc')) {
      score += 15
    }
    if (entry.category === FileType.CODE && query.includes('code')) {
      score += 15
    }
    
    // 基于文件名模式
    if (entry.name.toLowerCase().includes('readme') && query.includes('read')) {
      score += 10
    }
    
    return score
  }

  /**
   * 计算相关性分数
   */
  private calculateRelevance(
    entry: IndexEntry, 
    query: string, 
    searchType: 'fuzzy' | 'exact' | 'prefix',
    includeContent: boolean
  ): number {
    let score = 0

    // 文件名匹配
    const nameLower = entry.name.toLowerCase()
    if (searchType === 'exact' && nameLower === query) {
      score += 100
    } else if (searchType === 'prefix' && nameLower.startsWith(query)) {
      score += 80
    } else if (searchType === 'fuzzy' && nameLower.includes(query)) {
      score += 60
    }

    // 扩展名匹配
    if (query.startsWith('.') && entry.extension === query.substring(1)) {
      score += 90
    }

    // 路径匹配
    const pathLower = entry.path.toLowerCase()
    if (pathLower.includes(query)) {
      score += 40
    }

    // 标签匹配
    for (const tag of entry.tags) {
      if (tag.toLowerCase().includes(query)) {
        score += 30
      }
    }

    // 访问频率加权
    score += Math.log(entry.accessCount + 1) * 5

    // 最近访问加权
    const recency = Math.max(0, 1 - (Date.now() - entry.lastAccessed) / (30 * 24 * 60 * 60 * 1000))
    score += recency * 10

    // 文件大小加权（偏好中等大小的文件）
    if (entry.size > 0) {
      const sizeLog = Math.log(entry.size)
      const optimalSize = Math.log(1024 * 1024) // 1MB
      const sizeScore = Math.max(0, 1 - Math.abs(sizeLog - optimalSize) / optimalSize)
      score += sizeScore * 5
    }

    return Math.round(score * 100) / 100
  }

  /**
   * 获取匹配的字段
   */
  private getMatchedFields(
    entry: IndexEntry, 
    query: string, 
    searchType: 'fuzzy' | 'exact' | 'prefix'
  ): string[] {
    const fields: string[] = []

    if (entry.name.toLowerCase().includes(query)) {
      fields.push('name')
    }

    if (entry.path.toLowerCase().includes(query)) {
      fields.push('path')
    }

    if (entry.extension.toLowerCase().includes(query)) {
      fields.push('extension')
    }

    for (const tag of entry.tags) {
      if (tag.toLowerCase().includes(query)) {
        fields.push('tags')
        break
      }
    }

    return fields
  }

  /**
   * 排序结果 - 增强版本
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
   * 生成缓存键
   */
  private generateCacheKey(query: string, options: any): string {
    return `${query}:${JSON.stringify(options)}`
  }

  /**
   * 清理搜索缓存
   */
  private cleanupSearchCache(): void {
    // 简单的LRU策略：删除最旧的条目
    const keys = Array.from(this.searchCache.keys())
    const toRemove = keys.slice(0, Math.floor(keys.length * 0.3))
    
    for (const key of toRemove) {
      this.searchCache.delete(key)
    }
  }

  /**
   * 计算索引大小
   */
  private calculateIndexSize(): number {
    // 简化计算：每个条目约500字节
    return this.index.size * 500
  }

  /**
   * 获取目录条目（模拟实现）
   */
  private async getDirectoryEntries(dirPath: string): Promise<Array<{
    name: string
    type: 'file' | 'directory'
    size?: number
    modifiedTime?: number
    permissions?: string
    owner?: string
    group?: string
  }>> {
    // 在实际实现中，这里应该调用Tauri的文件系统API
    // 返回模拟数据
    return []
  }

  /**
   * 检查是否应该排除
   */
  private shouldExclude(name: string, path: string, type: 'file' | 'directory'): boolean {
    const nameLower = name.toLowerCase()

    // 检查排除的目录
    if (type === 'directory') {
      for (const excludedDir of this.config.excludedDirectories) {
        if (path.includes(excludedDir)) {
          return true
        }
      }
    }

    // 检查排除的扩展名
    if (type === 'file') {
      const extension = this.getExtension(name)
      if (this.config.excludedExtensions.includes(`.${extension}`)) {
        return true
      }

      // 检查包含的扩展名（如果指定了）
      if (this.config.includedExtensions.length > 0) {
        return !this.config.includedExtensions.includes(`.${extension}`)
      }
    }

    return false
  }

  /**
   * 获取文件扩展名
   */
  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    return lastDot === -1 ? '' : filename.substring(lastDot + 1)
  }

  /**
   * 生成标签
   */
  private generateTags(entry: {
    name: string
    type: 'file' | 'directory'
    size?: number
  }): string[] {
    const tags: string[] = []

    // 基于文件类型生成标签
    if (entry.type === 'file') {
      const extension = this.getExtension(entry.name)
      tags.push(`file:${extension || 'none'}`)

      // 基于文件大小生成标签
      if (entry.size) {
        if (entry.size < 1024) {
          tags.push('size:small')
        } else if (entry.size < 1024 * 1024) {
          tags.push('size:medium')
        } else {
          tags.push('size:large')
        }
      }
    } else {
      tags.push('type:directory')
    }

    // 基于文件名模式生成标签
    if (entry.name.includes('test')) {
      tags.push('category:test')
    }
    if (entry.name.includes('config')) {
      tags.push('category:config')
    }
    if (entry.name.includes('readme')) {
      tags.push('category:documentation')
    }

    return tags
  }

  /**
   * 生成内容哈希（模拟）
   */
  private async generateContentHash(filePath: string): Promise<string> {
    // 在实际实现中，这里应该读取文件内容并生成哈希
    return `hash_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`
  }

  /**
   * 获取内容片段（模拟）
   */
  private async getContentSnippet(filePath: string, query: string): Promise<string> {
    // 在实际实现中，这里应该搜索文件内容并返回匹配片段
    return `Content snippet for ${filePath} containing "${query}"`
  }

  /**
   * 启动自动更新
   */
  private startAutoUpdate(): void {
    this.updateTimer = setInterval(() => {
      this.buildIndex().catch(error => {
        logger.error('自动更新索引失败', error)
      })
    }, this.config.updateInterval)
  }

  /**
   * 停止自动更新
   */
  private stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics(): IndexStatistics {
    return { ...this.statistics }
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
   * 清除索引
   */
  clearIndex(): void {
    this.index.clear()
    this.searchCache.clear()
    this.statistics.totalFiles = 0
    this.statistics.totalDirectories = 0
    this.statistics.indexSize = 0
    this.statistics.lastUpdated = 0
    logger.info('文件搜索索引已清除')
  }

  /**
   * 销毁索引
   */
  destroy(): void {
    this.stopAutoUpdate()
    this.clearIndex()
    logger.info('文件搜索索引已销毁')
  }
}

/**
 * 全局文件搜索索引实例
 */
export const fileSearchIndex = new FileSearchIndex()

/**
 * Vue组合式函数：使用文件搜索索引
 */
export function useFileSearchIndex() {
  const search = (query: string, options?: any) => fileSearchIndex.search(query, options)
  const buildIndex = (rootPath?: string) => fileSearchIndex.buildIndex(rootPath)
  const getStatistics = () => fileSearchIndex.getStatistics()
  const clearIndex = () => fileSearchIndex.clearIndex()
  const updateAccessInfo = (filePath: string) => fileSearchIndex.updateAccessInfo(filePath)

  return {
    search,
    buildIndex,
    getStatistics,
    clearIndex,
    updateAccessInfo,
    index: fileSearchIndex
  }
}