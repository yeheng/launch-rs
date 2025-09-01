import type {
  PluginManager,
  PluginManagerEvents,
  SearchContext,
  SearchPlugin,
  SearchResultItem
} from './search-plugins'
import { useUnifiedStateStore, unifiedStateListener } from './state/unified-state-manager'
import type { EnhancedSearchPlugin, PluginCategory } from './plugins/types'
import { logger } from './logger'
import { handlePluginError } from './error-handler'
import { InputValidator } from './security/input-validator'
import { searchCache, withSearchCache } from './cache/search-cache'
import { intelligentCache } from './cache/intelligent-cache'

/**
 * 搜索插件管理器实现
 */
export class SearchPluginManager implements PluginManager {
  private plugins = new Map<string, SearchPlugin>()
  private listeners = new Map<keyof PluginManagerEvents, Function[]>()
  private isInitialized = false
  private stateStore: ReturnType<typeof useUnifiedStateStore> | null = null

  constructor() {
    this.initialize()
  }

  private async initialize() {
    if (this.isInitialized) return

    logger.info('初始化搜索插件管理器')

    // Initialize state store
    try {
      this.stateStore = useUnifiedStateStore()
    } catch (error) {
      logger.warn('State store not available, running without persistence:', error)
    }

    // Setup state change listeners
    this.setupStateChangeListeners()

    this.isInitialized = true
  }

