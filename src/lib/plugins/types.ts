import type { Component } from 'vue'
import type { PluginSettingSchema, SearchPlugin } from '../search-plugins'
import { logger } from '../logger'
import { handlePluginError } from '../error-handler'

/**
 * Plugin metadata information
 */
export interface PluginMetadata {
  /** Plugin author */
  author: string
  /** Plugin homepage URL */
  homepage?: string
  /** Plugin repository URL */
  repository?: string
  /** Plugin license */
  license: string
  /** Plugin keywords for search and categorization */
  keywords: string[]
  /** Installation date */
  installDate: Date
  /** Last updated date */
  lastUpdated: Date
  /** Plugin file size in bytes */
  fileSize: number
  /** Plugin dependencies */
  dependencies: string[]
  /** Plugin category */
  category: PluginCategory
  /** Plugin screenshots */
  screenshots?: string[]
  /** Plugin rating (0-5) */
  rating?: number
  /** Download count */
  downloadCount?: number
  /** Minimum app version required */
  minAppVersion?: string
}

/**
 * Plugin installation information
 */
export interface PluginInstallation {
  /** Whether the plugin is installed */
  isInstalled: boolean
  /** Whether the plugin is built-in */
  isBuiltIn: boolean
  /** Installation path */
  installPath?: string
  /** Whether the plugin can be uninstalled */
  canUninstall: boolean
  /** Installation method */
  installMethod?: 'builtin' | 'manual' | 'store'
  /** Installation status */
  status: PluginInstallationStatus
}

/**
 * Plugin installation status
 */
export enum PluginInstallationStatus {
  INSTALLED = 'installed',
  INSTALLING = 'installing',
  UNINSTALLING = 'uninstalling',
  UPDATING = 'updating',
  FAILED = 'failed',
  PENDING = 'pending'
}

/**
 * Plugin permissions
 */
export interface PluginPermissions {
  /** Permission type */
  type: PluginPermissionType
  /** Human-readable description */
  description: string
  /** Whether this permission is required */
  required: boolean
  /** Additional permission details */
  details?: string
}

/**
 * Plugin permission types
 */
export enum PluginPermissionType {
  FILESYSTEM = 'filesystem',
  NETWORK = 'network',
  SYSTEM = 'system',
  CLIPBOARD = 'clipboard',
  NOTIFICATIONS = 'notifications',
  SHELL = 'shell'
}

/**
 * Plugin categories
 */
export enum PluginCategory {
  SEARCH = 'search',
  PRODUCTIVITY = 'productivity',
  UTILITIES = 'utilities',
  DEVELOPMENT = 'development',
  SYSTEM = 'system',
  ENTERTAINMENT = 'entertainment',
  COMMUNICATION = 'communication'
}

/**
 * Enhanced search plugin interface extending the base SearchPlugin
 */
export interface EnhancedSearchPlugin extends SearchPlugin {
  /** Plugin metadata */
  metadata: PluginMetadata
  /** Installation information */
  installation: PluginInstallation
  /** Plugin permissions */
  permissions: PluginPermissions[]
  /** Plugin configuration schema */
  configSchema?: PluginConfigurationSchema
  /** Plugin health status */
  health?: PluginHealthStatus
}

/**
 * Plugin configuration schema
 */
export interface PluginConfigurationSchema {
  /** Schema version */
  version: string
  /** Setting definitions */
  settings: PluginSettingDefinition[]
  /** Action definitions */
  actions?: PluginActionDefinition[]
}

/**
 * Enhanced plugin setting definition
 */
export interface PluginSettingDefinition extends PluginSettingSchema {
  /** Setting group for organization */
  group?: string
  /** Whether the setting is advanced */
  advanced?: boolean
  /** Setting dependencies */
  dependsOn?: string
  /** Conditional display logic */
  condition?: (values: Record<string, any>) => boolean
  /** Setting order for display */
  order?: number
  /** Whether this setting is required */
  required?: boolean
}

/**
 * Plugin action definition
 */
export interface PluginActionDefinition {
  /** Action identifier */
  id: string
  /** Action label */
  label: string
  /** Action description */
  description?: string
  /** Action icon */
  icon?: Component
  /** Action handler */
  handler: () => void | Promise<void>
  /** Whether action is destructive */
  destructive?: boolean
}

/**
 * Plugin health status
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
 */
export enum PluginHealthLevel {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  ERROR = 'error',
  UNKNOWN = 'unknown'
}

/**
 * Plugin health issue
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
 */
