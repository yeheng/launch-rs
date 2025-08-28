import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PluginManagementPage from '../PluginManagementPage.vue'
import { PluginManagementService } from '@/lib/plugins/plugin-management-service'
import type { EnhancedSearchPlugin } from '@/lib/plugins/types'
import { PluginCategory, PluginUtils } from '@/lib/plugins/types'

// Mock the plugin management service
vi.mock('@/lib/plugins/plugin-management-service', () => ({
  PluginManagementService: {
    getInstance: vi.fn(() => ({
      getInstalledPlugins: vi.fn(),
      searchPlugins: vi.fn(),
      getPluginStatistics: vi.fn(),
      enablePlugin: vi.fn(),
      disablePlugin: vi.fn(),
      uninstallPlugin: vi.fn(),
      checkPluginHealth: vi.fn(),
    }))
  }
}))

// Mock UI components
vi.mock('@/components/ui/error-boundary', () => ({
  ErrorBoundary: {
    name: 'ErrorBoundary',
    template: '<div class="error-boundary"><slot /></div>',
    props: ['canRetry', 'canReset', 'onRetry', 'onReset', 'errorTitle', 'errorMessage', 'fallbackMessage'],
    emits: ['error', 'retry']
  }
}))

vi.mock('@/components/ui/breadcrumb', () => ({
  Breadcrumb: {
    name: 'Breadcrumb',
    template: '<nav class="breadcrumb"><span v-for="item in items" :key="item.label">{{ item.label }}</span></nav>',
    props: ['items']
  }
}))

vi.mock('@/components/ui/button', () => ({
  Button: {
    name: 'Button',
    template: '<button @click="$emit(\'click\')" :disabled="disabled" :class="[variant, size]"><slot /></button>',
    props: ['variant', 'size', 'disabled'],
    emits: ['click']
  }
}))

vi.mock('@/components/ui/input', () => ({
  Input: {
    name: 'Input',
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" :placeholder="placeholder" :class="$attrs.class" />',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue', 'input', 'keydown']
  }
}))

vi.mock('@/components/ui/select', () => ({
  Select: {
    name: 'Select',
    template: '<div class="select" @click="$emit(\'update:value\', \'test-category\')"><slot /></div>',
    props: ['modelValue'],
    emits: ['update:value']
  },
  SelectContent: {
    name: 'SelectContent',
    template: '<div class="select-content"><slot /></div>'
  },
  SelectItem: {
    name: 'SelectItem',
    template: '<div class="select-item" :data-value="value"><slot /></div>',
    props: ['value']
  },
  SelectTrigger: {
    name: 'SelectTrigger',
    template: '<div class="select-trigger"><slot /></div>'
  },
  SelectValue: {
    name: 'SelectValue',
    template: '<div class="select-value" :placeholder="placeholder"></div>',
    props: ['placeholder']
  }
}))

vi.mock('@/components/ui/loading', () => ({
  LoadingSpinner: {
    name: 'LoadingSpinner',
    template: '<div class="loading-spinner" :class="[size, variant]">Loading...</div>',
    props: ['size', 'variant']
  },
  LoadingSkeleton: {
    name: 'LoadingSkeleton',
    template: '<div class="loading-skeleton" :class="[variant]"></div>',
    props: ['variant']
  }
}))

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  })
}))

vi.mock('@/components/PluginCard.vue', () => ({
  default: {
    name: 'PluginCard',
    template: `
      <div class="plugin-card" :data-plugin-id="plugin.id">
        <span>{{ plugin.name }}</span>
        <button @click="$emit('toggle-enabled', plugin.id, !plugin.enabled)">Toggle</button>
        <button @click="$emit('configure', plugin.id)">Configure</button>
        <button @click="$emit('uninstall', plugin.id)">Uninstall</button>
        <button @click="$emit('view-details', plugin.id)">Details</button>
      </div>
    `,
    props: ['plugin', 'showDetails', 'showStatus', 'isLoading', 'showActions', 'compact', 'searchQuery'],
    emits: ['toggle-enabled', 'configure', 'uninstall', 'view-details']
  }
}))

