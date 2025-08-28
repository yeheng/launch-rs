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
    <header class="bg-white border-b" role="banner">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Navigation -->
        <div class="flex items-center justify-between pt-4 pb-2">
          <Breadcrumb :items="breadcrumbItems" aria-label="Plugin management navigation" />
          <Button 
            variant="ghost" 
            size="sm"
            @click="navigateHome"
            class="text-gray-600 hover:text-gray-700"
            aria-label="Return to home page"
          >
            <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Home
          </Button>
        </div>
        
        <div class="py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900" id="page-title">Plugin Management</h1>
              <p class="mt-1 text-sm text-gray-500" id="page-description">
                Manage your plugins, configure settings, and discover new functionality
              </p>
            </div>
            
            <!-- Plugin Statistics -->
            <div v-if="statistics" class="flex items-center space-x-6 text-sm text-gray-600" role="region" aria-labelledby="stats-heading">
              <h2 id="stats-heading" class="sr-only">Plugin Statistics</h2>
              <div class="text-center">
                <div class="text-lg font-semibold text-gray-900" aria-label="Total plugins">{{ statistics.total }}</div>
                <div>Total</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-semibold text-green-600" aria-label="Enabled plugins">{{ statistics.enabled }}</div>
                <div>Enabled</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-semibold text-blue-600" aria-label="Installed plugins">{{ statistics.installed }}</div>
                <div>Installed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Search and Filters -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" role="main" aria-labelledby="page-title" aria-describedby="page-description">
      <section class="bg-white rounded-lg shadow-sm border p-4 mb-6" role="search" aria-labelledby="search-heading">
        <h2 id="search-heading" class="sr-only">Search and Filter Plugins</h2>
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Search Input -->
          <div class="flex-1">
            <label for="plugin-search" class="sr-only">Search plugins by name, description, or keywords</label>
            <div class="relative">
              <SearchIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <Input
                id="plugin-search"
                ref="searchInputRef"
                v-model="searchQuery"
                placeholder="Search plugins by name, description, or keywords..."
                class="pl-10 pr-10"
                @input="debouncedSearch"
                @keydown.escape="clearSearch"
                role="searchbox"
                aria-describedby="search-help"
                :aria-expanded="showSearchSuggestions"
                aria-autocomplete="list"
              />
              <div id="search-help" class="sr-only">
                Use this field to search for plugins. Press Escape to clear the search.
              </div>
              <!-- Clear search button -->
              <button
                v-if="searchQuery"
                @click="clearSearch"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search query"
                type="button"
              >
                <XIcon class="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          
          <!-- Category Filter -->
          <div class="w-full sm:w-48">
            <label for="category-filter" class="sr-only">Filter by category</label>
            <Select v-model="selectedCategory" @update:value="handleCategoryChange">
              <SelectTrigger id="category-filter" aria-label="Filter plugins by category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent role="listbox" aria-label="Plugin categories">
                <SelectItem value="" role="option">All Categories</SelectItem>
                <SelectItem 
                  v-for="category in availableCategories" 
                  :key="category" 
                  :value="category"
                  role="option"
                >
                  {{ formatCategory(category) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <!-- Status Filter -->
          <div class="w-full sm:w-32">
            <label for="status-filter" class="sr-only">Filter by status</label>
            <Select v-model="statusFilter" @update:value="handleStatusChange">
              <SelectTrigger id="status-filter" aria-label="Filter plugins by status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent role="listbox" aria-label="Plugin status options">
                <SelectItem value="" role="option">All Status</SelectItem>
                <SelectItem value="enabled" role="option">Enabled</SelectItem>
                <SelectItem value="disabled" role="option">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <!-- Sort Options -->
          <div class="w-full sm:w-48">
            <label for="sort-options" class="sr-only">Sort plugins</label>
            <Select v-model="sortBy" @update:value="handleSortChange">
              <SelectTrigger id="sort-options" aria-label="Sort plugins by">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent role="listbox" aria-label="Sort options">
                <SelectItem value="name" role="option">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc" role="option">Name (Z-A)</SelectItem>
                <SelectItem value="category" role="option">Category</SelectItem>
                <SelectItem value="installDate" role="option">Install Date (Newest)</SelectItem>
                <SelectItem value="installDate-desc" role="option">Install Date (Oldest)</SelectItem>
                <SelectItem value="lastUpdated" role="option">Last Updated (Newest)</SelectItem>
                <SelectItem value="lastUpdated-desc" role="option">Last Updated (Oldest)</SelectItem>
                <SelectItem value="rating" role="option">Rating (Highest)</SelectItem>
                <SelectItem value="downloadCount" role="option">Popularity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

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
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          {{ getEmptyStateTitle() }}
        </h3>
        <p class="text-gray-500 mb-4 max-w-md mx-auto">
          {{ getEmptyStateMessage() }}
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            v-if="hasActiveFilters"
            variant="outline"
            @click="clearFilters"
            class="inline-flex items-center"
          >
            <XIcon class="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
          <Button
            v-if="searchQuery"
            variant="outline"
            @click="suggestSearchTerms"
            class="inline-flex items-center"
          >
            <SearchIcon class="w-4 h-4 mr-2" />
            Search Suggestions
          </Button>
        </div>
        <!-- Search suggestions -->
        <div v-if="showSearchSuggestions && searchSuggestions.length" class="mt-6">
          <p class="text-sm text-gray-600 mb-3">Try searching for:</p>
          <div class="flex flex-wrap gap-2 justify-center">
            <button
              v-for="suggestion in searchSuggestions"
              :key="suggestion"
              @click="applySuggestion(suggestion)"
              class="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>
      </div>

      <!-- Plugin Grid -->
      <section v-else-if="plugins.length" class="space-y-4" role="region" aria-labelledby="results-heading">
        <!-- Results Info -->
        <div class="flex items-center justify-between text-sm text-gray-600">
          <div class="flex items-center space-x-4">
            <div id="results-heading" role="status" aria-live="polite">
              Showing {{ plugins.length }} plugin{{ plugins.length !== 1 ? 's' : '' }}
              <span v-if="hasActiveFilters">
                matching your filters
              </span>
            </div>
            <!-- Active filters summary -->
            <div v-if="hasActiveFilters" class="flex items-center space-x-2">
              <span class="text-gray-400">•</span>
              <div class="flex items-center space-x-1">
                <span v-if="searchQuery" class="inline-flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  "{{ searchQuery }}"
                  <button @click="clearSearch" class="ml-1 hover:text-blue-900">
                    <XIcon class="w-3 h-3" />
                  </button>
                </span>
                <span v-if="selectedCategory" class="inline-flex items-center text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  {{ formatCategory(selectedCategory) }}
                  <button @click="clearCategoryFilter" class="ml-1 hover:text-green-900">
                    <XIcon class="w-3 h-3" />
                  </button>
                </span>
                <span v-if="statusFilter" class="inline-flex items-center text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  {{ statusFilter === 'enabled' ? 'Enabled' : 'Disabled' }}
                  <button @click="clearStatusFilter" class="ml-1 hover:text-purple-900">
                    <XIcon class="w-3 h-3" />
                  </button>
                </span>
              </div>
            </div>
          </div>
          <div v-if="isLoading" class="flex items-center">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Updating...
          </div>
        </div>

        <!-- Plugin Cards with Virtual Scrolling -->
        <VirtualScrollList
          v-if="plugins.length > virtualScrollThreshold"
          :items="plugins"
          :item-height="pluginCardHeight"
          container-height="600px"
          :buffer="5"
          :is-loading="isLoading"
          :get-item-key="(plugin) => plugin.id"
          aria-label="Plugin list (virtual scroll)"
          :enable-monitoring="true"
          @scroll="handleVirtualScroll"
          @visible-range-change="handleVisibleRangeChange"
          @load-more="handleLoadMore"
        >
          <template #default="{ item: plugin, index }">
            <div class="p-2">
              <PluginCard
                :key="plugin.id"
                :plugin="plugin"
                :show-details="true"
                :show-status="true"
                :is-loading="loadingPlugins.has(plugin.id)"
                :search-query="searchQuery"
                @toggle-enabled="handleToggleEnabled"
                @configure="handleConfigure"
                @uninstall="handleUninstall"
                @view-details="handleViewDetails"
              />
            </div>
          </template>
          
          <template #loading>
            <div class="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" variant="primary" :show-label="true" label="Loading plugins..." />
            </div>
          </template>
          
          <template #empty>
            <div class="flex flex-col items-center justify-center py-12 text-gray-500">
              <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PluginIcon class="w-8 h-8 text-gray-400" />
              </div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">
                {{ getEmptyStateTitle() }}
              </h3>
              <p class="text-gray-500 mb-4 max-w-md mx-auto">
                {{ getEmptyStateMessage() }}
              </p>
            </div>
          </template>
        </VirtualScrollList>

        <!-- Regular Grid for Small Lists -->
        <div 
          v-else
          class="grid gap-4 md:grid-cols-2 lg:grid-cols-3" 
          role="grid" 
          aria-label="Plugin list"
          :aria-rowcount="Math.ceil(plugins.length / 3)"
        >
          <PluginCard
            v-for="(plugin, index) in plugins"
            :key="plugin.id"
            :plugin="plugin"
            :show-details="true"
            :show-status="true"
            :is-loading="loadingPlugins.has(plugin.id)"
            :search-query="searchQuery"
            role="gridcell"
            :aria-rowindex="Math.floor(index / 3) + 1"
            :aria-colindex="(index % 3) + 1"
            @toggle-enabled="handleToggleEnabled"
            @configure="handleConfigure"
            @uninstall="handleUninstall"
            @view-details="handleViewDetails"
          />
        </div>
      </section>
    </main>

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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useNavigation } from '@/lib/composables/useNavigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ToastContainer, useToast } from '@/components/ui/toast'
import { LoadingSpinner, LoadingOverlay, LoadingSkeleton } from '@/components/ui/loading'
import { VirtualScrollList } from '@/components/ui/virtual-scroll'
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
import { performanceMonitor, MetricType } from '@/lib/plugins/performance-monitor'
import { pluginCache } from '@/lib/plugins/performance-cache'
import { usePluginLazyLoading } from '@/lib/plugins/lazy-loader'

const { breadcrumbItems, navigateHome } = useNavigation()

// State management
const pluginStateStore = usePluginStateStore()
const { getStatistics, getHealthSummary, getUsageTrends, getRecommendations } = usePluginStatistics()

// Performance optimizations
const { 
  loadPluginDetails, 
  loadPluginMetadata, 
  preloadDetails, 
  preloadMetadata,
  getDetailsState,
  getStatistics: getLazyLoadStats
} = usePluginLazyLoading()

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
const XIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' }

// Reactive state
const plugins = ref<EnhancedSearchPlugin[]>([])
const statistics = ref<PluginStatistics | null>(null)
const isLoading = ref(false)
const error = ref<PluginManagementError | null>(null)
const loadingPlugins = ref(new Set<string>())
const globalLoadingId = ref<string | null>(null)
const errorBoundaryRef = ref<InstanceType<typeof ErrorBoundary> | null>(null)

// Search input ref for focus management
const searchInputRef = ref<HTMLInputElement | null>(null)

// Focus management and keyboard navigation
const focusedPluginIndex = ref(-1)
const isKeyboardNavigating = ref(false)

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

// Debounced search with performance monitoring
const debouncedSearch = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  searchDebounceTimer = setTimeout(() => {
    performanceMonitor.measureAsync('debounced-search', async () => {
      await loadPlugins()
    }).catch(error => {
      console.error('Debounced search failed:', error)
    })
  }, 300)
}

