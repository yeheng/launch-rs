<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center space-x-2">
          <component :is="plugin?.icon" class="w-5 h-5" />
          <span>{{ plugin?.name }} Settings</span>
        </DialogTitle>
        <DialogDescription>
          Configure {{ plugin?.name }} plugin settings. Changes are applied immediately.
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 overflow-y-auto pr-2">
        <form @submit.prevent="handleSave" class="space-y-6">
          <!-- Settings Groups -->
          <div v-for="group in settingsGroups" :key="group.name" class="space-y-4">
            <!-- Group Header -->
            <div v-if="group.name !== 'default'" class="border-b pb-2">
              <h3 class="text-sm font-medium text-gray-900">{{ group.label }}</h3>
              <p v-if="group.description" class="text-xs text-gray-500 mt-1">
                {{ group.description }}
              </p>
            </div>

            <!-- Settings in Group -->
            <div class="space-y-4">
              <div 
                v-for="setting in group.settings" 
                :key="setting.key"
                v-show="shouldShowSetting(setting)"
                class="space-y-2"
              >
                <!-- Setting Label -->
                <div class="flex items-center justify-between">
                  <Label 
                    :for="setting.key" 
                    class="text-sm font-medium"
                    :class="{ 'text-red-600': hasError(setting.key) }"
                  >
                    {{ setting.label }}
                    <span v-if="setting.required" class="text-red-500 ml-1">*</span>
                  </Label>
                  
                  <!-- Advanced Setting Indicator -->
                  <span 
                    v-if="setting.advanced" 
                    class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded"
                  >
                    Advanced
                  </span>
                </div>

                <!-- Setting Description -->
                <p v-if="setting.description" class="text-xs text-gray-600">
                  {{ setting.description }}
                </p>

                <!-- Setting Input -->
                <div class="space-y-1">
                  <!-- Boolean Setting -->
                  <div v-if="setting.type === 'boolean'" class="flex items-center space-x-2">
                    <Switch
                      :id="setting.key"
                      :checked="getSettingValue(setting.key, setting.defaultValue)"
                      @update:checked="(value: boolean) => updateSetting(setting.key, value)"
                      :disabled="isLoading"
                    />
                    <Label :for="setting.key" class="text-sm text-gray-700">
                      {{ getSettingValue(setting.key, setting.defaultValue) ? 'Enabled' : 'Disabled' }}
                    </Label>
                  </div>

                  <!-- String Setting -->
                  <Input
                    v-else-if="setting.type === 'string'"
                    :id="setting.key"
                    :value="getSettingValue(setting.key, setting.defaultValue)"
                    @input="(e) => updateSetting(setting.key, (e.target as HTMLInputElement).value)"
                    :placeholder="setting.defaultValue?.toString() || ''"
                    :disabled="isLoading"
                    :class="{ 'border-red-500': hasError(setting.key) }"
                  />

                  <!-- Number Setting -->
                  <Input
                    v-else-if="setting.type === 'number'"
                    :id="setting.key"
                    type="number"
                    :value="getSettingValue(setting.key, setting.defaultValue)"
                    @input="(e) => updateSetting(setting.key, parseFloat((e.target as HTMLInputElement).value))"
                    :placeholder="setting.defaultValue?.toString() || '0'"
                    :disabled="isLoading"
                    :class="{ 'border-red-500': hasError(setting.key) }"
                  />

                  <!-- Select Setting -->
                  <Select
                    v-else-if="setting.type === 'select'"
                    :value="getSettingValue(setting.key, setting.defaultValue)?.toString()"
                    @update:value="(value: string) => updateSetting(setting.key, parseSelectValue(value, setting))"
                    :disabled="isLoading"
                  >
                    <SelectTrigger :class="{ 'border-red-500': hasError(setting.key) }">
                      <SelectValue :placeholder="`Select ${setting.label.toLowerCase()}`" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem 
                        v-for="option in setting.options" 
                        :key="option.value" 
                        :value="option.value?.toString()"
                      >
                        {{ option.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <!-- File Setting -->
                  <div v-else-if="setting.type === 'file'" class="space-y-2">
                    <div class="flex items-center space-x-2">
                      <Input
                        :id="setting.key"
                        :value="getSettingValue(setting.key, setting.defaultValue)"
                        @input="(e) => updateSetting(setting.key, (e.target as HTMLInputElement).value)"
                        :placeholder="setting.defaultValue?.toString() || 'Select file...'"
                        :disabled="isLoading"
                        :class="{ 'border-red-500': hasError(setting.key) }"
                        readonly
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        @click="selectFile(setting.key)"
                        :disabled="isLoading"
                      >
                        Browse
                      </Button>
                    </div>
                  </div>

                  <!-- Directory Setting -->
                  <div v-else-if="setting.type === 'directory'" class="space-y-2">
                    <div class="flex items-center space-x-2">
                      <Input
                        :id="setting.key"
                        :value="getSettingValue(setting.key, setting.defaultValue)"
                        @input="(e) => updateSetting(setting.key, (e.target as HTMLInputElement).value)"
                        :placeholder="setting.defaultValue?.toString() || 'Select directory...'"
                        :disabled="isLoading"
                        :class="{ 'border-red-500': hasError(setting.key) }"
                        readonly
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        @click="selectDirectory(setting.key)"
                        :disabled="isLoading"
                      >
                        Browse
                      </Button>
                    </div>
                  </div>

                  <!-- Multiselect Setting -->
                  <div v-else-if="setting.type === 'multiselect'" class="space-y-2">
                    <div class="border rounded-md p-3 space-y-2 max-h-32 overflow-y-auto">
                      <div 
                        v-for="option in setting.options" 
                        :key="option.value"
                        class="flex items-center space-x-2"
                      >
                        <input
                          :id="`${setting.key}-${option.value}`"
                          type="checkbox"
                          :checked="isMultiselectSelected(setting.key, option.value)"
                          @change="(e) => toggleMultiselect(setting.key, option.value, (e.target as HTMLInputElement).checked)"
                          :disabled="isLoading"
                          class="rounded border-gray-300"
                        />
                        <Label 
                          :for="`${setting.key}-${option.value}`" 
                          class="text-sm text-gray-700 cursor-pointer"
                        >
                          {{ option.label }}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Validation Error -->
                <p v-if="hasError(setting.key)" class="text-xs text-red-600">
                  {{ getError(setting.key) }}
                </p>
              </div>
            </div>
          </div>

          <!-- No Settings Message -->
          <div v-if="!hasSettings" class="text-center py-8 text-gray-500">
            <p>This plugin has no configurable settings.</p>
          </div>
        </form>
      </div>

      <DialogFooter class="flex items-center justify-between pt-4 border-t">
        <div class="flex items-center space-x-2">
          <!-- Reset to Defaults -->
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="resetToDefaults"
            :disabled="isLoading || !hasChanges"
          >
            Reset to Defaults
          </Button>
          
          <!-- Validation Status -->
          <div v-if="hasValidationErrors" class="text-xs text-red-600">
            {{ validationErrorCount }} validation error{{ validationErrorCount > 1 ? 's' : '' }}
          </div>
          <div v-else-if="hasChanges" class="text-xs text-green-600">
            Settings saved automatically
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            @click="handleClose"
            :disabled="isLoading"
          >
            Close
          </Button>
        </div>
      </DialogFooter>

      <!-- Loading Overlay -->
      <div 
        v-if="isLoading" 
        class="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg"
      >
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    </DialogContent>
  </Dialog>
</template>
<script 
setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EnhancedSearchPlugin, PluginSettingDefinition } from '@/lib/plugins/types'

interface Props {
  /** Whether the dialog is open */
  open: boolean
  /** The plugin to configure */
  plugin: EnhancedSearchPlugin | null
  /** Whether the dialog is in a loading state */
  isLoading?: boolean
}

interface Emits {
  /** Emitted when dialog open state changes */
  'update:open': [open: boolean]
  /** Emitted when settings are saved */
  'save': [pluginId: string, settings: Record<string, any>]
  /** Emitted when settings are reset */
  'reset': [pluginId: string]
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false
})