vi.mock('@/components/PluginSettingsDialog.vue', () => ({
  default: {
    name: 'PluginSettingsDialog',
    template: '<div v-if="open" class="plugin-settings-dialog">Settings for {{ plugin?.name }}</div>',
    props: ['open', 'plugin', 'isLoading'],
    emits: ['update:open', 'save', 'reset']
  }
}))

vi.mock('@/components/PluginDetailsModal.vue', () => ({
  default: {
    name: 'PluginDetailsModal',
    template: '<div v-if="open" class="plugin-details-modal">Details for {{ plugin?.name }}</div>',
    props: ['open', 'plugin'],
    emits: ['update:open']
  }
}))

vi.mock('@/components/PluginUninstallDialog.vue', () => ({
  default: {
    name: 'PluginUninstallDialog',
    template: '<div v-if="open" class="plugin-uninstall-dialog">Uninstall {{ plugin?.name }}?</div>',
    props: ['open', 'plugin', 'isLoading'],
    emits: ['update:open', 'confirm']
  }
}))

// Mock router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
    query: {},
    path: '/plugins',
    name: 'plugins',
  }),
}))

// Mock composables
vi.mock('@/lib/composables/useNavigation', () => ({
  useNavigation: () => ({
    navigateHome: vi.fn(),
    navigateToSettings: vi.fn(),
  })
}))

