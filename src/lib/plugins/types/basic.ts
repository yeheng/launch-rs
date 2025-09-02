/**
 * Basic plugin types and enums
 * 基础插件类型和枚举
 */

import type { PluginSettingSchema, SearchPlugin } from '../../search-plugins'

/**
 * Plugin metadata information
 * 插件元数据信息
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
 * 插件安装信息
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
 * 插件安装状态
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
 * 插件权限
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
 * 插件权限类型
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
 * 插件分类
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
 * 增强的搜索插件接口，扩展基础 SearchPlugin
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
 * 插件配置模式
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
 * 增强的插件设置定义
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
 * 插件操作定义
 */
export interface PluginActionDefinition {
  /** Action identifier */
  id: string
  /** Action label */
  label: string
  /** Action description */
  description?: string
  /** Action icon */
  icon?: any // Component type would be imported from Vue
  /** Action handler */
  handler: () => void | Promise<void>
  /** Whether action is destructive */
  destructive?: boolean
}