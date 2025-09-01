/**
 * 插件事件总线系统
 * 实现模块间解耦通信机制
 */

import type { PluginCategory, PluginUsageMetrics } from './types'
import { logger } from '../logger'
import { handlePluginError } from '../error-handler'

/**
 * 事件总线事件基础接口
 */
export interface EventBusEvent {
  /** 事件类型 */
  type: string
  /** 事件时间戳 */
  timestamp: number
  /** 事件ID，用于追踪 */
  eventId?: string
  /** 事件来源 */
  source?: string
  /** 事件优先级 (1-10, 10为最高) */
  priority?: number
  /** 是否异步处理 */
  async?: boolean
}

/**
 * 插件生命周期事件
 */
export interface PluginLifecycleEvent extends EventBusEvent {
  type: 
    | 'plugin.registered'
    | 'plugin.unregistered'
    | 'plugin.enabled'
    | 'plugin.disabled'
    | 'plugin.installed'
    | 'plugin.uninstalled'
    | 'plugin.updated'
    | 'plugin.system.initializing'
    | 'plugin.system.initialized'
    | 'plugin.system.destroyed'
    | 'plugin.loading.started'
    | 'plugin.loading.completed'
  /** 插件ID */
  pluginId: string
  /** 插件名称 */
  pluginName?: string
  /** 插件版本 */
  version?: string
  /** 插件类别 */
  category?: PluginCategory
  /** 操作来源 */
  triggeredBy?: 'user' | 'system' | 'auto' | 'api'
  /** 额外数据 */
  data?: Record<string, any>
}

/**
 * 插件状态变化事件
 */
export interface PluginStateEvent extends EventBusEvent {
  type:
    | 'plugin.state.enabled'
    | 'plugin.state.disabled'
    | 'plugin.state.configured'
    | 'plugin.state.usage_recorded'
    | 'plugin.state.reset'
  /** 插件ID */
  pluginId: string
  /** 状态路径 */
  statePath?: string
  /** 旧值 */
  previousValue?: any
  /** 新值 */
  newValue?: any
  /** 配置变更详情 */
  configChange?: {
    key: string
    oldValue: any
    newValue: any
  }
  /** 使用指标 */
  usageMetrics?: Partial<PluginUsageMetrics>
}

/**
 * 插件搜索事件
 */
export interface PluginSearchEvent extends EventBusEvent {
  type:
    | 'plugin.search.started'
    | 'plugin.search.completed'
    | 'plugin.search.results'
    | 'plugin.search.error'
    | 'plugin.search.cancelled'
  /** 搜索查询 */
  query: string
  /** 插件ID */
  pluginId?: string
  /** 搜索结果数量 */
  resultCount?: number
  /** 搜索耗时（毫秒） */
  duration?: number
  /** 搜索结果 */
  results?: any[]
  /** 错误信息 */
  error?: string
  /** 搜索上下文 */
  context?: {
    limit: number
    filters: Record<string, any>
    sortBy?: string
  }
}

/**
 * 插件错误事件
 */
export interface PluginErrorEvent extends EventBusEvent {
  type:
    | 'plugin.error occurred'
    | 'plugin.error.handled'
    | 'plugin.error.recovered'
  /** 插件ID */
  pluginId?: string
  /** 错误类型 */
  errorType: string
  /** 错误消息 */
  message: string
  /** 错误详情 */
  details?: any
  /** 错误严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** 是否已处理 */
  handled?: boolean
  /** 恢复策略 */
  recoveryStrategy?: string
}

/**
 * 系统事件
 */
export interface SystemEvent extends EventBusEvent {
  type:
    | 'system.startup'
    | 'system.shutdown'
    | 'system.config_changed'
    | 'system.health_check'
    | 'system.maintenance'
  /** 系统组件 */
  component?: string
  /** 系统状态 */
  status?: 'healthy' | 'warning' | 'error'
  /** 系统数据 */
  data?: Record<string, any>
}