  /**
   * 注册插件
   */
  async register(plugin: SearchPlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`插件 ${plugin.id} 已存在`)
    }

    try {
      // Initialize plugin state in store
      if (this.stateStore) {
        this.stateStore.initializePlugin(plugin.id)

        // Apply persisted enabled state
        plugin.enabled = this.stateStore.isPluginEnabled(plugin.id)
      }

      // 初始化插件
      if (plugin.initialize) {
        await plugin.initialize()
      }

      this.plugins.set(plugin.id, plugin)
      this.emit('plugin:registered', plugin)

      // Update statistics
      this.updateStatistics()

      logger.info(`插件 ${plugin.name} (${plugin.id}) 注册成功`)
    } catch (error) {
      const appError = handlePluginError(`注册插件 ${plugin.id}`, error)
      logger.error(`注册插件 ${plugin.id} 失败`, appError)
      throw error
    }
  }

  /**
   * 取消注册插件
   */
  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      logger.warn(`插件 ${pluginId} 不存在`)
      return
    }

    try {
      // 销毁插件
      if (plugin.destroy) {
        await plugin.destroy()
      }

      this.plugins.delete(pluginId)

      // Remove from state store
      if (this.stateStore) {
        this.stateStore.removePlugin(pluginId)
      }

      this.emit('plugin:unregistered', pluginId)

      // Update statistics
      this.updateStatistics()

      logger.info(`插件 ${plugin.name} (${pluginId}) 取消注册成功`)
    } catch (error) {
      const appError = handlePluginError(`取消注册插件 ${pluginId}`, error)
      logger.error(`取消注册插件 ${pluginId} 失败`, appError)
      throw error
    }
  }

  /**
   * 获取插件
   */
  getPlugin(pluginId: string): SearchPlugin | undefined {
    return this.plugins.get(pluginId)
  }

  /**
   * 获取所有插件
   */
  getPlugins(): SearchPlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * 获取所有插件（别名方法）
   */
  getAllPlugins(): SearchPlugin[] {
    return this.getPlugins()
  }

  /**
   * 获取启用的插件
   */
  getEnabledPlugins(): SearchPlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.enabled)
  }

  /**
   * 启用插件
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`插件 ${pluginId} 不存在`)
    }

    if (plugin.enabled) {
      return
    }

    plugin.enabled = true

    // Persist state
    if (this.stateStore) {
      this.stateStore.setPluginEnabled(pluginId, true)
    }

    this.emit('plugin:enabled', pluginId)
    logger.info(`插件 ${plugin.name} 已启用`)
  }

  /**
   * 禁用插件
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`插件 ${pluginId} 不存在`)
    }

    if (!plugin.enabled) {
      return
    }

    plugin.enabled = false

    // Persist state
    if (this.stateStore) {
      this.stateStore.setPluginEnabled(pluginId, false)
    }

    this.emit('plugin:disabled', pluginId)
    logger.info(`插件 ${plugin.name} 已禁用`)
  }

  /**
   * 执行搜索（带缓存支持）
   */
  async search(query: string, maxResults = 50): Promise<SearchResultItem[]> {
    // 输入验证和清理
    const validationResult = InputValidator.validateSearchQuery(query)
    if (!validationResult.isValid) {
      logger.warn('搜索查询验证失败', { 
        query, 
        errors: validationResult.errors 
      })
      return []
    }

    // 记录验证警告
    if (validationResult.warnings.length > 0) {
      logger.info('搜索查询验证警告', { 
        query, 
        warnings: validationResult.warnings 
      })
    }

    const sanitizedQuery = validationResult.sanitized
    if (!sanitizedQuery.trim()) {
      return []
    }

    // 尝试从缓存获取
    const cachedResults = await searchCache.get('global-search', sanitizedQuery, { maxResults })
    if (cachedResults) {
      this.emit('search:results', cachedResults)
      this.emit('search:end', sanitizedQuery, cachedResults.length)
      
      // 记录缓存命中到智能缓存系统
      intelligentCache.recordSearch('global-search', sanitizedQuery, cachedResults, 1)
      
      logger.debug(`搜索缓存命中: "${sanitizedQuery}" -> ${cachedResults.length} 个结果`)
      return cachedResults
    }

    this.emit('search:start', sanitizedQuery)
    const startTime = Date.now()

    try {
      const context = this.createSearchContext(sanitizedQuery, maxResults)
      const enabledPlugins = this.getEnabledPlugins()
      const allResults: SearchResultItem[] = []

      // 检查是否有插件前缀
      const hasPrefix = this.checkSearchPrefix(sanitizedQuery)

      // 并行执行所有启用插件的搜索（每个插件都有独立的缓存）
      const searchPromises = enabledPlugins.map(async (plugin) => {
        const pluginStartTime = Date.now()
        let pluginResults: SearchResultItem[] = []
        let hasError = false

        try {
          // 如果有前缀，只搜索支持该前缀的插件
          if (hasPrefix && plugin.searchPrefixes) {
            const matchedPrefix = plugin.searchPrefixes.find(prefix =>
              sanitizedQuery.toLowerCase().startsWith(prefix.toLowerCase())
            )
            if (!matchedPrefix) {
              return []
            }
            // 移除前缀后搜索
            const queryWithoutPrefix = sanitizedQuery.slice(matchedPrefix.length).trim()
            const prefixContext = this.createSearchContext(queryWithoutPrefix, maxResults)
            
            // 使用带缓存的搜索
            const cachedSearch = withSearchCache(
              plugin.id,
              (context: SearchContext) => plugin.search(context)
            )
            pluginResults = await cachedSearch({ ...prefixContext, query: queryWithoutPrefix, maxResults })
          } else {
            // 正常搜索（带缓存）
            const cachedSearch = withSearchCache(
              plugin.id,
              (context: SearchContext) => plugin.search(context)
            )
            pluginResults = await cachedSearch({ ...context, query: sanitizedQuery, maxResults })
          }
        } catch (error) {
          const appError = handlePluginError(`插件 ${plugin.name} 搜索`, error)
          logger.error(`插件 ${plugin.name} 搜索失败`, appError)
          hasError = true
          pluginResults = []
        } finally {
          // Record plugin usage metrics
          const pluginSearchTime = Date.now() - pluginStartTime
          if (this.stateStore) {
            this.stateStore.recordPluginUsage(
              plugin.id,
              pluginSearchTime,
              pluginResults.length,
              hasError
            )
          }
          
          // 记录到智能缓存系统
          intelligentCache.recordSearch(plugin.id, sanitizedQuery, pluginResults, pluginSearchTime)
        }

        return pluginResults
      })

      const pluginResults = await Promise.all(searchPromises)

      // 合并所有结果
      for (const results of pluginResults) {
        allResults.push(...results)
      }

      // 排序和去重
      const sortedResults = this.sortAndDeduplicateResults(allResults)

      // 限制结果数量
      const finalResults = sortedResults.slice(0, maxResults)

      const searchTime = Date.now() - startTime
      
      // 缓存综合搜索结果
      await searchCache.set('global-search', sanitizedQuery, finalResults, searchTime, { maxResults })
      
      // 记录综合搜索到智能缓存
      intelligentCache.recordSearch('global-search', sanitizedQuery, finalResults, searchTime)

      logger.info(`搜索完成: "${sanitizedQuery}" -> ${finalResults.length} 个结果 (${searchTime}ms)`)

      this.emit('search:results', finalResults)
      this.emit('search:end', sanitizedQuery, finalResults.length)

      return finalResults
    } catch (error) {
      const appError = handlePluginError('搜索过程', error)
      logger.error('搜索过程中发生错误', appError)
      this.emit('search:end', query, 0)
      return []
    }
  }

  /**
   * 检查搜索前缀
   */
  private checkSearchPrefix(query: string): boolean {
    const enabledPlugins = this.getEnabledPlugins()
    return enabledPlugins.some(plugin =>
      plugin.searchPrefixes &&
      plugin.searchPrefixes.some(prefix =>
        query.toLowerCase().startsWith(prefix.toLowerCase())
      )
    )
  }

  /**
   * 创建搜索上下文
   */
  private createSearchContext(query: string, maxResults?: number): SearchContext {
    const queryLower = query.toLowerCase().trim()
    const keywords = queryLower.split(/\s+/).filter(Boolean)

    return {
      query,
      queryLower,
      keywords,
      maxResults
    }
  }

  /**
   * 排序和去重结果
   */
  private sortAndDeduplicateResults(results: SearchResultItem[]): SearchResultItem[] {
    // 去重（基于id）
    const uniqueResults = new Map<string, SearchResultItem>()

    for (const result of results) {
      const existing = uniqueResults.get(result.id)
      if (!existing || result.priority > existing.priority) {
        uniqueResults.set(result.id, result)
      }
    }

    // 排序
    return Array.from(uniqueResults.values()).sort(this.compareSearchResults)
  }

  /**
   * 结果排序比较函数
   */
  private compareSearchResults(a: SearchResultItem, b: SearchResultItem): number {
    // 首先按优先级排序（高优先级在前）
    if (a.priority !== b.priority) {
      return b.priority - a.priority
    }

    // 然后按标题字母顺序排序
    return a.title.localeCompare(b.title)
  }

  /**
   * 添加事件监听器
   */
  on<K extends keyof PluginManagerEvents>(event: K, listener: PluginManagerEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener as Function)
  }

  /**
   * 移除事件监听器
   */
  off<K extends keyof PluginManagerEvents>(event: K, listener: PluginManagerEvents[K]): void {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return

    const index = eventListeners.indexOf(listener as Function)
    if (index > -1) {
      eventListeners.splice(index, 1)
    }
  }

  /**
   * 触发事件
   */
  emit<K extends keyof PluginManagerEvents>(event: K, ...args: Parameters<PluginManagerEvents[K]>): void {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners) return

    for (const listener of eventListeners) {
      try {
        listener(...args)
      } catch (error) {
        const appError = handlePluginError(`事件监听器执行 (${event})`, error)
        logger.error(`事件监听器执行失败 (${event})`, appError)
      }
    }
  }

  /**
   * 获取插件配置
   */
  getPluginConfig(pluginId: string): Record<string, any> {
    if (!this.stateStore) {
      return {}
    }
    return this.stateStore.getPluginConfig(pluginId)
  }

  /**
   * 设置插件配置
   */
  setPluginConfig(pluginId: string, config: Record<string, any>): void {
    if (!this.stateStore) {
      logger.warn('State store not available, configuration not persisted')
      return
    }

    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`插件 ${pluginId} 不存在`)
    }

    this.stateStore.setPluginConfig(pluginId, config)

    // Apply configuration to plugin if it has a configure method
    if ('configure' in plugin && typeof plugin.configure === 'function') {
      try {
        (plugin as any).configure(config)
      } catch (error) {
        const appError = handlePluginError(`配置插件 ${pluginId}`, error)
        logger.error(`配置插件 ${pluginId} 失败`, appError)
      }
    }

    this.emit('plugin:configured', pluginId, config)
  }

  /**
   * 更新插件配置
   */
  updatePluginConfig(pluginId: string, updates: Record<string, any>): void {
    if (!this.stateStore) {
      logger.warn('State store not available, configuration not persisted')
      return
    }

    this.stateStore.updatePluginConfig(pluginId, updates)

    const newConfig = this.stateStore.getPluginConfig(pluginId)
    const plugin = this.plugins.get(pluginId)

    // Apply configuration to plugin if it has a configure method
    if (plugin && 'configure' in plugin && typeof plugin.configure === 'function') {
      try {
        (plugin as any).configure(newConfig)
      } catch (error) {
        const appError = handlePluginError(`应用配置到插件 ${pluginId}`, error)
        logger.error(`配置插件 ${pluginId} 失败`, appError)
      }
    }

    this.emit('plugin:configured', pluginId, newConfig)
  }

  /**
   * 获取插件统计信息
   */
  getPluginStatistics() {
    if (!this.stateStore) {
      return {
        total: this.plugins.size,
        installed: this.plugins.size,
        enabled: this.getEnabledPlugins().length,
        byCategory: {} as Record<PluginCategory, number>,
        withIssues: 0
      }
    }

    return this.stateStore.statistics
  }

  /**
   * 获取插件使用指标
   */
  getPluginMetrics(pluginId: string) {
    if (!this.stateStore) {
      return {
        searchCount: 0,
        resultsCount: 0,
        avgSearchTime: 0,
        lastUsed: 0,
        errorCount: 0,
        successRate: 100
      }
    }

    return this.stateStore.getPluginMetrics(pluginId)
  }

  /**
   * 获取最常用的插件
   */
  getMostUsedPlugins(limit = 5) {
    if (!this.stateStore) {
      return []
    }

    return this.stateStore.mostUsedPlugins(limit)
  }

  /**
   * 获取有问题的插件
   */
  getPluginsWithIssues(): string[] {
    if (!this.stateStore) {
      return []
    }

    return this.stateStore.pluginsWithIssues
  }

  /**
   * 重置插件指标
   */
  resetPluginMetrics(pluginId: string): void {
    if (!this.stateStore) {
      logger.warn('State store not available, metrics not reset')
      return
    }

    this.stateStore.resetPluginMetrics(pluginId)
  }

  /**
   * 重置所有指标
   */
  resetAllMetrics(): void {
    if (!this.stateStore) {
      logger.warn('State store not available, metrics not reset')
      return
    }

    this.stateStore.resetAllMetrics()
  }

  /**
   * 导出插件状态
   */
  exportPluginState() {
    if (!this.stateStore) {
      return null
    }

    return this.stateStore.exportState()
  }

  /**
   * 导入插件状态
   */
  importPluginState(state: any): void {
    if (!this.stateStore) {
      logger.warn('State store not available, state not imported')
      return
    }

    this.stateStore.importState(state)

    // Apply persisted states to current plugins
    for (const [pluginId, plugin] of this.plugins) {
      plugin.enabled = this.stateStore.isPluginEnabled(pluginId)

      // Apply configuration if plugin supports it
      const config = this.stateStore.getPluginConfig(pluginId)
      if (Object.keys(config).length > 0 && 'configure' in plugin && typeof plugin.configure === 'function') {
        try {
          (plugin as any).configure(config)
        } catch (error) {
          const appError = handlePluginError(`应用配置到插件 ${pluginId}`, error)
          logger.error(`应用配置到插件 ${pluginId} 失败`, appError)
        }
      }
    }

    this.updateStatistics()
  }

  /**
   * 设置状态变化监听器
   */
  private setupStateChangeListeners(): void {
    // Listen for state changes from other instances
    unifiedStateListener.on('plugins', 'nested-update', (event) => {
      const path = event.path as string
      if (path.startsWith('plugins.enabledStates.')) {
        const pluginId = path.replace('plugins.enabledStates.', '')
        const plugin = this.plugins.get(pluginId)
        if (plugin && plugin.enabled !== event.newValue) {
          plugin.enabled = event.newValue as boolean
          this.emit(event.newValue ? 'plugin:enabled' : 'plugin:disabled', pluginId)
        }
      }
    })

    unifiedStateListener.on('plugins', 'nested-update', (event) => {
      const path = event.path as string
      if (path.startsWith('plugins.configurations.')) {
        const pluginId = path.replace('plugins.configurations.', '')
        const plugin = this.plugins.get(pluginId)
        if (plugin && 'configure' in plugin && typeof plugin.configure === 'function') {
          try {
            (plugin as any).configure(event.newValue)
            this.emit('plugin:configured', pluginId, event.newValue)
          } catch (error) {
            const appError = handlePluginError(`应用配置到插件 ${pluginId}`, error)
            logger.error(`应用配置到插件 ${pluginId} 失败`, appError)
          }
        }
      }
    })
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(): void {
    if (!this.stateStore) {
      return
    }

    // Calculate category statistics
    const categoryStats: Record<PluginCategory, number> = {} as Record<PluginCategory, number>

    for (const plugin of this.plugins.values()) {
      const enhancedPlugin = plugin as EnhancedSearchPlugin
      if (enhancedPlugin.metadata?.category) {
        const category = enhancedPlugin.metadata.category
        categoryStats[category] = (categoryStats[category] || 0) + 1
      }
    }

    this.stateStore.updateCategoryStatistics(categoryStats)
    this.stateStore.updateStatistics()
  }

  /**
   * 清理所有资源
   */
  async destroy(): Promise<void> {
    // 取消注册所有插件
    const pluginIds = Array.from(this.plugins.keys())
    for (const pluginId of pluginIds) {
      await this.unregister(pluginId)
    }

    // 清理事件监听器
    this.listeners.clear()

    // Cleanup state listener
    unifiedStateListener.destroy()

    // 清理缓存
    searchCache.destroy()
    intelligentCache.destroy()

    logger.info('插件管理器已销毁')
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStatistics() {
    return {
      searchCache: searchCache.getStatistics(),
      intelligentCache: intelligentCache.getLearningReport()
    }
  }

  /**
   * 清除搜索缓存
   */
  clearSearchCache(): void {
    searchCache.clear()
    logger.info('搜索缓存已清除')
  }

  /**
   * 清除特定插件的缓存
   */
  clearPluginCache(pluginId: string): void {
    searchCache.invalidatePlugin(pluginId)
    logger.info(`插件 ${pluginId} 的缓存已清除`)
  }

  /**
   * 预热插件缓存
   */
  async warmupPluginCache(pluginId: string, queries: string[]): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      logger.warn(`插件 ${pluginId} 不存在，无法预热缓存`)
      return
    }

    try {
      await searchCache.warmup(pluginId, queries, async (query) => {
        const context = this.createSearchContext(query)
        return await plugin.search(context)
      })

      logger.info(`插件 ${pluginId} 缓存预热完成`, { queryCount: queries.length })
    } catch (error) {
      const appError = handlePluginError(`预热插件 ${pluginId} 缓存`, error)
      logger.error(`预热插件 ${pluginId} 缓存失败`, appError)
    }
  }

  /**
   * 智能预热缓存
   */
  async intelligentWarmup(pluginId?: string): Promise<void> {
    try {
      if (pluginId) {
        // 预热特定插件
        const plugin = this.plugins.get(pluginId)
        if (!plugin) {
          logger.warn(`插件 ${pluginId} 不存在，无法智能预热`)
          return
        }

        await intelligentCache.intelligentWarmup(pluginId, async (query) => {
          const context = this.createSearchContext(query)
          return await plugin.search(context)
        })

        logger.info(`插件 ${pluginId} 智能预热完成`)
      } else {
        // 预热所有启用的插件
        const enabledPlugins = this.getEnabledPlugins()
        for (const plugin of enabledPlugins) {
          await intelligentCache.intelligentWarmup(plugin.id, async (query) => {
            const context = this.createSearchContext(query)
            return await plugin.search(context)
          })
        }

        logger.info('所有插件智能预热完成', { pluginCount: enabledPlugins.length })
      }
    } catch (error) {
      const appError = handlePluginError('智能预热缓存', error)
      logger.error('智能预热缓存失败', appError)
    }
  }

  /**
   * 获取缓存策略建议
   */
  async getCacheStrategy(pluginId: string, query: string, results: SearchResultItem[]) {
    return await intelligentCache.getCacheStrategy(pluginId, query, results)
  }

  /**
   * 预测热门查询
   */
  async predictHotQueries(pluginId?: string) {
    return await intelligentCache.predictHotQueries(pluginId)
  }

  /**
   * 清除学习数据
   */
  clearLearningData(): void {
    intelligentCache.clearLearningData()
    logger.info('智能缓存学习数据已清除')
  }
}

// 全局插件管理器实例
export const pluginManager = new SearchPluginManager()

/**
 * Vue 3 组合式 API 钩子函数，用于获取插件管理器实例
 */
export function useSearchPluginManager() {
  return pluginManager
}