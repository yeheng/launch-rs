// 快捷键类型定义
export type ShortcutKey = 'toggleSearch' | 'navigateUp' | 'navigateDown' | 'launch' | 'adminLaunch' | 'clearSearch'

export interface ShortcutConfig {
    label: string
    keys: string[]
}

export type Shortcuts = Record<ShortcutKey, ShortcutConfig>

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