/**
 * 统一事件类型
 */
export type PluginEvent = 
  | PluginLifecycleEvent
  | PluginStateEvent
  | PluginSearchEvent
  | PluginErrorEvent
  | SystemEvent

/**
 * 事件处理器接口
 */
export interface EventHandler<T extends PluginEvent = PluginEvent> {
  /** 事件处理函数 */
  (event: T): void | Promise<void>
  /** 处理器优先级 */
  priority?: number
  /** 是否只执行一次 */
  once?: boolean
  /** 条件过滤器 */
  filter?: (event: T) => boolean
}

/**
 * 事件订阅信息
 */
interface EventSubscription {
  /** 处理器函数 */
  handler: EventHandler
  /** 事件类型 */
  eventType: string
  /** 订阅ID */
  subscriptionId: string
  /** 是否活跃 */
  active: boolean
  /** 创建时间 */
  createdAt: number
}

/**
 * 事件中间件接口
 */
export interface EventBusMiddleware {
  /** 事件发送前处理 */
  beforeEmit?<T extends PluginEvent>(event: T): Promise<T | null>
  /** 事件发送后处理 */
  afterEmit?<T extends PluginEvent>(event: T, results: any[]): Promise<void>
  /** 错误处理 */
  onError?<T extends PluginEvent>(event: T, error: Error): Promise<boolean>
}

/**
 * 插件事件总线实现
 */
export class PluginEventBus {
  private static instance: PluginEventBus
  private subscriptions: Map<string, EventSubscription[]> = new Map()
  private middlewares: EventBusMiddleware[] = []
  private eventHistory: PluginEvent[] = []
  private maxHistorySize = 1000
  private isProcessing = false
  private eventQueue: PluginEvent[] = []

  /**
   * 获取单例实例
   */
  static getInstance(): PluginEventBus {
    if (!PluginEventBus.instance) {
      PluginEventBus.instance = new PluginEventBus()
    }
    return PluginEventBus.instance
  }

  /**
   * 私有构造函数
   */
  private constructor() {
    // 初始化事件总线
    logger.info('PluginEventBus initialized')
  }

