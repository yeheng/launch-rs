/**
 * 全局错误处理服务
 * 提供应用级别的错误边界、错误恢复和错误报告机制
 */

import { reactive, type App } from 'vue'
import { logger } from './logger'
import { type AppError, createAppError, ErrorType, ErrorSeverity } from './error-handler'
import { pluginEventBus, eventBusUtils } from './plugins/plugin-event-bus'

/**
 * 错误统计信息
 */
interface ErrorStatistics {
  total: number
  byType: Record<ErrorType, number>
  bySeverity: Record<ErrorSeverity, number>
  recovered: number
  critical: number
  lastError: AppError | null
  lastErrorTime: number | null
}

/**
 * 错误恢复策略
 */
interface ErrorRecoveryStrategy {
  /** 策略名称 */
  name: string
  /** 适用错误类型 */
  applicableTypes: ErrorType[]
  /** 适用严重程度 */
  applicableSeverities: ErrorSeverity[]
  /** 恢复函数 */
  recover: (error: AppError) => Promise<boolean>
  /** 最大重试次数 */
  maxRetries: number
  /** 重试延迟（毫秒） */
  retryDelay: number
}

/**
 * 错误处理配置
 */
interface ErrorHandlingConfig {
  /** 是否启用全局错误处理 */
  enabled: boolean
  /** 是否启用错误恢复 */
  enableRecovery: boolean
  /** 是否启用错误上报 */
  enableReporting: boolean
  /** 最大错误历史记录数 */
  maxErrorHistory: number
  /** 错误恢复策略 */
  recoveryStrategies: ErrorRecoveryStrategy[]
  /** 是否在控制台显示错误详情 */
  showDetailsInConsole: boolean
  /** 是否自动上报严重错误 */
  autoReportCritical: boolean
}

