/**
 * 统一状态管理系统
 * 将用户状态、插件状态、统计数据等整合到一个统一的管理器中
 */

import { defineStore } from 'pinia'
import type { PersistenceOptions } from 'pinia-plugin-persistedstate'
import { logger } from '../logger'
import { handlePluginError } from '../error-handler'

/**
 * 统一状态接口
 */
export interface UnifiedState {
  /** 用户状态 */
  user: {
    id: string | null
    username: string | null
    isLoggedIn: boolean
    preferences: {
      theme: 'light' | 'dark' | 'system'
      language: string
      shortcuts: Record<string, any>
    }
  }
  
  /** 插件状态 */
  plugins: {
    /** 插件启用/禁用状态 */
    enabledStates: Record<string, boolean>
    /** 插件配置 */
    configurations: Record<string, Record<string, any>>
    /** 插件统计 */
    statistics: {
      total: number
      installed: number
      enabled: number
      byCategory: Record<string, number>
      withIssues: number
    }
    /** 插件使用指标 */
    usageMetrics: Record<string, PluginUsageMetrics>
    /** 最后同步时间 */
    lastSync: number
  }
  
  /** 应用状态 */
  app: {
    /** 应用设置 */
    settings: {
      windowState: {
        width: number
        height: number
        maximized: boolean
      }
      search: {
        maxResults: number
        searchHistory: string[]
        defaultSort: 'relevance' | 'date' | 'name'
      }
      performance: {
        cacheEnabled: boolean
        searchOptimization: boolean
        telemetryEnabled: boolean
      }
    }
    /** 系统状态 */
    system: {
      version: string
      buildNumber: string
      lastUpdate: string
      health: 'excellent' | 'good' | 'warning' | 'error'
    }
  }
  
  /** 会话状态 */
  session: {
    /** 会话ID */
    sessionId: string
    /** 会话开始时间 */
    startTime: number
    /** 活跃时间 */
    activeTime: number
    /** 操作计数 */
    actionCount: number
    /** 错误计数 */
    errorCount: number
  }
  
  /** 最后更新时间 */
  lastUpdated: number
}

/**
 * 插件使用指标
 */
export interface PluginUsageMetrics {
  /** 总搜索次数 */
  searchCount: number
  /** 返回结果总数 */
  resultsCount: number
  /** 平均搜索时间（毫秒） */
  avgSearchTime: number
  /** 最后使用时间 */
  lastUsed: number
  /** 错误次数 */
  errorCount: number
  /** 成功率百分比 */
  successRate: number
}

/**
 * 状态变更事件
 */
export interface StateChangeEvent {
  /** 变更类型 */
  type: 'user' | 'plugins' | 'app' | 'session'
  /** 变更子类型 */
  subtype: string
  /** 变更的数据路径 */
  path: string
  /** 之前的值 */
  previousValue?: any
  /** 新的值 */
  newValue?: any
  /** 时间戳 */
  timestamp: number
}

/**
 * 统一状态管理器
 */
