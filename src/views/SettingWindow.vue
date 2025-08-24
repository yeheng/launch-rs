<template>
    <div class="flex flex-col h-screen bg-white">
        <!-- 顶部栏 -->
        <header class="flex items-center justify-between px-4 py-3 border-b">
            <div class="flex items-center">
                <SettingsIcon class="w-5 h-5 text-gray-400 mr-2" />
                <h1 class="text-2xl text-gray-500 font-normal">{{ t('nav.settings') }}</h1>
            </div>
            
            <!-- 操作按钮组 -->
            <div class="flex items-center space-x-3">
                <Button 
                    variant="outline" 
                    size="sm"
                    @click="handleCancel"
                    class="text-gray-600 hover:text-gray-700"
                >
                    <XIcon class="w-4 h-4 mr-1" />
                    取消
                </Button>
                <Button 
                    size="sm"
                    @click="handleSave"
                    :disabled="!hasChanges"
                    class="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <CheckIcon class="w-4 h-4 mr-1" />
                    保存设置
                </Button>
            </div>
        </header>

        <!-- 主要内容 -->
        <div class="flex-1 overflow-auto p-6">
            <div class="max-w-2xl mx-auto space-y-8">
                <!-- 主题设置 -->
                <div class="space-y-4">
                    <h2 class="text-lg font-medium">{{ t('settings.theme.title') }}</h2>
                    <div class="flex items-center space-x-4">
                        <Select v-model="tempTheme">
                            <SelectTrigger class="w-48">
                                <SelectValue :placeholder="t('settings.theme.title')" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">{{ t('settings.theme.light') }}</SelectItem>
                                <SelectItem value="dark">{{ t('settings.theme.dark') }}</SelectItem>
                                <SelectItem value="system">{{ t('settings.theme.system') }}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <!-- 语言设置 -->
                <div class="space-y-4">
                    <h2 class="text-lg font-medium">{{ t('settings.language.title') }}</h2>
                    <div class="flex flex-col space-y-2">
                        <RadioGroup v-model="tempLanguage">
                            <div class="space-y-2">
                                <div class="flex items-center space-x-2">
                                    <RadioGroupItem value="zh-CN" id="zh-CN" />
                                    <Label for="zh-CN">{{ t('settings.language.zh-CN') }}</Label>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <RadioGroupItem value="en-US" id="en-US" />
                                    <Label for="en-US">{{ t('settings.language.en-US') }}</Label>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                <!-- 快捷键设置 -->
                <ShortcutSetting />
                
                <!-- 插件设置 -->
                <PluginSettings />
            </div>
        </div>

        <!-- 底部栏 -->
        <footer class="flex justify-between items-center px-4 py-2 border-t text-gray-500 text-sm">
            <div>{{ t('app.name') }} {{ t('app.version') }}</div>
            <div class="text-sm text-gray-500">
                {{ t('settings.autoSave') }}
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUserStore } from '@/store/modules/user'
import { CheckIcon, SettingsIcon, XIcon } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PluginSettings from './PluginSettings.vue'
import ShortcutSetting from './ShortcutSetting.vue'

const userStore = useUserStore()
const { t } = useI18n()
const router = useRouter()

// 临时状态，用于暂存用户的修改
const tempTheme = ref<'light' | 'dark' | 'system'>('light')
const tempLanguage = ref<string>('zh-CN')

// 初始化临时状态
onMounted(() => {
    tempTheme.value = userStore.preferences.theme
    tempLanguage.value = userStore.preferences.language
})

// 检测是否有变更
const hasChanges = computed(() => {
    return tempTheme.value !== userStore.preferences.theme ||
           tempLanguage.value !== userStore.preferences.language
})

// 保存设置
const handleSave = () => {
    userStore.setTheme(tempTheme.value)
    userStore.setLanguage(tempLanguage.value)
    
    // 跳转回搜索界面
    router.push('/')
}

// 取消修改
const handleCancel = () => {
    // 重置临时状态为原始值
    tempTheme.value = userStore.preferences.theme
    tempLanguage.value = userStore.preferences.language
    
    // 跳转回搜索界面
    router.push('/')
}

// 主题设置（保留兼容性，但实际不再使用）
// const currentTheme = computed({
//     get: () => userStore.preferences.theme,
//     set: (value: 'light' | 'dark' | 'system') => {
//         userStore.setTheme(value)
//     }
// })

// 语言设置（保留兼容性，但实际不再使用）
// const currentLanguage = computed({
//     get: () => userStore.preferences.language,
//     set: (value: string) => {
//         userStore.setLanguage(value)
//     }
// })
</script>