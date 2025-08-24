import type {
    PluginManager,
    PluginManagerEvents,
    SearchContext,
    SearchPlugin,
    SearchResultItem
} from './search-plugins'

/**
 * 搜索插件管理器实现
 */
export class SearchPluginManager implements PluginManager {
  private plugins = new Map<string, SearchPlugin>()
  private listeners = new Map<keyof PluginManagerEvents, Function[]>()
  private isInitialized = false

  constructor() {
    this.initialize()
  }

  private async initialize() {
    if (this.isInitialized) return
    
    console.log('初始化搜索插件管理器')
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
      // 初始化插件
      if (plugin.initialize) {
        await plugin.initialize()
      }

      this.plugins.set(plugin.id, plugin)
      this.emit('plugin:registered', plugin)
      
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
      this.emit('plugin:unregistered', pluginId)
      
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
            return await plugin.search(prefixContext)
          }
          
          // 正常搜索
          return await plugin.search(context)
        } catch (error) {
          console.error(`插件 ${plugin.name} 搜索失败:`, error)
          return []
        }
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
    
    console.log('插件管理器已销毁')
  }
}

// 全局插件管理器实例
export const pluginManager = new SearchPluginManager()