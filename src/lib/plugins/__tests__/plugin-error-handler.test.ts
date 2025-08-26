import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PluginErrorHandler, PluginErrorSeverity, PluginRecoveryStrategy } from '../plugin-error-handler'
import { PluginManagementError, PluginManagementErrorType } from '../plugin-management-service'

describe('PluginErrorHandler', () => {
  let errorHandler: PluginErrorHandler
  let mockToast: any

  beforeEach(() => {
    // Reset singleton instance
    ;(PluginErrorHandler as any).instance = undefined
    errorHandler = PluginErrorHandler.getInstance()
    
    // Mock toast notifications
    mockToast = {
      error: vi.fn(),
      warning: vi.fn(),
      success: vi.fn()
    }
    
    // Mock global toast
    vi.doMock('@/components/ui/toast', () => ({
      toast: mockToast
    }))
    
    // Mock window events
    global.window = {
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    } as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Error Handling', () => {
    it('should handle plugin management errors correctly', () => {
      const pluginError = new PluginManagementError(
        PluginManagementErrorType.CONFIGURATION_ERROR,
        'Test configuration error',
        'Detailed error message',
        'test-plugin'
      )

      const handledError = errorHandler.handlePluginError(pluginError)

      expect(handledError.pluginId).toBe('test-plugin')
      expect(handledError.type).toBe(PluginManagementErrorType.CONFIGURATION_ERROR)
      expect(handledError.severity).toBe(PluginErrorSeverity.MEDIUM)
      expect(handledError.recoveryStrategy).toBe(PluginRecoveryStrategy.RESTART)
    })

    it('should handle generic errors correctly', () => {
      const genericError = new Error('Generic error message')
      
      const handledError = errorHandler.handlePluginError(genericError, 'test-plugin')

      expect(handledError.pluginId).toBe('test-plugin')
      expect(handledError.type).toBe(PluginManagementErrorType.CONFIGURATION_ERROR)
      expect(handledError.severity).toBe(PluginErrorSeverity.MEDIUM)
      expect(handledError.recoveryStrategy).toBe(PluginRecoveryStrategy.RETRY)
    })

    it('should determine correct severity levels', () => {
      const securityError = new PluginManagementError(
        PluginManagementErrorType.SECURITY_ERROR,
        'Security error',
        undefined,
        'test-plugin'
      )

      const handledError = errorHandler.handlePluginError(securityError)
      expect(handledError.severity).toBe(PluginErrorSeverity.CRITICAL)
    })

    it('should determine correct recovery strategies', () => {
      const networkError = new PluginManagementError(
        PluginManagementErrorType.NETWORK_ERROR,
        'Network error',
        undefined,
        'test-plugin'
      )

      const handledError = errorHandler.handlePluginError(networkError)
      expect(handledError.recoveryStrategy).toBe(PluginRecoveryStrategy.RETRY)
    })
  })

  describe('Error Storage and Retrieval', () => {
    it('should store and retrieve plugin errors', () => {
      const error = new Error('Test error')
      const handledError = errorHandler.handlePluginError(error, 'test-plugin')

      const pluginErrors = errorHandler.getPluginErrors('test-plugin')
      expect(pluginErrors).toHaveLength(1)
      expect(pluginErrors[0].id).toBe(handledError.id)
    })

    it('should check for active errors correctly', () => {
      const error = new Error('Test error')
      errorHandler.handlePluginError(error, 'test-plugin')

      expect(errorHandler.hasActiveErrors('test-plugin')).toBe(true)
      expect(errorHandler.hasActiveErrors('other-plugin')).toBe(false)
    })

    it('should resolve errors correctly', () => {
      const error = new Error('Test error')
      const handledError = errorHandler.handlePluginError(error, 'test-plugin')

      expect(errorHandler.hasActiveErrors('test-plugin')).toBe(true)
      
      errorHandler.resolveError(handledError.id)
      
      const pluginErrors = errorHandler.getPluginErrors('test-plugin')
      expect(pluginErrors[0].resolved).toBe(true)
    })
  })

  describe('Fallback System', () => {
    it('should register and retrieve fallbacks', () => {
      const fallback = {
        fallbackMessage: 'Plugin is temporarily unavailable',
        showFallbackUI: false,
        fallbackSearch: vi.fn()
      }

      errorHandler.registerFallback('test-plugin', fallback)
      
      const retrievedFallback = errorHandler.getFallback('test-plugin')
      expect(retrievedFallback).toBeDefined()
      expect(retrievedFallback?.fallbackMessage).toBe(fallback.fallbackMessage)
    })

    it('should enable fallback when recovery fails', async () => {
      const fallback = {
        fallbackMessage: 'Plugin is temporarily unavailable',
        showFallbackUI: false
      }

      errorHandler.registerFallback('test-plugin', fallback)
      
      // Simulate a critical error that would trigger fallback
      const criticalError = new PluginManagementError(
        PluginManagementErrorType.SECURITY_ERROR,
        'Critical security error',
        undefined,
        'test-plugin'
      )

      errorHandler.handlePluginError(criticalError)
      
      // Wait for async recovery to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const retrievedFallback = errorHandler.getFallback('test-plugin')
      expect(retrievedFallback?.showFallbackUI).toBe(true)
    })
  })

  describe('Health Status Creation', () => {
    it('should create healthy status when no errors', () => {
      const healthStatus = errorHandler.createHealthStatus('test-plugin')
      
      expect(healthStatus.status).toBe('healthy')
      expect(healthStatus.issues).toHaveLength(0)
      expect(healthStatus.metrics.errorCount).toBe(0)
      expect(healthStatus.metrics.successRate).toBe(100)
    })

    it('should create warning status for medium severity errors', () => {
      const error = new PluginManagementError(
        PluginManagementErrorType.CONFIGURATION_ERROR,
        'Configuration error',
        undefined,
        'test-plugin'
      )

      errorHandler.handlePluginError(error)
      
      const healthStatus = errorHandler.createHealthStatus('test-plugin')
      
      expect(healthStatus.status).toBe('warning')
      expect(healthStatus.issues).toHaveLength(1)
      expect(healthStatus.metrics.errorCount).toBe(1)
      expect(healthStatus.metrics.successRate).toBe(50)
    })

    it('should create error status for high severity errors', () => {
      const error = new PluginManagementError(
        PluginManagementErrorType.SECURITY_ERROR,
        'Security error',
        undefined,
        'test-plugin'
      )

      errorHandler.handlePluginError(error)
      
      const healthStatus = errorHandler.createHealthStatus('test-plugin')
      
      expect(healthStatus.status).toBe('error')
      expect(healthStatus.issues).toHaveLength(1)
      expect(healthStatus.metrics.errorCount).toBe(1)
    })
  })

  describe('Event Listeners', () => {
    it('should notify error listeners', () => {
      const errorListener = vi.fn()
      const unsubscribe = errorHandler.onError(errorListener)

      const error = new Error('Test error')
      errorHandler.handlePluginError(error, 'test-plugin')

      expect(errorListener).toHaveBeenCalledTimes(1)
      expect(errorListener).toHaveBeenCalledWith(expect.objectContaining({
        pluginId: 'test-plugin',
        message: 'Test error'
      }))

      unsubscribe()
    })

    it('should notify recovery listeners', () => {
      const recoveryListener = vi.fn()
      const unsubscribe = errorHandler.onRecovery(recoveryListener)

      const error = new Error('Test error')
      const handledError = errorHandler.handlePluginError(error, 'test-plugin')
      
      errorHandler.resolveError(handledError.id)

      expect(recoveryListener).toHaveBeenCalledTimes(1)
      expect(recoveryListener).toHaveBeenCalledWith('test-plugin')

      unsubscribe()
    })
  })

  describe('Error Cleanup', () => {
    it('should clear resolved errors', () => {
      const error1 = new Error('Test error 1')
      const error2 = new Error('Test error 2')
      
      const handledError1 = errorHandler.handlePluginError(error1, 'test-plugin')
      const handledError2 = errorHandler.handlePluginError(error2, 'test-plugin')

      expect(errorHandler.getAllErrors()).toHaveLength(2)

      // Resolve one error
      errorHandler.resolveError(handledError1.id)
      
      // Clear resolved errors
      errorHandler.clearResolvedErrors()

      const remainingErrors = errorHandler.getAllErrors()
      expect(remainingErrors).toHaveLength(1)
      expect(remainingErrors[0].id).toBe(handledError2.id)
    })
  })
})