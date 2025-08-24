import type { Component } from 'vue'

/**
 * 搜索结果项
 */
export interface SearchResultItem {
  /** 唯一标识 */
  id: string
  /** 显示标题 */
  title: string
  /** 描述信息 */
  description: string
  /** 图标组件 */
  icon: Component
  /** 优先级（数字越大优先级越高） */
  priority: number
  /** 执行动作 */
  action: () => void | Promise<void>
  /** 结果来源插件 */
  source: string
  /** 扩展数据 */
  metadata?: Record<string, any>
}

/**
 * 搜索上下文
 */
export interface SearchContext {
  /** 搜索查询字符串 */
  query: string
  /** 查询的小写版本（便于匹配） */
  queryLower: string
  /** 查询关键词数组 */
  keywords: string[]
  /** 最大结果数量 */
  maxResults?: number
}

/**
 * 搜索插件接口
 */
export interface SearchPlugin {
  /** 插件唯一标识 */
  id: string
  /** 插件名称 */
  name: string
  /** 插件描述 */
  description: string
  /** 插件图标 */
  icon: Component
  /** 插件版本 */
  version: string
  /** 是否启用 */
  enabled: boolean
  /** 优先级（影响搜索结果排序） */
  priority: number
  /** 支持的搜索前缀（例如 'calc:', 'file:'） */
  searchPrefixes?: string[]
  /** 初始化插件 */
  initialize?: () => Promise<void> | void
  /** 销毁插件 */
  destroy?: () => Promise<void> | void
  /** 执行搜索 */
  search: (context: SearchContext) => Promise<SearchResultItem[]> | SearchResultItem[]
  /** 插件配置 */
  settings?: {
    /** 配置项定义 */
    schema: PluginSettingSchema[]
    /** 当前配置值 */
    values: Record<string, any>
    /** 配置变更回调 */
    onChange?: (key: string, value: any) => void
  }
}

/**
 * 插件配置项schema
 */
export interface PluginSettingSchema {
  /** 配置项key */
  key: string
  /** 配置项名称 */
  label: string
  /** 配置项描述 */
  description?: string
  /** 配置项类型 */
  type: 'boolean' | 'string' | 'number' | 'select'
  /** 默认值 */
  defaultValue: any
  /** select类型的选项 */
  options?: Array<{ label: string; value: any }>
  /** 验证函数 */
  validate?: (value: any) => boolean | string
}

/**
 * 插件管理器事件
 */
export interface PluginManagerEvents {
  /** 插件注册时触发 */
  'plugin:registered': (plugin: SearchPlugin) => void
  /** 插件取消注册时触发 */
  'plugin:unregistered': (pluginId: string) => void
  /** 插件启用时触发 */
  'plugin:enabled': (pluginId: string) => void
  /** 插件禁用时触发 */
  'plugin:disabled': (pluginId: string) => void
  /** 搜索开始时触发 */
  'search:start': (query: string) => void
  /** 搜索结果时触发 */
  'search:results': (results: SearchResultItem[]) => void
  /** 搜索结束时触发 */
  'search:end': (query: string, resultCount: number) => void
}

/**
 * 搜索插件管理器接口
 */
export interface PluginManager {
  /** 注册插件 */
  register(plugin: SearchPlugin): Promise<void>
  /** 取消注册插件 */
  unregister(pluginId: string): Promise<void>
  /** 获取插件 */
  getPlugin(pluginId: string): SearchPlugin | undefined
  /** 获取所有插件 */
  getPlugins(): SearchPlugin[]
  /** 获取启用的插件 */
  getEnabledPlugins(): SearchPlugin[]
  /** 启用插件 */
  enablePlugin(pluginId: string): Promise<void>
  /** 禁用插件 */
  disablePlugin(pluginId: string): Promise<void>
  /** 执行搜索 */
  search(query: string, maxResults?: number): Promise<SearchResultItem[]>
  /** 添加事件监听器 */
  on<K extends keyof PluginManagerEvents>(event: K, listener: PluginManagerEvents[K]): void
  /** 移除事件监听器 */
  off<K extends keyof PluginManagerEvents>(event: K, listener: PluginManagerEvents[K]): void
  /** 触发事件 */
  emit<K extends keyof PluginManagerEvents>(event: K, ...args: Parameters<PluginManagerEvents[K]>): void
}

/**
 * 创建搜索上下文
 */
export function createSearchContext(query: string, maxResults?: number): SearchContext {
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
 * 结果排序比较函数
 */
export function compareSearchResults(a: SearchResultItem, b: SearchResultItem): number {
  // 首先按优先级排序（高优先级在前）
  if (a.priority !== b.priority) {
    return b.priority - a.priority
  }
  
  // 然后按标题字母顺序排序
  return a.title.localeCompare(b.title)
}