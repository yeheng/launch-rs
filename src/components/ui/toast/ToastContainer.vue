<template>
  <div class="toast-container">
    <Toast
      v-for="(toast, index) in toasts"
      :key="toast.id"
      :toast="toast"
      :position="position"
      :offset="getToastOffset(index)"
      :show-progress="showProgress"
      @close="handleToastClose"
      @action="handleToastAction"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Toast from './Toast.vue'
import type { ToastItem, ToastPosition } from './types'

interface Props {
  /** Array of toast items to display */
  toasts: ToastItem[]
  /** Position where toasts should appear */
  position?: ToastPosition
  /** Gap between stacked toasts */
  stackGap?: number
  /** Whether to show progress bars */
  showProgress?: boolean
}

interface Emits {
  /** Emitted when a toast is closed */
  'close': [id: string]
  /** Emitted when a toast action is clicked */
  'action': [id: string, actionId: string]
}

const props = withDefaults(defineProps<Props>(), {
  position: 'bottom-right',
  stackGap: 8,
  showProgress: true
})

const emit = defineEmits<Emits>()

// Computed
const toastHeight = 80 // Approximate height of a toast in pixels

// Methods
const getToastOffset = (index: number): number => {
  return index * (toastHeight + props.stackGap)
}

const handleToastClose = (id: string) => {
  emit('close', id)
}

const handleToastAction = (id: string, actionId: string) => {
  emit('action', id, actionId)
}
</script>

<style scoped>
.toast-container {
  /* Container for managing toast positioning */
  position: relative;
  z-index: 9999;
}
</style>