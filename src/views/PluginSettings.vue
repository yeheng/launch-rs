<template>
  <div class="space-y-6">
    <div class="space-y-4">
      <h2 class="text-lg font-medium">搜索插件管理</h2>
      <p class="text-sm text-gray-500">启用或禁用搜索插件，以及配置插件设置</p>
      
      <!-- 插件列表 -->
      <div class="space-y-4">
        <div 
          v-for="plugin in plugins" 
          :key="plugin.id"
          class="border rounded-lg p-4"
          :class="{ 'border-blue-200 bg-blue-50': plugin.enabled, 'border-gray-200': !plugin.enabled }"
        >
          <!-- 插件头部 -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 flex items-center justify-center bg-white rounded shadow">
                <component :is="plugin.icon" class="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{{ plugin.name }}</h3>
                <p class="text-sm text-gray-500">{{ plugin.description }}</p>
              </div>
            </div>
            
            <!-- 启用/禁用开关 -->
            <div class="flex items-center space-x-3">
              <span class="text-sm text-gray-500">v{{ plugin.version }}</span>
              <Switch 
                :checked="plugin.enabled" 
                @update:checked="togglePlugin(plugin.id, $event)"
                :disabled="isLoading"
              />
            </div>
          </div>

          <!-- 插件设置 -->
          <div v-if="plugin.enabled && plugin.settings" class="border-t pt-3 mt-3">
            <h4 class="text-sm font-medium text-gray-700 mb-3">插件设置</h4>
            <div class="space-y-3">
              <div 
                v-for="setting in plugin.settings.schema" 
                :key="setting.key"
                class="grid grid-cols-1 gap-2"
              >
                <Label class="text-sm font-medium text-gray-700">
                  {{ setting.label }}
                  <span v-if="setting.description" class="font-normal text-gray-500 block text-xs">
                    {{ setting.description }}
                  </span>
                </Label>
                
                <!-- 布尔类型设置 -->
                <div v-if="setting.type === 'boolean'" class="flex items-center space-x-2">
                  <Switch 
                    :checked="plugin.settings.values[setting.key]" 
                    @update:checked="updatePluginSetting(plugin.id, setting.key, $event)"
                    :disabled="isLoading"
                  />
                  <span class="text-sm text-gray-600">
                    {{ plugin.settings.values[setting.key] ? '已启用' : '已禁用' }}
                  </span>
                </div>
                
                <!-- 字符串类型设置 -->
                <Input
                  v-else-if="setting.type === 'string'"
                  :value="plugin.settings.values[setting.key]"
                  @input="updatePluginSetting(plugin.id, setting.key, ($event.target as HTMLInputElement).value)"
                  :placeholder="setting.defaultValue"
                  :disabled="isLoading"
                  class="max-w-md"
                />
                
                <!-- 数字类型设置 -->
                <Input
                  v-else-if="setting.type === 'number'"
                  type="number"
                  :value="plugin.settings.values[setting.key]"
                  @input="updatePluginSetting(plugin.id, setting.key, Number(($event.target as HTMLInputElement).value))"
                  :placeholder="setting.defaultValue?.toString()"
                  :disabled="isLoading"
                  class="max-w-md"
                />
                
                <!-- 选择类型设置 -->
                <Select
                  v-else-if="setting.type === 'select'"
                  :value="plugin.settings.values[setting.key]"
                  @update:value="updatePluginSetting(plugin.id, setting.key, $event)"
                  :disabled="isLoading"
                >
                  <SelectTrigger class="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem 
                      v-for="option in setting.options" 
                      :key="option.value" 
                      :value="option.value"
                    >
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <!-- 插件信息 -->
          <div v-if="plugin.enabled" class="border-t pt-3 mt-3">
            <div class="flex items-center justify-between text-xs text-gray-500">
              <div class="space-x-4">
                <span>优先级: {{ plugin.priority }}</span>
                <span v-if="plugin.searchPrefixes">
                  前缀: {{ plugin.searchPrefixes.join(', ') }}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                @click="testPlugin(plugin.id)"
                :disabled="isLoading"
                class="text-xs"
              >
                测试插件
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- 插件统计 -->
      <div class="bg-gray-50 rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-700 mb-2">插件统计</h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-500">总插件数:</span>
            <span class="font-medium text-gray-900 ml-1">{{ plugins.length }}</span>
          </div>
          <div>
            <span class="text-gray-500">已启用:</span>
            <span class="font-medium text-green-600 ml-1">{{ enabledPluginsCount }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import Input from '@/components/ui/input/input.vue'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { pluginManager } from '@/lib/plugins'
import type { SearchPlugin } from '@/lib/search-plugins'
import { computed, onMounted, ref } from 'vue'
import { logger } from '@/lib/logger'
import { handlePluginError } from '@/lib/error-handler'

const plugins = ref<SearchPlugin[]>([])
const isLoading = ref(false)

// 计算启用的插件数量
const enabledPluginsCount = computed(() => 
  plugins.value.filter(p => p.enabled).length
)

// 加载插件列表
const loadPlugins = () => {
  plugins.value = pluginManager.getPlugins()
}

// 切换插件状态
const togglePlugin = async (pluginId: string, enabled: boolean) => {
  if (isLoading.value) return
  
  try {
    isLoading.value = true
    
    if (enabled) {
      await pluginManager.enablePlugin(pluginId)
    } else {
      await pluginManager.disablePlugin(pluginId)
    }
    
    // 刷新插件列表
    loadPlugins()
    
    logger.info(`插件 ${pluginId} ${enabled ? '已启用' : '已禁用'}`)
  } catch (error) {
    const appError = handlePluginError('切换插件状态', error)
    logger.error(`切换插件状态失败`, appError)
    // 这里可以添加错误提示
  } finally {
    isLoading.value = false
  }
}

// 更新插件设置
const updatePluginSetting = async (pluginId: string, settingKey: string, value: any) => {
  const plugin = pluginManager.getPlugin(pluginId)
  if (!plugin || !plugin.settings) return
  
  try {
    // 更新设置值
    plugin.settings.values[settingKey] = value
    
    // 如果有变更回调，调用它
    if (plugin.settings.onChange) {
      plugin.settings.onChange(settingKey, value)
    }
    
    logger.info(`插件 ${pluginId} 设置 ${settingKey} 已更新为:`, value)
  } catch (error) {
    const appError = handlePluginError('更新插件设置', error)
    logger.error(`更新插件设置失败`, appError)
  }
}

// 测试插件
const testPlugin = async (pluginId: string) => {
  try {
    isLoading.value = true
    const results = await pluginManager.search('test', 5)
    const pluginResults = results.filter(r => r.source === pluginId)
    
    logger.debug(`插件 ${pluginId} 测试结果:`, pluginResults)
    
    if (pluginResults.length > 0) {
      alert(`插件测试成功！返回了 ${pluginResults.length} 个结果`)
    } else {
      alert('插件测试完成，但没有匹配的结果')
    }
  } catch (error) {
    const appError = handlePluginError('测试插件', error)
    logger.error(`测试插件失败`, appError)
    alert('插件测试失败')
  } finally {
    isLoading.value = false
  }
}

// 监听插件管理器事件
const onPluginRegistered = (plugin: SearchPlugin) => {
  logger.info(`插件 ${plugin.name} 已注册`)
  loadPlugins()
}

const onPluginUnregistered = (pluginId: string) => {
  logger.info(`插件 ${pluginId} 已取消注册`)
  loadPlugins()
}

onMounted(() => {
  loadPlugins()
  
  // 监听插件事件
  pluginManager.on('plugin:registered', onPluginRegistered)
  pluginManager.on('plugin:unregistered', onPluginUnregistered)
})
</script>