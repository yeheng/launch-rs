import type { PluginStatistics, PluginCategory, PluginUsageMetrics } from './types'
import { useUnifiedStateStore } from '../state/unified-state-manager'
import { logger } from '../logger'
import { handlePluginError } from '../error-handler'

/**
 * Plugin statistics utilities
 */
export class PluginStatisticsManager {
  private stateStore: ReturnType<typeof useUnifiedStateStore> | null = null

  constructor() {
    try {
      this.stateStore = useUnifiedStateStore()
    } catch (error) {
      const appError = handlePluginError('State store not available for statistics', error)
      logger.warn('State store not available for statistics:', appError)
    }
  }

  /**
   * Get current plugin statistics
   */
  getStatistics(): PluginStatistics {
    if (!this.stateStore) {
      return {
        total: 0,
        installed: 0,
        enabled: 0,
        byCategory: {} as Record<PluginCategory, number>,
        withIssues: 0
      }
    }

    return this.stateStore.plugins.statistics
  }

  /**
   * Get plugin health summary
   */
  getHealthSummary(): {
    healthy: number
    withWarnings: number
    withErrors: number
    total: number
  } {
    if (!this.stateStore) {
      return { healthy: 0, withWarnings: 0, withErrors: 0, total: 0 }
    }

    const allMetrics = Object.values(this.stateStore.plugins.usageMetrics)
    const total = allMetrics.length
    
    let healthy = 0
    let withWarnings = 0
    let withErrors = 0

    for (const metrics of allMetrics) {
      const typedMetrics = metrics as PluginUsageMetrics
      if (typedMetrics.errorCount === 0 && typedMetrics.successRate >= 95) {
        healthy++
      } else if (typedMetrics.successRate >= 80) {
        withWarnings++
      } else {
        withErrors++
      }
    }

    return { healthy, withWarnings, withErrors, total }
  }

  /**
   * Get usage trends over time
   */
  getUsageTrends(): {
    totalSearches: number
    totalResults: number
    avgSearchTime: number
    mostActivePlugin: string | null
    leastActivePlugin: string | null
  } {
    if (!this.stateStore) {
      return {
        totalSearches: 0,
        totalResults: 0,
        avgSearchTime: 0,
        mostActivePlugin: null,
        leastActivePlugin: null
      }
    }

    const allMetrics = Object.entries(this.stateStore.plugins.usageMetrics)
    
    if (allMetrics.length === 0) {
      return {
        totalSearches: 0,
        totalResults: 0,
        avgSearchTime: 0,
        mostActivePlugin: null,
        leastActivePlugin: null
      }
    }

    const totalSearches = allMetrics.reduce((sum, [, metrics]) => sum + (metrics as PluginUsageMetrics).searchCount, 0)
    const totalResults = allMetrics.reduce((sum, [, metrics]) => sum + (metrics as PluginUsageMetrics).resultsCount, 0)
    const totalSearchTime = allMetrics.reduce((sum, [, metrics]) => {
      const typedMetrics = metrics as PluginUsageMetrics
      return sum + (typedMetrics.avgSearchTime * typedMetrics.searchCount)
    }, 0)
    const avgSearchTime = totalSearches > 0 ? Math.round(totalSearchTime / totalSearches) : 0

    // Find most and least active plugins
    const sortedByActivity = allMetrics.sort((a, b) => (b[1] as PluginUsageMetrics).searchCount - (a[1] as PluginUsageMetrics).searchCount)
    const mostActivePlugin = sortedByActivity[0]?.[0] || null
    const leastActivePlugin = sortedByActivity[sortedByActivity.length - 1]?.[0] || null

    return {
      totalSearches,
      totalResults,
      avgSearchTime,
      mostActivePlugin,
      leastActivePlugin
    }
  }

