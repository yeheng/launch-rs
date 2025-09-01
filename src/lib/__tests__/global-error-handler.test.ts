import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { 
  createAppError, 
  handlePluginError, 
  handleFileError, 
  handleNetworkError, 
  handleValidationError,
  asyncErrorHandler,
  setupGlobalErrorHandling,
  getUserFriendlyMessage,
  isRecoverable,
  ErrorType,
  ErrorSeverity 
} from '@/lib/error-handler'
import { GlobalErrorHandler, installGlobalErrorHandler } from '@/lib/global-error-handler'
import { logger } from '@/lib/logger'

/**
 * 错误边界和全局错误处理测试
 * 验证系统在各种异常情况下的稳定性和恢复能力
 */

describe('错误边界和全局错误处理测试', () => {
  let globalErrorHandler: GlobalErrorHandler
  let originalAddEventListener: any

  beforeEach(() => {
    // 保存原始window.addEventListener方法
    originalAddEventListener = window.addEventListener
    
    // 重置单例
    (GlobalErrorHandler as any).instance = null
    
    // 创建新的错误处理器实例
    globalErrorHandler = GlobalErrorHandler.getInstance({
      enabled: true,
      enableRecovery: true,
      enableReporting: false, // 测试时禁用上报
      maxErrorHistory: 10,
      showDetailsInConsole: true,
      autoReportCritical: false
    })
  })

  afterEach(() => {
    // 恢复原始方法
    window.addEventListener = originalAddEventListener
    
    // 销毁错误处理器
    globalErrorHandler.destroy()
  })

  describe('AppError 创建和验证', () => {
    it('应该正确创建应用错误', () => {
      const error = createAppError(
        ErrorType.PLUGIN,
        ErrorSeverity.HIGH,
        'Test error message',
        '用户友好的错误消息',
        { details: 'error details' },
        true
      )

      expect(error.type).toBe(ErrorType.PLUGIN)
      expect(error.severity).toBe(ErrorSeverity.HIGH)
      expect(error.message).toBe('Test error message')
      expect(error.userMessage).toBe('用户友好的错误消息')
      expect(error.details).toEqual({ details: 'error details' })
      expect(error.recoverable).toBe(true)
      expect(error.timestamp).toBeInstanceOf(Number)
    })

    it('应该为不同错误类型创建适当的错误', () => {
      const pluginError = handlePluginError('test context', new Error('plugin failed'))
      expect(pluginError.type).toBe(ErrorType.PLUGIN)
      expect(pluginError.userMessage).toBe('操作失败，请稍后重试')

      const fileError = handleFileError('test context', new Error('file not found'))
      expect(fileError.type).toBe(ErrorType.FILE_SYSTEM)
      expect(fileError.userMessage).toBe('文件不存在或路径错误')

      const networkError = handleNetworkError('test context', new Error('network failed'))
      expect(networkError.type).toBe(ErrorType.NETWORK)
      expect(networkError.userMessage).toBe('网络连接失败，请检查网络设置')

      const validationError = handleValidationError('test context', new Error('validation failed'))
      expect(validationError.type).toBe(ErrorType.VALIDATION)
      expect(validationError.userMessage).toBe('输入数据格式不正确，请检查后重试')
    })

    it('应该根据错误消息智能判断错误类型和严重程度', () => {
      const permissionError = handlePluginError('test context', new Error('permission denied'))
      expect(permissionError.severity).toBe(ErrorSeverity.HIGH)
      expect(permissionError.userMessage).toBe('权限不足，请检查应用权限设置')

      const networkError = handlePluginError('test context', new Error('network timeout'))
      expect(networkError.severity).toBe(ErrorSeverity.MEDIUM)
      expect(networkError.userMessage).toBe('网络连接失败，请检查网络设置')

      const notFoundError = handlePluginError('test context', new Error('file not found'))
      expect(notFoundError.severity).toBe(ErrorSeverity.LOW)
      expect(notFoundError.userMessage).toBe('资源未找到，请确认路径是否正确')
    })
  })

  describe('全局错误处理器初始化', () => {
    it('应该正确初始化全局错误处理器', () => {
      const spy = vi.spyOn(window, 'addEventListener')
      
      globalErrorHandler.initialize()

      expect(globalErrorHandler['isInitialized']).toBe(true)
      expect(spy).toHaveBeenCalledTimes(2)
      
      // 验证是否注册了必要的事件监听器
      expect(spy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
      expect(spy).toHaveBeenCalledWith('error', expect.any(Function))
      
      spy.mockRestore()
    })

    it('应该能够处理重复初始化', () => {
      const spy = vi.spyOn(logger, 'warn')
      
      globalErrorHandler.initialize()
      globalErrorHandler.initialize() // 第二次初始化

      expect(spy).toHaveBeenCalledWith('GlobalErrorHandler already initialized')
    })

    it('应该在禁用时跳过初始化', () => {
      const disabledHandler = GlobalErrorHandler.getInstance({ enabled: false })
      const spy = vi.spyOn(logger, 'info')
      
      disabledHandler.initialize()

      expect(spy).toHaveBeenCalledWith('GlobalErrorHandler is disabled')
      expect(disabledHandler['isInitialized']).toBe(false)
    })
  })

  describe('错误处理流程', () => {
    it('应该正确处理和记录错误', async () => {
      const testError = createAppError(
        ErrorType.PLUGIN,
        ErrorSeverity.MEDIUM,
        'Test error',
        'Test user message'
      )

      await globalErrorHandler.handleError(testError)

      const stats = globalErrorHandler.getStatistics()
      expect(stats.total).toBe(1)
      expect(stats.byType[ErrorType.PLUGIN]).toBe(1)
      expect(stats.bySeverity[ErrorSeverity.MEDIUM]).toBe(1)
      expect(stats.lastError).toBe(testError)
    })

    it('应该维护错误历史记录', async () => {
      const errors = [
        createAppError(ErrorType.PLUGIN, ErrorSeverity.LOW, 'Error 1', 'Message 1'),
        createAppError(ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Error 2', 'Message 2'),
        createAppError(ErrorType.FILE_SYSTEM, ErrorSeverity.HIGH, 'Error 3', 'Message 3')
      ]

      for (const error of errors) {
        await globalErrorHandler.handleError(error)
      }

      const history = globalErrorHandler.getErrorHistory()
      expect(history.length).toBe(3)
      expect(history[0].message).toBe('Error 1')
      expect(history[1].message).toBe('Error 2')
      expect(history[2].message).toBe('Error 3')
    })

    it('应该限制错误历史记录数量', async () => {
      const handler = GlobalErrorHandler.getInstance({ maxErrorHistory: 2 })
      
      const errors = [
        createAppError(ErrorType.PLUGIN, ErrorSeverity.LOW, 'Error 1', 'Message 1'),
        createAppError(ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Error 2', 'Message 2'),
        createAppError(ErrorType.FILE_SYSTEM, ErrorSeverity.HIGH, 'Error 3', 'Message 3')
      ]

      for (const error of errors) {
        await handler.handleError(error)
      }

      const history = handler.getErrorHistory()
      expect(history.length).toBe(2)
      expect(history[0].message).toBe('Error 2') // 保留最新的两个
      expect(history[1].message).toBe('Error 3')
    })
  })

  describe('错误恢复机制', () => {
    it('应该尝试恢复可恢复的错误', async () => {
      const recoverableError = createAppError(
        ErrorType.NETWORK,
        ErrorSeverity.LOW,
        'Network error',
        'Network failed',
        undefined,
        true
      )

      const spy = vi.spyOn(globalErrorHandler as any, 'attemptRecovery')
      
      await globalErrorHandler.handleError(recoverableError)

      expect(spy).toHaveBeenCalledWith(recoverableError)
    })

    it('不应该尝试恢复不可恢复的错误', async () => {
      const criticalError = createAppError(
        ErrorType.UNKNOWN,
        ErrorSeverity.CRITICAL,
        'Critical error',
        'Critical failure',
        undefined,
        false
      )

      const spy = vi.spyOn(globalErrorHandler as any, 'attemptRecovery')
      
      await globalErrorHandler.handleError(criticalError)

      expect(spy).not.toHaveBeenCalled()
    })

    it('应该处理恢复策略执行失败的情况', async () => {
      const error = createAppError(
        ErrorType.NETWORK,
        ErrorSeverity.LOW,
        'Network error',
        'Network failed',
        undefined,
        true
      )

      // 模拟恢复策略失败
      const mockStrategy = {
        name: 'test_strategy',
        applicableTypes: [ErrorType.NETWORK],
        applicableSeverities: [ErrorSeverity.LOW],
        recover: vi.fn().mockRejectedValue(new Error('Recovery failed')),
        maxRetries: 1,
        retryDelay: 0
      }

      const handler = GlobalErrorHandler.getInstance({
        recoveryStrategies: [mockStrategy],
        enableRecovery: true
      })

      // 应该不抛出异常
      await expect(handler.handleError(error)).resolves.not.toThrow()
    })
  })

  describe('全局错误事件处理', () => {
    it('应该处理未捕获的Promise错误', () => {
      const mockError = new Error('Unhandled promise rejection')
      let capturedHandler: any = null

      // 设置模拟来捕获处理器
      const spy = vi.spyOn(window, 'addEventListener').mockImplementation((event: string, handler: any) => {
        if (event === 'unhandledrejection') {
          capturedHandler = handler
        }
      })

      globalErrorHandler.initialize()

      // 模拟未捕获的Promise错误
      const mockEvent = {
        reason: mockError,
        preventDefault: vi.fn()
      }

      if (capturedHandler) {
        capturedHandler(mockEvent)
      }

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('应该处理全局JavaScript错误', () => {
      const mockError = new Error('Global JavaScript error')
      let capturedHandler: any = null

      // 设置模拟来捕获处理器
      const spy = vi.spyOn(window, 'addEventListener').mockImplementation((event: string, handler: any) => {
        if (event === 'error') {
          capturedHandler = handler
        }
      })

      globalErrorHandler.initialize()

      // 模拟全局错误
      const mockEvent = {
        error: mockError,
        preventDefault: vi.fn()
      }

      if (capturedHandler) {
        capturedHandler(mockEvent)
      }

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('Vue错误处理集成', () => {
    it('应该设置Vue错误处理器', () => {
      const mockApp = {
        config: {
          errorHandler: vi.fn(),
          warnHandler: vi.fn()
        }
      }

      globalErrorHandler.initialize(mockApp)

      expect(mockApp.config.errorHandler).toBeDefined()
      expect(mockApp.config.warnHandler).toBeDefined()
    })

    it('应该正确处理Vue组件错误', () => {
      const mockApp = {
        config: {
          errorHandler: vi.fn(),
          warnHandler: vi.fn()
        }
      }

      const spy = vi.spyOn(globalErrorHandler, 'handleError')
      
      globalErrorHandler.initialize(mockApp)

      // 模拟Vue错误
      const vueError = new Error('Vue component error')
      const mockInstance = { $options: { name: 'TestComponent' } }
      const mockInfo = 'mounted hook'

      if (mockApp.config.errorHandler) {
        mockApp.config.errorHandler(vueError, mockInstance, mockInfo)
      }

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('错误工具函数', () => {
    it('应该正确获取用户友好的错误消息', () => {
      const appError = createAppError(
        ErrorType.PLUGIN,
        ErrorSeverity.MEDIUM,
        'Technical error',
        'User friendly message'
      )

      expect(getUserFriendlyMessage(appError)).toBe('User friendly message')
      expect(getUserFriendlyMessage(new Error('Simple error'))).toBe('Simple error')
      expect(getUserFriendlyMessage('String error')).toBe('操作失败，请稍后重试')
    })

    it('应该正确判断错误是否可恢复', () => {
      const recoverableError = createAppError(
        ErrorType.PLUGIN,
        ErrorSeverity.MEDIUM,
        'Error',
        'Message',
        undefined,
        true
      )

      const unrecoverableError = createAppError(
        ErrorType.UNKNOWN,
        ErrorSeverity.CRITICAL,
        'Error',
        'Message',
        undefined,
        false
      )

      expect(isRecoverable(recoverableError)).toBe(true)
      expect(isRecoverable(unrecoverableError)).toBe(false)
      expect(isRecoverable(new Error('Simple error'))).toBe(true) // 默认可恢复
    })

    it('应该正确处理异步错误', async () => {
      const asyncFn = vi.fn().mockRejectedValue(new Error('Async error'))
      
      await expect(
        asyncErrorHandler(asyncFn, 'test context')
      ).rejects.toThrow('Async error')
    })
  })

  describe('错误统计和清理', () => {
    it('应该正确统计错误信息', async () => {
      const errors = [
        createAppError(ErrorType.PLUGIN, ErrorSeverity.LOW, 'Error 1', 'Message 1'),
        createAppError(ErrorType.NETWORK, ErrorSeverity.MEDIUM, 'Error 2', 'Message 2'),
        createAppError(ErrorType.PLUGIN, ErrorSeverity.HIGH, 'Error 3', 'Message 3'),
        createAppError(ErrorType.UNKNOWN, ErrorSeverity.CRITICAL, 'Error 4', 'Message 4')
      ]

      for (const error of errors) {
        await globalErrorHandler.handleError(error)
      }

      const stats = globalErrorHandler.getStatistics()
      expect(stats.total).toBe(4)
      expect(stats.byType[ErrorType.PLUGIN]).toBe(2)
      expect(stats.byType[ErrorType.NETWORK]).toBe(1)
      expect(stats.byType[ErrorType.UNKNOWN]).toBe(1)
      expect(stats.bySeverity[ErrorSeverity.LOW]).toBe(1)
      expect(stats.bySeverity[ErrorSeverity.MEDIUM]).toBe(1)
      expect(stats.bySeverity[ErrorSeverity.HIGH]).toBe(1)
      expect(stats.bySeverity[ErrorSeverity.CRITICAL]).toBe(1)
      expect(stats.critical).toBe(1)
    })

    it('应该能够清除错误历史', async () => {
      const error = createAppError(ErrorType.PLUGIN, ErrorSeverity.LOW, 'Error', 'Message')
      
      await globalErrorHandler.handleError(error)
      
      expect(globalErrorHandler.getErrorHistory().length).toBe(1)
      
      globalErrorHandler.clearErrorHistory()
      
      expect(globalErrorHandler.getErrorHistory().length).toBe(0)
    })
  })

  describe('错误边界测试', () => {
    it('应该处理错误处理器初始化失败', () => {
      const invalidHandler = GlobalErrorHandler.getInstance({
        enabled: true,
        maxErrorHistory: -1 // 无效配置
      })

      // 应该不抛出异常，优雅处理
      expect(() => {
        invalidHandler.initialize()
      }).not.toThrow()
    })

    it('应该处理错误上报失败', async () => {
      const handler = GlobalErrorHandler.getInstance({
        enableReporting: true,
        autoReportCritical: true
      })

      const error = createAppError(
        ErrorType.CRITICAL,
        ErrorSeverity.CRITICAL,
        'Critical error',
        'Critical message'
      )

      // 应该不抛出异常，即使上报失败
      await expect(handler.handleError(error)).resolves.not.toThrow()
    })

    it('应该处理大量错误并发', async () => {
      const errorPromises = []
      const errorCount = 100

      for (let i = 0; i < errorCount; i++) {
        const error = createAppError(
          ErrorType.PLUGIN,
          ErrorSeverity.LOW,
          `Error ${i}`,
          `Message ${i}`
        )
        errorPromises.push(globalErrorHandler.handleError(error))
      }

      // 所有错误都应该被处理而不抛出异常
      await expect(Promise.all(errorPromises)).resolves.not.toThrow()

      const stats = globalErrorHandler.getStatistics()
      expect(stats.total).toBe(errorCount)
    })
  })

  describe('Legacy全局错误处理', () => {
    it('应该设置传统的全局错误处理', () => {
      const originalAddEventListener = window.addEventListener
      const mockAddEventListener = vi.fn()
      
      // 临时替换window的addEventListener方法
      window.addEventListener = mockAddEventListener
      
      setupGlobalErrorHandling()
      
      expect(mockAddEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
      expect(mockAddEventListener).toHaveBeenCalledWith('error', expect.any(Function))
      
      // 恢复原始方法
      window.addEventListener = originalAddEventListener
    })
  })
})