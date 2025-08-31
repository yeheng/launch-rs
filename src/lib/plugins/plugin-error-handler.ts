import type { SearchPlugin } from '../search-plugins'
import type { EnhancedSearchPlugin, PluginHealthStatus } from './types'
import { PluginHealthLevel, PluginIssueType } from './types'
import { PluginManagementError, PluginManagementErrorType } from './plugin-management-service'
import { toast } from '@/components/ui/toast'
import { logger } from '../logger'
import { handlePluginError } from '../error-handler'

/**
 * Plugin error severity levels
 */
export enum PluginErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Plugin error recovery strategies
 */
export enum PluginRecoveryStrategy {
  RETRY = 'retry',
  DISABLE = 'disable',
  RESTART = 'restart',
  REINSTALL = 'reinstall',
  IGNORE = 'ignore'
}

/**
 * Plugin error information
 */
export interface PluginError {
  /** Unique error ID */
  id: string
  /** Plugin ID that caused the error */
  pluginId: string
  /** Error type */
  type: PluginManagementErrorType
  /** Error message */
  message: string
  /** Error details */
  details?: string
  /** Error severity */
  severity: PluginErrorSeverity
  /** Timestamp when error occurred */
  timestamp: Date
  /** Stack trace if available */
  stack?: string
  /** Recovery strategy */
  recoveryStrategy: PluginRecoveryStrategy
  /** Whether error has been resolved */
  resolved: boolean
  /** Number of retry attempts */
  retryCount: number
  /** Maximum retry attempts */
  maxRetries: number
}

/**
 * Plugin fallback configuration
 */
export interface PluginFallback {
  /** Plugin ID */
  pluginId: string
  /** Fallback search function */
  fallbackSearch?: (query: string) => Promise<any[]>
  /** Fallback message to show users */
  fallbackMessage: string
  /** Whether to show fallback UI */
  showFallbackUI: boolean
  /** Fallback icon */
  fallbackIcon?: string
}

/**
 * Plugin error handler class
 */
export class PluginErrorHandler {
  private static instance: PluginErrorHandler
  private errors: Map<string, PluginError> = new Map()
  private fallbacks: Map<string, PluginFallback> = new Map()
  private errorListeners: Set<(error: PluginError) => void> = new Set()
  private recoveryListeners: Set<(pluginId: string) => void> = new Set()

