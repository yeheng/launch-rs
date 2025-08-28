import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PluginSettingsDialog from '../PluginSettingsDialog.vue'
import type { EnhancedSearchPlugin, PluginSettingDefinition } from '@/lib/plugins/types'
import { PluginCategory, PluginUtils } from '@/lib/plugins/types'

// Mock UI components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: {
    name: 'Dialog',
    template: '<div v-if="open" class="dialog"><slot /></div>',
    props: ['open'],
    emits: ['update:open']
  },
  DialogContent: {
    name: 'DialogContent',
    template: '<div class="dialog-content"><slot /></div>',
    props: ['class']
  },
  DialogHeader: {
    name: 'DialogHeader',
    template: '<div class="dialog-header"><slot /></div>'
  },
  DialogTitle: {
    name: 'DialogTitle',
    template: '<h2 class="dialog-title"><slot /></h2>',
    props: ['class']
  },
  DialogDescription: {
    name: 'DialogDescription',
    template: '<p class="dialog-description"><slot /></p>'
  },
  DialogFooter: {
    name: 'DialogFooter',
    template: '<div class="dialog-footer"><slot /></div>',
    props: ['class']
  }
}))

vi.mock('@/components/ui/button', () => ({
  Button: {
    name: 'Button',
    template: '<button @click="$emit(\'click\')" :disabled="disabled" :class="[variant, size]"><slot /></button>',
    props: ['variant', 'size', 'disabled', 'type'],
    emits: ['click']
  }
}))

vi.mock('@/components/ui/input', () => ({
  Input: {
    name: 'Input',
    template: '<input :value="value" @input="$emit(\'input\', $event)" :disabled="disabled" :placeholder="placeholder" :type="type" :readonly="readonly" :class="$attrs.class" />',
    props: ['value', 'disabled', 'placeholder', 'type', 'readonly', 'id'],
    emits: ['input']
  }
}))

vi.mock('@/components/ui/label', () => ({
  Label: {
    name: 'Label',
    template: '<label :for="for" :class="$attrs.class"><slot /></label>',
    props: ['for']
  }
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: {
    name: 'Switch',
    template: '<input type="checkbox" :checked="checked" @change="$emit(\'update:checked\', $event.target.checked)" :disabled="disabled" :id="id" />',
    props: ['checked', 'disabled', 'id'],
    emits: ['update:checked']
  }
}))

vi.mock('@/components/ui/select', () => ({
  Select: {
    name: 'Select',
    template: '<div class="select" @click="$emit(\'update:value\', \'test-value\')"><slot /></div>',
    props: ['value', 'disabled'],
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
    template: '<div class="select-trigger" :class="$attrs.class"><slot /></div>'
  },
  SelectValue: {
    name: 'SelectValue',
    template: '<div class="select-value" :placeholder="placeholder"></div>',
    props: ['placeholder']
  }
}))

