/**
 * Plugin health checking and validation functionality
 */

import { pluginManager } from '../../search-plugin-manager'
import { usePluginStateStore } from '../plugin-state-manager'
import { pluginStatisticsManager } from '../plugin-statistics'
import { logger } from '../../logger'
import { handlePluginError } from '../../error-handler'
import type { EnhancedSearchPlugin, PluginCatalogItem, PluginHealthStatus, PluginValidationResult } from '../types'
import type { PluginHealthCheckOptions, PluginValidationOptions } from './interfaces'
import { PluginManagementErrorType, PluginErrors } from './errors'

/**
 * Plugin health and validation service
 */
export class PluginHealthService {
  private stateStore = usePluginStateStore()

  /**
   * Check plugin health with comprehensive analysis
   */
  async checkPluginHealth(
    pluginId: string, 
    options: PluginHealthCheckOptions = {}
  ): Promise<PluginHealthStatus> {
    try {
      logger.info(`Checking health for plugin: ${pluginId}`, { options })

      const plugin = pluginManager.getPlugin(pluginId)
      if (!plugin) {
        throw PluginErrors.pluginNotFound(pluginId)
      }

      const healthStatus: PluginHealthStatus = {
        status: 'healthy',
        lastCheck: Date.now(),
        issues: [],
        metrics: {}
      }

      // Basic health check
      if (options.deepCheck ?? true) {
        await this.performBasicHealthCheck(plugin, healthStatus)
      }

      // Dependency health check
      if (options.checkDependencies ?? true) {
        await this.checkDependencyHealth(plugin, healthStatus)
      }

      // Performance health check
      if (options.checkPerformance ?? true) {
        await this.checkPerformanceHealth(pluginId, healthStatus)
      }

      // Security health check
      if (options.checkSecurity ?? true) {
        await this.checkSecurityHealth(plugin, healthStatus)
      }

      // Determine overall status
      healthStatus.status = this.determineOverallHealthStatus(healthStatus.issues)

      logger.info(`Health check completed for plugin: ${pluginId}`, { 
        status: healthStatus.status,
        issuesCount: healthStatus.issues.length 
      })

      return healthStatus

    } catch (error) {
      const appError = handlePluginError(`检查插件健康状态 ${pluginId}`, error)
      logger.error('Plugin health check failed', appError)
      
      return {
        status: 'error',
        lastCheck: Date.now(),
        issues: [{
          type: 'system_error',
          severity: 'high',
          message: appError.message,
          suggestedFix: 'Retry health check or contact support'
        }],
        metrics: {}
      }
    }
  }

  /**
   * Validate plugin before installation or operation
   */
  async validatePlugin(
    plugin: PluginCatalogItem | string, 
    options: PluginValidationOptions = {}
  ): Promise<PluginValidationResult> {
    try {
      const pluginId = typeof plugin === 'string' ? plugin : plugin.id
      logger.info(`Validating plugin: ${pluginId}`, { options })

      const result: PluginValidationResult = {
        valid: true,
        message: 'Plugin validation successful',
        warnings: [],
        errors: []
      }

      // Get plugin details if string ID provided
      const pluginDetails = typeof plugin === 'string' ? null : plugin

      // Schema validation
      if (options.validateSchema ?? true) {
        await this.validatePluginSchema(pluginDetails, result)
      }

      // Security validation
      if (options.validateSecurity ?? true) {
        await this.validatePluginSecurity(pluginDetails, result)
      }

      // Dependency validation
      if (options.validateDeps ?? true) {
        await this.validatePluginDependencies(pluginDetails, result)
      }

      // Compatibility validation
      if (options.validateCompatibility ?? true) {
        await this.validatePluginCompatibility(pluginDetails, result)
      }

      // Custom validation rules
      if (options.customRules) {
        await this.applyCustomValidationRules(pluginDetails, options.customRules, result)
      }

      // Determine overall validity
      result.valid = result.errors.length === 0
      if (!result.valid) {
        result.message = `Plugin validation failed with ${result.errors.length} error(s)`
      } else if (result.warnings.length > 0) {
        result.message = `Plugin validation successful with ${result.warnings.length} warning(s)`
      }

      logger.info(`Plugin validation completed for: ${pluginId}`, { 
        valid: result.valid,
        errors: result.errors.length,
        warnings: result.warnings.length 
      })

      return result

    } catch (error) {
      const appError = handlePluginError(`验证插件 ${typeof plugin === 'string' ? plugin : plugin.id}`, error)
      logger.error('Plugin validation failed', appError)
      
      return {
        valid: false,
        message: `Plugin validation failed: ${appError.message}`,
        warnings: [],
        errors: [{
          type: 'validation_error',
          message: appError.message,
          severity: 'high'
        }]
      }
    }
  }