const emit = defineEmits<Emits>()

// Local state
const currentSettings = ref<Record<string, any>>({})
const validationErrors = ref<Record<string, string>>({})
const hasChanges = ref(false)

// Settings groups for organization
interface SettingsGroup {
  name: string
  label: string
  description?: string
  settings: PluginSettingDefinition[]
}

// Computed properties
const hasSettings = computed(() => {
  return props.plugin?.settings?.schema && props.plugin.settings.schema.length > 0
})

const settingsSchema = computed(() => {
  return props.plugin?.settings?.schema || []
})

const settingsGroups = computed((): SettingsGroup[] => {
  if (!hasSettings.value) return []

  const groups = new Map<string, SettingsGroup>()
  
  // Initialize default group
  groups.set('default', {
    name: 'default',
    label: 'General Settings',
    settings: []
  })

  // Group settings by their group property
  for (const setting of settingsSchema.value) {
    const enhancedSetting = setting as PluginSettingDefinition
    const groupName = enhancedSetting.group || 'default'
    
    if (!groups.has(groupName)) {
      groups.set(groupName, {
        name: groupName,
        label: formatGroupName(groupName),
        settings: []
      })
    }
    
    groups.get(groupName)!.settings.push(enhancedSetting)
  }

  // Sort settings within each group by order
  for (const group of groups.values()) {
    group.settings.sort((a, b) => (a.order || 0) - (b.order || 0))
  }

  return Array.from(groups.values()).filter(group => group.settings.length > 0)
})

