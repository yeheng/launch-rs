<template>
  <div 
    class="loading-spinner"
    :class="containerClasses"
    role="status"
    :aria-label="ariaLabel"
  >
    <div 
      class="animate-spin rounded-full border-solid"
      :class="spinnerClasses"
      :style="spinnerStyles"
    />
    
    <span v-if="showLabel && label" class="ml-2 text-sm" :class="labelClasses">
      {{ label }}
    </span>
    
    <!-- Screen reader text -->
    <span class="sr-only">{{ ariaLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type SpinnerVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'white'

interface Props {
  /** Size of the spinner */
  size?: SpinnerSize
  /** Visual variant */
  variant?: SpinnerVariant
  /** Loading label text */
  label?: string
  /** Whether to show the label */
  showLabel?: boolean
  /** Center the spinner */
  center?: boolean
  /** Custom color for the spinner */
  color?: string
  /** Thickness of the spinner border */
  thickness?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'primary',
  label: 'Loading...',
  showLabel: false,
  center: false,
  thickness: 2
})

// Computed
const containerClasses = computed(() => {
  const classes = ['flex items-center']
  
  if (props.center) {
    classes.push('justify-center')
  }
  
  return classes.join(' ')
})

const spinnerClasses = computed(() => {
  const classes = []
  
  // Size classes
  switch (props.size) {
    case 'xs':
      classes.push('w-3 h-3')
      break
    case 'sm':
      classes.push('w-4 h-4')
      break
    case 'md':
      classes.push('w-6 h-6')
      break
    case 'lg':
      classes.push('w-8 h-8')
      break
    case 'xl':
      classes.push('w-12 h-12')
      break
  }
  
  // Variant classes (if no custom color)
  if (!props.color) {
    switch (props.variant) {
      case 'primary':
        classes.push('border-blue-600 border-t-transparent')
        break
      case 'secondary':
        classes.push('border-gray-600 border-t-transparent')
        break
      case 'success':
        classes.push('border-green-600 border-t-transparent')
        break
      case 'warning':
        classes.push('border-yellow-600 border-t-transparent')
        break
      case 'error':
        classes.push('border-red-600 border-t-transparent')
        break
      case 'white':
        classes.push('border-white border-t-transparent')
        break
    }
  }
  
  return classes.join(' ')
})

const spinnerStyles = computed(() => {
  const styles: Record<string, string> = {}
  
  if (props.color) {
    styles.borderColor = props.color
    styles.borderTopColor = 'transparent'
  }
  
  if (props.thickness) {
    styles.borderWidth = `${props.thickness}px`
  }
  
  return styles
})

const labelClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'text-blue-600'
    case 'secondary':
      return 'text-gray-600'
    case 'success':
      return 'text-green-600'
    case 'warning':
      return 'text-yellow-600'
    case 'error':
      return 'text-red-600'
    case 'white':
      return 'text-white'
    default:
      return 'text-gray-600'
  }
})

const ariaLabel = computed(() => {
  return props.label || 'Loading'
})
</script>

<style scoped>
.loading-spinner {
  /* Ensure proper alignment */
  display: inline-flex;
  align-items: center;
}

/* Smooth animation */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>