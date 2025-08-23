<template>
    <div class="space-y-4">
        <h2 class="text-lg font-medium">快捷键设置</h2>
        <div class="space-y-4">
            <!-- 全局快捷键区域 -->
            <div class="space-y-2">
                <h3 class="text-md font-medium text-blue-600">全局快捷键</h3>
                <p class="text-sm text-gray-500">这些快捷键在应用隐藏时也能使用</p>
                <div v-for="(shortcut, key) in globalShortcuts" :key="key" class="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                    <div class="flex items-center space-x-2">
                        <Label class="font-medium">{{ shortcut.label }}</Label>
                        <span class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">全局</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <div class="text-sm text-gray-600 font-mono">{{ shortcut.keys.join(' + ') }}</div>
                        <Button variant="outline" size="sm" @click="changeShortcut(key)">
                            修改
                        </Button>
                    </div>
                </div>
            </div>

            <!-- 应用内快捷键区域 -->
            <div class="space-y-2">
                <h3 class="text-md font-medium text-gray-700">应用内快捷键</h3>
                <p class="text-sm text-gray-500">这些快捷键仅在应用窗口激活时有效</p>
                <div v-for="(shortcut, key) in localShortcuts" :key="key" class="flex items-center justify-between p-3 border rounded-lg">
                    <Label>{{ shortcut.label }}</Label>
                    <div class="flex items-center space-x-2">
                        <div class="text-sm text-gray-500 font-mono">{{ shortcut.keys.join(' + ') }}</div>
                        <Button variant="outline" size="sm" @click="changeShortcut(key)">
                            修改
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 快捷键修改对话框 -->
        <Dialog :open="isDialogOpen" @close="closeDialog">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>修改快捷键</DialogTitle>
                    <DialogDescription>
                        请按下新的快捷键组合
                        <span v-if="currentShortcutIsGlobal" class="text-blue-600">（全局快捷键）</span>
                    </DialogDescription>
                </DialogHeader>
                <div class="flex items-center justify-center p-4 text-lg font-mono">
                    {{ recordingKeys.join(' + ') || '等待按键...' }}
                </div>
                <DialogFooter>
                    <Button variant="outline" @click="closeDialog">取消</Button>
                    <Button @click="saveShortcut" :disabled="!recordingKeys.length">保存</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useShortcuts } from '@/lib/shortcuts'
import { computed } from 'vue'

const {
    shortcuts,
    isDialogOpen,
    recordingKeys,
    currentEditingShortcut,
    changeShortcut,
    saveShortcut,
    closeDialog
} = useShortcuts()

// 分离全局和本地快捷键
const globalShortcuts = computed(() => {
    const result: Record<string, any> = {}
    for (const [key, config] of Object.entries(shortcuts.value)) {
        if (config.global) {
            result[key] = config
        }
    }
    return result
})

const localShortcuts = computed(() => {
    const result: Record<string, any> = {}
    for (const [key, config] of Object.entries(shortcuts.value)) {
        if (!config.global) {
            result[key] = config
        }
    }
    return result
})

// 判断当前编辑的快捷键是否为全局快捷键
const currentShortcutIsGlobal = computed(() => {
    if (!currentEditingShortcut.value) return false
    return shortcuts.value[currentEditingShortcut.value]?.global || false
})
</script>