describe('PluginSettingsDialog', () => {
  let wrapper: VueWrapper<any>
  let mockPlugin: EnhancedSearchPlugin

  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Create mock plugin with various setting types
    mockPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'A test plugin with settings',
      icon: { template: '<div class="test-icon">Icon</div>' },
      version: '1.0.0',
      enabled: true,
      priority: 1,
      search: vi.fn(),
      settings: {
        schema: [
          {
            key: 'stringSetting',
            type: 'string',
            label: 'String Setting',
            description: 'A string setting for testing',
            defaultValue: 'default value',
            required: true
          },
          {
            key: 'numberSetting',
            type: 'number',
            label: 'Number Setting',
            description: 'A number setting for testing',
            defaultValue: 42,
            required: false
          },
          {
            key: 'booleanSetting',
            type: 'boolean',
            label: 'Boolean Setting',
            description: 'A boolean setting for testing',
            defaultValue: true,
            required: false
          },
          {
            key: 'selectSetting',
            type: 'select',
            label: 'Select Setting',
            description: 'A select setting for testing',
            defaultValue: 'option1',
            required: false,
            options: [
              { label: 'Option 1', value: 'option1' },
              { label: 'Option 2', value: 'option2' },
              { label: 'Option 3', value: 'option3' }
            ]
          },
          {
            key: 'multiselectSetting',
            type: 'multiselect',
            label: 'Multiselect Setting',
            description: 'A multiselect setting for testing',
            defaultValue: ['option1'],
            required: false,
            options: [
              { label: 'Option A', value: 'optionA' },
              { label: 'Option B', value: 'optionB' },
              { label: 'Option C', value: 'optionC' }
            ]
          },
          {
            key: 'fileSetting',
            type: 'file',
            label: 'File Setting',
            description: 'A file setting for testing',
            defaultValue: '',
            required: false
          },
          {
            key: 'directorySetting',
            type: 'directory',
            label: 'Directory Setting',
            description: 'A directory setting for testing',
            defaultValue: '',
            required: false
          }
        ] as PluginSettingDefinition[],
        values: {
          stringSetting: 'current value',
          numberSetting: 100,
          booleanSetting: false,
          selectSetting: 'option2',
          multiselectSetting: ['optionA', 'optionB'],
          fileSetting: '/path/to/file.txt',
          directorySetting: '/path/to/directory'
        }
      },
      metadata: PluginUtils.createBasicMetadata({
        author: 'Test Author',
        category: PluginCategory.UTILITIES,
        keywords: ['test'],
        installDate: new Date(),
        lastUpdated: new Date(),
        fileSize: 1024,
        dependencies: []
      }),
      installation: PluginUtils.createBuiltInInstallation(),
      permissions: []
    }
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Dialog Rendering', () => {
    it('should render dialog when open is true', () => {
      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: mockPlugin
        }
      })

      expect(wrapper.find('.dialog').exists()).toBe(true)
      expect(wrapper.find('.dialog-title').text()).toContain('Test Plugin Settings')
    })

    it('should not render dialog when open is false', () => {
      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: false,
          plugin: mockPlugin
        }
      })

      expect(wrapper.find('.dialog').exists()).toBe(false)
    })

    it('should render plugin icon and name in title', () => {
      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: mockPlugin
        }
      })

      expect(wrapper.find('.test-icon').exists()).toBe(true)
      expect(wrapper.find('.dialog-title').text()).toContain('Test Plugin Settings')
    })

    it('should render description', () => {
      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: mockPlugin
        }
      })

      expect(wrapper.find('.dialog-description').text()).toContain('Configure Test Plugin plugin settings')
    })
  })

  describe('Settings Rendering', () => {
    beforeEach(() => {
      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: mockPlugin
        }
      })
    })

    it('should render all setting types', () => {
      // String setting
      const stringInput = wrapper.find('input[type="text"]')
      expect(stringInput.exists()).toBe(true)

      // Number setting
      const numberInput = wrapper.find('input[type="number"]')
      expect(numberInput.exists()).toBe(true)

      // Boolean setting
      const booleanInput = wrapper.find('input[type="checkbox"]')
      expect(booleanInput.exists()).toBe(true)

      // Select setting
      const selectComponent = wrapper.findComponent({ name: 'Select' })
      expect(selectComponent.exists()).toBe(true)

      // Multiselect setting
      const multiselectCheckboxes = wrapper.findAll('input[type="checkbox"]')
      expect(multiselectCheckboxes.length).toBeGreaterThan(1) // Boolean + multiselect options

      // File setting
      const fileInputs = wrapper.findAll('input[readonly]')
      expect(fileInputs.length).toBeGreaterThanOrEqual(1)
    })

    it('should show setting labels and descriptions', () => {
      expect(wrapper.text()).toContain('String Setting')
      expect(wrapper.text()).toContain('A string setting for testing')
      expect(wrapper.text()).toContain('Number Setting')
      expect(wrapper.text()).toContain('Boolean Setting')
    })

    it('should show required indicators', () => {
      const requiredIndicators = wrapper.findAll('.text-red-500')
      expect(requiredIndicators.length).toBeGreaterThan(0)
    })

    it('should display current setting values', () => {
      // Check if current values are displayed
      const stringInput = wrapper.find('input[type="text"]')
      expect(stringInput.attributes('value')).toBe('current value')

      const numberInput = wrapper.find('input[type="number"]')
      expect(numberInput.attributes('value')).toBe('100')
    })
  })

  describe('Setting Interactions', () => {
    beforeEach(() => {
      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: mockPlugin
        }
      })
    })

    it('should update string setting value', async () => {
      const stringInput = wrapper.find('input[type="text"]')
      await stringInput.setValue('new value')
      await stringInput.trigger('input')

      // Should emit save event
      expect(wrapper.emitted('save')).toBeTruthy()
    })

    it('should update number setting value', async () => {
      const numberInput = wrapper.find('input[type="number"]')
      await numberInput.setValue('200')
      await numberInput.trigger('input')

      expect(wrapper.emitted('save')).toBeTruthy()
    })

    it('should update boolean setting value', async () => {
      const booleanInput = wrapper.find('input[type="checkbox"]')
      await booleanInput.setChecked(true)

      expect(wrapper.emitted('save')).toBeTruthy()
    })

    it('should update select setting value', async () => {
      const selectComponent = wrapper.findComponent({ name: 'Select' })
      await selectComponent.vm.$emit('update:value', 'option3')

      expect(wrapper.emitted('save')).toBeTruthy()
    })

    it('should handle multiselect changes', async () => {
      const multiselectCheckboxes = wrapper.findAll('input[type="checkbox"]')
      // Skip the first checkbox (boolean setting) and interact with multiselect
      if (multiselectCheckboxes.length > 1) {
        await multiselectCheckboxes[1].setChecked(true)
        expect(wrapper.emitted('save')).toBeTruthy()
      }
    })
  })

  describe('Validation', () => {
    beforeEach(() => {
      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: mockPlugin
        }
      })
    })

    it('should show validation error for required empty field', async () => {
      const stringInput = wrapper.find('input[type="text"]')
      await stringInput.setValue('')
      await stringInput.trigger('input')

      // Wait for validation
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('is required')
    })

    it('should show validation error count', async () => {
      const stringInput = wrapper.find('input[type="text"]')
      await stringInput.setValue('')
      await stringInput.trigger('input')

      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('validation error')
    })

    it('should validate number inputs', async () => {
      const numberInput = wrapper.find('input[type="number"]')
      await numberInput.setValue('not-a-number')
      await numberInput.trigger('input')

      await wrapper.vm.$nextTick()

      // Should show validation error for invalid number
      expect(wrapper.text()).toContain('must be a valid number')
    })

    it('should clear validation errors when fixed', async () => {
      const stringInput = wrapper.find('input[type="text"]')
      
      // Create error
      await stringInput.setValue('')
      await stringInput.trigger('input')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).toContain('is required')
      
      // Fix error
      await stringInput.setValue('valid value')
      await stringInput.trigger('input')
      await wrapper.vm.$nextTick()
      
      expect(wrapper.text()).not.toContain('is required')
    })
  })

  describe('File and Directory Selection', () => {
    beforeEach(() => {
      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: mockPlugin
        }
      })
      
      // Mock prompt for file/directory selection
      global.prompt = vi.fn()
    })

    it('should handle file selection', async () => {
      vi.mocked(global.prompt).mockReturnValue('/selected/file.txt')
      
      const browseButtons = wrapper.findAll('button:contains("Browse")')
      if (browseButtons.length > 0) {
        await browseButtons[0].trigger('click')
        
        expect(global.prompt).toHaveBeenCalled()
        expect(wrapper.emitted('save')).toBeTruthy()
      }
    })

    it('should handle directory selection', async () => {
      vi.mocked(global.prompt).mockReturnValue('/selected/directory')
      
      const browseButtons = wrapper.findAll('button:contains("Browse")')
      if (browseButtons.length > 1) {
        await browseButtons[1].trigger('click')
        
        expect(global.prompt).toHaveBeenCalled()
        expect(wrapper.emitted('save')).toBeTruthy()
      }
    })

    it('should handle cancelled file selection', async () => {
      vi.mocked(global.prompt).mockReturnValue(null)
      
      const browseButtons = wrapper.findAll('button:contains("Browse")')
      if (browseButtons.length > 0) {
        await browseButtons[0].trigger('click')
        
        expect(global.prompt).toHaveBeenCalled()
        // Should not emit save when cancelled
        expect(wrapper.emitted('save')).toBeFalsy()
      }
    })
  })

  describe('Reset to Defaults', () => {
    beforeEach(() => {
      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: mockPlugin
        }
      })
    })

    it('should reset all settings to default values', async () => {
      const resetButton = wrapper.find('button:contains("Reset to Defaults")')
      await resetButton.trigger('click')

      expect(wrapper.emitted('reset')).toBeTruthy()
      expect(wrapper.emitted('reset')?.[0]).toEqual(['test-plugin'])
      expect(wrapper.emitted('save')).toBeTruthy()
    })

    it('should disable reset button when no changes', async () => {
      // Initially should be disabled since no changes made
      const resetButton = wrapper.find('button:contains("Reset to Defaults")')
      expect(resetButton.attributes('disabled')).toBeDefined()
    })

    it('should enable reset button when changes are made', async () => {
      const stringInput = wrapper.find('input[type="text"]')
      await stringInput.setValue('changed value')
      await stringInput.trigger('input')

      await wrapper.vm.$nextTick()

      const resetButton = wrapper.find('button:contains("Reset to Defaults")')
      expect(resetButton.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Dialog Controls', () => {
    beforeEach(() => {
      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: mockPlugin
        }
      })
    })

    it('should emit update:open when close button is clicked', async () => {
      const closeButton = wrapper.find('button:contains("Close")')
      await closeButton.trigger('click')

      expect(wrapper.emitted('update:open')).toBeTruthy()
      expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
    })

    it('should disable all controls when loading', async () => {
      await wrapper.setProps({ isLoading: true })

      const inputs = wrapper.findAll('input')
      const buttons = wrapper.findAll('button')

      inputs.forEach(input => {
        expect(input.attributes('disabled')).toBeDefined()
      })

      buttons.forEach(button => {
        expect(button.attributes('disabled')).toBeDefined()
      })
    })

    it('should show loading overlay when loading', async () => {
      await wrapper.setProps({ isLoading: true })

      const loadingOverlay = wrapper.find('.absolute.inset-0')
      expect(loadingOverlay.exists()).toBe(true)
    })
  })

  describe('No Settings State', () => {
    it('should show no settings message when plugin has no settings', () => {
      const pluginWithoutSettings = {
        ...mockPlugin,
        settings: { schema: [], values: {} }
      }

      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: pluginWithoutSettings
        }
      })

      expect(wrapper.text()).toContain('This plugin has no configurable settings')
    })

    it('should handle null plugin gracefully', () => {
      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: null
        }
      })

      expect(wrapper.text()).toContain('This plugin has no configurable settings')
    })
  })

  describe('Settings Groups', () => {
    it('should group settings correctly', () => {
      const pluginWithGroups = {
        ...mockPlugin,
        settings: {
          schema: [
            {
              key: 'generalSetting',
              type: 'string',
              label: 'General Setting',
              defaultValue: 'general',
              group: 'general'
            },
            {
              key: 'advancedSetting',
              type: 'string',
              label: 'Advanced Setting',
              defaultValue: 'advanced',
              group: 'advanced'
            }
          ] as PluginSettingDefinition[],
          values: {}
        }
      }

      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: pluginWithGroups
        }
      })

      expect(wrapper.text()).toContain('General')
      expect(wrapper.text()).toContain('Advanced')
    })
  })

  describe('Conditional Settings', () => {
    it('should show/hide settings based on dependencies', async () => {
      const pluginWithDependencies = {
        ...mockPlugin,
        settings: {
          schema: [
            {
              key: 'enableFeature',
              type: 'boolean',
              label: 'Enable Feature',
              defaultValue: false
            },
            {
              key: 'featureOption',
              type: 'string',
              label: 'Feature Option',
              defaultValue: 'option',
              dependsOn: 'enableFeature'
            }
          ] as PluginSettingDefinition[],
          values: { enableFeature: false, featureOption: 'option' }
        }
      }

      wrapper = mount(PluginSettingsDialog, {
        props: {
          open: true,
          plugin: pluginWithDependencies
        }
      })

      // Feature option should be hidden initially
      expect(wrapper.text()).not.toContain('Feature Option')

      // Enable the feature
      const enableCheckbox = wrapper.find('input[type="checkbox"]')
      await enableCheckbox.setChecked(true)
      await wrapper.vm.$nextTick()

      // Feature option should now be visible
      expect(wrapper.text()).toContain('Feature Option')
    })
  })
})