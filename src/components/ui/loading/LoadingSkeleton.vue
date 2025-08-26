<template>
  <div 
    class="loading-skeleton animate-pulse"
    :class="containerClasses"
    role="status"
    aria-label="Loading content"
  >
    <!-- Custom slot content -->
    <slot v-if="$slots.default" />
    
    <!-- Default skeleton patterns -->
    <template v-else>
      <!-- Card skeleton -->
      <div v-if="variant === 'card'" class="space-y-3">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gray-300 rounded-lg" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-300 rounded w-3/4" />
            <div class="h-3 bg-gray-300 rounded w-1/2" />
          </div>
        </div>
        <div class="space-y-2">
          <div class="h-3 bg-gray-300 rounded" />
          <div class="h-3 bg-gray-300 rounded w-5/6" />
        </div>
        <div class="flex justify-between items-center pt-2">
          <div class="h-6 bg-gray-300 rounded w-16" />
          <div class="h-6 bg-gray-300 rounded w-20" />
        </div>
      </div>
      
      <!-- List skeleton -->
      <div v-else-if="variant === 'list'" class="space-y-3">
        <div 
          v-for="i in (count || 3)" 
          :key="i"
          class="flex items-center space-x-3"
        >
          <div class="w-8 h-8 bg-gray-300 rounded-full" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-300 rounded w-3/4" />
            <div class="h-3 bg-gray-300 rounded w-1/2" />
          </div>
        </div>
      </div>
      
      <!-- Text skeleton -->
      <div v-else-if="variant === 'text'" class="space-y-2">
        <div 
          v-for="i in (count || 3)" 
          :key="i"
          class="h-4 bg-gray-300 rounded"
          :class="i === (count || 3) ? 'w-3/4' : 'w-full'"
        />
      </div>
      
      <!-- Avatar skeleton -->
      <div v-else-if="variant === 'avatar'" class="flex items-center space-x-3">
        <div class="w-12 h-12 bg-gray-300 rounded-full" />
        <div class="space-y-2">
          <div class="h-4 bg-gray-300 rounded w-24" />
          <div class="h-3 bg-gray-300 rounded w-16" />
        </div>
      </div>
      
      <!-- Button skeleton -->
      <div v-else-if="variant === 'button'" class="space-y-2">
        <div 
          v-for="i in (count || 1)" 
          :key="i"
          class="h-10 bg-gray-300 rounded"
          :class="buttonWidthClass"
        />
      </div>
      
      <!-- Table skeleton -->
      <div v-else-if="variant === 'table'" class="space-y-3">
        <!-- Header -->
        <div class="flex space-x-4">
          <div 
            v-for="i in (columns || 4)" 
            :key="`header-${i}`"
            class="h-4 bg-gray-300 rounded flex-1"
          />
        </div>
        <!-- Rows -->
        <div 
          v-for="i in (count || 5)" 
          :key="`row-${i}`"
          class="flex space-x-4"
        >
          <div 
            v-for="j in (columns || 4)" 
            :key="`cell-${i}-${j}`"
            class="h-4 bg-gray-300 rounded flex-1"
          />
        </div>
      </div>
      
      <!-- Custom rectangle -->
      <div v-else class="bg-gray-300 rounded" :style="customStyles" />
    </template>
    
    <!-- Screen reader text -->
    <span class="sr-only">Loading content, please wait</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type SkeletonVariant = 'card' | 'list' | 'text' | 'avatar' | 'button' | 'table' | 'custom'

interface Props {
  /** Skeleton variant */
  variant?: SkeletonVariant
  /** Number of items (for list, text, button variants) */
  count?: number
  /** Number of columns (for table variant) */
  columns?: number
  /** Custom width */
  width?: string | number
  /** Custom height */
  height?: string | number
  /** Whether to show rounded corners */
  rounded?: boolean
  /** Animation speed */
  speed?: 'slow' | 'normal' | 'fast'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'custom',
  count: 3,
  columns: 4,
  rounded: true,
  speed: 'normal'
})

// Computed
const containerClasses = computed(() => {
  const classes = ['loading-skeleton']
  
  // Animation speed
  switch (props.speed) {
    case 'slow':
      classes.push('animate-pulse-slow')
      break
    case 'fast':
      classes.push('animate-pulse-fast')
      break
    default:
      classes.push('animate-pulse')
  }
  
  return classes.join(' ')
})

const buttonWidthClass = computed(() => {
  switch (props.count) {
    case 1:
      return 'w-24'
    case 2:
      return 'w-20'
    default:
      return 'w-16'
  }
})

const customStyles = computed(() => {
  const styles: Record<string, string> = {}
  
  if (props.width) {
    styles.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  } else {
    styles.width = '100%'
  }
  
  if (props.height) {
    styles.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  } else {
    styles.height = '1rem'
  }
  
  return styles
})
</script>

<style scoped>
.loading-skeleton {
  /* Base skeleton styles */
  position: relative;
  overflow: hidden;
}

/* Custom animation speeds */
@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@keyframes pulse-fast {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-pulse-fast {
  animation: pulse-fast 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Shimmer effect for enhanced loading indication */
.loading-skeleton::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
</style>