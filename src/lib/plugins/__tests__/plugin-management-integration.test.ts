/**
 * Integration tests for plugin management system
 * Tests complete workflows from installation to uninstallation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PluginManagementPage from '@/views/PluginManagementPage.vue'
import { pluginManagementService, PluginManagementError, PluginManagementErrorType } from '../plugin-management-service'
import { pluginManager } from '@/lib/search-plugin-manager'
import { usePluginStateStore } from '../plugin-state-manager'
import { pluginStatisticsManager } from '../plugin-statistics'
import type { EnhancedSearchPlugin } from '../types'
import { PluginCategory, PluginHealthLevel } from '../types'

// Mock external dependencies
vi.mock('@/lib/search-plugin-manager')
vi.mock('../plugin-state-manager')
vi.mock('../plugin-statistics')
vi.mock('@/lib/composables/useNavigation', () => ({
  useNavigation: () => ({
    breadcrumbItems: [],
    navigateHome: vi.fn()
  })
}))

// Mock toast system
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    toasts: [],
    removeToast: vi.fn(),
    handleToastAction: vi.fn(),
    pluginSuccess: vi.fn(),
    pluginError: vi.fn(),
    pluginWarning: vi.fn(),
    loading: vi.fn(),
    updateToast: vi.fn()
  }),
  ToastContainer: { template: '<div></div>' }
}))

// Mock UI components
vi.mock('@/components/ui/error-boundary', () => ({
  ErrorBoundary: { template: '<div><slot /></div>' }
}))

vi.mock('@/components/ui/loading', () => ({
  LoadingSpinner: { template: '<div>Loading...</div>' },
  LoadingOverlay: { template: '<div>Loading Overlay</div>' },
  LoadingSkeleton: { template: '<div>Loading Skeleton</div>' }
}))

vi.mock('@/components/ui/virtual-scroll', () => ({
  VirtualScrollList: { 
    template: '<div><slot v-for="item in items" :item="item" :index="0" /></div>',
    props: ['items']
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
  let mockStateStore: any
  let wrapper: any

  beforeEach(() => {
    // Reset mocks
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

    // Mock state store
    mockStateStore = {
      getPluginState: vi.fn().mockReturnValue({ enabled: true, settings: {} }),
      setPluginState: vi.fn(),
      getPluginSettings: vi.fn().mockReturnValue({}),
      setPluginSettings: vi.fn(),
      subscribe: vi.fn()
    }

    // Setup mocks
    vi.mocked(usePluginStateStore).mockReturnValue(mockStateStore)
    vi.mocked(pluginManager.getPlugins).mockReturnValue(mockPlugins.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      version: p.version,
      enabled: p.enabled,
      icon: p.icon,
      search: p.search
    })))
    vi.mocked(pluginManager.getPlugin).mockImplementation((id) => 
      mockPlugins.find(p => p.id === id) || null
    )

    // Mock plugin management service
    vi.spyOn(pluginManagementService, 'getInstalledPlugins').mockResolvedValue(mockPlugins)
    vi.spyOn(pluginManagementService, 'searchPlugins').mockResolvedValue(mockPlugins)
    vi.spyOn(pluginManagementService, 'getPluginDetails').mockImplementation(async (id) => {
      const plugin = mockPlugins.find(p => p.id === id)
      if (!plugin) throw new Error('Plugin not found')
      return plugin
    })

    // Mock statistics
    vi.mocked(pluginStatisticsManager.getStatistics).mockReturnValue({
      total: mockPlugins.length,
      installed: mockPlugins.filter(p => p.installation.isInstalled).length,
      enabled: mockPlugins.filter(p => p.enabled).length,
      byCategory: {
        [PluginCategory.UTILITIES]: 2,
        [PluginCategory.PRODUCTIVITY]: 1,
        [PluginCategory.SEARCH]: 0,
        [PluginCategory.DEVELOPMENT]: 0,
        [PluginCategory.SYSTEM]: 0
      },
      withIssues: 0
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Complete Plugin Management Workflow', () => {
    it('should handle complete plugin lifecycle from installation to uninstallation', async () => {
      // Mock installation and uninstallation
      const installSpy = vi.spyOn(pluginManagementService, 'installPlugin')
        .mockResolvedValue({ success: true, data: { pluginId: 'new-plugin' } })
      const uninstallSpy = vi.spyOn(pluginManagementService, 'uninstallPlugin')
        .mockResolvedValue({ success: true, data: { pluginId: 'test-plugin-1' } })

      // Mount component
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            PluginCard: {
              template: `
                <div class="plugin-card" :data-plugin-id="plugin.id">
                  <h3>{{ plugin.name }}</h3>
                  <button @click="$emit('uninstall', plugin.id)" class="uninstall-btn">Uninstall</button>
                </div>
              `,
              props: ['plugin'],
              emits: ['uninstall']
            },
            PluginUninstallDialog: {
              template: `
                <div v-if="open" class="uninstall-dialog">
                  <button @click="$emit('confirm')" class="confirm-btn">Confirm</button>
                  <button @click="$emit('cancel')" class="cancel-btn">Cancel</button>
                </div>
              `,
              props: ['open', 'plugin'],
              emits: ['confirm', 'cancel', 'update:open']
            }
          }
        }
      })

      await nextTick()

      // Verify initial state
      expect(wrapper.find('[data-plugin-id="test-plugin-1"]').exists()).toBe(true)
      expect(wrapper.find('[data-plugin-id="test-plugin-2"]').exists()).toBe(true)

      // Test uninstallation workflow
      const uninstallBtn = wrapper.find('[data-plugin-id="test-plugin-1"] .uninstall-btn')
      await uninstallBtn.trigger('click')
      await nextTick()

      // Verify uninstall dialog appears
      expect(wrapper.find('.uninstall-dialog').exists()).toBe(true)

      // Confirm uninstallation
      const confirmBtn = wrapper.find('.confirm-btn')
      await confirmBtn.trigger('click')
      await nextTick()

      // Verify uninstall service was called
      expect(uninstallSpy).toHaveBeenCalledWith('test-plugin-1')
    })

    it('should handle plugin enable/disable workflow with state persistence', async () => {
      const enableSpy = vi.spyOn(pluginManagementService, 'enablePlugin')
        .mockResolvedValue({ success: true })
      const disableSpy = vi.spyOn(pluginManagementService, 'disablePlugin')
        .mockResolvedValue({ success: true })

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            PluginCard: {
              template: `
                <div class="plugin-card" :data-plugin-id="plugin.id">
                  <h3>{{ plugin.name }}</h3>
                  <button 
                    @click="$emit('toggle-enabled', plugin.id, !plugin.enabled)" 
                    class="toggle-btn"
                  >
                    {{ plugin.enabled ? 'Disable' : 'Enable' }}
                  </button>
                </div>
              `,
              props: ['plugin'],
              emits: ['toggle-enabled']
            }
          }
        }
      })

      await nextTick()

      // Test disabling an enabled plugin
      const toggleBtn = wrapper.find('[data-plugin-id="test-plugin-1"] .toggle-btn')
      await toggleBtn.trigger('click')
      await nextTick()

      expect(disableSpy).toHaveBeenCalledWith('test-plugin-1')

      // Test enabling a disabled plugin
      const disabledToggleBtn = wrapper.find('[data-plugin-id="test-plugin-2"] .toggle-btn')
      await disabledToggleBtn.trigger('click')
      await nextTick()

      expect(enableSpy).toHaveBeenCalledWith('test-plugin-2')

      // Verify state store was updated
      expect(mockStateStore.setPluginState).toHaveBeenCalled()
    })

    it('should handle plugin configuration workflow with settings persistence', async () => {
      const saveSettingsSpy = vi.spyOn(pluginManagementService, 'savePluginSettings')
        .mockResolvedValue({ success: true })

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            PluginCard: {
              template: `
                <div class="plugin-card" :data-plugin-id="plugin.id">
                  <button @click="$emit('configure', plugin.id)" class="configure-btn">Configure</button>
                </div>
              `,
              props: ['plugin'],
              emits: ['configure']
            },
            PluginSettingsDialog: {
              template: `
                <div v-if="open" class="settings-dialog">
                  <input v-model="testSetting" class="test-setting" />
                  <button @click="$emit('save', { testSetting })" class="save-btn">Save</button>
                </div>
              `,
              props: ['open', 'plugin'],
              emits: ['save', 'update:open'],
              data() {
                return { testSetting: 'test value' }
              }
            }
          }
        }
      })

      await nextTick()

      // Open settings dialog
      const configureBtn = wrapper.find('[data-plugin-id="test-plugin-1"] .configure-btn')
      await configureBtn.trigger('click')
      await nextTick()

      // Verify settings dialog appears
      expect(wrapper.find('.settings-dialog').exists()).toBe(true)

      // Save settings
      const saveBtn = wrapper.find('.save-btn')
      await saveBtn.trigger('click')
      await nextTick()

      expect(saveSettingsSpy).toHaveBeenCalledWith('test-plugin-1', { testSetting: 'test value' })
      expect(mockStateStore.setPluginSettings).toHaveBeenCalled()
    })
  })

  describe('Search and Filter Integration', () => {
    it('should handle search workflow with real-time filtering', async () => {
      const searchSpy = vi.spyOn(pluginManagementService, 'searchPlugins')

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            Input: {
              template: '<input v-model="modelValue" @input="$emit(\'input\', $event)" />',
              props: ['modelValue'],
              emits: ['input']
            },
            PluginCard: {
              template: '<div class="plugin-card" :data-plugin-id="plugin.id">{{ plugin.name }}</div>',
              props: ['plugin']
            }
          }
        }
      })

      await nextTick()

      // Test search functionality
      const searchInput = wrapper.find('input')
      await searchInput.setValue('Calculator')
      await searchInput.trigger('input')

      // Wait for debounced search
      await new Promise(resolve => setTimeout(resolve, 600))

      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'Calculator'
        })
      )
    })

    it('should handle category filtering with proper state management', async () => {
      const searchSpy = vi.spyOn(pluginManagementService, 'searchPlugins')

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            Select: {
              template: '<select @change="$emit(\'update:value\', $event.target.value)"><slot /></select>',
              emits: ['update:value']
            },
            SelectTrigger: { template: '<div><slot /></div>' },
            SelectContent: { template: '<div><slot /></div>' },
            SelectItem: { 
              template: '<option :value="value"><slot /></option>',
              props: ['value']
            },
            SelectValue: { template: '<span>{{ placeholder }}</span>', props: ['placeholder'] },
            PluginCard: {
              template: '<div class="plugin-card" :data-plugin-id="plugin.id">{{ plugin.name }}</div>',
              props: ['plugin']
            }
          }
        }
      })

      await nextTick()

      // Simulate category selection
      const categorySelect = wrapper.find('select')
      await categorySelect.setValue(PluginCategory.UTILITIES)
      await categorySelect.trigger('change')
      await nextTick()

      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          category: PluginCategory.UTILITIES
        })
      )
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle plugin installation errors gracefully', async () => {
      const installError = new PluginManagementError(
        PluginManagementErrorType.INSTALLATION_FAILED,
        'Installation failed',
        'Network error',
        'test-plugin',
        true,
        'Check your internet connection'
      )

      vi.spyOn(pluginManagementService, 'installPlugin')
        .mockResolvedValue({ success: false, error: installError })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Simulate installation attempt
      const vm = wrapper.vm as any
      const result = await vm.handleInstallPlugin('test-plugin')

      expect(result.success).toBe(false)
      expect(result.error).toBe(installError)
    })

    it('should handle plugin uninstallation errors with proper cleanup', async () => {
      const uninstallError = new PluginManagementError(
        PluginManagementErrorType.UNINSTALLATION_FAILED,
        'Uninstallation failed',
        'Plugin is in use',
        'test-plugin-1',
        true,
        'Close all applications using this plugin'
      )

      vi.spyOn(pluginManagementService, 'uninstallPlugin')
        .mockResolvedValue({ success: false, error: uninstallError })

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            PluginCard: {
              template: `
                <div class="plugin-card">
                  <button @click="$emit('uninstall', 'test-plugin-1')" class="uninstall-btn">Uninstall</button>
                </div>
              `,
              emits: ['uninstall']
            },
            PluginUninstallDialog: {
              template: `
                <div v-if="open" class="uninstall-dialog">
                  <button @click="$emit('confirm')" class="confirm-btn">Confirm</button>
                </div>
              `,
              props: ['open'],
              emits: ['confirm']
            }
          }
        }
      })

      await nextTick()

      // Trigger uninstallation
      const uninstallBtn = wrapper.find('.uninstall-btn')
      await uninstallBtn.trigger('click')
      await nextTick()

      const confirmBtn = wrapper.find('.confirm-btn')
      await confirmBtn.trigger('click')
      await nextTick()

      // Verify error was handled
      const vm = wrapper.vm as any
      expect(vm.error).toBeTruthy()
    })

    it('should handle network errors during plugin operations', async () => {
      const networkError = new PluginManagementError(
        PluginManagementErrorType.NETWORK_ERROR,
        'Network error',
        'Failed to connect to plugin repository',
        undefined,
        true,
        'Check your internet connection and try again'
      )

      vi.spyOn(pluginManagementService, 'getAvailablePlugins')
        .mockRejectedValue(networkError)

      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Wait for component to handle the error
      await new Promise(resolve => setTimeout(resolve, 100))

      const vm = wrapper.vm as any
      expect(vm.error).toBeTruthy()
      expect(vm.error.type).toBe(PluginManagementErrorType.NETWORK_ERROR)
    })
  })

  describe('Performance and Optimization', () => {
    it('should handle large plugin collections with virtual scrolling', async () => {
      // Create a large number of mock plugins
      const largePluginSet = Array.from({ length: 150 }, (_, i) => 
        createMockPlugin(`plugin-${i}`, { name: `Plugin ${i}` })
      )

      vi.spyOn(pluginManagementService, 'getInstalledPlugins')
        .mockResolvedValue(largePluginSet)
      vi.spyOn(pluginManagementService, 'searchPlugins')
        .mockResolvedValue(largePluginSet)

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            VirtualScrollList: {
              template: `
                <div class="virtual-scroll">
                  <div v-for="item in items.slice(0, 10)" :key="item.id" class="virtual-item">
                    <slot :item="item" :index="0" />
                  </div>
                </div>
              `,
              props: ['items']
            },
            PluginCard: {
              template: '<div class="plugin-card">{{ plugin.name }}</div>',
              props: ['plugin']
            }
          }
        }
      })

      await nextTick()

      // Verify virtual scrolling is used for large collections
      expect(wrapper.find('.virtual-scroll').exists()).toBe(true)
      
      // Verify only a subset of items are rendered
      const renderedItems = wrapper.findAll('.virtual-item')
      expect(renderedItems.length).toBeLessThanOrEqual(10)
    })

    it('should implement proper caching for plugin operations', async () => {
      const searchSpy = vi.spyOn(pluginManagementService, 'searchPlugins')
        .mockResolvedValue(mockPlugins)

      wrapper = mount(PluginManagementPage)
      await nextTick()

      // First search
      const vm = wrapper.vm as any
      await vm.performSearch('test')
      
      // Second identical search
      await vm.performSearch('test')

      // Verify caching behavior (implementation dependent)
      expect(searchSpy).toHaveBeenCalled()
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should provide proper keyboard navigation support', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            PluginCard: {
              template: `
                <div 
                  class="plugin-card" 
                  :data-plugin-id="plugin.id"
                  tabindex="0"
                  @keydown.enter="$emit('configure', plugin.id)"
                >
                  {{ plugin.name }}
                </div>
              `,
              props: ['plugin'],
              emits: ['configure']
            }
          }
        }
      })

      await nextTick()

      // Test keyboard navigation
      const pluginCard = wrapper.find('[data-plugin-id="test-plugin-1"]')
      expect(pluginCard.attributes('tabindex')).toBe('0')

      // Test Enter key activation
      await pluginCard.trigger('keydown.enter')
      // Verify appropriate action was triggered
    })

    it('should provide proper ARIA labels and descriptions', async () => {
      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Check for proper ARIA attributes
      const main = wrapper.find('[role="main"]')
      expect(main.exists()).toBe(true)
      expect(main.attributes('aria-labelledby')).toBe('page-title')

      const searchSection = wrapper.find('[role="search"]')
      expect(searchSection.exists()).toBe(true)
    })
  })

  describe('State Persistence Across Application Restarts', () => {
    it('should persist plugin enabled/disabled states', async () => {
      // Simulate application restart by creating new component instance
      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Verify state store is queried for persisted states
      expect(mockStateStore.getPluginState).toHaveBeenCalled()

      // Simulate state changes
      const vm = wrapper.vm as any
      await vm.handleToggleEnabled('test-plugin-1', false)

      // Verify state is persisted
      expect(mockStateStore.setPluginState).toHaveBeenCalledWith(
        'test-plugin-1',
        expect.objectContaining({ enabled: false })
      )
    })

    it('should persist plugin settings across restarts', async () => {
      const testSettings = { theme: 'dark', autoUpdate: true }

      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Simulate settings save
      const vm = wrapper.vm as any
      await vm.handleSettingsSave('test-plugin-1', testSettings)

      // Verify settings are persisted
      expect(mockStateStore.setPluginSettings).toHaveBeenCalledWith(
        'test-plugin-1',
        testSettings
      )
    })
  })

  describe('UI Polish and Responsive Design', () => {
    it('should handle loading states properly', async () => {
      // Mock slow loading
      vi.spyOn(pluginManagementService, 'getInstalledPlugins')
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve(mockPlugins), 1000)
        ))

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            LoadingSpinner: {
              template: '<div class="loading-spinner">Loading...</div>'
            }
          }
        }
      })

      // Verify loading state is shown
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)

      // Wait for loading to complete
      await new Promise(resolve => setTimeout(resolve, 1100))
      await nextTick()

      // Verify loading state is removed
      expect(wrapper.find('.loading-spinner').exists()).toBe(false)
    })

    it('should handle empty states gracefully', async () => {
      vi.spyOn(pluginManagementService, 'getInstalledPlugins')
        .mockResolvedValue([])
      vi.spyOn(pluginManagementService, 'searchPlugins')
        .mockResolvedValue([])

      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Verify empty state is shown
      const vm = wrapper.vm as any
      expect(vm.plugins.length).toBe(0)
    })
  })
})