/**
 * Plugin types module exports
 * 插件类型模块导出
 */

// Re-export all types from submodules
// 从子模块重新导出所有类型

// Basic types
// 基础类型
export type {
  PluginMetadata,
  PluginInstallation,
  PluginInstallationStatus,
  PluginPermissions,
  PluginPermissionType,
  PluginCategory,
  EnhancedSearchPlugin,
  PluginConfigurationSchema,
  PluginSettingDefinition,
  PluginActionDefinition
} from './types/basic'

// Health and validation types
// 健康和验证类型
export type {
  PluginHealthStatus,
  PluginHealthLevel,
  PluginHealthIssue,
  PluginIssueType,
  PluginMetrics,
  PluginValidationResult,
  PluginValidationError,
  PluginValidationWarning,
  PluginSecurityAssessment,
  PluginSecurityLevel,
  PluginSecurityIssue,
  PluginSecurityIssueType
} from './types/health'

// Catalog and statistics types
// 目录和统计类型
export type {
  PluginCatalogItem,
  PluginUsageMetrics,
  PluginStatistics,
  PluginManagementResult
} from './types/catalog'

// Utility classes
// 工具类
export { PluginValidator } from './types/utils'

// Keep the original utils class for backward compatibility
// 保持原始工具类以向后兼容
export { PluginUtils } from './types/plugin-utils'