/**
 * Tests for plugin error scenarios and recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PluginManagementPage from '@/views/PluginManagementPage.vue'
import { 
  pluginManagementService, 
  PluginManagementError, 
  PluginManagementErrorType 
} from '../plugin-management-service'
import { pluginErrorHandler } from '../plugin-error-handler'
import type { EnhancedSearchPlugin } from '../types'
import { PluginCategory } from '../types'

// Mock dependencies
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
const mockToast = {
  toasts: [],
  removeToast: vi.fn(),
  handleToastAction: vi.fn(),
  pluginSuccess: vi.fn(),
  pluginError: vi.fn(),
  pluginWarning: vi.fn(),
  loading: vi.fn(),
  updateToast: vi.fn()
}

vi.mock('@/components/ui/toast', () => ({
  useToast: () => mockToast,
  ToastContainer: { template: '<div></div>' }
}))

// Mock UI components
vi.mock('@/components/ui/error-boundary', () => ({
  ErrorBoundary: { 
    template: '<div><slot /></div>',
    methods: {
      retry: vi.fn(),
      reset: vi.fn()
    }
  }
}))

const createMockPlugin = (id: string): EnhancedSearchPlugin => ({
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
  settings: {}
})

describe('Plugin Error Scenarios and Recovery', () => {
  let wrapper: any
  let mockPlugins: EnhancedSearchPlugin[]

  beforeEach(() => {
    vi.clearAllMocks()
    mockPlugins = [
      createMockPlugin('test-plugin-1'),
      createMockPlugin('test-plugin-2'),
      createMockPlugin('test-plugin-3')
    ]
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Network Error Handling', () => {
    it('should handle network timeout errors gracefully', async () => {
      const networkError = new PluginManagementError(
        PluginManagementErrorType.NETWORK_ERROR,
        'Network timeout',
        'Request timed out after 30 seconds',
        undefined,
        true,
        'Check your internet connection and try again'
      )

      vi.spyOn(pluginManagementService, 'getInstalledPlugins')
        .mockRejectedValue(networkError)

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            ErrorBoundary: {
              template: `
                <div class="error-boundary">
                  <div v-if="hasError" class="error-display">
                    <p class="error-message">{{ errorMessage }}</p>
                    <button @click="retry" class="retry-btn">Retry</button>
                    <button @click="reset" class="reset-btn">Reset</button>
                  </div>
                  <slot v-else />
                </div>
              `,
              data() {
                return { hasError: false, errorMessage: '' }
              },
              methods: {
                retry: vi.fn(),
                reset: vi.fn()
              },
              mounted() {
                this.$nextTick(() => {
                  this.hasError = true
                  this.errorMessage = 'Network error occurred'
                })
              }
            }
          }
        }
      })

      await nextTick()

      // Verify error is displayed
      expect(wrapper.find('.error-display').exists()).toBe(true)
      expect(wrapper.find('.error-message').text()).toContain('Network error')

      // Test retry functionality
      const retryBtn = wrapper.find('.retry-btn')
      expect(retryBtn.exists()).toBe(true)

      // Mock successful retry
      vi.spyOn(pluginManagementService, 'getInstalledPlugins')
        .mockResolvedValue(mockPlugins)

      await retryBtn.trigger('click')
      expect(wrapper.vm.retry).toHaveBeenCalled()
    })

    it('should handle API rate limiting errors', async () => {
      const rateLimitError = new PluginManagementError(
        PluginManagementErrorType.NETWORK_ERROR,
        'Rate limit exceeded',
        'Too many requests. Please wait before trying again.',
        undefined,
        true,
        'Wait 60 seconds before retrying'
      )

      vi.spyOn(pluginManagementService, 'searchPlugins')
        .mockRejectedValue(rateLimitError)

      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Simulate search that triggers rate limit
      const vm = wrapper.vm as any
      await vm.performSearch('test')

      expect(mockToast.pluginError).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit'),
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Retry in 60s'
          })
        })
      )
    })

    it('should implement exponential backoff for retries', async () => {
      let attemptCount = 0
      const networkError = new PluginManagementError(
        PluginManagementErrorType.NETWORK_ERROR,
        'Connection failed',
        'Unable to connect to server'
      )

      vi.spyOn(pluginManagementService, 'getInstalledPlugins')
        .mockImplementation(async () => {
          attemptCount++
          if (attemptCount < 3) {
            throw networkError
          }
          return mockPlugins
        })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      const vm = wrapper.vm as any
      
      // Test retry with exponential backoff
      const retryPromise = vm.retryWithBackoff(
        () => pluginManagementService.getInstalledPlugins(),
        3, // max retries
        1000 // base delay
      )

      await retryPromise

      expect(attemptCount).toBe(3)
    })
  })

  describe('Plugin Installation Error Handling', () => {
    it('should handle plugin validation failures', async () => {
      const validationError = new PluginManagementError(
        PluginManagementErrorType.VALIDATION_FAILED,
        'Plugin validation failed',
        'Plugin signature is invalid',
        'malicious-plugin',
        false,
        'Only install plugins from trusted sources'
      )

      vi.spyOn(pluginManagementService, 'installPlugin')
        .mockResolvedValue({ success: false, error: validationError })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      const vm = wrapper.vm as any
      const result = await vm.handleInstallPlugin('malicious-plugin')

      expect(result.success).toBe(false)
      expect(mockToast.pluginError).toHaveBeenCalledWith(
        expect.stringContaining('validation failed'),
        expect.objectContaining({
          persistent: true // Non-recoverable errors should be persistent
        })
      )
    })

    it('should handle insufficient permissions errors', async () => {
      const permissionError = new PluginManagementError(
        PluginManagementErrorType.PERMISSION_DENIED,
        'Permission denied',
        'Insufficient permissions to install plugin',
        'restricted-plugin',
        true,
        'Run the application as administrator'
      )

      vi.spyOn(pluginManagementService, 'installPlugin')
        .mockResolvedValue({ success: false, error: permissionError })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      const vm = wrapper.vm as any
      await vm.handleInstallPlugin('restricted-plugin')

      expect(mockToast.pluginError).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied'),
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Learn More'
          })
        })
      )
    })

    it('should handle dependency resolution errors', async () => {
      const dependencyError = new PluginManagementError(
        PluginManagementErrorType.DEPENDENCY_ERROR,
        'Dependency error',
        'Required dependency "core-lib v2.0" not found',
        'dependent-plugin',
        true,
        'Install the required dependencies first'
      )

      vi.spyOn(pluginManagementService, 'installPlugin')
        .mockResolvedValue({ success: false, error: dependencyError })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      const vm = wrapper.vm as any
      await vm.handleInstallPlugin('dependent-plugin')

      expect(mockToast.pluginError).toHaveBeenCalledWith(
        expect.stringContaining('Dependency error'),
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Install Dependencies'
          })
        })
      )
    })
  })

  describe('Plugin Uninstallation Error Handling', () => {
    it('should handle plugins in use during uninstallation', async () => {
      const inUseError = new PluginManagementError(
        PluginManagementErrorType.UNINSTALLATION_FAILED,
        'Plugin in use',
        'Cannot uninstall plugin while it is being used',
        'active-plugin',
        true,
        'Close all applications using this plugin and try again'
      )

      vi.spyOn(pluginManagementService, 'uninstallPlugin')
        .mockResolvedValue({ success: false, error: inUseError })

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            PluginUninstallDialog: {
              template: `
                <div v-if="open" class="uninstall-dialog">
                  <div v-if="error" class="error-message">{{ error.getUserFriendlyMessage() }}</div>
                  <button @click="$emit('confirm')" class="confirm-btn">Force Uninstall</button>
                  <button @click="$emit('cancel')" class="cancel-btn">Cancel</button>
                </div>
              `,
              props: ['open', 'plugin', 'error'],
              emits: ['confirm', 'cancel']
            }
          }
        }
      })

      await nextTick()

      const vm = wrapper.vm as any
      vm.selectedPluginForUninstall = mockPlugins[0]
      vm.uninstallDialogOpen = true
      vm.uninstallError = inUseError

      await nextTick()

      expect(wrapper.find('.error-message').text()).toContain('Plugin in use')
      expect(wrapper.find('.confirm-btn').text()).toBe('Force Uninstall')
    })

    it('should handle file system errors during uninstallation', async () => {
      const fsError = new PluginManagementError(
        PluginManagementErrorType.UNINSTALLATION_FAILED,
        'File system error',
        'Unable to delete plugin files',
        'fs-error-plugin',
        true,
        'Check file permissions and try again'
      )

      vi.spyOn(pluginManagementService, 'uninstallPlugin')
        .mockResolvedValue({ success: false, error: fsError })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      const vm = wrapper.vm as any
      await vm.handleUninstallConfirm('fs-error-plugin')

      expect(mockToast.pluginError).toHaveBeenCalledWith(
        expect.stringContaining('File system error'),
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Retry'
          })
        })
      )
    })

    it('should handle partial uninstallation cleanup', async () => {
      const partialError = new PluginManagementError(
        PluginManagementErrorType.UNINSTALLATION_FAILED,
        'Partial uninstallation',
        'Plugin files removed but configuration remains',
        'partial-plugin',
        true,
        'Manual cleanup may be required'
      )

      vi.spyOn(pluginManagementService, 'uninstallPlugin')
        .mockResolvedValue({ 
          success: false, 
          error: partialError,
          data: {
            partialCleanup: true,
            remainingFiles: ['/config/plugin.json'],
            cleanupInstructions: 'Delete remaining configuration files manually'
          }
        })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      const vm = wrapper.vm as any
      await vm.handleUninstallConfirm('partial-plugin')

      expect(mockToast.pluginWarning).toHaveBeenCalledWith(
        expect.stringContaining('Partial uninstallation'),
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'View Cleanup Instructions'
          })
        })
      )
    })
  })

  describe('Plugin Configuration Error Handling', () => {
    it('should handle invalid configuration values', async () => {
      const configError = new PluginManagementError(
        PluginManagementErrorType.CONFIGURATION_ERROR,
        'Invalid configuration',
        'API endpoint URL is not valid',
        'config-plugin',
        true,
        'Please enter a valid URL'
      )

      vi.spyOn(pluginManagementService, 'savePluginSettings')
        .mockResolvedValue({ success: false, error: configError })

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            PluginSettingsDialog: {
              template: `
                <div v-if="open" class="settings-dialog">
                  <div v-if="error" class="config-error">{{ error.getUserFriendlyMessage() }}</div>
                  <input v-model="apiEndpoint" class="api-input" />
                  <button @click="$emit('save', { apiEndpoint })" class="save-btn">Save</button>
                </div>
              `,
              props: ['open', 'plugin', 'error'],
              emits: ['save'],
              data() {
                return { apiEndpoint: 'invalid-url' }
              }
            }
          }
        }
      })

      await nextTick()

      const vm = wrapper.vm as any
      vm.selectedPluginForSettings = mockPlugins[0]
      vm.settingsDialogOpen = true
      vm.settingsError = configError

      await nextTick()

      expect(wrapper.find('.config-error').text()).toContain('Invalid configuration')
    })

    it('should validate settings before saving', async () => {
      const validationSpy = vi.spyOn(pluginManagementService, 'validatePluginSettings')
        .mockResolvedValue({
          isValid: false,
          errors: [
            { field: 'maxResults', message: 'Must be between 1 and 100' },
            { field: 'apiKey', message: 'API key is required' }
          ]
        })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      const vm = wrapper.vm as any
      const result = await vm.handleSettingsSave('test-plugin', {
        maxResults: 150,
        apiKey: ''
      })

      expect(validationSpy).toHaveBeenCalled()
      expect(result.success).toBe(false)
      expect(mockToast.pluginError).toHaveBeenCalledWith(
        expect.stringContaining('validation'),
        expect.any(Object)
      )
    })
  })

  describe('System Resource Error Handling', () => {
    it('should handle memory exhaustion errors', async () => {
      const memoryError = new PluginManagementError(
        PluginManagementErrorType.SYSTEM_ERROR,
        'Memory exhaustion',
        'Not enough memory to load plugin',
        'memory-heavy-plugin',
        true,
        'Close other applications and try again'
      )

      vi.spyOn(pluginManagementService, 'enablePlugin')
        .mockResolvedValue({ success: false, error: memoryError })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      const vm = wrapper.vm as any
      await vm.handleToggleEnabled('memory-heavy-plugin', true)

      expect(mockToast.pluginError).toHaveBeenCalledWith(
        expect.stringContaining('Memory exhaustion'),
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'System Info'
          })
        })
      )
    })

    it('should handle disk space errors', async () => {
      const diskError = new PluginManagementError(
        PluginManagementErrorType.SYSTEM_ERROR,
        'Insufficient disk space',
        'Not enough disk space to install plugin',
        'large-plugin',
        true,
        'Free up disk space and try again'
      )

      vi.spyOn(pluginManagementService, 'installPlugin')
        .mockResolvedValue({ success: false, error: diskError })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      const vm = wrapper.vm as any
      await vm.handleInstallPlugin('large-plugin')

      expect(mockToast.pluginError).toHaveBeenCalledWith(
        expect.stringContaining('disk space'),
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Check Disk Space'
          })
        })
      )
    })
  })

  describe('Error Recovery Mechanisms', () => {
    it('should implement automatic error recovery for transient errors', async () => {
      let attemptCount = 0
      const transientError = new PluginManagementError(
        PluginManagementErrorType.NETWORK_ERROR,
        'Temporary network error',
        'Connection temporarily unavailable',
        undefined,
        true
      )

      vi.spyOn(pluginManagementService, 'getInstalledPlugins')
        .mockImplementation(async () => {
          attemptCount++
          if (attemptCount < 3) {
            throw transientError
          }
          return mockPlugins
        })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Wait for automatic retry
      await new Promise(resolve => setTimeout(resolve, 2000))

      expect(attemptCount).toBe(3)
    })

    it('should provide manual recovery options for persistent errors', async () => {
      const persistentError = new PluginManagementError(
        PluginManagementErrorType.CONFIGURATION_ERROR,
        'Configuration corrupted',
        'Plugin configuration file is corrupted',
        'corrupted-plugin',
        true,
        'Reset plugin configuration'
      )

      vi.spyOn(pluginManagementService, 'getPluginDetails')
        .mockRejectedValue(persistentError)

      wrapper = mount(PluginManagementPage)
      await nextTick()

      const vm = wrapper.vm as any
      await vm.handleViewDetails('corrupted-plugin')

      expect(mockToast.pluginError).toHaveBeenCalledWith(
        expect.stringContaining('Configuration corrupted'),
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Reset Configuration'
          })
        })
      )
    })

    it('should implement graceful degradation for non-critical errors', async () => {
      const nonCriticalError = new PluginManagementError(
        PluginManagementErrorType.NETWORK_ERROR,
        'Statistics unavailable',
        'Unable to fetch plugin statistics',
        undefined,
        true
      )

      vi.spyOn(pluginManagementService, 'getPluginStatistics')
        .mockRejectedValue(nonCriticalError)

      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Plugin list should still be available
      const vm = wrapper.vm as any
      expect(vm.plugins).toBeDefined()
      expect(vm.plugins.length).toBeGreaterThan(0)

      // Statistics should be null but not crash the app
      expect(vm.statistics).toBeNull()
    })

    it('should provide error reporting functionality', async () => {
      const reportablError = new PluginManagementError(
        PluginManagementErrorType.SYSTEM_ERROR,
        'Unexpected error',
        'An unexpected error occurred',
        'error-plugin',
        false
      )

      const reportSpy = vi.spyOn(pluginErrorHandler, 'reportError')
        .mockResolvedValue({ success: true, reportId: 'ERR-12345' })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      const vm = wrapper.vm as any
      await vm.handleError(reportablError)

      expect(reportSpy).toHaveBeenCalledWith(reportablError)
      expect(mockToast.pluginError).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error'),
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Report Error'
          })
        })
      )
    })
  })

  describe('Error Prevention and Monitoring', () => {
    it('should implement health checks to prevent errors', async () => {
      const healthCheckSpy = vi.spyOn(pluginManagementService, 'performHealthCheck')
        .mockResolvedValue({
          healthy: false,
          issues: [
            { type: 'memory', severity: 'warning', message: 'High memory usage' },
            { type: 'performance', severity: 'error', message: 'Slow response time' }
          ]
        })

      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Simulate periodic health check
      const vm = wrapper.vm as any
      await vm.performHealthCheck()

      expect(healthCheckSpy).toHaveBeenCalled()
      expect(mockToast.pluginWarning).toHaveBeenCalledWith(
        expect.stringContaining('Health issues detected'),
        expect.any(Object)
      )
    })

    it('should monitor plugin performance and warn about issues', async () => {
      const performanceData = {
        'slow-plugin': { avgResponseTime: 5000, errorRate: 0.15 },
        'fast-plugin': { avgResponseTime: 100, errorRate: 0.01 }
      }

      vi.spyOn(pluginManagementService, 'getPerformanceMetrics')
        .mockResolvedValue(performanceData)

      wrapper = mount(PluginManagementPage)
      await nextTick()

      const vm = wrapper.vm as any
      await vm.checkPerformanceIssues()

      expect(mockToast.pluginWarning).toHaveBeenCalledWith(
        expect.stringContaining('Performance issues'),
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'View Details'
          })
        })
      )
    })
  })
})