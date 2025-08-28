<template>
  <div 
    ref="containerRef"
    class="virtual-scroll-container"
    :style="{ height: containerHeight }"
    @scroll="handleScroll"
    role="list"
    :aria-label="ariaLabel"
    :aria-rowcount="totalItems"
  >
    <!-- Spacer for items before visible range -->
    <div 
      v-if="startIndex > 0"
      :style="{ height: `${startIndex * itemHeight}px` }"
      class="virtual-scroll-spacer"
      aria-hidden="true"
    />

    <!-- Visible items -->
    <div
      v-for="(item, index) in visibleItems"
      :key="getItemKey(item, startIndex + index)"
      :style="{ height: `${itemHeight}px` }"
      class="virtual-scroll-item"
      :aria-rowindex="startIndex + index + 1"
      role="listitem"
    >
      <slot 
        :item="item" 
        :index="startIndex + index"
        :is-visible="true"
      />
    </div>

    <!-- Spacer for items after visible range -->
    <div 
      v-if="endIndex < totalItems"
      :style="{ height: `${(totalItems - endIndex) * itemHeight}px` }"
      class="virtual-scroll-spacer"
      aria-hidden="true"
    />

    <!-- Loading indicator -->
    <div 
      v-if="isLoading && visibleItems.length === 0"
      class="virtual-scroll-loading"
      role="status"
      aria-live="polite"
    >
      <slot name="loading">
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span class="ml-2 text-gray-600">Loading...</span>
        </div>
      </slot>
    </div>

    <!-- Empty state -->
    <div 
      v-if="!isLoading && totalItems === 0"
      class="virtual-scroll-empty"
      role="status"
    >
      <slot name="empty">
        <div class="flex flex-col items-center justify-center py-12 text-gray-500">
          <div class="text-lg font-medium mb-2">No items found</div>
          <div class="text-sm">Try adjusting your search or filters</div>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { performanceMonitor, MetricType } from '@/lib/plugins/performance-monitor'

/**
 * Props interface
 */
interface Props {
  /** Array of items to render */
  items: T[]
  /** Height of each item in pixels */
  itemHeight: number
  /** Height of the container */
  containerHeight: string
  /** Buffer size (number of items to render outside visible area) */
  buffer?: number
  /** Loading state */
  isLoading?: boolean
  /** Function to get unique key for each item */
  getItemKey?: (item: T, index: number) => string | number
  /** ARIA label for accessibility */
  ariaLabel?: string
  /** Enable performance monitoring */
  enableMonitoring?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  buffer: 5,
  isLoading: false,
  getItemKey: (item: T, index: number) => index,
  ariaLabel: 'Virtual scroll list',
  enableMonitoring: true
})

/**
 * Emits interface
 */
interface Emits {
  /** Emitted when scroll position changes */
  scroll: [scrollTop: number, scrollLeft: number]
  /** Emitted when visible range changes */
  visibleRangeChange: [startIndex: number, endIndex: number]
  /** Emitted when scrolled near the end (for infinite loading) */
  loadMore: []
}

const emit = defineEmits<Emits>()

// Template refs
const containerRef = ref<HTMLElement>()

// Reactive state
const scrollTop = ref(0)
const containerClientHeight = ref(0)

// Computed properties
const totalItems = computed(() => props.items.length)

const visibleCount = computed(() => {
  if (containerClientHeight.value === 0) return 0
  return Math.ceil(containerClientHeight.value / props.itemHeight) + props.buffer * 2
})

const startIndex = computed(() => {
  const index = Math.floor(scrollTop.value / props.itemHeight) - props.buffer
  return Math.max(0, index)
})

const endIndex = computed(() => {
  const index = startIndex.value + visibleCount.value
  return Math.min(totalItems.value, index)
})

const visibleItems = computed(() => {
  if (props.enableMonitoring) {
    return performanceMonitor.measure('virtual-scroll-slice', () => {
      return props.items.slice(startIndex.value, endIndex.value)
    })
  }
  return props.items.slice(startIndex.value, endIndex.value)
})

// Methods
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
  
  emit('scroll', target.scrollTop, target.scrollLeft)
  emit('visibleRangeChange', startIndex.value, endIndex.value)

  // Check if we're near the end for infinite loading
  const scrollBottom = target.scrollTop + target.clientHeight
  const totalHeight = totalItems.value * props.itemHeight
  
  if (scrollBottom >= totalHeight - props.itemHeight * 5) {
    emit('loadMore')
  }

  // Record scroll performance
  if (props.enableMonitoring) {
    performanceMonitor.recordMetric(
      MetricType.RENDER_TIME,
      'virtual-scroll-render',
      performance.now() - scrollStartTime.value
    )
  }
}

const scrollStartTime = ref(0)

const updateContainerHeight = () => {
  if (containerRef.value) {
    containerClientHeight.value = containerRef.value.clientHeight
  }
}

const scrollToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
  if (!containerRef.value) return
  
  const scrollTop = index * props.itemHeight
  containerRef.value.scrollTo({
    top: scrollTop,
    behavior
  })
}

const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  scrollToIndex(0, behavior)
}

const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
  scrollToIndex(totalItems.value - 1, behavior)
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  updateContainerHeight()
  
  // Set up resize observer
  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    const resizeObserver = new ResizeObserver(() => {
      updateContainerHeight()
    })
    resizeObserver.observe(containerRef.value)
    
    onUnmounted(() => {
      resizeObserver.disconnect()
    })
  }
})

// Watch for scroll events to record performance
watch(scrollTop, () => {
  scrollStartTime.value = performance.now()
})

// Watch for items changes to record performance
watch(() => props.items.length, (newLength, oldLength) => {
  if (props.enableMonitoring && oldLength !== undefined) {
    performanceMonitor.recordMetric(
      MetricType.OPERATION_TIME,
      'virtual-scroll-items-update',
      performance.now()
    )
  }
})

// Expose methods for parent components
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom,
  getVisibleRange: () => ({ start: startIndex.value, end: endIndex.value }),
  getScrollPosition: () => ({ top: scrollTop.value, left: 0 })
})
</script>

<style scoped>
.virtual-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.virtual-scroll-item {
  display: flex;
  align-items: stretch;
}

.virtual-scroll-spacer {
  flex-shrink: 0;
}

.virtual-scroll-loading,
.virtual-scroll-empty {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Smooth scrolling for better UX */
.virtual-scroll-container {
  scroll-behavior: smooth;
}

/* Custom scrollbar styling */
.virtual-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-scroll-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Focus styles for accessibility */
.virtual-scroll-container:focus {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

.virtual-scroll-item:focus-within {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}
</style>