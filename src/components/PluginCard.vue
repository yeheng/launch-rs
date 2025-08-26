<template>
  <div 
    class="border rounded-lg p-4 transition-all duration-200 hover:shadow-md"
    :class="cardClasses"
  >
    <!-- Plugin Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-3">
        <!-- Plugin Icon -->
        <div class="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border">
          <component 
            :is="plugin.icon" 
            class="w-6 h-6 text-gray-600" 
            :class="{ 'text-blue-600': plugin.enabled }"
          />
        </div>
        
        <!-- Plugin Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2">
            <h3 class="font-semibold text-gray-900 truncate">{{ plugin.name }}</h3>
            <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              v{{ plugin.version }}
            </span>
            <div v-if="showStatus" class="flex items-center">
              <div 
                class="w-2 h-2 rounded-full"
                :class="statusIndicatorClass"
              />
            </div>
          </div>
          <p class="text-sm text-gray-600 truncate mt-1">{{ plugin.description }}</p>
        </div>
      </div>
      
      <!-- Enable/Disable Toggle -->
      <div class="flex items-center space-x-2">
        <Switch 
          :checked="plugin.enabled" 
          @update:checked="handleToggleEnabled"
          :disabled="isLoading || !canToggle"
          class="shrink-0"
        />
      </div>
    </div>
    
    <!-- Plugin Metadata (when expanded) -->
    <div v-if="showDetails && plugin.metadata" class="mb-3 text-xs text-gray-500 space-y-1">
      <div class="flex items-center justify-between">
        <span>Author: {{ plugin.metadata.author }}</span>
        <span>Category: {{ formatCategory(plugin.metadata.category) }}</span>
      </div>
      <div v-if="plugin.metadata.installDate" class="flex items-center justify-between">
        <span>Installed: {{ formatDate(plugin.metadata.installDate) }}</span>
        <span v-if="plugin.metadata.fileSize">Size: {{ formatFileSize(plugin.metadata.fileSize) }}</span>
      </div>
    </div>

    <!-- Plugin Actions -->
    <div class="flex items-center justify-between pt-3 border-t">
      <div class="flex items-center space-x-2">
        <!-- Configure Button -->
        <Button
          v-if="hasSettings"
          variant="outline"
          size="sm"
          @click="handleConfigure"
          :disabled="isLoading || !plugin.enabled"
          class="text-xs"
        >
          <SettingsIcon class="w-3 h-3 mr-1" />
          Configure
        </Button>
        
        <!-- View Details Button -->
        <Button
          variant="ghost"
          size="sm"
          @click="handleViewDetails"
          :disabled="isLoading"
          class="text-xs"
        >
          <InfoIcon class="w-3 h-3 mr-1" />
          Details
        </Button>
      </div>
      
      <div class="flex items-center space-x-2">
        <!-- Plugin Status Info -->
        <div v-if="plugin.enabled" class="text-xs text-gray-500">
          <span v-if="plugin.priority">Priority: {{ plugin.priority }}</span>
        </div>
        
        <!-- Uninstall Button -->
        <Button
          v-if="canUninstall"
          variant="destructive"
          size="sm"
          @click="handleUninstall"
          :disabled="isLoading"
          class="text-xs"
        >
          <TrashIcon class="w-3 h-3 mr-1" />
          Uninstall
        </Button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div 
      v-if="isLoading" 
      class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg backdrop-blur-sm"
    >
      <LoadingSpinner size="md" variant="primary" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { LoadingSpinner } from '@/components/ui/loading'
import type { EnhancedSearchPlugin, PluginCategory } from '@/lib/plugins/types'
import { PluginUtils } from '@/lib/plugins/types'

// Simple icon components (you can replace with actual icon library)
const SettingsIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/></svg>' }
const InfoIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>' }
const TrashIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' }

interface Props {
  /** The plugin to display */
  plugin: EnhancedSearchPlugin
  /** Whether to show detailed information */
  showDetails?: boolean
  /** Whether to show status indicator */
  showStatus?: boolean
  /** Whether the card is in a loading state */
  isLoading?: boolean
  /** Whether actions should be shown */
  showActions?: boolean
  /** Compact mode for smaller cards */
  compact?: boolean
}

interface Emits {
  /** Emitted when plugin enabled state is toggled */
  'toggle-enabled': [pluginId: string, enabled: boolean]
  /** Emitted when configure button is clicked */
  'configure': [pluginId: string]
  /** Emitted when uninstall button is clicked */
  'uninstall': [pluginId: string]
  /** Emitted when view details button is clicked */
  'view-details': [pluginId: string]
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: false,
  showStatus: true,
  isLoading: false,
  showActions: true,
  compact: false
})

const emit = defineEmits<Emits>()

// Computed properties
const cardClasses = computed(() => ({
  'border-blue-200 bg-blue-50/30': props.plugin.enabled,
  'border-gray-200 bg-white': !props.plugin.enabled,
  'opacity-50': props.isLoading,
  'relative': true,
  'hover:border-blue-300': props.plugin.enabled,
  'hover:border-gray-300': !props.plugin.enabled
}))

const statusIndicatorClass = computed(() => ({
  'bg-green-500': props.plugin.enabled,
  'bg-gray-400': !props.plugin.enabled
}))

const hasSettings = computed(() => {
  return props.plugin.settings && props.plugin.settings.schema.length > 0
})

const canToggle = computed(() => {
  return !props.plugin.installation?.isBuiltIn || props.plugin.installation?.canUninstall !== false
})

const canUninstall = computed(() => {
  return props.plugin.installation?.canUninstall !== false && 
         !props.plugin.installation?.isBuiltIn &&
         props.showActions
})

// Event handlers
const handleToggleEnabled = (enabled: boolean) => {
  if (props.isLoading || !canToggle.value) return
  emit('toggle-enabled', props.plugin.id, enabled)
}

const handleConfigure = () => {
  if (props.isLoading) return
  emit('configure', props.plugin.id)
}

const handleUninstall = () => {
  if (props.isLoading) return
  emit('uninstall', props.plugin.id)
}

const handleViewDetails = () => {
  if (props.isLoading) return
  emit('view-details', props.plugin.id)
}

// Utility functions
const formatCategory = (category: PluginCategory): string => {
  return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

const formatFileSize = (bytes: number): string => {
  return PluginUtils.formatFileSize(bytes)
}
</script>