export const useUnifiedStateStore = defineStore('unified-state', {
  state: (): UnifiedState => ({
    user: {
      id: null,
      username: null,
      isLoggedIn: false,
      preferences: {
        theme: 'system',
        language: 'zh-CN',
        shortcuts: {}
      }
    },
    
    plugins: {
      enabledStates: {},
      configurations: {},
      statistics: {
        total: 0,
        installed: 0,
        enabled: 0,
        byCategory: {},
        withIssues: 0
      },
      usageMetrics: {},
      lastSync: Date.now()
    },
    
    app: {
      settings: {
        windowState: {
          width: 800,
          height: 600,
          maximized: false
        },
        search: {
          maxResults: 50,
          searchHistory: [],
          defaultSort: 'relevance'
        },
        performance: {
          cacheEnabled: true,
          searchOptimization: true,
          telemetryEnabled: true
        }
      },
      system: {
        version: '1.0.0',
        buildNumber: '20240801',
        lastUpdate: new Date().toISOString(),
        health: 'excellent'
      }
    },
    
    session: {
      sessionId: generateSessionId(),
      startTime: Date.now(),
      activeTime: 0,
      actionCount: 0,
      errorCount: 0
    },
    
    lastUpdated: Date.now()
  }),

  getters: {
    /**
     * 获取用户显示名称
     */
    displayName: (state) => state.user.username || '游客',
    
    /**
     * 检查用户是否已登录
     */
    isLoggedIn: (state) => state.user.isLoggedIn,
    
    /**
     * 获取当前主题
     */
    currentTheme: (state) => state.user.preferences.theme,
    
    /**
     * 获取当前语言
     */
    currentLanguage: (state) => state.user.preferences.language,
    
    /**
     * 检查插件是否启用
     */
    isPluginEnabled: (state) => (pluginId: string): boolean => {
      return state.plugins.enabledStates[pluginId] ?? true
    },
    
    /**
     * 获取插件配置
     */
    getPluginConfig: (state) => (pluginId: string): Record<string, any> => {
      return state.plugins.configurations[pluginId] ?? {}
    },
    
    /**
     * 获取插件使用指标
     */
    getPluginMetrics: (state) => (pluginId: string): PluginUsageMetrics => {
      return state.plugins.usageMetrics[pluginId] ?? {
        searchCount: 0,
        resultsCount: 0,
        avgSearchTime: 0,
        lastUsed: 0,
        errorCount: 0,
        successRate: 100
      }
    },
    
    /**
     * 获取启用的插件数量
     */
    enabledPluginsCount: (state): number => {
      return Object.values(state.plugins.enabledStates).filter(Boolean).length
    },
    
    /**
     * 获取最常用的插件
     */
    mostUsedPlugins: (state) => (limit = 5): Array<{ pluginId: string; metrics: PluginUsageMetrics }> => {
      return Object.entries(state.plugins.usageMetrics)
        .map(([pluginId, metrics]) => ({ pluginId, metrics: metrics as PluginUsageMetrics }))
        .sort((a, b) => b.metrics.searchCount - a.metrics.searchCount)
        .slice(0, limit)
    },
    
    /**
     * 获取有问题的插件
     */
    pluginsWithIssues: (state): string[] => {
      return Object.entries(state.plugins.usageMetrics)
        .filter(([, metrics]) => (metrics as PluginUsageMetrics).errorCount > 0 || (metrics as PluginUsageMetrics).successRate < 90)
        .map(([pluginId]) => pluginId)
    },
    
    /**
     * 获取应用健康状态
     */
    appHealth: (state): 'excellent' | 'good' | 'warning' | 'error' => {
      const { session, plugins } = state
      const errorRate = session.actionCount > 0 ? session.errorCount / session.actionCount : 0
      
      if (errorRate > 0.1) return 'error'
      if (plugins.withIssues > 0) return 'warning'
      if (errorRate > 0.05) return 'good'
      return 'excellent'
    },
    
    /**
     * 获取会话持续时间
     */
    sessionDuration: (state): number => {
      return Date.now() - state.session.startTime
    }
  },

  actions: {
    /**
     * 更新状态的通用方法
     */
    updateState<T extends keyof UnifiedState>(
      section: T,
      updates: Partial<UnifiedState[T]>,
      emitEvent = true
    ): void {
      const previousValue = { ...this[section] }
      Object.assign(this[section], updates)
      this.lastUpdated = Date.now()
      
      if (emitEvent && section !== 'lastUpdated') {
        this.emitStateChangeEvent({
          type: section as 'user' | 'plugins' | 'app' | 'session',
          subtype: 'update',
          path: section,
          previousValue,
          newValue: { ...this[section] },
          timestamp: Date.now()
        })
      }
    },
    
    /**
     * 深度更新嵌套状态
     */
    updateNestedState(
      path: string,
      value: any,
      emitEvent = true
    ): void {
      const keys = path.split('.')
      const section = keys[0] as keyof UnifiedState
      const previousValue = this.getNestedValue(path)
      
      this.setNestedValue(path, value)
      this.lastUpdated = Date.now()
      
      if (emitEvent && section !== 'lastUpdated') {
        this.emitStateChangeEvent({
          type: section as 'user' | 'plugins' | 'app' | 'session',
          subtype: 'nested-update',
          path,
          previousValue,
          newValue: this.getNestedValue(path),
          timestamp: Date.now()
        })
      }
    },
    
    /**
     * 设置用户信息
     */
    setUser(userData: { id: string; username: string }): void {
      this.updateState('user', {
        id: userData.id,
        username: userData.username,
        isLoggedIn: true
      })
    },
    
    /**
     * 用户退出登录
     */
    logout(): void {
      this.updateState('user', {
        id: null,
        username: null,
        isLoggedIn: false
      })
    },
    
    /**
     * 设置主题
     */
    setTheme(theme: 'light' | 'dark' | 'system'): void {
      this.updateNestedState('user.preferences.theme', theme)
    },
    
    /**
     * 设置语言
     */
    setLanguage(language: string): void {
      this.updateNestedState('user.preferences.language', language)
    },
    
    /**
     * 设置插件启用状态
     */
    setPluginEnabled(pluginId: string, enabled: boolean): void {
      this.updateNestedState(`plugins.enabledStates.${pluginId}`, enabled)
      this.updatePluginStatistics()
    },
    
    /**
     * 设置插件配置
     */
    setPluginConfig(pluginId: string, config: Record<string, any>): void {
      this.updateNestedState(`plugins.configurations.${pluginId}`, { ...config })
    },
    
    /**
     * 更新插件配置
     */
    updatePluginConfig(pluginId: string, updates: Record<string, any>): void {
      const currentConfig = this.getPluginConfig(pluginId)
      this.setPluginConfig(pluginId, { ...currentConfig, ...updates })
    },
    
    /**
     * 记录插件使用情况
     */
    recordPluginUsage(pluginId: string, searchTime: number, resultCount: number, hasError = false): void {
      const currentMetrics = this.getPluginMetrics(pluginId)
      
      // 计算新的指标
      const newSearchCount = currentMetrics.searchCount + 1
      const newResultsCount = currentMetrics.resultsCount + resultCount
      const newErrorCount = currentMetrics.errorCount + (hasError ? 1 : 0)
      const newAvgSearchTime = ((currentMetrics.avgSearchTime * currentMetrics.searchCount) + searchTime) / newSearchCount
      const newSuccessRate = ((newSearchCount - newErrorCount) / newSearchCount) * 100
      
      const newMetrics: PluginUsageMetrics = {
        searchCount: newSearchCount,
        resultsCount: newResultsCount,
        avgSearchTime: Math.round(newAvgSearchTime),
        lastUsed: Date.now(),
        errorCount: newErrorCount,
        successRate: Math.round(newSuccessRate * 100) / 100
      }
      
      this.updateNestedState(`plugins.usageMetrics.${pluginId}`, newMetrics)
      this.plugins.lastSync = Date.now()
      
      // 更新会话统计
      this.incrementActionCount()
      if (hasError) {
        this.incrementErrorCount()
      }
    },
    
    /**
     * 初始化插件状态
     */
    initializePlugin(pluginId: string, defaultEnabled = true): void {
      if (!(pluginId in this.plugins.enabledStates)) {
        this.updateNestedState(`plugins.enabledStates.${pluginId}`, defaultEnabled)
      }
      if (!(pluginId in this.plugins.configurations)) {
        this.updateNestedState(`plugins.configurations.${pluginId}`, {})
      }
      if (!(pluginId in this.plugins.usageMetrics)) {
        this.updateNestedState(`plugins.usageMetrics.${pluginId}`, {
          searchCount: 0,
          resultsCount: 0,
          avgSearchTime: 0,
          lastUsed: 0,
          errorCount: 0,
          successRate: 100
        })
      }
      this.updatePluginStatistics()
    },
    
    /**
     * 移除插件状态
     */
    removePlugin(pluginId: string): void {
      delete this.plugins.enabledStates[pluginId]
      delete this.plugins.configurations[pluginId]
      delete this.plugins.usageMetrics[pluginId]
      this.plugins.lastSync = Date.now()
      this.updatePluginStatistics()
    },
    
    /**
     * 更新插件统计
     */
    updatePluginStatistics(): void {
      const enabledCount = Object.values(this.plugins.enabledStates).filter(Boolean).length
      const totalCount = Object.keys(this.plugins.enabledStates).length
      const issuesCount = Object.values(this.plugins.usageMetrics).filter(
        (metrics) => (metrics as PluginUsageMetrics).errorCount > 0 || (metrics as PluginUsageMetrics).successRate < 90
      ).length
      
      this.updateNestedState('plugins.statistics', {
        total: totalCount,
        installed: totalCount,
        enabled: enabledCount,
        byCategory: this.plugins.statistics.byCategory, // 保持现有分类统计
        withIssues: issuesCount
      })
    },
    
    /**
     * 更新分类统计
     */
    updateCategoryStatistics(categoryStats: Record<string, number>): void {
      this.updateNestedState('plugins.statistics.byCategory', categoryStats)
    },
    
    /**
     * 重置插件指标
     */
    resetPluginMetrics(pluginId: string): void {
      this.updateNestedState(`plugins.usageMetrics.${pluginId}`, {
        searchCount: 0,
        resultsCount: 0,
        avgSearchTime: 0,
        lastUsed: 0,
        errorCount: 0,
        successRate: 100
      })
    },
    
    /**
     * 重置所有指标
     */
    resetAllMetrics(): void {
      for (const pluginId of Object.keys(this.plugins.usageMetrics)) {
        this.resetPluginMetrics(pluginId)
      }
    },
    
    /**
     * 导出状态
     */
    exportState(): UnifiedState {
      return {
        user: { ...this.user },
        plugins: {
          enabledStates: { ...this.plugins.enabledStates },
          configurations: JSON.parse(JSON.stringify(this.plugins.configurations)),
          statistics: { ...this.plugins.statistics },
          usageMetrics: JSON.parse(JSON.stringify(this.plugins.usageMetrics)),
          lastSync: this.plugins.lastSync
        },
        app: JSON.parse(JSON.stringify(this.app)),
        session: { ...this.session },
        lastUpdated: this.lastUpdated
      }
    },
    
    /**
     * 导入状态
     */
    importState(state: Partial<UnifiedState>): void {
      if (state.user) {
        this.updateState('user', state.user, false)
      }
      if (state.plugins) {
        Object.assign(this.plugins, {
          enabledStates: state.plugins.enabledStates || {},
          configurations: state.plugins.configurations || {},
          statistics: state.plugins.statistics || this.plugins.statistics,
          usageMetrics: state.plugins.usageMetrics || {},
          lastSync: state.plugins.lastSync || Date.now()
        })
      }
      if (state.app) {
        this.updateState('app', state.app, false)
      }
      if (state.session) {
        this.updateState('session', state.session, false)
      }
      
      this.lastUpdated = Date.now()
      this.updatePluginStatistics()
    },
    
    /**
     * 增加操作计数
     */
    incrementActionCount(): void {
      this.updateNestedState('session.actionCount', this.session.actionCount + 1)
    },
    
    /**
     * 增加错误计数
     */
    incrementErrorCount(): void {
      this.updateNestedState('session.errorCount', this.session.errorCount + 1)
    },
    
    /**
     * 更新活跃时间
     */
    updateActiveTime(): void {
      this.updateNestedState('session.activeTime', this.session.activeTime + 1)
    },
    
    /**
     * 添加搜索历史
     */
    addSearchHistory(query: string): void {
      const history = this.app.settings.search.searchHistory
      const updatedHistory = [query, ...history.filter((h: string) => h !== query)].slice(0, 20)
      this.updateNestedState('app.settings.search.searchHistory', updatedHistory)
    },
    
    /**
     * 清空搜索历史
     */
    clearSearchHistory(): void {
      this.updateNestedState('app.settings.search.searchHistory', [])
    },
    
    /**
     * 更新应用设置
     */
    updateAppSettings(settings: Partial<UnifiedState['app']['settings']>): void {
      this.updateNestedState('app.settings', { ...this.app.settings, ...settings })
    },
    
    /**
     * 发送状态变更事件
     */
    emitStateChangeEvent(event: StateChangeEvent): void {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('unified-state-change', {
          detail: event
        }))
      }
    },
    
    /**
     * 获取嵌套值
     */
    getNestedValue(path: string): any {
      return path.split('.').reduce((obj, key) => obj?.[key], this)
    },
    
    /**
     * 设置嵌套值
     */
    setNestedValue(path: string, value: any): void {
      const keys = path.split('.')
      const lastKey = keys.pop()!
      const target = keys.reduce((obj, key) => obj[key], this)
      target[lastKey] = value
    }
  },

  // 持久化配置
  persist: {
    key: 'unified-state-store',
    storage: (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
    },
    paths: [
      'user.preferences',
      'plugins.enabledStates', 
      'plugins.configurations',
      'plugins.usageMetrics',
      'plugins.lastSync',
      'app.settings',
      'session'
    ]
  } as PersistenceOptions
})