  private constructor() {
    this.setupGlobalErrorHandling()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PluginErrorHandler {
    if (!PluginErrorHandler.instance) {
      PluginErrorHandler.instance = new PluginErrorHandler()
    }
    return PluginErrorHandler.instance
  }

  /**
   * Setup global error handling
   */
  private setupGlobalErrorHandling(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isPluginError(event.reason)) {
        this.handlePluginError(event.reason)
        event.preventDefault()
      }
    })

    // Handle global errors
    window.addEventListener('error', (event) => {
      if (this.isPluginError(event.error)) {
        this.handlePluginError(event.error)
      }
    })
  }

  /**
   * Check if error is plugin-related
   */
  private isPluginError(error: any): boolean {
    return error instanceof PluginManagementError ||
           (error && error.pluginId) ||
           (error && error.message && error.message.includes('plugin'))
  }

  /**
   * Handle plugin error
   */
  handlePluginError(error: Error | PluginManagementError, pluginId?: string): PluginError {
    const pluginError = this.createPluginError(error, pluginId)
    
    // Store error
    this.errors.set(pluginError.id, pluginError)
    
    // Notify listeners
    this.errorListeners.forEach(listener => listener(pluginError))
    
    // Apply recovery strategy
    this.applyRecoveryStrategy(pluginError)
    
    // Show user notification
    this.showErrorNotification(pluginError)
    
    return pluginError
  }

  /**
   * Create plugin error from generic error
   */
  private createPluginError(error: Error | PluginManagementError, pluginId?: string): PluginError {
    const id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    let type: PluginManagementErrorType
    let severity: PluginErrorSeverity
    let recoveryStrategy: PluginRecoveryStrategy
    let maxRetries: number

    if (error instanceof PluginManagementError) {
      type = error.type
      pluginId = error.pluginId || pluginId
      severity = this.determineSeverity(error.type)
      recoveryStrategy = this.determineRecoveryStrategy(error.type)
      maxRetries = this.determineMaxRetries(error.type)
    } else {
      type = PluginManagementErrorType.CONFIGURATION_ERROR
      severity = PluginErrorSeverity.MEDIUM
      recoveryStrategy = PluginRecoveryStrategy.RETRY
      maxRetries = 3
    }

    return {
      id,
      pluginId: pluginId || 'unknown',
      type,
      message: error.message,
      details: error instanceof PluginManagementError ? error.details : error.stack,
      severity,
      timestamp: new Date(),
      stack: error.stack,
      recoveryStrategy,
      resolved: false,
      retryCount: 0,
      maxRetries
    }
  }

  /**
   * Determine error severity
   */
  private determineSeverity(errorType: PluginManagementErrorType): PluginErrorSeverity {
    switch (errorType) {
      case PluginManagementErrorType.SECURITY_ERROR:
        return PluginErrorSeverity.CRITICAL
      
      case PluginManagementErrorType.INSTALLATION_FAILED:
      case PluginManagementErrorType.UNINSTALLATION_FAILED:
      case PluginManagementErrorType.DEPENDENCY_ERROR:
        return PluginErrorSeverity.HIGH
      
      case PluginManagementErrorType.CONFIGURATION_ERROR:
      case PluginManagementErrorType.VALIDATION_FAILED:
      case PluginManagementErrorType.UPDATE_FAILED:
        return PluginErrorSeverity.MEDIUM
      
      case PluginManagementErrorType.NETWORK_ERROR:
      case PluginManagementErrorType.PLUGIN_NOT_FOUND:
      case PluginManagementErrorType.PERMISSION_DENIED:
        return PluginErrorSeverity.LOW
      
      default:
        return PluginErrorSeverity.MEDIUM
    }
  }

  /**
   * Determine recovery strategy
   */
  private determineRecoveryStrategy(errorType: PluginManagementErrorType): PluginRecoveryStrategy {
    switch (errorType) {
      case PluginManagementErrorType.SECURITY_ERROR:
        return PluginRecoveryStrategy.DISABLE
      
      case PluginManagementErrorType.INSTALLATION_FAILED:
      case PluginManagementErrorType.UNINSTALLATION_FAILED:
        return PluginRecoveryStrategy.REINSTALL
      
      case PluginManagementErrorType.CONFIGURATION_ERROR:
        return PluginRecoveryStrategy.RESTART
      
      case PluginManagementErrorType.NETWORK_ERROR:
      case PluginManagementErrorType.PLUGIN_NOT_FOUND:
        return PluginRecoveryStrategy.RETRY
      
      case PluginManagementErrorType.DEPENDENCY_ERROR:
      case PluginManagementErrorType.VALIDATION_FAILED:
        return PluginRecoveryStrategy.DISABLE
      
      default:
        return PluginRecoveryStrategy.RETRY
    }
  }

  /**
   * Determine maximum retry attempts
   */
  private determineMaxRetries(errorType: PluginManagementErrorType): number {
    switch (errorType) {
      case PluginManagementErrorType.NETWORK_ERROR:
        return 5
      
      case PluginManagementErrorType.CONFIGURATION_ERROR:
        return 3
      
      case PluginManagementErrorType.SECURITY_ERROR:
      case PluginManagementErrorType.VALIDATION_FAILED:
        return 0 // No retries for security/validation errors
      
      default:
        return 2
    }
  }

  /**
   * Apply recovery strategy
   */
  private async applyRecoveryStrategy(pluginError: PluginError): Promise<void> {
    try {
      switch (pluginError.recoveryStrategy) {
        case PluginRecoveryStrategy.RETRY:
          await this.retryOperation(pluginError)
          break
        
        case PluginRecoveryStrategy.DISABLE:
          await this.disablePlugin(pluginError.pluginId)
          break
        
        case PluginRecoveryStrategy.RESTART:
          await this.restartPlugin(pluginError.pluginId)
          break
        
        case PluginRecoveryStrategy.REINSTALL:
          await this.reinstallPlugin(pluginError.pluginId)
          break
        
        case PluginRecoveryStrategy.IGNORE:
          // Do nothing, just log
          logger.warn(`Ignoring plugin error for ${pluginError.pluginId}: ${pluginError.message}`)
          break
      }
    } catch (recoveryError) {
      const appError = handlePluginError(`插件恢复策略失败 ${pluginError.pluginId}`, recoveryError)
      logger.error(`Recovery strategy failed for plugin ${pluginError.pluginId}`, appError)
      
      // If recovery fails, try fallback
      this.enableFallback(pluginError.pluginId)
    }
  }

  /**
   * Retry failed operation
   */
  private async retryOperation(pluginError: PluginError): Promise<void> {
    if (pluginError.retryCount >= pluginError.maxRetries) {
      logger.warn(`Max retries exceeded for plugin ${pluginError.pluginId}`)
      this.enableFallback(pluginError.pluginId)
      return
    }

    pluginError.retryCount++
    
    // Wait before retry (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, pluginError.retryCount - 1), 10000)
    await new Promise(resolve => setTimeout(resolve, delay))
    
    // Emit retry event for external handling
    window.dispatchEvent(new CustomEvent('plugin-retry', {
      detail: { pluginId: pluginError.pluginId, error: pluginError }
    }))
  }

  /**
   * Disable plugin
   */
  private async disablePlugin(pluginId: string): Promise<void> {
    try {
      // Emit disable event for external handling
      window.dispatchEvent(new CustomEvent('plugin-disable', {
        detail: { pluginId, reason: 'error-recovery' }
      }))
      
      logger.info(`Plugin ${pluginId} disabled due to errors`)
    } catch (error) {
      const appError = handlePluginError(`禁用插件 ${pluginId}`, error)
      logger.error(`Failed to disable plugin ${pluginId}`, appError)
    }
  }

  /**
   * Restart plugin
   */
  private async restartPlugin(pluginId: string): Promise<void> {
    try {
      // Emit restart event for external handling
      window.dispatchEvent(new CustomEvent('plugin-restart', {
        detail: { pluginId }
      }))
      
      logger.info(`Plugin ${pluginId} restarted for error recovery`)
    } catch (error) {
      const appError = handlePluginError(`重启插件 ${pluginId}`, error)
      logger.error(`Failed to restart plugin ${pluginId}`, appError)
    }
  }

  /**
   * Reinstall plugin
   */
  private async reinstallPlugin(pluginId: string): Promise<void> {
    try {
      // Emit reinstall event for external handling
      window.dispatchEvent(new CustomEvent('plugin-reinstall', {
        detail: { pluginId }
      }))
      
      logger.info(`Plugin ${pluginId} marked for reinstallation`)
    } catch (error) {
      const appError = handlePluginError(`重装插件 ${pluginId}`, error)
      logger.error(`Failed to reinstall plugin ${pluginId}`, appError)
    }
  }

  /**
   * Enable fallback for plugin
   */
  private enableFallback(pluginId: string): void {
    const fallback = this.fallbacks.get(pluginId)
    if (fallback) {
      fallback.showFallbackUI = true
      logger.info(`Fallback enabled for plugin ${pluginId}`)
      
      // Show fallback notification
      toast.warning(
        `${pluginId} is experiencing issues`,
        {
          title: 'Plugin Fallback Active',
          description: fallback.fallbackMessage,
          duration: 8000
        }
      )
    }
  }

  /**
   * Show error notification to user
   */
  private showErrorNotification(pluginError: PluginError): void {
    const pluginName = pluginError.pluginId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    switch (pluginError.severity) {
      case PluginErrorSeverity.CRITICAL:
        toast.error(
          `Critical error in ${pluginName}`,
          {
            title: 'Plugin Error',
            description: 'Plugin has been disabled for security reasons',
            duration: 0, // Don't auto-dismiss critical errors
            action: {
              id: 'view-details',
              label: 'View Details'
            }
          }
        )
        break
      
      case PluginErrorSeverity.HIGH:
        toast.error(
          `${pluginName} encountered an error`,
          {
            title: 'Plugin Error',
            description: pluginError.message,
            duration: 10000,
            action: {
              id: 'retry',
              label: 'Retry'
            }
          }
        )
        break
      
      case PluginErrorSeverity.MEDIUM:
        toast.warning(
          `${pluginName} is experiencing issues`,
          {
            title: 'Plugin Warning',
            description: 'Some features may not work correctly',
            duration: 6000
          }
        )
        break
      
      case PluginErrorSeverity.LOW:
        // Only log low severity errors, don't show toast
        logger.warn(`Plugin ${pluginError.pluginId} error: ${pluginError.message}`)
        break
    }
  }

  /**
   * Register fallback for plugin
   */
  registerFallback(pluginId: string, fallback: Omit<PluginFallback, 'pluginId'>): void {
    this.fallbacks.set(pluginId, {
      pluginId,
      ...fallback
    })
  }

  /**
   * Get plugin fallback
   */
  getFallback(pluginId: string): PluginFallback | undefined {
    return this.fallbacks.get(pluginId)
  }

  /**
   * Check if plugin has active errors
   */
  hasActiveErrors(pluginId: string): boolean {
    for (const error of this.errors.values()) {
      if (error.pluginId === pluginId && !error.resolved) {
        return true
      }
    }
    return false
  }

  /**
   * Get plugin errors
   */
  getPluginErrors(pluginId: string): PluginError[] {
    return Array.from(this.errors.values()).filter(error => error.pluginId === pluginId)
  }

  /**
   * Get all errors
   */
  getAllErrors(): PluginError[] {
    return Array.from(this.errors.values())
  }

  /**
   * Resolve error
   */
  resolveError(errorId: string): void {
    const error = this.errors.get(errorId)
    if (error) {
      error.resolved = true
      this.recoveryListeners.forEach(listener => listener(error.pluginId))
    }
  }

  /**
   * Clear resolved errors
   */
  clearResolvedErrors(): void {
    for (const [id, error] of this.errors.entries()) {
      if (error.resolved) {
        this.errors.delete(id)
      }
    }
  }

  /**
   * Add error listener
   */
  onError(listener: (error: PluginError) => void): () => void {
    this.errorListeners.add(listener)
    return () => this.errorListeners.delete(listener)
  }

  /**
   * Add recovery listener
   */
  onRecovery(listener: (pluginId: string) => void): () => void {
    this.recoveryListeners.add(listener)
    return () => this.recoveryListeners.delete(listener)
  }

  /**
   * Create health status from errors
   */
  createHealthStatus(pluginId: string): PluginHealthStatus {
    const errors = this.getPluginErrors(pluginId)
    const activeErrors = errors.filter(e => !e.resolved)
    
    let status: PluginHealthLevel = PluginHealthLevel.HEALTHY
    const issues: any[] = []
    
    if (activeErrors.length > 0) {
      const highSeverityErrors = activeErrors.filter(e => 
        e.severity === PluginErrorSeverity.HIGH || e.severity === PluginErrorSeverity.CRITICAL
      )
      
      if (highSeverityErrors.length > 0) {
        status = PluginHealthLevel.ERROR
      } else {
        status = PluginHealthLevel.WARNING
      }
      
      // Convert errors to health issues
      activeErrors.forEach(error => {
        issues.push({
          type: PluginIssueType.RUNTIME,
          message: error.message,
          severity: error.severity,
          suggestedFix: this.getSuggestedFix(error)
        })
      })
    }
    
    return {
      status,
      lastCheck: new Date(),
      issues,
      metrics: {
        avgSearchTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        errorCount: activeErrors.length,
        successRate: activeErrors.length > 0 ? 50 : 100
      }
    }
  }

  /**
   * Get suggested fix for error
   */
  private getSuggestedFix(error: PluginError): string {
    switch (error.recoveryStrategy) {
      case PluginRecoveryStrategy.RETRY:
        return 'Try the operation again'
      case PluginRecoveryStrategy.DISABLE:
        return 'Disable the plugin temporarily'
      case PluginRecoveryStrategy.RESTART:
        return 'Restart the plugin'
      case PluginRecoveryStrategy.REINSTALL:
        return 'Reinstall the plugin'
      default:
        return 'Contact support if the issue persists'
    }
  }
}

/**
 * Global plugin error handler instance
 */
export const pluginErrorHandler = PluginErrorHandler.getInstance()

/**
 * Utility function to wrap plugin operations with error handling
 */
export function withPluginErrorHandling<T>(
  pluginId: string,
  operation: () => Promise<T>
): Promise<T> {
  return operation().catch(error => {
    pluginErrorHandler.handlePluginError(error, pluginId)
    throw error
  })
}

/**
 * Decorator for plugin methods to add automatic error handling
 */
export function handlePluginErrors(pluginId: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args)
      } catch (error) {
        pluginErrorHandler.handlePluginError(error as Error, pluginId)
        throw error
      }
    }
    
    return descriptor
  }
}