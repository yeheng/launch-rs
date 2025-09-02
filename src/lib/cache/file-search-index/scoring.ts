/**
 * 搜索评分算法模块
 */

import type { IndexEntry } from './types'
import type { IndexConfig } from './interfaces'
import { FileType } from './types'
import { getFileTypePreferenceWeight } from './file-types'

/**
 * 计算增强的相关性分数
 */
export function calculateEnhancedRelevance(
  entry: IndexEntry,
  query: string,
  strategy: 'fuzzy' | 'exact' | 'prefix' | 'hybrid',
  config: IndexConfig
): number {
  let score = 0

  switch (strategy) {
    case 'exact':
      score += calculateExactMatchScore(entry, query)
      break
    case 'prefix':
      score += calculatePrefixMatchScore(entry, query, config)
      break
    case 'fuzzy':
      score += calculateFuzzyMatchScore(entry, query, config)
      break
    case 'hybrid':
      score += Math.max(
        calculateExactMatchScore(entry, query),
        calculatePrefixMatchScore(entry, query, config),
        calculateFuzzyMatchScore(entry, query, config) * 0.8
      )
      break
  }

  // 应用权重调整
  score += calculateWeightBonus(entry, config)
  score += calculateRecencyBonus(entry)
  score += calculateTypePreferenceBonus(entry)

  return Math.round(score * 100) / 100
}

/**
 * 计算精确匹配分数
 */
export function calculateExactMatchScore(entry: IndexEntry, query: string): number {
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
export function calculatePrefixMatchScore(entry: IndexEntry, query: string, config: IndexConfig): number {
  let score = 0
  const nameLower = entry.name.toLowerCase()
  
  if (nameLower.startsWith(query)) {
    score += 80 * config.search.prefixWeight
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
export function calculateFuzzyMatchScore(entry: IndexEntry, query: string, config: IndexConfig): number {
  let score = 0
  const nameLower = entry.name.toLowerCase()
  
  if (nameLower.includes(query)) {
    score += 60 * config.search.containWeight
  }
  
  // 计算编辑距离分数
  const distance = calculateLevenshteinDistance(nameLower, query)
  const maxLength = Math.max(nameLower.length, query.length)
  const similarity = 1 - (distance / maxLength)
  
  if (similarity >= config.search.fuzzyThreshold) {
    score += similarity * 50
  }
  
  return score
}

/**
 * 计算编辑距离（Levenshtein Distance）
 */
export function calculateLevenshteinDistance(str1: string, str2: string): number {
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
export function calculateWeightBonus(entry: IndexEntry, config: IndexConfig): number {
  let bonus = 0
  
  // 访问频率权重
  bonus += Math.log(entry.accessCount + 1) * config.search.accessWeight
  
  // 文件类型偏好权重
  const typeWeight = getFileTypePreferenceWeight(entry.category)
  bonus += typeWeight * config.search.typePreferenceWeight
  
  return bonus
}

/**
 * 计算时间性奖励
 */
export function calculateRecencyBonus(entry: IndexEntry): number {
  const recency = Math.max(0, 1 - (Date.now() - entry.lastAccessed) / (30 * 24 * 60 * 60 * 1000))
  return recency * 10
}

/**
 * 计算类型偏好奖励
 */
export function calculateTypePreferenceBonus(entry: IndexEntry): number {
  return getFileTypePreferenceWeight(entry.category)
}

/**
 * 计算推荐分数
 */
export function calculateRecommendationScore(entry: IndexEntry, query: string): number {
  let score = 0
  
  // 基于访问频率
  score += Math.min(entry.accessCount * 2, 20)
  
  // 基于文件类型和查询的相关性
  const queryLower = query.toLowerCase()
  if (entry.category === FileType.DOCUMENT && (queryLower.includes('doc') || queryLower.includes('text'))) {
    score += 15
  }
  if (entry.category === FileType.CODE && (queryLower.includes('code') || queryLower.includes('dev'))) {
    score += 15
  }
  if (entry.category === FileType.IMAGE && queryLower.includes('img')) {
    score += 15
  }
  
  // 基于文件名模式
  const nameLower = entry.name.toLowerCase()
  if (nameLower.includes('readme') && queryLower.includes('read')) {
    score += 10
  }
  if (nameLower.includes('config') && queryLower.includes('conf')) {
    score += 10
  }
  if (nameLower.includes('index') && queryLower.includes('main')) {
    score += 10
  }
  
  return score
}

/**
 * 估算文件打开时间
 */
export function estimateOpenTime(entry: IndexEntry): number {
  if (entry.type === 'directory') return 50
  
  if (entry.size < 1024 * 1024) return 100          // < 1MB
  if (entry.size < 10 * 1024 * 1024) return 200       // < 10MB  
  if (entry.size < 100 * 1024 * 1024) return 500      // < 100MB
  return 1000                                           // > 100MB
}