  /**
   * 订阅事件
   */
  on<T extends PluginEvent>(
    eventType: T['type'],
    handler: EventHandler<T>,
    options: {
      priority?: number
      once?: boolean
      filter?: (event: T) => boolean
    } = {}
  ): string {
    const subscriptionId = this.generateSubscriptionId()
    const subscription: EventSubscription = {
      handler: handler as EventHandler,
      eventType,
      subscriptionId,
      active: true,
      createdAt: Date.now()
    }

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, [])
    }

    const subscriptions = this.subscriptions.get(eventType)!
    
    // 根据优先级插入
    const priority = options.priority || 5
    let insertIndex = subscriptions.length
    for (let i = 0; i < subscriptions.length; i++) {
      if ((subscriptions[i].handler.priority || 5) < priority) {
        insertIndex = i
        break
      }
    }
    
    subscriptions.splice(insertIndex, 0, subscription)

    logger.debug(`Event subscription added: ${eventType}`, { subscriptionId, priority })

    // 如果是一次性订阅，设置自动取消
    if (options.once) {
      const originalHandler = handler
      const onceHandler: EventHandler<T> = async (event) => {
        await originalHandler(event)
        this.off(eventType, onceHandler)
      }
      subscription.handler = onceHandler as EventHandler
    }

    // 如果有过滤器，包装处理器
    if (options.filter) {
      const originalHandler = subscription.handler
      const filteredHandler: EventHandler<T> = async (event) => {
        if (options.filter!(event as T)) {
          await originalHandler(event)
        }
      }
      subscription.handler = filteredHandler as EventHandler
    }

    return subscriptionId
  }

  /**
   * 取消订阅
   */
  off<T extends PluginEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    const subscriptions = this.subscriptions.get(eventType)
    if (!subscriptions) return

    const index = subscriptions.findIndex(sub => sub.handler === handler)
    if (index > -1) {
      subscriptions.splice(index, 1)
      logger.debug(`Event subscription removed: ${eventType}`)
    }

    // 如果没有订阅者了，删除事件类型
    if (subscriptions.length === 0) {
      this.subscriptions.delete(eventType)
    }
  }

  /**
   * 根据订阅ID取消订阅
   */
  unsubscribe(subscriptionId: string): void {
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.subscriptionId === subscriptionId)
      if (index > -1) {
        subscriptions.splice(index, 1)
        logger.debug(`Event subscription removed by ID: ${eventType}`, { subscriptionId })
        
        if (subscriptions.length === 0) {
          this.subscriptions.delete(eventType)
        }
        break
      }
    }
  }

  /**
   * 发送事件
   */
  async emit<T extends PluginEvent>(event: T): Promise<void> {
    return this.emitWithPriority(event, event.priority || 5)
  }

  /**
   * 带优先级发送事件
   */
  async emitWithPriority<T extends PluginEvent>(event: T, priority: number): Promise<void> {
    // 补充事件元数据
    const enhancedEvent: T = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      eventId: event.eventId || this.generateEventId(),
      priority,
      source: event.source || 'unknown'
    }

    try {
      // 应用中间件
      for (const middleware of this.middlewares) {
        if (middleware.beforeEmit) {
          const result = await middleware.beforeEmit(enhancedEvent)
          if (!result) return // 中间件阻止事件发送
        }
      }

      // 记录事件历史
      this.addToHistory(enhancedEvent)

      // 异步处理事件
      if (enhancedEvent.async) {
        this.eventQueue.push(enhancedEvent)
        this.processEventQueue()
      } else {
        await this.processEvent(enhancedEvent)
      }

      logger.debug(`Event emitted: ${enhancedEvent.type}`, { eventId: enhancedEvent.eventId })
    } catch (error) {
      const appError = handlePluginError(`Failed to emit event: ${enhancedEvent.type}`, error)
      logger.error('Event emission failed', appError)

      // 应用错误处理中间件
      for (const middleware of this.middlewares) {
        if (middleware.onError) {
          const shouldContinue = await middleware.onError(enhancedEvent, error as Error)
          if (!shouldContinue) break
        }
      }
    }
  }

  /**
   * 处理事件队列
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true
    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!
        await this.processEvent(event)
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * 处理单个事件
   */
  private async processEvent(event: PluginEvent): Promise<void> {
    const subscriptions = this.subscriptions.get(event.type)
    if (!subscriptions || subscriptions.length === 0) return

    const results: any[] = []
    
    for (const subscription of subscriptions) {
      if (!subscription.active) continue

      try {
        const result = subscription.handler(event)
        if (result instanceof Promise) {
          await result
        }
        results.push(result)
      } catch (error) {
        const appError = handlePluginError(`Event handler failed for ${event.type}`, error)
        logger.error('Event handler error', appError)
        
        // 继续处理其他订阅者
        results.push(null)
      }
    }

    // 应用后处理中间件
    for (const middleware of this.middlewares) {
      if (middleware.afterEmit) {
        await middleware.afterEmit(event, results)
      }
    }
  }

  /**
   * 一次性订阅
   */
  once<T extends PluginEvent>(
    eventType: T['type'],
    handler: EventHandler<T>,
    options?: Omit<Parameters<typeof this.on>[2], 'once'>
  ): string {
    return this.on(eventType, handler, { ...options, once: true })
  }

  /**
   * 添加中间件
   */
  use(middleware: EventBusMiddleware): void {
    this.middlewares.push(middleware)
    logger.info('EventBus middleware added')
  }

  /**
   * 移除中间件
   */
  removeMiddleware(middleware: EventBusMiddleware): void {
    const index = this.middlewares.indexOf(middleware)
    if (index > -1) {
      this.middlewares.splice(index, 1)
    }
  }

  /**
   * 获取事件历史
   */
  getEventHistory(limit?: number): PluginEvent[] {
    const history = [...this.eventHistory]
    return limit ? history.slice(-limit) : history
  }

  /**
   * 清除事件历史
   */
  clearHistory(): void {
    this.eventHistory = []
    logger.info('EventBus history cleared')
  }

  /**
   * 获取订阅统计
   */
  getSubscriptionStats(): {
    totalSubscriptions: number
    eventTypes: string[]
    subscriptionsByType: Record<string, number>
  } {
    const stats = {
      totalSubscriptions: 0,
      eventTypes: Array.from(this.subscriptions.keys()),
      subscriptionsByType: {} as Record<string, number>
    }

    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      stats.subscriptionsByType[eventType] = subscriptions.length
      stats.totalSubscriptions += subscriptions.length
    }

    return stats
  }

  /**
   * 销毁事件总线
   */
  destroy(): void {
    this.subscriptions.clear()
    this.middlewares = []
    this.eventHistory = []
    this.eventQueue = []
    logger.info('EventBus destroyed')
  }

  /**
   * 添加到事件历史
   */
  private addToHistory(event: PluginEvent): void {
    this.eventHistory.push(event)
    
    // 限制历史记录大小
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift()
    }
  }

  /**
   * 生成订阅ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * 全局事件总线实例
 */
