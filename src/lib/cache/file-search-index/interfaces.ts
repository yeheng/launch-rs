/**
 * 文件搜索索引接口定义
 */

import type { FileType, SearchStrategy, IndexEntry } from './types'

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
 * 搜索选项
 */
export interface SearchOptions {
  /** 最大结果数 */
  maxResults?: number
  /** 搜索类型 */
  searchType?: 'fuzzy' | 'exact' | 'prefix' | 'smart'
  /** 是否包含内容 */
  includeContent?: boolean
  /** 排序方式 */
  sortBy?: 'relevance' | 'name' | 'modified' | 'size' | 'recommendation'
  /** 排序顺序 */
  sortOrder?: 'asc' | 'desc'
  /** 类型过滤器 */
  typeFilter?: FileType[]
  /** 是否启用缓存 */
  enableCache?: boolean
}