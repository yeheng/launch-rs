<template>
    <div class="space-y-4">
        <h2 class="text-lg font-medium">快捷键设置</h2>
        <div class="space-y-4">
            <!-- 呼出搜索栏快捷键 -->
            <div class="flex items-center justify-between">
                <Label>呼出搜索栏</Label>
                <div class="flex items-center space-x-2">
                    <div class="text-sm text-gray-500">Alt + Space</div>
                    <Button variant="outline" size="sm" @click="changeShortcut('toggleSearch')">
                        修改
                    </Button>
                </div>
            </div>

            <!-- 其他快捷键设置 -->
            <div class="space-y-2">
                <div v-for="(shortcut, key) in shortcuts" :key="key" class="flex items-center justify-between">
                    <Label>{{ shortcut.label }}</Label>
                    <div class="flex items-center space-x-2">
                        <div class="text-sm text-gray-500">{{ shortcut.keys.join(' + ') }}</div>
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
                    </DialogDescription>
                </DialogHeader>
                <div class="flex items-center justify-center p-4 text-lg">
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

const {
    shortcuts,
    isDialogOpen,
    recordingKeys,
    changeShortcut,
    saveShortcut,
    closeDialog
} = useShortcuts()
</script>