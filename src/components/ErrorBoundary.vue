<template>
  <div class="error-boundary">
    <!-- 正常内容渲染 -->
    <slot v-if="!hasError" />
    
    <!-- 错误状态显示 -->
    <div v-else class="error-fallback">
      <div class="error-container">
        <div class="error-icon">
          <AlertTriangleIcon class="w-12 h-12 text-red-500" />
        </div>
        
        <div class="error-content">
          <h3 class="error-title">{{ errorTitle }}</h3>
          <p class="error-message">{{ errorMessage }}</p>
          
          <!-- 错误详情（仅开发环境显示） -->
          <details v-if="showDetails && errorDetails" class="error-details">
            <summary>技术详情</summary>
            <pre class="error-stack">{{ errorDetails }}</pre>
          </details>
          
          <!-- 操作按钮 -->
          <div class="error-actions">
            <Button 
              v-if="error?.recoverable" 
              variant="outline" 
              @click="handleRetry"
              class="retry-button"
            >
              <RefreshCwIcon class="w-4 h-4 mr-2" />
              重试
            </Button>
            
            <Button 
              variant="default" 
              @click="handleReload"
              class="reload-button"
            >
              <HomeIcon class="w-4 h-4 mr-2" />
              刷新页面
            </Button>
            
            <Button 
              v-if="showReportButton" 
              variant="ghost" 
              @click="handleReport"
              class="report-button"
            >
              <FlagIcon class="w-4 h-4 mr-2" />
              上报问题
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onErrorCaptured } from 'vue'
import { Button } from '@/components/ui/button'
import { 
  AlertTriangleIcon, 
  RefreshCwIcon, 
  HomeIcon, 
  FlagIcon 
} from 'lucide-vue-next'
import { logger } from '@/lib/logger'
import { type AppError, getUserFriendlyMessage, isRecoverable } from '@/lib/error-handler'
import { pluginEventBus, eventBusUtils } from '@/lib/plugins/plugin-event-bus'

interface Props {
  /** 错误边界名称，用于错误定位 */
  name?: string
  /** 是否显示错误详情 */
  showDetails?: boolean
  /** 是否显示上报按钮 */
  showReportButton?: boolean
  /** 自定义错误标题 */
  fallbackTitle?: string
  /** 自定义错误消息 */
  fallbackMessage?: string
  /** 重试回调函数 */
  onRetry?: () => Promise<void> | void
  /** 错误上报回调函数 */
  onReport?: (error: AppError) => void
}

const props = withDefaults(defineProps<Props>(), {
  name: 'UnnamedErrorBoundary',
  showDetails: () => import.meta.env.DEV,
  showReportButton: false,
  fallbackTitle: '页面出现错误',
  fallbackMessage: '很抱歉，页面遇到了一些问题'
})

const emit = defineEmits<{
  report: [error: AppError]
}>()

const hasError = ref(false)
const error = ref<AppError | null>(null)

/**
 * 错误捕获处理
 */
onErrorCaptured((err, _instance, info) => {
  // 阻止错误继续传播
  handleError(err, info)
  return false // 阻止错误继续向上传播
})

/**
 * 处理错误
 */
const handleError = (err: any, info?: string) => {
  logger.error(`ErrorBoundary [${props.name}] 捕获错误:`, { error: err, info })
  
  // 创建结构化错误对象
  const appError: AppError = {
    type: 'unknown' as any,
    severity: 'high' as any,
    message: err?.message || err?.toString() || '未知错误',
    userMessage: props.fallbackMessage,
    details: {
      error: err,
      component: props.name,
      info,
      timestamp: Date.now()
    },
    recoverable: isRecoverable(err),
    timestamp: Date.now()
  }
  
  error.value = appError
  hasError.value = true
  
  // 发送错误事件到事件总线
  pluginEventBus.emit(eventBusUtils.createPluginErrorEvent(
    'plugin.error occurred',
    props.name,
    'component_error',
    appError.message,
    { error: err, component: props.name, info },
    'high'
  ))
  
  // 调用错误上报回调
  if (props.onReport) {
    props.onReport(appError)
  }
  
  // 发送错误上报事件
  emit('report', appError)
}

