import { ref, computed, readonly, watch, defineComponent, h } from 'vue'

/**
 * 图标按需导入管理器
 * 
 * 提供图标按需导入功能，减少应用包大小
 * 支持动态导入、图标缓存和懒加载
 */

// 图标类型定义
export type IconName = string


// 图标缓存接口
interface IconCache {
  [key: string]: any
}

// 图标配置接口
interface IconConfig {
  /** 是否启用懒加载 */
  lazyLoad?: boolean
  /** 是否启用缓存 */
  enableCache?: boolean
  /** 预加载的图标名称 */
  preloadIcons?: IconName[]
  /** 图标基础路径 */
  basePath?: string
}

// 默认配置
const DEFAULT_CONFIG: Required<IconConfig> = {
  lazyLoad: true,
  enableCache: true,
  preloadIcons: [],
  basePath: 'lucide-vue-next'
}

/**
 * 图标管理器类
 */
export class IconManager {
  private config: Required<IconConfig>
  private cache: IconCache = {}
  private loadingPromises: Map<string, Promise<any>> = new Map()
  private loadedIcons: Set<string> = new Set()

  constructor(config: IconConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    // 预加载指定图标
    if (this.config.preloadIcons.length > 0) {
      this.preloadIcons(this.config.preloadIcons)
    }
  }

  /**
   * 获取图标组件
   */
  async getIcon(name: IconName): Promise<any> {
    // 检查缓存
    if (this.config.enableCache && this.cache[name]) {
      return this.cache[name]
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!
    }

    // 加载图标
    const loadPromise = this.loadIcon(name)
    this.loadingPromises.set(name, loadPromise)

    try {
      const icon = await loadPromise
      this.loadingPromises.delete(name)
      
      // 缓存图标
      if (this.config.enableCache) {
        this.cache[name] = icon
      }
      
      this.loadedIcons.add(name)
      return icon
    } catch (error) {
      this.loadingPromises.delete(name)
      console.error(`Failed to load icon: ${name}`, error)
      throw error
    }
  }

  /**
   * 加载单个图标
   */
  private async loadIcon(name: IconName): Promise<any> {
    try {
      // 动态导入图标
      const iconModule = await import(
        /* webpackChunkName: "icon-[request]" */
        /* webpackMode: "lazy" */
        `lucide-vue-next/dist/icons/${name}.js`
      )
      
      return iconModule.default || iconModule[name] || iconModule[`${name}Icon`]
    } catch (error) {
      // 如果按文件加载失败，尝试从主库导入
      try {
        const mainModule = await import('lucide-vue-next')
        return (mainModule as any)[name] || (mainModule as any)[`${name}Icon`]
      } catch (fallbackError) {
        console.error(`Failed to load icon ${name} from both sources`, fallbackError)
        throw new Error(`Icon not found: ${name}`)
      }
    }
  }

  /**
   * 预加载多个图标
   */
  async preloadIcons(names: IconName[]): Promise<void> {
    const promises = names.map(name => 
      this.getIcon(name).catch(error => {
        console.warn(`Failed to preload icon: ${name}`, error)
      })
    )
    
    await Promise.allSettled(promises)
  }

  /**
   * 批量获取图标
   */
  async getIcons(names: IconName[]): Promise<Record<IconName, any>> {
    const icons: Record<IconName, any> = {}
    
    const promises = names.map(async (name) => {
      try {
        icons[name] = await this.getIcon(name)
      } catch (error) {
        console.warn(`Failed to load icon: ${name}`, error)
        icons[name] = null
      }
    })
    
    await Promise.allSettled(promises)
    return icons
  }

  /**
   * 检查图标是否已加载
   */
  isIconLoaded(name: IconName): boolean {
    return this.loadedIcons.has(name)
  }

  /**
   * 获取已加载的图标列表
   */
  getLoadedIcons(): IconName[] {
    return Array.from(this.loadedIcons)
  }

  /**
   * 清除图标缓存
   */
  clearCache(): void {
    this.cache = {}
    this.loadedIcons.clear()
    this.loadingPromises.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      cachedIcons: Object.keys(this.cache).length,
      loadedIcons: this.loadedIcons.size,
      loadingIcons: this.loadingPromises.size,
      memoryUsage: this.estimateMemoryUsage()
    }
  }

  /**
   * 估算内存使用
   */
  private estimateMemoryUsage(): number {
    // 简单的内存估算（基于缓存图标数量）
    return Object.keys(this.cache).length * 1024 // 假设每个图标约1KB
  }
}

// 创建全局图标管理器实例
const globalIconManager = new IconManager({
  lazyLoad: true,
  enableCache: true,
  preloadIcons: [
    'Search', 'Settings', 'File', 'Folder', 'Calculator'
  ]
})

/**
 * Vue 3 组合式 API - 使用图标
 */
