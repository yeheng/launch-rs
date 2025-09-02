/**
 * Plugin types module exports
 * 插件类型模块导出
 */

// Re-export all types from submodules
// 从子模块重新导出所有类型

// Basic types - export interfaces and complex types only
// 基础类型 - 仅导出接口和复杂类型
export type {
  PluginMetadata,
  PluginInstallation,
  PluginPermissions,
  EnhancedSearchPlugin,
  PluginConfigurationSchema,
  PluginSettingDefinition,
  PluginActionDefinition
} from './basic'

// Export enums as values for usage in code (also available as types)
// 导出枚举作为值供代码使用（同时作为类型可用）
export {
  PluginInstallationStatus,
  PluginPermissionType,
  PluginCategory
} from './basic'

// Health and validation types - export interfaces and complex types only
// 健康和验证类型 - 仅导出接口和复杂类型
export type {
  PluginHealthStatus,
  PluginHealthIssue,
  PluginMetrics,
  PluginValidationResult,
  PluginValidationError,
  PluginValidationWarning,
  PluginSecurityAssessment,
  PluginSecurityIssue
} from './health'

// Export health enums as values for usage in code (also available as types)
// 导出健康枚举作为值供代码使用（同时作为类型可用）
export {
  PluginHealthLevel,
  PluginIssueType,
  PluginSecurityLevel,
  PluginSecurityIssueType
} from './health'

// Catalog and statistics types
// 目录和统计类型
export type {
  PluginCatalogItem,
  PluginUsageMetrics,
  PluginStatistics,
  PluginManagementResult
} from './catalog'

// Utility classes
// 工具类
export { PluginValidator } from './utils'

// Keep the original utils class for backward compatibility
// 保持原始工具类以向后兼容
export { PluginUtils } from './plugin-utils'