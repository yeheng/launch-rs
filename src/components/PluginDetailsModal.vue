<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center space-x-3">
          <component :is="plugin?.icon" class="w-6 h-6" />
          <div class="flex-1">
            <div class="flex items-center space-x-2">
              <span>{{ plugin?.name }}</span>
              <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                v{{ plugin?.version }}
              </span>
              <div 
                class="w-2 h-2 rounded-full"
                :class="plugin?.enabled ? 'bg-green-500' : 'bg-gray-400'"
                :title="plugin?.enabled ? 'Enabled' : 'Disabled'"
              />
            </div>
          </div>
        </DialogTitle>
        <DialogDescription>
          {{ plugin?.description }}
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 overflow-y-auto">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Information -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Basic Information -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-gray-900">Plugin Information</h3>
              <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-sm font-medium text-gray-600">Author</label>
                    <p class="text-sm text-gray-900">{{ plugin?.metadata?.author || 'Unknown' }}</p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-600">Category</label>
                    <p class="text-sm text-gray-900">{{ formatCategory(plugin?.metadata?.category) }}</p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-600">License</label>
                    <p class="text-sm text-gray-900">{{ plugin?.metadata?.license || 'Unknown' }}</p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-600">Installation Date</label>
                    <p class="text-sm text-gray-900">
                      {{ plugin?.metadata?.installDate ? formatDate(plugin.metadata.installDate) : 'Unknown' }}
                    </p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-600">Last Updated</label>
                    <p class="text-sm text-gray-900">
                      {{ plugin?.metadata?.lastUpdated ? formatDate(plugin.metadata.lastUpdated) : 'Unknown' }}
                    </p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-600">File Size</label>
                    <p class="text-sm text-gray-900">
                      {{ plugin?.metadata?.fileSize ? formatFileSize(plugin.metadata.fileSize) : 'Unknown' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Installation Information -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-gray-900">Installation Details</h3>
              <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-sm font-medium text-gray-600">Installation Type</label>
                    <p class="text-sm text-gray-900">
                      {{ plugin?.installation?.isBuiltIn ? 'Built-in' : 'User Installed' }}
                    </p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-600">Installation Method</label>
                    <p class="text-sm text-gray-900">
                      {{ formatInstallMethod(plugin?.installation?.installMethod) }}
                    </p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-600">Status</label>
                    <div class="flex items-center space-x-2">
                      <div 
                        class="w-2 h-2 rounded-full"
                        :class="getStatusColor(plugin?.installation?.status)"
                      />
                      <span class="text-sm text-gray-900">
                        {{ formatInstallationStatus(plugin?.installation?.status) }}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-600">Can Uninstall</label>
                    <p class="text-sm text-gray-900">
                      {{ plugin?.installation?.canUninstall ? 'Yes' : 'No' }}
                    </p>
                  </div>
                </div>
                <div v-if="plugin?.installation?.installPath">
                  <label class="text-sm font-medium text-gray-600">Installation Path</label>
                  <p class="text-xs text-gray-700 font-mono bg-white p-2 rounded border break-all">
                    {{ plugin.installation.installPath }}
                  </p>
                </div>
              </div>
            </div>

            <!-- System Requirements -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-gray-900">System Requirements</h3>
              <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                <div class="grid grid-cols-1 gap-4">
                  <div v-if="plugin?.metadata?.minAppVersion">
                    <label class="text-sm font-medium text-gray-600">Minimum App Version</label>
                    <p class="text-sm text-gray-900">{{ plugin.metadata.minAppVersion }}</p>
                  </div>
                  <div v-if="plugin?.metadata?.dependencies && plugin.metadata.dependencies.length > 0">
                    <label class="text-sm font-medium text-gray-600">Dependencies</label>
                    <div class="flex flex-wrap gap-2 mt-1">
                      <span 
                        v-for="dep in plugin.metadata.dependencies" 
                        :key="dep"
                        class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                      >
                        {{ dep }}
                      </span>
                    </div>
                  </div>
                  <div v-else>
                    <label class="text-sm font-medium text-gray-600">Dependencies</label>
                    <p class="text-sm text-gray-500">No dependencies</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Resource Usage -->
            <div v-if="plugin?.health?.metrics" class="space-y-4">
              <h3 class="text-lg font-semibold text-gray-900">Resource Usage</h3>
              <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-sm font-medium text-gray-600">Memory Usage</label>
                    <p class="text-sm text-gray-900">
                      {{ formatFileSize(plugin.health.metrics.memoryUsage) }}
                    </p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-600">CPU Usage</label>
                    <p class="text-sm text-gray-900">{{ plugin.health.metrics.cpuUsage.toFixed(1) }}%</p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-600">Average Search Time</label>
                    <p class="text-sm text-gray-900">{{ plugin.health.metrics.avgSearchTime }}ms</p>
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-600">Success Rate</label>
                    <p class="text-sm text-gray-900">{{ plugin.health.metrics.successRate.toFixed(1) }}%</p>
                  </div>
                </div>
                <div v-if="plugin.health.metrics.errorCount > 0">
                  <label class="text-sm font-medium text-gray-600">Error Count</label>
                  <p class="text-sm text-red-600">{{ plugin.health.metrics.errorCount }} errors</p>
                </div>
              </div>
            </div>

            <!-- Keywords/Tags -->
            <div v-if="plugin?.metadata?.keywords && plugin.metadata.keywords.length > 0" class="space-y-4">
              <h3 class="text-lg font-semibold text-gray-900">Keywords</h3>
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="keyword in plugin.metadata.keywords" 
                  :key="keyword"
                  class="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                >
                  {{ keyword }}
                </span>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Permissions -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-gray-900">Permissions</h3>
              <div class="space-y-2">
                <div v-if="!plugin?.permissions || plugin.permissions.length === 0">
                  <p class="text-sm text-gray-500">No special permissions required</p>
                </div>
                <div v-else>
                  <div 
                    v-for="permission in plugin.permissions" 
                    :key="permission.type"
                    class="border rounded-lg p-3 space-y-2"
                    :class="getPermissionBorderClass(permission.type)"
                  >
                    <div class="flex items-center space-x-2">
                      <component :is="getPermissionIcon(permission.type)" class="w-4 h-4" />
                      <span class="text-sm font-medium">{{ formatPermissionType(permission.type) }}</span>
                      <span 
                        v-if="permission.required" 
                        class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded"
                      >
                        Required
                      </span>
                    </div>
                    <p class="text-xs text-gray-600">{{ permission.description }}</p>
                    <p v-if="permission.details" class="text-xs text-gray-500">{{ permission.details }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Health Status -->
            <div v-if="plugin?.health" class="space-y-4">
              <h3 class="text-lg font-semibold text-gray-900">Health Status</h3>
              <div class="border rounded-lg p-3 space-y-3">
                <div class="flex items-center space-x-2">
                  <div 
                    class="w-3 h-3 rounded-full"
                    :class="getHealthStatusColor(plugin.health.status)"
                  />
                  <span class="text-sm font-medium">{{ formatHealthStatus(plugin.health.status) }}</span>
                </div>
                <p class="text-xs text-gray-600">
                  Last checked: {{ formatDate(plugin.health.lastCheck) }}
                </p>
                <div v-if="plugin.health.issues && plugin.health.issues.length > 0" class="space-y-2">
                  <p class="text-xs font-medium text-gray-700">Issues:</p>
                  <div 
                    v-for="issue in plugin.health.issues" 
                    :key="issue.message"
                    class="text-xs p-2 rounded"
                    :class="getIssueSeverityClass(issue.severity)"
                  >
                    <p class="font-medium">{{ formatIssueType(issue.type) }}</p>
                    <p>{{ issue.message }}</p>
                    <p v-if="issue.suggestedFix" class="mt-1 italic">
                      Suggestion: {{ issue.suggestedFix }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- External Links -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-gray-900">Links</h3>
              <div class="space-y-2">
                <a 
                  v-if="plugin?.metadata?.homepage"
                  :href="plugin.metadata.homepage"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLinkIcon class="w-4 h-4" />
                  <span>Homepage</span>
                </a>
                <a 
                  v-if="plugin?.metadata?.repository"
                  :href="plugin.metadata.repository"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <CodeIcon class="w-4 h-4" />
                  <span>Source Code</span>
                </a>
                <div v-if="!plugin?.metadata?.homepage && !plugin?.metadata?.repository">
                  <p class="text-sm text-gray-500">No external links available</p>
                </div>
              </div>
            </div>

            <!-- Statistics -->
            <div v-if="plugin?.metadata?.rating !== undefined || plugin?.metadata?.downloadCount !== undefined" class="space-y-4">
              <h3 class="text-lg font-semibold text-gray-900">Statistics</h3>
              <div class="border rounded-lg p-3 space-y-2">
                <div v-if="plugin.metadata.rating !== undefined">
                  <label class="text-sm font-medium text-gray-600">Rating</label>
                  <div class="flex items-center space-x-1">
                    <div class="flex">
                      <StarIcon 
                        v-for="i in 5" 
                        :key="i"
                        class="w-4 h-4"
                        :class="i <= plugin.metadata.rating ? 'text-yellow-400' : 'text-gray-300'"
                      />
                    </div>
                    <span class="text-sm text-gray-600">({{ plugin.metadata.rating }}/5)</span>
                  </div>
                </div>
                <div v-if="plugin.metadata.downloadCount !== undefined">
                  <label class="text-sm font-medium text-gray-600">Downloads</label>
                  <p class="text-sm text-gray-900">{{ formatNumber(plugin.metadata.downloadCount) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="flex items-center justify-between pt-4 border-t">
        <div class="flex items-center space-x-2">
          <!-- Plugin Actions -->
          <Button
            v-if="plugin?.settings?.schema && plugin.settings.schema.length > 0"
            variant="outline"
            size="sm"
            @click="handleConfigure"
            :disabled="!plugin?.enabled"
          >
            <SettingsIcon class="w-4 h-4 mr-2" />
            Configure
          </Button>
          
          <Button
            v-if="plugin?.installation?.canUninstall"
            variant="destructive"
            size="sm"
            @click="handleUninstall"
          >
            <TrashIcon class="w-4 h-4 mr-2" />
            Uninstall
          </Button>
        </div>

        <Button @click="handleClose">
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { 
  EnhancedSearchPlugin, 
  PluginCategory, 
  PluginPermissionType, 
  PluginInstallationStatus,
  PluginHealthLevel,
  PluginIssueType
} from '@/lib/plugins/types'
import { PluginUtils } from '@/lib/plugins/types'

// Icon components (simplified SVG icons)
const ExternalLinkIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' }
const CodeIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>' }
const StarIcon = { template: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>' }
const SettingsIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/></svg>' }
const TrashIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' }
const ShieldIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' }
const NetworkIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>' }
const FileIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>' }
const ClipboardIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>' }
const BellIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' }
const TerminalIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>' }

interface Props {
  /** Whether the modal is open */
  open: boolean
  /** The plugin to display details for */
  plugin: EnhancedSearchPlugin | null
}

interface Emits {
  /** Emitted when modal open state changes */
  'update:open': [open: boolean]
  /** Emitted when configure button is clicked */
  'configure': [pluginId: string]
  /** Emitted when uninstall button is clicked */
  'uninstall': [pluginId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Utility functions
const formatCategory = (category?: PluginCategory): string => {
  if (!category) return 'Unknown'
  return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatFileSize = (bytes: number): string => {
  return PluginUtils.formatFileSize(bytes)
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num)
}

const formatInstallMethod = (method?: string): string => {
  if (!method) return 'Unknown'
  return method.charAt(0).toUpperCase() + method.slice(1)
}

const formatInstallationStatus = (status?: PluginInstallationStatus): string => {
  if (!status) return 'Unknown'
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
}

const formatPermissionType = (type: PluginPermissionType): string => {
  return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
}

const formatHealthStatus = (status: PluginHealthLevel): string => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const formatIssueType = (type: PluginIssueType): string => {
  return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
}

// Style utility functions
const getStatusColor = (status?: PluginInstallationStatus): string => {
  switch (status) {
    case 'installed': return 'bg-green-500'
    case 'installing': return 'bg-blue-500'
    case 'uninstalling': return 'bg-orange-500'
    case 'updating': return 'bg-blue-500'
    case 'failed': return 'bg-red-500'
    case 'pending': return 'bg-yellow-500'
    default: return 'bg-gray-400'
  }
}

const getHealthStatusColor = (status: PluginHealthLevel): string => {
  switch (status) {
    case 'healthy': return 'bg-green-500'
    case 'warning': return 'bg-yellow-500'
    case 'error': return 'bg-red-500'
    case 'unknown': return 'bg-gray-400'
    default: return 'bg-gray-400'
  }
}

const getPermissionBorderClass = (type: PluginPermissionType): string => {
  switch (type) {
    case 'filesystem':
    case 'shell':
      return 'border-red-200 bg-red-50'
    case 'network':
      return 'border-orange-200 bg-orange-50'
    case 'system':
      return 'border-yellow-200 bg-yellow-50'
    default:
      return 'border-gray-200 bg-gray-50'
  }
}

const getIssueSeverityClass = (severity: string): string => {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800'
    case 'high': return 'bg-red-50 text-red-700'
    case 'medium': return 'bg-yellow-50 text-yellow-700'
    case 'low': return 'bg-blue-50 text-blue-700'
    default: return 'bg-gray-50 text-gray-700'
  }
}

const getPermissionIcon = (type: PluginPermissionType) => {
  switch (type) {
    case 'filesystem': return FileIcon
    case 'network': return NetworkIcon
    case 'system': return ShieldIcon
    case 'clipboard': return ClipboardIcon
    case 'notifications': return BellIcon
    case 'shell': return TerminalIcon
    default: return ShieldIcon
  }
}

// Event handlers
const handleClose = () => {
  emit('update:open', false)
}

const handleOpenChange = (open: boolean) => {
  emit('update:open', open)
}

const handleConfigure = () => {
  if (props.plugin) {
    emit('configure', props.plugin.id)
  }
}

const handleUninstall = () => {
  if (props.plugin) {
    emit('uninstall', props.plugin.id)
  }
}
</script>