describe('PluginManagementPage', () => {
  let wrapper: VueWrapper<any>
  let mockService: any
  let mockPlugins: EnhancedSearchPlugin[]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Create mock plugins
    mockPlugins = [
      {
        id: 'plugin-1',
        name: 'Test Plugin 1',
        description: 'First test plugin for unit testing',
        icon: {} as any,
        version: '1.0.0',
        enabled: true,
        priority: 1,
        search: vi.fn(),
        metadata: PluginUtils.createBasicMetadata({
          author: 'Test Author 1',
          category: PluginCategory.UTILITIES,
          keywords: ['test', 'utility'],
          installDate: new Date('2024-01-01'),
          lastUpdated: new Date('2024-01-15'),
          fileSize: 1024000,
          dependencies: []
        }),
        installation: PluginUtils.createBuiltInInstallation(),
        permissions: []
      },
      {
        id: 'plugin-2',
        name: 'Test Plugin 2',
        description: 'Second test plugin for productivity',
        icon: {} as any,
        version: '2.0.0',
        enabled: false,
        priority: 2,
        search: vi.fn(),
        metadata: PluginUtils.createBasicMetadata({
          author: 'Test Author 2',
          category: PluginCategory.PRODUCTIVITY,
          keywords: ['test', 'productivity'],
          installDate: new Date('2024-01-10'),
          lastUpdated: new Date('2024-01-20'),
          fileSize: 2048000,
          dependencies: []
        }),
        installation: {
          isInstalled: true,
          isBuiltIn: false,
          installPath: '/plugins/plugin-2',
          canUninstall: true
        },
        permissions: []
      }
    ]

    // Mock service methods
    mockService = {
      getInstalledPlugins: vi.fn().mockResolvedValue(mockPlugins),
      searchPlugins: vi.fn().mockResolvedValue(mockPlugins),
      getPluginStatistics: vi.fn().mockResolvedValue({
        total: 2,
        installed: 2,
        enabled: 1,
        byCategory: {
          [PluginCategory.UTILITIES]: 1,
          [PluginCategory.PRODUCTIVITY]: 1,
          [PluginCategory.DEVELOPMENT]: 0,
          [PluginCategory.SYSTEM]: 0,
          [PluginCategory.SEARCH]: 0
        },
        withIssues: 0
      }),
      enablePlugin: vi.fn().mockResolvedValue({ success: true }),
      disablePlugin: vi.fn().mockResolvedValue({ success: true }),
      uninstallPlugin: vi.fn().mockResolvedValue({ success: true }),
      checkPluginHealth: vi.fn().mockResolvedValue({
        status: 'healthy',
        lastCheck: new Date(),
        issues: [],
        metrics: {
          avgSearchTime: 100,
          memoryUsage: 1024,
          cpuUsage: 5,
          errorCount: 0,
          successRate: 100
        }
      })
    }

    vi.mocked(PluginManagementService.getInstance).mockReturnValue(mockService)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Page Rendering', () => {
    it('should render the page header and title', async () => {
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Plugin Management')
      expect(wrapper.text()).toContain('Manage your plugins, configure settings')
    })

    it('should render breadcrumb navigation', async () => {
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()

      const breadcrumb = wrapper.findComponent({ name: 'Breadcrumb' })
      expect(breadcrumb.exists()).toBe(true)
    })

    it('should render back to home button', async () => {
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()

      const backButton = wrapper.find('button:contains("Back to Home")')
      expect(backButton.exists()).toBe(true)
    })

    it('should display plugin statistics', async () => {
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0)) // Wait for async operations

      expect(wrapper.text()).toContain('2') // Total
      expect(wrapper.text()).toContain('1') // Enabled
      expect(wrapper.text()).toContain('Total')
      expect(wrapper.text()).toContain('Enabled')
      expect(wrapper.text()).toContain('Installed')
    })
  })

  describe('Plugin Loading', () => {
    it('should load plugins on mount', async () => {
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockService.getInstalledPlugins).toHaveBeenCalled()
      expect(mockService.getPluginStatistics).toHaveBeenCalled()
    })

    it('should show loading state while loading plugins', async () => {
      // Mock delayed response
      mockService.getInstalledPlugins.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockPlugins), 100))
      )

      wrapper = mount(PluginManagementPage)
      
      // Should show loading initially
      expect(wrapper.findComponent({ name: 'LoadingSkeleton' }).exists()).toBe(true)
    })

    it('should handle plugin loading errors', async () => {
      mockService.getInstalledPlugins.mockRejectedValue(new Error('Failed to load plugins'))

      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Error boundary should be triggered
      const errorBoundary = wrapper.findComponent({ name: 'ErrorBoundary' })
      expect(errorBoundary.exists()).toBe(true)
    })
  })

  describe('Plugin Display', () => {
    beforeEach(async () => {
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    it('should render plugin cards for each plugin', () => {
      const pluginCards = wrapper.findAllComponents({ name: 'PluginCard' })
      expect(pluginCards).toHaveLength(2)
    })

    it('should pass correct props to plugin cards', () => {
      const pluginCards = wrapper.findAllComponents({ name: 'PluginCard' })
      
      expect(pluginCards[0].props('plugin')).toEqual(mockPlugins[0])
      expect(pluginCards[1].props('plugin')).toEqual(mockPlugins[1])
    })

    it('should show empty state when no plugins are available', async () => {
      mockService.getInstalledPlugins.mockResolvedValue([])
      
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.text()).toContain('No plugins found')
    })
  })

  describe('Search Functionality', () => {
    beforeEach(async () => {
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    it('should render search input', () => {
      const searchInput = wrapper.findComponent({ name: 'Input' })
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.props('placeholder')).toContain('Search plugins')
    })

    it('should perform search when typing in search input', async () => {
      const searchInput = wrapper.findComponent({ name: 'Input' })
      
      await searchInput.vm.$emit('update:modelValue', 'test query')
      await wrapper.vm.$nextTick()

      // Should call search with debounce
      expect(mockService.searchPlugins).toHaveBeenCalledWith({
        query: 'test query',
        category: undefined,
        enabled: undefined,
        sortBy: 'name',
        sortOrder: 'asc'
      })
    })

    it('should clear search when clear button is clicked', async () => {
      const searchInput = wrapper.findComponent({ name: 'Input' })
      await searchInput.vm.$emit('update:modelValue', 'test query')
      await wrapper.vm.$nextTick()

      const clearButton = wrapper.find('button[aria-label="Clear search"]')
      if (clearButton.exists()) {
        await clearButton.trigger('click')
        expect(searchInput.props('modelValue')).toBe('')
      }
    })

    it('should clear search on escape key', async () => {
      const searchInput = wrapper.findComponent({ name: 'Input' })
      await searchInput.vm.$emit('update:modelValue', 'test query')
      await searchInput.vm.$emit('keydown', { key: 'Escape' })
      await wrapper.vm.$nextTick()

      expect(searchInput.props('modelValue')).toBe('')
    })
  })

  describe('Category Filtering', () => {
    beforeEach(async () => {
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    it('should render category select', () => {
      const categorySelect = wrapper.findComponent({ name: 'Select' })
      expect(categorySelect.exists()).toBe(true)
    })

    it('should filter plugins by category', async () => {
      const categorySelect = wrapper.findComponent({ name: 'Select' })
      await categorySelect.vm.$emit('update:value', PluginCategory.UTILITIES)
      await wrapper.vm.$nextTick()

      expect(mockService.searchPlugins).toHaveBeenCalledWith({
        query: '',
        category: PluginCategory.UTILITIES,
        enabled: undefined,
        sortBy: 'name',
        sortOrder: 'asc'
      })
    })

    it('should show all categories in select options', () => {
      const selectItems = wrapper.findAllComponents({ name: 'SelectItem' })
      expect(selectItems.length).toBeGreaterThan(0)
    })
  })

  describe('Plugin Actions', () => {
    beforeEach(async () => {
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    it('should handle plugin enable/disable toggle', async () => {
      const pluginCard = wrapper.findComponent({ name: 'PluginCard' })
      await pluginCard.vm.$emit('toggle-enabled', 'plugin-1', false)

      expect(mockService.disablePlugin).toHaveBeenCalledWith('plugin-1')
    })

    it('should handle plugin configuration', async () => {
      const pluginCard = wrapper.findComponent({ name: 'PluginCard' })
      await pluginCard.vm.$emit('configure', 'plugin-1')

      const settingsDialog = wrapper.findComponent({ name: 'PluginSettingsDialog' })
      expect(settingsDialog.exists()).toBe(true)
      expect(settingsDialog.props('open')).toBe(true)
    })

    it('should handle plugin details view', async () => {
      const pluginCard = wrapper.findComponent({ name: 'PluginCard' })
      await pluginCard.vm.$emit('view-details', 'plugin-1')

      const detailsModal = wrapper.findComponent({ name: 'PluginDetailsModal' })
      expect(detailsModal.exists()).toBe(true)
      expect(detailsModal.props('open')).toBe(true)
    })

    it('should handle plugin uninstallation', async () => {
      const pluginCard = wrapper.findComponent({ name: 'PluginCard' })
      await pluginCard.vm.$emit('uninstall', 'plugin-2')

      const uninstallDialog = wrapper.findComponent({ name: 'PluginUninstallDialog' })
      expect(uninstallDialog.exists()).toBe(true)
      expect(uninstallDialog.props('open')).toBe(true)
    })

    it('should confirm plugin uninstallation', async () => {
      const pluginCard = wrapper.findComponent({ name: 'PluginCard' })
      await pluginCard.vm.$emit('uninstall', 'plugin-2')

      const uninstallDialog = wrapper.findComponent({ name: 'PluginUninstallDialog' })
      await uninstallDialog.vm.$emit('confirm')

      expect(mockService.uninstallPlugin).toHaveBeenCalledWith('plugin-2')
    })
  })

  describe('Settings Dialog', () => {
    beforeEach(async () => {
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Open settings dialog
      const pluginCard = wrapper.findComponent({ name: 'PluginCard' })
      await pluginCard.vm.$emit('configure', 'plugin-1')
    })

    it('should save plugin settings', async () => {
      const settingsDialog = wrapper.findComponent({ name: 'PluginSettingsDialog' })
      const newSettings = { apiKey: 'new-key', maxResults: 20 }
      
      await settingsDialog.vm.$emit('save', 'plugin-1', newSettings)

      // Should update plugin configuration
      expect(wrapper.vm.plugins[0].settings?.values).toEqual(newSettings)
    })

    it('should reset plugin settings', async () => {
      const settingsDialog = wrapper.findComponent({ name: 'PluginSettingsDialog' })
      
      await settingsDialog.vm.$emit('reset', 'plugin-1')

      // Should show success message
      expect(wrapper.text()).toContain('Settings reset successfully')
    })

    it('should close settings dialog', async () => {
      const settingsDialog = wrapper.findComponent({ name: 'PluginSettingsDialog' })
      
      await settingsDialog.vm.$emit('update:open', false)

      expect(settingsDialog.props('open')).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle plugin action errors gracefully', async () => {
      mockService.enablePlugin.mockResolvedValue({ 
        success: false, 
        error: { message: 'Failed to enable plugin' } 
      })

      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const pluginCard = wrapper.findComponent({ name: 'PluginCard' })
      await pluginCard.vm.$emit('toggle-enabled', 'plugin-1', true)

      // Should show error message
      expect(wrapper.text()).toContain('Failed to enable plugin')
    })

    it('should retry loading plugins on error', async () => {
      mockService.getInstalledPlugins
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockPlugins)

      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()

      const errorBoundary = wrapper.findComponent({ name: 'ErrorBoundary' })
      await errorBoundary.vm.$emit('retry')

      expect(mockService.getInstalledPlugins).toHaveBeenCalledTimes(2)
    })
  })

  describe('Performance', () => {
    it('should debounce search input', async () => {
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()

      const searchInput = wrapper.findComponent({ name: 'Input' })
      
      // Rapid typing should only trigger search once after debounce
      await searchInput.vm.$emit('update:modelValue', 'a')
      await searchInput.vm.$emit('update:modelValue', 'ab')
      await searchInput.vm.$emit('update:modelValue', 'abc')

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 300))

      // Should only call search once with final value
      expect(mockService.searchPlugins).toHaveBeenCalledWith({
        query: 'abc',
        category: undefined,
        enabled: undefined,
        sortBy: 'name',
        sortOrder: 'asc'
      })
    })

    it('should handle large numbers of plugins efficiently', async () => {
      const manyPlugins = Array.from({ length: 100 }, (_, i) => ({
        ...mockPlugins[0],
        id: `plugin-${i}`,
        name: `Plugin ${i}`
      }))

      mockService.getInstalledPlugins.mockResolvedValue(manyPlugins)

      const startTime = Date.now()
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // Should render within 1 second
      expect(wrapper.findAllComponents({ name: 'PluginCard' })).toHaveLength(100)
    })
  })

  describe('Accessibility', () => {
    beforeEach(async () => {
      wrapper = mount(PluginManagementPage)
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    it('should have proper ARIA labels', () => {
      const searchInput = wrapper.findComponent({ name: 'Input' })
      expect(searchInput.exists()).toBe(true)

      const clearButton = wrapper.find('button[aria-label="Clear search"]')
      if (clearButton.exists()) {
        expect(clearButton.attributes('aria-label')).toBe('Clear search')
      }
    })

    it('should support keyboard navigation', async () => {
      const searchInput = wrapper.findComponent({ name: 'Input' })
      
      // Should handle escape key
      await searchInput.vm.$emit('keydown', { key: 'Escape' })
      expect(searchInput.props('modelValue')).toBe('')
    })

    it('should have proper heading hierarchy', () => {
      const heading = wrapper.find('h1')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toBe('Plugin Management')
    })
  })
})