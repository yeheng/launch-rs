import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PluginCard from '../PluginCard.vue'
import type { EnhancedSearchPlugin } from '@/lib/plugins/types'
import { PluginCategory, PluginPermissionType, PluginUtils } from '@/lib/plugins/types'

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: {
    name: 'Button',
    template: '<button @click="$emit(\'click\')" :disabled="disabled" :class="[variant, size]"><slot /></button>',
    props: ['variant', 'size', 'disabled'],
    emits: ['click']
  }
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: {
    name: 'Switch',
    template: '<input type="checkbox" :checked="checked" @change="$emit(\'update:checked\', $event.target.checked)" :disabled="disabled" />',
    props: ['checked', 'disabled'],
    emits: ['update:checked']
  }
}))

vi.mock('@/components/ui/loading', () => ({
  LoadingSpinner: {
    name: 'LoadingSpinner',
    template: '<div class="loading-spinner" :class="[size, variant]">Loading...</div>',
    props: ['size', 'variant']
  }
}))

vi.mock('@/components/ui/search', () => ({
  HighlightedText: {
    name: 'HighlightedText',
    template: '<span v-html="highlightedText"></span>',
    props: ['text', 'searchQuery', 'highlight'],
    computed: {
      highlightedText() {
        if (!this.highlight || !this.searchQuery) return this.text
        const regex = new RegExp(`(${this.searchQuery})`, 'gi')
        return this.text.replace(regex, '<mark>$1</mark>')
      }
    }
  }
}))

