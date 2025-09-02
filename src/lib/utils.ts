import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并 CSS 类名工具函数
 * Utility function for merging CSS class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化文件大小为人类可读格式
 * Format file size to human-readable format
 * 基于 PluginUtils.formatFileSize，统一使用这个版本
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * 格式化数字为人类可读格式（添加千位分隔符）
 * Format number to human-readable format with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * 格式化大数字为缩写形式（K, M）
 * Format large numbers to abbreviated form (K, M)
 */
export function formatNumberAbbreviated(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * 格式化日期为本地化字符串
 * Format date to localized string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

/**
 * 格式化日期时间为本地化字符串
 * Format datetime to localized string
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

/**
 * 格式化时间戳为时间字符串
 * Format timestamp to time string
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

/**
 * 格式化毫秒为人类可读时间格式
 * Format milliseconds to human-readable time format
 */
export function formatDuration(ms: number): string {
  if (ms >= 1000) {
    return (ms / 1000).toFixed(1) + 's'
  }
  return ms.toFixed(0) + 'ms'
}

/**
 * 格式化百分比为字符串
 * Format percentage to string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return (value * 100).toFixed(decimals) + '%'
}

/**
 * 格式化安装方法为可读字符串
 * Format installation method to readable string
 */
export function formatInstallMethod(method?: string): string {
  if (!method) return 'Unknown'
  return method.charAt(0).toUpperCase() + method.slice(1)
}

/**
 * 计算两个日期之间的相对时间
 * Calculate relative time between two dates
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`
  return `${Math.floor(diffDays / 365)}年前`
}

/**
 * 截断文本并添加省略号
 * Truncate text and add ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * 生成随机字符串
 * Generate random string
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 防抖函数
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * 节流函数
 * Throttle function to limit how often a function can be called
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * 深拷贝对象
 * Deep copy object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T
  if (typeof obj === 'object') {
    const cloned = {} as T
    Object.keys(obj).forEach(key => {
      cloned[key as keyof T] = deepClone(obj[key as keyof T])
    })
    return cloned
  }
  return obj
}

/**
 * 检查值是否为空（null, undefined, 空字符串, 空数组, 空对象）
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * 获取对象的嵌套属性值
 * Get nested property value from object
 */
export function getNestedValue(obj: any, path: string, defaultValue?: any): any {
  const keys = path.split('.')
  let result = obj
  
  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue
    }
    result = result[key]
  }
  
  return result !== undefined ? result : defaultValue
}

/**
 * 安全的JSON解析
 * Safe JSON parsing
 */
export function safeJsonParse<T = any>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T
  } catch {
    return defaultValue
  }
}

/**
 * 安全的JSON字符串化
 * Safe JSON stringification
 */
export function safeJsonStringify(obj: any): string {
  try {
    return JSON.stringify(obj)
  } catch {
    return '{}'
  }
}
