/**
 * 优化的文件搜索索引系统
 * 集成缓存、智能搜索和性能优化
 * 重构后的模块化版本
 */

// 导入类型
import type {
  IndexEntry,
  FileType,
  SearchStrategy,
  DirectoryEntry
} from './types'

import type {
  IndexConfig,
  SearchOptions,
  EnhancedSearchResult,
  IndexStatistics,
  SearchConfig
} from './interfaces'

import { IndexManager } from './index-manager'
import { FileSearchEngine } from './search-engine'
import { SearchCacheManager } from './cache-manager'

/**
 * 文件搜索索引管理器（重构后）
 */
export class FileSearchIndex {
  private config: IndexConfig
  private indexManager: IndexManager
  private searchEngine: FileSearchEngine
  private cacheManager: SearchCacheManager
  private statistics: IndexStatistics
  private updateTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<IndexConfig> = {}) {
    this.config = this.getDefaultConfig(config)
    this.indexManager = new IndexManager(this.config)
    this.cacheManager = new SearchCacheManager()
    
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

    // 初始化搜索引擎
    this.searchEngine = new FileSearchEngine(
      this.indexManager.getIndex(),
      this.config,
      this.statistics
    )

    // 启动自动更新
    this.startAutoUpdate()
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(userConfig: Partial<IndexConfig>): IndexConfig {
    return {
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
      ...userConfig
    }
  }

  /**
   * 构建索引
   */
  async buildIndex(rootPath: string = process.cwd()): Promise<void> {
    const startTime = Date.now()

    try {
      await this.indexManager.buildIndex(rootPath)

      // 更新统计信息
      const indexTime = Date.now() - startTime
      const indexStats = this.indexManager.getIndexStatistics()
      
      this.statistics.lastUpdated = Date.now()
      this.statistics.averageIndexTime = 
        (this.statistics.averageIndexTime + indexTime) / 2
      this.statistics.totalFiles = indexStats.totalFiles || 0
      this.statistics.totalDirectories = indexStats.totalDirectories || 0
      this.statistics.indexSize = indexStats.indexSize || 0

      // 更新搜索引擎的索引引用
      this.searchEngine = new FileSearchEngine(
        this.indexManager.getIndex(),
        this.config,
        this.statistics
      )

      logger.info('文件搜索索引构建完成', {
        totalFiles: this.statistics.totalFiles,
        totalDirectories: this.statistics.totalDirectories,
        indexTime: `${indexTime}ms`,
        indexSize: `${(this.statistics.indexSize / 1024 / 1024).toFixed(2)}MB`
      })
    } catch (error) {
      const appError = handlePluginError('构建文件索引', error)
      logger.error('构建文件索引失败', appError)
      throw error
    }
  }

  /**
   * 搜索文件 - 优化版本
   */
  async search(query: string, options: SearchOptions = {}): Promise<EnhancedSearchResult[]> {
    try {
      return await this.searchEngine.search(query, options)
    } catch (error) {
      const appError = handlePluginError('文件搜索', error)
      logger.error('文件搜索失败', appError)
      return []
    }
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
    const searchStats = this.searchEngine.getSearchStatistics()
    return {
      ...this.statistics,
      ...searchStats
    }
  }

  /**
   * 更新条目访问信息
   */
  updateAccessInfo(filePath: string): void {
    this.searchEngine.updateAccessInfo(filePath)
  }

  /**
   * 清除索引
   */
  clearIndex(): void {
    this.indexManager.clearIndex()
    this.cacheManager.clear()
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

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<IndexConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.indexManager.updateConfig(newConfig)
    // 重新初始化搜索引擎
    this.searchEngine = new FileSearchEngine(
      this.indexManager.getIndex(),
      this.config,
      this.statistics
    )
  }

  /**
   * 获取索引管理器（用于高级操作）
   */
  getIndexManager(): IndexManager {
    return this.indexManager
  }

  /**
   * 获取搜索引擎（用于高级操作）
   */
  getSearchEngine(): FileSearchEngine {
    return this.searchEngine
  }

  /**
   * 获取缓存管理器（用于高级操作）
   */
  getCacheManager(): SearchCacheManager {
    return this.cacheManager
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
  const search = (query: string, options?: SearchOptions) => fileSearchIndex.search(query, options)
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

// 重新导出所有类型和接口，保持向后兼容性
export type {
  IndexEntry,
  FileType,
  SearchStrategy,
  DirectoryEntry
} from './types'

export type {
  IndexConfig,
  SearchOptions,
  EnhancedSearchResult,
  IndexStatistics,
  SearchConfig
} from './interfaces'

export { IndexManager } from './index-manager'
export { FileSearchEngine } from './search-engine'
export { SearchCacheManager } from './cache-manager'