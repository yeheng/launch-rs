<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center space-x-2 text-red-600">
          <AlertTriangleIcon class="w-5 h-5" />
          <span>Uninstall Plugin</span>
        </DialogTitle>
        <DialogDescription>
          This action cannot be undone. Please review the consequences below.
        </DialogDescription>
      </DialogHeader>

      <div v-if="plugin" class="space-y-4">
        <!-- Plugin Info -->
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="flex items-center space-x-3">
            <component :is="plugin.icon" class="w-8 h-8 text-gray-600" />
            <div>
              <h3 class="font-medium text-gray-900">{{ plugin.name }}</h3>
              <p class="text-sm text-gray-600">v{{ plugin.version }} by {{ plugin.metadata.author }}</p>
            </div>
          </div>
        </div>

        <!-- Consequences Warning -->
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 class="font-medium text-red-800 mb-2">What will happen:</h4>
          <ul class="text-sm text-red-700 space-y-1">
            <li class="flex items-start space-x-2">
              <div class="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
              <span>The plugin will be permanently removed from your system</span>
            </li>
            <li class="flex items-start space-x-2">
              <div class="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
              <span>All plugin files and data will be deleted</span>
            </li>
            <li class="flex items-start space-x-2">
              <div class="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
              <span>Plugin settings and configuration will be lost</span>
            </li>
            <li v-if="plugin.enabled" class="flex items-start space-x-2">
              <div class="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
              <span>The plugin will be disabled first, then removed</span>
            </li>
            <li v-if="hasUserData" class="flex items-start space-x-2">
              <div class="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
              <span>Any user data created by this plugin will be deleted</span>
            </li>
          </ul>
        </div>

        <!-- Plugin Dependencies Warning -->
        <div v-if="hasDependents" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 class="font-medium text-yellow-800 mb-2">⚠️ Dependency Warning:</h4>
          <p class="text-sm text-yellow-700">
            Other plugins may depend on this plugin. Uninstalling it might affect their functionality.
          </p>
        </div>

        <!-- File Size Info -->
        <div class="text-sm text-gray-600">
          <span class="font-medium">Disk space to be freed:</span>
          {{ formatFileSize(plugin.metadata.fileSize) }}
        </div>

        <!-- Confirmation Input -->
        <div v-if="requireConfirmation" class="space-y-2">
          <label class="text-sm font-medium text-gray-700">
            Type "{{ plugin.name }}" to confirm uninstallation:
          </label>
          <Input
            v-model="confirmationText"
            :placeholder="plugin.name"
            class="w-full"
            :class="{ 'border-red-300': confirmationText && !isConfirmationValid }"
          />
        </div>
      </div>

      <DialogFooter class="flex justify-between">
        <Button
          variant="outline"
          @click="handleCancel"
          :disabled="isLoading"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          @click="handleConfirm"
          :disabled="isLoading || (requireConfirmation && !isConfirmationValid)"
          class="min-w-[100px]"
        >
          <div v-if="isLoading" class="flex items-center space-x-2">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Uninstalling...</span>
          </div>
          <span v-else>Uninstall</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { EnhancedSearchPlugin } from '@/lib/plugins/types'
import { PluginUtils } from '@/lib/plugins/types'

// Simple icon component
const AlertTriangleIcon = { 
  template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' 
}

interface Props {
  /** Whether the dialog is open */
  open: boolean
  /** The plugin to uninstall */
  plugin: EnhancedSearchPlugin | null
  /** Whether the uninstall operation is in progress */
  isLoading?: boolean
  /** Whether to require confirmation text input */
  requireConfirmation?: boolean
}

interface Emits {
  /** Emitted when dialog open state changes */
  'update:open': [open: boolean]
  /** Emitted when user confirms uninstallation */
  'confirm': [pluginId: string]
  /** Emitted when user cancels uninstallation */
  'cancel': []
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  requireConfirmation: true
})

const emit = defineEmits<Emits>()

// Reactive state
const confirmationText = ref('')

// Computed properties
const isConfirmationValid = computed(() => {
  if (!props.requireConfirmation || !props.plugin) return true
  return confirmationText.value.trim() === props.plugin.name
})

const hasUserData = computed(() => {
  // Check if plugin has user data that will be lost
  // This could be determined by plugin metadata or settings
  return props.plugin?.metadata.fileSize && props.plugin.metadata.fileSize > 1024 * 1024 // > 1MB suggests user data
})

const hasDependents = computed(() => {
  // Check if other plugins depend on this plugin
  // This would typically be determined by checking plugin dependencies
  return props.plugin?.metadata.dependencies && props.plugin.metadata.dependencies.length > 0
})

// Event handlers
const handleConfirm = () => {
  if (!props.plugin || props.isLoading) return
  
  if (props.requireConfirmation && !isConfirmationValid.value) {
    return
  }
  
  emit('confirm', props.plugin.id)
}

const handleCancel = () => {
  if (props.isLoading) return
  
  // Reset confirmation text
  confirmationText.value = ''
  emit('cancel')
}

// Utility functions
const formatFileSize = (bytes: number): string => {
  return PluginUtils.formatFileSize(bytes)
}

// Watch for dialog open state changes
const handleOpenChange = (open: boolean) => {
  if (!open) {
    confirmationText.value = ''
  }
  emit('update:open', open)
}
</script>