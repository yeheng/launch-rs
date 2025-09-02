/**
 * Plugin health checking and validation functionality
 */

import { handlePluginError } from '../../error-handler'
import { logger } from '../../logger'
import { pluginManager } from '../../search-plugin-manager'
import { usePluginStateStore } from '../plugin-state-manager'
import type { PluginCatalogItem, PluginHealthStatus, PluginValidationResult } from '../types'
import { PluginHealthLevel, PluginIssueType, PluginSecurityIssueType, PluginSecurityLevel } from '../types'
import { PluginErrors } from './errors'
import type { PluginHealthCheckOptions, PluginValidationOptions } from './interfaces'

/**
 * Plugin health and validation service
 */
export class PluginHealthService {
  private stateStore: ReturnType<typeof usePluginStateStore> | null = null

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
        status: PluginHealthLevel.HEALTHY,
        lastCheck: new Date(Date.now()),
        issues: [],
        metrics: {
          avgSearchTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          errorCount: 0,
          successRate: 0
        }
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
        status: PluginHealthLevel.ERROR,
        lastCheck: new Date(Date.now()),
        issues: [{
          type: PluginIssueType.CONFIGURATION,
          severity: 'high',
          message: appError.message,
          suggestedFix: 'Retry health check or contact support'
        }],
        metrics: {
          avgSearchTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          errorCount: 0,
          successRate: 0
        }
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
        isValid: true,
        errors: [],
        warnings: [],
        security: {
          level: PluginSecurityLevel.SAFE,
          issues: [],
          trusted: true
        }
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
      result.isValid = result.errors.length === 0
      if (!result.isValid) {
        result.security.level = PluginSecurityLevel.DANGEROUS
        result.security.trusted = false
      } else if (result.warnings.length > 0) {
        result.security.level = PluginSecurityLevel.LOW_RISK
      }

      logger.info(`Plugin validation completed for: ${pluginId}`, { 
        valid: result.isValid,
        errors: result.errors.length,
        warnings: result.warnings.length,
        securityLevel: result.security.level
      })