  /**
   * Perform comprehensive health check on all plugins
   */
  async performSystemHealthCheck(): Promise<{
    overall: 'healthy' | 'warning' | 'error'
    plugins: Record<string, PluginHealthStatus>
    summary: {
      total: number
      healthy: number
      warnings: number
      errors: number
    }
  }> {
    try {
      logger.info('Performing system-wide plugin health check')

      const plugins = pluginManager.getPlugins()
      const results: Record<string, PluginHealthStatus> = {}
      
      let healthy = 0
      let warnings = 0
      let errors = 0

      // Check health for each plugin
      for (const plugin of plugins) {
        const health = await this.checkPluginHealth(plugin.id, { deepCheck: true })
        results[plugin.id] = health

        switch (health.status) {
          case 'healthy':
            healthy++
            break
          case 'warning':
            warnings++
            break
          case 'error':
            errors++
            break
        }
      }

      // Determine overall system health
      let overall: 'healthy' | 'warning' | 'error' = 'healthy'
      if (errors > 0) {
        overall = 'error'
      } else if (warnings > 0) {
        overall = 'warning'
      }

      const summary = {
        total: plugins.length,
        healthy,
        warnings,
        errors
      }

      logger.info('System health check completed', { overall, ...summary })

      return { overall, plugins: results, summary }

    } catch (error) {
      const appError = handlePluginError('系统健康检查', error)
      logger.error('System health check failed', appError)
      throw appError
    }
  }

  /**
   * Get plugin health recommendations
   */
  async getHealthRecommendations(pluginId?: string): Promise<Array<{
    pluginId: string
    type: 'fix' | 'optimize' | 'update' | 'disable'
    priority: 'low' | 'medium' | 'high'
    title: string
    description: string
    action: string
  }>> {
    try {
      const recommendations: Array<{
        pluginId: string
        type: 'fix' | 'optimize' | 'update' | 'disable'
        priority: 'low' | 'medium' | 'high'
        title: string
        description: string
        action: string
      }> = []

      if (pluginId) {
        // Get recommendations for specific plugin
        const health = await this.checkPluginHealth(pluginId, { deepCheck: true })
        recommendations.push(...this.analyzePluginHealth(pluginId, health))
      } else {
        // Get recommendations for all plugins
        const plugins = pluginManager.getPlugins()
        for (const plugin of plugins) {
          const health = await this.checkPluginHealth(plugin.id, { deepCheck: false })
          recommendations.push(...this.analyzePluginHealth(plugin.id, health))
        }
      }

      // Sort by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])

    } catch (error) {
      const appError = handlePluginError('获取健康建议', error)
      logger.error('Failed to get health recommendations', appError)
      throw appError
    }
  }

