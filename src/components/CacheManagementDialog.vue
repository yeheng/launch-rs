<template>
  <Dialog v-model:open="open" @update:open="handleOpenChange">
    <DialogTrigger as-child>
      <slot />
    </DialogTrigger>
    <DialogContent class="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Database class="h-5 w-5" />
          搜索缓存管理
        </DialogTitle>
        <DialogDescription>
          管理搜索缓存和智能学习系统，提升搜索性能
        </DialogDescription>
      </DialogHeader>

      <div class="flex-1 overflow-y-auto space-y-6">
        <!-- 缓存统计信息 -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <BarChart3 class="h-4 w-4" />
              缓存统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-blue-600">
                  {{ formatNumber(searchStats.totalRequests) }}
                </div>
                <div class="text-sm text-muted-foreground">总请求数</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-green-600">
                  {{ formatNumber(searchStats.hits) }}
                </div>
                <div class="text-sm text-muted-foreground">缓存命中</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-orange-600">
                  {{ searchStats.hitRate.toFixed(1) }}%
                </div>
                <div class="text-sm text-muted-foreground">命中率</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-purple-600">
                  {{ formatBytes(searchStats.memoryUsage) }}
                </div>
                <div class="text-sm text-muted-foreground">内存使用</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 智能学习报告 -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Brain class="h-4 w-4" />
              智能学习系统
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 class="font-medium mb-2">学习统计</h4>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span>总查询次数：</span>
                    <span class="font-mono">{{ formatNumber(learningReport.totalQueries) }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>预测准确度：</span>
                    <span class="font-mono">{{ (learningReport.predictionAccuracy * 100).toFixed(1) }}%</span>
                  </div>
                  <div class="flex justify-between">
                    <span>活跃插件数：</span>
                    <span class="font-mono">{{ learningReport.topPlugins.length }}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 class="font-medium mb-2">热门查询</h4>
                <div class="space-y-1 max-h-20 overflow-y-auto">
                  <div 
                    v-for="query in learningReport.topQueries.slice(0, 5)" 
                    :key="query.query"
                    class="flex justify-between text-sm"
                  >
                    <span class="truncate max-w-32">{{ query.query }}</span>
                    <span class="font-mono text-muted-foreground">{{ query.frequency }}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 缓存控制 -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Settings class="h-4 w-4" />
              缓存控制
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-3">
                <h4 class="font-medium">缓存操作</h4>
                <div class="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    @click="clearSearchCache"
                    :disabled="loading.clearSearch"
                  >
                    <Trash2 class="h-4 w-4 mr-1" />
                    清除搜索缓存
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    @click="clearLearningData"
                    :disabled="loading.clearLearning"
                  >
                    <Brain class="h-4 w-4 mr-1" />
                    清除学习数据
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    @click="refreshStats"
                    :disabled="loading.refresh"
                  >
                    <RefreshCw class="h-4 w-4 mr-1" />
                    刷新统计
                  </Button>
                </div>
              </div>
              <div class="space-y-3">
                <h4 class="font-medium">智能预热</h4>
                <div class="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    @click="warmupAllPlugins"
                    :disabled="loading.warmup"
                  >
                    <Zap class="h-4 w-4 mr-1" />
                    预热所有插件
                  </Button>
                  <Select v-model="selectedPlugin">
                    <SelectTrigger class="w-32">
                      <SelectValue placeholder="选择插件" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem 
                        v-for="plugin in enabledPlugins" 
                        :key="plugin.id"
                        :value="plugin.id"
                      >
                        {{ plugin.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm"
                    @click="warmupSelectedPlugin"
                    :disabled="loading.warmup || !selectedPlugin"
                  >
                    <Zap class="h-4 w-4 mr-1" />
                    预热选中
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 热门查询预测 -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <TrendingUp class="h-4 w-4" />
              热门查询预测
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  @click="predictHotQueries"
                  :disabled="loading.predict"
                >
                  <Crystal class="h-4 w-4 mr-1" />
                  预测热门查询
                </Button>
                <Select v-model="predictPlugin">
                  <SelectTrigger class="w-40">
                    <SelectValue placeholder="所有插件" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">所有插件</SelectItem>
                    <SelectItem 
                      v-for="plugin in enabledPlugins" 
                      :key="plugin.id"
                      :value="plugin.id"
                    >
                      {{ plugin.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div v-if="hotQueries.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <div 
                  v-for="prediction in hotQueries" 
                  :key="prediction.query"
                  class="p-2 border rounded-lg bg-muted/50"
                >
                  <div class="font-medium text-sm truncate">{{ prediction.query }}</div>
                  <div class="flex justify-between items-center mt-1">
                    <div class="text-xs text-muted-foreground">
                      预测分数: {{ prediction.score.toFixed(2) }}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      @click="warmupQuery(prediction.query)"
                      class="h-6 w-6 p-0"
                    >
                      <Plus class="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <div v-else class="text-center text-muted-foreground py-4">
                点击"预测热门查询"查看预测结果
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- 性能图表 -->
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2">
              <Activity class="h-4 w-4" />
              性能监控
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div>
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium">时间模式分布</span>
                  <span class="text-xs text-muted-foreground">24小时使用量</span>
                </div>
                <div class="grid grid-cols-12 gap-1 h-16">
                  <div 
                    v-for="hour in 24" 
                    :key="hour-1"
                    class="bg-blue-500 rounded-sm"
                    :style="{ 
                      height: `${(timePatternUsage[hour-1]?.usage || 0) / Math.max(...timePatternUsage.map(t => t.usage)) * 100 || 0}%`,
                      opacity: 0.3 + (timePatternUsage[hour-1]?.usage || 0) / Math.max(...timePatternUsage.map(t => t.usage)) * 0.7
                    }"
                    :title="`${hour-1}:00 - ${timePatternUsage[hour-1]?.usage || 0} 次查询`"
                  />
                </div>
                <div class="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0时</span>
                  <span>12时</span>
                  <span>24时</span>
                </div>
              </div>
              
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-medium">节省时间：</span>
                  <span class="text-green-600 font-mono">
                    {{ formatTime(searchStats.timeSaved) }}
                  </span>
                </div>
                <div>
                  <span class="font-medium">平均响应时间：</span>
                  <span class="font-mono">
                    {{ searchStats.avgResponseTime.toFixed(0) }}ms
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">
          关闭
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { pluginManager } from '@/lib/search-plugin-manager'
import { useSearchCache } from '@/lib/cache/search-cache'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import {
  Database,
  BarChart3,
  Brain,
  Settings,
  Trash2,
  RefreshCw,
  Zap,
  TrendingUp,
  Crystal,
  Activity,
  Plus
} from 'lucide-vue-next'

interface Props {
  open?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

// 状态
const open = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const loading = reactive({
  clearSearch: false,
  clearLearning: false,
  refresh: false,
  warmup: false,
  predict: false
})

const selectedPlugin = ref('')
const predictPlugin = ref('')
const hotQueries = ref<Array<{query: string, score: number}>>([])

// 缓存统计
const searchStats = ref({
  totalRequests: 0,
  hits: 0,
  misses: 0,
  hitRate: 0,
  currentEntries: 0,
  memoryUsage: 0,
  avgResponseTime: 0,
  timeSaved: 0,
  expiredEntries: 0,
  cleanupCount: 0
})

const learningReport = ref({
  totalQueries: 0,
  topPlugins: [] as Array<{pluginId: string, weight: number}>,
  topQueries: [] as Array<{query: string, frequency: number}>,
  timePatterns: [] as Array<{hour: number, usage: number}>,
  predictionAccuracy: 0
})

// 计算属性
const { getCacheStats } = useSearchCache()
const { getLearningReport, predictHotQueries: predictQueries } = useSearchCache()

const enabledPlugins = computed(() => pluginManager.getEnabledPlugins())

const timePatternUsage = computed(() => {
  return Array.from({ length: 24 }, (_, hour) => {
    const pattern = learningReport.value.timePatterns.find(p => p.hour === hour)
    return { hour, usage: pattern?.usage || 0 }
  })
})

// 方法
const handleOpenChange = (value: boolean) => {
  open.value = value
  if (value) {
    refreshStats()
  }
}

const refreshStats = async () => {
  try {
    loading.refresh = true
    const cacheStats = pluginManager.getCacheStatistics()
    searchStats.value = cacheStats.searchCache
    learningReport.value = cacheStats.intelligentCache
  } catch (error) {
    console.error('Failed to refresh cache statistics:', error)
  } finally {
    loading.refresh = false
  }
}

const clearSearchCache = async () => {
  try {
    loading.clearSearch = true
    pluginManager.clearSearchCache()
    await refreshStats()
  } catch (error) {
    console.error('Failed to clear search cache:', error)
  } finally {
    loading.clearSearch = false
  }
}

const clearLearningData = async () => {
  try {
    loading.clearLearning = true
    pluginManager.clearLearningData()
    await refreshStats()
  } catch (error) {
    console.error('Failed to clear learning data:', error)
  } finally {
    loading.clearLearning = false
  }
}

const warmupAllPlugins = async () => {
  try {
    loading.warmup = true
    await pluginManager.intelligentWarmup()
    await refreshStats()
  } catch (error) {
    console.error('Failed to warmup all plugins:', error)
  } finally {
    loading.warmup = false
  }
}

const warmupSelectedPlugin = async () => {
  if (!selectedPlugin.value) return
  
  try {
    loading.warmup = true
    await pluginManager.intelligentWarmup(selectedPlugin.value)
    await refreshStats()
  } catch (error) {
    console.error('Failed to warmup selected plugin:', error)
  } finally {
    loading.warmup = false
  }
}

const predictHotQueries = async () => {
  try {
    loading.predict = true
    const pluginId = predictPlugin.value || undefined
    hotQueries.value = await pluginManager.predictHotQueries(pluginId)
  } catch (error) {
    console.error('Failed to predict hot queries:', error)
  } finally {
    loading.predict = false
  }
}

const warmupQuery = async (query: string) => {
  try {
    // 简单的查询预热逻辑
    const results = await pluginManager.search(query, 10)
    console.log(`Warmed up query: "${query}" with ${results.length} results`)
  } catch (error) {
    console.error('Failed to warmup query:', error)
  }
}

// 格式化函数
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(1) + 'KB'
  }
  return bytes.toString() + 'B'
}

const formatTime = (ms: number): string => {
  if (ms >= 1000) {
    return (ms / 1000).toFixed(1) + 's'
  }
  return ms.toFixed(0) + 'ms'
}

// 生命周期
onMounted(() => {
  refreshStats()
})

onUnmounted(() => {
  // 清理逻辑
})
</script>

<script lang="ts">
export default {
  name: 'CacheManagementDialog'
}
</script>