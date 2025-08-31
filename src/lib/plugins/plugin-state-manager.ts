import { defineStore } from 'pinia'
import type { PersistenceOptions } from 'pinia-plugin-persistedstate'
import type { EnhancedSearchPlugin, PluginCategory, PluginStatistics } from './types'
import { logger } from '../logger'
import { handlePluginError } from '../error-handler'

/**
 * Plugin state interface
 */
export interface PluginState {
  /** Plugin enabled/disabled states */
  enabledStates: Record<string, boolean>
  /** Plugin configurations */
  configurations: Record<string, Record<string, any>>
  /** Plugin statistics */
  statistics: PluginStatistics
  /** Plugin usage metrics */
  usageMetrics: Record<string, PluginUsageMetrics>
  /** Last sync timestamp */
  lastSync: number
}

/**
 * Plugin usage metrics
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
 * Plugin state change event
 */
export interface PluginStateChangeEvent {
  /** Event type */
  type: 'enabled' | 'disabled' | 'configured' | 'installed' | 'uninstalled'
  /** Plugin ID */
  pluginId: string
  /** Previous value */
  previousValue?: any
  /** New value */
  newValue?: any
  /** Timestamp */
  timestamp: number
}

/**
 * Plugin state store using Pinia
 */
export const usePluginStateStore = defineStore('plugin-state', {
  state: (): PluginState => ({
    enabledStates: {},
    configurations: {},
    statistics: {
      total: 0,
      installed: 0,
      enabled: 0,
      byCategory: {} as Record<PluginCategory, number>,
      withIssues: 0
    },
    usageMetrics: {},
    lastSync: Date.now()
  }),

  getters: {
    /**
     * Get enabled state for a plugin
     */
    isPluginEnabled: (state) => (pluginId: string): boolean => {
      return state.enabledStates[pluginId] ?? true // Default to enabled
    },

    /**
     * Get plugin configuration
     */
    getPluginConfig: (state) => (pluginId: string): Record<string, any> => {
      return state.configurations[pluginId] ?? {}
    },

    /**
     * Get plugin usage metrics
     */
    getPluginMetrics: (state) => (pluginId: string): PluginUsageMetrics => {
      return state.usageMetrics[pluginId] ?? {
        searchCount: 0,
        resultsCount: 0,
        avgSearchTime: 0,
        lastUsed: 0,
        errorCount: 0,
        successRate: 100
      }
    },

    /**
     * Get enabled plugins count
     */
    enabledPluginsCount: (state): number => {
      return Object.values(state.enabledStates).filter(Boolean).length
    },

    /**
     * Get most used plugins
     */
    mostUsedPlugins: (state) => (limit = 5): Array<{ pluginId: string; metrics: PluginUsageMetrics }> => {
      return Object.entries(state.usageMetrics)
        .map(([pluginId, metrics]) => ({ pluginId, metrics }))
        .sort((a, b) => b.metrics.searchCount - a.metrics.searchCount)
        .slice(0, limit)
    },

    /**
     * Get plugins with issues
     */
    pluginsWithIssues: (state): string[] => {
      return Object.entries(state.usageMetrics)
        .filter(([, metrics]) => metrics.errorCount > 0 || metrics.successRate < 90)
        .map(([pluginId]) => pluginId)
    }
  },

  actions: {
    /**
     * Set plugin enabled state
     */
    setPluginEnabled(pluginId: string, enabled: boolean): void {
      const previousValue = this.enabledStates[pluginId]
      this.enabledStates[pluginId] = enabled
      this.lastSync = Date.now()

      // Emit state change event
      this.emitStateChangeEvent({
        type: enabled ? 'enabled' : 'disabled',
        pluginId,
        previousValue,
        newValue: enabled,
        timestamp: Date.now()
      })

      // Update statistics
      this.updateStatistics()
    },

    /**
     * Set plugin configuration
     */
    setPluginConfig(pluginId: string, config: Record<string, any>): void {
      const previousValue = this.configurations[pluginId]
      this.configurations[pluginId] = { ...config }
      this.lastSync = Date.now()

      // Emit state change event
      this.emitStateChangeEvent({
        type: 'configured',
        pluginId,
        previousValue,
        newValue: config,
        timestamp: Date.now()
      })
    },

    /**
     * Update plugin configuration partially
     */
    updatePluginConfig(pluginId: string, updates: Record<string, any>): void {
      const currentConfig = this.configurations[pluginId] ?? {}
      const newConfig = { ...currentConfig, ...updates }
      this.setPluginConfig(pluginId, newConfig)
    },

    /**
     * Record plugin usage
     */
    recordPluginUsage(pluginId: string, searchTime: number, resultCount: number, hasError = false): void {
      const currentMetrics = this.usageMetrics[pluginId] ?? {
        searchCount: 0,
        resultsCount: 0,
        avgSearchTime: 0,
        lastUsed: 0,
        errorCount: 0,
        successRate: 100
      }

      // Update metrics
      const newSearchCount = currentMetrics.searchCount + 1
      const newResultsCount = currentMetrics.resultsCount + resultCount
      const newErrorCount = currentMetrics.errorCount + (hasError ? 1 : 0)
      const newAvgSearchTime = ((currentMetrics.avgSearchTime * currentMetrics.searchCount) + searchTime) / newSearchCount
      const newSuccessRate = ((newSearchCount - newErrorCount) / newSearchCount) * 100

      this.usageMetrics[pluginId] = {
        searchCount: newSearchCount,
        resultsCount: newResultsCount,
        avgSearchTime: Math.round(newAvgSearchTime),
        lastUsed: Date.now(),
        errorCount: newErrorCount,
        successRate: Math.round(newSuccessRate * 100) / 100
      }

      this.lastSync = Date.now()
    },

    /**
     * Initialize plugin state
     */
    initializePlugin(plugin: EnhancedSearchPlugin): void {
      // Set default enabled state if not exists
      if (!(plugin.id in this.enabledStates)) {
        this.enabledStates[plugin.id] = plugin.enabled ?? true
      }

      // Initialize configuration if not exists
      if (!(plugin.id in this.configurations)) {
        this.configurations[plugin.id] = {}
      }

      // Initialize usage metrics if not exists
      if (!(plugin.id in this.usageMetrics)) {
        this.usageMetrics[plugin.id] = {
          searchCount: 0,
          resultsCount: 0,
          avgSearchTime: 0,
          lastUsed: 0,
          errorCount: 0,
          successRate: 100
        }
      }

      this.updateStatistics()
    },

    /**
     * Remove plugin state
     */
    removePlugin(pluginId: string): void {
      delete this.enabledStates[pluginId]
      delete this.configurations[pluginId]
      delete this.usageMetrics[pluginId]
      this.lastSync = Date.now()

      // Emit state change event
      this.emitStateChangeEvent({
        type: 'uninstalled',
        pluginId,
        timestamp: Date.now()
      })

      this.updateStatistics()
    },

    /**
     * Update plugin statistics
     */
    updateStatistics(): void {
      const enabledCount = Object.values(this.enabledStates).filter(Boolean).length
      const totalCount = Object.keys(this.enabledStates).length
      const issuesCount = Object.values(this.usageMetrics).filter(
        metrics => metrics.errorCount > 0 || metrics.successRate < 90
      ).length

      this.statistics = {
        total: totalCount,
        installed: totalCount, // For now, all plugins in state are considered installed
        enabled: enabledCount,
        byCategory: {} as Record<PluginCategory, number>, // Will be updated by plugin manager
        withIssues: issuesCount
      }
    },

    /**
     * Update category statistics
     */
    updateCategoryStatistics(categoryStats: Record<PluginCategory, number>): void {
      this.statistics.byCategory = { ...categoryStats }
    },

    /**
     * Reset plugin metrics
     */
    resetPluginMetrics(pluginId: string): void {
      this.usageMetrics[pluginId] = {
        searchCount: 0,
        resultsCount: 0,
        avgSearchTime: 0,
        lastUsed: 0,
        errorCount: 0,
        successRate: 100
      }
      this.lastSync = Date.now()
    },

    /**
     * Reset all metrics
     */
    resetAllMetrics(): void {
      for (const pluginId of Object.keys(this.usageMetrics)) {
        this.resetPluginMetrics(pluginId)
      }
    },

    /**
     * Export plugin state
     */
    exportState(): PluginState {
      return {
        enabledStates: { ...this.enabledStates },
        configurations: JSON.parse(JSON.stringify(this.configurations)),
        statistics: { ...this.statistics },
        usageMetrics: JSON.parse(JSON.stringify(this.usageMetrics)),
        lastSync: this.lastSync
      }
    },

    /**
     * Import plugin state
     */
    importState(state: Partial<PluginState>): void {
      if (state.enabledStates) {
        this.enabledStates = { ...state.enabledStates }
      }
      if (state.configurations) {
        this.configurations = JSON.parse(JSON.stringify(state.configurations))
      }
      if (state.usageMetrics) {
        this.usageMetrics = JSON.parse(JSON.stringify(state.usageMetrics))
      }
      this.lastSync = Date.now()
      this.updateStatistics()
    },

    /**
     * Emit state change event
     */
    emitStateChangeEvent(event: PluginStateChangeEvent): void {
      // Emit custom event for UI synchronization
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('plugin-state-change', {
          detail: event
        }))
      }
    }
  },

  // Persistence configuration
  persist: {
    key: 'plugin-state-store',
    storage: (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
    paths: ['enabledStates', 'configurations', 'usageMetrics', 'lastSync']
  } as PersistenceOptions
})

