/**
 * 应用配置文件
 * 集中管理所有可配置的参数
 */

/**
 * 搜索相关配置
 */
export const SEARCH_CONFIG = {
  // 搜索防抖时间（毫秒）
  debounceTime: parseInt(import.meta.env.VITE_SEARCH_DEBOUNCE || '300'),
  
  // 最大搜索结果数量
  maxResults: parseInt(import.meta.env.VITE_SEARCH_MAX_RESULTS || '50'),
  
  // 文件搜索深度限制
  fileSearchDepth: parseInt(import.meta.env.VITE_FILE_SEARCH_DEPTH || '3'),
  
  // 搜索缓存时间（毫秒）
  cacheTime: parseInt(import.meta.env.VITE_SEARCH_CACHE_TIME || '30000'),
  
  // 并行搜索数量
  parallelSearch: parseInt(import.meta.env.VITE_PARALLEL_SEARCH || '5')
}

/**
 * 插件系统配置
 */
export const PLUGIN_CONFIG = {
  // 插件超时时间（毫秒）
  timeout: parseInt(import.meta.env.VITE_PLUGIN_TIMEOUT || '10000'),
  
  // 最大插件数量
  maxPlugins: parseInt(import.meta.env.VITE_MAX_PLUGINS || '100'),
  
  // 是否启用插件沙箱
  enableSandbox: import.meta.env.VITE_ENABLE_SANDBOX !== 'false',
  
  // 插件安装目录
  installDir: import.meta.env.VITE_PLUGIN_INSTALL_DIR || './plugins',
  
  // 是否启用插件热重载
  enableHotReload: import.meta.env.VITE_DEV_HOT_RELOAD === 'true'
}

/**
 * UI配置
 */
export const UI_CONFIG = {
  // 主题模式
  theme: import.meta.env.VITE_UI_THEME || 'system', // 'light' | 'dark' | 'system'
  
  // 语言
  language: import.meta.env.VITE_UI_LANGUAGE || 'zh-CN',
  
  // 动画持续时间（毫秒）
  animationDuration: parseInt(import.meta.env.VITE_UI_ANIMATION_DURATION || '200'),
  
  // 最大显示结果数量
  maxDisplayResults: parseInt(import.meta.env.VITE_UI_MAX_DISPLAY_RESULTS || '10'),
  
  // 是否启用虚拟滚动
  enableVirtualScroll: import.meta.env.VITE_ENABLE_VIRTUAL_SCROLL !== 'false'
}

/**
 * 性能配置
 */
export const PERFORMANCE_CONFIG = {
  // 是否启用性能监控
  enableMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false',
  
  // 性能指标收集间隔（毫秒）
  metricsInterval: parseInt(import.meta.env.VITE_PERFORMANCE_METRICS_INTERVAL || '5000'),
  
  // 内存使用阈值（MB）
  memoryThreshold: parseInt(import.meta.env.VITE_MEMORY_THRESHOLD || '500'),
  
  // 是否启用懒加载
  enableLazyLoading: import.meta.env.VITE_ENABLE_LAZY_LOADING !== 'false'
}

/**
 * 安全配置
 */
export const SECURITY_CONFIG = {
  // 是否启用CSP
  enableCSP: import.meta.env.VITE_ENABLE_CSP !== 'false',
  
  // CSP策略
  cspPolicy: import.meta.env.VITE_CSP_POLICY || "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'",
  
  // 是否启用输入验证
  enableInputValidation: import.meta.env.VITE_ENABLE_INPUT_VALIDATION !== 'false',
  
  // 最大输入长度
  maxInputLength: parseInt(import.meta.env.VITE_MAX_INPUT_LENGTH || '1000'),
  
  // 是否启用剪贴板权限检查
  enableClipboardPermission: import.meta.env.VITE_ENABLE_CLIPBOARD_PERMISSION !== 'false'
}

/**
 * 开发配置
 */
export const DEV_CONFIG = {
  // 是否为开发环境
  isDev: import.meta.env.DEV,
  
  // 是否启用调试模式
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  
  // 是否显示性能面板
  showPerformancePanel: import.meta.env.VITE_SHOW_PERFORMANCE_PANEL === 'true',
  
  // 日志级别
  logLevel: import.meta.env.VITE_LOG_LEVEL || 'info', // 'debug' | 'info' | 'warn' | 'error'
  
  // 是否启用源码映射
  enableSourceMap: import.meta.env.VITE_ENABLE_SOURCE_MAP !== 'false'
}

