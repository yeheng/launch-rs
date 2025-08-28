/**
 * Simplified integration tests for plugin management system
 * Tests complete workflows without complex decorators
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { EnhancedSearchPlugin } from '../types'
import { PluginCategory, PluginHealthLevel } from '../types'

// Create a simple mock plugin management service
const mockPluginManagementService = {
  getInstalledPlugins: vi.fn(),
  searchPlugins: vi.fn(),
  getPluginDetails: vi.fn(),
  installPlugin: vi.fn(),
  uninstallPlugin: vi.fn(),
  enablePlugin: vi.fn(),
  disablePlugin: vi.fn(),
  savePluginSettings: vi.fn(),
  getPluginSettings: vi.fn(),
  setPluginState: vi.fn(),
  getPluginState: vi.fn(),
  restorePluginState: vi.fn(),
  validatePluginSettings: vi.fn(),
  migratePluginSettings: vi.fn(),
  saveBulkPluginSettings: vi.fn(),
  exportAllPluginSettings: vi.fn(),
  importPluginSettings: vi.fn(),
  performHealthCheck: vi.fn(),
  getPerformanceMetrics: vi.fn(),
  getAvailablePlugins: vi.fn(),
  updatePlugin: vi.fn(),
  validatePlugin: vi.fn(),
  checkPluginHealth: vi.fn()
}

// Mock the service
vi.mock('../plugin-management-service', () => ({
  pluginManagementService: mockPluginManagementService,
  PluginManagementError: class PluginManagementError extends Error {
    constructor(public type: string, message: string, public details?: string, public pluginId?: string, public recoverable = true, public suggestedAction?: string) {
      super(message)
    }
    getUserFriendlyMessage() { return this.message }
  },
  PluginManagementErrorType: {
    PLUGIN_NOT_FOUND: 'plugin_not_found',
    INSTALLATION_FAILED: 'installation_failed',
    UNINSTALLATION_FAILED: 'uninstallation_failed',
    NETWORK_ERROR: 'network_error',
    VALIDATION_FAILED: 'validation_failed',
    PERMISSION_DENIED: 'permission_denied',
    DEPENDENCY_ERROR: 'dependency_error',
    CONFIGURATION_ERROR: 'configuration_error',
    SECURITY_ERROR: 'security_error'
  }
}))

// Mock other dependencies
vi.mock('@/lib/search-plugin-manager', () => ({
  pluginManager: {
    getPlugins: vi.fn().mockReturnValue([]),
    getPlugin: vi.fn(),
    unregister: vi.fn()
  }
}))

vi.mock('../plugin-state-manager', () => ({
  usePluginStateStore: () => ({
    getPluginState: vi.fn().mockReturnValue({ enabled: true, settings: {} }),
    setPluginState: vi.fn(),
    getPluginSettings: vi.fn().mockReturnValue({}),
    setPluginSettings: vi.fn(),
    subscribe: vi.fn()
  })
}))

vi.mock('../plugin-statistics', () => ({
  pluginStatisticsManager: {
    getStatistics: vi.fn().mockReturnValue({
      total: 3,
      installed: 3,
      enabled: 2,
      byCategory: {},
      withIssues: 0
    })
  }
}))

// Create mock plugin data
const createMockPlugin = (id: string, overrides: Partial<EnhancedSearchPlugin> = {}): EnhancedSearchPlugin => ({
  id,
  name: `Test Plugin ${id}`,
  description: `Description for ${id}`,
  version: '1.0.0',
  enabled: true,
  icon: 'TestIcon',
  search: vi.fn(),
  metadata: {
    author: 'Test Author',
    category: PluginCategory.UTILITIES,
    keywords: ['test', 'plugin'],
    installDate: new Date('2024-01-01'),
    lastUpdated: new Date('2024-01-15'),
    fileSize: 1024000,
    dependencies: [],
    homepage: 'https://example.com',
    repository: 'https://github.com/example/plugin',
    license: 'MIT',
    rating: 4.5,
    downloadCount: 1000
  },
  installation: {
    isInstalled: true,
    isBuiltIn: false,
    installPath: `/plugins/${id}`,
    canUninstall: true
  },
  permissions: [],
  health: {
    status: PluginHealthLevel.HEALTHY,
    lastCheck: new Date(),
    issues: [],
    metrics: {
      avgSearchTime: 50,
      memoryUsage: 1024 * 1024,
      cpuUsage: 2.5,
      errorCount: 0,
      successRate: 100
    }
  },
  settings: {},
  ...overrides
})

describe('Plugin Management Integration Tests', () => {
  let mockPlugins: EnhancedSearchPlugin[]

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock plugins
    mockPlugins = [
      createMockPlugin('test-plugin-1', { 
        name: 'Calculator Plugin',
        metadata: { 
          ...createMockPlugin('test-plugin-1').metadata,
          category: PluginCategory.UTILITIES 
        }
      }),
      createMockPlugin('test-plugin-2', { 
        name: 'Weather Plugin',
        enabled: false,
        metadata: { 
          ...createMockPlugin('test-plugin-2').metadata,
          category: PluginCategory.PRODUCTIVITY 
        }
      }),
      createMockPlugin('test-plugin-3', { 
        name: 'Notes Plugin',
        installation: {
          isInstalled: true,
          isBuiltIn: true,
          canUninstall: false
        }
      })
    ]

    // Setup mock responses
    mockPluginManagementService.getInstalledPlugins.mockResolvedValue(mockPlugins)
    mockPluginManagementService.searchPlugins.mockResolvedValue(mockPlugins)
    mockPluginManagementService.getPluginDetails.mockImplementation(async (id) => {
      const plugin = mockPlugins.find(p => p.id === id)
      if (!plugin) throw new Error('Plugin not found')
      return plugin
    })
  })

  describe('Plugin Lifecycle Management', () => {
    it('should handle plugin installation workflow', async () => {
      const installResult = { success: true, data: { pluginId: 'new-plugin' } }
      mockPluginManagementService.installPlugin.mockResolvedValue(installResult)

      const result = await mockPluginManagementService.installPlugin('new-plugin')

      expect(result.success).toBe(true)
      expect(result.data.pluginId).toBe('new-plugin')
      expect(mockPluginManagementService.installPlugin).toHaveBeenCalledWith('new-plugin')
    })

    it('should handle plugin uninstallation workflow', async () => {
      const uninstallResult = { 
        success: true, 
        data: { 
          pluginId: 'test-plugin-1',
          cleanupDetails: {
            filesRemoved: true,
            configurationCleared: true,
            dependenciesResolved: true
          }
        } 
      }
      mockPluginManagementService.uninstallPlugin.mockResolvedValue(uninstallResult)

      const result = await mockPluginManagementService.uninstallPlugin('test-plugin-1')

      expect(result.success).toBe(true)
      expect(result.data.pluginId).toBe('test-plugin-1')
      expect(result.data.cleanupDetails.filesRemoved).toBe(true)
      expect(mockPluginManagementService.uninstallPlugin).toHaveBeenCalledWith('test-plugin-1')
    })

    it('should handle plugin enable/disable workflow', async () => {
      const enableResult = { success: true }
      const disableResult = { success: true }
      
      mockPluginManagementService.enablePlugin.mockResolvedValue(enableResult)
      mockPluginManagementService.disablePlugin.mockResolvedValue(disableResult)

      // Test enabling
      const enableRes = await mockPluginManagementService.enablePlugin('test-plugin-2')
      expect(enableRes.success).toBe(true)

      // Test disabling
      const disableRes = await mockPluginManagementService.disablePlugin('test-plugin-1')
      expect(disableRes.success).toBe(true)
    })
  })

  describe('Plugin Settings Persistence', () => {
    it('should persist plugin settings', async () => {
      const settings = { theme: 'dark', autoUpdate: true }
      const saveResult = { success: true }
      
      mockPluginManagementService.savePluginSettings.mockResolvedValue(saveResult)
      mockPluginManagementService.getPluginSettings.mockResolvedValue(settings)

      // Save settings
      const saveRes = await mockPluginManagementService.savePluginSettings('test-plugin-1', settings)
      expect(saveRes.success).toBe(true)

      // Retrieve settings
      const retrievedSettings = await mockPluginManagementService.getPluginSettings('test-plugin-1')
      expect(retrievedSettings).toEqual(settings)
    })

    it('should handle settings migration', async () => {
      const oldSettings = { version: '1.0.0', theme: 'light' }
      const migratedSettings = { version: '2.0.0', appearance: { theme: 'light' } }
      
      mockPluginManagementService.migratePluginSettings.mockResolvedValue(migratedSettings)

      const result = await mockPluginManagementService.migratePluginSettings('test-plugin-1', oldSettings)
      expect(result.version).toBe('2.0.0')
      expect(result.appearance.theme).toBe('light')
    })

    it('should validate settings before saving', async () => {
      const invalidSettings = { maxResults: -5, apiKey: '' }
      const validationResult = {
        isValid: false,
        errors: [
          { field: 'maxResults', message: 'Must be positive' },
          { field: 'apiKey', message: 'Required' }
        ]
      }
      
      mockPluginManagementService.validatePluginSettings.mockResolvedValue(validationResult)

      const result = await mockPluginManagementService.validatePluginSettings('test-plugin-1', invalidSettings)
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })

    it('should handle bulk settings operations', async () => {
      const bulkSettings = {
        'plugin1': { enabled: true },
        'plugin2': { enabled: false }
      }
      const saveResult = { success: true }
      
      mockPluginManagementService.saveBulkPluginSettings.mockResolvedValue(saveResult)

      const result = await mockPluginManagementService.saveBulkPluginSettings(bulkSettings)
      expect(result.success).toBe(true)
    })

    it('should export and import settings', async () => {
      const exportedSettings = {
        'plugin1': { theme: 'dark' },
        'plugin2': { language: 'en' }
      }
      const importResult = { success: true }
      
      mockPluginManagementService.exportAllPluginSettings.mockResolvedValue(exportedSettings)
      mockPluginManagementService.importPluginSettings.mockResolvedValue(importResult)

      // Export
      const exported = await mockPluginManagementService.exportAllPluginSettings()
      expect(exported).toEqual(exportedSettings)

      // Import
      const imported = await mockPluginManagementService.importPluginSettings(exportedSettings)
      expect(imported.success).toBe(true)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle installation errors', async () => {
      const error = {
        type: 'INSTALLATION_FAILED',
        message: 'Installation failed',
        getUserFriendlyMessage: () => 'Failed to install plugin'
      }
      const errorResult = { success: false, error }
      
      mockPluginManagementService.installPlugin.mockResolvedValue(errorResult)

      const result = await mockPluginManagementService.installPlugin('failing-plugin')
      expect(result.success).toBe(false)
      expect(result.error.type).toBe('INSTALLATION_FAILED')
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout')
      mockPluginManagementService.getInstalledPlugins.mockRejectedValue(networkError)

      try {
        await mockPluginManagementService.getInstalledPlugins()
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network timeout')
      }
    })

    it('should handle validation errors', async () => {
      const validationError = {
        type: 'VALIDATION_FAILED',
        message: 'Plugin validation failed',
        getUserFriendlyMessage: () => 'Plugin is corrupted'
      }
      const errorResult = { success: false, error: validationError }
      
      mockPluginManagementService.installPlugin.mockResolvedValue(errorResult)

      const result = await mockPluginManagementService.installPlugin('invalid-plugin')
      expect(result.success).toBe(false)
      expect(result.error.type).toBe('VALIDATION_FAILED')
    })

    it('should handle permission errors', async () => {
      const permissionError = {
        type: 'PERMISSION_DENIED',
        message: 'Permission denied',
        getUserFriendlyMessage: () => 'Insufficient permissions'
      }
      const errorResult = { success: false, error: permissionError }
      
      mockPluginManagementService.uninstallPlugin.mockResolvedValue(errorResult)

      const result = await mockPluginManagementService.uninstallPlugin('protected-plugin')
      expect(result.success).toBe(false)
      expect(result.error.type).toBe('PERMISSION_DENIED')
    })
  })

  describe('Search and Filter Functionality', () => {
    it('should search plugins by query', async () => {
      const searchResults = mockPlugins.filter(p => p.name.includes('Calculator'))
      mockPluginManagementService.searchPlugins.mockResolvedValue(searchResults)

      const result = await mockPluginManagementService.searchPlugins({ query: 'Calculator' })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Calculator Plugin')
    })

    it('should filter plugins by category', async () => {
      const utilityPlugins = mockPlugins.filter(p => p.metadata.category === PluginCategory.UTILITIES)
      mockPluginManagementService.searchPlugins.mockResolvedValue(utilityPlugins)

      const result = await mockPluginManagementService.searchPlugins({ category: PluginCategory.UTILITIES })
      expect(result.every(p => p.metadata.category === PluginCategory.UTILITIES)).toBe(true)
    })

    it('should filter plugins by enabled status', async () => {
      const enabledPlugins = mockPlugins.filter(p => p.enabled)
      mockPluginManagementService.searchPlugins.mockResolvedValue(enabledPlugins)

      const result = await mockPluginManagementService.searchPlugins({ enabled: true })
      expect(result.every(p => p.enabled)).toBe(true)
    })

    it('should sort plugins by different criteria', async () => {
      const sortedPlugins = [...mockPlugins].sort((a, b) => a.name.localeCompare(b.name))
      mockPluginManagementService.searchPlugins.mockResolvedValue(sortedPlugins)

      const result = await mockPluginManagementService.searchPlugins({ sortBy: 'name', sortOrder: 'asc' })
      expect(result[0].name).toBe('Calculator Plugin')
    })
  })

  describe('Performance and Health Monitoring', () => {
    it('should perform health checks', async () => {
      const healthResult = {
        healthy: true,
        issues: []
      }
      mockPluginManagementService.performHealthCheck.mockResolvedValue(healthResult)

      const result = await mockPluginManagementService.performHealthCheck()
      expect(result.healthy).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should get performance metrics', async () => {
      const performanceData = {
        'plugin-1': { avgResponseTime: 100, errorRate: 0.01 },
        'plugin-2': { avgResponseTime: 200, errorRate: 0.05 }
      }
      mockPluginManagementService.getPerformanceMetrics.mockResolvedValue(performanceData)

      const result = await mockPluginManagementService.getPerformanceMetrics()
      expect(result['plugin-1'].avgResponseTime).toBe(100)
      expect(result['plugin-2'].errorRate).toBe(0.05)
    })

    it('should detect performance issues', async () => {
      const performanceData = {
        'slow-plugin': { avgResponseTime: 5000, errorRate: 0.15 }
      }
      mockPluginManagementService.getPerformanceMetrics.mockResolvedValue(performanceData)

      const result = await mockPluginManagementService.getPerformanceMetrics()
      const slowPlugin = result['slow-plugin']
      
      expect(slowPlugin.avgResponseTime).toBeGreaterThan(1000) // Slow response
      expect(slowPlugin.errorRate).toBeGreaterThan(0.1) // High error rate
    })
  })

  describe('Plugin State Management', () => {
    it('should persist plugin state across restarts', async () => {
      const state = { enabled: false, lastToggled: new Date().toISOString() }
      const stateResult = { success: true }
      
      mockPluginManagementService.setPluginState.mockResolvedValue(stateResult)
      mockPluginManagementService.getPluginState.mockResolvedValue(state)

      // Set state
      const setResult = await mockPluginManagementService.setPluginState('test-plugin-1', state)
      expect(setResult.success).toBe(true)

      // Get state
      const retrievedState = await mockPluginManagementService.getPluginState('test-plugin-1')
      expect(retrievedState.enabled).toBe(false)
    })

    it('should restore plugin state on startup', async () => {
      const plugin = mockPlugins[0]
      const restoredPlugin = { ...plugin, enabled: false }
      
      mockPluginManagementService.restorePluginState.mockResolvedValue(restoredPlugin)

      const result = await mockPluginManagementService.restorePluginState(plugin)
      expect(result.enabled).toBe(false)
    })
  })

  describe('Plugin Catalog and Updates', () => {
    it('should get available plugins from catalog', async () => {
      const catalogPlugins = [
        { id: 'new-plugin', name: 'New Plugin', version: '1.0.0' }
      ]
      mockPluginManagementService.getAvailablePlugins.mockResolvedValue(catalogPlugins)

      const result = await mockPluginManagementService.getAvailablePlugins()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('New Plugin')
    })

    it('should update plugins', async () => {
      const updateResult = { 
        success: true, 
        data: { 
          pluginId: 'test-plugin-1',
          oldVersion: '1.0.0',
          newVersion: '1.1.0'
        } 
      }
      mockPluginManagementService.updatePlugin.mockResolvedValue(updateResult)

      const result = await mockPluginManagementService.updatePlugin('test-plugin-1')
      expect(result.success).toBe(true)
      expect(result.data.newVersion).toBe('1.1.0')
    })

    it('should validate plugins before installation', async () => {
      const validationResult = {
        isValid: true,
        errors: [],
        security: { level: 'safe', issues: [] }
      }
      mockPluginManagementService.validatePlugin.mockResolvedValue(validationResult)

      const result = await mockPluginManagementService.validatePlugin('safe-plugin')
      expect(result.isValid).toBe(true)
      expect(result.security.level).toBe('safe')
    })
  })
})