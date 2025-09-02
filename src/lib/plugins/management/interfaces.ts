/**
 * Plugin management service interfaces and types
 */

import type { 
  EnhancedSearchPlugin, 
  PluginCatalogItem, 
  PluginHealthStatus, 
  PluginManagementResult, 
  PluginValidationResult 
} from '../types'
import type { PluginCategory } from '../types'
import type { PluginManagementError } from './errors'

/**
 * Plugin search options
 */
export interface PluginSearchOptions {
  /** Search query */
  query?: string
  /** Filter by category */
  category?: PluginCategory
  /** Filter by enabled status */
  enabled?: boolean
  /** Filter by installation status */
  installed?: boolean
  /** Sort by field */
  sortBy?: 'name' | 'category' | 'installDate' | 'lastUpdated' | 'rating' | 'downloadCount'
  /** Sort order */
  sortOrder?: 'asc' | 'desc'
  /** Maximum results */
  limit?: number
  /** Skip results (for pagination) */
  offset?: number
}

/**
 * Plugin operation result
 */
export interface PluginOperationResult {
  /** Whether the operation was successful */
  success: boolean
  /** Error if operation failed */
  error?: PluginManagementError
  /** Additional data */
  data?: any
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
 * Plugin configuration update options
 */
export interface PluginConfigurationUpdateOptions {
  /** Plugin settings to update */
  settings?: Record<string, any>
  /** Plugin permissions to update */
  permissions?: string[]
  /** Plugin metadata to update */
  metadata?: Record<string, any>
  /** Whether to enable the plugin */
  enabled?: boolean
}

/**
 * Plugin installation options
 */
export interface PluginInstallationOptions {
  /** Installation path (optional) */
  installPath?: string
  /** Whether to enable after installation */
  enableAfterInstall?: boolean
  /** Custom configuration */
  configuration?: Record<string, any>
  /** Whether to skip validation */
  skipValidation?: boolean
  /** Whether to install dependencies automatically */
  autoInstallDeps?: boolean
}

/**
 * Plugin uninstallation options
 */
export interface PluginUninstallationOptions {
  /** Whether to remove plugin data */
  removeData?: boolean
  /** Whether to remove plugin configuration */
  removeConfig?: boolean
  /** Whether to force uninstallation */
  force?: boolean
  /** Backup configuration before removal */
  backupConfig?: boolean
}

/**
 * Plugin update options
 */
export interface PluginUpdateOptions {
  /** Whether to backup before update */
  backup?: boolean
  /** Whether to update dependencies */
  updateDeps?: boolean
  /** Whether to enable after update */
  enableAfterUpdate?: boolean
  /** Custom update configuration */
  configuration?: Record<string, any>
}

/**
 * Plugin health check options
 */
export interface PluginHealthCheckOptions {
  /** Whether to perform deep health check */
  deepCheck?: boolean
  /** Whether to check dependencies */
  checkDependencies?: boolean
  /** Whether to check performance */
  checkPerformance?: boolean
  /** Whether to check security */
  checkSecurity?: boolean
  /** Timeout for health check in milliseconds */
  timeout?: number
}

/**
 * Plugin validation options
 */
export interface PluginValidationOptions {
  /** Whether to validate schema */
  validateSchema?: boolean
  /** Whether to validate security */
  validateSecurity?: boolean
  /** Whether to validate dependencies */
  validateDeps?: boolean
  /** Whether to validate compatibility */
  validateCompatibility?: boolean
  /** Custom validation rules */
  customRules?: Array<(plugin: any) => boolean | string>
}

/**
 * Plugin discovery options
 */
export interface PluginDiscoveryOptions {
  /** Sources to search for plugins */
  sources?: ('local' | 'registry' | 'marketplace')[]
  /** Categories to include */
  categories?: PluginCategory[]
  /** Whether to include pre-release versions */
  includePreRelease?: boolean
  /** Maximum number of results */
  maxResults?: number
  /** Search query filter */
  query?: string
}

/**
 * Plugin dependency information
 */
export interface PluginDependency {
  /** Dependency ID */
  id: string
  /** Required version range */
  version: string
  /** Whether dependency is optional */
  optional: boolean
  /** Dependency description */
  description?: string
  /** Where to find the dependency */
  source?: string
}

/**
 * Plugin compatibility information
 */
export interface PluginCompatibility {
  /** Minimum required version */
  minVersion?: string
  /** Maximum supported version */
  maxVersion?: string
  /** Compatible platforms */
  platforms?: string[]
  /** Compatible architectures */
  architectures?: string[]
  /** Known issues */
  knownIssues?: string[]
}

/**
 * Plugin performance metrics
 */
export interface PluginPerformanceMetrics {
  /** Average response time in milliseconds */
  avgResponseTime: number
  /** Success rate percentage */
  successRate: number
  /** Error count */
  errorCount: number
  /** Request count */
  requestCount: number
  /** Last activity timestamp */
  lastActivity: number
  /** Memory usage in bytes */
  memoryUsage: number
  /** CPU usage percentage */
  cpuUsage: number
}

/**
 * Plugin usage analytics
 */
export interface PluginUsageAnalytics {
  /** Total usage count */
  totalUsage: number
  /** Usage frequency (per day) */
  frequency: number
  /** Average usage duration */
  avgDuration: number
  /** Peak usage times */
  peakTimes: number[]
  /** User satisfaction score */
  satisfactionScore?: number
  /** Common usage patterns */
  usagePatterns: string[]
}

/**
 * Plugin management events
 */
export interface PluginManagementEvent {
  /** Event type */
  type: 'install' | 'uninstall' | 'update' | 'enable' | 'disable' | 'configure' | 'health_check'
  /** Plugin ID */
  pluginId: string
  /** Event timestamp */
  timestamp: number
  /** Event data */
  data?: any
  /** Event result */
  result: 'success' | 'failed' | 'cancelled'
  /** Error if failed */
  error?: string
}

/**
 * Plugin management service interface
 */
export interface IPluginManagementService {
  // Plugin discovery and search
  getInstalledPlugins(): Promise<EnhancedSearchPlugin[]>
  getAvailablePlugins(): Promise<PluginCatalogItem[]>
  searchPlugins(options?: PluginSearchOptions): Promise<EnhancedSearchPlugin[]>
  getPluginDetails(pluginId: string): Promise<EnhancedSearchPlugin>
  
