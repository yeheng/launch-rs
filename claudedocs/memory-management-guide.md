# 内存管理系统使用指南

## 概述

本内存管理系统为 Vue 3 + Tauri 应用程序提供了全面的内存监控、泄漏检测和优化功能。系统包含多个层次的工具，从底层的内存监控到高层的 Vue 组件集成。

## 核心组件

### 1. MemoryMonitor - 内存监控器

**位置**: `src/lib/utils/memory-monitor.ts`

**功能**:
- 实时内存使用监控
- 内存阈值告警
- 自动内存清理
- 内存趋势分析

**使用示例**:
```typescript
import { createMemoryMonitor } from '@/lib/utils/memory-monitor'

const monitor = createMemoryMonitor({
  interval: 5000, // 5秒监控间隔
  thresholds: {
    heapUsed: {
      warning: 100 * 1024 * 1024, // 100MB警告
      critical: 200 * 1024 * 1024, // 200MB严重
      action: 'warn' // 告警动作
    }
  },
  autoCleanup: true, // 启用自动清理
  verboseLogging: true // 详细日志
})

// 开始监控
monitor.start()

// 监听事件
monitor.on('threshold', (data) => {
  console.log('内存阈值告警:', data)
})

monitor.on('leak', (leak) => {
  console.log('内存泄漏检测:', leak)
})

// 获取统计信息
const stats = monitor.getStats()
console.log('当前内存使用:', stats.current.heapUsed)
```

### 2. LeakDetector - 泄漏检测器

**位置**: `src/lib/utils/leak-detector.ts`

**功能**:
- 深度内存泄漏检测
- 对象引用分析
- 循环引用检测
- 内存使用分析

**使用示例**:
```typescript
import { createLeakDetector } from '@/lib/utils/leak-detector'

const detector = createLeakDetector({
  interval: 30000, // 30秒检测间隔
  deepDetection: true, // 启用深度检测
  trackReferences: true, // 跟踪对象引用
  maxDepth: 10 // 最大检测深度
})

// 开始检测
detector.start()

// 手动触发检测
const analysis = await detector.triggerDetection()
console.log('内存分析结果:', analysis)

// 获取统计信息
const stats = detector.getStats()
console.log('检测到的泄漏:', stats.detectedLeaks)
```

### 3. VueMemoryManager - Vue内存管理器

**位置**: `src/lib/utils/vue-memory-manager.ts`

**功能**:
- Vue 组件内存跟踪
- 响应式对象监控
- 组件生命周期分析
- Vue 特定的内存优化

**使用示例**:
```typescript
import { useMemoryManager } from '@/lib/utils/vue-memory-manager'

// 在组件中使用
export default {
  setup() {
    const { stats, isMonitoring, getReport } = useMemoryManager({
      trackComponents: true, // 跟踪组件
      trackReactive: true, // 跟踪响应式对象
      trackWatchers: true, // 跟踪监听器
      componentThreshold: 1024 * 1024 // 1MB阈值
    })

    return {
      stats,
      isMonitoring,
      getReport
    }
  }
}

// 手动注册组件
import { globalVueMemoryManager } from '@/lib/utils/vue-memory-manager'

// 在组件中
export default {
  mounted() {
    globalVueMemoryManager.registerComponent(this)
  },
  beforeUnmount() {
    globalVueMemoryManager.unregisterComponent(this)
  }
}
```

### 4. MemoryIntegration - 集成管理器

**位置**: `src/lib/utils/memory-integration.ts`

**功能**:
- 统一的内存管理入口
- 自动初始化和配置
- 健康状态监控
- 综合报告生成

**使用示例**:
```typescript
import { globalMemoryIntegration, useAppMemory } from '@/lib/utils/memory-integration'

// 获取应用内存状态
const { health, stats, isMonitoring } = useAppMemory()

// 检查健康状态
console.log('内存健康:', health.status)
console.log('内存使用:', health.memoryUsage)

// 获取详细报告
const report = globalMemoryIntegration.getDetailedReport()
console.log(report)

// 手动触发分析
const analysis = await globalMemoryIntegration.triggerAnalysis()
console.log('分析结果:', analysis)

// 执行内存清理
globalMemoryIntegration.performMemoryCleanup()
```

## 开发工具

### 1. MemoryDevtools - 开发者工具组件

**位置**: `src/components/MemoryDevtools.vue`

**功能**:
- 可视化内存监控面板
- 实时内存图表
- 组件内存统计
- 一键内存清理

**使用示例**:
```vue
<template>
  <div>
    <!-- 你的应用内容 -->
    
    <!-- 内存管理工具（仅在开发环境显示） -->
    <MemoryDevtools v-if="isDevelopment" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MemoryDevtools from '@/components/MemoryDevtools.vue'

const isDevelopment = import.meta.env.DEV
</script>
```

### 2. CLI工具

**位置**: `scripts/memory-cli.ts`

**功能**:
- 命令行内存分析
- 健康检查
- 报告生成
- 快照比较

