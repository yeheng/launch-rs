/**
 * Plugin management module exports
 */

// Specialized services
export { PluginConfigurationService, pluginConfigurationService } from './plugin-configuration'
export { PluginDiscoveryService, pluginDiscoveryService } from './plugin-discovery'
export { PluginHealthService, pluginHealthService } from './plugin-health'
export { PluginOperationsService, pluginOperationsService } from './plugin-operations'

// Error handling
export {
  createPluginManagementError,
  PluginErrors, PluginManagementError, PluginManagementErrorType
} from './errors'

// Interfaces and types
export type {
  IPluginManagementService, PluginCompatibility, PluginConfigurationUpdateOptions, PluginDependency, PluginDiscoveryOptions, PluginHealthCheckOptions, PluginInstallationOptions, PluginManagementEvent, PluginOperationResult, PluginPerformanceMetrics, PluginSearchOptions, PluginStatistics, PluginUninstallationOptions,
  PluginUpdateOptions, PluginUsageAnalytics, PluginValidationOptions
} from './interfaces'

