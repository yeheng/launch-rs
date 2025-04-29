// store/modules/user.ts
// 用户状态管理模块

import { defineStore } from 'pinia';

// 定义状态接口
interface UserState {
  id: string | null;
  username: string | null;
  isLoggedIn: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
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
  },

  // 持久化配置
  persist: true,
});