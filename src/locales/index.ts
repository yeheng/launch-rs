import { useUserStore } from '@/store/modules/user';
import { createI18n } from 'vue-i18n';
import enUS from './en-US/common.json';
import zhCN from './zh-CN/common.json';

// 语言包
export const messages = {
    'en-US': enUS,
    'zh-CN': zhCN,
};

// 创建 i18n 实例
export const i18n = createI18n({
    legacy: false, // 使用 Composition API 模式
    locale: useUserStore().preferences.language, // 从用户偏好设置中获取默认语言
    fallbackLocale: 'en-US', // 设置回退语言为英语
    messages,
    globalInjection: true, // 全局注入 $t 函数
});

// 导出 i18n 实例
export default i18n; 