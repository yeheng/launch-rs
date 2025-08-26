<template>
  <div
    v-if="visible"
    class="loading-overlay"
    :class="overlayClasses"
    role="status"
    :aria-label="ariaLabel"
  >
    <div class="loading-content" :class="contentClasses">
      <!-- Spinner -->
      <LoadingSpinner
        :size="spinnerSize"
        :variant="spinnerVariant"
        :color="spinnerColor"
      />
      
      <!-- Message -->
      <div v-if="message" class="mt-3 text-center">
        <p class="text-sm font-medium" :class="messageClasses">
          {{ message }}
        </p>
        <p v-if="description" class="text-xs mt-1" :class="descriptionClasses">
          {{ description }}
        </p>
      </div>
      
      <!-- Progress Bar -->
      <div v-if="showProgress && progress !== undefined" class="mt-4 w-full">
        <div class="flex justify-between text-xs mb-1" :class="progressTextClasses">
          <span>{{ progressLabel }}</span>
          <span>{{ Math.round(progress) }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="h-2 rounded-full transition-all duration-300"
            :class="progressBarClasses"
            :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
          />
        </div>
      </div>
      
      <!-- Cancel Button -->
      <Button
        v-if="cancellable"
        variant="outline"
        size="sm"
        @click="handleCancel"
        class="mt-4"
        :class="cancelButtonClasses"
      >
        Cancel
      </Button>
    </div>
    
    <!-- Screen reader text -->
    <span class="sr-only">{{ ariaLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import LoadingSpinner from './LoadingSpinner.vue'

type OverlayVariant = 'light' | 'dark' | 'blur'
type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type SpinnerVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'white'

interface Props {
  /** Whether the overlay is visible */
  visible?: boolean
  /** Loading message */
  message?: string
  /** Additional description */
  description?: string
  /** Visual variant of the overlay */
  variant?: OverlayVariant
  /** Size of the spinner */
  spinnerSize?: SpinnerSize
  /** Variant of the spinner */
  spinnerVariant?: SpinnerVariant
  /** Custom spinner color */
  spinnerColor?: string
  /** Whether the loading can be cancelled */
  cancellable?: boolean
  /** Whether to show progress bar */
  showProgress?: boolean
  /** Progress percentage (0-100) */
  progress?: number
  /** Progress label */
  progressLabel?: string
  /** Whether overlay covers full screen */
  fullscreen?: boolean
  /** Z-index for the overlay */
  zIndex?: number
}

interface Emits {
  /** Emitted when cancel button is clicked */
  'cancel': []
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  message: 'Loading...',
  variant: 'light',
  spinnerSize: 'lg',
  spinnerVariant: 'primary',
  cancellable: false,
  showProgress: false,
  progressLabel: 'Progress',
  fullscreen: false,
  zIndex: 50
})

const emit = defineEmits<Emits>()

// Computed
const overlayClasses = computed(() => {
  const classes = [
    'loading-overlay',
    'fixed inset-0 flex items-center justify-center',
    `z-${props.zIndex}`
  ]
  
  switch (props.variant) {
    case 'light':
      classes.push('bg-white/80')
      break
    case 'dark':
      classes.push('bg-black/50')
      break
    case 'blur':
      classes.push('bg-white/60 backdrop-blur-sm')
      break
  }
  
  if (!props.fullscreen) {
    classes.push('absolute')
  }
  
  return classes.join(' ')
})

const contentClasses = computed(() => {
  const classes = ['loading-content', 'flex flex-col items-center p-6 rounded-lg']
  
  switch (props.variant) {
    case 'light':
      classes.push('bg-white shadow-lg border')
      break
    case 'dark':
      classes.push('bg-gray-800 text-white shadow-lg')
      break
    case 'blur':
      classes.push('bg-white/90 backdrop-blur shadow-lg border')
      break
  }
  
  return classes.join(' ')
})

const messageClasses = computed(() => {
  switch (props.variant) {
    case 'dark':
      return 'text-white'
    default:
      return 'text-gray-900'
  }
})

const descriptionClasses = computed(() => {
  switch (props.variant) {
    case 'dark':
      return 'text-gray-300'
    default:
      return 'text-gray-600'
  }
})

const progressTextClasses = computed(() => {
  switch (props.variant) {
    case 'dark':
      return 'text-gray-300'
    default:
      return 'text-gray-600'
  }
})

const progressBarClasses = computed(() => {
  switch (props.spinnerVariant) {
    case 'success':
      return 'bg-green-600'
    case 'warning':
      return 'bg-yellow-600'
    case 'error':
      return 'bg-red-600'
    case 'secondary':
      return 'bg-gray-600'
    default:
      return 'bg-blue-600'
  }
})

const cancelButtonClasses = computed(() => {
  switch (props.variant) {
    case 'dark':
      return 'border-gray-600 text-gray-300 hover:bg-gray-700'
    default:
      return 'border-gray-300 text-gray-700 hover:bg-gray-50'
  }
})

const ariaLabel = computed(() => {
  if (props.progress !== undefined) {
    return `${props.message} ${Math.round(props.progress)}% complete`
  }
  return props.message || 'Loading'
})

// Methods
const handleCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.loading-overlay {
  /* Ensure overlay covers the entire area */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.loading-content {
  /* Ensure content is properly centered */
  max-width: 90vw;
  max-height: 90vh;
}

/* Animation for smooth appearance */
.loading-overlay {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>