  /**
   * Get category distribution
   */
  getCategoryDistribution(): Array<{
    category: PluginCategory
    count: number
    percentage: number
  }> {
    if (!this.stateStore) {
      return []
    }

    const { byCategory, total } = this.stateStore.plugins.statistics
    
    return Object.entries(byCategory).map(([category, count]) => ({
      category: category as PluginCategory,
      count: count as number,
      percentage: total > 0 ? Math.round((count as number / total) * 100) : 0
    }))
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(): {
    fastestPlugin: { id: string; avgTime: number } | null
    slowestPlugin: { id: string; avgTime: number } | null
    mostReliablePlugin: { id: string; successRate: number } | null
    leastReliablePlugin: { id: string; successRate: number } | null
  } {
    if (!this.stateStore) {
      return {
        fastestPlugin: null,
        slowestPlugin: null,
        mostReliablePlugin: null,
        leastReliablePlugin: null
      }
    }

    const allMetrics = Object.entries(this.stateStore.plugins.usageMetrics)
      .filter(([, metrics]) => (metrics as PluginUsageMetrics).searchCount > 0) // Only consider plugins that have been used

    if (allMetrics.length === 0) {
      return {
        fastestPlugin: null,
        slowestPlugin: null,
        mostReliablePlugin: null,
        leastReliablePlugin: null
      }
    }

    // Find fastest and slowest plugins
    const sortedBySpeed = allMetrics.sort((a, b) => (a[1] as PluginUsageMetrics).avgSearchTime - (b[1] as PluginUsageMetrics).avgSearchTime)
    const fastestPlugin = sortedBySpeed[0] ? {
      id: sortedBySpeed[0][0],
      avgTime: (sortedBySpeed[0][1] as PluginUsageMetrics).avgSearchTime
    } : null
    const slowestPlugin = sortedBySpeed[sortedBySpeed.length - 1] ? {
      id: sortedBySpeed[sortedBySpeed.length - 1][0],
      avgTime: (sortedBySpeed[sortedBySpeed.length - 1][1] as PluginUsageMetrics).avgSearchTime
    } : null

    // Find most and least reliable plugins
    const sortedByReliability = allMetrics.sort((a, b) => (b[1] as PluginUsageMetrics).successRate - (a[1] as PluginUsageMetrics).successRate)
    const mostReliablePlugin = sortedByReliability[0] ? {
      id: sortedByReliability[0][0],
      successRate: (sortedByReliability[0][1] as PluginUsageMetrics).successRate
    } : null
    const leastReliablePlugin = sortedByReliability[sortedByReliability.length - 1] ? {
      id: sortedByReliability[sortedByReliability.length - 1][0],
      successRate: (sortedByReliability[sortedByReliability.length - 1][1] as PluginUsageMetrics).successRate
    } : null

    return {
      fastestPlugin,
      slowestPlugin,
      mostReliablePlugin,
      leastReliablePlugin
    }
  }

  /**
   * Generate statistics report
   */
  generateReport(): {
    overview: PluginStatistics
    health: ReturnType<PluginStatisticsManager['getHealthSummary']>
    usage: ReturnType<PluginStatisticsManager['getUsageTrends']>
    categories: ReturnType<PluginStatisticsManager['getCategoryDistribution']>
    performance: ReturnType<PluginStatisticsManager['getPerformanceMetrics']>
    timestamp: number
  } {
    return {
      overview: this.getStatistics(),
      health: this.getHealthSummary(),
      usage: this.getUsageTrends(),
      categories: this.getCategoryDistribution(),
      performance: this.getPerformanceMetrics(),
      timestamp: Date.now()
    }
  }

  /**
   * Export statistics as JSON
   */
  exportStatistics(): string {
    const report = this.generateReport()
    return JSON.stringify(report, null, 2)
  }

  /**
   * Get plugin recommendations based on usage patterns
   */
  getRecommendations(): Array<{
    type: 'enable' | 'disable' | 'configure' | 'remove'
    pluginId: string
    reason: string
    priority: 'low' | 'medium' | 'high'
  }> {
    if (!this.stateStore) {
      return []
    }

    const recommendations: Array<{
      type: 'enable' | 'disable' | 'configure' | 'remove'
      pluginId: string
      reason: string
      priority: 'low' | 'medium' | 'high'
    }> = []

    const allMetrics = Object.entries(this.stateStore.plugins.usageMetrics)
    const enabledStates = this.stateStore.plugins.enabledStates

    for (const [pluginId, metrics] of allMetrics) {
      const isEnabled = enabledStates[pluginId] ?? true
      const typedMetrics = metrics as PluginUsageMetrics

      // Recommend disabling unused plugins
      if (isEnabled && typedMetrics.searchCount === 0 && typedMetrics.lastUsed === 0) {
        recommendations.push({
          type: 'disable',
          pluginId,
          reason: 'Plugin has never been used',
          priority: 'low'
        })
      }

      // Recommend disabling plugins with high error rates
      if (isEnabled && typedMetrics.successRate < 50 && typedMetrics.searchCount > 10) {
        recommendations.push({
          type: 'disable',
          pluginId,
          reason: `Plugin has low success rate (${typedMetrics.successRate.toFixed(1)}%)`,
          priority: 'high'
        })
      }

      // Recommend enabling frequently used but disabled plugins
      if (!isEnabled && typedMetrics.searchCount > 50) {
        recommendations.push({
          type: 'enable',
          pluginId,
          reason: 'Plugin was frequently used before being disabled',
          priority: 'medium'
        })
      }

      // Recommend removing plugins with persistent errors
      if (typedMetrics.errorCount > 100 && typedMetrics.successRate < 10) {
        recommendations.push({
          type: 'remove',
          pluginId,
          reason: 'Plugin has persistent errors and very low success rate',
          priority: 'high'
        })
      }
    }

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
  }
}

// Global statistics manager instance
export const pluginStatisticsManager = new PluginStatisticsManager()

/**
 * Composable for using plugin statistics in Vue components
 */
export function usePluginStatistics() {
  const manager = pluginStatisticsManager

  return {
    getStatistics: () => manager.getStatistics(),
    getHealthSummary: () => manager.getHealthSummary(),
    getUsageTrends: () => manager.getUsageTrends(),
    getCategoryDistribution: () => manager.getCategoryDistribution(),
    getPerformanceMetrics: () => manager.getPerformanceMetrics(),
    generateReport: () => manager.generateReport(),
    exportStatistics: () => manager.exportStatistics(),
    getRecommendations: () => manager.getRecommendations()
  }
}