/**
 * 文件搜索索引工具函数
 */

import type { IndexEntry, DirectoryEntry } from './types'
import type { IndexConfig } from './interfaces'
import { determineFileType, generateFileTags, getExtension } from './file-types'

/**
 * 计算索引大小（简化计算）
 */
export function calculateIndexSize(index: Map<string, IndexEntry>): number {
  // 简化计算：每个条目约500字节
  return index.size * 500
}

/**
 * 模拟获取目录条目
 * 在实际实现中，这里应该调用Tauri的文件系统API
 */
export async function getDirectoryEntries(dirPath: string): Promise<DirectoryEntry[]> {
  // TODO: 在实际实现中，这里应该调用Tauri的文件系统API
  // 返回模拟数据用于测试
  return []
}

/**
 * 生成内容哈希（模拟实现）
 */
export async function generateContentHash(filePath: string): Promise<string> {
  // TODO: 在实际实现中，这里应该读取文件内容并生成哈希
  return `hash_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`
}

/**
 * 获取内容片段（模拟实现）
 */
export async function getContentSnippet(filePath: string, query: string): Promise<string> {
  // TODO: 在实际实现中，这里应该搜索文件内容并返回匹配片段
  return `Content snippet for ${filePath} containing "${query}"`
}

/**
 * 创建索引条目
 */
export function createIndexEntry(
  fullPath: string,
  entry: DirectoryEntry,
  config: IndexConfig
): IndexEntry {
  const fileType = determineFileType(entry.name, getExtension(entry.name))
  
  const indexEntry: IndexEntry = {
    path: fullPath,
    name: entry.name,
    extension: entry.type === 'file' ? getExtension(entry.name) : '',
    size: entry.size || 0,
    modifiedTime: entry.modifiedTime || Date.now(),
    type: entry.type,
    permissions: entry.permissions,
    owner: entry.owner,
    group: entry.group,
    tags: generateFileTags(entry),
    accessCount: 0,
    lastAccessed: 0,
    category: fileType,
    weight: 0 // 初始权重为0，后续可以根据需要调整
  }

  return indexEntry
}

/**
 * 验证索引条目
 */
export function validateIndexEntry(entry: IndexEntry): boolean {
  // 检查必要字段
  if (!entry.path || !entry.name) {
    return false
  }

  // 检查路径格式
  if (!entry.path.startsWith('/')) {
    return false
  }

  // 检查文件大小
  if (entry.size < 0) {
    return false
  }

  // 检查时间戳
  if (entry.modifiedTime < 0) {
    return false
  }

  // 检查访问计数
  if (entry.accessCount < 0) {
    return false
  }

  return true
}

/**
 * 合并索引条目（用于更新）
 */
export function mergeIndexEntry(
  existing: IndexEntry,
  update: Partial<IndexEntry>
): IndexEntry {
  return {
    ...existing,
    ...update,
    // 特殊处理一些字段
    tags: update.tags || existing.tags,
    accessCount: update.accessCount ?? existing.accessCount,
    lastAccessed: update.lastAccessed ?? existing.lastAccessed
  }
}

/**
 * 过滤和排序索引条目
 */
export function filterAndSortEntries(
  entries: IndexEntry[],
  options: {
    typeFilter?: string[]
    sortBy?: 'name' | 'size' | 'modified' | 'accessed'
    sortOrder?: 'asc' | 'desc'
    limit?: number
  } = {}
): IndexEntry[] {
  let filtered = entries

  // 应用类型过滤
  if (options.typeFilter && options.typeFilter.length > 0) {
    filtered = filtered.filter(entry => 
      options.typeFilter!.includes(entry.category)
    )
  }

  // 应用排序
  if (options.sortBy) {
    filtered.sort((a, b) => {
      let comparison = 0

      switch (options.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'modified':
          comparison = a.modifiedTime - b.modifiedTime
          break
        case 'accessed':
          comparison = a.lastAccessed - b.lastAccessed
          break
      }

      return options.sortOrder === 'asc' ? comparison : -comparison
    })
  }

  // 应用限制
  if (options.limit) {
    filtered = filtered.slice(0, options.limit)
  }

  return filtered
}