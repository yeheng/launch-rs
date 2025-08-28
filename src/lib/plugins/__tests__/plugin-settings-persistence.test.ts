/**
 * Tests for plugin settings persistence across application restarts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { usePluginStateStore } from '../plugin-state-manager'
import { pluginManagementService } from '../plugin-management-service'
import type { EnhancedSearchPlugin } from '../types'
import { PluginCategory } from '../types'

// Mock localStorage
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

// Mock plugin data
const createMockPlugin = (id: string, settings: any = {}): EnhancedSearchPlugin => ({
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
    status: 'healthy' as any,
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
  settings
})

describe('Plugin Settings Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.store.clear()
  })

  describe('Settings Storage and Retrieval', () => {
    it('should persist plugin settings to localStorage', async () => {
      const pluginId = 'test-plugin'
      const settings = {
        theme: 'dark',
        autoUpdate: true,
        maxResults: 10,
        customEndpoint: 'https://api.example.com'
      }

      // Save settings
      await pluginManagementService.savePluginSettings(pluginId, settings)

      // Verify localStorage was called
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        `plugin_settings_${pluginId}`,
        JSON.stringify(settings)
      )
    })

    it('should retrieve plugin settings from localStorage', async () => {
      const pluginId = 'test-plugin'
      const settings = {
        theme: 'light',
        notifications: false,
        cacheSize: 50
      }

      // Pre-populate localStorage
      mockLocalStorage.store.set(
        `plugin_settings_${pluginId}`,
        JSON.stringify(settings)
      )

      // Retrieve settings
      const retrievedSettings = await pluginManagementService.getPluginSettings(pluginId)

      expect(retrievedSettings).toEqual(settings)
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(`plugin_settings_${pluginId}`)
    })

    it('should return default settings when no persisted settings exist', async () => {
      const pluginId = 'new-plugin'
      const defaultSettings = { enabled: true, priority: 'normal' }

      // Mock plugin with default settings
      vi.spyOn(pluginManagementService, 'getPluginDetails').mockResolvedValue(
        createMockPlugin(pluginId, defaultSettings)
      )

      const settings = await pluginManagementService.getPluginSettings(pluginId)

      expect(settings).toEqual(defaultSettings)
    })

    it('should handle corrupted settings data gracefully', async () => {
      const pluginId = 'corrupted-plugin'

      // Store corrupted JSON
      mockLocalStorage.store.set(`plugin_settings_${pluginId}`, 'invalid-json{')

      const settings = await pluginManagementService.getPluginSettings(pluginId)

      // Should return empty object or default settings
      expect(settings).toEqual({})
    })
  })

  describe('Plugin State Persistence', () => {
    it('should persist plugin enabled/disabled state', async () => {
      const pluginId = 'state-test-plugin'
      const state = { enabled: false, lastToggled: new Date().toISOString() }

      // Save state
      await pluginManagementService.setPluginState(pluginId, state)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        `plugin_state_${pluginId}`,
        JSON.stringify(state)
      )
    })

    it('should retrieve plugin state on application restart', async () => {
      const pluginId = 'state-test-plugin'
      const state = { enabled: true, lastEnabled: new Date().toISOString() }

      // Pre-populate state
      mockLocalStorage.store.set(
        `plugin_state_${pluginId}`,
        JSON.stringify(state)
      )

      const retrievedState = await pluginManagementService.getPluginState(pluginId)

      expect(retrievedState).toEqual(state)
    })

    it('should apply persisted state to plugin on startup', async () => {
      const pluginId = 'startup-plugin'
      const persistedState = { enabled: false }

      // Mock persisted state
      mockLocalStorage.store.set(
        `plugin_state_${pluginId}`,
        JSON.stringify(persistedState)
      )

      // Simulate application startup
      const plugin = createMockPlugin(pluginId)
      const restoredPlugin = await pluginManagementService.restorePluginState(plugin)

      expect(restoredPlugin.enabled).toBe(false)
    })
  })

  describe('Complex Settings Scenarios', () => {
    it('should handle nested settings objects', async () => {
      const pluginId = 'complex-plugin'
      const complexSettings = {
        ui: {
          theme: 'dark',
          layout: 'compact',
          animations: true
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

      await pluginManagementService.savePluginSettings(pluginId, complexSettings)
      const retrieved = await pluginManagementService.getPluginSettings(pluginId)

      expect(retrieved).toEqual(complexSettings)
    })

    it('should handle settings migration between versions', async () => {
      const pluginId = 'migration-plugin'
      
      // Old version settings
      const oldSettings = {
        version: '1.0.0',
        theme: 'light',
        maxItems: 5
      }

      // Store old settings
      mockLocalStorage.store.set(
        `plugin_settings_${pluginId}`,
        JSON.stringify(oldSettings)
      )

      // Mock plugin with migration logic
      const migrationSpy = vi.spyOn(pluginManagementService, 'migratePluginSettings')
        .mockImplementation(async (id, settings) => {
          if (settings.version === '1.0.0') {
            return {
              version: '2.0.0',
              appearance: { theme: settings.theme },
              limits: { maxResults: settings.maxItems * 2 }
            }
          }
          return settings
        })

      const migratedSettings = await pluginManagementService.getPluginSettings(pluginId)

      expect(migrationSpy).toHaveBeenCalled()
      expect(migratedSettings.version).toBe('2.0.0')
      expect(migratedSettings.appearance.theme).toBe('light')
      expect(migratedSettings.limits.maxResults).toBe(10)
    })

    it('should handle settings validation and sanitization', async () => {
      const pluginId = 'validation-plugin'
      const invalidSettings = {
        theme: 'invalid-theme',
        maxResults: -5,
        apiKey: '<script>alert("xss")</script>',
        validSetting: 'good-value'
      }

      const validationSpy = vi.spyOn(pluginManagementService, 'validatePluginSettings')
        .mockImplementation(async (id, settings) => ({
          theme: settings.theme === 'invalid-theme' ? 'light' : settings.theme,
          maxResults: Math.max(1, Math.min(100, settings.maxResults)),
          apiKey: settings.apiKey.replace(/<[^>]*>/g, ''), // Strip HTML
          validSetting: settings.validSetting
        }))

      await pluginManagementService.savePluginSettings(pluginId, invalidSettings)

      expect(validationSpy).toHaveBeenCalled()
      
      const savedSettings = await pluginManagementService.getPluginSettings(pluginId)
      expect(savedSettings.theme).toBe('light')
      expect(savedSettings.maxResults).toBe(1)
      expect(savedSettings.apiKey).toBe('alert("xss")')
      expect(savedSettings.validSetting).toBe('good-value')
    })
  })

  describe('Multi-Plugin Settings Management', () => {
    it('should handle settings for multiple plugins independently', async () => {
      const plugin1Settings = { theme: 'dark', size: 'large' }
      const plugin2Settings = { theme: 'light', size: 'small' }

      await pluginManagementService.savePluginSettings('plugin1', plugin1Settings)
      await pluginManagementService.savePluginSettings('plugin2', plugin2Settings)

      const retrieved1 = await pluginManagementService.getPluginSettings('plugin1')
      const retrieved2 = await pluginManagementService.getPluginSettings('plugin2')

      expect(retrieved1).toEqual(plugin1Settings)
      expect(retrieved2).toEqual(plugin2Settings)
      expect(retrieved1).not.toEqual(retrieved2)
    })

    it('should handle bulk settings operations', async () => {
      const bulkSettings = {
        'plugin1': { enabled: true, priority: 1 },
        'plugin2': { enabled: false, priority: 2 },
        'plugin3': { enabled: true, priority: 3 }
      }

      await pluginManagementService.saveBulkPluginSettings(bulkSettings)

      // Verify each plugin's settings were saved
      for (const [pluginId, settings] of Object.entries(bulkSettings)) {
        const retrieved = await pluginManagementService.getPluginSettings(pluginId)
        expect(retrieved).toEqual(settings)
      }
    })

    it('should export and import plugin settings', async () => {
      // Setup initial settings
      const settingsData = {
        'plugin1': { theme: 'dark', autoSave: true },
        'plugin2': { language: 'en', notifications: false },
        'plugin3': { maxHistory: 50, compression: true }
      }

      for (const [pluginId, settings] of Object.entries(settingsData)) {
        await pluginManagementService.savePluginSettings(pluginId, settings)
      }

      // Export settings
      const exportedSettings = await pluginManagementService.exportAllPluginSettings()
      expect(exportedSettings).toEqual(settingsData)

      // Clear current settings
      mockLocalStorage.store.clear()

      // Import settings
      await pluginManagementService.importPluginSettings(exportedSettings)

      // Verify settings were restored
      for (const [pluginId, expectedSettings] of Object.entries(settingsData)) {
        const retrieved = await pluginManagementService.getPluginSettings(pluginId)
        expect(retrieved).toEqual(expectedSettings)
      }
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle localStorage quota exceeded errors', async () => {
      const pluginId = 'large-settings-plugin'
      const largeSettings = {
        data: 'x'.repeat(10 * 1024 * 1024) // 10MB of data
      }

      // Mock quota exceeded error
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      const result = await pluginManagementService.savePluginSettings(pluginId, largeSettings)

      expect(result.success).toBe(false)
      expect(result.error?.type).toBe('STORAGE_ERROR')
    })

    it('should recover from corrupted settings storage', async () => {
      const pluginId = 'recovery-plugin'

      // Simulate corrupted storage
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage corrupted')
      })

      const settings = await pluginManagementService.getPluginSettings(pluginId)

      // Should return default settings without crashing
      expect(settings).toBeDefined()
      expect(typeof settings).toBe('object')
    })

    it('should handle concurrent settings updates', async () => {
      const pluginId = 'concurrent-plugin'
      const settings1 = { value: 'first' }
      const settings2 = { value: 'second' }

      // Simulate concurrent updates
      const promise1 = pluginManagementService.savePluginSettings(pluginId, settings1)
      const promise2 = pluginManagementService.savePluginSettings(pluginId, settings2)

      await Promise.all([promise1, promise2])

      // Last write should win
      const finalSettings = await pluginManagementService.getPluginSettings(pluginId)
      expect(['first', 'second']).toContain(finalSettings.value)
    })
  })

  describe('Performance and Optimization', () => {
    it('should cache frequently accessed settings', async () => {
      const pluginId = 'cached-plugin'
      const settings = { cached: true }

      await pluginManagementService.savePluginSettings(pluginId, settings)

      // First access
      await pluginManagementService.getPluginSettings(pluginId)
      
      // Second access should use cache
      await pluginManagementService.getPluginSettings(pluginId)

      // localStorage should only be called once for retrieval
      expect(mockLocalStorage.getItem).toHaveBeenCalledTimes(1)
    })

    it('should debounce rapid settings updates', async () => {
      const pluginId = 'debounced-plugin'
      
      // Rapid updates
      const updates = [
        { step: 1 },
        { step: 2 },
        { step: 3 },
        { step: 4 },
        { step: 5 }
      ]

      const promises = updates.map(settings => 
        pluginManagementService.savePluginSettings(pluginId, settings)
      )

      await Promise.all(promises)

      // Should debounce and only save the final state
      const finalSettings = await pluginManagementService.getPluginSettings(pluginId)
      expect(finalSettings.step).toBe(5)
    })

    it('should handle large numbers of plugins efficiently', async () => {
      const pluginCount = 100
      const startTime = performance.now()

      // Create settings for many plugins
      const promises = Array.from({ length: pluginCount }, (_, i) => 
        pluginManagementService.savePluginSettings(`plugin-${i}`, { index: i })
      )

      await Promise.all(promises)

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000) // 1 second
    })
  })
})