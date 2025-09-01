import { createPinia } from "pinia";
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { createApp } from "vue";
import App from "./App.vue";
import "./index.css";
import { initializeGlobalShortcuts } from './lib/shortcuts';
import i18n, { initI18nLanguage } from './locales';
import router from "./router";
import { logger } from './lib/logger';
import { handlePluginError } from './lib/error-handler';
import { initializePluginSystem } from './lib/plugins';
import { installGlobalErrorHandler } from './lib/global-error-handler';
import { globalMemoryIntegration } from './lib/utils/memory-integration';

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);
app.use(i18n);

// 初始化语言设置（在pinia加载之后）
initI18nLanguage();

// 初始化内存管理系统（在所有其他初始化之前）
if (import.meta.env.DEV || process.env.MEMORY_MONITOR === 'true') {
  logger.info('正在初始化内存管理系统...');
  globalMemoryIntegration.getHealth(); // 预热
}

// 初始化全局错误处理器（在所有其他初始化之前）
installGlobalErrorHandler(app, {
  enabled: true,
  enableRecovery: true,
  enableReporting: true,
  maxErrorHistory: 100,
  showDetailsInConsole: import.meta.env.DEV,
  autoReportCritical: true
});

// 初始化插件系统（在pinia加载之后）
initializePluginSystem({
  autoRegisterBuiltin: true,
  autoEnableEvents: true,
  loadTimeout: 30000
}).then(result => {
  if (result.success) {
    logger.success(`插件系统初始化完成: ${result.loadedCount} 个插件加载成功`);
  } else {
    logger.warn(`插件系统初始化部分失败: ${result.errorCount} 个插件加载失败`);
    if (result.errors.length > 0) {
      logger.warn('插件加载错误:', result.errors.join(', '));
    }
  }
}).catch(error => {
  const appError = handlePluginError('初始化插件系统', error);
  logger.error('初始化插件系统失败', appError);
});

// 初始化全局快捷键（在pinia加载之后）
initializeGlobalShortcuts().catch(error => {
    const appError = handlePluginError('初始化全局快捷键', error);
  logger.warn('初始化全局快捷键失败:', appError);
});

app.mount("#app");
