<template>
  <div class="performance-dashboard bg-white rounded-lg shadow-sm border p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-medium text-gray-900">Performance Metrics</h3>
      <div class="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          @click="refreshMetrics"
          :disabled="isRefreshing"
        >
          <RefreshIcon class="w-4 h-4 mr-1" />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          @click="clearMetrics"
        >
          <TrashIcon class="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>

    <!-- Performance Statistics -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="text-center p-3 bg-blue-50 rounded-lg">
        <div class="text-2xl font-bold text-blue-600">
          {{ Math.round(stats.averageOperationTime) }}ms
        </div>
        <div class="text-sm text-blue-700">Avg Operation Time</div>
      </div>
      
      <div class="text-center p-3 bg-green-50 rounded-lg">
        <div class="text-2xl font-bold text-green-600">
          {{ (stats.cacheStats.hitRate * 100).toFixed(1) }}%
        </div>
        <div class="text-sm text-green-700">Cache Hit Rate</div>
      </div>
      
      <div class="text-center p-3 bg-purple-50 rounded-lg">
        <div class="text-2xl font-bold text-purple-600">
          {{ formatMemory(stats.memoryUsage.current) }}
        </div>
        <div class="text-sm text-purple-700">Memory Usage</div>
      </div>
      
      <div class="text-center p-3 bg-orange-50 rounded-lg">
        <div class="text-2xl font-bold text-orange-600">
          {{ stats.totalOperations }}
        </div>
        <div class="text-sm text-orange-700">Total Operations</div>
      </div>
    </div>

    <!-- Cache Statistics -->
    <div class="mb-6">
      <h4 class="text-sm font-medium text-gray-700 mb-3">Cache Performance</h4>
      <div class="grid grid-cols-3 gap-4">
        <div class="text-center p-2 bg-gray-50 rounded">
          <div class="text-lg font-semibold text-gray-900">{{ cacheStats.totalEntries }}</div>
          <div class="text-xs text-gray-600">Entries</div>
        </div>
        <div class="text-center p-2 bg-gray-50 rounded">
          <div class="text-lg font-semibold text-gray-900">{{ cacheStats.totalHits }}</div>
          <div class="text-xs text-gray-600">Hits</div>
        </div>
        <div class="text-center p-2 bg-gray-50 rounded">
          <div class="text-lg font-semibold text-gray-900">{{ formatMemory(cacheStats.memoryUsage) }}</div>
          <div class="text-xs text-gray-600">Memory</div>
        </div>
      </div>
    </div>

    <!-- Lazy Loading Statistics -->
    <div class="mb-6">
      <h4 class="text-sm font-medium text-gray-700 mb-3">Lazy Loading</h4>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-sm text-gray-600 mb-1">Plugin Details</div>
          <div class="flex items-center space-x-2">
            <div class="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${getLoadingProgress('details')}%` }"
              ></div>
            </div>
            <span class="text-xs text-gray-500">
              {{ lazyStats.details.loaded }}/{{ getTotalItems('details') }}
            </span>
          </div>
        </div>
        <div>
          <div class="text-sm text-gray-600 mb-1">Plugin Metadata</div>
          <div class="flex items-center space-x-2">
            <div class="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                class="bg-green-600 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${getLoadingProgress('metadata')}%` }"
              ></div>
            </div>
            <span class="text-xs text-gray-500">
              {{ lazyStats.metadata.loaded }}/{{ getTotalItems('metadata') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Alerts -->
    <div v-if="alerts.length > 0" class="mb-6">
      <h4 class="text-sm font-medium text-gray-700 mb-3">Performance Alerts</h4>
      <div class="space-y-2">
        <div 
          v-for="alert in alerts.slice(0, 3)" 
          :key="`${alert.name}-${alert.timestamp}`"
          class="flex items-start space-x-2 p-2 rounded"
          :class="{
            'bg-yellow-50 border border-yellow-200': alert.level === 'warning',
            'bg-red-50 border border-red-200': alert.level === 'critical'
          }"
        >
          <AlertTriangleIcon 
            class="w-4 h-4 mt-0.5 flex-shrink-0"
            :class="{
              'text-yellow-600': alert.level === 'warning',
              'text-red-600': alert.level === 'critical'
            }"
          />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium" :class="{
              'text-yellow-800': alert.level === 'warning',
              'text-red-800': alert.level === 'critical'
            }">
              {{ alert.message }}
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {{ formatTime(alert.timestamp) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Operation History -->
    <div v-if="showHistory">
      <h4 class="text-sm font-medium text-gray-700 mb-3">Recent Operations</h4>
      <div class="space-y-1 max-h-32 overflow-y-auto">
        <div 
          v-for="metric in recentMetrics.slice(0, 10)" 
          :key="`${metric.name}-${metric.timestamp}`"
          class="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 rounded"
        >
          <span class="text-gray-700 truncate">{{ metric.name }}</span>
          <span class="text-gray-500 ml-2">{{ Math.round(metric.value) }}ms</span>
        </div>
      </div>
    </div>

    <!-- Toggle History -->
    <div class="mt-4 pt-4 border-t">
      <Button
        variant="ghost"
        size="sm"
        @click="showHistory = !showHistory"
        class="text-xs"
      >
        {{ showHistory ? 'Hide' : 'Show' }} Operation History
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { performanceMonitor, type PerformanceStats, type PerformanceAlert, MetricType } from '@/lib/plugins/performance-monitor'
import { pluginCache, type CacheStatistics } from '@/lib/plugins/performance-cache'
import { usePluginLazyLoading } from '@/lib/plugins/lazy-loader'

// Icons
const RefreshIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>' }
const TrashIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>' }
const AlertTriangleIcon = { template: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' }

// Composables
const { getStatistics: getLazyStats } = usePluginLazyLoading()

// Reactive state
const stats = ref<PerformanceStats>({
  averageOperationTime: 0,
  totalOperations: 0,
  slowestOperation: { name: '', time: 0 },
  fastestOperation: { name: '', time: 0 },
  memoryUsage: { current: 0, peak: 0, average: 0 },
  cacheStats: { hitRate: 0, missRate: 0, totalRequests: 0 },
  alerts: []
})

const cacheStats = ref<CacheStatistics>({
  totalEntries: 0,
  hitRate: 0,
  missRate: 0,
  totalHits: 0,
  totalMisses: 0,
  memoryUsage: 0,
  oldestEntry: 0,
  newestEntry: 0
})

const lazyStats = ref({
  details: { loaded: 0, loading: 0, failed: 0, queue: 0 },
  metadata: { loaded: 0, loading: 0, failed: 0, queue: 0 },
  activePromises: 0
})

const alerts = ref<PerformanceAlert[]>([])
const recentMetrics = ref<any[]>([])
const showHistory = ref(false)
const isRefreshing = ref(false)

// Update interval
let updateInterval: NodeJS.Timeout | null = null

// Computed properties
const getTotalItems = (type: 'details' | 'metadata') => {
  const stat = lazyStats.value[type]
  return stat.loaded + stat.loading + stat.failed + stat.queue
}

const getLoadingProgress = (type: 'details' | 'metadata') => {
  const total = getTotalItems(type)
  if (total === 0) return 0
  return (lazyStats.value[type].loaded / total) * 100
}

// Methods
const refreshMetrics = async () => {
  isRefreshing.value = true
  try {
    // Get performance statistics
    stats.value = performanceMonitor.getStatistics()
    
    // Get cache statistics
    cacheStats.value = pluginCache.getStatistics()
    
    // Get lazy loading statistics
    lazyStats.value = getLazyStats()
    
    // Get recent alerts
    alerts.value = performanceMonitor.getRecentAlerts(5)
    
    // Get recent metrics
    recentMetrics.value = performanceMonitor.getMetricsByType(MetricType.OPERATION_TIME, 20)
  } finally {
    isRefreshing.value = false
  }
}

const clearMetrics = () => {
  performanceMonitor.clear()
  pluginCache.clear()
  refreshMetrics()
}

const formatMemory = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

// Lifecycle
onMounted(() => {
  refreshMetrics()
  
  // Update metrics every 5 seconds
  updateInterval = setInterval(refreshMetrics, 5000)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<style scoped>
.performance-dashboard {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.performance-dashboard h3 {
  font-weight: 600;
}

.performance-dashboard h4 {
  font-weight: 500;
}
</style>