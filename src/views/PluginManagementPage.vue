<template>
  <ErrorBoundary
    ref="errorBoundaryRef"
    :can-retry="true"
    :can-reset="true"
    :on-retry="loadPlugins"
    :on-reset="() => { plugins = []; error = null; }"
    error-title="Plugin Management Error"
    error-message="There was an error loading the plugin management interface."
    fallback-message="You can try refreshing the page or contact support if the problem persists."
    @error="(err) => console.error('Plugin management error:', err)"
    @retry="loadPlugins"
  >
    <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Navigation -->
        <div class="flex items-center justify-between pt-4 pb-2">
          <Breadcrumb :items="breadcrumbItems" />
          <Button 
            variant="ghost" 
            size="sm"
            @click="navigateHome"
            class="text-gray-600 hover:text-gray-700"
          >
            <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Home
          </Button>
        </div>
        
        <div class="py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Plugin Management</h1>
              <p class="mt-1 text-sm text-gray-500">
                Manage your plugins, configure settings, and discover new functionality
              </p>
            </div>
            
            <!-- Plugin Statistics -->
            <div v-if="statistics" class="flex items-center space-x-6 text-sm text-gray-600">
              <div class="text-center">
                <div class="text-lg font-semibold text-gray-900">{{ statistics.total }}</div>
                <div>Total</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-semibold text-green-600">{{ statistics.enabled }}</div>
                <div>Enabled</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-semibold text-blue-600">{{ statistics.installed }}</div>
                <div>Installed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Search Input -->
          <div class="flex-1">
            <div class="relative">
              <SearchIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                v-model="searchQuery"
                placeholder="Search plugins by name, description, or keywords..."
                class="pl-10"
                @input="debouncedSearch"
              />
            </div>
          </div>
          
          <!-- Category Filter -->
          <div class="w-full sm:w-48">
            <Select v-model="selectedCategory" @update:value="handleCategoryChange">
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem 
                  v-for="category in availableCategories" 
                  :key="category" 
                  :value="category"
                >
                  {{ formatCategory(category) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <!-- Status Filter -->
          <div class="w-full sm:w-32">
            <Select v-model="statusFilter" @update:value="handleStatusChange">
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <!-- Sort Options -->
          <div class="w-full sm:w-40">
            <Select v-model="sortBy" @update:value="handleSortChange">
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="installDate">Install Date</SelectItem>
                <SelectItem value="lastUpdated">Last Updated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <!-- Plugin Health and Recommendations -->
      <div v-if="healthSummary && (healthSummary.withWarnings > 0 || healthSummary.withErrors > 0 || pluginRecommendations.length > 0)" class="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Plugin Health & Recommendations</h3>
        
        <!-- Health Summary -->
        <div v-if="healthSummary.withWarnings > 0 || healthSummary.withErrors > 0" class="mb-4">
          <div class="flex items-center space-x-4 text-sm">
            <div v-if="healthSummary.withErrors > 0" class="flex items-center text-red-600">
              <AlertCircleIcon class="w-4 h-4 mr-1" />
              {{ healthSummary.withErrors }} plugin{{ healthSummary.withErrors !== 1 ? 's' : '' }} with errors
            </div>
            <div v-if="healthSummary.withWarnings > 0" class="flex items-center text-yellow-600">
              <AlertCircleIcon class="w-4 h-4 mr-1" />
              {{ healthSummary.withWarnings }} plugin{{ healthSummary.withWarnings !== 1 ? 's' : '' }} with warnings
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        <div v-if="pluginRecommendations.length > 0" class="space-y-2">
          <h4 class="text-sm font-medium text-gray-700">Recommendations:</h4>
          <div class="space-y-1">
            <div 
              v-for="recommendation in pluginRecommendations.slice(0, 3)" 
              :key="`${recommendation.pluginId}-${recommendation.type}`"
              class="flex items-center justify-between text-sm p-2 rounded-md"
              :class="{
                'bg-red-50 text-red-700': recommendation.priority === 'high',
                'bg-yellow-50 text-yellow-700': recommendation.priority === 'medium',
                'bg-blue-50 text-blue-700': recommendation.priority === 'low'
              }"
            >
              <span>{{ recommendation.reason }}</span>
              <Button
                size="sm"
                variant="ghost"
                class="text-xs"
                @click="handleRecommendationAction(recommendation)"
              >
                {{ recommendation.type === 'enable' ? 'Enable' : 
                   recommendation.type === 'disable' ? 'Disable' : 
                   recommendation.type === 'configure' ? 'Configure' : 'Remove' }}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Usage Statistics -->
      <div v-if="usageTrends && usageTrends.totalSearches > 0" class="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Usage Statistics</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div class="text-2xl font-bold text-blue-600">{{ usageTrends.totalSearches }}</div>
            <div class="text-sm text-gray-500">Total Searches</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-green-600">{{ usageTrends.totalResults }}</div>
            <div class="text-sm text-gray-500">Results Found</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-purple-600">{{ usageTrends.avgSearchTime }}ms</div>
            <div class="text-sm text-gray-500">Avg Search Time</div>
          </div>
          <div v-if="usageTrends.mostActivePlugin">
            <div class="text-2xl font-bold text-orange-600">{{ usageTrends.mostActivePlugin }}</div>
            <div class="text-sm text-gray-500">Most Used Plugin</div>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mb-6">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-center">
            <AlertCircleIcon class="w-5 h-5 text-red-600 mr-2" />
            <div>
              <h3 class="text-sm font-medium text-red-800">Error</h3>
              <p class="text-sm text-red-700 mt-1">{{ error.getUserFriendlyMessage() }}</p>
              <Button
                v-if="error.recoverable"
                variant="outline"
                size="sm"
                class="mt-2"
                @click="retryLastOperation"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && !plugins.length" class="text-center py-12">
        <LoadingSpinner 
          size="lg" 
          variant="primary" 
          :show-label="true" 
          label="Loading plugins..." 
          center 
        />
      </div>
      
      <!-- Loading Skeleton for Initial Load -->
      <div v-else-if="isLoading && !plugins.length" class="space-y-4">
        <LoadingSkeleton 
          v-for="i in 6" 
          :key="i" 
          variant="card" 
        />
      </div>

      <!-- Empty State -->
      <div v-else-if="!isLoading && !plugins.length && !error" class="text-center py-12">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <PluginIcon class="w-8 h-8 text-gray-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No plugins found</h3>
        <p class="text-gray-500 mb-4">
          {{ searchQuery || selectedCategory || statusFilter 
            ? 'No plugins match your current filters.' 
            : 'No plugins are currently installed.' }}
        </p>
        <Button
          v-if="searchQuery || selectedCategory || statusFilter"
          variant="outline"
          @click="clearFilters"
        >
          Clear Filters
        </Button>
      </div>

      <!-- Plugin Grid -->
      <div v-else-if="plugins.length" class="space-y-4">
        <!-- Results Info -->
        <div class="flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {{ plugins.length }} plugin{{ plugins.length !== 1 ? 's' : '' }}
            <span v-if="searchQuery || selectedCategory || statusFilter">
              matching your filters
            </span>
          </div>
          <div v-if="isLoading" class="flex items-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Updating...
          </div>
        </div>

        <!-- Plugin Cards -->
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PluginCard
            v-for="plugin in plugins"
            :key="plugin.id"
            :plugin="plugin"
            :show-details="true"
            :show-status="true"
            :is-loading="loadingPlugins.has(plugin.id)"
            @toggle-enabled="handleToggleEnabled"
            @configure="handleConfigure"
            @uninstall="handleUninstall"
            @view-details="handleViewDetails"
          />
        </div>
      </div>
    </div>

    <!-- Plugin Settings Dialog -->
    <PluginSettingsDialog
      :open="settingsDialogOpen"
      :plugin="selectedPluginForSettings"
      :is-loading="isSettingsLoading"
      @update:open="handleSettingsDialogClose"
      @save="handleSettingsSave"
      @reset="handleSettingsReset"
    />

    <!-- Plugin Uninstall Dialog -->
    <PluginUninstallDialog
      :open="uninstallDialogOpen"
      :plugin="selectedPluginForUninstall"
      :is-loading="isUninstallLoading"
      :require-confirmation="true"
      @update:open="handleUninstallDialogClose"
      @confirm="handleUninstallConfirm"
      @cancel="handleUninstallCancel"
    />

    <!-- Plugin Details Modal -->
    <Dialog :open="detailsModalOpen" @update:open="handleDetailsModalClose">
      <DialogContent class="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle class="flex items-center space-x-2">
            <component :is="selectedPluginForDetails?.icon" class="w-5 h-5" />
            <span>{{ selectedPluginForDetails?.name }}</span>
            <span class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              v{{ selectedPluginForDetails?.version }}
            </span>
          </DialogTitle>
          <DialogDescription>
            {{ selectedPluginForDetails?.description }}
          </DialogDescription>
        </DialogHeader>

        <div v-if="selectedPluginForDetails" class="flex-1 overflow-y-auto pr-2">
          <div class="space-y-6">
            <!-- Basic Information -->
            <div>
              <h3 class="text-sm font-medium text-gray-900 mb-3">Information</h3>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-500">Author:</span>
                  <span class="ml-2 text-gray-900">{{ selectedPluginForDetails.metadata.author }}</span>
                </div>
                <div>
                  <span class="text-gray-500">Category:</span>
                  <span class="ml-2 text-gray-900">{{ formatCategory(selectedPluginForDetails.metadata.category) }}</span>
                </div>
                <div>
                  <span class="text-gray-500">Install Date:</span>
                  <span class="ml-2 text-gray-900">{{ formatDate(selectedPluginForDetails.metadata.installDate) }}</span>
                </div>
                <div>
                  <span class="text-gray-500">File Size:</span>
                  <span class="ml-2 text-gray-900">{{ formatFileSize(selectedPluginForDetails.metadata.fileSize) }}</span>
                </div>
              </div>
            </div>

            <!-- Permissions -->
            <div v-if="selectedPluginForDetails.permissions.length">
              <h3 class="text-sm font-medium text-gray-900 mb-3">Permissions</h3>
              <div class="space-y-2">
                <div 
                  v-for="permission in selectedPluginForDetails.permissions" 
                  :key="permission.type"
                  class="flex items-start space-x-2 text-sm"
                >
                  <div class="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <div>
                    <div class="font-medium text-gray-900">{{ formatPermissionType(permission.type) }}</div>
                    <div class="text-gray-600">{{ permission.description }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Health Status -->
            <div v-if="selectedPluginForDetails.health">
              <h3 class="text-sm font-medium text-gray-900 mb-3">Health Status</h3>
              <div class="space-y-3">
                <div class="flex items-center space-x-2">
                  <div 
                    class="w-3 h-3 rounded-full"
                    :class="getHealthStatusColor(selectedPluginForDetails.health.status)"
                  ></div>
                  <span class="text-sm font-medium">{{ formatHealthStatus(selectedPluginForDetails.health.status) }}</span>
                  <span class="text-xs text-gray-500">
                    Last checked: {{ formatDate(selectedPluginForDetails.health.lastCheck) }}
                  </span>
                </div>
                
                <div v-if="selectedPluginForDetails.health.issues.length" class="space-y-2">
                  <div 
                    v-for="issue in selectedPluginForDetails.health.issues" 
                    :key="issue.message"
                    class="bg-yellow-50 border border-yellow-200 rounded p-3"
                  >
                    <div class="text-sm font-medium text-yellow-800">{{ issue.message }}</div>
                    <div v-if="issue.suggestedFix" class="text-xs text-yellow-700 mt-1">
                      {{ issue.suggestedFix }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Keywords -->
            <div v-if="selectedPluginForDetails.metadata.keywords.length">
              <h3 class="text-sm font-medium text-gray-900 mb-3">Keywords</h3>
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="keyword in selectedPluginForDetails.metadata.keywords" 
                  :key="keyword"
                  class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                >
                  {{ keyword }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="handleDetailsModalClose">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Toast Container -->
    <ToastContainer
      :toasts="toasts"
      position="bottom-right"
      :show-progress="true"
      @close="removeToast"
      @action="handleToastActionClick"
    />
    
    <!-- Loading Overlay for Global Operations -->
    <LoadingOverlay
      v-if="globalLoadingId"
      :visible="true"
      message="Processing..."
      variant="blur"
      :cancellable="false"
      fullscreen
    />
    </div>
  </ErrorBoundary>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNavigation } from '@/lib/composables/useNavigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { LoadingSpinner, LoadingOverlay, LoadingSkeleton } from '@/components/ui/loading'
import PluginCard from '@/components/PluginCard.vue'
import PluginSettingsDialog from '@/components/PluginSettingsDialog.vue'
import PluginUninstallDialog from '@/components/PluginUninstallDialog.vue'
import type { 
  EnhancedSearchPlugin, 
  PluginStatistics,
  PluginHealthLevel,
  PluginPermissionType
} from '@/lib/plugins/types'
import { PluginCategory } from '@/lib/plugins/types'
import { 
  pluginManagementService, 
  PluginManagementError,
  type PluginSearchOptions 
} from '@/lib/plugins/plugin-management-service'
import { PluginUtils } from '@/lib/plugins/types'
import { usePluginStateStore, pluginStateListener } from '@/lib/plugins/plugin-state-manager'
import { usePluginStatistics } from '@/lib/plugins/plugin-statistics'
import { pluginErrorHandler, withPluginErrorHandling } from '@/lib/plugins/plugin-error-handler'

const { breadcrumbItems, navigateHome } = useNavigation()

// State management
const pluginStateStore = usePluginStateStore()
const { getStatistics, getHealthSummary, getUsageTrends, getRecommendations } = usePluginStatistics()

// Toast notifications
const { 
  toasts, 
  removeToast, 
  handleToastAction, 
  pluginSuccess, 
  pluginError, 
  pluginWarning,
  loading: showLoadingToast,
  updateToast
} = useToast()

// Simple icon components
const SearchIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' }
const AlertCircleIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' }
const PluginIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="9"/><rect x="14" y="7" width="3" height="5"/></svg>' }

// Reactive state
const plugins = ref<EnhancedSearchPlugin[]>([])
const statistics = ref<PluginStatistics | null>(null)
const isLoading = ref(false)
const error = ref<PluginManagementError | null>(null)
const loadingPlugins = ref(new Set<string>())
const globalLoadingId = ref<string | null>(null)
const errorBoundaryRef = ref<InstanceType<typeof ErrorBoundary> | null>(null)

// Search and filter state
const searchQuery = ref('')
const selectedCategory = ref<string>('')
const statusFilter = ref<string>('')
const sortBy = ref<string>('name')

// Dialog state
const settingsDialogOpen = ref(false)
const detailsModalOpen = ref(false)
const uninstallDialogOpen = ref(false)
const selectedPluginForSettings = ref<EnhancedSearchPlugin | null>(null)
const selectedPluginForDetails = ref<EnhancedSearchPlugin | null>(null)
const selectedPluginForUninstall = ref<EnhancedSearchPlugin | null>(null)
const isSettingsLoading = ref(false)
const isUninstallLoading = ref(false)

// Debounce timer
let searchDebounceTimer: NodeJS.Timeout | null = null
const lastOperation = ref<(() => Promise<void>) | null>(null)

// Computed properties
const availableCategories = computed(() => {
  return Object.values(PluginCategory)
})

const pluginRecommendations = computed(() => {
  return getRecommendations()
})

const healthSummary = computed(() => {
  return getHealthSummary()
})

const usageTrends = computed(() => {
  return getUsageTrends()
})

// Methods
const loadPlugins = async () => {
  isLoading.value = true
  error.value = null
  
  // Show loading toast for long operations
  const loadingToastId = showLoadingToast('Loading plugins...', {
    title: 'Plugin Management'
  })
  
  try {
    const searchOptions: PluginSearchOptions = {
      query: searchQuery.value || undefined,
      category: selectedCategory.value as PluginCategory || undefined,
      enabled: statusFilter.value === 'enabled' ? true : statusFilter.value === 'disabled' ? false : undefined,
      sortBy: sortBy.value as any || 'name',
      sortOrder: 'asc'
    }
    
    const result = await withPluginErrorHandling('plugin-management', async () => {
      return await pluginManagementService.searchPlugins(searchOptions)
    })
    
    plugins.value = result
    
    // Load statistics from state management
    statistics.value = getStatistics()
    
    lastOperation.value = () => loadPlugins()
    
    // Update loading toast to success
    updateToast(loadingToastId, {
      type: 'success',
      message: `Loaded ${result.length} plugins successfully`,
      duration: 2000
    })
    
    // Clear any previous errors
    if (errorBoundaryRef.value) {
      errorBoundaryRef.value.clearError()
    }
    
  } catch (err) {
    // Remove loading toast
    removeToast(loadingToastId)
    
    const pluginError = err instanceof PluginManagementError ? err : new PluginManagementError(
      'plugin_not_found' as any,
      'Failed to load plugins',
      err instanceof Error ? err.message : 'Unknown error'
    )
    
    error.value = pluginError
    
    // Show error toast
    pluginError('Plugin Management', 'load plugins', pluginError.getUserFriendlyMessage(), {
      action: {
        id: 'retry-load',
        label: 'Retry'
      }
    })
    
    // Set error in boundary
    if (errorBoundaryRef.value) {
      errorBoundaryRef.value.setError(pluginError)
    }
    
  } finally {
    isLoading.value = false
  }
}

const debouncedSearch = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  searchDebounceTimer = setTimeout(() => {
    loadPlugins()
  }, 300)
}

const handleCategoryChange = (category: string) => {
  selectedCategory.value = category
  loadPlugins()
}

const handleStatusChange = (status: string) => {
  statusFilter.value = status
  loadPlugins()
}

const handleSortChange = (sort: string) => {
  sortBy.value = sort
  loadPlugins()
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = ''
  statusFilter.value = ''
  sortBy.value = 'name'
  loadPlugins()
}

const handleRecommendationAction = async (recommendation: any) => {
  try {
    switch (recommendation.type) {
      case 'enable':
        await handleToggleEnabled(recommendation.pluginId, true)
        break
      case 'disable':
        await handleToggleEnabled(recommendation.pluginId, false)
        break
      case 'configure':
        const plugin = plugins.value.find(p => p.id === recommendation.pluginId)
        if (plugin) {
          handleConfigure(plugin)
        }
        break
      case 'remove':
        const pluginToRemove = plugins.value.find(p => p.id === recommendation.pluginId)
        if (pluginToRemove) {
          handleUninstall(pluginToRemove)
        }
        break
    }
  } catch (error) {
    console.error('Failed to execute recommendation:', error)
  }
}

const retryLastOperation = async () => {
  if (lastOperation.value) {
    await lastOperation.value()
  } else {
    await loadPlugins()
  }
}

// Plugin event handlers
const handleToggleEnabled = async (pluginId: string, enabled: boolean) => {
  loadingPlugins.value.add(pluginId)
  error.value = null
  
  const plugin = plugins.value.find(p => p.id === pluginId)
  const pluginName = plugin?.name || pluginId
  const operation = enabled ? 'enable' : 'disable'
  
  try {
    const result = await withPluginErrorHandling(pluginId, async () => {
      return await pluginManagementService.setPluginEnabled(pluginId, enabled)
    })
    
    if (result.success) {
      pluginSuccess(pluginName, `${operation}d`)
      // State will be automatically updated through the state management system
      // and UI will be refreshed via state listeners
    } else if (result.error) {
      error.value = result.error
      pluginError(pluginName, operation, result.error.getUserFriendlyMessage())
    }
  } catch (err) {
    const pluginError = err instanceof PluginManagementError ? err : new PluginManagementError(
      'configuration_error' as any,
      `Failed to ${operation} plugin`,
      err instanceof Error ? err.message : 'Unknown error',
      pluginId
    )
    
    error.value = pluginError
    pluginError(pluginName, operation, pluginError.getUserFriendlyMessage())
  } finally {
    loadingPlugins.value.delete(pluginId)
  }
}

const handleConfigure = (pluginId: string) => {
  const plugin = plugins.value.find(p => p.id === pluginId)
  if (plugin) {
    selectedPluginForSettings.value = plugin
    settingsDialogOpen.value = true
  }
}

const handleUninstall = (pluginId: string) => {
  const plugin = plugins.value.find(p => p.id === pluginId)
  if (plugin) {
    selectedPluginForUninstall.value = plugin
    uninstallDialogOpen.value = true
  }
}

const handleViewDetails = (pluginId: string) => {
  const plugin = plugins.value.find(p => p.id === pluginId)
  if (plugin) {
    selectedPluginForDetails.value = plugin
    detailsModalOpen.value = true
  }
}

// Dialog handlers
const handleSettingsDialogClose = () => {
  settingsDialogOpen.value = false
  selectedPluginForSettings.value = null
  isSettingsLoading.value = false
}

const handleDetailsModalClose = () => {
  detailsModalOpen.value = false
  selectedPluginForDetails.value = null
}

const handleUninstallDialogClose = () => {
  uninstallDialogOpen.value = false
  selectedPluginForUninstall.value = null
  isUninstallLoading.value = false
}

const handleUninstallConfirm = async (pluginId: string) => {
  isUninstallLoading.value = true
  error.value = null
  
  const plugin = plugins.value.find(p => p.id === pluginId)
  const pluginName = plugin?.name || pluginId
  
  try {
    const result = await withPluginErrorHandling(pluginId, async () => {
      return await pluginManagementService.uninstallPlugin(pluginId)
    })
    
    if (result.success) {
      pluginSuccess(pluginName, 'uninstalled')
      handleUninstallDialogClose()
      await loadPlugins() // Refresh the list to remove the uninstalled plugin
    } else if (result.error) {
      error.value = result.error
      pluginError(pluginName, 'uninstall', result.error.getUserFriendlyMessage())
      isUninstallLoading.value = false
    }
  } catch (err) {
    const pluginError = err instanceof PluginManagementError ? err : new PluginManagementError(
      'uninstallation_failed' as any,
      'Failed to uninstall plugin',
      err instanceof Error ? err.message : 'Unknown error',
      pluginId,
      true,
      'Please try again or restart the application'
    )
    
    error.value = pluginError
    pluginError(pluginName, 'uninstall', pluginError.getUserFriendlyMessage(), {
      action: {
        id: 'retry-uninstall',
        label: 'Retry'
      }
    })
    isUninstallLoading.value = false
  }
}

const handleUninstallCancel = () => {
  handleUninstallDialogClose()
}

const handleSettingsSave = async (pluginId: string, settings: Record<string, any>) => {
  isSettingsLoading.value = true
  error.value = null
  
  const plugin = plugins.value.find(p => p.id === pluginId)
  const pluginName = plugin?.name || pluginId
  
  try {
    await withPluginErrorHandling(pluginId, async () => {
      // In a real implementation, this would save the settings
      console.log('Saving settings for plugin:', pluginId, settings)
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 1000))
    })
    
    pluginSuccess(pluginName, 'settings saved')
    await loadPlugins() // Refresh to show any changes
  } catch (err) {
    const pluginError = new PluginManagementError(
      'configuration_error' as any,
      'Failed to save plugin settings',
      err instanceof Error ? err.message : 'Unknown error',
      pluginId
    )
    
    error.value = pluginError
    pluginError(pluginName, 'save settings', pluginError.getUserFriendlyMessage())
  } finally {
    isSettingsLoading.value = false
  }
}

