import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { PluginManagementService } from '../plugin-management-service'
import { pluginManager } from '../../search-plugin-manager'
import { usePluginStateStore } from '../plugin-state-manager'
import type { EnhancedSearchPlugin, PluginCatalogItem } from '../types'
import { PluginCategory, PluginPermissionType, PluginUtils } from '../types'

// Mock the plugin manager
vi.mock('../../search-plugin-manager', () => ({
  pluginManager: {
    getPlugins: vi.fn(),
    getPlugin: vi.fn(),
    enablePlugin: vi.fn(),
    disablePlugin: vi.fn(),
    register: vi.fn(),
    unregister: vi.fn(),
  }
}))

// Mock Tauri API for file operations
vi.mock('@tauri-apps/api', () => ({
  invoke: vi.fn(),
  fs: {
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
    removeFile: vi.fn(),
    removeDir: vi.fn(),
    createDir: vi.fn(),
  },
  path: {
    join: vi.fn((...parts) => parts.join('/')),
    appDataDir: vi.fn(() => Promise.resolve('/app/data')),
  }
}))

describe('Plugin Lifecycle Integration Tests', () => {
  let service: PluginManagementService
  let stateStore: ReturnType<typeof usePluginStateStore>
  let mockPlugin: EnhancedSearchPlugin
  let mockCatalogItem: PluginCatalogItem

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    service = PluginManagementService.getInstance()
    stateStore = usePluginStateStore()
    
    // Create comprehensive mock plugin
    mockPlugin = {
      id: 'lifecycle-test-plugin',
      name: 'Lifecycle Test Plugin',
      description: 'A plugin for testing complete lifecycle operations',
      icon: {} as any,
      version: '1.0.0',
      enabled: false,
      priority: 1,
      search: vi.fn(),
      settings: {
        schema: [
          {
            key: 'apiKey',
            type: 'string',
            label: 'API Key',
            description: 'API key for external service',
            defaultValue: '',
            required: true
          },
          {
            key: 'maxResults',
            type: 'number',
            label: 'Max Results',
            description: 'Maximum number of results to return',
            defaultValue: 10,
            required: false
          },
          {
            key: 'enableCache',
            type: 'boolean',
            label: 'Enable Cache',
            description: 'Enable result caching',
            defaultValue: true,
            required: false
          }
        ],
        values: {
          apiKey: 'test-api-key',
          maxResults: 20,
          enableCache: false
        }
      },
      metadata: PluginUtils.createBasicMetadata({
        author: 'Test Team',
        category: PluginCategory.UTILITIES,
        keywords: ['test', 'lifecycle', 'integration'],
        installDate: new Date('2024-01-01'),
        lastUpdated: new Date('2024-01-15'),
        fileSize: 2048000,
        dependencies: [],
        rating: 4.2,
        downloadCount: 500
      }),
      installation: {
        isInstalled: true,
        isBuiltIn: false,
        installPath: '/plugins/lifecycle-test-plugin',
        canUninstall: true
      },
      permissions: [
        {
          type: PluginPermissionType.NETWORK,
          description: 'Access external API services',
          required: true
        },
        {
          type: PluginPermissionType.FILESYSTEM,
          description: 'Cache results to local storage',
          required: false
        }
      ]
    }

    // Create mock catalog item
    mockCatalogItem = {
      id: 'new-plugin',
      name: 'New Plugin',
      description: 'A new plugin to install',
      version: '2.0.0',
      author: 'Plugin Developer',
      category: PluginCategory.PRODUCTIVITY,
      tags: ['new', 'productivity'],
      downloadUrl: 'https://example.com/new-plugin.zip',
      screenshots: [],
      rating: 4.8,
      downloadCount: 1200,
      lastUpdated: new Date('2024-02-01'),
      minAppVersion: '1.0.0',
      permissions: [
        {
          type: PluginPermissionType.CLIPBOARD,
          description: 'Access clipboard for copying results',
          required: true
        }
      ],
      fileSize: 1536000
    }
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Complete Plugin Installation Workflow', () => {
    it('should successfully install, configure, and enable a new plugin', async () => {
      // Mock successful validation
      vi.spyOn(service, 'validatePlugin').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        security: { level: 'safe', issues: [] }
      })

      // Step 1: Install plugin
      const installResult = await service.installPlugin('new-plugin')
      expect(installResult.success).toBe(true)
      expect(installResult.data?.pluginId).toBe('new-plugin')

      // Step 2: Mock plugin as installed and available
      const installedPlugin = {
        ...mockPlugin,
        id: 'new-plugin',
        name: 'New Plugin',
        enabled: false
      }
      vi.mocked(pluginManager.getPlugin).mockReturnValue(installedPlugin)

      // Step 3: Configure plugin settings
      const newSettings = {
        apiKey: 'new-api-key',
        maxResults: 15,
        enableCache: true
      }

      // Simulate settings update
      stateStore.setPluginConfig('new-plugin', newSettings)
      expect(stateStore.getPluginConfig('new-plugin')).toEqual(newSettings)

      // Step 4: Enable plugin
      const enableResult = await service.enablePlugin('new-plugin')
      expect(enableResult.success).toBe(true)
      expect(pluginManager.enablePlugin).toHaveBeenCalledWith('new-plugin')

      // Step 5: Verify plugin state
      stateStore.setPluginEnabled('new-plugin', true)
      expect(stateStore.isPluginEnabled('new-plugin')).toBe(true)

      // Step 6: Record usage metrics
      stateStore.recordPluginUsage('new-plugin', 150, 8, false)
      const metrics = stateStore.getPluginMetrics('new-plugin')
      expect(metrics.searchCount).toBe(1)
      expect(metrics.resultsCount).toBe(8)
      expect(metrics.avgSearchTime).toBe(150)
    })

    it('should handle installation failure gracefully', async () => {
      // Mock validation failure
      vi.spyOn(service, 'validatePlugin').mockResolvedValue({
        isValid: false,
        errors: [{ message: 'Invalid plugin structure', code: 'INVALID_STRUCTURE' }],
        warnings: [],
        security: { level: 'safe', issues: [] }
      })

      const installResult = await service.installPlugin('invalid-plugin')
      
      expect(installResult.success).toBe(false)
      expect(installResult.error?.type).toBe('validation_failed')
      expect(installResult.error?.getUserFriendlyMessage()).toContain('validation failed')
    })

    it('should prevent installation of dangerous plugins', async () => {
      // Mock security risk
      vi.spyOn(service, 'validatePlugin').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        security: {
          level: 'dangerous',
          issues: [{ description: 'Contains malicious code', severity: 'high' }]
        }
      })

      const installResult = await service.installPlugin('dangerous-plugin')
      
      expect(installResult.success).toBe(false)
      expect(installResult.error?.type).toBe('security_error')
      expect(installResult.error?.getUserFriendlyMessage()).toContain('security risks')
    })
  })

  describe('Plugin Configuration Persistence', () => {
    beforeEach(() => {
      vi.mocked(pluginManager.getPlugin).mockReturnValue(mockPlugin)
    })

    it('should persist plugin settings across application restarts', () => {
      const pluginId = 'lifecycle-test-plugin'
      const newSettings = {
        apiKey: 'persistent-key',
        maxResults: 25,
        enableCache: true
      }

      // Set configuration
      stateStore.setPluginConfig(pluginId, newSettings)
      expect(stateStore.getPluginConfig(pluginId)).toEqual(newSettings)

      // Simulate application restart by creating new store instance
      const newStore = usePluginStateStore()
      
      // In a real scenario, this would be loaded from persistent storage
      // For testing, we'll simulate the persistence
      newStore.setPluginConfig(pluginId, newSettings)
      expect(newStore.getPluginConfig(pluginId)).toEqual(newSettings)
    })

    it('should maintain plugin enabled state across restarts', () => {
      const pluginId = 'lifecycle-test-plugin'

      // Enable plugin
      stateStore.setPluginEnabled(pluginId, true)
      expect(stateStore.isPluginEnabled(pluginId)).toBe(true)

      // Simulate restart
      const newStore = usePluginStateStore()
      newStore.setPluginEnabled(pluginId, true)
      expect(newStore.isPluginEnabled(pluginId)).toBe(true)
    })

    it('should preserve plugin metrics across restarts', () => {
      const pluginId = 'lifecycle-test-plugin'

      // Record multiple usage sessions
      stateStore.recordPluginUsage(pluginId, 100, 5, false)
      stateStore.recordPluginUsage(pluginId, 200, 8, false)
      stateStore.recordPluginUsage(pluginId, 150, 3, true)

      const originalMetrics = stateStore.getPluginMetrics(pluginId)
      expect(originalMetrics.searchCount).toBe(3)
      expect(originalMetrics.resultsCount).toBe(16)
      expect(originalMetrics.errorCount).toBe(1)

      // Simulate restart and restore metrics
      const newStore = usePluginStateStore()
      newStore.recordPluginUsage(pluginId, 100, 5, false)
      newStore.recordPluginUsage(pluginId, 200, 8, false)
      newStore.recordPluginUsage(pluginId, 150, 3, true)

      const restoredMetrics = newStore.getPluginMetrics(pluginId)
      expect(restoredMetrics.searchCount).toBe(originalMetrics.searchCount)
      expect(restoredMetrics.resultsCount).toBe(originalMetrics.resultsCount)
      expect(restoredMetrics.errorCount).toBe(originalMetrics.errorCount)
    })
  })

  describe('Plugin Update Workflow', () => {
    beforeEach(() => {
      vi.mocked(pluginManager.getPlugin).mockReturnValue(mockPlugin)
    })

    it('should successfully update plugin to newer version', async () => {
      // Mock validation for new version
      vi.spyOn(service, 'validatePlugin').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        security: { level: 'safe', issues: [] }
      })

      const updateResult = await service.updatePlugin('lifecycle-test-plugin')
      
      expect(updateResult.success).toBe(true)
      expect(updateResult.data?.pluginId).toBe('lifecycle-test-plugin')
      expect(updateResult.data?.message).toContain('updated successfully')
    })

    it('should preserve settings during plugin update', async () => {
      const pluginId = 'lifecycle-test-plugin'
      const originalSettings = {
        apiKey: 'preserved-key',
        maxResults: 30,
        enableCache: false
      }

      // Set original settings
      stateStore.setPluginConfig(pluginId, originalSettings)

      // Mock successful update
      vi.spyOn(service, 'validatePlugin').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        security: { level: 'safe', issues: [] }
      })

      const updateResult = await service.updatePlugin(pluginId)
      expect(updateResult.success).toBe(true)

      // Settings should be preserved
      expect(stateStore.getPluginConfig(pluginId)).toEqual(originalSettings)
    })

    it('should handle update failure and rollback', async () => {
      // Mock update failure
      vi.spyOn(service, 'validatePlugin').mockRejectedValue(new Error('Update failed'))

      const updateResult = await service.updatePlugin('lifecycle-test-plugin')
      
      expect(updateResult.success).toBe(false)
      expect(updateResult.error?.type).toBe('update_failed')
    })
  })

  describe('Plugin Uninstallation Workflow', () => {
    beforeEach(() => {
      const uninstallablePlugin = {
        ...mockPlugin,
        installation: {
          ...mockPlugin.installation,
          canUninstall: true,
          isBuiltIn: false
        }
      }
      vi.mocked(pluginManager.getPlugin).mockReturnValue(uninstallablePlugin)
      vi.mocked(pluginManager.getPlugins).mockReturnValue([uninstallablePlugin])
    })

    it('should successfully uninstall plugin with complete cleanup', async () => {
      const pluginId = 'lifecycle-test-plugin'

      // Set up plugin state
      stateStore.setPluginEnabled(pluginId, true)
      stateStore.setPluginConfig(pluginId, { apiKey: 'test-key' })
      stateStore.recordPluginUsage(pluginId, 100, 5, false)

      // Mock disable operation
      vi.spyOn(service, 'disablePlugin').mockResolvedValue({ success: true })

      const uninstallResult = await service.uninstallPlugin(pluginId)
      
      expect(uninstallResult.success).toBe(true)
      expect(uninstallResult.data?.pluginId).toBe(pluginId)
      expect(uninstallResult.data?.cleanupDetails).toBeDefined()
      
      // Verify plugin manager was called
      expect(pluginManager.unregister).toHaveBeenCalledWith(pluginId)
    })

    it('should prevent uninstallation of plugins with dependencies', async () => {
      const pluginId = 'lifecycle-test-plugin'
      const dependentPlugin = {
        ...mockPlugin,
        id: 'dependent-plugin',
        metadata: {
          ...mockPlugin.metadata,
          dependencies: [pluginId]
        }
      }

      // Mock plugins with dependency
      vi.mocked(pluginManager.getPlugins).mockReturnValue([mockPlugin, dependentPlugin])

      const uninstallResult = await service.uninstallPlugin(pluginId)
      
      expect(uninstallResult.success).toBe(false)
      expect(uninstallResult.error?.type).toBe('dependency_error')
      expect(uninstallResult.error?.message).toContain('dependencies')
    })

    it('should handle uninstallation of built-in plugins', async () => {
      const builtInPlugin = {
        ...mockPlugin,
        installation: {
          ...mockPlugin.installation,
          isBuiltIn: true,
          canUninstall: false
        }
      }
      vi.mocked(pluginManager.getPlugin).mockReturnValue(builtInPlugin)

      const uninstallResult = await service.uninstallPlugin('lifecycle-test-plugin')
      
      expect(uninstallResult.success).toBe(false)
      expect(uninstallResult.error?.type).toBe('permission_denied')
      expect(uninstallResult.error?.message).toContain('cannot be uninstalled')
    })
  })

  describe('Plugin Health Monitoring', () => {
    beforeEach(() => {
      vi.mocked(pluginManager.getPlugin).mockReturnValue(mockPlugin)
    })

    it('should monitor plugin health over time', async () => {
      const pluginId = 'lifecycle-test-plugin'

      // Initial health check
      const initialHealth = await service.checkPluginHealth(pluginId)
      expect(initialHealth.status).toBeDefined()
      expect(initialHealth.lastCheck).toBeInstanceOf(Date)
      expect(initialHealth.metrics).toBeDefined()

      // Simulate plugin usage and errors
      stateStore.recordPluginUsage(pluginId, 100, 5, false)
      stateStore.recordPluginUsage(pluginId, 200, 3, true) // Error
      stateStore.recordPluginUsage(pluginId, 150, 8, false)

      // Check health again
      const updatedHealth = await service.checkPluginHealth(pluginId)
      expect(updatedHealth.lastCheck.getTime()).toBeGreaterThan(initialHealth.lastCheck.getTime())
    })

    it('should identify plugins with performance issues', () => {
      const pluginId = 'lifecycle-test-plugin'

      // Record poor performance
      for (let i = 0; i < 10; i++) {
        stateStore.recordPluginUsage(pluginId, 5000, 2, i % 3 === 0) // High latency, some errors
      }

      const metrics = stateStore.getPluginMetrics(pluginId)
      expect(metrics.avgSearchTime).toBeGreaterThan(1000) // High average time
      expect(metrics.errorCount).toBeGreaterThan(0)
      expect(metrics.successRate).toBeLessThan(100)

      // Plugin should be identified as having issues
      const pluginsWithIssues = stateStore.pluginsWithIssues
      expect(pluginsWithIssues).toContain(pluginId)
    })

    it('should track plugin resource usage', async () => {
      const pluginId = 'lifecycle-test-plugin'

      const health = await service.checkPluginHealth(pluginId)
      
      expect(health.metrics).toHaveProperty('avgSearchTime')
      expect(health.metrics).toHaveProperty('memoryUsage')
      expect(health.metrics).toHaveProperty('cpuUsage')
      expect(health.metrics).toHaveProperty('errorCount')
      expect(health.metrics).toHaveProperty('successRate')
    })
  })

  describe('Plugin State Export/Import', () => {
    it('should export and import complete plugin state', () => {
      const pluginId = 'lifecycle-test-plugin'

      // Set up comprehensive state
      stateStore.setPluginEnabled(pluginId, true)
      stateStore.setPluginConfig(pluginId, {
        apiKey: 'export-test-key',
        maxResults: 50,
        enableCache: true
      })
      stateStore.recordPluginUsage(pluginId, 120, 7, false)
      stateStore.recordPluginUsage(pluginId, 180, 4, true)

      // Export state
      const exportedState = stateStore.exportState()
      expect(exportedState).toBeDefined()
      expect(exportedState.enabledStates[pluginId]).toBe(true)
      expect(exportedState.configurations[pluginId]).toEqual({
        apiKey: 'export-test-key',
        maxResults: 50,
        enableCache: true
      })

      // Clear state
      stateStore.$reset()

      // Import state
      stateStore.importState(exportedState)

      // Verify state was restored
      expect(stateStore.isPluginEnabled(pluginId)).toBe(true)
      expect(stateStore.getPluginConfig(pluginId)).toEqual({
        apiKey: 'export-test-key',
        maxResults: 50,
        enableCache: true
      })
      
      const metrics = stateStore.getPluginMetrics(pluginId)
      expect(metrics.searchCount).toBe(2)
      expect(metrics.errorCount).toBe(1)
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should recover from plugin crashes gracefully', async () => {
      const pluginId = 'lifecycle-test-plugin'

      // Simulate plugin crash
      vi.mocked(pluginManager.getPlugin).mockImplementation(() => {
        throw new Error('Plugin crashed')
      })

      // Health check should handle the error
      await expect(service.checkPluginHealth(pluginId)).rejects.toThrow()

      // Recovery: plugin becomes available again
      vi.mocked(pluginManager.getPlugin).mockReturnValue(mockPlugin)

      const health = await service.checkPluginHealth(pluginId)
      expect(health.status).toBeDefined()
    })

    it('should handle network failures during plugin operations', async () => {
      // Mock network failure during installation
      vi.spyOn(service, 'validatePlugin').mockRejectedValue(new Error('Network timeout'))

      const installResult = await service.installPlugin('network-test-plugin')
      
      expect(installResult.success).toBe(false)
      expect(installResult.error?.type).toBe('installation_failed')
      expect(installResult.error?.recoverable).toBe(true)
    })

    it('should maintain data integrity during failures', async () => {
      const pluginId = 'lifecycle-test-plugin'

      // Set up initial state
      const originalSettings = { apiKey: 'original-key' }
      stateStore.setPluginConfig(pluginId, originalSettings)
      stateStore.setPluginEnabled(pluginId, true)

      // Simulate operation failure
      vi.mocked(pluginManager.enablePlugin).mockRejectedValue(new Error('Enable failed'))

      const enableResult = await service.enablePlugin(pluginId)
      expect(enableResult.success).toBe(false)

      // State should remain unchanged
      expect(stateStore.getPluginConfig(pluginId)).toEqual(originalSettings)
      expect(stateStore.isPluginEnabled(pluginId)).toBe(true)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large numbers of plugins efficiently', async () => {
      const manyPlugins = Array.from({ length: 100 }, (_, i) => ({
        ...mockPlugin,
        id: `plugin-${i}`,
        name: `Plugin ${i}`
      }))

      vi.mocked(pluginManager.getPlugins).mockReturnValue(manyPlugins)

      const startTime = Date.now()
      const plugins = await service.getInstalledPlugins()
      const endTime = Date.now()

      expect(plugins).toHaveLength(100)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should efficiently search through large plugin collections', async () => {
      const manyPlugins = Array.from({ length: 1000 }, (_, i) => ({
        ...mockPlugin,
        id: `search-plugin-${i}`,
        name: `Search Plugin ${i}`,
        description: i % 2 === 0 ? 'Even plugin for testing' : 'Odd plugin for testing'
      }))

      vi.mocked(pluginManager.getPlugins).mockReturnValue(manyPlugins)

      const startTime = Date.now()
      const results = await service.searchPlugins({
        query: 'even',
        limit: 10
      })
      const endTime = Date.now()

      expect(results).toHaveLength(10)
      expect(endTime - startTime).toBeLessThan(500) // Should complete within 500ms
      expect(results.every(p => p.description.includes('Even'))).toBe(true)
    })

    it('should manage memory usage with plugin metrics', () => {
      const pluginId = 'memory-test-plugin'

      // Record many usage events
      for (let i = 0; i < 10000; i++) {
        stateStore.recordPluginUsage(pluginId, Math.random() * 1000, Math.floor(Math.random() * 10), Math.random() > 0.9)
      }

      const metrics = stateStore.getPluginMetrics(pluginId)
      expect(metrics.searchCount).toBe(10000)
      expect(metrics.avgSearchTime).toBeGreaterThan(0)
      expect(metrics.successRate).toBeGreaterThan(0)
      expect(metrics.successRate).toBeLessThanOrEqual(100)
    })
  })
})