// Search suggestions state
const showSearchSuggestions = ref(false)
const searchSuggestions = ref<string[]>([])

// Available search suggestions based on installed plugins
const availableSearchTerms = ref<string[]>([
  'search', 'productivity', 'utilities', 'development', 'system',
  'file', 'calculator', 'weather', 'notes', 'text', 'network'
])

// Performance optimization settings
const virtualScrollThreshold = ref(20) // Use virtual scrolling for lists with more than 20 items
const pluginCardHeight = ref(200) // Estimated height of each plugin card in pixels
const visibleRange = ref({ start: 0, end: 0 })
const preloadBatchSize = ref(10)

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

const hasActiveFilters = computed(() => {
  return !!(searchQuery.value || selectedCategory.value || statusFilter.value)
})

// Performance monitoring methods
const handleVirtualScroll = (scrollTop: number, scrollLeft: number) => {
  // Record scroll performance
  performanceMonitor.recordMetric(MetricType.RENDER_TIME, 'virtual-scroll', performance.now())
}

const handleVisibleRangeChange = (start: number, end: number) => {
  visibleRange.value = { start, end }
  
  // Preload plugin details for visible items
  const visiblePlugins = plugins.value.slice(start, end)
  const pluginIds = visiblePlugins.map(p => p.id)
  
  // Preload in background
  preloadMetadata(pluginIds).catch(error => {
    console.warn('Failed to preload plugin metadata:', error)
  })
}

