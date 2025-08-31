/**
 * 统一错误处理工具
 * 提供结构化的错误处理和用户友好的错误信息
 */

import { logger } from './logger'

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'network',
  PLUGIN = 'plugin',
  FILE_SYSTEM = 'file_system',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 应用错误接口
 */
export interface AppError {
  type: ErrorType
  severity: ErrorSeverity
  message: string
  userMessage: string
  code?: string
  details?: any
  recoverable: boolean
  timestamp: number
}

/**
 * 创建应用错误
 */
export function createAppError(
  type: ErrorType,
  severity: ErrorSeverity,
  message: string,
  userMessage: string,
  details?: any,
  recoverable: boolean = true
): AppError {
  return {
    type,
    severity,
    message,
    userMessage,
    details,
    recoverable,
    timestamp: Date.now()
  }
}

/**
 * 处理插件错误
 */
export function handlePluginError(context: string, error: any): AppError {
  const errorMessage = error?.message || error?.toString() || '未知错误'
  
  logger.error(`${context}失败`, error)
  
  // 根据错误类型判断严重程度
  let severity = ErrorSeverity.MEDIUM
  let userMessage = '操作失败，请稍后重试'
  
  if (errorMessage.includes('permission') || errorMessage.includes('权限')) {
    severity = ErrorSeverity.HIGH
    userMessage = '权限不足，请检查应用权限设置'
  } else if (errorMessage.includes('network') || errorMessage.includes('网络')) {
    severity = ErrorSeverity.MEDIUM
    userMessage = '网络连接失败，请检查网络设置'
  } else if (errorMessage.includes('not found') || errorMessage.includes('未找到')) {
    severity = ErrorSeverity.LOW
    userMessage = '资源未找到，请确认路径是否正确'
  }
  
  return createAppError(
    ErrorType.PLUGIN,
    severity,
    errorMessage,
    userMessage,
    error,
    true
  )
}

/**
 * 处理文件系统错误
 */
export function handleFileError(context: string, error: any): AppError {
  const errorMessage = error?.message || error?.toString() || '文件操作失败'
  
  logger.error(`${context}失败`, error)
  
  let userMessage = '文件操作失败，请稍后重试'
  
  if (errorMessage.includes('permission') || errorMessage.includes('权限')) {
    userMessage = '没有文件访问权限'
  } else if (errorMessage.includes('not found') || errorMessage.includes('未找到')) {
    userMessage = '文件不存在或路径错误'
  } else if (errorMessage.includes('directory') || errorMessage.includes('目录')) {
    userMessage = '目录操作失败'
  }
  
  return createAppError(
    ErrorType.FILE_SYSTEM,
    ErrorSeverity.MEDIUM,
    errorMessage,
    userMessage,
    error,
    true
  )
}

/**
 * 处理网络错误
 */
export function handleNetworkError(context: string, error: any): AppError {
  const errorMessage = error?.message || error?.toString() || '网络请求失败'
  
  logger.error(`${context}失败`, error)
  
  const userMessage = '网络连接失败，请检查网络设置'
  
  return createAppError(
    ErrorType.NETWORK,
    ErrorSeverity.MEDIUM,
    errorMessage,
    userMessage,
    error,
    true
  )
}

/**
 * 处理验证错误
 */
export function handleValidationError(context: string, error: any): AppError {
  const errorMessage = error?.message || error?.toString() || '数据验证失败'
  
  logger.error(`${context}失败`, error)
  
  const userMessage = '输入数据格式不正确，请检查后重试'
  
  return createAppError(
    ErrorType.VALIDATION,
    ErrorSeverity.LOW,
    errorMessage,
    userMessage,
    error,
    true
  )
}

/**
 * 异步错误包装器
 * 自动捕获和处理异步函数中的错误
 */
export function asyncErrorHandler<T>(
  fn: () => Promise<T>,
  context: string,
  errorHandler?: (error: any) => AppError
): Promise<T> {
  return fn().catch((error) => {
    const appError = errorHandler 
      ? errorHandler(error)
      : handlePluginError(context, error)
    
    // 可以在这里添加错误上报逻辑
    reportError(appError)
    
    throw appError
  })
}

/**
 * 错误上报函数
 * TODO: 实现错误上报到服务器
 */
function reportError(error: AppError): void {
  // 这里可以添加错误上报逻辑，比如发送到监控服务
  logger.error('错误上报', {
    type: error.type,
    severity: error.severity,
    message: error.message,
    timestamp: error.timestamp
  })
}

/**
 * 全局未捕获错误处理
 */
export function setupGlobalErrorHandling(): void {
  // 处理未捕获的Promise错误
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    const appError = createAppError(
      ErrorType.UNKNOWN,
      ErrorSeverity.HIGH,
      error?.message || error?.toString() || '未捕获的Promise错误',
      '应用出现未知错误，请刷新页面重试',
      error,
      false
    )
    
    logger.error('未捕获的Promise错误', appError)
    reportError(appError)
    
    // 阻止默认错误处理
    event.preventDefault()
  })
  
  // 处理全局错误
  window.addEventListener('error', (event) => {
    const error = event.error
    const appError = createAppError(
      ErrorType.UNKNOWN,
      ErrorSeverity.CRITICAL,
      error?.message || error?.toString() || '全局错误',
      '应用出现严重错误，请刷新页面重试',
      error,
      false
    )
    
    logger.error('全局错误', appError)
    reportError(appError)
    
    // 阻止默认错误处理
    event.preventDefault()
  })
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyMessage(error: AppError | any): string {
  if (error && typeof error === 'object' && 'userMessage' in error) {
    return error.userMessage
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return error.message
  }
  
  return '操作失败，请稍后重试'
}

/**
 * 判断错误是否可恢复
 */
export function isRecoverable(error: AppError | any): boolean {
  if (error && typeof error === 'object' && 'recoverable' in error) {
    return error.recoverable
  }
  
  return true // 默认认为错误是可恢复的
}