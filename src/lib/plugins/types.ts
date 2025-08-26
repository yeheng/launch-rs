import type { Component } from 'vue'
import type { SearchPlugin, PluginSettingSchema } from '../search-plugins'

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
  private static async validatePluginStructure(_pluginPath: string): Promise<{
    errors: PluginValidationError[]
    warnings: PluginValidationWarning[]
  }> {
    const errors: PluginValidationError[] = []
    const warnings: PluginValidationWarning[] = []
    
    // TODO: Implement file structure validation
    // This would check for required files, manifest format, etc.
    
    return { errors, warnings }
  }
  
  /**
   * Assess plugin security
   */
  private static async assessPluginSecurity(_pluginPath: string): Promise<PluginSecurityAssessment> {
    const issues: PluginSecurityIssue[] = []
    
    // TODO: Implement security assessment
    // This would analyze permissions, code patterns, etc.
    
    return {
      level: PluginSecurityLevel.SAFE,
      issues,
      trusted: false,
      signatureValid: false
    }
  }
  
  /**
   * Validate plugin compatibility
   */
  private static async validateCompatibility(_pluginPath: string): Promise<{
    errors: PluginValidationError[]
    warnings: PluginValidationWarning[]
  }> {
    const errors: PluginValidationError[] = []
    const warnings: PluginValidationWarning[] = []
    
    // TODO: Implement compatibility validation
    // This would check app version requirements, dependencies, etc.
    
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