const handleLoadMore = () => {
  // This could be used for infinite scrolling if needed
  console.log('Load more requested')
}

// Methods
const loadPlugins = async () => {
  isLoading.value = true
  error.value = null
  
  // Record memory usage before loading
  performanceMonitor.recordMemoryUsage('before-plugin-load')
  
  // Show loading toast for long operations
  const loadingToastId = showLoadingToast('Loading plugins...', {
    title: 'Plugin Management'
  })
  
  try {
    // Parse sort option to extract field and order
    const parseSortOption = (sortOption: string) => {
      if (sortOption.endsWith('-desc')) {
        return {
          field: sortOption.replace('-desc', '') as any,
          order: 'desc' as const
        }
      }
      return {
        field: sortOption as any,
        order: 'asc' as const
      }
    }
    
    const { field: sortField, order: sortOrder } = parseSortOption(sortBy.value)
    
    const searchOptions: PluginSearchOptions = {
      query: searchQuery.value || undefined,
      category: selectedCategory.value as PluginCategory || undefined,
      enabled: statusFilter.value === 'enabled' ? true : statusFilter.value === 'disabled' ? false : undefined,
      sortBy: sortField || 'name',
      sortOrder: sortOrder
    }
    
    const result = await withPluginErrorHandling('plugin-management', async () => {
      return await performanceMonitor.measureAsync('load-plugins-operation', async () => {
        return await pluginManagementService.searchPlugins(searchOptions)
      })
    })

    plugins.value = result
    
    // Update statistics
    statistics.value = await pluginManagementService.getPluginStatistics()
    
    // Record cache performance
    const cacheStats = pluginCache.getStatistics()
    performanceMonitor.recordCachePerformance(cacheStats.hitRate, cacheStats.totalHits + cacheStats.totalMisses)
    
    // Record memory usage after loading
    performanceMonitor.recordMemoryUsage('after-plugin-load')
    
    // Preload details for first batch of plugins
    if (result.length > 0) {
      const firstBatch = result.slice(0, preloadBatchSize.value).map(p => p.id)
      preloadDetails(firstBatch).catch(error => {
        console.warn('Failed to preload plugin details:', error)
      })
    }
    
    // Update toast
    updateToast(loadingToastId, {
      type: 'success',
      title: 'Plugins Loaded',
      message: `Loaded ${result.length} plugins successfully`,
      duration: 2000
    })
  } catch (err) {
    console.error('Failed to load plugins:', err)
    
    if (err instanceof PluginManagementError) {
      error.value = err
      pluginError(err.getUserFriendlyMessage(), {
        title: 'Plugin Loading Error',
        action: err.recoverable ? {
          label: 'Retry',
          handler: () => loadPlugins()
        } : undefined
      })
    } else {
      const genericError = new PluginManagementError(
        PluginManagementErrorType.PLUGIN_NOT_FOUND,
        'An unexpected error occurred while loading plugins',
        err instanceof Error ? err.message : 'Unknown error',
        undefined,
        true,
        'Please try refreshing the page'
      )
      error.value = genericError
      pluginError(genericError.getUserFriendlyMessage())
    }
    
    // Update toast to show error
    updateToast(loadingToastId, {
      type: 'error',
      title: 'Loading Failed',
      message: 'Failed to load plugins',
      duration: 5000
    })
  } finally {
    isLoading.value = false
    lastOperation.value = loadPlugins
  }
}