/**
 * 网络配置
 */
export const NETWORK_CONFIG = {
  // API基础URL
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  
  // 请求超时时间（毫秒）
  requestTimeout: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '10000'),
  
  // 最大重试次数
  maxRetries: parseInt(import.meta.env.VITE_MAX_RETRIES || '3'),
  
  // 重试间隔（毫秒）
  retryInterval: parseInt(import.meta.env.VITE_RETRY_INTERVAL || '1000')
}

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  // 是否启用缓存
  enableCache: import.meta.env.VITE_ENABLE_CACHE !== 'false',
  
  // 缓存大小限制（MB）
  cacheSizeLimit: parseInt(import.meta.env.VITE_CACHE_SIZE_LIMIT || '50'),
  
  // 缓存过期时间（毫秒）
  cacheExpiration: parseInt(import.meta.env.VITE_CACHE_EXPIRATION || '3600000'),
  
  // 是否启用持久化缓存
  enablePersistentCache: import.meta.env.VITE_ENABLE_PERSISTENT_CACHE !== 'false'
}

/**
 * 验证配置函数
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // 验证搜索配置
  if (SEARCH_CONFIG.debounceTime < 0) {
    errors.push('搜索防抖时间不能为负数')
  }
  
  if (SEARCH_CONFIG.maxResults <= 0) {
    errors.push('最大搜索结果数量必须大于0')
  }
  
  if (SEARCH_CONFIG.fileSearchDepth <= 0) {
    errors.push('文件搜索深度必须大于0')
  }
  
  // 验证插件配置
  if (PLUGIN_CONFIG.timeout <= 0) {
    errors.push('插件超时时间必须大于0')
  }
  
  if (PLUGIN_CONFIG.maxPlugins <= 0) {
    errors.push('最大插件数量必须大于0')
  }
  
  // 验证UI配置
  if (!['light', 'dark', 'system'].includes(UI_CONFIG.theme)) {
    errors.push('主题模式必须是 light、dark 或 system')
  }
  
  if (UI_CONFIG.animationDuration < 0) {
    errors.push('动画持续时间不能为负数')
  }
  
  // 验证性能配置
  if (PERFORMANCE_CONFIG.memoryThreshold <= 0) {
    errors.push('内存阈值必须大于0')
  }
  
  if (PERFORMANCE_CONFIG.metricsInterval <= 0) {
    errors.push('性能指标收集间隔必须大于0')
  }
  
  // 验证安全配置
  if (SECURITY_CONFIG.maxInputLength <= 0) {
    errors.push('最大输入长度必须大于0')
  }
  
  // 验证网络配置
  if (NETWORK_CONFIG.requestTimeout <= 0) {
    errors.push('请求超时时间必须大于0')
  }
  
  if (NETWORK_CONFIG.maxRetries < 0) {
    errors.push('最大重试次数不能为负数')
  }
  
  if (NETWORK_CONFIG.retryInterval < 0) {
    errors.push('重试间隔不能为负数')
  }
  
  // 验证缓存配置
  if (CACHE_CONFIG.cacheSizeLimit <= 0) {
    errors.push('缓存大小限制必须大于0')
  }
  
  if (CACHE_CONFIG.cacheExpiration <= 0) {
    errors.push('缓存过期时间必须大于0')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 获取环境信息
 */
export function getEnvironmentInfo(): {
  mode: string
  timestamp: string
  config: any
} {
  return {
    mode: import.meta.env.MODE || 'development',
    timestamp: new Date().toISOString(),
    config: {
      search: SEARCH_CONFIG,
      plugin: PLUGIN_CONFIG,
      ui: UI_CONFIG,
      performance: PERFORMANCE_CONFIG,
      security: SECURITY_CONFIG,
      dev: DEV_CONFIG,
      network: NETWORK_CONFIG,
      cache: CACHE_CONFIG
    }
  }
}

// 导出所有配置的默认值（用于文档生成）
export const DEFAULT_CONFIG = {
  search: SEARCH_CONFIG,
  plugin: PLUGIN_CONFIG,
  ui: UI_CONFIG,
  performance: PERFORMANCE_CONFIG,
  security: SECURITY_CONFIG,
  dev: DEV_CONFIG,
  network: NETWORK_CONFIG,
  cache: CACHE_CONFIG
}