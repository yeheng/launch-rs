<template>
  <div class="flex flex-col h-screen bg-white">
    <!-- 主搜索区域 -->
    <div class="flex-1 flex flex-col justify-center items-center px-8">
      <!-- Logo 或应用标题 -->
      <div class="mb-8 text-center">
        <h1 class="text-3xl font-light text-gray-700 mb-2">{{ t('app.name') }}</h1>
        <p class="text-sm text-gray-400">快速启动您的应用和工具</p>
      </div>
      
      <!-- 搜索框 -->
      <div class="w-full max-w-2xl relative">
        <div class="relative">
          <SearchIcon class="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            ref="searchInput"
            v-model="searchQuery"
            type="text" 
            placeholder="搜索应用、文件或执行命令..."
            class="search-input w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            @keydown="handleKeydown"
            @input="handleSearch"
          />
        </div>
        
        <!-- 搜索结果 -->
        <div v-if="searchResults.length > 0 || isSearching" class="search-results absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
          <!-- 加载状态 -->
          <div v-if="isSearching" class="flex items-center justify-center py-4 text-gray-500">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
            搜索中...
          </div>
          
          <!-- 搜索结果 -->
          <div 
            v-for="(result, index) in searchResults" 
            :key="result.id"
            :class="['result-item flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer', { 'selected': index === selectedIndex, 'bg-blue-50': index === selectedIndex }]"
            @click="selectResult(result)"
          >
            <div class="w-8 h-8 mr-3 flex items-center justify-center bg-gray-100 rounded">
              <component :is="result.icon" class="w-4 h-4 text-gray-600" />
            </div>
            <div class="flex-1">
              <div class="font-medium text-gray-900">{{ result.title }}</div>
              <div class="text-sm text-gray-500">{{ result.description }}</div>
            </div>
            <!-- 插件来源标识 -->
            <div class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {{ getPluginDisplayName(result.source) }}
            </div>
          </div>
          
          <!-- 无结果提示 -->
          <div v-if="!isSearching && searchResults.length === 0 && searchQuery.trim()" class="px-4 py-3 text-gray-500 text-center">
            未找到匹配的结果
          </div>
        </div>
      </div>
      
      <!-- 快捷操作提示 -->
      <div class="mt-8 text-center text-sm text-gray-400">
        <div class="space-y-1">
          <div>按 <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd> 执行</div>
          <div>按 <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">↑</kbd> <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">↓</kbd> 选择</div>
          <div>按 <kbd class="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd> 清空</div>
        </div>
      </div>
    </div>

    <!-- 底部工具栏 -->
    <footer class="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
      <!-- 左侧信息 -->
      <div class="flex items-center space-x-4 text-xs text-gray-500">
        <span>{{ t('app.name') }} v{{ t('app.version') }}</span>
        <span>•</span>
        <span>{{ searchResults.length }} 项结果</span>
      </div>
      
      <!-- 右侧操作按钮 -->
      <div class="flex items-center space-x-2">
        <!-- 测试按钮组 -->
        <Button 
          variant="ghost" 
          size="sm" 
          class="footer-button text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          @click="testGlobalShortcut"
          title="注册全局快捷键"
        >
          <div class="w-4 h-4">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>
              <line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="2"/>
              <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
        </Button>
        
        <!-- 插件管理按钮 -->
        <Button 
          variant="ghost" 
          size="sm" 
          class="footer-button text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          @click="navigateToPlugins"
          title="插件管理"
        >
          <div class="w-4 h-4">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>
              <circle cx="9" cy="9" r="2" stroke="currentColor" stroke-width="2" fill="none"/>
              <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L13 14" stroke="currentColor" stroke-width="2"/>
              <path d="M21 21l-6-6" stroke="currentColor" stroke-width="2"/>
            </svg>
          </div>
        </Button>
        
        <!-- 设置按钮 -->
        <Button 
          variant="ghost" 
          size="sm" 
          class="footer-button text-gray-600 hover:text-gray-700 hover:bg-gray-100"
          @click="navigateToSettings"
          title="设置"
        >
          <SettingsIcon class="w-4 h-4" />
        </Button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { pluginManager, registerBuiltinPlugins } from '@/lib/plugins'
import type { SearchResultItem } from '@/lib/search-plugins'
import { SearchIcon, SettingsIcon } from 'lucide-vue-next'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { logger } from '@/lib/logger'
import { handlePluginError } from '@/lib/error-handler'
import { SEARCH_CONFIG } from '@/lib/config'

const router = useRouter()
const { t } = useI18n()

