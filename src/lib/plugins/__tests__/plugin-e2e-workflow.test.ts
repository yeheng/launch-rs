/**
 * End-to-end workflow tests for plugin management
 * Tests complete user journeys from start to finish
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { EnhancedSearchPlugin } from '../types'
import { PluginCategory, PluginHealthLevel } from '../types'

// Mock localStorage for persistence testing
const mockLocalStorage = {
  store: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockLocalStorage.store.get(key) || null),
  setItem: vi.fn((key: string, value: string) => mockLocalStorage.store.set(key, value)),
  removeItem: vi.fn((key: string) => mockLocalStorage.store.delete(key)),
  clear: vi.fn(() => mockLocalStorage.store.clear())
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Create a comprehensive plugin management service mock
class MockPluginManagementService {
  private plugins: Map<string, EnhancedSearchPlugin> = new Map()
  private pluginSettings: Map<string, any> = new Map()
  private pluginStates: Map<string, any> = new Map()
  private isInitialized = false

  async initialize() {
    if (this.isInitialized) return

    // Check if we have persisted plugins from a previous session
    const persistedPluginsData = mockLocalStorage.store.get('installed_plugins')
    if (persistedPluginsData) {
      try {
        const persistedPlugins = JSON.parse(persistedPluginsData)
        persistedPlugins.forEach((pluginData: any) => {
          const plugin = this.createMockPlugin(pluginData.id, pluginData)
          this.plugins.set(plugin.id, plugin)
        })
      } catch (error) {
        console.warn('Failed to parse persisted plugins:', error)
      }
    }

    // If no persisted plugins, initialize with defaults
    if (this.plugins.size === 0) {
      const defaultPlugins = [
        this.createMockPlugin('calculator', {
          name: 'Calculator Plugin',
          description: 'Perform mathematical calculations',
          metadata: { category: PluginCategory.UTILITIES }
        }),
        this.createMockPlugin('weather', {
          name: 'Weather Plugin',
          description: 'Get weather information',
          enabled: false,
          metadata: { category: PluginCategory.PRODUCTIVITY }
        }),
        this.createMockPlugin('notes', {
          name: 'Notes Plugin',
          description: 'Quick note taking',
          installation: { isBuiltIn: true, canUninstall: false }
        })
      ]

      defaultPlugins.forEach(plugin => {
        this.plugins.set(plugin.id, plugin)
      })
    }

    // Load persisted states
    this.loadPersistedData()
    this.isInitialized = true
  }

  private createMockPlugin(id: string, overrides: Partial<EnhancedSearchPlugin> = {}): EnhancedSearchPlugin {
    return {
      id,
      name: `Plugin ${id}`,
      description: `Description for ${id}`,
      version: '1.0.0',
      enabled: true,
      icon: 'TestIcon',
      search: vi.fn(),
      metadata: {
        author: 'Test Author',
        category: PluginCategory.UTILITIES,
        keywords: ['test'],
        installDate: new Date(),
        lastUpdated: new Date(),
        fileSize: 1024,
        dependencies: [],
        homepage: 'https://example.com',
        repository: 'https://github.com/example/plugin',
        license: 'MIT',
        rating: 4.5,
        downloadCount: 100
      },
      installation: {
        isInstalled: true,
        isBuiltIn: false,
        canUninstall: true
      },
      permissions: [],
      health: {
        status: PluginHealthLevel.HEALTHY,
        lastCheck: new Date(),
        issues: [],
        metrics: {
          avgSearchTime: 50,
          memoryUsage: 1024,
          cpuUsage: 1,
          errorCount: 0,
          successRate: 100
        }
      },
      settings: {},
      ...overrides
    }
  }

  private updatePersistedPluginList() {
    const pluginList = Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      version: p.version,
      enabled: p.enabled,
      metadata: p.metadata,
      installation: p.installation
    }))
    mockLocalStorage.store.set('installed_plugins', JSON.stringify(pluginList))
  }

  private loadPersistedData() {
    // Load plugin states
    this.plugins.forEach((plugin, id) => {
      const stateKey = `plugin_state_${id}`
      const settingsKey = `plugin_settings_${id}`
      
      const persistedState = mockLocalStorage.store.get(stateKey)
      if (persistedState) {
        try {
          const state = JSON.parse(persistedState)
          this.pluginStates.set(id, state)
          plugin.enabled = state.enabled ?? plugin.enabled
        } catch (error) {
          console.warn(`Failed to parse persisted state for ${id}:`, error)
        }
      }

      const persistedSettings = mockLocalStorage.store.get(settingsKey)
      if (persistedSettings) {
        try {
          const settings = JSON.parse(persistedSettings)
          this.pluginSettings.set(id, settings)
          plugin.settings = settings
        } catch (error) {
          console.warn(`Failed to parse persisted settings for ${id}:`, error)
        }
      }
    })
  }

  async getInstalledPlugins(): Promise<EnhancedSearchPlugin[]> {
    await this.initialize()
    return Array.from(this.plugins.values())
  }

  async searchPlugins(options: any = {}): Promise<EnhancedSearchPlugin[]> {
    await this.initialize()
    let plugins = Array.from(this.plugins.values())

    if (options.query) {
      const query = options.query.toLowerCase()
      plugins = plugins.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      )
    }

    if (options.category) {
      plugins = plugins.filter(p => p.metadata.category === options.category)
    }

    if (options.enabled !== undefined) {
      plugins = plugins.filter(p => p.enabled === options.enabled)
    }

    return plugins
  }

  async installPlugin(pluginId: string): Promise<{ success: boolean; error?: any; data?: any }> {
    await this.initialize()
    
    // Simulate installation delay
    await new Promise(resolve => setTimeout(resolve, 100))

    if (this.plugins.has(pluginId)) {
      return {
        success: false,
        error: { type: 'ALREADY_INSTALLED', message: 'Plugin already installed' }
      }
    }

    // Create new plugin
    const newPlugin = this.createMockPlugin(pluginId, {
      name: `Installed Plugin ${pluginId}`,
      description: `Newly installed plugin ${pluginId}`
    })

    this.plugins.set(pluginId, newPlugin)
    
    // Update persisted plugin list
    this.updatePersistedPluginList()

    return {
      success: true,
      data: { pluginId, message: 'Plugin installed successfully' }
    }
  }

  async uninstallPlugin(pluginId: string): Promise<{ success: boolean; error?: any; data?: any }> {
    await this.initialize()
    
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return {
        success: false,
        error: { type: 'PLUGIN_NOT_FOUND', message: 'Plugin not found' }
      }
    }

    if (!plugin.installation.canUninstall) {
      return {
        success: false,
        error: { type: 'CANNOT_UNINSTALL', message: 'Built-in plugin cannot be uninstalled' }
      }
    }

    // Simulate uninstallation delay
    await new Promise(resolve => setTimeout(resolve, 150))

    // Remove plugin and its data
    this.plugins.delete(pluginId)
    this.pluginSettings.delete(pluginId)
    this.pluginStates.delete(pluginId)
    
    // Clear persisted data
    mockLocalStorage.store.delete(`plugin_state_${pluginId}`)
    mockLocalStorage.store.delete(`plugin_settings_${pluginId}`)
    
    // Update persisted plugin list
    this.updatePersistedPluginList()

    return {
      success: true,
      data: {
        pluginId,
        message: 'Plugin uninstalled successfully',
        cleanupDetails: {
          filesRemoved: true,
          configurationCleared: true,
          dependenciesResolved: true
        }
      }
    }
  }

  async enablePlugin(pluginId: string): Promise<{ success: boolean; error?: any }> {
    await this.initialize()
    
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return {
        success: false,
        error: { type: 'PLUGIN_NOT_FOUND', message: 'Plugin not found' }
      }
    }

    plugin.enabled = true
    await this.setPluginState(pluginId, { enabled: true, lastToggled: new Date().toISOString() })

    return { success: true }
  }

  async disablePlugin(pluginId: string): Promise<{ success: boolean; error?: any }> {
    await this.initialize()
    
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return {
        success: false,
        error: { type: 'PLUGIN_NOT_FOUND', message: 'Plugin not found' }
      }
    }

    plugin.enabled = false
    await this.setPluginState(pluginId, { enabled: false, lastToggled: new Date().toISOString() })

    return { success: true }
  }

  async savePluginSettings(pluginId: string, settings: any): Promise<{ success: boolean; error?: any }> {
    await this.initialize()
    
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      return {
        success: false,
        error: { type: 'PLUGIN_NOT_FOUND', message: 'Plugin not found' }
      }
    }

    // Validate settings (basic validation)
    if (settings.maxResults && (settings.maxResults < 1 || settings.maxResults > 100)) {
      return {
        success: false,
        error: { type: 'VALIDATION_ERROR', message: 'maxResults must be between 1 and 100' }
      }
    }

    this.pluginSettings.set(pluginId, settings)
    plugin.settings = settings

    // Persist to localStorage
    mockLocalStorage.store.set(`plugin_settings_${pluginId}`, JSON.stringify(settings))

    return { success: true }
  }

  async getPluginSettings(pluginId: string): Promise<any> {
    await this.initialize()
    return this.pluginSettings.get(pluginId) || {}
  }

  async setPluginState(pluginId: string, state: any): Promise<{ success: boolean }> {
    await this.initialize()
    
    this.pluginStates.set(pluginId, state)
    
    // Persist to localStorage
    mockLocalStorage.store.set(`plugin_state_${pluginId}`, JSON.stringify(state))

    return { success: true }
  }

  async getPluginState(pluginId: string): Promise<any> {
    await this.initialize()
    return this.pluginStates.get(pluginId) || { enabled: true }
  }

  async performHealthCheck(): Promise<{ healthy: boolean; issues: any[] }> {
    await this.initialize()
    
    const issues: any[] = []
    
    // Check for plugins with high error rates
    this.plugins.forEach(plugin => {
      if (plugin.health.metrics.errorCount > 5) {
        issues.push({
          pluginId: plugin.id,
          type: 'high_error_rate',
          message: `Plugin ${plugin.name} has high error rate`
        })
      }
      
      if (plugin.health.metrics.avgSearchTime > 1000) {
        issues.push({
          pluginId: plugin.id,
          type: 'slow_performance',
          message: `Plugin ${plugin.name} is responding slowly`
        })
      }
    })

    return {
      healthy: issues.length === 0,
      issues
    }
  }

  // Simulate application restart
  async simulateRestart(): Promise<void> {
    // Save current plugin list to localStorage for persistence
    const pluginList = Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      version: p.version,
      enabled: p.enabled,
      metadata: p.metadata,
      installation: p.installation
    }))
    mockLocalStorage.store.set('installed_plugins', JSON.stringify(pluginList))
    
    this.plugins.clear()
    this.pluginSettings.clear()
    this.pluginStates.clear()
    this.isInitialized = false
    
    // Reinitialize (this will load persisted data)
    await this.initialize()
  }
}

describe('Plugin Management E2E Workflow Tests', () => {
  let service: MockPluginManagementService

  beforeEach(async () => {
    vi.clearAllMocks()
    mockLocalStorage.store.clear()
    service = new MockPluginManagementService()
    await service.initialize()
  })

  describe('Complete Plugin Installation Workflow', () => {
    it('should handle complete installation workflow from discovery to usage', async () => {
      // Step 1: Discover available plugins
      const initialPlugins = await service.getInstalledPlugins()
      expect(initialPlugins).toHaveLength(3)

      // Step 2: Install a new plugin
      const installResult = await service.installPlugin('new-awesome-plugin')
      expect(installResult.success).toBe(true)
      expect(installResult.data.pluginId).toBe('new-awesome-plugin')

      // Step 3: Verify plugin appears in list
      const pluginsAfterInstall = await service.getInstalledPlugins()
      expect(pluginsAfterInstall).toHaveLength(4)
      
      const newPlugin = pluginsAfterInstall.find(p => p.id === 'new-awesome-plugin')
      expect(newPlugin).toBeDefined()
      expect(newPlugin!.enabled).toBe(true)

      // Step 4: Configure plugin settings
      const settings = {
        theme: 'dark',
        maxResults: 10,
        autoUpdate: true
      }
      
      const settingsResult = await service.savePluginSettings('new-awesome-plugin', settings)
      expect(settingsResult.success).toBe(true)

      // Step 5: Verify settings are saved
      const savedSettings = await service.getPluginSettings('new-awesome-plugin')
      expect(savedSettings).toEqual(settings)

      // Step 6: Test plugin functionality (simulated)
      expect(newPlugin!.search).toBeDefined()
    })

    it('should handle installation failure gracefully', async () => {
      // Try to install a plugin that already exists
      const result = await service.installPlugin('calculator')
      
      expect(result.success).toBe(false)
      expect(result.error.type).toBe('ALREADY_INSTALLED')
      
      // Verify original plugin is unchanged
      const plugins = await service.getInstalledPlugins()
      const calculator = plugins.find(p => p.id === 'calculator')
      expect(calculator).toBeDefined()
      expect(calculator!.name).toBe('Calculator Plugin')
    })
  })

  describe('Complete Plugin Uninstallation Workflow', () => {
    it('should handle complete uninstallation workflow with cleanup', async () => {
      // Step 1: Install a plugin first
      await service.installPlugin('temp-plugin')
      
      // Step 2: Configure the plugin
      const settings = { configured: true, value: 42 }
      await service.savePluginSettings('temp-plugin', settings)
      
      // Step 3: Set plugin state
      await service.setPluginState('temp-plugin', { enabled: true, customState: 'active' })

      // Step 4: Verify plugin exists with data
      let plugins = await service.getInstalledPlugins()
      expect(plugins.find(p => p.id === 'temp-plugin')).toBeDefined()
      
      const savedSettings = await service.getPluginSettings('temp-plugin')
      expect(savedSettings.configured).toBe(true)

      // Step 5: Uninstall the plugin
      const uninstallResult = await service.uninstallPlugin('temp-plugin')
      expect(uninstallResult.success).toBe(true)
      expect(uninstallResult.data.cleanupDetails.filesRemoved).toBe(true)
      expect(uninstallResult.data.cleanupDetails.configurationCleared).toBe(true)

      // Step 6: Verify plugin is completely removed
      plugins = await service.getInstalledPlugins()
      expect(plugins.find(p => p.id === 'temp-plugin')).toBeUndefined()

      // Step 7: Verify settings and state are cleaned up
      const settingsAfterUninstall = await service.getPluginSettings('temp-plugin')
      expect(settingsAfterUninstall).toEqual({})

      // Step 8: Verify localStorage is cleaned up
      expect(mockLocalStorage.store.has('plugin_settings_temp-plugin')).toBe(false)
      expect(mockLocalStorage.store.has('plugin_state_temp-plugin')).toBe(false)
    })

    it('should prevent uninstallation of built-in plugins', async () => {
      const result = await service.uninstallPlugin('notes')
      
      expect(result.success).toBe(false)
      expect(result.error.type).toBe('CANNOT_UNINSTALL')
      
      // Verify plugin still exists
      const plugins = await service.getInstalledPlugins()
      expect(plugins.find(p => p.id === 'notes')).toBeDefined()
    })
  })

  describe('Plugin State Management Across Restarts', () => {
    it('should persist plugin enabled/disabled state across application restarts', async () => {
      // Step 1: Disable a plugin
      const disableResult = await service.disablePlugin('calculator')
      expect(disableResult.success).toBe(true)

      // Step 2: Verify plugin is disabled
      let plugins = await service.getInstalledPlugins()
      let calculator = plugins.find(p => p.id === 'calculator')
      expect(calculator!.enabled).toBe(false)

      // Step 3: Simulate application restart
      await service.simulateRestart()

      // Step 4: Verify plugin state is restored
      plugins = await service.getInstalledPlugins()
      calculator = plugins.find(p => p.id === 'calculator')
      expect(calculator!.enabled).toBe(false)

      // Step 5: Enable plugin again
      const enableResult = await service.enablePlugin('calculator')
      expect(enableResult.success).toBe(true)

      // Step 6: Verify state change persists
      await service.simulateRestart()
      plugins = await service.getInstalledPlugins()
      calculator = plugins.find(p => p.id === 'calculator')
      expect(calculator!.enabled).toBe(true)
    })

    it('should persist plugin settings across application restarts', async () => {
      // Step 1: Configure plugin settings
      const originalSettings = {
        theme: 'dark',
        language: 'en',
        maxResults: 25,
        features: {
          autoComplete: true,
          spellCheck: false
        }
      }

      const saveResult = await service.savePluginSettings('weather', originalSettings)
      expect(saveResult.success).toBe(true)

      // Step 2: Verify settings are applied
      let settings = await service.getPluginSettings('weather')
      expect(settings).toEqual(originalSettings)

      // Step 3: Simulate application restart
      await service.simulateRestart()

      // Step 4: Verify settings are restored
      settings = await service.getPluginSettings('weather')
      expect(settings).toEqual(originalSettings)
      expect(settings.features.autoComplete).toBe(true)
      expect(settings.features.spellCheck).toBe(false)

      // Step 5: Update settings
      const updatedSettings = {
        ...originalSettings,
        theme: 'light',
        maxResults: 50
      }

      await service.savePluginSettings('weather', updatedSettings)

      // Step 6: Verify updates persist across restart
      await service.simulateRestart()
      settings = await service.getPluginSettings('weather')
      expect(settings.theme).toBe('light')
      expect(settings.maxResults).toBe(50)
    })

    it('should handle corrupted persistence data gracefully', async () => {
      // Step 1: Manually corrupt localStorage data
      mockLocalStorage.store.set('plugin_settings_calculator', 'invalid-json{')
      mockLocalStorage.store.set('plugin_state_weather', 'also-invalid}')

      // Step 2: Simulate restart (should not crash)
      await service.simulateRestart()

      // Step 3: Verify plugins still load with default values
      const plugins = await service.getInstalledPlugins()
      expect(plugins).toHaveLength(3)

      const calculator = plugins.find(p => p.id === 'calculator')
      expect(calculator).toBeDefined()

      // Step 4: Verify corrupted settings return empty object
      const settings = await service.getPluginSettings('calculator')
      expect(settings).toEqual({})
    })
  })

  describe('Plugin Configuration and Validation Workflow', () => {
    it('should handle complete configuration workflow with validation', async () => {
      // Step 1: Get current settings
      const currentSettings = await service.getPluginSettings('calculator')
      expect(currentSettings).toEqual({})

      // Step 2: Try to save invalid settings
      const invalidSettings = {
        maxResults: -5, // Invalid: negative value
        theme: 'invalid-theme'
      }

      const invalidResult = await service.savePluginSettings('calculator', invalidSettings)
      expect(invalidResult.success).toBe(false)
      expect(invalidResult.error.type).toBe('VALIDATION_ERROR')

      // Step 3: Save valid settings
      const validSettings = {
        maxResults: 10,
        theme: 'dark',
        precision: 2,
        showHistory: true
      }

      const validResult = await service.savePluginSettings('calculator', validSettings)
      expect(validResult.success).toBe(true)

      // Step 4: Verify settings are saved and applied
      const savedSettings = await service.getPluginSettings('calculator')
      expect(savedSettings).toEqual(validSettings)

      // Step 5: Update partial settings
      const partialUpdate = { theme: 'light', precision: 4 }
      await service.savePluginSettings('calculator', { ...savedSettings, ...partialUpdate })

      const updatedSettings = await service.getPluginSettings('calculator')
      expect(updatedSettings.theme).toBe('light')
      expect(updatedSettings.precision).toBe(4)
      expect(updatedSettings.showHistory).toBe(true) // Should preserve existing values
    })

    it('should handle complex nested settings', async () => {
      const complexSettings = {
        ui: {
          theme: 'dark',
          layout: 'compact',
          animations: {
            enabled: true,
            duration: 300,
            easing: 'ease-in-out'
          }
        },
        api: {
          endpoint: 'https://api.example.com',
          timeout: 5000,
          retries: 3,
          headers: {
            'User-Agent': 'MyApp/1.0',
            'Accept': 'application/json'
          }
        },
        features: {
          autoComplete: true,
          spellCheck: false,
          shortcuts: ['Ctrl+K', 'Ctrl+Shift+P']
        }
      }

      // Save complex settings
      const result = await service.savePluginSettings('weather', complexSettings)
      expect(result.success).toBe(true)

      // Retrieve and verify
      const retrieved = await service.getPluginSettings('weather')
      expect(retrieved).toEqual(complexSettings)
      expect(retrieved.ui.animations.duration).toBe(300)
      expect(retrieved.features.shortcuts).toHaveLength(2)

      // Verify persistence across restart
      await service.simulateRestart()
      const afterRestart = await service.getPluginSettings('weather')
      expect(afterRestart).toEqual(complexSettings)
    })
  })

  describe('Plugin Search and Filter Workflow', () => {
    it('should handle complete search and filter workflow', async () => {
      // Step 1: Install additional plugins for testing
      await service.installPlugin('search-plugin')
      await service.installPlugin('utility-helper')
      await service.installPlugin('productivity-tool')

      // Step 2: Search by name
      const nameResults = await service.searchPlugins({ query: 'Calculator' })
      expect(nameResults).toHaveLength(1)
      expect(nameResults[0].name).toBe('Calculator Plugin')

      // Step 3: Search by partial name
      const partialResults = await service.searchPlugins({ query: 'Plugin' })
      expect(partialResults.length).toBeGreaterThan(1)

      // Step 4: Filter by category
      const utilityResults = await service.searchPlugins({ category: PluginCategory.UTILITIES })
      expect(utilityResults.every(p => p.metadata.category === PluginCategory.UTILITIES)).toBe(true)

      // Step 5: Filter by enabled status
      await service.disablePlugin('weather')
      const enabledResults = await service.searchPlugins({ enabled: true })
      const disabledResults = await service.searchPlugins({ enabled: false })
      
      expect(enabledResults.every(p => p.enabled)).toBe(true)
      expect(disabledResults.every(p => !p.enabled)).toBe(true)
      expect(disabledResults.find(p => p.id === 'weather')).toBeDefined()

      // Step 6: Combined filters
      const combinedResults = await service.searchPlugins({
        query: 'Plugin',
        enabled: true
      })
      
      expect(combinedResults.every(p => p.enabled)).toBe(true)
      expect(combinedResults.every(p => 
        p.name.toLowerCase().includes('plugin') || 
        p.description.toLowerCase().includes('plugin')
      )).toBe(true)
    })
  })

  describe('Plugin Health Monitoring Workflow', () => {
    it('should monitor plugin health and detect issues', async () => {
      // Step 1: Initial health check (should be healthy)
      let healthResult = await service.performHealthCheck()
      expect(healthResult.healthy).toBe(true)
      expect(healthResult.issues).toHaveLength(0)

      // Step 2: Simulate plugin with issues
      const plugins = await service.getInstalledPlugins()
      const calculator = plugins.find(p => p.id === 'calculator')!
      
      // Simulate high error count
      calculator.health.metrics.errorCount = 10
      calculator.health.metrics.avgSearchTime = 2000

      // Step 3: Health check should detect issues
      healthResult = await service.performHealthCheck()
      expect(healthResult.healthy).toBe(false)
      expect(healthResult.issues).toHaveLength(2)
      
      const errorIssue = healthResult.issues.find(i => i.type === 'high_error_rate')
      const performanceIssue = healthResult.issues.find(i => i.type === 'slow_performance')
      
      expect(errorIssue).toBeDefined()
      expect(performanceIssue).toBeDefined()
      expect(errorIssue.pluginId).toBe('calculator')
      expect(performanceIssue.pluginId).toBe('calculator')

      // Step 4: Fix issues
      calculator.health.metrics.errorCount = 0
      calculator.health.metrics.avgSearchTime = 50

      // Step 5: Health check should be clean again
      healthResult = await service.performHealthCheck()
      expect(healthResult.healthy).toBe(true)
      expect(healthResult.issues).toHaveLength(0)
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should handle and recover from various error scenarios', async () => {
      // Scenario 1: Plugin not found error
      const notFoundResult = await service.enablePlugin('non-existent-plugin')
      expect(notFoundResult.success).toBe(false)
      expect(notFoundResult.error.type).toBe('PLUGIN_NOT_FOUND')

      // Scenario 2: Validation error recovery
      const invalidResult = await service.savePluginSettings('calculator', { maxResults: 200 })
      expect(invalidResult.success).toBe(false)
      
      // Should be able to save valid settings after error
      const validResult = await service.savePluginSettings('calculator', { maxResults: 50 })
      expect(validResult.success).toBe(true)

      // Scenario 3: Built-in plugin protection
      const uninstallResult = await service.uninstallPlugin('notes')
      expect(uninstallResult.success).toBe(false)
      expect(uninstallResult.error.type).toBe('CANNOT_UNINSTALL')

      // Should still be able to configure built-in plugins
      const configResult = await service.savePluginSettings('notes', { theme: 'dark' })
      expect(configResult.success).toBe(true)

      // Scenario 4: System should remain stable after errors
      const plugins = await service.getInstalledPlugins()
      expect(plugins).toHaveLength(3) // Original plugins should be intact
      
      const healthResult = await service.performHealthCheck()
      expect(healthResult).toBeDefined() // Health check should still work
    })
  })

  describe('Complete User Journey Simulation', () => {
    it('should handle a complete user session from start to finish', async () => {
      // === Day 1: Initial Setup ===
      
      // User starts the application
      let plugins = await service.getInstalledPlugins()
      expect(plugins).toHaveLength(3)

      // User discovers and installs new plugins
      await service.installPlugin('markdown-editor')
      await service.installPlugin('file-manager')
      await service.installPlugin('color-picker')

      plugins = await service.getInstalledPlugins()
      expect(plugins).toHaveLength(6)

      // User configures their favorite plugins
      await service.savePluginSettings('markdown-editor', {
        theme: 'dark',
        fontSize: 14,
        autoSave: true,
        extensions: ['tables', 'code-highlighting']
      })

      await service.savePluginSettings('file-manager', {
        showHidden: false,
        sortBy: 'name',
        viewMode: 'grid'
      })

      // User disables some plugins they don't need
      await service.disablePlugin('weather')
      await service.disablePlugin('color-picker')

      // === Application Restart (End of Day 1) ===
      await service.simulateRestart()

      // === Day 2: Continued Usage ===
      
      // User starts application again
      plugins = await service.getInstalledPlugins()
      expect(plugins).toHaveLength(6)

      // Verify settings and states are restored
      const markdownSettings = await service.getPluginSettings('markdown-editor')
      expect(markdownSettings.theme).toBe('dark')
      expect(markdownSettings.extensions).toContain('tables')

      const weatherPlugin = plugins.find(p => p.id === 'weather')
      expect(weatherPlugin!.enabled).toBe(false)

      // User searches for specific plugins
      const searchResults = await service.searchPlugins({ query: 'editor' })
      expect(searchResults.find(p => p.id === 'markdown-editor')).toBeDefined()

      // User updates plugin settings
      await service.savePluginSettings('markdown-editor', {
        ...markdownSettings,
        fontSize: 16,
        theme: 'light'
      })

      // User enables previously disabled plugin
      await service.enablePlugin('weather')
      await service.savePluginSettings('weather', {
        location: 'New York',
        units: 'metric',
        updateInterval: 30
      })

      // User removes plugin they no longer need
      const uninstallResult = await service.uninstallPlugin('color-picker')
      expect(uninstallResult.success).toBe(true)

      // === Final State Verification ===
      
      plugins = await service.getInstalledPlugins()
      expect(plugins).toHaveLength(5) // One plugin removed

      // Verify all changes are properly applied
      const finalMarkdownSettings = await service.getPluginSettings('markdown-editor')
      expect(finalMarkdownSettings.fontSize).toBe(16)
      expect(finalMarkdownSettings.theme).toBe('light')

      const finalWeatherPlugin = plugins.find(p => p.id === 'weather')
      expect(finalWeatherPlugin!.enabled).toBe(true)

      const weatherSettings = await service.getPluginSettings('weather')
      expect(weatherSettings.location).toBe('New York')

      // Verify removed plugin is gone
      expect(plugins.find(p => p.id === 'color-picker')).toBeUndefined()

      // === Final Restart Test ===
      await service.simulateRestart()

      // Everything should persist
      const finalPlugins = await service.getInstalledPlugins()
      expect(finalPlugins).toHaveLength(5)
      
      const persistedMarkdownSettings = await service.getPluginSettings('markdown-editor')
      expect(persistedMarkdownSettings.fontSize).toBe(16)
      
      const persistedWeatherSettings = await service.getPluginSettings('weather')
      expect(persistedWeatherSettings.location).toBe('New York')
    })
  })
})