import { useUserStore } from '@/store/modules/user'
import { ref } from 'vue'

// 快捷键类型定义
export type ShortcutKey = 'toggleSearch' | 'navigateUp' | 'navigateDown' | 'launch' | 'adminLaunch' | 'clearSearch'

export interface ShortcutConfig {
    label: string
    keys: string[]
}

export type Shortcuts = Record<ShortcutKey, ShortcutConfig>

export function useShortcuts() {
    const userStore = useUserStore()
    const shortcuts = ref(defaultShortcuts)
    const isDialogOpen = ref(false)
    const currentEditingShortcut = ref<ShortcutKey | ''>('')
    const recordingKeys = ref<string[]>([])

    // 开始修改快捷键
    const changeShortcut = (shortcutKey: string) => {
        currentEditingShortcut.value = shortcutKey as ShortcutKey
        recordingKeys.value = []
        isDialogOpen.value = true
        startRecording()
    }

    // 开始记录按键
    const startRecording = () => {
        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault()
            const key = e.key === ' ' ? 'Space' : e.key
            if (!recordingKeys.value.includes(key)) {
                recordingKeys.value.push(key)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', () => {
            window.removeEventListener('keydown', handleKeyDown)
        }, { once: true })
    }

    // 保存快捷键
    const saveShortcut = () => {
        if (currentEditingShortcut.value && recordingKeys.value.length) {
            shortcuts.value[currentEditingShortcut.value].keys = recordingKeys.value
            userStore.setShortcut(currentEditingShortcut.value, recordingKeys.value)
        }
        closeDialog()
    }

    // 关闭对话框
    const closeDialog = () => {
        isDialogOpen.value = false
        currentEditingShortcut.value = ''
        recordingKeys.value = []
    }

    return {
        shortcuts,
        isDialogOpen,
        currentEditingShortcut,
        recordingKeys,
        changeShortcut,
        saveShortcut,
        closeDialog
    }
}

// 默认快捷键配置
export const defaultShortcuts: Shortcuts = {
    toggleSearch: {
        label: '呼出搜索栏',
        keys: ['Alt', 'Space'],
    },
    navigateUp: {
        label: '向上选择',
        keys: ['↑'],
    },
    navigateDown: {
        label: '向下选择',
        keys: ['↓'],
    },
    launch: {
        label: '启动选中项',
        keys: ['Enter'],
    },
    adminLaunch: {
        label: '以管理员身份启动',
        keys: ['Ctrl', 'Enter'],
    },
    clearSearch: {
        label: '清空搜索',
        keys: ['Esc'],
    },
} 