/**
 * Plugin state change listener
 */
export class PluginStateListener {
  private listeners: Map<string, Array<(event: PluginStateChangeEvent) => void>> = new Map()

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('plugin-state-change', this.handleStateChange.bind(this))
    }
  }

  /**
   * Add state change listener
   */
  on(eventType: PluginStateChangeEvent['type'], listener: (event: PluginStateChangeEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(listener)
  }

  /**
   * Remove state change listener
   */
  off(eventType: PluginStateChangeEvent['type'], listener: (event: PluginStateChangeEvent) => void): void {
    const eventListeners = this.listeners.get(eventType)
    if (eventListeners) {
      const index = eventListeners.indexOf(listener)
      if (index > -1) {
        eventListeners.splice(index, 1)
      }
    }
  }

  /**
   * Handle state change event
   */
  private handleStateChange(event: CustomEvent<PluginStateChangeEvent>): void {
    const stateChangeEvent = event.detail
    const eventListeners = this.listeners.get(stateChangeEvent.type)
    
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(stateChangeEvent)
        } catch (error) {
          const appError = handlePluginError('Plugin state change listener', error)
          logger.error('Plugin state change listener error', appError)
        }
      }
    }
  }

  /**
   * Cleanup listeners
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('plugin-state-change', this.handleStateChange.bind(this))
    }
    this.listeners.clear()
  }
}

// Global state listener instance
export const pluginStateListener = new PluginStateListener()