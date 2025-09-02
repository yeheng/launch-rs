/**
 * Plugin health and validation types
 * 插件健康状态和验证类型
 */

import type { PluginPermissions } from './basic'

/**
 * Plugin health status
 * 插件健康状态
 */
export interface PluginHealthStatus {
  /** Overall health status */
  status: PluginHealthLevel
  /** Health check timestamp */
  lastCheck: Date
  /** Health issues */
  issues: PluginHealthIssue[]
  /** Performance metrics */
  metrics?: PluginMetrics
}

/**
 * Plugin health levels
 * 插件健康等级
 */
export enum PluginHealthLevel {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  ERROR = 'error',
  UNKNOWN = 'unknown'
}

/**
 * Plugin health issue
 * 插件健康问题
 */
export interface PluginHealthIssue {
  /** Issue type */
  type: PluginIssueType
  /** Issue message */
  message: string
  /** Issue severity */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** Suggested fix */
  suggestedFix?: string
}

/**
 * Plugin issue types
 * 插件问题类型
 */
export enum PluginIssueType {
  PERFORMANCE = 'performance',
  COMPATIBILITY = 'compatibility',
  SECURITY = 'security',
  DEPENDENCY = 'dependency',
  CONFIGURATION = 'configuration',
  RESOURCE = 'resource'
}

/**
 * Plugin performance metrics
 * 插件性能指标
 */
export interface PluginMetrics {
  /** Average search time in milliseconds */
  avgSearchTime: number
  /** Memory usage in bytes */
  memoryUsage: number
  /** CPU usage percentage */
  cpuUsage: number
  /** Error count */
  errorCount: number
  /** Success rate percentage */
  successRate: number
}

/**
 * Plugin validation result
 * 插件验证结果
 */
export interface PluginValidationResult {
  /** Whether the plugin is valid */
  isValid: boolean
  /** Validation errors */
  errors: PluginValidationError[]
  /** Validation warnings */
  warnings: PluginValidationWarning[]
  /** Security assessment */
  security: PluginSecurityAssessment
}

/**
 * Plugin validation error
 * 插件验证错误
 */
export interface PluginValidationError {
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** Error location */
  location?: string
  /** Error severity */
  severity: 'error' | 'critical'
}

/**
 * Plugin validation warning
 * 插件验证警告
 */
export interface PluginValidationWarning {
  /** Warning code */
  code: string
  /** Warning message */
  message: string
  /** Warning location */
  location?: string
}

/**
 * Plugin security assessment
 * 插件安全评估
 */
export interface PluginSecurityAssessment {
  /** Security level */
  level: PluginSecurityLevel
  /** Security issues */
  issues: PluginSecurityIssue[]
  /** Trusted status */
  trusted: boolean
  /** Code signature verification */
  signatureValid?: boolean
}

/**
 * Plugin security levels
 * 插件安全等级
 */
export enum PluginSecurityLevel {
  SAFE = 'safe',
  LOW_RISK = 'low_risk',
  MEDIUM_RISK = 'medium_risk',
  HIGH_RISK = 'high_risk',
  DANGEROUS = 'dangerous'
}

/**
 * Plugin security issue
 * 插件安全问题
 */
export interface PluginSecurityIssue {
  /** Issue type */
  type: PluginSecurityIssueType
  /** Issue description */
  description: string
  /** Risk level */
  risk: 'low' | 'medium' | 'high' | 'critical'
  /** Mitigation suggestion */
  mitigation?: string
}

/**
 * Plugin security issue types
 * 插件安全问题类型
 */
export enum PluginSecurityIssueType {
  UNSAFE_PERMISSIONS = 'unsafe_permissions',
  NETWORK_ACCESS = 'network_access',
  FILE_SYSTEM_ACCESS = 'file_system_access',
  SHELL_EXECUTION = 'shell_execution',
  UNSIGNED_CODE = 'unsigned_code',
  SUSPICIOUS_BEHAVIOR = 'suspicious_behavior'
}