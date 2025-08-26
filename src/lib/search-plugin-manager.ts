import type {
  PluginManager,
  PluginManagerEvents,
  SearchContext,
  SearchPlugin,
  SearchResultItem
} from './search-plugins'
import { usePluginStateStore, pluginStateListener, type PluginStateChangeEvent } from './plugins/plugin-state-manager'
import type { EnhancedSearchPlugin, PluginCategory } from './plugins/types'

/**
 * 搜索插件管理器实现
 */
export class SearchPluginManager implements PluginManager {
  private plugins = new Map<string, SearchPlugin>()
  private listeners = new Map<keyof PluginManagerEvents, Function[]>()
  private isInitialized = false
  private stateStore: ReturnType<typeof usePluginStateStore> | null = null

  constructor() {
    this.initialize()
  }

  private async initialize() {
    if (this.isInitialized) return

    console.log('初始化搜索插件管理器')

    // Initialize state store
    try {
      this.stateStore = usePluginStateStore()
    } catch (error) {
      console.warn('State store not available, running without persistence:', error)
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
        const enhancedPlugin = plugin as EnhancedSearchPlugin
        this.stateStore.initializePlugin(enhancedPlugin)

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

      console.log(`插件 ${plugin.name} (${plugin.id}) 注册成功`)
    } catch (error) {
      console.error(`注册插件 ${plugin.id} 失败:`, error)
      throw error
    }
  }

  /**
   * 取消注册插件
   */
  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      console.warn(`插件 ${pluginId} 不存在`)
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

      console.log(`插件 ${plugin.name} (${pluginId}) 取消注册成功`)
    } catch (error) {
      console.error(`取消注册插件 ${pluginId} 失败:`, error)
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
    console.log(`插件 ${plugin.name} 已启用`)
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
    console.log(`插件 ${plugin.name} 已禁用`)
  }

  /**
   * 执行搜索
   */
  async search(query: string, maxResults = 50): Promise<SearchResultItem[]> {
    if (!query.trim()) {
      return []
    }

    this.emit('search:start', query)
    const startTime = Date.now()

    try {
      const context = this.createSearchContext(query, maxResults)
      const enabledPlugins = this.getEnabledPlugins()
      const allResults: SearchResultItem[] = []

      // 检查是否有插件前缀
      const hasPrefix = this.checkSearchPrefix(query)

      // 并行执行所有启用插件的搜索
      const searchPromises = enabledPlugins.map(async (plugin) => {
        const pluginStartTime = Date.now()
        let pluginResults: SearchResultItem[] = []
        let hasError = false

        try {
          // 如果有前缀，只搜索支持该前缀的插件
          if (hasPrefix && plugin.searchPrefixes) {
            const matchedPrefix = plugin.searchPrefixes.find(prefix =>
              query.toLowerCase().startsWith(prefix.toLowerCase())
            )
            if (!matchedPrefix) {
              return []
            }
            // 移除前缀后搜索
            const queryWithoutPrefix = query.slice(matchedPrefix.length).trim()
            const prefixContext = this.createSearchContext(queryWithoutPrefix, maxResults)
            pluginResults = await plugin.search(prefixContext)
          } else {
            // 正常搜索
            pluginResults = await plugin.search(context)
          }
        } catch (error) {
          console.error(`插件 ${plugin.name} 搜索失败:`, error)
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
      console.log(`搜索完成: "${query}" -> ${finalResults.length} 个结果 (${searchTime}ms)`)

      this.emit('search:results', finalResults)
      this.emit('search:end', query, finalResults.length)

      return finalResults
    } catch (error) {
      console.error('搜索过程中发生错误:', error)
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
        console.error(`事件监听器执行失败 (${event}):`, error)
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
      console.warn('State store not available, configuration not persisted')
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
        console.error(`配置插件 ${pluginId} 失败:`, error)
      }
    }

    this.emit('plugin:configured', pluginId, config)
  }

  /**
   * 更新插件配置
   */
  updatePluginConfig(pluginId: string, updates: Record<string, any>): void {
    if (!this.stateStore) {
      console.warn('State store not available, configuration not persisted')
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
        console.error(`配置插件 ${pluginId} 失败:`, error)
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
      console.warn('State store not available, metrics not reset')
      return
    }

    this.stateStore.resetPluginMetrics(pluginId)
  }

  /**
   * 重置所有指标
   */
  resetAllMetrics(): void {
    if (!this.stateStore) {
      console.warn('State store not available, metrics not reset')
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
      console.warn('State store not available, state not imported')
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
          console.error(`应用配置到插件 ${pluginId} 失败:`, error)
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
    pluginStateListener.on('enabled', (event) => {
      const plugin = this.plugins.get(event.pluginId)
      if (plugin && plugin.enabled !== event.newValue) {
        plugin.enabled = event.newValue as boolean
        this.emit(event.newValue ? 'plugin:enabled' : 'plugin:disabled', event.pluginId)
      }
    })

    pluginStateListener.on('disabled', (event) => {
      const plugin = this.plugins.get(event.pluginId)
      if (plugin && plugin.enabled !== event.newValue) {
        plugin.enabled = event.newValue as boolean
        this.emit('plugin:disabled', event.pluginId)
      }
    })

    pluginStateListener.on('configured', (event) => {
      const plugin = this.plugins.get(event.pluginId)
      if (plugin && 'configure' in plugin && typeof plugin.configure === 'function') {
        try {
          (plugin as any).configure(event.newValue)
          this.emit('plugin:configured', event.pluginId, event.newValue)
        } catch (error) {
          console.error(`应用配置到插件 ${event.pluginId} 失败:`, error)
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
    pluginStateListener.destroy()

    console.log('插件管理器已销毁')
  }
}

// 全局插件管理器实例
export const pluginManager = new SearchPluginManager()