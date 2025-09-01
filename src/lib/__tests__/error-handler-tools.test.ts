import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  createAppError, 
  handlePluginError, 
  handleFileError, 
  handleNetworkError, 
  handleValidationError,
  asyncErrorHandler,
  getUserFriendlyMessage,
  isRecoverable,
  ErrorType,
  ErrorSeverity 
} from '@/lib/error-handler'
import { logger } from '@/lib/logger'

/**
 * 错误处理工具测试
 * 验证错误处理系统的核心功能和边界情况
 */

describe('错误处理工具测试', () => {
  let consoleSpy: any

  beforeEach(() => {
    // Mock console方法
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    }
  })

  afterEach(() => {
    // 恢复console方法
    consoleSpy.log.mockRestore()
    consoleSpy.warn.mockRestore()
    consoleSpy.error.mockRestore()
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

  describe('错误处理工具函数核心功能', () => {
    it('应该正确处理不同类型的错误输入', () => {
      const stringError = 'string error'
      const errorObject = new Error('object error')
      const nullError = null
      const undefinedError = undefined

      expect(getUserFriendlyMessage(stringError)).toBe('操作失败，请稍后重试')
      expect(getUserFriendlyMessage(errorObject)).toBe('object error')
      expect(getUserFriendlyMessage(nullError)).toBe('未知错误')
      expect(getUserFriendlyMessage(undefinedError)).toBe('未知错误')
    })

    it('应该正确判断错误恢复能力', () => {
      const recoverableErrors = [
        new Error('simple error'),
        'string error',
        { message: 'object error' }
      ]

      recoverableErrors.forEach(error => {
        expect(isRecoverable(error)).toBe(true)
      })
    })

    it('应该正确处理异步函数错误', async () => {
      const successFn = vi.fn().mockResolvedValue('success')
      const errorFn = vi.fn().mockRejectedValue(new Error('async error'))

      await expect(asyncErrorHandler(successFn, 'test')).resolves.toBe('success')
      await expect(asyncErrorHandler(errorFn, 'test')).rejects.toThrow('async error')
    })
  })

  describe('错误边界测试', () => {
    it('应该处理各种错误类型', () => {
      const errorTypes = [
        ErrorType.NETWORK,
        ErrorType.PLUGIN,
        ErrorType.FILE_SYSTEM,
        ErrorType.PERMISSION,
        ErrorType.VALIDATION,
        ErrorType.UNKNOWN
      ]

      errorTypes.forEach(type => {
        const error = createAppError(
          type,
          ErrorSeverity.MEDIUM,
          `Test ${type} error`,
          `Test ${type} message`
        )

        expect(error.type).toBe(type)
        expect(error.message).toBe(`Test ${type} error`)
        expect(error.userMessage).toBe(`Test ${type} message`)
      })
    })

    it('应该处理不同严重程度的错误', () => {
      const severities = [
        ErrorSeverity.LOW,
        ErrorSeverity.MEDIUM,
        ErrorSeverity.HIGH,
        ErrorSeverity.CRITICAL
      ]

      severities.forEach(severity => {
        const error = createAppError(
          ErrorType.UNKNOWN,
          severity,
          `Test ${severity} error`,
          `Test ${severity} message`
        )

        expect(error.severity).toBe(severity)
        expect(error.message).toBe(`Test ${severity} error`)
        expect(error.userMessage).toBe(`Test ${severity} message`)
      })
    })

    it('应该处理空错误详情', () => {
      const error = createAppError(
        ErrorType.PLUGIN,
        ErrorSeverity.MEDIUM,
        'Test error',
        'Test message',
        undefined,
        true
      )

      expect(error.details).toBeUndefined()
    })

    it('应该处理复杂错误详情', () => {
      const complexDetails = {
        stack: 'Error stack trace',
        code: 'ERROR_CODE',
        additional: {
          nested: 'data',
          array: [1, 2, 3]
        }
      }

      const error = createAppError(
        ErrorType.PLUGIN,
        ErrorSeverity.MEDIUM,
        'Test error',
        'Test message',
        complexDetails,
        true
      )

      expect(error.details).toEqual(complexDetails)
    })
  })

  describe('错误处理性能测试', () => {
    it('应该快速处理大量错误', () => {
      const startTime = performance.now()
      const errorCount = 1000

      for (let i = 0; i < errorCount; i++) {
        createAppError(
          ErrorType.PLUGIN,
          ErrorSeverity.MEDIUM,
          `Error ${i}`,
          `Message ${i}`
        )
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(100) // 应该在100ms内处理1000个错误
    })

    it('应该高效处理异步错误', async () => {
      const asyncFn = vi.fn().mockRejectedValue(new Error('Async error'))
      const startTime = performance.now()

      try {
        await asyncErrorHandler(asyncFn, 'test context')
      } catch (error) {
        // 预期的错误
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(50) // 应该在50ms内处理异步错误
    })
  })
})