import { useUserStore } from '@/store/modules/user'
import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'
import { logger } from './logger'
import { handlePluginError } from './error-handler'

// 快捷键类型定义
export type ShortcutKey = 'toggleSearch' | 'navigateUp' | 'navigateDown' | 'launch' | 'adminLaunch' | 'clearSearch'

export interface ShortcutConfig {
    label: string
    keys: string[]
    global?: boolean // 是否为全局快捷键
}

export type Shortcuts = Record<ShortcutKey, ShortcutConfig>

// 将按键数组转换为Tauri快捷键格式
function keysToAccelerator(keys: string[]): string {
    return keys.map(key => {
        // 转换特殊按键名称
        switch (key) {
            case 'Alt': return 'Alt'
            case 'Ctrl': return 'Ctrl'
            case 'Shift': return 'Shift'
            case 'Meta': return 'Cmd' // macOS Command key
            case 'Space': return 'Space'
            case 'Enter': return 'Enter'
            case 'Esc': return 'Escape'
            case '↑': return 'ArrowUp'
            case '↓': return 'ArrowDown'
            case '←': return 'ArrowLeft'
            case '→': return 'ArrowRight'
            default: return key
        }
    }).join('+')
}

// 注册全局快捷键
export async function registerGlobalShortcut(shortcutId: string, keys: string[]): Promise<boolean> {
    try {
        const accelerator = keysToAccelerator(keys)
        await invoke('register_global_shortcut', {
            shortcutId,
            accelerator
        })
        logger.info(`全局快捷键 ${shortcutId} (${accelerator}) 注册成功`)
        return true
    } catch (error) {
        const appError = handlePluginError(`注册全局快捷键 ${shortcutId}`, error)
        logger.error(`注册全局快捷键失败`, appError)
        return false
    }
}

// 注销全局快捷键
export async function unregisterGlobalShortcut(shortcutId: string): Promise<boolean> {
    try {
        await invoke('unregister_global_shortcut', { shortcutId })
        logger.info(`全局快捷键 ${shortcutId} 注销成功`)
        return true
    } catch (error) {
        const appError = handlePluginError(`注销全局快捷键 ${shortcutId}`, error)
        logger.error(`注销全局快捷键失败`, appError)
        return false
    }
}

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
    const saveShortcut = async () => {
        if (currentEditingShortcut.value && recordingKeys.value.length) {
            const shortcutKey = currentEditingShortcut.value
            const keys = recordingKeys.value
            
            // 更新本地配置
            shortcuts.value[shortcutKey].keys = keys
            userStore.setShortcut(shortcutKey, keys)
            
            // 如果是全局快捷键，则重新注册
            const shortcutConfig = shortcuts.value[shortcutKey]
            if (shortcutConfig.global) {
                // 先注销旧的快捷键
                await unregisterGlobalShortcut(shortcutKey)
                // 再注册新的快捷键
                await registerGlobalShortcut(shortcutKey, keys)
            }
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

// 初始化全局快捷键
export async function initializeGlobalShortcuts() {
    const userStore = useUserStore()
    const userShortcuts = userStore.preferences.shortcuts
    
    for (const [shortcutId, config] of Object.entries(userShortcuts)) {
        const shortcutConfig = config as ShortcutConfig
        if (shortcutConfig.global && shortcutConfig.keys.length > 0) {
            await registerGlobalShortcut(shortcutId, shortcutConfig.keys)
        }
    }
}

// 默认快捷键配置
export const defaultShortcuts: Shortcuts = {
    toggleSearch: {
        label: '呼出搜索栏',
        keys: ['Alt', 'Space'],
        global: true, // 设置为全局快捷键
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