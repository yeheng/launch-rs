/**
 * Plugin management module exports
 */

// Core management service
export { PluginManagementService, pluginManagementService } from './plugin-management-service'

// Specialized services
export { PluginOperationsService, pluginOperationsService } from './plugin-operations'
export { PluginDiscoveryService, pluginDiscoveryService } from './plugin-discovery'
export { PluginHealthService, pluginHealthService } from './plugin-health'
export { PluginConfigurationService, pluginConfigurationService } from './plugin-configuration'

// Error handling
export {
  PluginManagementErrorType,
  PluginManagementError,
  createPluginManagementError,
  PluginErrors
} from './errors'

// Interfaces and types
export {
  PluginSearchOptions,
  PluginOperationResult,
  PluginStatistics,
  PluginConfigurationUpdateOptions,
  PluginInstallationOptions,
  PluginUninstallationOptions,
  PluginUpdateOptions,
  PluginHealthCheckOptions,
  PluginValidationOptions,
  PluginDiscoveryOptions,
  PluginDependency,
  PluginCompatibility,
  PluginPerformanceMetrics,
  PluginUsageAnalytics,
  PluginManagementEvent,
  IPluginManagementService
} from './interfaces'