export enum PluginSecurityIssueType {
  UNSAFE_PERMISSIONS = 'unsafe_permissions',
  NETWORK_ACCESS = 'network_access',
  FILE_SYSTEM_ACCESS = 'file_system_access',
  SHELL_EXECUTION = 'shell_execution',
  UNSIGNED_CODE = 'unsigned_code',
  SUSPICIOUS_BEHAVIOR = 'suspicious_behavior'
}

/**
 * Plugin catalog item for browsing available plugins
 */
export interface PluginCatalogItem {
  /** Plugin identifier */
  id: string
  /** Plugin name */
  name: string
  /** Plugin description */
  description: string
  /** Plugin version */
  version: string
  /** Plugin author */
  author: string
  /** Plugin category */
  category: PluginCategory
  /** Plugin tags */
  tags: string[]
  /** Download URL */
  downloadUrl: string
  /** Plugin homepage */
  homepage?: string
  /** Plugin screenshots */
  screenshots: string[]
  /** Plugin rating */
  rating: number
  /** Download count */
  downloadCount: number
  /** Last updated date */
  lastUpdated: Date
  /** Minimum app version */
  minAppVersion: string
  /** Required permissions */
  permissions: PluginPermissions[]
  /** File size in bytes */
  fileSize: number
  /** Whether plugin is featured */
  featured?: boolean
}

/**
 * Plugin statistics
 */
export interface PluginStatistics {
  /** Total number of plugins */
  total: number
  /** Number of installed plugins */
  installed: number
  /** Number of enabled plugins */
  enabled: number
  /** Number of plugins by category */
  byCategory: Record<PluginCategory, number>
  /** Number of plugins with health issues */
  withIssues: number
}

/**
 * Plugin management result
 */
export interface PluginManagementResult {
  /** Whether the operation was successful */
  success: boolean
  /** Plugin identifier */
  pluginId?: string
  /** Result message */
  message?: string
  /** Error if operation failed */
  error?: any
}

/**
 * Plugin validation utilities
 */
