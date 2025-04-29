// store/modules/user.ts
// 用户状态管理模块

import { defaultShortcuts, type Shortcuts } from '@/lib/shortcuts';
import { defineStore } from 'pinia';
import { PersistenceOptions } from 'pinia-plugin-persistedstate';

// 定义状态接口
interface UserState {
    id: string | null;
    username: string | null;
    isLoggedIn: boolean;
    preferences: {
        theme: 'light' | 'dark' | 'system';
        language: string;
        shortcuts: Shortcuts;
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
            shortcuts: defaultShortcuts,
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

        // 获取快捷键配置
        currentShortcuts: (state) => state.preferences.shortcuts,
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

        // 设置快捷键
        setShortcut(shortcutKey: keyof Shortcuts, keys: string[]) {
            if (this.preferences.shortcuts[shortcutKey]) {
                this.preferences.shortcuts[shortcutKey].keys = keys;
            }
        },

        // 重置快捷键为默认值
        resetShortcuts() {
            this.preferences.shortcuts = { ...defaultShortcuts };
        },

        // 批量更新快捷键
        updateShortcuts(shortcuts: Partial<Shortcuts>) {
            this.preferences.shortcuts = {
                ...this.preferences.shortcuts,
                ...shortcuts,
            };
        },
    },

    // 持久化配置
    persist: {
        key: 'user-store',
        storage: localStorage,
        paths: ['preferences'],
    } as PersistenceOptions,
});