// 搜索相关的响应式数据
const searchInput = ref<HTMLInputElement>()
const searchQuery = ref('')
const selectedIndex = ref(0)
const searchResults = ref<SearchResultItem[]>([])
const isSearching = ref(false)

// 搜索防抖
let searchTimer: ReturnType<typeof setTimeout> | null = null
const SEARCH_DEBOUNCE = SEARCH_CONFIG.debounceTime

// 搜索函数
const handleSearch = () => {
  // 清除之前的定时器
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  
  // 设置新的定时器
  searchTimer = setTimeout(async () => {
    const query = searchQuery.value.trim()
    
    if (!query) {
      searchResults.value = []
      selectedIndex.value = 0
      isSearching.value = false
      return
    }
    
    try {
      isSearching.value = true
      const results = await pluginManager.search(query, 20) // 限制20个结果
      searchResults.value = results
      selectedIndex.value = 0
    } catch (error) {
      const appError = handlePluginError('搜索', error)
      logger.error('搜索失败', appError)
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, SEARCH_DEBOUNCE)
}

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (selectedIndex.value < searchResults.value.length - 1) {
        selectedIndex.value++
      }
      break
      
    case 'ArrowUp':
      event.preventDefault()
      if (selectedIndex.value > 0) {
        selectedIndex.value--
      }
      break
      
    case 'Enter':
      event.preventDefault()
      if (searchResults.value[selectedIndex.value]) {
        selectResult(searchResults.value[selectedIndex.value])
      }
      break
      
    case 'Escape':
      event.preventDefault()
      searchQuery.value = ''
      searchResults.value = []
      selectedIndex.value = 0
      break
  }
}

// 选择结果
const selectResult = async (result: SearchResultItem) => {
  try {
    await result.action()
    // 清空搜索（可选）
    searchQuery.value = ''
    searchResults.value = []
    selectedIndex.value = 0
  } catch (error) {
    const appError = handlePluginError('执行搜索结果', error)
    logger.error('执行操作失败', appError)
  }
}

// 导航到设置页面
const navigateToSettings = () => {
  router.push('/setting_window')
}

// 导航到插件管理页面
const navigateToPlugins = () => {
  router.push('/plugins')
}

// 测试全局快捷键功能
const testGlobalShortcut = async () => {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('register_global_shortcut', {
      shortcutId: 'toggle_window',
      accelerator: 'Alt+Space'
    })
    logger.success('全局快捷键 Alt+Space 注册成功！请在任意地方按下 Alt+Space 来切换窗口显示/隐藏')
  } catch (error) {
    const appError = handlePluginError('注册全局快捷键', error)
    logger.error('注册全局快捷键失败', appError)
  }
}

// 获取插件显示名称
const getPluginDisplayName = (pluginId: string): string => {
  const plugin = pluginManager.getPlugin(pluginId)
  return plugin ? plugin.name : pluginId
}

// 插件管理器事件监听
const onSearchStart = (query: string) => {
  logger.debug(`开始搜索: ${query}`)
}

const onSearchResults = (results: SearchResultItem[]) => {
  logger.debug(`搜索完成，获得 ${results.length} 个结果`)
}

const onSearchEnd = (query: string, resultCount: number) => {
  logger.debug(`搜索结束: "${query}" -> ${resultCount} 个结果`)
}

// 组件挂载和卸载
onMounted(async () => {
  try {
    // 注册内置插件
    await registerBuiltinPlugins()
    
    // 监听插件管理器事件
    pluginManager.on('search:start', onSearchStart)
    pluginManager.on('search:results', onSearchResults)
    pluginManager.on('search:end', onSearchEnd)
    
    // 聚焦搜索框
    await nextTick()
    if (searchInput.value) {
      searchInput.value.focus()
    }
    
    logger.success('搜索插件系统初始化完成')
  } catch (error) {
    const appError = handlePluginError('初始化搜索插件系统', error)
    logger.error('初始化搜索插件系统失败', appError)
  }
})

onUnmounted(() => {
  // 清理事件监听器
  pluginManager.off('search:start', onSearchStart)
  pluginManager.off('search:results', onSearchResults)
  pluginManager.off('search:end', onSearchEnd)
  
  // 清理定时器
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})

</script>

<style scoped>
/* 搜索框焦点动画 */
.search-input {
  transition: all 0.3s ease;
}

.search-input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

/* 搜索结果滑入动画 */
.search-results {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 快捷键样式 */
kbd {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-weight: 500;
}

/* 选中结果的高亮效果 */
.result-item.selected {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-left: 4px solid #3b82f6;
}

/* 底部工具栏按钮悬停效果 */
.footer-button {
  transition: all 0.2s ease;
}

.footer-button:hover {
  transform: translateY(-1px);
}
</style> 