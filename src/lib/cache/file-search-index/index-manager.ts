/**
 * 索引管理器模块
 */

import type { IndexEntry, DirectoryEntry } from './types'
import type { IndexConfig, IndexStatistics } from './interfaces'
import { createIndexEntry, validateIndexEntry, calculateIndexSize } from './utils'
import { shouldExclude } from './matching'
import { logger } from '../../logger'
import { handlePluginError } from '../../error-handler'

/**
 * 索引管理器
 */
export class IndexManager {
  private config: IndexConfig
  private index: Map<string, IndexEntry>
  private isIndexing = false

  constructor(config: IndexConfig) {
    this.config = config
    this.index = new Map()
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

      logger.info('文件搜索索引构建完成', {
        totalFiles: this.getFileCount(),
        totalDirectories: this.getDirectoryCount(),
        indexTime: `${Date.now() - startTime}ms`,
        indexSize: `${(calculateIndexSize(this.index) / 1024 / 1024).toFixed(2)}MB`
      })
    } catch (error) {
      const appError = handlePluginError('构建文件索引', error)
      logger.error('构建文件索引失败', appError)
      throw error
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
      const entries = await this.getDirectoryEntries(dirPath)

      for (const entry of entries) {
        const fullPath = `${dirPath}/${entry.name}`

        // 检查是否应该排除
        if (shouldExclude(entry.name, fullPath, entry.type, {
          excludedDirectories: this.config.excludedDirectories,
          excludedExtensions: this.config.excludedExtensions,
          includedExtensions: this.config.includedExtensions
        })) {
          continue
        }

        const indexEntry = createIndexEntry(fullPath, entry, this.config)

        // 内容索引
        if (entry.type === 'file' && this.config.enableContentIndex) {
          if (entry.size >= this.config.contentIndexMinSize && 
              entry.size <= this.config.contentIndexMaxSize) {
            indexEntry.contentHash = await this.generateContentHash(fullPath)
          }
        }

        // 验证条目后添加到索引
        if (validateIndexEntry(indexEntry)) {
          this.index.set(fullPath, indexEntry)
        }

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
   * 获取目录条目（模拟实现）
   */
  private async getDirectoryEntries(dirPath: string): Promise<DirectoryEntry[]> {
    // TODO: 在实际实现中，这里应该调用Tauri的文件系统API
    // 这里提供一个模拟实现
    try {
      // 这里应该通过Tauri命令获取目录内容
      // 目前返回空数组
      return []
    } catch (error) {
      logger.error(`获取目录条目失败: ${dirPath}`, error)
      return []
    }
  }

  /**
   * 生成内容哈希（模拟）
   */
  private async generateContentHash(filePath: string): Promise<string> {
    // TODO: 在实际实现中，这里应该读取文件内容并生成哈希
    return `hash_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`
  }

  /**
   * 获取索引
   */
  getIndex(): Map<string, IndexEntry> {
    return new Map(this.index)
  }

  /**
   * 添加单个条目到索引
   */
  addEntry(entry: IndexEntry): void {
    if (validateIndexEntry(entry)) {
      this.index.set(entry.path, entry)
    }
  }

  /**
   * 从索引中移除条目
   */
  removeEntry(path: string): boolean {
    return this.index.delete(path)
  }

  /**
   * 更新索引条目
   */
  updateEntry(path: string, updates: Partial<IndexEntry>): boolean {
    const existing = this.index.get(path)
    if (!existing) {
      return false
    }

    const updated = { ...existing, ...updates }
    if (validateIndexEntry(updated)) {
      this.index.set(path, updated)
      return true
    }

    return false
  }

  /**
   * 获取条目
   */
  getEntry(path: string): IndexEntry | undefined {
    return this.index.get(path)
  }

  /**
   * 检查条目是否存在
   */
  hasEntry(path: string): boolean {
    return this.index.has(path)
  }

  /**
   * 获取所有条目
   */
  getAllEntries(): IndexEntry[] {
    return Array.from(this.index.values())
  }

  /**
   * 根据类型获取条目
   */
  getEntriesByType(type: 'file' | 'directory'): IndexEntry[] {
    return Array.from(this.index.values()).filter(entry => entry.type === type)
  }

  /**
   * 根据分类获取条目
   */
  getEntriesByCategory(category: string): IndexEntry[] {
    return Array.from(this.index.values()).filter(entry => entry.category === category)
  }

  /**
   * 获取文件数量
   */
  getFileCount(): number {
    return Array.from(this.index.values()).filter(entry => entry.type === 'file').length
  }

  /**
   * 获取目录数量
   */
  getDirectoryCount(): number {
    return Array.from(this.index.values()).filter(entry => entry.type === 'directory').length
  }

  /**
   * 获取索引大小
   */
  getIndexSize(): number {
    return calculateIndexSize(this.index)
  }

  /**
   * 清空索引
   */
  clearIndex(): void {
    this.index.clear()
    logger.info('文件搜索索引已清除')
  }

  /**
   * 获取索引统计
   */
  getIndexStatistics(): Partial<IndexStatistics> {
    return {
      totalFiles: this.getFileCount(),
      totalDirectories: this.getDirectoryCount(),
      indexSize: this.getIndexSize()
    }
  }

  /**
   * 检查是否正在索引
   */
  isCurrentlyIndexing(): boolean {
    return this.isIndexing
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<IndexConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 获取当前配置
   */
  getConfig(): IndexConfig {
    return { ...this.config }
  }
}