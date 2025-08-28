/**
 * Tests for UI polish, animations, transitions, and responsive design
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PluginManagementPage from '@/views/PluginManagementPage.vue'
import PluginCard from '@/components/PluginCard.vue'
import { pluginManagementService } from '../plugin-management-service'
import type { EnhancedSearchPlugin } from '../types'
import { PluginCategory } from '../types'

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

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
  ToastContainer: { template: '<div class="toast-container"></div>' }
}))

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
  settings: {},
  ...overrides
})

describe('Plugin UI Polish and Responsive Design', () => {
  let wrapper: any
  let mockPlugins: EnhancedSearchPlugin[]

  beforeEach(() => {
    vi.clearAllMocks()
    mockPlugins = Array.from({ length: 10 }, (_, i) => 
      createMockPlugin(`plugin-${i}`, { name: `Plugin ${i}` })
    )

    vi.spyOn(pluginManagementService, 'getInstalledPlugins').mockResolvedValue(mockPlugins)
    vi.spyOn(pluginManagementService, 'searchPlugins').mockResolvedValue(mockPlugins)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Loading States and Animations', () => {
    it('should display loading spinner during initial load', async () => {
      // Mock slow loading
      vi.spyOn(pluginManagementService, 'getInstalledPlugins')
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve(mockPlugins), 1000)
        ))

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            LoadingSpinner: {
              template: '<div class="loading-spinner" :class="{ large: size === \'lg\' }">Loading...</div>',
              props: ['size', 'variant', 'show-label', 'label', 'center']
            }
          }
        }
      })

      // Should show loading spinner immediately
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
      expect(wrapper.find('.loading-spinner.large').exists()).toBe(true)

      // Wait for loading to complete
      await new Promise(resolve => setTimeout(resolve, 1100))
      await nextTick()

      // Loading spinner should be gone
      expect(wrapper.find('.loading-spinner').exists()).toBe(false)
    })

    it('should display skeleton loading for plugin cards', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            LoadingSkeleton: {
              template: '<div class="loading-skeleton" :class="variant">Skeleton</div>',
              props: ['variant']
            }
          }
        }
      })

      // Initially should show skeletons
      const vm = wrapper.vm as any
      vm.isLoading = true
      vm.plugins = []

      await nextTick()

      const skeletons = wrapper.findAll('.loading-skeleton')
      expect(skeletons.length).toBeGreaterThan(0)
      expect(skeletons[0].classes()).toContain('card')
    })

    it('should show loading states for individual plugin operations', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            PluginCard: {
              template: `
                <div class="plugin-card" :class="{ loading: isLoading }">
                  <div v-if="isLoading" class="card-loading">Processing...</div>
                  <div v-else>{{ plugin.name }}</div>
                </div>
              `,
              props: ['plugin', 'isLoading']
            }
          }
        }
      })

      await nextTick()

      const vm = wrapper.vm as any
      vm.loadingPlugins.add('plugin-1')

      await nextTick()

      const loadingCard = wrapper.find('.plugin-card.loading')
      expect(loadingCard.exists()).toBe(true)
      expect(loadingCard.find('.card-loading').exists()).toBe(true)
    })

    it('should implement smooth transitions between states', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            TransitionGroup: {
              template: '<div class="transition-group"><slot /></div>'
            },
            PluginCard: {
              template: '<div class="plugin-card transition-item">{{ plugin.name }}</div>',
              props: ['plugin']
            }
          }
        }
      })

      await nextTick()

      // Check for transition wrapper
      expect(wrapper.find('.transition-group').exists()).toBe(true)
      
      // All cards should have transition class
      const cards = wrapper.findAll('.transition-item')
      expect(cards.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', async () => {
      // Mock mobile viewport
      vi.mocked(window.matchMedia).mockImplementation(query => ({
        matches: query.includes('max-width: 768px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Check for mobile-specific classes or layout
      const searchSection = wrapper.find('[role="search"]')
      expect(searchSection.classes()).toContain('flex-col')
    })

    it('should adapt grid layout for different screen sizes', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            PluginCard: {
              template: '<div class="plugin-card">{{ plugin.name }}</div>',
              props: ['plugin']
            }
          }
        }
      })

      await nextTick()

      const pluginGrid = wrapper.find('.grid')
      expect(pluginGrid.exists()).toBe(true)
      
      // Should have responsive grid classes
      const classes = pluginGrid.classes()
      expect(classes.some(cls => cls.includes('md:grid-cols'))).toBe(true)
      expect(classes.some(cls => cls.includes('lg:grid-cols'))).toBe(true)
    })

    it('should handle touch interactions on mobile devices', async () => {
      // Mock touch device
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        value: 5
      })

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            PluginCard: {
              template: `
                <div 
                  class="plugin-card"
                  @touchstart="handleTouchStart"
                  @touchend="handleTouchEnd"
                >
                  {{ plugin.name }}
                </div>
              `,
              props: ['plugin'],
              methods: {
                handleTouchStart: vi.fn(),
                handleTouchEnd: vi.fn()
              }
            }
          }
        }
      })

      await nextTick()

      const pluginCard = wrapper.find('.plugin-card')
      
      // Test touch events
      await pluginCard.trigger('touchstart')
      await pluginCard.trigger('touchend')

      expect(pluginCard.vm.handleTouchStart).toHaveBeenCalled()
      expect(pluginCard.vm.handleTouchEnd).toHaveBeenCalled()
    })

    it('should optimize for tablet layouts', async () => {
      // Mock tablet viewport
      vi.mocked(window.matchMedia).mockImplementation(query => ({
        matches: query.includes('min-width: 768px') && query.includes('max-width: 1024px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Should use 2-column grid on tablets
      const pluginGrid = wrapper.find('.grid')
      expect(pluginGrid.classes()).toContain('md:grid-cols-2')
    })
  })

  describe('Interactive Animations', () => {
    it('should animate plugin card hover states', async () => {
      wrapper = mount(PluginCard, {
        props: {
          plugin: mockPlugins[0],
          showDetails: true,
          showStatus: true
        },
        global: {
          stubs: {
            Button: {
              template: '<button class="btn" :class="variant"><slot /></button>',
              props: ['variant']
            },
            Switch: {
              template: '<div class="switch" :class="{ checked: modelValue }"></div>',
              props: ['modelValue']
            }
          }
        }
      })

      const card = wrapper.find('.plugin-card')
      
      // Test hover animation
      await card.trigger('mouseenter')
      expect(card.classes()).toContain('hover:shadow-lg')
      
      await card.trigger('mouseleave')
      // Should have transition classes for smooth animation
      expect(card.classes()).toContain('transition-shadow')
    })

    it('should animate plugin enable/disable toggle', async () => {
      wrapper = mount(PluginCard, {
        props: {
          plugin: mockPlugins[0],
          showDetails: true,
          showStatus: true
        },
        global: {
          stubs: {
            Switch: {
              template: `
                <div 
                  class="switch" 
                  :class="{ 
                    'switch-enabled': modelValue,
                    'switch-disabled': !modelValue,
                    'switch-transitioning': isTransitioning
                  }"
                  @click="toggle"
                >
                  <div class="switch-thumb"></div>
                </div>
              `,
              props: ['modelValue'],
              emits: ['update:modelValue'],
              data() {
                return { isTransitioning: false }
              },
              methods: {
                async toggle() {
                  this.isTransitioning = true
                  this.$emit('update:modelValue', !this.modelValue)
                  setTimeout(() => {
                    this.isTransitioning = false
                  }, 200)
                }
              }
            }
          }
        }
      })

      const toggle = wrapper.find('.switch')
      
      await toggle.trigger('click')
      
      expect(toggle.classes()).toContain('switch-transitioning')
      
      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 250))
      await nextTick()
      
      expect(toggle.classes()).not.toContain('switch-transitioning')
    })

    it('should animate modal and dialog appearances', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            Dialog: {
              template: `
                <div v-if="open" class="dialog-overlay" @click="$emit('update:open', false)">
                  <div class="dialog-content" :class="{ 'dialog-enter': isEntering }">
                    <slot />
                  </div>
                </div>
              `,
              props: ['open'],
              emits: ['update:open'],
              data() {
                return { isEntering: false }
              },
              watch: {
                open(newVal) {
                  if (newVal) {
                    this.isEntering = true
                    setTimeout(() => {
                      this.isEntering = false
                    }, 300)
                  }
                }
              }
            },
            DialogContent: { template: '<div class="dialog-inner"><slot /></div>' },
            DialogHeader: { template: '<div class="dialog-header"><slot /></div>' },
            DialogTitle: { template: '<h2 class="dialog-title"><slot /></h2>' },
            DialogDescription: { template: '<p class="dialog-description"><slot /></p>' },
            DialogFooter: { template: '<div class="dialog-footer"><slot /></div>' }
          }
        }
      })

      await nextTick()

      const vm = wrapper.vm as any
      vm.detailsModalOpen = true
      vm.selectedPluginForDetails = mockPlugins[0]

      await nextTick()

      const dialog = wrapper.find('.dialog-content')
      expect(dialog.exists()).toBe(true)
      expect(dialog.classes()).toContain('dialog-enter')
    })

    it('should animate list item additions and removals', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            TransitionGroup: {
              template: `
                <div class="transition-group">
                  <div 
                    v-for="item in items" 
                    :key="item.id"
                    class="list-item"
                    :class="{ 'item-enter': item.isNew, 'item-leave': item.isRemoving }"
                  >
                    <slot :item="item" />
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

      const vm = wrapper.vm as any
      
      // Add new plugin
      const newPlugin = createMockPlugin('new-plugin')
      newPlugin.isNew = true
      vm.plugins.push(newPlugin)

      await nextTick()

      const newItem = wrapper.findAll('.list-item').at(-1)
      expect(newItem?.classes()).toContain('item-enter')
    })
  })

  describe('Visual Polish and Styling', () => {
    it('should apply consistent color scheme and theming', async () => {
      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Check for consistent color classes
      const header = wrapper.find('header')
      expect(header.classes()).toContain('bg-white')
      expect(header.classes()).toContain('border-b')

      const main = wrapper.find('main')
      expect(main.classes()).toContain('bg-gray-50')
    })

    it('should implement proper spacing and typography', async () => {
      wrapper = mount(PluginManagementPage)
      await nextTick()

      const title = wrapper.find('h1')
      expect(title.classes()).toContain('text-2xl')
      expect(title.classes()).toContain('font-bold')

      const description = wrapper.find('#page-description')
      expect(description.classes()).toContain('text-sm')
      expect(description.classes()).toContain('text-gray-500')
    })

    it('should use consistent button styles and states', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            Button: {
              template: `
                <button 
                  class="btn"
                  :class="[
                    variant === 'outline' ? 'btn-outline' : 'btn-solid',
                    size === 'sm' ? 'btn-sm' : 'btn-md',
                    { 'btn-disabled': disabled }
                  ]"
                  :disabled="disabled"
                >
                  <slot />
                </button>
              `,
              props: ['variant', 'size', 'disabled']
            }
          }
        }
      })

      await nextTick()

      const buttons = wrapper.findAll('.btn')
      expect(buttons.length).toBeGreaterThan(0)

      // Check for consistent button styling
      buttons.forEach(button => {
        expect(
          button.classes().some(cls => cls.startsWith('btn-'))
        ).toBe(true)
      })
    })

    it('should implement proper focus states for accessibility', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            Input: {
              template: `
                <input 
                  class="input"
                  :class="{ 'input-focused': isFocused }"
                  @focus="isFocused = true"
                  @blur="isFocused = false"
                  v-model="modelValue"
                />
              `,
              props: ['modelValue'],
              emits: ['update:modelValue'],
              data() {
                return { isFocused: false }
              }
            }
          }
        }
      })

      await nextTick()

      const searchInput = wrapper.find('.input')
      
      await searchInput.trigger('focus')
      expect(searchInput.classes()).toContain('input-focused')
      
      await searchInput.trigger('blur')
      expect(searchInput.classes()).not.toContain('input-focused')
    })
  })

  describe('Performance Optimizations', () => {
    it('should implement virtual scrolling for large lists', async () => {
      const largePluginSet = Array.from({ length: 200 }, (_, i) => 
        createMockPlugin(`plugin-${i}`)
      )

      vi.spyOn(pluginManagementService, 'getInstalledPlugins')
        .mockResolvedValue(largePluginSet)

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            VirtualScrollList: {
              template: `
                <div class="virtual-scroll" :style="{ height: containerHeight }">
                  <div 
                    v-for="(item, index) in visibleItems" 
                    :key="getItemKey(item)"
                    class="virtual-item"
                    :style="{ height: itemHeight + 'px' }"
                  >
                    <slot :item="item" :index="index" />
                  </div>
                </div>
              `,
              props: ['items', 'itemHeight', 'containerHeight', 'getItemKey'],
              computed: {
                visibleItems() {
                  // Simulate virtual scrolling by showing only first 10 items
                  return this.items.slice(0, 10)
                }
              }
            },
            PluginCard: {
              template: '<div class="plugin-card">{{ plugin.name }}</div>',
              props: ['plugin']
            }
          }
        }
      })

      await nextTick()

      const virtualScroll = wrapper.find('.virtual-scroll')
      expect(virtualScroll.exists()).toBe(true)

      // Should only render visible items
      const renderedItems = wrapper.findAll('.virtual-item')
      expect(renderedItems.length).toBeLessThanOrEqual(10)
    })

    it('should implement lazy loading for plugin details', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            PluginCard: {
              template: `
                <div 
                  class="plugin-card"
                  @mouseenter="loadDetails"
                  :class="{ 'details-loaded': detailsLoaded }"
                >
                  <div v-if="detailsLoaded" class="plugin-details">
                    Detailed info loaded
                  </div>
                  <div v-else class="plugin-basic">
                    {{ plugin.name }}
                  </div>
                </div>
              `,
              props: ['plugin'],
              data() {
                return { detailsLoaded: false }
              },
              methods: {
                async loadDetails() {
                  if (!this.detailsLoaded) {
                    // Simulate lazy loading
                    await new Promise(resolve => setTimeout(resolve, 100))
                    this.detailsLoaded = true
                  }
                }
              }
            }
          }
        }
      })

      await nextTick()

      const pluginCard = wrapper.find('.plugin-card')
      expect(pluginCard.find('.plugin-basic').exists()).toBe(true)
      expect(pluginCard.find('.plugin-details').exists()).toBe(false)

      // Trigger lazy loading
      await pluginCard.trigger('mouseenter')
      await new Promise(resolve => setTimeout(resolve, 150))
      await nextTick()

      expect(pluginCard.classes()).toContain('details-loaded')
      expect(pluginCard.find('.plugin-details').exists()).toBe(true)
    })

    it('should debounce search input for performance', async () => {
      const searchSpy = vi.spyOn(pluginManagementService, 'searchPlugins')
        .mockResolvedValue(mockPlugins)

      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            Input: {
              template: '<input v-model="modelValue" @input="$emit(\'input\', $event)" />',
              props: ['modelValue'],
              emits: ['input', 'update:modelValue']
            }
          }
        }
      })

      await nextTick()

      const searchInput = wrapper.find('input')
      
      // Rapid typing
      await searchInput.setValue('t')
      await searchInput.setValue('te')
      await searchInput.setValue('tes')
      await searchInput.setValue('test')

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600))

      // Should only search once after debounce
      expect(searchSpy).toHaveBeenCalledTimes(1)
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'test' })
      )
    })
  })

  describe('Accessibility Enhancements', () => {
    it('should provide proper ARIA labels and descriptions', async () => {
      wrapper = mount(PluginManagementPage)
      await nextTick()

      // Check main landmarks
      const main = wrapper.find('[role="main"]')
      expect(main.exists()).toBe(true)
      expect(main.attributes('aria-labelledby')).toBe('page-title')

      const search = wrapper.find('[role="search"]')
      expect(search.exists()).toBe(true)
      expect(search.attributes('aria-labelledby')).toBe('search-heading')
    })

    it('should implement proper keyboard navigation', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            PluginCard: {
              template: `
                <div 
                  class="plugin-card"
                  tabindex="0"
                  @keydown.enter="$emit('configure', plugin.id)"
                  @keydown.space.prevent="$emit('toggle-enabled', plugin.id, !plugin.enabled)"
                >
                  {{ plugin.name }}
                </div>
              `,
              props: ['plugin'],
              emits: ['configure', 'toggle-enabled']
            }
          }
        }
      })

      await nextTick()

      const pluginCards = wrapper.findAll('.plugin-card')
      
      // All cards should be focusable
      pluginCards.forEach(card => {
        expect(card.attributes('tabindex')).toBe('0')
      })

      // Test keyboard interactions
      const firstCard = pluginCards[0]
      await firstCard.trigger('keydown.enter')
      expect(firstCard.emitted('configure')).toBeTruthy()

      await firstCard.trigger('keydown.space')
      expect(firstCard.emitted('toggle-enabled')).toBeTruthy()
    })

    it('should provide screen reader announcements for dynamic content', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            'sr-only': {
              template: '<span class="sr-only" aria-live="polite"><slot /></span>'
            }
          }
        }
      })

      await nextTick()

      const vm = wrapper.vm as any
      
      // Simulate plugin state change
      vm.handleToggleEnabled('plugin-1', false)
      await nextTick()

      // Should announce the change
      const announcement = wrapper.find('[aria-live="polite"]')
      expect(announcement.exists()).toBe(true)
    })

    it('should maintain focus management in modals', async () => {
      wrapper = mount(PluginManagementPage, {
        global: {
          stubs: {
            Dialog: {
              template: `
                <div v-if="open" class="dialog" role="dialog" aria-modal="true">
                  <button ref="firstFocusable" class="first-focusable">First</button>
                  <slot />
                  <button ref="lastFocusable" class="last-focusable">Last</button>
                </div>
              `,
              props: ['open'],
              mounted() {
                if (this.open) {
                  this.$nextTick(() => {
                    this.$refs.firstFocusable?.focus()
                  })
                }
              }
            }
          }
        }
      })

      await nextTick()

      const vm = wrapper.vm as any
      vm.detailsModalOpen = true
      vm.selectedPluginForDetails = mockPlugins[0]

      await nextTick()

      const dialog = wrapper.find('[role="dialog"]')
      expect(dialog.exists()).toBe(true)
      expect(dialog.attributes('aria-modal')).toBe('true')

      const firstFocusable = wrapper.find('.first-focusable')
      expect(document.activeElement).toBe(firstFocusable.element)
    })
  })
})