const handleSettingsReset = async (pluginId: string) => {
  isSettingsLoading.value = true
  error.value = null
  
  try {
    // In a real implementation, this would reset the settings
    console.log('Resetting settings for plugin:', pluginId)
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500))
    
    showSuccessMessage('Plugin settings reset to defaults')
    await loadPlugins() // Refresh to show any changes
  } catch (err) {
    error.value = new PluginManagementError(
      'configuration_error' as any,
      'Failed to reset plugin settings',
      err instanceof Error ? err.message : 'Unknown error',
      pluginId
    )
  } finally {
    isSettingsLoading.value = false
  }
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

const formatPermissionType = (type: PluginPermissionType): string => {
  return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
}

const formatHealthStatus = (status: PluginHealthLevel): string => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const getHealthStatusColor = (status: PluginHealthLevel): string => {
  switch (status) {
    case 'healthy': return 'bg-green-500'
    case 'warning': return 'bg-yellow-500'
    case 'error': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
}

// Handle toast actions
const handleToastActionClick = (toastId: string, actionId: string) => {
  switch (actionId) {
    case 'retry-load':
      loadPlugins()
      break
    case 'retry-uninstall':
      // Find the plugin and retry uninstall
      if (selectedPluginForUninstall.value) {
        handleUninstallConfirm(selectedPluginForUninstall.value.id)
      }
      break
    case 'retry':
      // Generic retry - attempt last operation
      if (lastOperation.value) {
        lastOperation.value()
      }
      break
    case 'view-details':
      // Show error details - could open a modal or navigate to error log
      console.log('View error details requested')
      break
  }
  
  // Handle the action through the toast system
  handleToastAction(toastId, actionId)
}

// Navigation is now handled by the useNavigation composable

// State change listeners
const setupStateListeners = () => {
  // Listen for plugin state changes to update UI
  pluginStateListener.on('enabled', () => {
    statistics.value = getStatistics()
    loadPlugins() // Refresh plugin list to show updated states
  })
  
  pluginStateListener.on('disabled', () => {
    statistics.value = getStatistics()
    loadPlugins() // Refresh plugin list to show updated states
  })
  
  pluginStateListener.on('configured', () => {
    statistics.value = getStatistics()
    loadPlugins() // Refresh plugin list to show updated configurations
  })
}

// Lifecycle
onMounted(() => {
  setupStateListeners()
  loadPlugins()
})

onUnmounted(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  // Clean up state listeners
  pluginStateListener.destroy()
})
</script>