export class PluginValidator {
  /**
   * Validate a plugin package
   */
  static async validatePlugin(pluginPath: string): Promise<PluginValidationResult> {
    const errors: PluginValidationError[] = []
    const warnings: PluginValidationWarning[] = []
    
    try {
      // Basic file structure validation
      const structureValidation = await this.validatePluginStructure(pluginPath)
      errors.push(...structureValidation.errors)
      warnings.push(...structureValidation.warnings)
      
      // Security validation
      const securityAssessment = await this.assessPluginSecurity(pluginPath)
      
      // Compatibility validation
      const compatibilityValidation = await this.validateCompatibility(pluginPath)
      errors.push(...compatibilityValidation.errors)
      warnings.push(...compatibilityValidation.warnings)
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        security: securityAssessment
      }
    } catch (error) {
      errors.push({
        code: 'VALIDATION_FAILED',
        message: `Plugin validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical'
      })
      
      return {
        isValid: false,
        errors,
        warnings,
        security: {
          level: PluginSecurityLevel.DANGEROUS,
          issues: [],
          trusted: false
        }
      }
    }
  }
  
  /**
   * Validate plugin file structure
   */
  private static async validatePluginStructure(pluginPath: string): Promise<{
    errors: PluginValidationError[]
    warnings: PluginValidationWarning[]
  }> {
    const errors: PluginValidationError[] = []
    const warnings: PluginValidationWarning[] = []
    
    try {
      // 检查必需的文件结构
      const requiredFiles = [
        'package.json',
        'index.js', // 或 'index.ts'
        'README.md'
      ]
      
      // 模拟文件结构检查（在实际实现中，这里会使用文件系统API）
      for (const requiredFile of requiredFiles) {
        try {
          // 这里应该检查文件是否存在
          // 现在我们只是模拟验证
          if (Math.random() < 0.1) { // 10%概率模拟文件缺失
            errors.push({
              code: 'MISSING_FILE',
              message: `必需文件缺失: ${requiredFile}`,
              severity: 'critical'
            })
          }
        } catch (error) {
          const appError = handlePluginError(`检查文件 ${requiredFile}`, error)
          logger.warn(`文件检查失败: ${requiredFile}`, appError)
          warnings.push({
            code: 'FILE_ACCESS_ERROR',
            message: `无法访问文件: ${requiredFile}`
          })
        }
      }
      
      // 检查package.json格式
      try {
        // 这里应该解析和验证package.json
        if (Math.random() < 0.05) { // 5%概率模拟格式错误
          errors.push({
            code: 'INVALID_MANIFEST',
            message: 'package.json 格式无效',
            severity: 'error'
          })
        }
      } catch (error) {
        const appError = handlePluginError('验证package.json格式', error)
        logger.warn('package.json验证失败', appError)
        errors.push({
          code: 'MANIFEST_PARSE_ERROR',
          message: '无法解析package.json',
          severity: 'critical'
        })
      }
      
      logger.info(`插件结构验证完成: ${pluginPath}`)
      
    } catch (error) {
      const appError = handlePluginError('插件结构验证', error)
      logger.error('插件结构验证失败', appError)
      errors.push({
        type: 'validation_error',
        message: '插件结构验证过程中发生错误',
        severity: 'critical',
        suggestion: '请检查插件路径和权限'
      })
    }
    
    return { errors, warnings }
  }
  
  /**
   * Assess plugin security
   */
  private static async assessPluginSecurity(pluginPath: string): Promise<PluginSecurityAssessment> {
    const issues: PluginSecurityIssue[] = []
    
    try {
      // 检查插件权限安全性
      const dangerousPermissions = [
        PluginPermissionType.FILESYSTEM,
        PluginPermissionType.NETWORK,
        PluginPermissionType.SHELL
      ]
      
      // 模拟权限检查（在实际实现中，这里会分析插件清单）
      const hasDangerousPermissions = dangerousPermissions.some(() => Math.random() < 0.3) // 30%概率有危险权限
      
      if (hasDangerousPermissions) {
        issues.push({
          type: PluginSecurityIssueType.UNSAFE_PERMISSIONS,
          description: '插件请求了潜在的危险权限',
          risk: 'medium',
          mitigation: '请仔细审查插件权限要求，确保只授予必要的权限'
        })
      }
      
      // 检查代码模式安全性
      const suspiciousPatterns = [
        'eval(', 
        'Function(', 
        'exec(', 
        'child_process',
        'fs.unlink',
        'fs.writeFile'
      ]
      
      // 模拟代码模式检查（在实际实现中，这里会扫描插件代码）
      const hasSuspiciousPatterns = suspiciousPatterns.some(() => Math.random() < 0.1) // 10%概率有可疑模式
      
      if (hasSuspiciousPatterns) {
        issues.push({
          type: PluginSecurityIssueType.SUSPICIOUS_BEHAVIOR,
          description: '检测到可疑的代码模式',
          risk: 'high',
          mitigation: '请审查插件代码，确保没有恶意行为'
        })
      }
      
      // 检查数字签名
      const signatureValid = Math.random() < 0.8 // 80%概率签名有效
      
      if (!signatureValid) {
        issues.push({
          type: PluginSecurityIssueType.UNSIGNED_CODE,
          description: '插件缺少有效的数字签名',
          risk: 'medium',
          mitigation: '建议使用经过签名的插件，或确保插件来源可靠'
        })
      }
      
      // 网络访问安全检查
      const requiresNetworkAccess = Math.random() < 0.4 // 40%概率需要网络访问
      
      if (requiresNetworkAccess) {
        issues.push({
          type: PluginSecurityIssueType.NETWORK_ACCESS,
          description: '插件需要网络访问权限',
          risk: 'low',
          mitigation: '确保插件只与可信的服务器通信'
        })
      }
      
      // 确定安全等级
      let securityLevel = PluginSecurityLevel.SAFE
      const criticalIssues = issues.filter(issue => issue.risk === 'critical').length
      const highIssues = issues.filter(issue => issue.risk === 'high').length
      
      if (criticalIssues > 0) {
        securityLevel = PluginSecurityLevel.DANGEROUS
      } else if (highIssues > 0) {
        securityLevel = PluginSecurityLevel.HIGH_RISK
      } else if (issues.length > 2) {
        securityLevel = PluginSecurityLevel.MEDIUM_RISK
      } else if (issues.length > 0) {
        securityLevel = PluginSecurityLevel.LOW_RISK
      }
      
      logger.info(`插件安全评估完成: ${pluginPath}, 等级: ${securityLevel}`)
      
      return {
        level: securityLevel,
        issues,
        trusted: signatureValid && securityLevel === PluginSecurityLevel.SAFE,
        signatureValid
      }
      
    } catch (error) {
      const appError = handlePluginError('插件安全评估', error)
      logger.error('插件安全评估失败', appError)
      
      return {
        level: PluginSecurityLevel.HIGH_RISK,
        issues: [{
          type: PluginSecurityIssueType.SUSPICIOUS_BEHAVIOR,
          description: '安全评估过程中发生错误',
          risk: 'high',
          mitigation: '请检查插件文件是否完整'
        }],
        trusted: false,
        signatureValid: false
      }
    }
  }
  
  /**
   * Validate plugin compatibility
   */
  private static async validateCompatibility(pluginPath: string): Promise<{
    errors: PluginValidationError[]
    warnings: PluginValidationWarning[]
  }> {
    const errors: PluginValidationError[] = []
    const warnings: PluginValidationWarning[] = []
    
    try {
      // 检查应用版本兼容性
      const currentAppVersion = '1.0.0' // 当前应用版本
      
      // 模拟版本检查（在实际实现中，这里会读取插件的版本要求）
      const minVersionRequired = '0.9.0'
      const maxVersionSupported = '2.0.0'
      
      // 简单的版本比较函数
      const compareVersions = (v1: string, v2: string): number => {
        const v1Parts = v1.split('.').map(Number)
        const v2Parts = v2.split('.').map(Number)
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
          const v1Part = v1Parts[i] || 0
          const v2Part = v2Parts[i] || 0
          if (v1Part > v2Part) return 1
          if (v1Part < v2Part) return -1
        }
        return 0
      }
      
      if (compareVersions(currentAppVersion, minVersionRequired) < 0) {
        errors.push({
          code: 'INCOMPATIBLE_VERSION',
          message: `应用版本过低，需要至少 ${minVersionRequired} 版本`,
          severity: 'critical'
        })
      }
      
      if (compareVersions(currentAppVersion, maxVersionSupported) > 0) {
        warnings.push({
          code: 'VERSION_WARNING',
          message: `应用版本 ${currentAppVersion} 可能与插件不完全兼容`
        })
      }
      
      // 检查依赖项兼容性
      const dependencies = [
        { name: 'vue', required: '>=3.0.0' },
        { name: 'tauri-apps/api', required: '>=1.0.0' }
      ]
      
      // 模拟依赖检查（在实际实现中，这里会检查实际的依赖版本）
      for (const dep of dependencies) {
        try {
          // 这里应该检查实际安装的依赖版本
          const isDependencySatisfied = Math.random() < 0.9 // 90%概率依赖满足
          
          if (!isDependencySatisfied) {
            errors.push({
              code: 'MISSING_DEPENDENCY',
              message: `缺少依赖: ${dep.name} ${dep.required}`,
              severity: 'error'
            })
          }
        } catch (error) {
          const appError = handlePluginError(`检查依赖 ${dep.name}`, error)
          logger.warn(`依赖检查失败: ${dep.name}`, appError)
          warnings.push({
            code: 'DEPENDENCY_CHECK_ERROR',
            message: `无法验证依赖 ${dep.name} 的版本`
          })
        }
      }
      
      // 检查平台兼容性
      const currentPlatform = process.platform || 'unknown'
      const supportedPlatforms = ['darwin', 'win32', 'linux']
      
      if (!supportedPlatforms.includes(currentPlatform)) {
        warnings.push({
          code: 'PLATFORM_COMPATIBILITY',
          message: `当前平台 ${currentPlatform} 可能不被插件完全支持`
        })
      }
      
      // 检查架构兼容性
      const currentArch = process.arch || 'unknown'
      const supportedArchitectures = ['x64', 'arm64']
      
      if (!supportedArchitectures.includes(currentArch)) {
        warnings.push({
          code: 'ARCHITECTURE_COMPATIBILITY',
          message: `当前架构 ${currentArch} 可能不被插件支持`
        })
      }
      
      logger.info(`插件兼容性验证完成: ${pluginPath}`)
      
    } catch (error) {
      const appError = handlePluginError('插件兼容性验证', error)
      logger.error('插件兼容性验证失败', appError)
      errors.push({
        code: 'COMPATIBILITY_ERROR',
        message: '兼容性验证过程中发生错误',
        severity: 'critical'
      })
    }
    
    return { errors, warnings }
  }
  
  /**
   * Validate plugin permissions
   */
  static validatePermissions(permissions: PluginPermissions[]): PluginValidationResult {
    const errors: PluginValidationError[] = []
    const warnings: PluginValidationWarning[] = []
    const securityIssues: PluginSecurityIssue[] = []
    
    for (const permission of permissions) {
      // Check for high-risk permissions
      if (permission.type === PluginPermissionType.SHELL && permission.required) {
        securityIssues.push({
          type: PluginSecurityIssueType.SHELL_EXECUTION,
          description: 'Plugin requires shell execution permissions',
          risk: 'high',
          mitigation: 'Review plugin code carefully before installation'
        })
      }
      
      if (permission.type === PluginPermissionType.FILESYSTEM && permission.required) {
        securityIssues.push({
          type: PluginSecurityIssueType.FILE_SYSTEM_ACCESS,
          description: 'Plugin requires file system access',
          risk: 'medium',
          mitigation: 'Ensure plugin is from a trusted source'
        })
      }
    }
    
    const securityLevel = securityIssues.some(issue => issue.risk === 'high' || issue.risk === 'critical')
      ? PluginSecurityLevel.HIGH_RISK
      : securityIssues.some(issue => issue.risk === 'medium')
      ? PluginSecurityLevel.MEDIUM_RISK
      : PluginSecurityLevel.SAFE
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      security: {
        level: securityLevel,
        issues: securityIssues,
        trusted: securityLevel === PluginSecurityLevel.SAFE
      }
    }
  }
  
  /**
   * Validate plugin configuration
   */
  static validateConfiguration(
    config: Record<string, any>,
    schema: PluginSettingDefinition[]
  ): PluginValidationResult {
    const errors: PluginValidationError[] = []
    const warnings: PluginValidationWarning[] = []
    
    for (const setting of schema) {
      const value = config[setting.key]
      
      // Check required settings
      if (setting.required && (value === undefined || value === null)) {
        errors.push({
          code: 'MISSING_REQUIRED_SETTING',
          message: `Required setting '${setting.key}' is missing`,
          location: setting.key,
          severity: 'error'
        })
        continue
      }
      
      // Validate setting value
      if (value !== undefined && setting.validate) {
        const validationResult = setting.validate(value)
        if (validationResult !== true) {
          errors.push({
            code: 'INVALID_SETTING_VALUE',
            message: typeof validationResult === 'string' 
              ? validationResult 
              : `Invalid value for setting '${setting.key}'`,
            location: setting.key,
            severity: 'error'
          })
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      security: {
        level: PluginSecurityLevel.SAFE,
        issues: [],
        trusted: true
      }
    }
  }
}

/**
 * Plugin utility functions
 */
export class PluginUtils {
  /**
   * Create a basic plugin metadata object
   */
  static createBasicMetadata(_plugin: SearchPlugin): PluginMetadata {
    return {
      author: 'Unknown',
      license: 'Unknown',
      keywords: [],
      installDate: new Date(),
      lastUpdated: new Date(),
      fileSize: 0,
      dependencies: [],
      category: PluginCategory.UTILITIES
    }
  }
  
  /**
   * Create a basic installation object for built-in plugins
   */
  static createBuiltInInstallation(): PluginInstallation {
    return {
      isInstalled: true,
      isBuiltIn: true,
      canUninstall: false,
      installMethod: 'builtin',
      status: PluginInstallationStatus.INSTALLED
    }
  }
  
  /**
   * Convert a basic SearchPlugin to EnhancedSearchPlugin
   */
  static enhancePlugin(plugin: SearchPlugin): EnhancedSearchPlugin {
    return {
      ...plugin,
      metadata: this.createBasicMetadata(plugin),
      installation: this.createBuiltInInstallation(),
      permissions: []
    }
  }
  
  /**
   * Check if a plugin meets minimum requirements
   */
  static meetsRequirements(
    plugin: PluginCatalogItem,
    currentAppVersion: string
  ): boolean {
    if (!plugin.minAppVersion) return true
    
    // Simple version comparison (assumes semantic versioning)
    const parseVersion = (version: string) => {
      return version.split('.').map(num => parseInt(num, 10))
    }
    
    const currentVersion = parseVersion(currentAppVersion)
    const requiredVersion = parseVersion(plugin.minAppVersion)
    
    for (let i = 0; i < Math.max(currentVersion.length, requiredVersion.length); i++) {
      const current = currentVersion[i] || 0
      const required = requiredVersion[i] || 0
      
      if (current > required) return true
      if (current < required) return false
    }
    
    return true
  }
  
  /**
   * Calculate plugin health score
   */
  static calculateHealthScore(health: PluginHealthStatus): number {
    if (health.status === PluginHealthLevel.HEALTHY) return 100
    if (health.status === PluginHealthLevel.WARNING) return 75
    if (health.status === PluginHealthLevel.ERROR) return 25
    return 0
  }
  
  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }
}
