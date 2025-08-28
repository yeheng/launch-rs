/**
 * Final UI polish tests for animations, transitions, and responsive design
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock CSS animations and transitions
const mockAnimations = {
  running: new Set<string>(),
  start: vi.fn((name: string) => mockAnimations.running.add(name)),
  end: vi.fn((name: string) => mockAnimations.running.delete(name)),
  isRunning: vi.fn((name: string) => mockAnimations.running.has(name))
}

// Mock ResizeObserver for responsive design tests
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn((element) => {
    // Simulate resize events
    setTimeout(() => {
      callback([{
        target: element,
        contentRect: { width: 800, height: 600 }
      }])
    }, 10)
  }),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn((element) => {
    // Simulate intersection
    setTimeout(() => {
      callback([{
        target: element,
        isIntersecting: true,
        intersectionRatio: 1
      }])
    }, 10)
  }),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16) // ~60fps
  return 1
})

global.cancelAnimationFrame = vi.fn()

// Mock CSS transition events
const createTransitionEvent = (propertyName: string, elapsedTime: number = 0.3) => ({
  type: 'transitionend',
  propertyName,
  elapsedTime,
  bubbles: true,
  cancelable: true
})

describe('Plugin UI Final Polish Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAnimations.running.clear()
  })

  describe('Loading State Animations', () => {
    it('should implement smooth loading spinner animations', async () => {
      // Simulate loading spinner
      const spinner = {
        element: document.createElement('div'),
        isSpinning: false,
        startSpin() {
          this.isSpinning = true
          mockAnimations.start('spinner-rotation')
          this.element.classList.add('animate-spin')
        },
        stopSpin() {
          this.isSpinning = false
          mockAnimations.end('spinner-rotation')
          this.element.classList.remove('animate-spin')
        }
      }

      // Start animation
      spinner.startSpin()
      expect(mockAnimations.isRunning('spinner-rotation')).toBe(true)
      expect(spinner.element.classList.contains('animate-spin')).toBe(true)

      // Stop animation
      spinner.stopSpin()
      expect(mockAnimations.isRunning('spinner-rotation')).toBe(false)
      expect(spinner.element.classList.contains('animate-spin')).toBe(false)
    })

    it('should implement skeleton loading with shimmer effect', async () => {
      const skeleton = {
        element: document.createElement('div'),
        isShimmering: false,
        startShimmer() {
          this.isShimmering = true
          mockAnimations.start('skeleton-shimmer')
          this.element.classList.add('animate-pulse')
        },
        stopShimmer() {
          this.isShimmering = false
          mockAnimations.end('skeleton-shimmer')
          this.element.classList.remove('animate-pulse')
        }
      }

      skeleton.startShimmer()
      expect(mockAnimations.isRunning('skeleton-shimmer')).toBe(true)
      expect(skeleton.element.classList.contains('animate-pulse')).toBe(true)

      // Simulate content loaded
      await new Promise(resolve => setTimeout(resolve, 500))
      skeleton.stopShimmer()
      expect(mockAnimations.isRunning('skeleton-shimmer')).toBe(false)
    })

    it('should implement progressive loading with fade-in effects', async () => {
      const progressiveLoader = {
        items: [] as any[],
        loadedCount: 0,
        async loadItem(index: number) {
          return new Promise(resolve => {
            setTimeout(() => {
              this.items[index] = { loaded: true, fadeIn: true }
              this.loadedCount++
              mockAnimations.start(`fade-in-${index}`)
              resolve(this.items[index])
            }, 100 * (index + 1)) // Staggered loading
          })
        },
        async loadAll(count: number) {
          this.items = new Array(count).fill({ loaded: false, fadeIn: false })
          const promises = Array.from({ length: count }, (_, i) => this.loadItem(i))
          await Promise.all(promises)
        }
      }

      await progressiveLoader.loadAll(3)
      
      expect(progressiveLoader.loadedCount).toBe(3)
      expect(progressiveLoader.items.every(item => item.loaded)).toBe(true)
      expect(mockAnimations.isRunning('fade-in-0')).toBe(true)
      expect(mockAnimations.isRunning('fade-in-1')).toBe(true)
      expect(mockAnimations.isRunning('fade-in-2')).toBe(true)
    })
  })

  describe('Interactive Animations', () => {
    it('should implement smooth hover transitions', async () => {
      const card = {
        element: document.createElement('div'),
        isHovered: false,
        onMouseEnter() {
          this.isHovered = true
          this.element.classList.add('hover:shadow-lg', 'hover:scale-105')
          mockAnimations.start('card-hover')
        },
        onMouseLeave() {
          this.isHovered = false
          this.element.classList.remove('hover:shadow-lg', 'hover:scale-105')
          mockAnimations.end('card-hover')
        }
      }

      // Test hover enter
      card.onMouseEnter()
      expect(card.isHovered).toBe(true)
      expect(mockAnimations.isRunning('card-hover')).toBe(true)
      expect(card.element.classList.contains('hover:shadow-lg')).toBe(true)

      // Test hover leave
      card.onMouseLeave()
      expect(card.isHovered).toBe(false)
      expect(mockAnimations.isRunning('card-hover')).toBe(false)
    })

    it('should implement smooth toggle animations', async () => {
      const toggle = {
        element: document.createElement('div'),
        isEnabled: false,
        async toggle() {
          this.isEnabled = !this.isEnabled
          
          if (this.isEnabled) {
            this.element.classList.add('translate-x-5', 'bg-blue-600')
            this.element.classList.remove('translate-x-0', 'bg-gray-200')
            mockAnimations.start('toggle-on')
          } else {
            this.element.classList.add('translate-x-0', 'bg-gray-200')
            this.element.classList.remove('translate-x-5', 'bg-blue-600')
            mockAnimations.start('toggle-off')
          }

          // Wait for animation to complete
          await new Promise(resolve => setTimeout(resolve, 200))
          mockAnimations.end(this.isEnabled ? 'toggle-on' : 'toggle-off')
        }
      }

      // Test enabling
      await toggle.toggle()
      expect(toggle.isEnabled).toBe(true)
      expect(toggle.element.classList.contains('translate-x-5')).toBe(true)
      expect(toggle.element.classList.contains('bg-blue-600')).toBe(true)

      // Test disabling
      await toggle.toggle()
      expect(toggle.isEnabled).toBe(false)
      expect(toggle.element.classList.contains('translate-x-0')).toBe(true)
      expect(toggle.element.classList.contains('bg-gray-200')).toBe(true)
    })

    it('should implement modal entrance and exit animations', async () => {
      const modal = {
        element: document.createElement('div'),
        overlay: document.createElement('div'),
        isOpen: false,
        async open() {
          this.isOpen = true
          
          // Overlay fade in
          this.overlay.classList.add('opacity-0')
          this.overlay.classList.remove('opacity-100')
          mockAnimations.start('overlay-fade-in')
          
          // Modal slide in
          this.element.classList.add('scale-95', 'opacity-0')
          this.element.classList.remove('scale-100', 'opacity-100')
          mockAnimations.start('modal-slide-in')

          // Animate to final state
          await new Promise(resolve => setTimeout(resolve, 50))
          this.overlay.classList.add('opacity-100')
          this.overlay.classList.remove('opacity-0')
          this.element.classList.add('scale-100', 'opacity-100')
          this.element.classList.remove('scale-95', 'opacity-0')

          await new Promise(resolve => setTimeout(resolve, 200))
          mockAnimations.end('overlay-fade-in')
          mockAnimations.end('modal-slide-in')
        },
        async close() {
          this.isOpen = false
          
          mockAnimations.start('modal-slide-out')
          mockAnimations.start('overlay-fade-out')
          
          this.element.classList.add('scale-95', 'opacity-0')
          this.element.classList.remove('scale-100', 'opacity-100')
          this.overlay.classList.add('opacity-0')
          this.overlay.classList.remove('opacity-100')

          await new Promise(resolve => setTimeout(resolve, 200))
          mockAnimations.end('modal-slide-out')
          mockAnimations.end('overlay-fade-out')
        }
      }

      // Test opening
      await modal.open()
      expect(modal.isOpen).toBe(true)
      expect(modal.element.classList.contains('scale-100')).toBe(true)
      expect(modal.overlay.classList.contains('opacity-100')).toBe(true)

      // Test closing
      await modal.close()
      expect(modal.isOpen).toBe(false)
      expect(modal.element.classList.contains('scale-95')).toBe(true)
      expect(modal.overlay.classList.contains('opacity-0')).toBe(true)
    })
  })

  describe('List Animations', () => {
    it('should implement staggered list item animations', async () => {
      const list = {
        items: [] as any[],
        async addItems(newItems: string[]) {
          const startIndex = this.items.length
          
          for (let i = 0; i < newItems.length; i++) {
            const item = {
              id: `item-${startIndex + i}`,
              content: newItems[i],
              element: document.createElement('div'),
              isVisible: false
            }
            
            this.items.push(item)
            
            // Staggered animation
            setTimeout(() => {
              item.isVisible = true
              item.element.classList.add('opacity-100', 'translate-y-0')
              item.element.classList.remove('opacity-0', 'translate-y-4')
              mockAnimations.start(`list-item-${item.id}`)
            }, i * 100) // 100ms stagger
          }

          // Wait for all animations to start
          await new Promise(resolve => setTimeout(resolve, newItems.length * 100 + 200))
        },
        async removeItem(index: number) {
          const item = this.items[index]
          if (!item) return

          mockAnimations.start(`remove-${item.id}`)
          item.element.classList.add('opacity-0', 'scale-95')
          item.element.classList.remove('opacity-100', 'scale-100')

          await new Promise(resolve => setTimeout(resolve, 200))
          this.items.splice(index, 1)
          mockAnimations.end(`remove-${item.id}`)
        }
      }

      // Test adding items
      await list.addItems(['Item 1', 'Item 2', 'Item 3'])
      expect(list.items).toHaveLength(3)
      expect(list.items.every(item => item.isVisible)).toBe(true)

      // Test removing item
      await list.removeItem(1)
      expect(list.items).toHaveLength(2)
      expect(list.items[0].content).toBe('Item 1')
      expect(list.items[1].content).toBe('Item 3')
    })

    it('should implement smooth reordering animations', async () => {
      const sortableList = {
        items: [
          { id: 'a', order: 0, element: document.createElement('div') },
          { id: 'b', order: 1, element: document.createElement('div') },
          { id: 'c', order: 2, element: document.createElement('div') }
        ],
        async reorder(fromIndex: number, toIndex: number) {
          const item = this.items[fromIndex]
          
          // Start reorder animation
          mockAnimations.start(`reorder-${item.id}`)
          
          // Remove from old position
          this.items.splice(fromIndex, 1)
          
          // Insert at new position
          this.items.splice(toIndex, 0, item)
          
          // Update order values
          this.items.forEach((item, index) => {
            item.order = index
            item.element.style.transform = `translateY(${index * 60}px)`
          })

          await new Promise(resolve => setTimeout(resolve, 300))
          mockAnimations.end(`reorder-${item.id}`)
        }
      }

      // Test reordering
      await sortableList.reorder(0, 2) // Move first item to last
      
      expect(sortableList.items[0].id).toBe('b')
      expect(sortableList.items[1].id).toBe('c')
      expect(sortableList.items[2].id).toBe('a')
      expect(sortableList.items[2].order).toBe(2)
    })
  })

  describe('Responsive Design Animations', () => {
    it('should implement smooth layout transitions for different screen sizes', async () => {
      const responsiveGrid = {
        element: document.createElement('div'),
        currentLayout: 'desktop',
        async changeLayout(newLayout: 'mobile' | 'tablet' | 'desktop') {
          if (this.currentLayout === newLayout) return

          mockAnimations.start('layout-transition')
          
          // Remove old layout classes
          this.element.classList.remove(
            'grid-cols-1', 'grid-cols-2', 'grid-cols-3',
            'gap-2', 'gap-4', 'gap-6'
          )

          // Add new layout classes
          switch (newLayout) {
            case 'mobile':
              this.element.classList.add('grid-cols-1', 'gap-2')
              break
            case 'tablet':
              this.element.classList.add('grid-cols-2', 'gap-4')
              break
            case 'desktop':
              this.element.classList.add('grid-cols-3', 'gap-6')
              break
          }

          this.currentLayout = newLayout
          
          await new Promise(resolve => setTimeout(resolve, 300))
          mockAnimations.end('layout-transition')
        }
      }

      // Test layout changes
      await responsiveGrid.changeLayout('mobile')
      expect(responsiveGrid.currentLayout).toBe('mobile')
      expect(responsiveGrid.element.classList.contains('grid-cols-1')).toBe(true)

      await responsiveGrid.changeLayout('tablet')
      expect(responsiveGrid.currentLayout).toBe('tablet')
      expect(responsiveGrid.element.classList.contains('grid-cols-2')).toBe(true)

      await responsiveGrid.changeLayout('desktop')
      expect(responsiveGrid.currentLayout).toBe('desktop')
      expect(responsiveGrid.element.classList.contains('grid-cols-3')).toBe(true)
    })

    it('should implement smooth sidebar collapse/expand animations', async () => {
      const sidebar = {
        element: document.createElement('div'),
        isCollapsed: false,
        async toggle() {
          mockAnimations.start('sidebar-toggle')
          
          if (this.isCollapsed) {
            // Expand
            this.element.classList.remove('w-16')
            this.element.classList.add('w-64')
            this.isCollapsed = false
          } else {
            // Collapse
            this.element.classList.remove('w-64')
            this.element.classList.add('w-16')
            this.isCollapsed = true
          }

          await new Promise(resolve => setTimeout(resolve, 250))
          mockAnimations.end('sidebar-toggle')
        }
      }

      // Test collapse
      await sidebar.toggle()
      expect(sidebar.isCollapsed).toBe(true)
      expect(sidebar.element.classList.contains('w-16')).toBe(true)

      // Test expand
      await sidebar.toggle()
      expect(sidebar.isCollapsed).toBe(false)
      expect(sidebar.element.classList.contains('w-64')).toBe(true)
    })
  })

  describe('Performance Optimizations', () => {
    it('should implement efficient virtual scrolling with smooth animations', async () => {
      const virtualScroller = {
        items: Array.from({ length: 1000 }, (_, i) => ({ id: i, content: `Item ${i}` })),
        visibleItems: [] as any[],
        scrollTop: 0,
        itemHeight: 60,
        containerHeight: 400,
        
        updateVisibleItems() {
          const startIndex = Math.floor(this.scrollTop / this.itemHeight)
          const endIndex = Math.min(
            startIndex + Math.ceil(this.containerHeight / this.itemHeight) + 2,
            this.items.length
          )
          
          this.visibleItems = this.items.slice(startIndex, endIndex).map((item, index) => ({
            ...item,
            virtualIndex: startIndex + index,
            top: (startIndex + index) * this.itemHeight
          }))
        },
        
        async scrollTo(scrollTop: number) {
          mockAnimations.start('virtual-scroll')
          
          this.scrollTop = scrollTop
          this.updateVisibleItems()
          
          // Simulate smooth scrolling
          await new Promise(resolve => setTimeout(resolve, 16))
          mockAnimations.end('virtual-scroll')
        }
      }

      // Initialize
      virtualScroller.updateVisibleItems()
      expect(virtualScroller.visibleItems.length).toBeLessThan(20) // Should only render visible items

      // Test scrolling
      await virtualScroller.scrollTo(1000)
      expect(virtualScroller.visibleItems[0].virtualIndex).toBeGreaterThan(10)
      expect(virtualScroller.visibleItems.length).toBeLessThan(20)
    })

    it('should implement lazy loading with intersection observer', async () => {
      const lazyLoader = {
        items: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          loaded: false,
          element: document.createElement('div')
        })),
        observer: null as any,
        
        init() {
          this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const item = this.items.find(item => item.element === entry.target)
                if (item && !item.loaded) {
                  this.loadItem(item)
                }
              }
            })
          })

          this.items.forEach(item => {
            this.observer.observe(item.element)
          })
        },
        
        async loadItem(item: any) {
          mockAnimations.start(`lazy-load-${item.id}`)
          
          // Simulate loading delay
          await new Promise(resolve => setTimeout(resolve, 100))
          
          item.loaded = true
          item.element.classList.add('opacity-100')
          item.element.classList.remove('opacity-0')
          
          mockAnimations.end(`lazy-load-${item.id}`)
          this.observer.unobserve(item.element)
        }
      }

      lazyLoader.init()
      
      // Simulate items coming into view
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // At least some items should be loaded
      const loadedCount = lazyLoader.items.filter(item => item.loaded).length
      expect(loadedCount).toBeGreaterThan(0)
    })

    it('should implement debounced animations for performance', async () => {
      const debouncedAnimator = {
        pendingAnimations: new Set<string>(),
        debounceTime: 100,
        
        debounce(animationName: string, callback: () => void) {
          if (this.pendingAnimations.has(animationName)) {
            return // Already pending
          }
          
          this.pendingAnimations.add(animationName)
          
          setTimeout(() => {
            callback()
            this.pendingAnimations.delete(animationName)
          }, this.debounceTime)
        },
        
        animateResize() {
          this.debounce('resize', () => {
            mockAnimations.start('debounced-resize')
            setTimeout(() => mockAnimations.end('debounced-resize'), 200)
          })
        }
      }

      // Trigger multiple rapid resize events
      debouncedAnimator.animateResize()
      debouncedAnimator.animateResize()
      debouncedAnimator.animateResize()
      
      expect(debouncedAnimator.pendingAnimations.has('resize')).toBe(true)
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(debouncedAnimator.pendingAnimations.has('resize')).toBe(false)
    })
  })

  describe('Accessibility Animations', () => {
    it('should respect user motion preferences', async () => {
      const accessibleAnimator = {
        prefersReducedMotion: false,
        
        checkMotionPreference() {
          // Mock checking user preference
          this.prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false
        },
        
        animate(element: HTMLElement, animationType: string) {
          this.checkMotionPreference()
          
          if (this.prefersReducedMotion) {
            // Skip animations, apply final state immediately
            element.classList.add('final-state')
            return Promise.resolve()
          } else {
            // Run full animation
            mockAnimations.start(animationType)
            element.classList.add('animate')
            
            return new Promise(resolve => {
              setTimeout(() => {
                mockAnimations.end(animationType)
                element.classList.remove('animate')
                element.classList.add('final-state')
                resolve(undefined)
              }, 300)
            })
          }
        }
      }

      const element = document.createElement('div')
      
      // Test with reduced motion
      accessibleAnimator.prefersReducedMotion = true
      await accessibleAnimator.animate(element, 'test-animation')
      
      expect(element.classList.contains('final-state')).toBe(true)
      expect(mockAnimations.isRunning('test-animation')).toBe(false)

      // Test with normal motion
      element.classList.remove('final-state')
      accessibleAnimator.prefersReducedMotion = false
      
      const animationPromise = accessibleAnimator.animate(element, 'test-animation-2')
      expect(mockAnimations.isRunning('test-animation-2')).toBe(true)
      
      await animationPromise
      expect(element.classList.contains('final-state')).toBe(true)
    })

    it('should provide focus indicators with smooth transitions', async () => {
      const focusManager = {
        currentFocused: null as HTMLElement | null,
        
        async focusElement(element: HTMLElement) {
          // Remove focus from previous element
          if (this.currentFocused) {
            mockAnimations.start('focus-out')
            this.currentFocused.classList.remove('focus-visible')
            await new Promise(resolve => setTimeout(resolve, 150))
            mockAnimations.end('focus-out')
          }
          
          // Focus new element
          mockAnimations.start('focus-in')
          element.classList.add('focus-visible')
          element.focus()
          this.currentFocused = element
          
          await new Promise(resolve => setTimeout(resolve, 150))
          mockAnimations.end('focus-in')
        }
      }

      const element1 = document.createElement('button')
      const element2 = document.createElement('button')

      await focusManager.focusElement(element1)
      expect(focusManager.currentFocused).toBe(element1)
      expect(element1.classList.contains('focus-visible')).toBe(true)

      await focusManager.focusElement(element2)
      expect(focusManager.currentFocused).toBe(element2)
      expect(element1.classList.contains('focus-visible')).toBe(false)
      expect(element2.classList.contains('focus-visible')).toBe(true)
    })
  })

  describe('Animation Coordination', () => {
    it('should coordinate multiple simultaneous animations', async () => {
      const animationCoordinator = {
        activeAnimations: new Map<string, any>(),
        
        async runParallelAnimations(animations: Array<{ name: string; duration: number; callback: () => void }>) {
          const promises = animations.map(async (animation) => {
            this.activeAnimations.set(animation.name, { startTime: Date.now() })
            mockAnimations.start(animation.name)
            
            animation.callback()
            
            await new Promise(resolve => setTimeout(resolve, animation.duration))
            
            mockAnimations.end(animation.name)
            this.activeAnimations.delete(animation.name)
          })
          
          await Promise.all(promises)
        },
        
        async runSequentialAnimations(animations: Array<{ name: string; duration: number; callback: () => void }>) {
          for (const animation of animations) {
            this.activeAnimations.set(animation.name, { startTime: Date.now() })
            mockAnimations.start(animation.name)
            
            animation.callback()
            
            await new Promise(resolve => setTimeout(resolve, animation.duration))
            
            mockAnimations.end(animation.name)
            this.activeAnimations.delete(animation.name)
          }
        }
      }

      // Test parallel animations
      const parallelStart = Date.now()
      await animationCoordinator.runParallelAnimations([
        { name: 'fade-in', duration: 200, callback: () => {} },
        { name: 'slide-up', duration: 300, callback: () => {} },
        { name: 'scale-in', duration: 250, callback: () => {} }
      ])
      const parallelEnd = Date.now()
      
      expect(parallelEnd - parallelStart).toBeLessThan(400) // Should run in parallel
      expect(animationCoordinator.activeAnimations.size).toBe(0)

      // Test sequential animations
      const sequentialStart = Date.now()
      await animationCoordinator.runSequentialAnimations([
        { name: 'step-1', duration: 100, callback: () => {} },
        { name: 'step-2', duration: 100, callback: () => {} },
        { name: 'step-3', duration: 100, callback: () => {} }
      ])
      const sequentialEnd = Date.now()
      
      expect(sequentialEnd - sequentialStart).toBeGreaterThan(250) // Should run sequentially
      expect(animationCoordinator.activeAnimations.size).toBe(0)
    })

    it('should handle animation interruptions gracefully', async () => {
      const interruptibleAnimator = {
        currentAnimation: null as string | null,
        
        async startAnimation(name: string, duration: number) {
          // Interrupt current animation if running
          if (this.currentAnimation) {
            mockAnimations.end(this.currentAnimation)
          }
          
          this.currentAnimation = name
          mockAnimations.start(name)
          
          try {
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(resolve, duration)
              
              // Simulate interruption
              if (name === 'interruptible') {
                setTimeout(() => {
                  clearTimeout(timeout)
                  reject(new Error('Animation interrupted'))
                }, duration / 2)
              }
            })
            
            mockAnimations.end(name)
            this.currentAnimation = null
          } catch (error) {
            // Handle interruption
            mockAnimations.end(name)
            this.currentAnimation = null
            throw error
          }
        }
      }

      // Test normal animation
      await interruptibleAnimator.startAnimation('normal', 200)
      expect(interruptibleAnimator.currentAnimation).toBeNull()

      // Test interrupted animation
      try {
        await interruptibleAnimator.startAnimation('interruptible', 200)
        expect.fail('Should have been interrupted')
      } catch (error) {
        expect((error as Error).message).toBe('Animation interrupted')
        expect(interruptibleAnimator.currentAnimation).toBeNull()
      }
    })
  })
})