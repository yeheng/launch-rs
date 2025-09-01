import { useIcon, ICON_MAP } from '@/lib/utils/icon-manager'
import { useRouter } from 'vue-router'
import type { SearchContext, SearchPlugin, SearchResultItem } from '../../search-plugins'
import { logger } from '../../logger'
import { handlePluginError } from '../../error-handler'

/**
 * 应用搜索插件
 */
export class AppsSearchPlugin implements SearchPlugin {
  id = 'apps'
  name = '应用搜索'
  description = '搜索系统应用和内置功能'
  icon: any = null // 将在初始化时动态加载
  version = '1.0.0'
  enabled = true
  priority = 100
  searchPrefixes = ['app:', 'apps:']

  private router: any
  private iconCache: Map<string, any> = new Map()
  private appData: Array<{
    title: string
    description: string
    iconName: string // 改为存储图标名称
    icon: any // 实际图标对象
    keywords: string[]
    action: () => void
  }> = []

  constructor() {
    this.initializeAppData()
  }

  async initialize(): Promise<void> {
    const { getIcon } = useIcon()
    
    // 获取路由实例
    const router = useRouter()
    this.router = router
    
    // 动态加载所有图标
    try {
      const iconNames = this.appData.map(app => app.iconName)
      const icons = await Promise.all(
        iconNames.map(async (iconName) => {
          try {
            const icon = await getIcon(iconName)
            return { iconName, icon }
          } catch (error) {
            logger.warn(`图标加载失败: ${iconName}`, error)
            return { iconName, icon: null }
          }
        })
      )
      
      // 更新应用数据中的图标
      icons.forEach(({ iconName, icon }) => {
        this.iconCache.set(iconName, icon)
        const app = this.appData.find(a => a.iconName === iconName)
        if (app) {
          app.icon = icon
        }
      })
      
      // 设置默认图标
      this.icon = this.iconCache.get(ICON_MAP.Settings) || null
      
      // 更新应用数据中的路由依赖动作
      this.appData = [
        {
          title: '设置',
          description: '打开应用设置',
          iconName: ICON_MAP.Settings,
          icon: this.iconCache.get(ICON_MAP.Settings),
          keywords: ['设置', 'settings', 'config', '配置', 'preferences'],
          action: () => this.router?.push('/setting_window')
        },
        {
          title: '终端',
          description: '打开系统终端',
          iconName: ICON_MAP.Terminal,
          icon: this.iconCache.get(ICON_MAP.Terminal),
          keywords: ['终端', 'terminal', 'cmd', '命令行', 'shell', 'bash'],
          action: () => this.openTerminal()
        },
        {
          title: '快速助手',
          description: '打开快速助手',
          iconName: ICON_MAP.MessageSquare,
          icon: this.iconCache.get(ICON_MAP.MessageSquare),
          keywords: ['助手', 'assistant', 'help', '帮助', 'ai'],
          action: () => this.openAssistant()
        },
        {
          title: '注册全局快捷键',
          description: '注册 Alt+Space 全局快捷键',
          iconName: ICON_MAP.Folder,
          icon: this.iconCache.get(ICON_MAP.Folder),
          keywords: ['快捷键', 'shortcut', 'hotkey', '全局', 'global'],
          action: () => this.testGlobalShortcut()
        },
        {
          title: '隐藏窗口',
          description: '切换到无头模式',
          iconName: ICON_MAP.File,
          icon: this.iconCache.get(ICON_MAP.File),
          keywords: ['隐藏', 'hide', '无头', 'headless', 'minimize'],
          action: () => this.testHeadlessMode()
        }
      ]
      
      logger.info('应用搜索插件初始化完成')
    } catch (error) {
      const appError = handlePluginError('应用搜索插件初始化', error)
      logger.error('应用搜索插件初始化失败', appError)
      // 图标加载失败不应阻止插件工作
    }
  }

