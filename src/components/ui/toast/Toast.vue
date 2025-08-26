<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed z-50 transition-all duration-300 ease-in-out"
      :class="positionClasses"
      :style="{ transform: `translateY(${offset}px)` }"
    >
      <div
        class="max-w-sm w-full shadow-lg rounded-lg pointer-events-auto overflow-hidden"
        :class="variantClasses"
        role="alert"
        :aria-live="toast.type === 'error' ? 'assertive' : 'polite'"
      >
        <div class="p-4">
          <div class="flex items-start">
            <!-- Icon -->
            <div class="flex-shrink-0">
              <component 
                :is="iconComponent" 
                class="w-5 h-5"
                :class="iconClasses"
              />
            </div>
            
            <!-- Content -->
            <div class="ml-3 w-0 flex-1">
              <p v-if="toast.title" class="text-sm font-medium" :class="titleClasses">
                {{ toast.title }}
              </p>
              <p class="text-sm" :class="messageClasses">
                {{ toast.message }}
              </p>
              
              <!-- Action Button -->
              <div v-if="toast.action" class="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleAction"
                  :class="actionButtonClasses"
                >
                  {{ toast.action.label }}
                </Button>
              </div>
            </div>
            
            <!-- Close Button -->
            <div v-if="toast.dismissible !== false" class="ml-4 flex-shrink-0 flex">
              <button
                @click="handleClose"
                class="rounded-md inline-flex focus:outline-none focus:ring-2 focus:ring-offset-2"
                :class="closeButtonClasses"
              >
                <span class="sr-only">Close</span>
                <XIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        <!-- Progress Bar -->
        <div
          v-if="toast.duration && toast.duration > 0 && showProgress"
          class="h-1 bg-black/10"
        >
          <div
            class="h-full transition-all ease-linear"
            :class="progressClasses"
            :style="{ width: `${progressWidth}%` }"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Button } from '@/components/ui/button'
import type { ToastItem, ToastPosition } from './types'

// Icon components
const CheckCircleIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>' }
const AlertCircleIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' }
const InfoIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>' }
const AlertTriangleIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' }
const XIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' }

interface Props {
  /** Toast item to display */
  toast: ToastItem
  /** Position of the toast */
  position?: ToastPosition
  /** Vertical offset for stacking */
  offset?: number
  /** Whether to show progress bar */
  showProgress?: boolean
}

interface Emits {
  /** Emitted when toast is closed */
  'close': [id: string]
  /** Emitted when action is clicked */
  'action': [id: string, actionId: string]
}

const props = withDefaults(defineProps<Props>(), {
  position: 'bottom-right',
  offset: 0,
  showProgress: true
})

const emit = defineEmits<Emits>()

// State
const visible = ref(false)
const progressWidth = ref(100)
const timer = ref<NodeJS.Timeout | null>(null)
const progressTimer = ref<NodeJS.Timeout | null>(null)

// Computed
const positionClasses = computed(() => {
  const [vertical, horizontal] = props.position.split('-')
  
  const classes = []
  
  // Vertical positioning
  if (vertical === 'top') {
    classes.push('top-4')
  } else {
    classes.push('bottom-4')
  }
  
  // Horizontal positioning
  if (horizontal === 'left') {
    classes.push('left-4')
  } else if (horizontal === 'center') {
    classes.push('left-1/2 -translate-x-1/2')
  } else {
    classes.push('right-4')
  }
  
  return classes.join(' ')
})

const variantClasses = computed(() => {
  switch (props.toast.type) {
    case 'success':
      return 'bg-green-50 border border-green-200'
    case 'error':
      return 'bg-red-50 border border-red-200'
    case 'warning':
      return 'bg-yellow-50 border border-yellow-200'
    case 'info':
    default:
      return 'bg-blue-50 border border-blue-200'
  }
})