**使用示例**:
```bash
# 健康检查
npm run memory-cli health

# 实时监控
npm run memory-cli monitor --interval 5 --timeout 60

# 深度分析
npm run memory-cli analyze --deep --output report.json

# 生成报告
npm run memory-cli report --output memory-report.txt

# 执行清理
npm run memory-cli cleanup --force

# 比较快照
npm run memory-cli compare before.json after.json
```

## 配置选项

### 环境变量

```bash
# 启用内存监控
MEMORY_MONITOR=true

# 启用深度检测
MEMORY_DEEP_DETECTION=true

# 设置监控间隔（毫秒）
MEMORY_INTERVAL=5000

# 设置内存阈值（字节）
MEMORY_WARNING_THRESHOLD=104857600
MEMORY_CRITICAL_THRESHOLD=209715200
```

### 配置文件

```typescript
// memory.config.ts
export const memoryConfig = {
  monitor: {
    interval: 5000,
    thresholds: {
      heapUsed: {
        warning: 100 * 1024 * 1024,
        critical: 200 * 1024 * 1024,
        action: 'warn'
      }
    },
    autoCleanup: true
  },
  detector: {
    interval: 30000,
    deepDetection: true,
    trackReferences: true
  },
  vue: {
    trackComponents: true,
    trackReactive: true,
    trackWatchers: true,
    componentThreshold: 1024 * 1024
  }
}
```

## 最佳实践

### 1. 组件内存管理

```typescript
// 好的做法：及时清理资源
export default {
  setup() {
    const timer = ref(null)
    const eventListeners = ref([])

    onMounted(() => {
      // 设置定时器
      timer.value = setInterval(() => {
        // 定时任务
      }, 1000)

      // 添加事件监听器
      window.addEventListener('resize', handleResize)
      eventListeners.value.push({ target: window, event: 'resize', handler: handleResize })
    })

    onBeforeUnmount(() => {
      // 清理定时器
      if (timer.value) {
        clearInterval(timer.value)
        timer.value = null
      }

      // 清理事件监听器
      eventListeners.value.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler)
      })
      eventListeners.value = []
    })

    return {}
  }
}
```

### 2. 响应式数据管理

```typescript
// 好的做法：避免大的响应式对象
export default {
  setup() {
    // 避免过大的响应式对象
    const largeData = ref(null)
    
    // 使用分页或虚拟滚动
    const paginatedData = computed(() => {
      return largeData.value?.slice(0, 100) || []
    })

    // 及时清理不需要的数据
    const cleanup = () => {
      largeData.value = null
    }

    return {
      paginatedData,
      cleanup
    }
  }
}
```

### 3. 内存泄漏预防

```typescript
// 使用 WeakMap 避免强引用
const weakCache = new WeakMap()

// 使用 WeakRef 处理临时对象
const tempRef = new WeakRef(someObject)

// 及时清理引用
const cleanup = () => {
  weakCache.delete(key)
  tempRef = null
}
```

## 性能优化建议

### 1. 监控策略

- **开发环境**: 启用完整监控和详细日志
- **测试环境**: 启用基本监控，减少日志输出
- **生产环境**: 仅启用关键监控，最小化性能影响

### 2. 阈值设置

- 根据应用特点调整内存阈值
- 设置合理的监控间隔
- 配置适当的告警级别

### 3. 定期维护

- 定期检查内存使用报告
- 分析内存泄漏趋势
- 优化内存使用模式

## 故障排除

### 常见问题

1. **内存持续增长**
   - 检查是否有未清理的定时器
   - 检查事件监听器是否正确移除
   - 检查是否有循环引用

2. **监控性能影响**
   - 调整监控间隔
   - 关闭不必要的检测功能
   - 优化检测算法

3. **Vue 组件泄漏**
   - 确保组件正确卸载
   - 检查响应式数据清理
   - 验证监听器移除

### 调试技巧

```typescript
// 开启详细日志
const monitor = createMemoryMonitor({
  verboseLogging: true
})

// 手动触发检测
await detector.triggerDetection()

// 检查组件内存使用
const componentStats = vueMemoryManager.getStats()
console.log('组件统计:', componentStats)

// 生成详细报告
const report = globalMemoryIntegration.getDetailedReport()
console.log(report)
```

## 扩展功能

### 自定义检测器

```typescript
class CustomLeakDetector {
  detectCustomLeaks() {
    // 实现自定义检测逻辑
    return {
      type: 'custom',
      severity: 'medium',
      details: 'Custom leak detected'
    }
  }
}

// 集成到现有系统
globalMemoryIntegration.addCustomDetector(new CustomLeakDetector())
```

### 自定义报告

```typescript
// 自定义报告格式
function generateCustomReport(stats) {
  return `
Custom Memory Report
====================
Status: ${stats.health.status}
Memory: ${formatBytes(stats.health.memoryUsage)}
Custom Metrics: ${stats.customMetrics}
  `
}

// 替换默认报告生成器
globalMemoryIntegration.setReportGenerator(generateCustomReport)
```

这个内存管理系统为应用程序提供了全面的内存管理解决方案，帮助开发者识别和解决内存问题，优化应用性能。