/**
 * 生成会话ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 统一状态变更监听器
 */
export class UnifiedStateListener {
  private listeners: Map<string, Array<(event: StateChangeEvent) => void>> = new Map()

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('unified-state-change', this.handleStateChange as EventListener)
    }
  }

  /**
   * 添加状态变更监听器
   */
  on(type: StateChangeEvent['type'], subtype: string, listener: (event: StateChangeEvent) => void): void {
    const key = `${type}.${subtype}`
    if (!this.listeners.has(key)) {
      this.listeners.set(key, [])
    }
    this.listeners.get(key)!.push(listener)
  }

  /**
   * 移除状态变更监听器
   */
  off(type: StateChangeEvent['type'], subtype: string, listener: (event: StateChangeEvent) => void): void {
    const key = `${type}.${subtype}`
    const eventListeners = this.listeners.get(key)
    if (eventListeners) {
      const index = eventListeners.indexOf(listener)
      if (index > -1) {
        eventListeners.splice(index, 1)
      }
    }
  }

  /**
   * 处理状态变更事件
   */
  private handleStateChange(event: Event): void {
    const customEvent = event as CustomEvent<StateChangeEvent>
    const stateChangeEvent = customEvent.detail
    const key = `${stateChangeEvent.type}.${stateChangeEvent.subtype}`
    const eventListeners = this.listeners.get(key)
    
    if (eventListeners) {
      for (const listener of eventListeners) {
        try {
          listener(stateChangeEvent)
        } catch (error) {
          const appError = handlePluginError('Unified state change listener', error)
          logger.error('Unified state change listener error', appError)
        }
      }
    }
  }

  /**
   * 清理监听器
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('unified-state-change', this.handleStateChange as EventListener)
    }
    this.listeners.clear()
  }
}

// 全局状态监听器实例
export const unifiedStateListener = new UnifiedStateListener()