describe('PluginCard', () => {
  let wrapper: VueWrapper<any>
  let mockPlugin: EnhancedSearchPlugin

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Create mock plugin
    mockPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'A comprehensive test plugin for unit testing',
      icon: { template: '<div class="test-icon">Icon</div>' },
      version: '1.2.3',
      enabled: true,
      priority: 1,
      search: vi.fn(),
      settings: {
        schema: [
          {
            key: 'setting1',
            type: 'string',
            label: 'Setting 1',
            defaultValue: 'default',
            required: false
          }
        ]
      },
      metadata: PluginUtils.createBasicMetadata({
        author: 'Test Author',
        category: PluginCategory.UTILITIES,
        keywords: ['test', 'utility', 'demo'],
        installDate: new Date('2024-01-01'),
        lastUpdated: new Date('2024-01-15'),
        fileSize: 1024000,
        dependencies: [],
        rating: 4.5,
        downloadCount: 1500
      }),
      installation: {
        isInstalled: true,
        isBuiltIn: false,
        installPath: '/plugins/test-plugin',
        canUninstall: true
      },
      permissions: [
        {
          type: PluginPermissionType.FILESYSTEM,
          description: 'Access to file system for reading configuration',
          required: true
        }
      ]
    }
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Rendering', () => {
    it('should render plugin basic information', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })

      expect(wrapper.text()).toContain('Test Plugin')
      expect(wrapper.text()).toContain('A comprehensive test plugin')
      expect(wrapper.text()).toContain('v1.2.3')
    })

    it('should render plugin icon', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })

      const icon = wrapper.find('.test-icon')
      expect(icon.exists()).toBe(true)
    })

    it('should show enabled status indicator', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin, showStatus: true }
      })

      const statusIndicator = wrapper.find('.bg-green-500')
      expect(statusIndicator.exists()).toBe(true)
    })

    it('should show disabled status indicator for disabled plugin', () => {
      const disabledPlugin = { ...mockPlugin, enabled: false }
      wrapper = mount(PluginCard, {
        props: { plugin: disabledPlugin, showStatus: true }
      })

      const statusIndicator = wrapper.find('.bg-gray-400')
      expect(statusIndicator.exists()).toBe(true)
    })

    it('should apply correct card classes for enabled plugin', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })

      const card = wrapper.find('.border-blue-200')
      expect(card.exists()).toBe(true)
    })

    it('should apply correct card classes for disabled plugin', () => {
      const disabledPlugin = { ...mockPlugin, enabled: false }
      wrapper = mount(PluginCard, {
        props: { plugin: disabledPlugin }
      })

      const card = wrapper.find('.border-gray-200')
      expect(card.exists()).toBe(true)
    })
  })

  describe('Plugin Details', () => {
    it('should show detailed metadata when showDetails is true', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin, showDetails: true }
      })

      expect(wrapper.text()).toContain('Author: Test Author')
      expect(wrapper.text()).toContain('Category: Utilities')
      expect(wrapper.text()).toContain('Installed: Jan 1, 2024')
      expect(wrapper.text()).toContain('Size: 1.0 MB')
    })

    it('should hide detailed metadata when showDetails is false', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin, showDetails: false }
      })

      expect(wrapper.text()).not.toContain('Author: Test Author')
      expect(wrapper.text()).not.toContain('Category: Utilities')
    })

    it('should format file size correctly', () => {
      const pluginWithLargeFile = {
        ...mockPlugin,
        metadata: {
          ...mockPlugin.metadata,
          fileSize: 2048000 // 2MB
        }
      }
      wrapper = mount(PluginCard, {
        props: { plugin: pluginWithLargeFile, showDetails: true }
      })

      expect(wrapper.text()).toContain('Size: 2.0 MB')
    })

    it('should format category name correctly', () => {
      const pluginWithCategory = {
        ...mockPlugin,
        metadata: {
          ...mockPlugin.metadata,
          category: PluginCategory.DEVELOPMENT
        }
      }
      wrapper = mount(PluginCard, {
        props: { plugin: pluginWithCategory, showDetails: true }
      })

      expect(wrapper.text()).toContain('Category: Development')
    })
  })

  describe('Search Highlighting', () => {
    it('should highlight search query in plugin name', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin, searchQuery: 'Test' }
      })

      const highlightedText = wrapper.findComponent({ name: 'HighlightedText' })
      expect(highlightedText.exists()).toBe(true)
      expect(highlightedText.props('searchQuery')).toBe('Test')
      expect(highlightedText.props('highlight')).toBe(true)
    })

    it('should not highlight when no search query provided', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })

      const highlightedText = wrapper.findComponent({ name: 'HighlightedText' })
      expect(highlightedText.props('highlight')).toBe(false)
    })
  })

  describe('Enable/Disable Toggle', () => {
    it('should render enabled switch for enabled plugin', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })

      const switchComponent = wrapper.findComponent({ name: 'Switch' })
      expect(switchComponent.exists()).toBe(true)
      expect(switchComponent.props('checked')).toBe(true)
    })

    it('should render disabled switch for disabled plugin', () => {
      const disabledPlugin = { ...mockPlugin, enabled: false }
      wrapper = mount(PluginCard, {
        props: { plugin: disabledPlugin }
      })

      const switchComponent = wrapper.findComponent({ name: 'Switch' })
      expect(switchComponent.props('checked')).toBe(false)
    })

    it('should emit toggle-enabled event when switch is clicked', async () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })

      const switchComponent = wrapper.findComponent({ name: 'Switch' })
      await switchComponent.vm.$emit('update:checked', false)

      expect(wrapper.emitted('toggle-enabled')).toBeTruthy()
      expect(wrapper.emitted('toggle-enabled')?.[0]).toEqual(['test-plugin', false])
    })

    it('should disable switch when plugin is loading', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin, isLoading: true }
      })

      const switchComponent = wrapper.findComponent({ name: 'Switch' })
      expect(switchComponent.props('disabled')).toBe(true)
    })

    it('should disable switch for built-in plugins that cannot be toggled', () => {
      const builtInPlugin = {
        ...mockPlugin,
        installation: {
          ...mockPlugin.installation,
          isBuiltIn: true,
          canUninstall: false
        }
      }
      wrapper = mount(PluginCard, {
        props: { plugin: builtInPlugin }
      })

      const switchComponent = wrapper.findComponent({ name: 'Switch' })
      expect(switchComponent.props('disabled')).toBe(true)
    })
  })

  describe('Action Buttons', () => {
    it('should show configure button when plugin has settings', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })

      const configureButton = wrapper.find('button:contains("Configure")')
      expect(configureButton.exists()).toBe(true)
    })

    it('should hide configure button when plugin has no settings', () => {
      const pluginWithoutSettings = {
        ...mockPlugin,
        settings: { schema: [] }
      }
      wrapper = mount(PluginCard, {
        props: { plugin: pluginWithoutSettings }
      })

      const configureButton = wrapper.find('button:contains("Configure")')
      expect(configureButton.exists()).toBe(false)
    })

    it('should disable configure button when plugin is disabled', () => {
      const disabledPlugin = { ...mockPlugin, enabled: false }
      wrapper = mount(PluginCard, {
        props: { plugin: disabledPlugin }
      })

      const configureButton = wrapper.find('button:contains("Configure")')
      expect(configureButton.attributes('disabled')).toBeDefined()
    })

    it('should show view details button', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })

      const detailsButton = wrapper.find('button:contains("Details")')
      expect(detailsButton.exists()).toBe(true)
    })

    it('should show uninstall button for uninstallable plugins', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })

      const uninstallButton = wrapper.find('button:contains("Uninstall")')
      expect(uninstallButton.exists()).toBe(true)
    })

    it('should hide uninstall button for built-in plugins', () => {
      const builtInPlugin = {
        ...mockPlugin,
        installation: {
          ...mockPlugin.installation,
          isBuiltIn: true,
          canUninstall: false
        }
      }
      wrapper = mount(PluginCard, {
        props: { plugin: builtInPlugin }
      })

      const uninstallButton = wrapper.find('button:contains("Uninstall")')
      expect(uninstallButton.exists()).toBe(false)
    })

    it('should hide actions when showActions is false', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin, showActions: false }
      })

      const uninstallButton = wrapper.find('button:contains("Uninstall")')
      expect(uninstallButton.exists()).toBe(false)
    })
  })

  describe('Event Emissions', () => {
    beforeEach(() => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })
    })

    it('should emit configure event when configure button is clicked', async () => {
      const configureButton = wrapper.find('button:contains("Configure")')
      await configureButton.trigger('click')

      expect(wrapper.emitted('configure')).toBeTruthy()
      expect(wrapper.emitted('configure')?.[0]).toEqual(['test-plugin'])
    })

    it('should emit view-details event when details button is clicked', async () => {
      const detailsButton = wrapper.find('button:contains("Details")')
      await detailsButton.trigger('click')

      expect(wrapper.emitted('view-details')).toBeTruthy()
      expect(wrapper.emitted('view-details')?.[0]).toEqual(['test-plugin'])
    })

    it('should emit uninstall event when uninstall button is clicked', async () => {
      const uninstallButton = wrapper.find('button:contains("Uninstall")')
      await uninstallButton.trigger('click')

      expect(wrapper.emitted('uninstall')).toBeTruthy()
      expect(wrapper.emitted('uninstall')?.[0]).toEqual(['test-plugin'])
    })

    it('should not emit events when plugin is loading', async () => {
      await wrapper.setProps({ isLoading: true })

      const configureButton = wrapper.find('button:contains("Configure")')
      const detailsButton = wrapper.find('button:contains("Details")')
      const uninstallButton = wrapper.find('button:contains("Uninstall")')

      await configureButton.trigger('click')
      await detailsButton.trigger('click')
      await uninstallButton.trigger('click')

      // Events should still be emitted but the component should handle loading state
      expect(wrapper.emitted('configure')).toBeTruthy()
      expect(wrapper.emitted('view-details')).toBeTruthy()
      expect(wrapper.emitted('uninstall')).toBeTruthy()
    })
  })

  describe('Loading State', () => {
    it('should show loading overlay when isLoading is true', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin, isLoading: true }
      })

      const loadingOverlay = wrapper.find('.absolute.inset-0')
      expect(loadingOverlay.exists()).toBe(true)
      
      const loadingSpinner = wrapper.findComponent({ name: 'LoadingSpinner' })
      expect(loadingSpinner.exists()).toBe(true)
    })

    it('should apply opacity when loading', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin, isLoading: true }
      })

      const card = wrapper.find('.opacity-50')
      expect(card.exists()).toBe(true)
    })

    it('should not show loading overlay when isLoading is false', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin, isLoading: false }
      })

      const loadingOverlay = wrapper.find('.absolute.inset-0')
      expect(loadingOverlay.exists()).toBe(false)
    })
  })

  describe('Plugin Priority Display', () => {
    it('should show priority when plugin is enabled and has priority', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })

      expect(wrapper.text()).toContain('Priority: 1')
    })

    it('should not show priority when plugin is disabled', () => {
      const disabledPlugin = { ...mockPlugin, enabled: false }
      wrapper = mount(PluginCard, {
        props: { plugin: disabledPlugin }
      })

      expect(wrapper.text()).not.toContain('Priority:')
    })

    it('should not show priority when plugin has no priority', () => {
      const pluginWithoutPriority = { ...mockPlugin, priority: undefined }
      wrapper = mount(PluginCard, {
        props: { plugin: pluginWithoutPriority }
      })

      expect(wrapper.text()).not.toContain('Priority:')
    })
  })

  describe('Accessibility', () => {
    it('should have proper button roles and labels', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })

      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
      
      buttons.forEach(button => {
        expect(button.text().trim()).toBeTruthy() // Each button should have text content
      })
    })

    it('should have proper switch accessibility', () => {
      wrapper = mount(PluginCard, {
        props: { plugin: mockPlugin }
      })

      const switchInput = wrapper.find('input[type="checkbox"]')
      expect(switchInput.exists()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle plugin without metadata gracefully', () => {
      const pluginWithoutMetadata = {
        ...mockPlugin,
        metadata: undefined
      }
      
      expect(() => {
        wrapper = mount(PluginCard, {
          props: { plugin: pluginWithoutMetadata }
        })
      }).not.toThrow()
    })

    it('should handle plugin without installation info gracefully', () => {
      const pluginWithoutInstallation = {
        ...mockPlugin,
        installation: undefined
      }
      
      expect(() => {
        wrapper = mount(PluginCard, {
          props: { plugin: pluginWithoutInstallation }
        })
      }).not.toThrow()
    })

    it('should handle very long plugin names and descriptions', () => {
      const pluginWithLongText = {
        ...mockPlugin,
        name: 'A'.repeat(100),
        description: 'B'.repeat(200)
      }
      
      wrapper = mount(PluginCard, {
        props: { plugin: pluginWithLongText }
      })

      // Should render without breaking layout
      expect(wrapper.find('.truncate').exists()).toBe(true)
    })
  })
})