/**
 * Perform search with debouncing and caching
 */
const performSearch = async (query: string = searchQuery.value) => {
  try {
    isLoading.value = true
    
    const searchOptions: PluginSearchOptions = {
      query: query || undefined,
      category: selectedCategory.value || undefined,
      enabled: statusFilter.value === 'enabled' ? true : 
               statusFilter.value === 'disabled' ? false : undefined,
      sortBy: sortBy.value as any,
      sortOrder: sortBy.value.endsWith('-desc') ? 'desc' : 'asc'
    }

    const result = await pluginManagementService.searchPlugins(searchOptions)
    plugins.value = result
    
    // Load statistics from state management
    statistics.value = getStatistics()
    
    // Update search suggestions based on loaded plugins
    updateSearchSuggestions(result)
    
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
  showSearchSuggestions.value = false
  loadPlugins()
}

const clearSearch = () => {
  searchQuery.value = ''
  showSearchSuggestions.value = false
  loadPlugins()
}

const clearCategoryFilter = () => {
  selectedCategory.value = ''
  loadPlugins()
}

const clearStatusFilter = () => {
  statusFilter.value = ''
  loadPlugins()
}

const getEmptyStateTitle = () => {
  if (searchQuery.value) {
    return `No results for "${searchQuery.value}"`
  }
  if (selectedCategory.value || statusFilter.value) {
    return 'No plugins match your filters'
  }
  return 'No plugins found'
}

const getEmptyStateMessage = () => {
  if (searchQuery.value) {
    return 'Try adjusting your search terms or browse by category to find what you\'re looking for.'
  }
  if (selectedCategory.value || statusFilter.value) {
    return 'Try removing some filters or search for specific plugins by name.'
  }
  return 'No plugins are currently installed. You can install plugins from the plugin store.'
}

const suggestSearchTerms = () => {
  // Generate search suggestions based on available plugins and common terms
  const suggestions = availableSearchTerms.value.filter(term => 
    !searchQuery.value || !term.toLowerCase().includes(searchQuery.value.toLowerCase())
  ).slice(0, 6)
  
  searchSuggestions.value = suggestions
  showSearchSuggestions.value = true
}

const applySuggestion = (suggestion: string) => {
  searchQuery.value = suggestion
  showSearchSuggestions.value = false
  loadPlugins()
}

const updateSearchSuggestions = (pluginList: EnhancedSearchPlugin[]) => {
  // Extract keywords and terms from plugins
  const terms = new Set<string>()
  
  pluginList.forEach(plugin => {
    // Add plugin name words
    plugin.name.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) terms.add(word)
    })
    
    // Add keywords
    plugin.metadata.keywords.forEach(keyword => {
      if (keyword.length > 2) terms.add(keyword.toLowerCase())
    })
    
    // Add category
    terms.add(plugin.metadata.category.toLowerCase())
    
    // Add description words (first few words)
    const descWords = plugin.description.toLowerCase().split(/\s+/).slice(0, 3)
    descWords.forEach(word => {
      if (word.length > 3) terms.add(word)
    })
  })
  
  // Update available search terms
  availableSearchTerms.value = Array.from(terms).sort()
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

