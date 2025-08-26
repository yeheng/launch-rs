<template>
  <div v-if="hasError" class="error-boundary">
    <div class="bg-red-50 border border-red-200 rounded-lg p-6">
      <div class="flex items-start">
        <AlertTriangleIcon class="w-6 h-6 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-red-800 mb-2">
            {{ errorTitle }}
          </h3>
          <p class="text-red-700 mb-4">
            {{ errorMessage }}
          </p>
          
          <!-- Error Details (collapsible) -->
          <div v-if="showDetails && errorDetails" class="mb-4">
            <button
              @click="detailsExpanded = !detailsExpanded"
              class="text-sm text-red-600 hover:text-red-800 flex items-center"
            >
              <ChevronRightIcon 
                class="w-4 h-4 mr-1 transition-transform"
                :class="{ 'rotate-90': detailsExpanded }"
              />
              {{ detailsExpanded ? 'Hide' : 'Show' }} Details
            </button>
            
            <div v-if="detailsExpanded" class="mt-2 p-3 bg-red-100 rounded text-sm text-red-800 font-mono">
              {{ errorDetails }}
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="canRetry"
              variant="outline"
              size="sm"
              @click="handleRetry"
              :disabled="isRetrying"
              class="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshIcon class="w-4 h-4 mr-1" :class="{ 'animate-spin': isRetrying }" />
              {{ isRetrying ? 'Retrying...' : 'Try Again' }}
            </Button>
            
            <Button
              v-if="canReload"
              variant="outline"
              size="sm"
              @click="handleReload"
              class="border-red-300 text-red-700 hover:bg-red-100"
            >
              <ReloadIcon class="w-4 h-4 mr-1" />
              Reload Page
            </Button>
            
            <Button
              v-if="canReset"
              variant="outline"
              size="sm"
              @click="handleReset"
              class="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RotateCcwIcon class="w-4 h-4 mr-1" />
              Reset Component
            </Button>
            
            <Button
              v-if="canReport"
              variant="outline"
              size="sm"
              @click="handleReport"
              class="border-red-300 text-red-700 hover:bg-red-100"
            >
              <BugIcon class="w-4 h-4 mr-1" />
              Report Issue
            </Button>
          </div>
          
          <!-- Fallback Content -->
          <div v-if="fallbackMessage" class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p class="text-sm text-blue-800">
              <InfoIcon class="w-4 h-4 inline mr-1" />
              {{ fallbackMessage }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Normal Content -->
  <div v-else>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onErrorCaptured, watch } from 'vue'
import { Button } from '@/components/ui/button'

// Icon components
const AlertTriangleIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' }
const ChevronRightIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>' }
const RefreshIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23,4 23,10 17,10"/><polyline points="1,20 1,14 7,14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>' }
const ReloadIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>' }
const RotateCcwIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>' }
const BugIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="M19 7c-.7-1.3-1.7-2.3-3-3"/><path d="M5 7c.7-1.3 1.7-2.3 3-3"/><path d="M9 10h6"/><path d="M9 14h6"/><path d="M12 2v4"/><path d="M13 22v-4"/><path d="M11 22v-4"/></svg>' }
const InfoIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>' }

interface Props {
  /** Custom error title */
  errorTitle?: string
  /** Custom error message */
  errorMessage?: string
  /** Whether to show error details */
  showDetails?: boolean
  /** Whether retry action is available */
  canRetry?: boolean
  /** Whether reload action is available */
  canReload?: boolean
  /** Whether reset action is available */
  canReset?: boolean
  /** Whether report action is available */
  canReport?: boolean
  /** Fallback message to show */
  fallbackMessage?: string
  /** Custom retry function */
  onRetry?: () => Promise<void> | void
  /** Custom reset function */
  onReset?: () => Promise<void> | void
  /** Custom report function */
  onReport?: (error: Error) => Promise<void> | void
}

interface Emits {
  /** Emitted when an error is caught */
  'error': [error: Error]
  /** Emitted when retry is attempted */
  'retry': []
  /** Emitted when reset is attempted */
  'reset': []
  /** Emitted when component is reloaded */
  'reload': []
  /** Emitted when error is reported */
  'report': [error: Error]
}

const props = withDefaults(defineProps<Props>(), {
  errorTitle: 'Something went wrong',
  errorMessage: 'An unexpected error occurred. Please try again.',
  showDetails: true,
  canRetry: true,
  canReload: false,
  canReset: true,
  canReport: false,
  fallbackMessage: ''
})

const emit = defineEmits<Emits>()

// State
const hasError = ref(false)
const currentError = ref<Error | null>(null)
const detailsExpanded = ref(false)
const isRetrying = ref(false)

// Computed
const errorDetails = computed(() => {
  if (!currentError.value) return ''
  return currentError.value.stack || currentError.value.message
})

// Error capture
onErrorCaptured((error: Error) => {
  console.error('ErrorBoundary caught error:', error)
  
  hasError.value = true
  currentError.value = error
  
  emit('error', error)
  
  // Prevent the error from propagating further
  return false
})

// Watch for external error reset
watch(() => props.onReset, () => {
  if (hasError.value && props.onReset) {
    hasError.value = false
    currentError.value = null
  }
})

// Event handlers
const handleRetry = async () => {
  if (isRetrying.value) return
  
  isRetrying.value = true
  
  try {
    if (props.onRetry) {
      await props.onRetry()
    }
    
    // Reset error state on successful retry
    hasError.value = false
    currentError.value = null
    
    emit('retry')
  } catch (error) {
    console.error('Retry failed:', error)
    // Keep error state, but stop loading
  } finally {
    isRetrying.value = false
  }
}

const handleReload = () => {
  emit('reload')
  window.location.reload()
}

const handleReset = async () => {
  try {
    if (props.onReset) {
      await props.onReset()
    }
    
    hasError.value = false
    currentError.value = null
    
    emit('reset')
  } catch (error) {
    console.error('Reset failed:', error)
  }
}

const handleReport = async () => {
  if (!currentError.value) return
  
  try {
    if (props.onReport) {
      await props.onReport(currentError.value)
    }
    
    emit('report', currentError.value)
  } catch (error) {
    console.error('Report failed:', error)
  }
}

// Public methods for external error handling
const setError = (error: Error) => {
  hasError.value = true
  currentError.value = error
  emit('error', error)
}

const clearError = () => {
  hasError.value = false
  currentError.value = null
}

// Expose methods
defineExpose({
  setError,
  clearError,
  hasError: () => hasError.value,
  currentError: () => currentError.value
})
</script>

<style scoped>
.error-boundary {
  /* Ensure error boundary takes full width */
  width: 100%;
}
</style>