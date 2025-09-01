<template>
  <ErrorBoundary name="AppRoot" @report="handleErrorReport">
    <div class="app-container">
      <router-view />
    </div>
  </ErrorBoundary>
</template>

<script setup>
import { ErrorBoundary } from '@/components/ErrorBoundary.vue'
import { logger } from '@/lib/logger'

// 处理错误上报
const handleErrorReport = (error) => {
  logger.warn('用户上报错误:', error)
  // 这里可以实现具体的错误上报逻辑
}
</script>

<style>
.app-container {
  height: 100vh;
  width: 100vw;
}
</style>