      return result

    } catch (error) {
      const appError = handlePluginError(`验证插件 ${typeof plugin === 'string' ? plugin : plugin.id}`, error)
      logger.error('Plugin validation failed', appError)
      
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: appError.message,
          severity: 'error'
        }],
        warnings: [],
        security: {
          level: PluginSecurityLevel.DANGEROUS,
          issues: [{
            type: PluginSecurityIssueType.UNSIGNED_CODE,
            description: 'Validation system error',
            risk: 'high',
            mitigation: 'Retry validation or contact support'
          }],
          trusted: false
        }
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
        type: PluginIssueType.CONFIGURATION,
        severity: 'medium',
        message: 'Plugin search function is not responsive',
        suggestedFix: 'Check plugin implementation and dependencies'
      })
    }

    // Check plugin metadata
    if (!plugin.metadata || !plugin.metadata.author) {
      healthStatus.issues.push({
        type: PluginIssueType.CONFIGURATION,
        severity: 'low',
        message: 'Plugin metadata is incomplete',
        suggestedFix: 'Update plugin metadata with author information'
      })
    }

    // Check plugin configuration
    if (!plugin.settings) {
      healthStatus.issues.push({
        type: PluginIssueType.CONFIGURATION,
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
            type: PluginIssueType.DEPENDENCY,
            severity: 'high',
            message: `Missing dependency: ${dependency}`,
            suggestedFix: `Install the ${dependency} plugin`
          })
        } else if (!dependencyPlugin.enabled) {
          healthStatus.issues.push({
            type: PluginIssueType.DEPENDENCY,
            severity: 'medium',
            message: `Dependency disabled: ${dependency}`,
            suggestedFix: `Enable the ${dependency} plugin`
          })
        }
      } catch (error) {
        healthStatus.issues.push({
          type: PluginIssueType.DEPENDENCY,
          severity: 'high',
          message: `Dependency check failed for: ${dependency}`,
          suggestedFix: `Check ${dependency} plugin installation`
        })
      }
    }
  }

  /**
   * Get state store with lazy loading
   */
  private getStateStore(): ReturnType<typeof usePluginStateStore> | null {
    if (this.stateStore) {
      return this.stateStore
    }
    
    try {
      // 检查 Pinia 是否已经激活
      const { getActivePinia } = require('pinia')
      const pinia = getActivePinia()
      
      if (!pinia) {
        logger.warn('Pinia not yet activated, state store not available')
        return null
      }
      
      this.stateStore = usePluginStateStore()
      return this.stateStore
    } catch (error) {
      const appError = handlePluginError('Failed to initialize state store', error)
      logger.warn('Failed to initialize state store', appError)
      return null
    }
  }

  private async checkPerformanceHealth(pluginId: string, healthStatus: PluginHealthStatus): Promise<void> {
    try {
      const stateStore = this.getStateStore()
      if (!stateStore) {
        healthStatus.issues.push({
          type: PluginIssueType.PERFORMANCE,
          severity: 'medium',
          message: 'Unable to retrieve performance metrics',
          suggestedFix: 'Check plugin state management system'
        })
        return
      }
      
      const metrics = stateStore.getPluginMetrics(pluginId)
      
      healthStatus.metrics = {
        avgSearchTime: metrics.avgSearchTime,
        memoryUsage: 0,
        cpuUsage: 0,
        errorCount: metrics.errorCount,
        successRate: metrics.successRate
      }

      // Check performance thresholds
      if (metrics.avgSearchTime > 2000) {
        healthStatus.issues.push({
          type: PluginIssueType.PERFORMANCE,
          severity: 'medium',
          message: `Slow response time: ${metrics.avgSearchTime}ms`,
          suggestedFix: 'Optimize plugin performance or check system resources'
        })
      }

      if (metrics.successRate < 90 && metrics.searchCount > 10) {
        healthStatus.issues.push({
          type: PluginIssueType.PERFORMANCE,
          severity: 'high',
          message: `Low success rate: ${metrics.successRate.toFixed(1)}%`,
          suggestedFix: 'Check plugin error logs and fix issues'
        })
      }

      if (metrics.errorCount > 50) {
        healthStatus.issues.push({
          type: PluginIssueType.PERFORMANCE,
          severity: 'high',
          message: `High error count: ${metrics.errorCount}`,
          suggestedFix: 'Review error logs and fix recurring issues'
        })
      }

    } catch (error) {
        healthStatus.issues.push({
          type: PluginIssueType.PERFORMANCE,
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
    const hasSensitivePermissions = permissions.some((p: string) => 
      sensitivePermissions.some(sensitive => p.toLowerCase().includes(sensitive))
    )
    
    if (hasSensitivePermissions) {
      healthStatus.issues.push({
        type: PluginIssueType.SECURITY,
        severity: 'medium',
        message: `Plugin requests excessive permissions: ${permissions.length}`,
        suggestedFix: 'Review and minimize required permissions'
      })
    }

    // Check plugin source/security signature
    if (!plugin.installation?.isBuiltIn && !plugin.metadata?.license) {
      healthStatus.issues.push({
        type: PluginIssueType.SECURITY,
        severity: 'low',
        message: 'Plugin requests sensitive permissions',
        suggestedFix: 'Review plugin security and ensure permissions are necessary'
      })
      healthStatus.issues.push({
        type: PluginIssueType.SECURITY,
        severity: 'medium',
        message: 'Plugin missing license information',
        suggestedFix: 'Add license information to plugin metadata'
      })
    }
  }

  private determineOverallHealthStatus(issues: PluginHealthStatus['issues']): PluginHealthLevel {
    const highSeverityIssues = issues.filter(issue => issue.severity === 'high').length
    const mediumSeverityIssues = issues.filter(issue => issue.severity === 'medium').length

    if (highSeverityIssues > 0) {
      return PluginHealthLevel.ERROR
    } else if (mediumSeverityIssues > 0 || issues.length > 3) {
      return PluginHealthLevel.WARNING
    } else {
      return PluginHealthLevel.HEALTHY
    }
  }

  private async validatePluginSchema(plugin: PluginCatalogItem | null, result: PluginValidationResult): Promise<void> {
    if (!plugin) {
        result.errors.push({
          code: 'SCHEMA_VALIDATION_ERROR',
          message: 'Plugin details not provided for validation',
          severity: 'error'
        })
      return
    }

    // Required fields validation
    const requiredFields = ['id', 'name', 'version', 'description']
    for (const field of requiredFields) {
      if (!plugin[field as keyof PluginCatalogItem]) {
        result.errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: `Missing required field: ${field}`,
          severity: 'error'
        })
      }
    }

    // Version format validation
    if (plugin.version && !/^\d+\.\d+\.\d+/.test(plugin.version)) {
      result.warnings.push({
        code: 'INVALID_VERSION_FORMAT',
        message: 'Version should follow semantic versioning (x.y.z)',
        location: 'version'
      })
    }
  }

  private async validatePluginSecurity(plugin: PluginCatalogItem | null, result: PluginValidationResult): Promise<void> {
    if (!plugin) return

    // Check for potentially malicious plugin IDs
    if (plugin.id.match(/[^a-zA-Z0-9\-_]/)) {
      result.errors.push({
        code: 'INVALID_PLUGIN_ID',
        message: 'Plugin ID contains invalid characters',
        severity: 'error'
      })
    }

    // Check file size
    if (plugin.fileSize && plugin.fileSize > 100 * 1024 * 1024) { // 100MB
      result.warnings.push({
        code: 'LARGE_FILE_SIZE',
        message: 'Plugin file size is very large',
        location: 'fileSize'
      })
    }
  }

  private async validatePluginDependencies(plugin: PluginCatalogItem | null, result: PluginValidationResult): Promise<void> {
    if (!plugin) return

    // For now, assume no dependencies since the field doesn't exist in PluginCatalogItem
    // This can be updated when dependencies are added to the catalog item structure
    // PluginCatalogItem doesn't have a metadata field, so we skip dependency validation for now
  }

  private async validatePluginCompatibility(plugin: PluginCatalogItem | null, result: PluginValidationResult): Promise<void> {
    if (!plugin) return

    // Check minimum version requirements
    if (plugin.minAppVersion) {
      result.warnings.push({
        code: 'MIN_VERSION_REQUIREMENT',
        message: `Plugin requires minimum app version: ${plugin.minAppVersion}`,
        location: 'minAppVersion'
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
          code: 'CUSTOM_VALIDATION_ERROR',
          message,
          severity: 'error'
        })
        }
      } catch (error) {
        result.errors.push({
          code: 'CUSTOM_VALIDATION_RULE_ERROR',
          message: `Custom validation rule error: ${error}`,
          severity: 'error'
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
      let priority: 'low' | 'medium' | 'high' = issue.severity === 'critical' ? 'high' : issue.severity

      switch (issue.type) {
        case PluginIssueType.PERFORMANCE:
          type = 'optimize'
          break
        case PluginIssueType.DEPENDENCY:
          type = 'fix'
          break
        case PluginIssueType.SECURITY:
          type = issue.severity === 'high' ? 'disable' : 'fix'
          break
        case PluginIssueType.CONFIGURATION:
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