export function useIcon() {
  const loading = ref(false)
  const error = ref<Error | null>(null)

  const getIcon = async (name: IconName) => {
    loading.value = true
    error.value = null
    
    try {
      const icon = await globalIconManager.getIcon(name)
      return icon
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      loading.value = false
    }
  }

  const getIcons = async (names: IconName[]) => {
    loading.value = true
    error.value = null
    
    try {
      const icons = await globalIconManager.getIcons(names)
      return icons
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      loading.value = false
    }
  }

  const preloadIcons = async (names: IconName[]) => {
    try {
      await globalIconManager.preloadIcons(names)
    } catch (err) {
      error.value = err as Error
      throw err
    }
  }

  const isIconLoaded = (name: IconName) => {
    return globalIconManager.isIconLoaded(name)
  }

  const getLoadedIcons = () => {
    return globalIconManager.getLoadedIcons()
  }

  const clearCache = () => {
    globalIconManager.clearCache()
  }

  const getCacheStats = () => {
    return globalIconManager.getCacheStats()
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    getIcon,
    getIcons,
    preloadIcons,
    isIconLoaded,
    getLoadedIcons,
    clearCache,
    getCacheStats
  }
}

/**
 * 图标组件 - 支持懒加载
 */
export const LazyIcon = defineComponent({
  name: 'LazyIcon',
  
  props: {
    name: {
      type: String,
      required: true
    },
    size: {
      type: [String, Number],
      default: 24
    },
    color: {
      type: String,
      default: 'currentColor'
    },
    className: {
      type: String,
      default: ''
    }
  },

  setup(props) {
    const iconComponent = ref<any>(null)
    const loading = ref(false)
    const error = ref(false)

    const loadIcon = async () => {
      loading.value = true
      error.value = false
      
      try {
        const icon = await globalIconManager.getIcon(props.name)
        iconComponent.value = icon
      } catch (err) {
        console.error(`Failed to load icon: ${props.name}`, err)
        error.value = true
      } finally {
        loading.value = false
      }
    }

    // 监听名称变化，重新加载图标
    watch(() => props.name, loadIcon, { immediate: true })

    // 计算样式
    const iconStyle = computed(() => ({
      width: typeof props.size === 'number' ? `${props.size}px` : props.size,
      height: typeof props.size === 'number' ? `${props.size}px` : props.size,
      color: props.color
    }))

    const iconClass = computed(() => [
      'lazy-icon',
      props.className,
      {
        'lazy-icon--loading': loading.value,
        'lazy-icon--error': error.value
      }
    ])

    return () => {
      if (loading.value) {
        return h('div', {
          class: iconClass.value,
          style: iconStyle.value,
          innerHTML: '<div class="icon-placeholder">...</div>'
        })
      }

      if (error.value) {
        return h('div', {
          class: iconClass.value,
          style: iconStyle.value,
          innerHTML: '<div class="icon-error">?</div>'
        })
      }

      if (iconComponent.value) {
        return h(iconComponent.value, {
          class: iconClass.value,
          style: iconStyle.value
        })
      }

      return h('div', {
        class: iconClass.value,
        style: iconStyle.value
      })
    }
  }
})

// 导出便捷函数
export { globalIconManager as iconManager }

// 导出图标映射（用于向后兼容）
export const ICON_MAP = {
  // 文件相关
  File: 'File',
  FileIcon: 'File',
  Folder: 'Folder',
  FolderIcon: 'Folder',
  
  // 操作相关
  Search: 'Search',
  SearchIcon: 'Search',
  Settings: 'Settings',
  SettingsIcon: 'Settings',
  
  // 计算器相关
  Calculator: 'Calculator',
  CalculatorIcon: 'Calculator',
  
  // 应用相关
  AppWindow: 'AppWindow',
  AppWindowIcon: 'AppWindow',
  
  // 通信相关
  MessageSquare: 'MessageSquare',
  MessageSquareIcon: 'MessageSquare',
  
  // 终端相关
  Terminal: 'Terminal',
  TerminalIcon: 'Terminal',
  
  // 系统相关
  Database: 'Database',
  Home: 'Home',
  HomeIcon: 'Home',
  
  // 操作相关
  Check: 'Check',
  CheckIcon: 'Check',
  X: 'X',
  XIcon: 'X',
  
  // 导航相关
  ChevronDown: 'ChevronDown',
  ChevronUp: 'ChevronUp',
  
  // 状态相关
  AlertTriangle: 'AlertTriangle',
  AlertTriangleIcon: 'AlertTriangle',
  RefreshCw: 'RefreshCw',
  RefreshCwIcon: 'RefreshCw',
  Flag: 'Flag',
  FlagIcon: 'Flag',
  Circle: 'Circle',
  CircleIcon: 'Circle'
}