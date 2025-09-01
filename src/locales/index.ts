import { useUserStore } from '@/store/modules/user';
import { createI18n } from 'vue-i18n';
import enUS from './en-US/common.json';
import zhCN from './zh-CN/common.json';
import { logger } from '../lib/logger';
import { handlePluginError } from '../lib/error-handler';

// 语言包
export const messages = {
    'en-US': enUS,
    'zh-CN': zhCN,
};

// 创建 i18n 实例
export const i18n = createI18n({
    legacy: false, // 使用 Composition API 模式
    locale: 'zh-CN', // 设置默认语言为中文
    fallbackLocale: 'en-US', // 设置回退语言为英语
    messages,
    globalInjection: true, // 全局注入 $t 函数
});

// 初始化语言设置
export function initI18nLanguage() {
    try {
        const userStore = useUserStore();
        if (userStore.preferences.language) {
            i18n.global.locale.value = userStore.preferences.language as 'zh-CN' | 'en-US';
        }
    } catch (error) {
        const appError = handlePluginError('Failed to load user language preference', error);
  logger.warn('Failed to load user language preference, using default:', appError);
    }
}

// 导出 i18n 实例
export default i18n; 