export const pluginEventBus = PluginEventBus.getInstance()

/**
 * 事件总线工具函数
 */
export const eventBusUtils = {
  /**
   * 创建插件生命周期事件
   */
  createPluginLifecycleEvent<T extends PluginLifecycleEvent['type']>(
    type: T,
    pluginId: string,
    data: Omit<PluginLifecycleEvent, 'type' | 'pluginId' | 'timestamp' | 'eventId'> = {}
  ): PluginLifecycleEvent {
    return {
      type,
      pluginId,
      timestamp: Date.now(),
      ...data
    } as PluginLifecycleEvent
  },

  /**
   * 创建插件状态事件
   */
  createPluginStateEvent<T extends PluginStateEvent['type']>(
    type: T,
    pluginId: string,
    data: Omit<PluginStateEvent, 'type' | 'pluginId' | 'timestamp' | 'eventId'> = {}
  ): PluginStateEvent {
    return {
      type,
      pluginId,
      timestamp: Date.now(),
      ...data
    } as PluginStateEvent
  },

  /**
   * 创建插件搜索事件
   */
  createPluginSearchEvent<T extends PluginSearchEvent['type']>(
    type: T,
    query: string,
    data: Omit<PluginSearchEvent, 'type' | 'query' | 'timestamp' | 'eventId'> = {}
  ): PluginSearchEvent {
    return {
      type,
      query,
      timestamp: Date.now(),
      ...data
    } as PluginSearchEvent
  },

  /**
   * 创建插件错误事件
   */
  createPluginErrorEvent<T extends PluginErrorEvent['type']>(
    type: T,
    pluginId: string,
    errorType: string,
    message: string,
    details?: any,
    severity: PluginErrorEvent['severity'] = 'medium'
  ): PluginErrorEvent {
    return {
      type,
      pluginId,
      errorType,
      message,
      timestamp: Date.now(),
      severity,
      details
    } as PluginErrorEvent
  },

  /**
   * 等待特定事件
   */
  waitForEvent<T extends PluginEvent>(
    eventType: T['type'],
    timeout: number = 5000,
    filter?: (event: T) => boolean
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pluginEventBus.off(eventType, handler)
        reject(new Error(`Event ${eventType} timeout`))
      }, timeout)

      const handler: EventHandler<T> = (event) => {
        if (!filter || filter(event)) {
          clearTimeout(timeoutId)
          pluginEventBus.off(eventType, handler)
          resolve(event)
        }
      }

      pluginEventBus.on(eventType, handler)
    })
  }
}