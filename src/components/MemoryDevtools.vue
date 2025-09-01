/**
 * 内存管理开发工具组件
 * 
 * 为开发环境提供内存监控和管理功能
 */

<template>
  <div class="memory-devtools" :class="{ 'memory-devtools--minimized': isMinimized }">
    <!-- 最小化状态 -->
    <div v-if="isMinimized" class="memory-devtools__minimized">
      <div class="memory-devtools__indicator" :class="getHealthColorClass()">
        {{ getHealthEmoji() }}
      </div>
      <div class="memory-devtools__info">
        <div class="memory-devtools__memory">{{ formatBytes(health.memoryUsage) }}</div>
        <div class="memory-devtools__leaks">{{ health.leakCount }} 泄漏</div>
      </div>
      <button @click="toggleMinimized" class="memory-devtools__expand">📊</button>
    </div>

    <!-- 完整状态 -->
    <div v-else class="memory-devtools__full">
      <div class="memory-devtools__header">
        <h3>🧠 内存管理工具</h3>
        <div class="memory-devtools__actions">
          <button @click="refreshData" title="刷新数据">🔄</button>
          <button @click="performCleanup" title="执行清理">🧹</button>
          <button @click="showReport" title="显示报告">📋</button>
          <button @click="toggleMinimized" title="最小化">_</button>
          <button @click="closeTools" title="关闭">✕</button>
        </div>
      </div>

      <div class="memory-devtools__content">
        <!-- 健康状态 -->
        <div class="memory-devtools__section">
          <h4>健康状态</h4>
          <div class="memory-devtools__health">
            <div class="memory-devtools__health-item">
              <span class="memory-devtools__label">状态:</span>
              <span class="memory-devtools__value" :class="getHealthColorClass()">
                {{ getHealthEmoji() }} {{ health.status }}
              </span>
            </div>
            <div class="memory-devtools__health-item">
              <span class="memory-devtools__label">内存使用:</span>
              <span class="memory-devtools__value">{{ formatBytes(health.memoryUsage) }}</span>
            </div>
            <div class="memory-devtools__health-item">
              <span class="memory-devtools__label">泄漏数量:</span>
              <span class="memory-devtools__value">{{ health.leakCount }}</span>
            </div>
            <div class="memory-devtools__health-item">
              <span class="memory-devtools__label">组件数量:</span>
              <span class="memory-devtools__value">{{ health.componentCount }}</span>
            </div>
          </div>
        </div>

        <!-- 监控状态 -->
        <div class="memory-devtools__section">
          <h4>监控状态</h4>
          <div class="memory-devtools__monitoring">
            <div class="memory-devtools__monitoring-item">
              <span class="memory-devtools__label">全局监控:</span>
              <span class="memory-devtools__value">
                {{ isMonitoring ? '🟢 运行中' : '🔴 已停止' }}
                <button @click="toggleMonitoring" class="memory-devtools__toggle">
                  {{ isMonitoring ? '停止' : '启动' }}
                </button>
              </span>
            </div>
            <div class="memory-devtools__monitoring-item">
              <span class="memory-devtools__label">自动清理:</span>
              <span class="memory-devtools__value">
                {{ autoCleanup ? '🟢 启用' : '🔴 禁用' }}
                <button @click="toggleAutoCleanup" class="memory-devtools__toggle">
                  {{ autoCleanup ? '禁用' : '启用' }}
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- 内存图表 -->
        <div class="memory-devtools__section">
          <h4>内存趋势</h4>
          <div class="memory-devtools__chart">
            <canvas ref="memoryChart" width="300" height="150"></canvas>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="memory-devtools__section">
          <h4>统计信息</h4>
          <div class="memory-devtools__stats">
            <div class="memory-devtools__stat-item">
              <span class="memory-devtools__label">活跃组件:</span>
              <span class="memory-devtools__value">{{ stats.vue?.activeComponents || 0 }}</span>
            </div>
            <div class="memory-devtools__stat-item">
              <span class="memory-devtools__label">总组件数:</span>
              <span class="memory-devtools__value">{{ stats.vue?.totalComponents || 0 }}</span>
            </div>
            <div class="memory-devtools__stat-item">
              <span class="memory-devtools__label">平均内存:</span>
              <span class="memory-devtools__value">{{ formatBytes(stats.vue?.averageComponentMemory || 0) }}</span>
            </div>
            <div class="memory-devtools__stat-item">
              <span class="memory-devtools__label">监控时间:</span>
              <span class="memory-devtools__value">{{ formatDuration(stats.monitor?.uptime || 0) }}</span>
            </div>
          </div>
        </div>

        <!-- 警告和建议 -->
        <div v-if="health.recommendations.length > 0" class="memory-devtools__section">
          <h4>建议</h4>
          <div class="memory-devtools__recommendations">
            <div v-for="(recommendation, index) in health.recommendations" 
                 :key="index" 
                 class="memory-devtools__recommendation">
              💡 {{ recommendation }}
            </div>
          </div>
        </div>

        <!-- 最大组件 -->
        <div v-if="stats.vue?.largestComponents?.length > 0" class="memory-devtools__section">
          <h4>最大组件</h4>
          <div class="memory-devtools__components">
            <div v-for="(component, index) in stats.vue.largestComponents.slice(0, 5)" 
                 :key="index" 
                 class="memory-devtools__component">
              <span class="memory-devtools__component-name">{{ component.name }}</span>
              <span class="memory-devtools__component-memory">{{ formatBytes(component.memory) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 报告对话框 -->
    <div v-if="showReportDialog" class="memory-devtools__dialog">
      <div class="memory-devtools__dialog-content">
        <div class="memory-devtools__dialog-header">
          <h3>🧠 内存报告</h3>
          <button @click="showReportDialog = false">✕</button>
        </div>
        <div class="memory-devtools__dialog-body">
          <pre class="memory-devtools__report">{{ reportContent }}</pre>
        </div>
        <div class="memory-devtools__dialog-actions">
          <button @click="copyReport">📋 复制</button>
          <button @click="downloadReport">💾 下载</button>
          <button @click="showReportDialog = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useAppMemory } from './memory-integration'

// 响应式数据
const isMinimized = ref(false)
const showReportDialog = ref(false)
const reportContent = ref('')
const memoryChart = ref<HTMLCanvasElement | null>(null)
const chartContext = ref<CanvasRenderingContext2D | null>(null)
const memoryHistory = ref<Array<{ timestamp: number; memory: number }>>([])

// 使用内存管理钩子
const { health, stats, isMonitoring, updateHealth, updateStats, getDetailedReport, performCleanup } = useAppMemory()

// 本地状态
const autoCleanup = ref(true)

// 生命周期
onMounted(() => {
  initializeChart()
  startDataUpdates()
})

onUnmounted(() => {
  stopDataUpdates()
})

// 初始化图表
const initializeChart = () => {
  nextTick(() => {
    if (memoryChart.value) {
      chartContext.value = memoryChart.value.getContext('2d')
      updateChart()
    }
  })
}

// 开始数据更新
let updateInterval: number
const startDataUpdates = () => {
  updateInterval = setInterval(() => {
    updateHealth()
    updateStats()
    updateMemoryHistory()
    updateChart()
  }, 2000) // 每2秒更新一次
}

// 停止数据更新
const stopDataUpdates = () => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
}

// 更新内存历史
const updateMemoryHistory = () => {
  memoryHistory.value.push({
    timestamp: Date.now(),
    memory: health.value.memoryUsage
  })
  
  // 保留最近50个数据点
  if (memoryHistory.value.length > 50) {
    memoryHistory.value = memoryHistory.value.slice(-50)
  }
}

// 更新图表
const updateChart = () => {
  if (!chartContext.value || memoryHistory.value.length === 0) {
    return
  }

  const ctx = chartContext.value
  const canvas = ctx.canvas
  const width = canvas.width
  const height = canvas.height

  // 清空画布
  ctx.clearRect(0, 0, width, height)

  // 计算数据范围
  const memoryValues = memoryHistory.value.map(h => h.memory)
  const minMemory = Math.min(...memoryValues)
  const maxMemory = Math.max(...memoryValues)
  const memoryRange = maxMemory - minMemory || 1

  // 绘制网格
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1
  for (let i = 0; i <= 5; i++) {
    const y = (height / 5) * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // 绘制内存曲线
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  ctx.beginPath()
  
  memoryHistory.value.forEach((point, index) => {
    const x = (width / (memoryHistory.value.length - 1)) * index
    const y = height - ((point.memory - minMemory) / memoryRange) * height
    
    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })
  
  ctx.stroke()

  // 绘制警告线
  const warningLevel = 100 * 1024 * 1024 // 100MB
  if (warningLevel >= minMemory && warningLevel <= maxMemory) {
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    const warningY = height - ((warningLevel - minMemory) / memoryRange) * height
    ctx.beginPath()
    ctx.moveTo(0, warningY)
    ctx.lineTo(width, warningY)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

// 切换最小化
const toggleMinimized = () => {
  isMinimized.value = !isMinimized.value
}

// 切换监控
const toggleMonitoring = () => {
  if (isMonitoring.value) {
    // 停止监控逻辑
    isMonitoring.value = false
  } else {
    // 启动监控逻辑
    isMonitoring.value = true
  }
}

// 切换自动清理
const toggleAutoCleanup = () => {
  autoCleanup.value = !autoCleanup.value
}

// 刷新数据
const refreshData = () => {
  updateHealth()
  updateStats()
  updateMemoryHistory()
  updateChart()
}

// 显示报告
const showReport = () => {
  reportContent.value = getDetailedReport()
  showReportDialog.value = true
}

// 复制报告
const copyReport = async () => {
  try {
    await navigator.clipboard.writeText(reportContent.value)
    alert('报告已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 下载报告
const downloadReport = () => {
  const blob = new Blob([reportContent.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `memory-report-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 关闭工具
const closeTools = () => {
  const element = document.querySelector('.memory-devtools')
  if (element) {
    element.remove()
  }
}

// 获取健康状态颜色类
const getHealthColorClass = () => {
  switch (health.value.status) {
    case 'healthy': return 'memory-devtools--healthy'
    case 'warning': return 'memory-devtools--warning'
    case 'critical': return 'memory-devtools--critical'
    default: return ''
  }
}

// 获取健康状态表情符号
const getHealthEmoji = () => {
  switch (health.value.status) {
    case 'healthy': return '✅'
    case 'warning': return '⚠️'
    case 'critical': return '🚨'
    default: return '❓'
  }
}

// 格式化字节数
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
}

// 格式化持续时间
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}
</script>

<style scoped>
.memory-devtools {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  z-index: 9999;
  max-width: 400px;
  max-height: 600px;
  overflow: hidden;
}

.memory-devtools--minimized {
  width: 200px;
  height: 60px;
}

.memory-devtools__minimized {
  display: flex;
  align-items: center;
  padding: 10px;
  height: 100%;
}

.memory-devtools__indicator {
  font-size: 20px;
  margin-right: 10px;
}

.memory-devtools__info {
  flex: 1;
}

.memory-devtools__memory {
  font-weight: bold;
  color: #374151;
}

.memory-devtools__leaks {
  font-size: 11px;
  color: #6b7280;
}

.memory-devtools__expand {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 5px;
}

.memory-devtools__full {
  width: 400px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.memory-devtools__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.memory-devtools__header h3 {
  margin: 0;
  font-size: 16px;
  color: #111827;
}

.memory-devtools__actions {
  display: flex;
  gap: 5px;
}

.memory-devtools__actions button {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}

.memory-devtools__actions button:hover {
  background: #f3f4f6;
}

.memory-devtools__content {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.memory-devtools__section {
  margin-bottom: 20px;
}

.memory-devtools__section h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #374151;
  font-weight: 600;
}

.memory-devtools__health,
.memory-devtools__monitoring,
.memory-devtools__stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.memory-devtools__health-item,
.memory-devtools__monitoring-item,
.memory-devtools__stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.memory-devtools__label {
  color: #6b7280;
  font-size: 12px;
}

.memory-devtools__value {
  color: #111827;
  font-weight: 500;
  font-size: 12px;
}

.memory-devtools__toggle {
  margin-left: 8px;
  padding: 2px 6px;
  font-size: 10px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.memory-devtools__toggle:hover {
  background: #2563eb;
}

.memory-devtools__chart {
  width: 100%;
  height: 150px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.memory-devtools__recommendations {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.memory-devtools__recommendation {
  padding: 8px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 4px;
  font-size: 11px;
  color: #92400e;
}

.memory-devtools__components {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.memory-devtools__component {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px;
  background: #f3f4f6;
  border-radius: 4px;
}

.memory-devtools__component-name {
  font-size: 11px;
  color: #374151;
}

.memory-devtools__component-memory {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.memory-devtools__dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.memory-devtools__dialog-content {
  background: white;
  border-radius: 8px;
  width: 80%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
}

.memory-devtools__dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.memory-devtools__dialog-header h3 {
  margin: 0;
  font-size: 16px;
  color: #111827;
}

.memory-devtools__dialog-body {
  padding: 15px;
  max-height: 60vh;
  overflow-y: auto;
}

.memory-devtools__report {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: #374151;
  white-space: pre-wrap;
}

.memory-devtools__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.memory-devtools__dialog-actions button {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #374151;
  cursor: pointer;
  font-size: 12px;
}

.memory-devtools__dialog-actions button:hover {
  background: #f3f4f6;
}

/* 健康状态颜色 */
.memory-devtools--healthy {
  color: #10b981;
}

.memory-devtools--warning {
  color: #f59e0b;
}

.memory-devtools--critical {
  color: #ef4444;
}
</style>