/**
 * 全局错误处理服务
 */
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler
  private config: ErrorHandlingConfig
  private errorHistory: AppError[] = []
  private statistics: ErrorStatistics
  private recoveryAttempts: Map<string, number> = new Map()
  private isInitialized = false

  /**
   * 获取单例实例
   */
  static getInstance(config?: Partial<ErrorHandlingConfig>): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler(config)
    }
    return GlobalErrorHandler.instance
  }

  /**
   * 私有构造函数
   */
  private constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = {
      enabled: true,
      enableRecovery: true,
      enableReporting: true,
      maxErrorHistory: 100,
      showDetailsInConsole: import.meta.env.DEV,
      autoReportCritical: true,
      recoveryStrategies: this.getDefaultRecoveryStrategies(),
      ...config
    }

    this.statistics = reactive({
      total: 0,
      byType: {
        [ErrorType.NETWORK]: 0,
        [ErrorType.PLUGIN]: 0,
        [ErrorType.FILE_SYSTEM]: 0,
        [ErrorType.PERMISSION]: 0,
        [ErrorType.VALIDATION]: 0,
        [ErrorType.UNKNOWN]: 0
      },
      bySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0
      },
      recovered: 0,
      critical: 0,
      lastError: null,
      lastErrorTime: null
    })
  }

  /**
   * 初始化错误处理器
   */
  initialize(app?: App): void {
    if (this.isInitialized) {
      logger.warn('GlobalErrorHandler already initialized')
      return
    }

    if (!this.config.enabled) {
      logger.info('GlobalErrorHandler is disabled')
      return
    }

    try {
      // 设置全局错误处理
      this.setupGlobalErrorHandlers()
      
      // 注册Vue应用错误处理
      if (app) {
        this.setupVueErrorHandler(app)
      }

      // 设置事件总线错误监听
      this.setupEventBusHandlers()

      this.isInitialized = true
      logger.success('GlobalErrorHandler initialized successfully')

    } catch (error) {
      const appError = createAppError(
        ErrorType.UNKNOWN,
        ErrorSeverity.CRITICAL,
        'Failed to initialize GlobalErrorHandler',
        '错误处理系统初始化失败',
        error,
        false
      )
      logger.error('GlobalErrorHandler initialization failed', appError)
    }
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    // 处理未捕获的Promise错误
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason
      const appError = this.createErrorFromUnknown(error, 'unhandledrejection')
      
      this.handleError(appError)
      
      // 阻止默认错误处理
      event.preventDefault()
    })

    // 处理全局JavaScript错误
    window.addEventListener('error', (event) => {
      const error = event.error
      const appError = this.createErrorFromUnknown(error, 'global_error')
      
      this.handleError(appError)
      
      // 阻止默认错误处理
      event.preventDefault()
    })
  }

  /**
   * 设置Vue错误处理器
   */
  private setupVueErrorHandler(app: App): void {
    // Vue 3 全局错误处理器
    app.config.errorHandler = (error, instance, info) => {
      const appError = this.createErrorFromUnknown(error, 'vue_error', {
        component: instance?.$options?.name || 'Unknown',
        info
      })
      
      this.handleError(appError)
    }

    // Vue 3 警告处理器
    app.config.warnHandler = (msg, instance, trace) => {
      const appError = createAppError(
        ErrorType.VALIDATION,
        ErrorSeverity.LOW,
        `Vue Warning: ${msg}`,
        '组件出现警告',
        { msg, component: instance?.$options?.name, trace },
        true
      )
      
      this.handleError(appError)
    }
  }

  /**
   * 设置事件总线错误监听
   */
  private setupEventBusHandlers(): void {
    // 监听插件错误
    pluginEventBus.on('plugin.error occurred', (event) => {
      const severityMap = {
        'low': ErrorSeverity.LOW,
        'medium': ErrorSeverity.MEDIUM,
        'high': ErrorSeverity.HIGH,
        'critical': ErrorSeverity.CRITICAL
      }
      
      const errorEvent = event as any // 临时类型断言
      const appError = createAppError(
        ErrorType.PLUGIN,
        severityMap[errorEvent.severity],
        errorEvent.message,
        `插件 ${errorEvent.pluginId} 出现错误`,
        errorEvent.details,
        errorEvent.severity !== 'critical'
      )
      
      this.handleError(appError)
    })

    // 监听系统错误（使用health_check事件并设置error状态）
    pluginEventBus.on('system.health_check', (event) => {
      if (event.status === 'error') {
        const appError = createAppError(
          ErrorType.UNKNOWN,
          ErrorSeverity.HIGH,
          event.data?.message || 'System health check failed',
          '系统错误',
          event.data,
          false
        )
        
        this.handleError(appError)
      }
    })
  }

  /**
   * 处理错误
   */
  async handleError(error: AppError): Promise<void> {
    try {
      // 记录错误
      this.recordError(error)
      
      // 输出错误日志
      this.logError(error)
      
      // 尝试错误恢复
      if (this.config.enableRecovery && error.recoverable) {
        await this.attemptRecovery(error)
      }
      
      // 错误上报
      if (this.config.enableReporting && 
          (this.config.autoReportCritical || error.severity === ErrorSeverity.CRITICAL)) {
        await this.reportError(error)
      }
      
      // 发送错误事件
      await this.emitErrorEvent(error)
      
    } catch (handlingError) {
      logger.error('Error handling failed', handlingError)
    }
  }

  /**
   * 记录错误
   */
  private recordError(error: AppError): void {
    // 添加到错误历史
    this.errorHistory.push(error)
    
    // 限制历史记录数量
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory.shift()
    }
    
    // 更新统计信息
    this.statistics.total++
    this.statistics.byType[error.type]++
    this.statistics.bySeverity[error.severity]++
    
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.statistics.critical++
    }
    
    this.statistics.lastError = error
    this.statistics.lastErrorTime = Date.now()
  }

  /**
   * 输出错误日志
   */
  private logError(error: AppError): void {
    const logData = {
      type: error.type,
      severity: error.severity,
      message: error.message,
      userMessage: error.userMessage,
      timestamp: error.timestamp,
      details: this.config.showDetailsInConsole ? error.details : undefined
    }

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('🚨 CRITICAL ERROR', logData)
        break
      case ErrorSeverity.HIGH:
        logger.error('⚠️  HIGH ERROR', logData)
        break
      case ErrorSeverity.MEDIUM:
        logger.warn('⚡ MEDIUM ERROR', logData)
        break
      case ErrorSeverity.LOW:
        logger.info('💡 LOW ERROR', logData)
        break
    }
  }

  /**
   * 尝试错误恢复
   */
  private async attemptRecovery(error: AppError): Promise<boolean> {
    const errorKey = `${error.type}_${error.severity}_${error.message}`
    const attemptCount = this.recoveryAttempts.get(errorKey) || 0
    
    // 查找适用的恢复策略
    const strategy = this.config.recoveryStrategies.find(s => 
      s.applicableTypes.includes(error.type) && 
      s.applicableSeverities.includes(error.severity)
    )
    
    if (!strategy || attemptCount >= strategy.maxRetries) {
      return false
    }
    
    try {
      this.recoveryAttempts.set(errorKey, attemptCount + 1)
      
      // 延迟执行恢复策略
      await new Promise(resolve => setTimeout(resolve, strategy.retryDelay))
      
      const recovered = await strategy.recover(error)
      
      if (recovered) {
        this.statistics.recovered++
        this.recoveryAttempts.delete(errorKey)
        
        logger.info(`Error recovered: ${error.message}`, {
          strategy: strategy.name,
          attempts: attemptCount + 1
        })
        
        // 发送恢复事件
        await pluginEventBus.emit(eventBusUtils.createPluginErrorEvent(
          'plugin.error.recovered',
          'system',
          'error_recovery',
          `Error recovered using ${strategy.name}`,
          { originalError: error, strategy: strategy.name },
          'low'
        ))
        
        return true
      }
      
      return false
      
    } catch (recoveryError) {
      logger.error('Error recovery failed', recoveryError)
      return false
    }
  }

  /**
   * 上报错误
   */
  private async reportError(error: AppError): Promise<void> {
    try {
      // TODO: 实现具体的错误上报逻辑
      // 这里可以发送到错误监控服务，如 Sentry、LogRocket 等
      
      logger.info('Error reported', {
        type: error.type,
        severity: error.severity,
        message: error.message,
        timestamp: error.timestamp
      })
      
    } catch (reportError) {
      logger.error('Error reporting failed', reportError)
    }
  }

  /**
   * 发送错误事件
   */
  private async emitErrorEvent(error: AppError): Promise<void> {
    try {
      await pluginEventBus.emit(eventBusUtils.createPluginErrorEvent(
        'plugin.error occurred',
        'global_handler',
        error.type,
        error.message,
        error,
        error.severity
      ))
    } catch (eventError) {
      logger.error('Failed to emit error event', eventError)
    }
  }

  /**
   * 从未知错误创建AppError
   */
  private createErrorFromUnknown(
    error: any, 
    source: string, 
    additionalDetails?: any
  ): AppError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    
    let type = ErrorType.UNKNOWN
    let severity = ErrorSeverity.MEDIUM
    let userMessage = '操作失败，请稍后重试'
    
    // 根据错误信息推断类型和严重程度
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      type = ErrorType.NETWORK
      userMessage = '网络连接失败，请检查网络设置'
    } else if (errorMessage.includes('permission') || errorMessage.includes('权限')) {
      type = ErrorType.PERMISSION
      severity = ErrorSeverity.HIGH
      userMessage = '权限不足，请检查应用权限设置'
    } else if (errorMessage.includes('plugin') || source.includes('plugin')) {
      type = ErrorType.PLUGIN
      userMessage = '插件功能出现异常'
    } else if (errorMessage.includes('file') || errorMessage.includes('filesystem')) {
      type = ErrorType.FILE_SYSTEM
      userMessage = '文件操作失败'
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      type = ErrorType.VALIDATION
      severity = ErrorSeverity.LOW
      userMessage = '数据格式不正确，请检查输入'
    }
    
    return createAppError(
      type,
      severity,
      errorMessage,
      userMessage,
      {
        source,
        originalError: error,
        ...additionalDetails
      },
      severity !== ErrorSeverity.CRITICAL
    )
  }

  /**
   * 获取默认恢复策略
   */
  private getDefaultRecoveryStrategies(): ErrorRecoveryStrategy[] {
    return [
      {
        name: 'network_retry',
        applicableTypes: [ErrorType.NETWORK],
        applicableSeverities: [ErrorSeverity.LOW, ErrorSeverity.MEDIUM],
        recover: async () => {
          // 网络错误恢复策略：等待网络恢复
          try {
            await fetch('/ping', { method: 'HEAD' })
            return true
          } catch {
            return false
          }
        },
        maxRetries: 3,
        retryDelay: 2000
      },
      {
        name: 'plugin_reload',
        applicableTypes: [ErrorType.PLUGIN],
        applicableSeverities: [ErrorSeverity.LOW, ErrorSeverity.MEDIUM],
        recover: async (error) => {
          // 插件错误恢复策略：重新加载插件
          try {
            // TODO: 实现插件重新加载逻辑
            logger.info('Attempting plugin recovery', { error })
            return true
          } catch {
            return false
          }
        },
        maxRetries: 2,
        retryDelay: 1000
      },
      {
        name: 'validation_retry',
        applicableTypes: [ErrorType.VALIDATION],
        applicableSeverities: [ErrorSeverity.LOW],
        recover: async () => {
          // 验证错误恢复策略：清除缓存重试
          return true
        },
        maxRetries: 1,
        retryDelay: 500
      }
    ]
  }

  /**
   * 获取错误统计信息
   */
  getStatistics(): ErrorStatistics {
    return { ...this.statistics }
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(limit?: number): AppError[] {
    const history = [...this.errorHistory]
    return limit ? history.slice(-limit) : history
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = []
    this.recoveryAttempts.clear()
    logger.info('Error history cleared')
  }

  /**
   * 手动上报错误
   */
  async reportErrorManually(error: AppError): Promise<void> {
    await this.reportError(error)
  }

  /**
   * 销毁错误处理器
   */
  destroy(): void {
    this.errorHistory = []
    this.recoveryAttempts.clear()
    this.isInitialized = false
    logger.info('GlobalErrorHandler destroyed')
  }
}

/**
 * 全局错误处理器实例
 */
export const globalErrorHandler = GlobalErrorHandler.getInstance()

/**
 * Vue插件安装函数
 */
export function installGlobalErrorHandler(app: App, config?: Partial<ErrorHandlingConfig>): void {
  const handler = GlobalErrorHandler.getInstance(config)
  handler.initialize(app)
  
  // 提供全局访问
  app.config.globalProperties.$errorHandler = handler
  app.provide('globalErrorHandler', handler)
}