const hasValidationErrors = computed(() => {
  return Object.keys(validationErrors.value).length > 0
})

const validationErrorCount = computed(() => {
  return Object.keys(validationErrors.value).length
})

// Watch for plugin changes
watch(() => props.plugin, (newPlugin) => {
  if (newPlugin) {
    initializeSettings()
  }
}, { immediate: true })

watch(() => props.open, (isOpen) => {
  if (isOpen && props.plugin) {
    initializeSettings()
  }
})

// Methods
const initializeSettings = () => {
  if (!props.plugin?.settings) return

  // Initialize current settings with plugin values or defaults
  const settings: Record<string, any> = {}
  
  for (const setting of settingsSchema.value) {
    const currentValue = props.plugin.settings.values[setting.key]
    settings[setting.key] = currentValue !== undefined ? currentValue : setting.defaultValue
  }
  
  currentSettings.value = settings
  validationErrors.value = {}
  hasChanges.value = false
}

const getSettingValue = (key: string, defaultValue: any) => {
  return currentSettings.value[key] !== undefined ? currentSettings.value[key] : defaultValue
}

const updateSetting = async (key: string, value: any) => {
  // Update the setting value
  currentSettings.value[key] = value
  hasChanges.value = true
  
  // Clear previous validation error
  delete validationErrors.value[key]
  
  // Validate the new value
  await validateSetting(key, value)
  
  // Auto-save if validation passes
  if (!hasError(key)) {
    await saveSettings()
  }
}

const validateSetting = async (key: string, value: any) => {
  const setting = settingsSchema.value.find(s => s.key === key)
  if (!setting) return

  // Required validation
  const enhancedSetting = setting as PluginSettingDefinition
  if (enhancedSetting.required && (value === undefined || value === null || value === '')) {
    validationErrors.value[key] = `${setting.label} is required`
    return
  }

  // Custom validation
  if (setting.validate && value !== undefined && value !== null) {
    const result = setting.validate(value)
    if (result !== true) {
      validationErrors.value[key] = typeof result === 'string' ? result : `Invalid value for ${setting.label}`
      return
    }
  }

  // Type-specific validation
  if (setting.type === 'number' && value !== undefined && value !== null) {
    if (isNaN(Number(value))) {
      validationErrors.value[key] = `${setting.label} must be a valid number`
      return
    }
  }

  // Clear error if validation passes
  delete validationErrors.value[key]
}