const handleViewDetails = async (pluginId: string) => {
  try {
    // Use lazy loading for plugin details
    const details = await performanceMonitor.measureAsync(`view-details-${pluginId}`, async () => {
      return await loadPluginDetails(pluginId) || plugins.value.find(p => p.id === pluginId)
    })
    
    if (details) {
      selectedPluginForDetails.value = details
      detailsModalOpen.value = true
    }
  } catch (error) {
    console.error('Failed to load plugin details:', error)
    pluginError('Failed to load plugin details')
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

// Keyboard navigation methods
const handleKeyboardNavigation = (event: KeyboardEvent) => {
  if (!plugins.value.length) return

  const { key, ctrlKey, metaKey } = event
  
  // Handle search focus with Ctrl/Cmd + F
  if ((ctrlKey || metaKey) && key === 'f') {
    event.preventDefault()
    focusSearchInput()
    return
  }

  // Only handle arrow keys when not in input fields
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return
  }

  switch (key) {
    case 'ArrowDown':
      event.preventDefault()
      navigatePlugins('down')
      break
    case 'ArrowUp':
      event.preventDefault()
      navigatePlugins('up')
      break
    case 'ArrowRight':
      event.preventDefault()
      navigatePlugins('right')
      break
    case 'ArrowLeft':
      event.preventDefault()
      navigatePlugins('left')
      break
    case 'Enter':
    case ' ':
      if (focusedPluginIndex.value >= 0) {
        event.preventDefault()
        const plugin = plugins.value[focusedPluginIndex.value]
        if (plugin) {
          handleViewDetails(plugin.id)
        }
      }
      break
    case 'Escape':
      event.preventDefault()
      clearFocus()
      break
  }
}

const navigatePlugins = (direction: 'up' | 'down' | 'left' | 'right') => {
  if (!plugins.value.length) return

  isKeyboardNavigating.value = true
  const totalPlugins = plugins.value.length
  const columnsPerRow = 3 // Based on lg:grid-cols-3
  
  let newIndex = focusedPluginIndex.value

  switch (direction) {
    case 'down':
      newIndex = Math.min(totalPlugins - 1, focusedPluginIndex.value + columnsPerRow)
      break
    case 'up':
      newIndex = Math.max(0, focusedPluginIndex.value - columnsPerRow)
      break
    case 'right':
      if (focusedPluginIndex.value < totalPlugins - 1) {
        newIndex = focusedPluginIndex.value + 1
      }
      break
    case 'left':
      if (focusedPluginIndex.value > 0) {
        newIndex = focusedPluginIndex.value - 1
      }
      break
  }

  if (newIndex !== focusedPluginIndex.value) {
    focusedPluginIndex.value = newIndex
    focusPlugin(newIndex)
  }
}

const focusPlugin = async (index: number) => {
  await nextTick()
  const pluginCards = document.querySelectorAll('[role="gridcell"]')
  const targetCard = pluginCards[index] as HTMLElement
  
  if (targetCard) {
    targetCard.focus()
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

const focusSearchInput = () => {
  if (searchInputRef.value) {
    searchInputRef.value.focus()
  }
}

const clearFocus = () => {
  focusedPluginIndex.value = -1
  isKeyboardNavigating.value = false
  
  // Return focus to search input or main content
  if (searchInputRef.value) {
    searchInputRef.value.focus()
  }
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

// Keyboard event handler
const handleKeyboardShortcuts = (event: KeyboardEvent) => {
  // Ctrl/Cmd + K to focus search
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    searchInputRef.value?.focus()
  }
  
  // Escape to clear search when focused
  if (event.key === 'Escape' && document.activeElement === searchInputRef.value) {
    clearSearch()
  }
}

// Lifecycle
onMounted(async () => {
  setupStateListeners()
  await loadPlugins()
  
  // Add keyboard event listeners
  document.addEventListener('keydown', handleKeyboardShortcuts)
  document.addEventListener('keydown', handleKeyboardNavigation)
  
  // Focus search input on page load for better accessibility
  await nextTick()
  focusSearchInput()
})

onUnmounted(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  // Clean up keyboard event listeners
  document.removeEventListener('keydown', handleKeyboardShortcuts)
  document.removeEventListener('keydown', handleKeyboardNavigation)
  
  // Clean up state listeners
  pluginStateListener.destroy()
})
</script>