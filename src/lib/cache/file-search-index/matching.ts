/**
 * 搜索匹配策略模块
 */

import type { IndexEntry } from './types'
import type { MatchType } from './types'

/**
 * 确定搜索策略
 */
export function determineSearchStrategy(
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
 * 确定匹配类型
 */
export function determineMatchType(
  entry: IndexEntry,
  query: string,
  strategy: string
): MatchType {
  const nameLower = entry.name.toLowerCase()
  
  if (nameLower === query) {
    return MatchType.EXACT
  } else if (nameLower.startsWith(query)) {
    return MatchType.PREFIX
  } else if (nameLower.includes(query)) {
    return MatchType.CONTAIN
  } else {
    return MatchType.FUZZY
  }
}

/**
 * 查找匹配位置
 */
export function findMatchPositions(
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
 * 获取匹配的字段
 */
export function getMatchedFields(
  entry: IndexEntry, 
  query: string, 
  searchType: 'fuzzy' | 'exact' | 'prefix'
): string[] {
  const fields: string[] = []
  const queryLower = query.toLowerCase()

  if (entry.name.toLowerCase().includes(queryLower)) {
    fields.push('name')
  }

  if (entry.path.toLowerCase().includes(queryLower)) {
    fields.push('path')
  }

  if (entry.extension.toLowerCase().includes(queryLower)) {
    fields.push('extension')
  }

  for (const tag of entry.tags) {
    if (tag.toLowerCase().includes(queryLower)) {
      fields.push('tags')
      break
    }
  }

  return fields
}

/**
 * 检查是否应该排除文件/目录
 */
export function shouldExclude(
  name: string,
  path: string,
  type: 'file' | 'directory',
  config: {
    excludedDirectories: string[]
    excludedExtensions: string[]
    includedExtensions: string[]
  }
): boolean {
  const nameLower = name.toLowerCase()

  // 检查排除的目录
  if (type === 'directory') {
    for (const excludedDir of config.excludedDirectories) {
      if (path.includes(excludedDir)) {
        return true
      }
    }
  }

  // 检查排除的扩展名
  if (type === 'file') {
    const extension = getExtension(name)
    if (config.excludedExtensions.includes(`.${extension}`)) {
      return true
    }

    // 检查包含的扩展名（如果指定了）
    if (config.includedExtensions.length > 0) {
      return !config.includedExtensions.includes(`.${extension}`)
    }
  }

  return false
}

/**
 * 获取文件扩展名
 */
export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot === -1 ? '' : filename.substring(lastDot + 1)
}