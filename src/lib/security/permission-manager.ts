/**
 * 权限管理器 - 处理敏感权限请求和验证
 */
import { logger } from '../logger'
import { handlePluginError } from '../error-handler'

export class PermissionManager {
  private static instance: PermissionManager
  
  // 权限状态缓存
  private permissionStates: Map<string, boolean> = new Map()
  
  private constructor() {}
  
  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager()
    }
    return PermissionManager.instance
  }
  
  /**
   * 请求剪贴板访问权限
   */
  async requestClipboardAccess(context: string = 'clipboard'): Promise<boolean> {
    const cacheKey = `clipboard_${context}`
    
    // 检查缓存
    if (this.permissionStates.has(cacheKey)) {
      return this.permissionStates.get(cacheKey)!
    }
    
    try {
      // 在浏览器环境中，尝试读取剪贴板权限
      if (typeof navigator !== 'undefined' && navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'clipboard-read' as any })
        
        if (result.state === 'granted') {
          this.permissionStates.set(cacheKey, true)
          return true
        } else if (result.state === 'prompt') {
          // 需要用户确认
          const confirmed = await this.showPermissionDialog(
            '剪贴板访问',
            '此功能需要访问剪贴板来复制/粘贴内容。是否允许？',
            context
          )
          
          this.permissionStates.set(cacheKey, confirmed)
          return confirmed
        }
      }
      
      // 对于不支持权限API的环境，直接尝试写入
      const testText = 'permission_test'
      await navigator.clipboard.writeText(testText)
      this.permissionStates.set(cacheKey, true)
      return true
      
    } catch (error) {
      // 如果失败，询问用户是否要继续尝试
      const confirmed = await this.showPermissionDialog(
        '剪贴板访问',
        '无法自动获取剪贴板权限，是否要尝试访问？',
        context
      )
      
      this.permissionStates.set(cacheKey, confirmed)
      return confirmed
    }
  }
  
  /**
   * 检查文件系统访问权限
   */
  checkFileSystemAccess(path: string): boolean {
    try {
      // 基础路径验证
      if (!path || typeof path !== 'string') {
        return false
      }
      
      // 检查路径是否包含危险字符
      const dangerousPatterns = [
        /\.\./,  // 路径遍历
        /^\/\//, // 网络路径
        /^[a-zA-Z]:\\\\/, // Windows网络路径
        /[<>:"|?*]/ // 非法字符
      ]
      
      if (dangerousPatterns.some(pattern => pattern.test(path))) {
        return false
      }
      
      // 检查是否在允许的目录范围内
      const allowedDirs = this.getAllowedDirectories()
      return allowedDirs.some(dir => path.startsWith(dir))
      
    } catch (error) {
      logger.warn('文件系统访问检查失败', error)
      return false
    }
  }
  
  /**
   * 验证搜索路径安全性
   */
  validateSearchPath(path: string): boolean {
    if (!path || typeof path !== 'string') {
      return false
    }
    
    // 移除首尾空格和引号
    const cleanPath = path.trim().replace(/^["']|["']$/g, '')
    
    // 检查路径长度
    if (cleanPath.length > 4096) {
      return false
    }
    
    // 检查是否为绝对路径或相对路径
    const isAbsolutePath = cleanPath.startsWith('/') || /^[a-zA-Z]:\\/.test(cleanPath)
    const isRelativePath = cleanPath.startsWith('./') || cleanPath.startsWith('../')
    
    if (!isAbsolutePath && !isRelativePath) {
      return false
    }
    
    // 验证路径组件
    const components = cleanPath.split(/[\/\\]/)
    for (const component of components) {
      if (component === '..') {
        // 检查路径遍历攻击
        const resolvedPath = this.resolvePath(cleanPath)
        if (!this.isPathSafe(resolvedPath)) {
          return false
        }
      }
    }
    
    return this.checkFileSystemAccess(cleanPath)
  }
  
  /**
   * 显示权限请求对话框
   */
  private async showPermissionDialog(
    title: string,
    message: string,
    context: string
  ): Promise<boolean> {
    try {
      // 在实际应用中，这里应该显示一个模态对话框
      // 现在我们使用浏览器的确认对话框作为备选
      const confirmed = confirm(`${title}\n\n${message}\n\n来源: ${context}`)
      
      logger.info(`权限请求 ${confirmed ? '已授权' : '被拒绝'}: ${title} (${context})`)
      return confirmed
      
    } catch (error) {
      const appError = handlePluginError('权限请求对话框', error)
      logger.error('显示权限对话框失败', appError)
      return false
    }
  }
  
  /**
   * 获取允许访问的目录列表
   */
  private getAllowedDirectories(): string[] {
    // 返回用户目录和常见的安全目录
    const homeDir = typeof process !== 'undefined' ? process.env.HOME || process.env.USERPROFILE : ''
    const tempDir = typeof process !== 'undefined' ? process.env.TEMP || process.env.TMP : ''
    
    return [
      homeDir || '',
      tempDir || '',
      '/tmp', // Unix临时目录
      '/var/tmp', // Unix临时目录
    ].filter(Boolean)
  }
  
  /**
   * 解析路径为绝对路径
   */
  private resolvePath(path: string): string {
    try {
      // 简单的路径解析（在实际应用中可能需要更复杂的逻辑）
      if (path.startsWith('/') || /^[a-zA-Z]:\\/.test(path)) {
        return path
      }
      
      // 相对路径处理
      const currentDir = typeof process !== 'undefined' ? process.cwd() : ''
      return `${currentDir}/${path}`
      
    } catch (error) {
      logger.warn('路径解析失败', error)
      return path
    }
  }
  
  /**
   * 检查路径是否安全
   */
  private isPathSafe(path: string): boolean {
    // 检查是否包含系统关键目录
    const dangerousPaths = [
      '/etc',
      '/usr',
      '/bin',
      '/sbin',
      '/system',
      'C:\\Windows',
      'C:\\Program Files',
      'C:\\Program Files (x86)',
    ]
    
    return !dangerousPaths.some(dangerPath => 
      path.toLowerCase().startsWith(dangerPath.toLowerCase())
    )
  }
  
  /**
   * 清除权限缓存
   */
  clearPermissionCache(): void {
    this.permissionStates.clear()
    logger.info('权限缓存已清除')
  }
  
  /**
   * 获取权限状态
   */
  getPermissionStatus(permissionType: string, context?: string): boolean | null {
    const cacheKey = context ? `${permissionType}_${context}` : permissionType
    return this.permissionStates.get(cacheKey) ?? null
  }
}

// 导出单例实例
export const permissionManager = PermissionManager.getInstance()