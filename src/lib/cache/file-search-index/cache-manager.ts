/**
 * 缓存管理模块
 */

import type { EnhancedSearchResult } from './interfaces'

/**
 * 搜索缓存管理器
 */
export class SearchCacheManager {
  private cache = new Map<string, EnhancedSearchResult[]>()
  private maxSize: number
  private cleanupThreshold: number

  constructor(maxSize: number = 1000, cleanupThreshold: number = 0.3) {
    this.maxSize = maxSize
    this.cleanupThreshold = cleanupThreshold
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(query: string, options: any): string {
    return `${query}:${JSON.stringify(options)}`
  }

  /**
   * 获取缓存结果
   */
  get(query: string, options: any): EnhancedSearchResult[] | null {
    const cacheKey = this.generateCacheKey(query, options)
    return this.cache.get(cacheKey) || null
  }

  /**
   * 设置缓存结果
   */
  set(query: string, options: any, results: EnhancedSearchResult[]): void {
    const cacheKey = this.generateCacheKey(query, options)
    
    // 检查缓存大小，必要时清理
    if (this.cache.size >= this.maxSize) {
      this.cleanup()
    }
    
    this.cache.set(cacheKey, results)
  }

  /**
   * 清理缓存（LRU策略的简化实现）
   */
  private cleanup(): void {
    const keys = Array.from(this.cache.keys())
    const toRemove = keys.slice(0, Math.floor(keys.length * this.cleanupThreshold))
    
    for (const key of toRemove) {
      this.cache.delete(key)
    }
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存统计
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    }
  }
}

/**
 * 全局搜索缓存实例
 */
export const searchCacheManager = new SearchCacheManager()