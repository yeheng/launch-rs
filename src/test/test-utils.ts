import { vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { EnhancedSearchPlugin } from '@/lib/plugins'
import { PluginCategory, PluginPermissionType } from '@/lib/plugins/types/basic'

/**
 * 测试工具函数集合
 */
export class TestUtils {
  /**
   * 创建测试用的 Pinia 实例
   */
  static setupPinia() {
    const pinia = createPinia()
    setActivePinia(pinia)
    return pinia
  }

  /**
   * 创建模拟插件
   */
  static createMockPlugin(overrides?: Partial<EnhancedSearchPlugin>): EnhancedSearchPlugin {
    return {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'A test plugin for unit testing',
      icon: { template: '<div class="test-icon">Icon</div>' },
      version: '1.0.0',
      enabled: true,
      priority: 1,
      search: vi.fn().mockResolvedValue([]),
      settings: {
        schema: [
          {
            key: 'setting1',
            type: 'string',
            label: 'Setting 1',
            defaultValue: 'default',
            required: false
          }
        ]
      },
      metadata: {
        author: 'Test Author',
        license: 'Unknown',
        homepage: undefined,
        repository: undefined,
        keywords: ['test', 'utility'],
        installDate: new Date('2024-01-01'),
        lastUpdated: new Date('2024-01-15'),
        fileSize: 1024,
        dependencies: [],
        category: PluginCategory.UTILITIES,
        screenshots: undefined,
        rating: 4.5,
        downloadCount: 100,
        minAppVersion: undefined
      },
      installation: {
        isInstalled: true,
        isBuiltIn: false,
        installPath: '/plugins/test-plugin',
        canUninstall: true
      },
      permissions: [
        {
          type: PluginPermissionType.FILESYSTEM,
          description: 'Access to file system',
          required: true
        }
      ],
      ...overrides
    }
  }

  /**
   * 创建多个模拟插件
   */
  static createMockPlugins(count: number): EnhancedSearchPlugin[] {
    return Array.from({ length: count }, (_, index) => 
      this.createMockPlugin({
        id: `test-plugin-${index}`,
        name: `Test Plugin ${index}`,
        priority: index
      })
    )
  }

  /**
   * 清理测试环境
   */
  static cleanupTestEnvironment() {
    // 清理事件监听器
    if (typeof window !== 'undefined') {
      const events = ['plugin-state-change', 'plugin-error', 'plugin-lifecycle']
      events.forEach(eventType => {
        // 模拟清理现有监听器
        window.removeEventListener(eventType, () => {})
      })
    }
    
    // 清理localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
    
    // 清理模拟函数
    vi.clearAllMocks()
  }

  /**
   * 等待DOM更新
   */
  static async waitForNextTick() {
    return new Promise(resolve => setTimeout(resolve, 0))
  }

  /**
   * 模拟异步延迟
   */
  static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 模拟事件
   */
  static mockEvent<T>(type: string, detail?: T): CustomEvent<T> {
    return new CustomEvent(type, { detail })
  }
}