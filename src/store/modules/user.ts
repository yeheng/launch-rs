// store/modules/user.ts
// 用户状态管理模块

import { defaultShortcuts, type Shortcuts } from '@/lib/shortcuts';
import { defineStore } from 'pinia';
import { useUnifiedStateStore } from '@/lib/state/unified-state-manager';

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
    // 状态 - 使用统一状态管理器作为底层
    state: (): UserState => {
        try {
            const unifiedStore = useUnifiedStateStore();
            return {
                id: unifiedStore.user.id,
                username: unifiedStore.user.username,
                isLoggedIn: unifiedStore.user.isLoggedIn,
                preferences: {
                    theme: unifiedStore.user.preferences.theme,
                    language: unifiedStore.user.preferences.language,
                    shortcuts: unifiedStore.user.preferences.shortcuts || defaultShortcuts,
                },
            };
        } catch (error) {
            // 如果统一状态管理器不可用，使用默认值
            return {
                id: null,
                username: null,
                isLoggedIn: false,
                preferences: {
                    theme: 'system',
                    language: 'zh-CN',
                    shortcuts: defaultShortcuts,
                },
            };
        }
    },

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
            try {
                const unifiedStore = useUnifiedStateStore();
                unifiedStore.setUser(userData);
                this.id = userData.id;
                this.username = userData.username;
                this.isLoggedIn = true;
            } catch (error) {
                // 回退到本地状态
                this.id = userData.id;
                this.username = userData.username;
                this.isLoggedIn = true;
            }
        },

        // 退出登录
        logout() {
            try {
                const unifiedStore = useUnifiedStateStore();
                unifiedStore.logout();
            } catch (error) {
                // 统一状态管理器不可用时的回退
            }
            this.id = null;
            this.username = null;
            this.isLoggedIn = false;
        },

        // 切换主题
        setTheme(theme: 'light' | 'dark' | 'system') {
            try {
                const unifiedStore = useUnifiedStateStore();
                unifiedStore.setTheme(theme);
            } catch (error) {
                // 统一状态管理器不可用时的回退
                this.preferences.theme = theme;
            }
        },

        // 设置语言
        setLanguage(language: string) {
            try {
                const unifiedStore = useUnifiedStateStore();
                unifiedStore.setLanguage(language);
            } catch (error) {
                // 统一状态管理器不可用时的回退
                this.preferences.language = language;
            }
        },

        // 设置快捷键
        setShortcut(shortcutKey: keyof Shortcuts, keys: string[]) {
            try {
                const unifiedStore = useUnifiedStateStore();
                unifiedStore.updateNestedState(`user.preferences.shortcuts.${shortcutKey}.keys`, keys);
                this.preferences.shortcuts[shortcutKey].keys = keys;
            } catch (error) {
                // 统一状态管理器不可用时的回退
                if (this.preferences.shortcuts[shortcutKey]) {
                    this.preferences.shortcuts[shortcutKey].keys = keys;
                }
            }
        },

        // 重置快捷键为默认值
        resetShortcuts() {
            try {
                const unifiedStore = useUnifiedStateStore();
                unifiedStore.updateNestedState('user.preferences.shortcuts', { ...defaultShortcuts });
                this.preferences.shortcuts = { ...defaultShortcuts };
            } catch (error) {
                // 统一状态管理器不可用时的回退
                this.preferences.shortcuts = { ...defaultShortcuts };
            }
        },

        // 批量更新快捷键
        updateShortcuts(shortcuts: Partial<Shortcuts>) {
            try {
                const unifiedStore = useUnifiedStateStore();
                const updatedShortcuts = {
                    ...this.preferences.shortcuts,
                    ...shortcuts,
                };
                unifiedStore.updateNestedState('user.preferences.shortcuts', updatedShortcuts);
                this.preferences.shortcuts = updatedShortcuts;
            } catch (error) {
                // 统一状态管理器不可用时的回退
                this.preferences.shortcuts = {
                    ...this.preferences.shortcuts,
                    ...shortcuts,
                };
            }
        },
    },
});