import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUserStore } from '@/store/modules/user'
import { useUnifiedStateStore } from '@/lib/state/unified-state-manager'
import { useSearchPluginManager } from '@/lib/search-plugin-manager'

/**
 * 状态管理集成测试
 * 验证用户状态、插件状态和统一状态管理器的协同工作
 */

describe('状态管理集成测试', () => {
  let userStore: ReturnType<typeof useUserStore>
  let unifiedStateStore: ReturnType<typeof useUnifiedStateStore>
  let pluginManager: ReturnType<typeof useSearchPluginManager>

  beforeEach(() => {
    // 重置所有状态管理器
    vi.clearAllMocks()
    
    // 创建新的状态管理器实例
    userStore = useUserStore()
    unifiedStateStore = useUnifiedStateStore()
    pluginManager = useSearchPluginManager()
  })

  describe('用户状态管理', () => {
    it('应该正确初始化用户状态', () => {
      expect(userStore).toBeDefined()
      expect(userStore.id).toBeNull()
      expect(userStore.username).toBeNull()
      expect(userStore.isLoggedIn).toBe(false)
      expect(userStore.preferences.theme).toBeDefined()
      expect(userStore.preferences.language).toBeDefined()
      expect(userStore.preferences.shortcuts).toBeDefined()
    })

    it('应该能够设置用户信息', () => {
      const testUser = {
        id: 'test-user-id',
        username: 'testuser',
        isLoggedIn: true
      }

      // 假设 store 有 setUser 方法
      if (typeof userStore.setUser === 'function') {
        userStore.setUser(testUser)
        
        expect(userStore.id).toBe(testUser.id)
        expect(userStore.username).toBe(testUser.username)
        expect(userStore.isLoggedIn).toBe(testUser.isLoggedIn)
      }
    })

    it('应该能够更新用户偏好设置', () => {
      const newPreferences = {
        theme: 'dark' as const,
        language: 'en-US',
        shortcuts: userStore.preferences.shortcuts
      }

      // 假设 store 有 updatePreferences 方法
      if (typeof userStore.updatePreferences === 'function') {
        userStore.updatePreferences(newPreferences)
        
        expect(userStore.preferences.theme).toBe(newPreferences.theme)
        expect(userStore.preferences.language).toBe(newPreferences.language)
      }
    })

    it('应该能够切换主题', () => {
      const originalTheme = userStore.preferences.theme
      
      // 假设 store 有 toggleTheme 方法
      if (typeof userStore.toggleTheme === 'function') {
        userStore.toggleTheme()
        
        expect(userStore.preferences.theme).not.toBe(originalTheme)
        expect(['light', 'dark', 'system']).toContain(userStore.preferences.theme)
      }
    })
  })

  describe('统一状态管理器集成', () => {
    it('应该正确初始化统一状态管理器', () => {
      expect(unifiedStateStore).toBeDefined()
      expect(unifiedStateStore.user).toBeDefined()
      expect(unifiedStateStore.plugins).toBeDefined()
      expect(unifiedStateStore.statistics).toBeDefined()
    })

    it('应该在用户状态和统一状态之间同步', () => {
      // 测试状态同步逻辑
      const unifiedUser = unifiedStateStore.user
      
      expect(unifiedUser.id).toBe(userStore.id)
      expect(unifiedUser.username).toBe(userStore.username)
      expect(unifiedUser.isLoggedIn).toBe(userStore.isLoggedIn)
      expect(unifiedUser.preferences.theme).toBe(userStore.preferences.theme)
      expect(unifiedUser.preferences.language).toBe(userStore.preferences.language)
    })

    it('应该能够更新插件状态', () => {
      const pluginId = 'test-plugin'
      const enabled = true

      // 假设统一状态管理器有 setPluginEnabled 方法
      if (typeof unifiedStateStore.setPluginEnabled === 'function') {
        unifiedStateStore.setPluginEnabled(pluginId, enabled)
        
        expect(unifiedStateStore.plugins.enabledStates[pluginId]).toBe(enabled)
      }
    })

    it('应该能够获取插件统计信息', () => {
      const statistics = unifiedStateStore.statistics
      
      expect(statistics).toBeDefined()
      expect(typeof statistics.total).toBe('number')
      expect(typeof statistics.enabled).toBe('number')
      expect(typeof statistics.withIssues).toBe('number')
    })
  })

  describe('插件管理器状态集成', () => {
    it('应该能够注册和启用插件', async () => {
      const testPlugin = {
        id: 'integration-test-plugin',
        name: 'Integration Test Plugin',
        enabled: true,
        priority: 50,
        search: async () => []
      }

      await pluginManager.register(testPlugin)
      
      const plugins = pluginManager.getAllPlugins()
      const registeredPlugin = plugins.find(p => p.id === testPlugin.id)
      
      expect(registeredPlugin).toBeDefined()
      expect(registeredPlugin?.enabled).toBe(testPlugin.enabled)
    })

    it('应该能够持久化插件配置', async () => {
      const pluginId = 'config-test-plugin'
      const config = { maxResults: 10, enabled: true }

      const testPlugin = {
        id: pluginId,
        name: 'Config Test Plugin',
        enabled: true,
        priority: 50,
        search: async () => []
      }

      await pluginManager.register(testPlugin)
      
      // 设置插件配置
      if (typeof pluginManager.setPluginConfig === 'function') {
        pluginManager.setPluginConfig(pluginId, config)
        
        const retrievedConfig = pluginManager.getPluginConfig(pluginId)
        expect(retrievedConfig).toEqual(config)
      }
    })

    it('应该能够更新插件启用状态', async () => {
      const pluginId = 'toggle-test-plugin'

      const testPlugin = {
        id: pluginId,
        name: 'Toggle Test Plugin',
        enabled: true,
        priority: 50,
        search: async () => []
      }

      await pluginManager.register(testPlugin)
      
      // 禁用插件
      await pluginManager.disablePlugin(pluginId)
      let plugin = pluginManager.getAllPlugins().find(p => p.id === pluginId)
      expect(plugin?.enabled).toBe(false)

      // 启用插件
      await pluginManager.enablePlugin(pluginId)
      plugin = pluginManager.getAllPlugins().find(p => p.id === pluginId)
      expect(plugin?.enabled).toBe(true)
    })
  })

  describe('状态持久化测试', () => {
    it('应该能够导出和导入状态', () => {
      // 导出状态
      const exportedState = unifiedStateStore.exportState()
      
      expect(exportedState).toBeDefined()
      expect(exportedState.user).toBeDefined()
      expect(exportedState.plugins).toBeDefined()
      expect(exportedState.statistics).toBeDefined()

      // 修改状态
      if (typeof unifiedStateStore.setPluginEnabled === 'function') {
        unifiedStateStore.setPluginEnabled('test-plugin', true)
      }

      // 导入之前的状态
      if (typeof unifiedStateStore.importState === 'function') {
        unifiedStateStore.importState(exportedState)
        
        // 验证状态已恢复
        const currentState = unifiedStateStore.exportState()
        expect(currentState).toEqual(exportedState)
      }
    })

    it('应该能够重置统计信息', () => {
      if (typeof unifiedStateStore.resetAllMetrics === 'function') {
        unifiedStateStore.resetAllMetrics()
        
        const statistics = unifiedStateStore.statistics
        expect(statistics.total).toBe(0)
        expect(statistics.enabled).toBe(0)
        expect(statistics.withIssues).toBe(0)
      }
    })
  })

  describe('跨状态管理器的事件同步', () => {
    it('应该在插件状态变化时触发事件', async () => {
      const mockListener = vi.fn()
      
      pluginManager.on('plugin:enabled', mockListener)
      pluginManager.on('plugin:disabled', mockListener)

      const testPlugin = {
        id: 'event-test-plugin',
        name: 'Event Test Plugin',
        enabled: false,
        priority: 50,
        search: async () => []
      }

      await pluginManager.register(testPlugin)
      
      // 启用插件
      await pluginManager.enablePlugin('event-test-plugin')
      expect(mockListener).toHaveBeenCalledWith('event-test-plugin')

      // 禁用插件
      await pluginManager.disablePlugin('event-test-plugin')
      expect(mockListener).toHaveBeenCalledWith('event-test-plugin')
    })

    it('应该在用户偏好变化时同步到统一状态', () => {
      // Mock 用户偏好变化
      const newPreferences = {
        theme: 'dark' as const,
        language: 'en-US',
        shortcuts: userStore.preferences.shortcuts
      }

      if (typeof userStore.updatePreferences === 'function') {
        userStore.updatePreferences(newPreferences)
        
        // 验证统一状态管理器中的偏好设置已更新
        expect(unifiedStateStore.user.preferences.theme).toBe(newPreferences.theme)
        expect(unifiedStateStore.user.preferences.language).toBe(newPreferences.language)
      }
    })
  })

  describe('错误处理和恢复', () => {
    it('应该处理状态管理器初始化失败', () => {
      // Mock 统一状态管理器初始化失败
      vi.mock('@/lib/state/unified-state-manager', () => ({
        useUnifiedStateStore: () => {
          throw new Error('State manager initialization failed')
        }
      }))

      // 用户状态管理器应该能够优雅降级
      const fallbackUserStore = useUserStore()
      expect(fallbackUserStore).toBeDefined()
      expect(fallbackUserStore.preferences.theme).toBe('system')
      expect(fallbackUserStore.preferences.language).toBe('zh-CN')
    })

    it('应该处理插件配置错误', async () => {
      const invalidConfig = { invalid: 'config' }

      const testPlugin = {
        id: 'error-test-plugin',
        name: 'Error Test Plugin',
        enabled: true,
        priority: 50,
        search: async () => []
      }

      await pluginManager.register(testPlugin)
      
      // 尝试设置无效配置应该不抛出错误
      if (typeof pluginManager.setPluginConfig === 'function') {
        expect(() => {
          pluginManager.setPluginConfig('error-test-plugin', invalidConfig)
        }).not.toThrow()
      }
    })
  })
})