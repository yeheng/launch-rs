<template>
    <div class="flex flex-col h-screen bg-white">
        <!-- 顶部栏 -->
        <header class="flex items-center px-4 py-3 border-b">
            <SettingsIcon class="w-5 h-5 text-gray-400 mr-2" />
            <h1 class="text-2xl text-gray-500 font-normal">设置</h1>
        </header>

        <!-- 主要内容 -->
        <div class="flex-1 overflow-auto p-6">
            <div class="max-w-2xl mx-auto space-y-8">
                <!-- 主题设置 -->
                <div class="space-y-4">
                    <h2 class="text-lg font-medium">主题设置</h2>
                    <div class="flex items-center space-x-4">
                        <Select v-model="currentTheme">
                            <option value="light">浅色主题</option>
                            <option value="dark">深色主题</option>
                            <option value="system">跟随系统</option>
                        </Select>
                    </div>
                </div>

                <!-- 语言设置 -->
                <div class="space-y-4">
                    <h2 class="text-lg font-medium">语言设置</h2>
                    <div class="flex flex-col space-y-2">
                        <RadioGroup v-model="currentLanguage">
                            <div class="space-y-2">
                                <div class="flex items-center space-x-2">
                                    <RadioGroupItem value="zh-CN" id="zh-CN" />
                                    <Label for="zh-CN">简体中文</Label>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <RadioGroupItem value="en-US" id="en-US" />
                                    <Label for="en-US">English</Label>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
            </div>
        </div>

        <!-- 底部栏 -->
        <footer class="flex justify-between items-center px-4 py-2 border-t text-gray-500 text-sm">
            <div>ZeroLaunch-rs v0.4.1</div>
            <div class="text-sm text-gray-500">
                设置将自动保存
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select } from '@/components/ui/select'
import { useUserStore } from '@/store/modules/user'
import { SettingsIcon } from 'lucide-vue-next'
import { computed } from 'vue'

const userStore = useUserStore()

// 主题设置
const currentTheme = computed({
    get: () => userStore.preferences.theme,
    set: (value: 'light' | 'dark' | 'system') => {
        userStore.setTheme(value)
    }
})

// 语言设置
const currentLanguage = computed({
    get: () => userStore.preferences.language,
    set: (value: string) => {
        userStore.setLanguage(value)
    }
})
</script>