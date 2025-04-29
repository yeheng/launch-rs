// store/modules/user.ts
// 用户状态管理模块

import { defineStore } from 'pinia';

// 定义快捷键类型
interface Shortcut {
    label: string;
    keys: string[];
}

// 定义状态接口
interface UserState {
    id: string | null;
    username: string | null;
    isLoggedIn: boolean;
    preferences: {
        theme: 'light' | 'dark' | 'system';
        language: string;
        gameMode: boolean;
        shortcuts: {
            [key: string]: Shortcut;
        };
    };
}

// 定义用户状态管理
export const useUserStore = defineStore('user', {
    // 状态
    state: (): UserState => ({
        id: null,
        username: null,
        isLoggedIn: false,
        preferences: {
            theme: 'system',
            language: 'zh-CN',
            gameMode: false,
            shortcuts: {
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
            },
        },
    }),

    // 计算属性
    getters: {
        // 获取用户显示名称
        displayName: (state) => state.username || '游客',

        // 判断用户是否已登录
        loggedIn: (state) => state.isLoggedIn,

        // 获取当前主题
        currentTheme: (state) => state.preferences.theme,
    },

    // 操作方法
    actions: {
        // 设置用户信息
        setUser(userData: { id: string; username: string }) {
            this.id = userData.id;
            this.username = userData.username;
            this.isLoggedIn = true;
        },

        // 退出登录
        logout() {
            this.id = null;
            this.username = null;
            this.isLoggedIn = false;
        },

        // 切换主题
        setTheme(theme: 'light' | 'dark' | 'system') {
            this.preferences.theme = theme;
        },

        // 设置语言
        setLanguage(language: string) {
            this.preferences.language = language;
        },

        // 设置游戏模式
        setGameMode(enabled: boolean) {
            this.preferences.gameMode = enabled;
        },

        // 设置快捷键
        setShortcut(shortcutKey: string, keys: string[]) {
            if (this.preferences.shortcuts[shortcutKey]) {
                this.preferences.shortcuts[shortcutKey].keys = keys;
            }
        },
    },

    // 持久化配置
    persist: true,
});