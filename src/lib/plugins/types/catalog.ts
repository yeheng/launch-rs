/**
 * Plugin catalog and statistics types
 * 插件目录和统计类型
 */

import type { PluginCategory, PluginPermissions } from './basic'
import type { PluginHealthStatus } from './health'

/**
 * Plugin catalog item for browsing available plugins
 * 插件目录项，用于浏览可用插件
 */
export interface PluginCatalogItem {
  /** Plugin identifier */
  id: string
  /** Plugin name */
  name: string
  /** Plugin description */
  description: string
  /** Plugin version */
  version: string
  /** Plugin author */
  author: string
  /** Plugin category */
  category: PluginCategory
  /** Plugin tags */
  tags: string[]
  /** Download URL */
  downloadUrl: string
  /** Plugin homepage */
  homepage?: string
  /** Plugin screenshots */
  screenshots: string[]
  /** Plugin rating */
  rating: number
  /** Download count */
  downloadCount: number
  /** Last updated date */
  lastUpdated: Date
  /** Minimum app version */
  minAppVersion: string
  /** Required permissions */
  permissions: PluginPermissions[]
  /** File size in bytes */
  fileSize: number
  /** Whether plugin is featured */
  featured?: boolean
}

/**
 * Plugin usage metrics
 * 插件使用指标
 */
export interface PluginUsageMetrics {
  /** Total search count */
  searchCount: number
  /** Total results returned */
  resultsCount: number
  /** Average search time in milliseconds */
  avgSearchTime: number
  /** Last used timestamp */
  lastUsed: number
  /** Error count */
  errorCount: number
  /** Success rate percentage */
  successRate: number
}

/**
 * Plugin statistics
 * 插件统计
 */
export interface PluginStatistics {
  /** Total number of plugins */
  total: number
  /** Number of installed plugins */
  installed: number
  /** Number of enabled plugins */
  enabled: number
  /** Number of plugins by category */
  byCategory: Record<PluginCategory, number>
  /** Number of plugins with health issues */
  withIssues: number
}

/**
 * Plugin management result
 * 插件管理结果
 */
export interface PluginManagementResult {
  /** Whether the operation was successful */
  success: boolean
  /** Plugin identifier */
  pluginId?: string
  /** Result message */
  message?: string
  /** Error if operation failed */
  error?: any
}