const validateAllSettings = async () => {
  validationErrors.value = {}
  
  for (const setting of settingsSchema.value) {
    const value = currentSettings.value[setting.key]
    await validateSetting(setting.key, value)
  }
}

const saveSettings = async () => {
  if (!props.plugin || hasValidationErrors.value) return

  try {
    // Validate all settings before saving
    await validateAllSettings()
    
    if (hasValidationErrors.value) return

    // Emit save event with current settings
    emit('save', props.plugin.id, { ...currentSettings.value })
    hasChanges.value = false
  } catch (error) {
    console.error('Failed to save plugin settings:', error)
  }
}

const resetToDefaults = async () => {
  if (!props.plugin) return

  // Reset all settings to their default values
  const defaultSettings: Record<string, any> = {}
  
  for (const setting of settingsSchema.value) {
    defaultSettings[setting.key] = setting.defaultValue
  }
  
  currentSettings.value = defaultSettings
  validationErrors.value = {}
  hasChanges.value = true
  
  // Auto-save the defaults
  await saveSettings()
  
  // Emit reset event
  emit('reset', props.plugin.id)
}

const shouldShowSetting = (setting: PluginSettingDefinition): boolean => {
  const enhancedSetting = setting as PluginSettingDefinition
  
  // Check if setting has a dependency
  if (enhancedSetting.dependsOn) {
    const dependencyValue = currentSettings.value[enhancedSetting.dependsOn]
    // Only show if dependency is truthy
    if (!dependencyValue) return false
  }
  
  // Check custom condition
  if (enhancedSetting.condition) {
    return enhancedSetting.condition(currentSettings.value)
  }
  
  return true
}

const hasError = (key: string): boolean => {
  return key in validationErrors.value
}

const getError = (key: string): string => {
  return validationErrors.value[key] || ''
}

const parseSelectValue = (value: string, setting: PluginSettingDefinition): any => {
  // Find the option to get the correct type
  const option = setting.options?.find(opt => opt.value?.toString() === value)
  return option ? option.value : value
}

const isMultiselectSelected = (key: string, value: any): boolean => {
  const currentValue = currentSettings.value[key]
  return Array.isArray(currentValue) && currentValue.includes(value)
}

const toggleMultiselect = (key: string, value: any, checked: boolean) => {
  let currentValue = currentSettings.value[key] || []
  
  if (!Array.isArray(currentValue)) {
    currentValue = []
  }
  
  if (checked) {
    if (!currentValue.includes(value)) {
      currentValue = [...currentValue, value]
    }
  } else {
    currentValue = currentValue.filter((v: any) => v !== value)
  }
  
  updateSetting(key, currentValue)
}

const selectFile = async (key: string) => {
  try {
    // For now, use a simple prompt as fallback
    // In a real implementation, this would use Tauri's file dialog
    const selected = prompt('Enter file path:')
    
    if (selected) {
      updateSetting(key, selected)
    }
  } catch (error) {
    console.error('Failed to select file:', error)
  }
}

const selectDirectory = async (key: string) => {
  try {
    // For now, use a simple prompt as fallback
    // In a real implementation, this would use Tauri's file dialog
    const selected = prompt('Enter directory path:')
    
    if (selected) {
      updateSetting(key, selected)
    }
  } catch (error) {
    console.error('Failed to select directory:', error)
  }
}

const formatGroupName = (groupName: string): string => {
  return groupName
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const handleSave = async () => {
  await saveSettings()
}

const handleClose = () => {
  emit('update:open', false)
}

const handleOpenChange = (open: boolean) => {
  emit('update:open', open)
}
</script>