  private initializeAppData(): void {
    this.appData = [
      {
        title: '设置',
        description: '打开应用设置',
        iconName: ICON_MAP.Settings,
        icon: null, // 将在初始化时加载
        keywords: ['设置', 'settings', 'config', '配置', 'preferences'],
        action: () => logger.warn('路由未初始化')
      },
      {
        title: '终端',
        description: '打开系统终端',
        iconName: ICON_MAP.Terminal,
        icon: null, // 将在初始化时加载
        keywords: ['终端', 'terminal', 'cmd', '命令行', 'shell', 'bash'],
        action: () => this.openTerminal()
      },
      {
        title: '快速助手',
        description: '打开快速助手',
        iconName: ICON_MAP.MessageSquare,
        icon: null, // 将在初始化时加载
        keywords: ['助手', 'assistant', 'help', '帮助', 'ai'],
        action: () => this.openAssistant()
      },
      {
        title: '注册全局快捷键',
        description: '注册 Alt+Space 全局快捷键',
        iconName: ICON_MAP.Folder,
        icon: null, // 将在初始化时加载
        keywords: ['快捷键', 'shortcut', 'hotkey', '全局', 'global'],
        action: () => this.testGlobalShortcut()
      },
      {
        title: '隐藏窗口',
        description: '切换到无头模式',
        iconName: ICON_MAP.File,
        icon: null, // 将在初始化时加载
        keywords: ['隐藏', 'hide', '无头', 'headless', 'minimize'],
        action: () => this.testHeadlessMode()
      }
    ]
  }

  async search(context: SearchContext): Promise<SearchResultItem[]> {
    const { queryLower, keywords } = context
    const results: SearchResultItem[] = []

    for (const app of this.appData) {
      let score = 0
      
      // 标题匹配
      if (app.title.toLowerCase().includes(queryLower)) {
        score += app.title.toLowerCase() === queryLower ? 100 : 80
      }
      
      // 描述匹配
      if (app.description.toLowerCase().includes(queryLower)) {
        score += 60
      }
      
      // 关键词匹配
      for (const keyword of app.keywords) {
        if (keyword.toLowerCase().includes(queryLower)) {
          score += keyword.toLowerCase() === queryLower ? 90 : 70
        }
      }
      
      // 多词匹配
      for (const word of keywords) {
        if (app.keywords.some(k => k.toLowerCase().includes(word))) {
          score += 40
        }
      }

      if (score > 0) {
        results.push({
          id: `app-${app.title.toLowerCase().replace(/\s+/g, '-')}`,
          title: app.title,
          description: app.description,
          icon: app.icon,
          priority: this.priority + score,
          action: app.action,
          source: this.id,
          metadata: {
            type: 'application',
            keywords: app.keywords
          }
        })
      }
    }

    return results.sort((a, b) => b.priority - a.priority)
  }

  private async openTerminal(): Promise<void> {
    try {
    //   const { invoke } = await import('@tauri-apps/api/core')
      // 这里可以调用系统命令打开终端
      logger.warn('打开终端功能待实现')
    } catch (error) {
      const appError = handlePluginError('打开终端', error)
      logger.error('打开终端失败', appError)
    }
  }

  private openAssistant(): void {
    logger.info('打开快速助手功能待实现')
  }

  private async testGlobalShortcut(): Promise<void> {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('register_global_shortcut', {
        shortcutId: 'toggle_window',
        accelerator: 'Alt+Space'
      })
      logger.success('全局快捷键 Alt+Space 注册成功！')
    } catch (error) {
      const appError = handlePluginError('注册全局快捷键', error)
      logger.error('注册全局快捷键失败', appError)
    }
  }

  private async testHeadlessMode(): Promise<void> {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('toggle_headless', { headless: true })
      logger.success('已切换到无头模式')
    } catch (error) {
      const appError = handlePluginError('切换无头模式', error)
      logger.error('切换无头模式失败', appError)
    }
  }
}