const iconComponent = computed(() => {
  switch (props.toast.type) {
    case 'success':
      return CheckCircleIcon
    case 'error':
      return AlertCircleIcon
    case 'warning':
      return AlertTriangleIcon
    case 'info':
    default:
      return InfoIcon
  }
})

const iconClasses = computed(() => {
  switch (props.toast.type) {
    case 'success':
      return 'text-green-400'
    case 'error':
      return 'text-red-400'
    case 'warning':
      return 'text-yellow-400'
    case 'info':
    default:
      return 'text-blue-400'
  }
})

const titleClasses = computed(() => {
  switch (props.toast.type) {
    case 'success':
      return 'text-green-800'
    case 'error':
      return 'text-red-800'
    case 'warning':
      return 'text-yellow-800'
    case 'info':
    default:
      return 'text-blue-800'
  }
})

const messageClasses = computed(() => {
  switch (props.toast.type) {
    case 'success':
      return 'text-green-700'
    case 'error':
      return 'text-red-700'
    case 'warning':
      return 'text-yellow-700'
    case 'info':
    default:
      return 'text-blue-700'
  }
})

const closeButtonClasses = computed(() => {
  switch (props.toast.type) {
    case 'success':
      return 'text-green-400 hover:text-green-600 focus:ring-green-500'
    case 'error':
      return 'text-red-400 hover:text-red-600 focus:ring-red-500'
    case 'warning':
      return 'text-yellow-400 hover:text-yellow-600 focus:ring-yellow-500'
    case 'info':
    default:
      return 'text-blue-400 hover:text-blue-600 focus:ring-blue-500'
  }
})

const actionButtonClasses = computed(() => {
  switch (props.toast.type) {
    case 'success':
      return 'text-green-600 hover:text-green-500'
    case 'error':
      return 'text-red-600 hover:text-red-500'
    case 'warning':
      return 'text-yellow-600 hover:text-yellow-500'
    case 'info':
    default:
      return 'text-blue-600 hover:text-blue-500'
  }
})

const progressClasses = computed(() => {
  switch (props.toast.type) {
    case 'success':
      return 'bg-green-400'
    case 'error':
      return 'bg-red-400'
    case 'warning':
      return 'bg-yellow-400'
    case 'info':
    default:
      return 'bg-blue-400'
  }
})

// Methods
const startTimer = () => {
  if (!props.toast.duration || props.toast.duration <= 0) return
  
  // Auto-dismiss timer
  timer.value = setTimeout(() => {
    handleClose()
  }, props.toast.duration)
  
  // Progress bar animation
  if (props.showProgress) {
    const startTime = Date.now()
    const updateProgress = () => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, props.toast.duration! - elapsed)
      progressWidth.value = (remaining / props.toast.duration!) * 100
      
      if (remaining > 0) {
        progressTimer.value = setTimeout(updateProgress, 16) // ~60fps
      }
    }
    updateProgress()
  }
}

const clearTimers = () => {
  if (timer.value) {
    clearTimeout(timer.value)
    timer.value = null
  }
  if (progressTimer.value) {
    clearTimeout(progressTimer.value)
    progressTimer.value = null
  }
}

const handleClose = () => {
  clearTimers()
  visible.value = false
  
  // Wait for animation to complete before emitting close
  setTimeout(() => {
    emit('close', props.toast.id)
  }, 300)
}

const handleAction = () => {
  if (props.toast.action) {
    emit('action', props.toast.id, props.toast.action.id)
    
    // Close toast after action unless specified otherwise
    if (props.toast.action.closeOnClick !== false) {
      handleClose()
    }
  }
}

// Lifecycle
onMounted(() => {
  // Show toast with slight delay for animation
  setTimeout(() => {
    visible.value = true
  }, 50)
  
  startTimer()
})

onUnmounted(() => {
  clearTimers()
})

// Watch for toast changes
watch(() => props.toast, () => {
  clearTimers()
  startTimer()
}, { deep: true })
</script>