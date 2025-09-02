/**
 * Plugin management error types and error handling
 */

/**
 * Plugin management error types
 */
export enum PluginManagementErrorType {
  PLUGIN_NOT_FOUND = 'plugin_not_found',
  INSTALLATION_FAILED = 'installation_failed',
  UNINSTALLATION_FAILED = 'uninstallation_failed',
  UPDATE_FAILED = 'update_failed',
  VALIDATION_FAILED = 'validation_failed',
  PERMISSION_DENIED = 'permission_denied',
  NETWORK_ERROR = 'network_error',
  DEPENDENCY_ERROR = 'dependency_error',
  CONFIGURATION_ERROR = 'configuration_error',
  SECURITY_ERROR = 'security_error'
}

/**
 * Plugin management error class
 */
export class PluginManagementError extends Error {
  constructor(
    public type: PluginManagementErrorType,
    message: string,
    public details?: string,
    public pluginId?: string,
    public recoverable: boolean = true,
    public suggestedAction?: string
  ) {
    super(message)
    this.name = 'PluginManagementError'
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(): string {
    switch (this.type) {
      case PluginManagementErrorType.PLUGIN_NOT_FOUND:
        return `未找到插件: ${this.pluginId}`
      case PluginManagementErrorType.INSTALLATION_FAILED:
        return `插件安装失败: ${this.message}`
      case PluginManagementErrorType.UNINSTALLATION_FAILED:
        return `插件卸载失败: ${this.message}`
      case PluginManagementErrorType.UPDATE_FAILED:
        return `插件更新失败: ${this.message}`
      case PluginManagementErrorType.VALIDATION_FAILED:
        return `插件验证失败: ${this.message}`
      case PluginManagementErrorType.PERMISSION_DENIED:
        return `权限不足: ${this.message}`
      case PluginManagementErrorType.NETWORK_ERROR:
        return `网络错误: ${this.message}`
      case PluginManagementErrorType.DEPENDENCY_ERROR:
        return `依赖错误: ${this.message}`
      case PluginManagementErrorType.CONFIGURATION_ERROR:
        return `配置错误: ${this.message}`
      case PluginManagementErrorType.SECURITY_ERROR:
        return `安全错误: ${this.message}`
      default:
        return this.message
    }
  }

  /**
   * Convert to JSON serializable format
   */
  toJSON() {
    return {
      type: this.type,
      message: this.message,
      details: this.details,
      pluginId: this.pluginId,
      recoverable: this.recoverable,
      suggestedAction: this.suggestedAction,
      name: this.name,
      stack: this.stack
    }
  }
}

/**
 * Create a plugin management error
 */
export function createPluginManagementError(
  type: PluginManagementErrorType,
  message: string,
  options?: {
    details?: string
    pluginId?: string
    recoverable?: boolean
    suggestedAction?: string
  }
): PluginManagementError {
  return new PluginManagementError(
    type,
    message,
    options?.details,
    options?.pluginId,
    options?.recoverable ?? true,
    options?.suggestedAction
  )
}

/**
 * Error factory functions
 */
export const PluginErrors = {
  pluginNotFound: (pluginId: string) => 
    createPluginManagementError(
      PluginManagementErrorType.PLUGIN_NOT_FOUND,
      `Plugin not found: ${pluginId}`,
      { pluginId }
    ),
  
  installationFailed: (pluginId: string, reason: string) =>
    createPluginManagementError(
      PluginManagementErrorType.INSTALLATION_FAILED,
      `Installation failed for plugin ${pluginId}: ${reason}`,
      { pluginId, recoverable: true, suggestedAction: 'Check plugin dependencies and try again' }
    ),
  
  uninstallationFailed: (pluginId: string, reason: string) =>
    createPluginManagementError(
      PluginManagementErrorType.UNINSTALLATION_FAILED,
      `Uninstallation failed for plugin ${pluginId}: ${reason}`,
      { pluginId, recoverable: true, suggestedAction: 'Close plugin instances and try again' }
    ),
  
  updateFailed: (pluginId: string, reason: string) =>
    createPluginManagementError(
      PluginManagementErrorType.UPDATE_FAILED,
      `Update failed for plugin ${pluginId}: ${reason}`,
      { pluginId, recoverable: true, suggestedAction: 'Check network connection and try again' }
    ),
  
  validationFailed: (pluginId: string, reason: string) =>
    createPluginManagementError(
      PluginManagementErrorType.VALIDATION_FAILED,
      `Validation failed for plugin ${pluginId}: ${reason}`,
      { pluginId, recoverable: false, suggestedAction: 'Fix validation errors before proceeding' }
    ),
  
  permissionDenied: (pluginId: string, permission: string) =>
    createPluginManagementError(
      PluginManagementErrorType.PERMISSION_DENIED,
      `Permission denied for plugin ${pluginId}: required ${permission}`,
      { pluginId, recoverable: false, suggestedAction: 'Grant required permissions or use alternative plugin' }
    ),
  
  networkError: (pluginId: string, operation: string) =>
    createPluginManagementError(
      PluginManagementErrorType.NETWORK_ERROR,
      `Network error during ${operation} for plugin ${pluginId}`,
      { pluginId, recoverable: true, suggestedAction: 'Check internet connection and retry' }
    ),
  
  dependencyError: (pluginId: string, dependency: string) =>
    createPluginManagementError(
      PluginManagementErrorType.DEPENDENCY_ERROR,
      `Dependency error for plugin ${pluginId}: missing ${dependency}`,
      { pluginId, recoverable: true, suggestedAction: 'Install required dependencies first' }
    ),
  
  configurationError: (pluginId: string, configKey: string) =>
    createPluginManagementError(
      PluginManagementErrorType.CONFIGURATION_ERROR,
      `Configuration error for plugin ${pluginId}: invalid ${configKey}`,
      { pluginId, recoverable: true, suggestedAction: 'Check plugin configuration' }
    ),
  
  securityError: (pluginId: string, securityIssue: string) =>
    createPluginManagementError(
      PluginManagementErrorType.SECURITY_ERROR,
      `Security error for plugin ${pluginId}: ${securityIssue}`,
      { pluginId, recoverable: false, suggestedAction: 'Plugin blocked due to security concerns' }
    )
}