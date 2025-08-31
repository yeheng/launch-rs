/**
 * 统一日志工具
 * 提供开发环境和生产环境的日志控制
 */

export class Logger {
  private static instance: Logger
  private isDev: boolean

  private constructor() {
    this.isDev = import.meta.env.DEV
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  /**
   * 信息日志 - 仅在开发环境输出
   */
  info(message: string, data?: any): void {
    if (this.isDev) {
      console.log(`[INFO] ${message}`, data || '')
    }
  }

  /**
   * 错误日志 - 始终输出，生产环境也会记录
   */
  error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error || '')
    // TODO: 可以添加错误上报逻辑
  }

  /**
   * 警告日志 - 仅在开发环境输出
   */
  warn(message: string, data?: any): void {
    if (this.isDev) {
      console.warn(`[WARN] ${message}`, data || '')
    }
  }

  /**
   * 调试日志 - 仅在开发环境输出
   */
  debug(message: string, data?: any): void {
    if (this.isDev) {
      console.log(`[DEBUG] ${message}`, data || '')
    }
  }

  /**
   * 成功日志 - 仅在开发环境输出
   */
  success(message: string, data?: any): void {
    if (this.isDev) {
      console.log(`[SUCCESS] ${message}`, data || '')
    }
  }
}

// 导出单例实例
export const logger = Logger.getInstance()

// 导出便捷方法
export const log = {
  info: (message: string, data?: any) => logger.info(message, data),
  error: (message: string, error?: any) => logger.error(message, error),
  warn: (message: string, data?: any) => logger.warn(message, data),
  debug: (message: string, data?: any) => logger.debug(message, data),
  success: (message: string, data?: any) => logger.success(message, data)
}