  // Private helper methods
  private async performBasicHealthCheck(plugin: any, healthStatus: PluginHealthStatus): Promise<void> {
    // Check if plugin is responsive
    try {
      if (typeof plugin.search === 'function') {
        // Test search function with empty query
        await Promise.race([
          plugin.search({ query: '' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ])
      }
    } catch (error) {
      healthStatus.issues.push({
        type: 'responsiveness',
        severity: 'medium',
        message: 'Plugin search function is not responsive',
        suggestedFix: 'Check plugin implementation and dependencies'
      })
    }

    // Check plugin metadata
    if (!plugin.metadata || !plugin.metadata.author) {
      healthStatus.issues.push({
        type: 'metadata',
        severity: 'low',
        message: 'Plugin metadata is incomplete',
        suggestedFix: 'Update plugin metadata with author information'
      })
    }

    // Check plugin configuration
    if (!plugin.settings) {
      healthStatus.issues.push({
        type: 'configuration',
        severity: 'low',
        message: 'Plugin settings configuration is missing',
        suggestedFix: 'Add settings configuration to plugin'
      })
    }
  }

  private async checkDependencyHealth(plugin: any, healthStatus: PluginHealthStatus): Promise<void> {
    const dependencies = plugin.metadata?.dependencies || []
    
    for (const dependency of dependencies) {
      try {
        // Check if dependency is available
        const dependencyPlugin = pluginManager.getPlugin(dependency)
        if (!dependencyPlugin) {
          healthStatus.issues.push({
            type: 'dependency',
            severity: 'high',
            message: `Missing dependency: ${dependency}`,
            suggestedFix: `Install the ${dependency} plugin`
          })
        } else if (!dependencyPlugin.enabled) {
          healthStatus.issues.push({
            type: 'dependency',
            severity: 'medium',
            message: `Dependency disabled: ${dependency}`,
            suggestedFix: `Enable the ${dependency} plugin`
          })
        }
      } catch (error) {
        healthStatus.issues.push({
          type: 'dependency',
          severity: 'high',
          message: `Dependency check failed for: ${dependency}`,
          suggestedFix: `Check ${dependency} plugin installation`
        })
      }
    }
  }

  private async checkPerformanceHealth(pluginId: string, healthStatus: PluginHealthStatus): Promise<void> {
    try {
      const metrics = this.stateStore.getPluginMetrics(pluginId)
      
      healthStatus.metrics = {
        avgResponseTime: metrics.avgSearchTime,
        successRate: metrics.successRate,
        errorCount: metrics.errorCount,
        requestCount: metrics.searchCount,
        lastUsed: metrics.lastUsed
      }

      // Check performance thresholds
      if (metrics.avgSearchTime > 2000) {
        healthStatus.issues.push({
          type: 'performance',
          severity: 'medium',
          message: `Slow response time: ${metrics.avgSearchTime}ms`,
          suggestedFix: 'Optimize plugin performance or check system resources'
        })
      }

      if (metrics.successRate < 90 && metrics.searchCount > 10) {
        healthStatus.issues.push({
          type: 'performance',
          severity: 'high',
          message: `Low success rate: ${metrics.successRate.toFixed(1)}%`,
          suggestedFix: 'Check plugin error logs and fix issues'
        })
      }

      if (metrics.errorCount > 50) {
        healthStatus.issues.push({
          type: 'performance',
          severity: 'high',
          message: `High error count: ${metrics.errorCount}`,
          suggestedFix: 'Review error logs and fix recurring issues'
        })
      }

    } catch (error) {
      healthStatus.issues.push({
        type: 'performance',
        severity: 'medium',
        message: 'Unable to retrieve performance metrics',
        suggestedFix: 'Check plugin state management system'
      })
    }
  }

  private async checkSecurityHealth(plugin: any, healthStatus: PluginHealthStatus): Promise<void> {
    // Check for excessive permissions
    const permissions = plugin.permissions || []
    if (permissions.length > 10) {
      healthStatus.issues.push({
        type: 'security',
        severity: 'medium',
        message: `Plugin requests excessive permissions: ${permissions.length}`,
        suggestedFix: 'Review and minimize required permissions'
      })
    }

    // Check for sensitive permissions
    const sensitivePermissions = ['filesystem', 'network', 'system']
    const hasSensitivePermissions = permissions.some(p => 
      sensitivePermissions.some(sensitive => p.toLowerCase().includes(sensitive))
    )
    
    if (hasSensitivePermissions) {
      healthStatus.issues.push({
        type: 'security',
        severity: 'low',
        message: 'Plugin requests sensitive permissions',
        suggestedFix: 'Review plugin security and ensure permissions are necessary'
      })
    }

    // Check plugin source/security signature
    if (!plugin.installation?.isBuiltIn && !plugin.metadata?.license) {
      healthStatus.issues.push({
        type: 'security',
        severity: 'medium',
        message: 'Plugin missing license information',
        suggestedFix: 'Add license information to plugin metadata'
      })
    }
  }

  private determineOverallHealthStatus(issues: PluginHealthStatus['issues']): 'healthy' | 'warning' | 'error' {
    const highSeverityIssues = issues.filter(issue => issue.severity === 'high').length
    const mediumSeverityIssues = issues.filter(issue => issue.severity === 'medium').length

    if (highSeverityIssues > 0) {
      return 'error'
    } else if (mediumSeverityIssues > 0 || issues.length > 3) {
      return 'warning'
    } else {
      return 'healthy'
    }
  }

  private async validatePluginSchema(plugin: PluginCatalogItem | null, result: PluginValidationResult): Promise<void> {
    if (!plugin) {
      result.errors.push({
        type: 'schema',
        message: 'Plugin details not provided for validation',
        severity: 'high'
      })
      return
    }

    // Required fields validation
    const requiredFields = ['id', 'name', 'version', 'description']
    for (const field of requiredFields) {
      if (!plugin[field as keyof PluginCatalogItem]) {
        result.errors.push({
          type: 'schema',
          message: `Missing required field: ${field}`,
          severity: 'high'
        })
      }
    }

    // Version format validation
    if (plugin.version && !/^\d+\.\d+\.\d+/.test(plugin.version)) {
      result.warnings.push({
        type: 'schema',
        message: 'Version should follow semantic versioning (x.y.z)',
        severity: 'low'
      })
    }
  }

  private async validatePluginSecurity(plugin: PluginCatalogItem | null, result: PluginValidationResult): Promise<void> {
    if (!plugin) return

    // Check for potentially malicious plugin IDs
    if (plugin.id.match(/[^a-zA-Z0-9\-_]/)) {
      result.errors.push({
        type: 'security',
        message: 'Plugin ID contains invalid characters',
        severity: 'high'
      })
    }

    // Check file size
    if (plugin.fileSize && plugin.fileSize > 100 * 1024 * 1024) { // 100MB
      result.warnings.push({
        type: 'security',
        message: 'Plugin file size is very large',
        severity: 'medium'
      })
    }
  }

  private async validatePluginDependencies(plugin: PluginCatalogItem | null, result: PluginValidationResult): Promise<void> {
    if (!plugin) return

    const dependencies = plugin.dependencies || []
    
    for (const dependency of dependencies) {
      // Check if dependency format is valid
      if (!dependency.id || !dependency.version) {
        result.errors.push({
          type: 'dependency',
          message: `Invalid dependency format: ${JSON.stringify(dependency)}`,
          severity: 'high'
        })
      }
    }
  }

  private async validatePluginCompatibility(plugin: PluginCatalogItem | null, result: PluginValidationResult): Promise<void> {
    if (!plugin) return

    // Check platform compatibility
    const currentPlatform = process.platform
    if (plugin.platforms && plugin.platforms.length > 0) {
      if (!plugin.platforms.includes(currentPlatform)) {
        result.errors.push({
          type: 'compatibility',
          message: `Plugin not compatible with current platform: ${currentPlatform}`,
          severity: 'high'
        })
      }
    }

    // Check minimum version requirements
    if (plugin.minVersion) {
      // This would compare with current app version
      result.warnings.push({
        type: 'compatibility',
        message: `Plugin requires minimum version: ${plugin.minVersion}`,
        severity: 'low'
      })
    }
  }

  private async applyCustomValidationRules(
    plugin: PluginCatalogItem | null, 
    rules: Array<(plugin: any) => boolean | string>, 
    result: PluginValidationResult
  ): Promise<void> {
    for (const rule of rules) {
      try {
        const ruleResult = rule(plugin)
        if (ruleResult !== true) {
          const message = typeof ruleResult === 'string' ? ruleResult : 'Custom validation failed'
          result.errors.push({
            type: 'custom',
            message,
            severity: 'high'
          })
        }
      } catch (error) {
        result.errors.push({
          type: 'custom',
          message: `Custom validation rule error: ${error}`,
          severity: 'high'
        })
      }
    }
  }

  private analyzePluginHealth(pluginId: string, health: PluginHealthStatus): Array<{
    pluginId: string
    type: 'fix' | 'optimize' | 'update' | 'disable'
    priority: 'low' | 'medium' | 'high'
    title: string
    description: string
    action: string
  }> {
    const recommendations: Array<{
      pluginId: string
      type: 'fix' | 'optimize' | 'update' | 'disable'
      priority: 'low' | 'medium' | 'high'
      title: string
      description: string
      action: string
    }> = []

    for (const issue of health.issues) {
      let type: 'fix' | 'optimize' | 'update' | 'disable' = 'fix'
      let priority: 'low' | 'medium' | 'high' = issue.severity

      switch (issue.type) {
        case 'performance':
          type = 'optimize'
          break
        case 'dependency':
          type = 'fix'
          break
        case 'security':
          type = issue.severity === 'high' ? 'disable' : 'fix'
          break
        case 'responsiveness':
          type = 'fix'
          priority = 'high'
          break
      }

      recommendations.push({
        pluginId,
        type,
        priority,
        title: `${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)} Issue`,
        description: issue.message,
        action: issue.suggestedFix || 'Review plugin configuration'
      })
    }

    return recommendations
  }
}

// Export singleton instance
export const pluginHealthService = new PluginHealthService()