/**
 * 重试操作
 */
const handleRetry = async () => {
  if (!props.onRetry) {
    // 默认重试行为：清除错误状态
    hasError.value = false
    error.value = null
    return
  }
  
  try {
    await props.onRetry()
    hasError.value = false
    error.value = null
    logger.info(`ErrorBoundary [${props.name}] 重试成功`)
  } catch (retryError) {
    logger.error(`ErrorBoundary [${props.name}] 重试失败:`, retryError)
    // 更新错误信息
    handleError(retryError, 'retry_failed')
  }
}

/**
 * 重新加载页面
 */
const handleReload = () => {
  logger.info(`ErrorBoundary [${props.name}] 重新加载页面`)
  window.location.reload()
}

/**
 * 上报错误
 */
const handleReport = () => {
  if (!error.value) return
  
  logger.warn('用户上报错误:', error.value)
  
  // 这里可以实现具体的上报逻辑，比如发送到错误监控服务
  // 目前只记录日志
  
  // 显示感谢信息
  const originalMessage = error.value.userMessage
  error.value.userMessage = '感谢您的反馈！我们已收到问题报告。'
  
  setTimeout(() => {
    if (error.value) {
      error.value.userMessage = originalMessage
    }
  }, 3000)
}

/**
 * 重置错误状态
 */
const resetError = () => {
  hasError.value = false
  error.value = null
}

/**
 * 监听全局错误重置事件
 */
const handleGlobalErrorReset = () => {
  resetError()
}

onMounted(() => {
  // 监听全局错误重置事件
  pluginEventBus.on('plugin.error.recovered', handleGlobalErrorReset)
})

onUnmounted(() => {
  // 清理事件监听
  pluginEventBus.off('plugin.error.recovered', handleGlobalErrorReset)
})

// 计算属性
const errorTitle = computed(() => {
  return props.fallbackTitle
})

const errorMessage = computed(() => {
  if (!error.value) return props.fallbackMessage
  return getUserFriendlyMessage(error.value)
})

const errorDetails = computed(() => {
  if (!error.value || !props.showDetails) return null
  return JSON.stringify(error.value.details, null, 2)
})

// 暴露方法给父组件
defineExpose({
  hasError,
  error,
  errorTitle,
  errorMessage,
  errorDetails,
  handleRetry,
  handleReload,
  handleReport,
  resetError,
  handleError
})
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
}

.error-container {
  max-width: 500px;
  text-align: center;
}

.error-icon {
  margin-bottom: 1rem;
  color: #ef4444;
}

.error-content {
  space-y: 1rem;
}

.error-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #991b1b;
  margin-bottom: 0.5rem;
}

.error-message {
  color: #7f1d1d;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.error-details {
  margin-top: 1rem;
  text-align: left;
}

.error-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  padding: 0.5rem;
  background-color: #f3f4f6;
  border-radius: 0.25rem;
  margin-bottom: 0.5rem;
}

.error-stack {
  background-color: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.retry-button,
.reload-button,
.report-button {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.retry-button {
  background-color: #3b82f6;
  color: white;
  border: 1px solid #2563eb;
}

.retry-button:hover {
  background-color: #2563eb;
}

.reload-button {
  background-color: #6b7280;
  color: white;
  border: 1px solid #4b5563;
}

.reload-button:hover {
  background-color: #4b5563;
}

.report-button {
  background-color: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.report-button:hover {
  background-color: #f9fafb;
  color: #374151;
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .error-fallback {
    background-color: #7f1d1d;
    border-color: #991b1b;
  }
  
  .error-title {
    color: #fecaca;
  }
  
  .error-message {
    color: #fee2e2;
  }
  
  .error-details summary {
    background-color: #374151;
    color: #f9fafb;
  }
}
</style>