  // Plugin lifecycle management
  installPlugin(pluginId: string, options?: PluginInstallationOptions): Promise<PluginOperationResult>
  uninstallPlugin(pluginId: string, options?: PluginUninstallationOptions): Promise<PluginOperationResult>
  updatePlugin(pluginId: string, options?: PluginUpdateOptions): Promise<PluginOperationResult>
  enablePlugin(pluginId: string): Promise<PluginOperationResult>
  disablePlugin(pluginId: string): Promise<PluginOperationResult>
  
  // Plugin configuration
  updatePluginConfiguration(pluginId: string, config: PluginConfigurationUpdateOptions): Promise<PluginOperationResult>
  getPluginConfiguration(pluginId: string): Promise<Record<string, any>>
  
  // Plugin validation and health
  validatePlugin(plugin: PluginCatalogItem | string, options?: PluginValidationOptions): Promise<PluginValidationResult>
  checkPluginHealth(pluginId: string, options?: PluginHealthCheckOptions): Promise<PluginHealthStatus>
  
  // Plugin statistics and analytics
  getPluginStatistics(): Promise<PluginStatistics>
  getPluginPerformanceMetrics(pluginId: string): Promise<PluginPerformanceMetrics>
  getPluginUsageAnalytics(pluginId: string): Promise<PluginUsageAnalytics>
  
  // Plugin state management
  exportPluginState(): any
  importPluginState(state: any): Promise<PluginManagementResult>
  resetPluginMetrics(pluginId?: string): Promise<PluginManagementResult>
}