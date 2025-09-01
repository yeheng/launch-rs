import { describe, it, expect, beforeEach } from 'vitest'
import { useSearchPluginManager } from '@/lib/search-plugin-manager'

/**
 * 简化的插件管理器测试
 * 专注于核心功能的验证
 */

describe('SearchPluginManager', () => {
  let pluginManager: ReturnType<typeof useSearchPluginManager>

  beforeEach(() => {
    // 重置插件管理器实例
    pluginManager = useSearchPluginManager()
  })

  describe('基础功能', () => {
    it('应该正确获取插件管理器实例', () => {
      expect(pluginManager).toBeDefined()
      expect(typeof pluginManager.getPlugins).toBe('function')
      expect(typeof pluginManager.getAllPlugins).toBe('function')
    })

    it('应该能够获取所有插件', () => {
      const plugins = pluginManager.getAllPlugins()
      expect(Array.isArray(plugins)).toBe(true)
    })

    it('应该能够获取启用的插件', () => {
      const enabledPlugins = pluginManager.getEnabledPlugins()
      expect(Array.isArray(enabledPlugins)).toBe(true)
    })
  })

  describe('插件注册', () => {
    it('应该能够注册插件', async () => {
      const testPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        enabled: true,
        priority: 50,
        search: async () => []
      }

      await pluginManager.register(testPlugin)
      
      const plugins = pluginManager.getAllPlugins()
      const registeredPlugin = plugins.find(p => p.id === 'test-plugin')
      
      expect(registeredPlugin).toBeDefined()
      expect(registeredPlugin?.name).toBe('Test Plugin')
    })

    it('应该能够卸载插件', async () => {
      const testPlugin = {
        id: 'test-plugin-unregister',
        name: 'Test Plugin Unregister',
        enabled: true,
        priority: 50,
        search: async () => []
      }

      await pluginManager.register(testPlugin)
      expect(pluginManager.getAllPlugins().length).toBeGreaterThan(0)

      await pluginManager.unregister('test-plugin-unregister')
      
      const plugins = pluginManager.getAllPlugins()
      const unregisteredPlugin = plugins.find(p => p.id === 'test-plugin-unregister')
      
      expect(unregisteredPlugin).toBeUndefined()
    })
  })

  describe('插件状态管理', () => {
    it('应该能够启用插件', async () => {
      const testPlugin = {
        id: 'test-plugin-enable',
        name: 'Test Plugin Enable',
        enabled: false,
        priority: 50,
        search: async () => []
      }

      await pluginManager.register(testPlugin)
      await pluginManager.enablePlugin('test-plugin-enable')

      const plugin = pluginManager.getAllPlugins().find(p => p.id === 'test-plugin-enable')
      expect(plugin?.enabled).toBe(true)
    })

    it('应该能够禁用插件', async () => {
      const testPlugin = {
        id: 'test-plugin-disable',
        name: 'Test Plugin Disable',
        enabled: true,
        priority: 50,
        search: async () => []
      }

      await pluginManager.register(testPlugin)
      await pluginManager.disablePlugin('test-plugin-disable')

      const plugin = pluginManager.getAllPlugins().find(p => p.id === 'test-plugin-disable')
      expect(plugin?.enabled).toBe(false)
    })
  })

  describe('搜索功能', () => {
    it('应该能够执行搜索', async () => {
      const testPlugin = {
        id: 'test-plugin-search',
        name: 'Test Plugin Search',
        enabled: true,
        priority: 50,
        search: async () => [
          { id: 'result-1', title: 'Test Result 1', description: 'Description 1' },
          { id: 'result-2', title: 'Test Result 2', description: 'Description 2' }
        ]
      }

      await pluginManager.register(testPlugin)
      const results = await pluginManager.search('test')

      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })

    it('应该搜索空字符串时返回空结果', async () => {
      const results = await pluginManager.search('')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBe(0)
    })
  })

  describe('事件系统', () => {
    it('应该能够监听插件注册事件', async () => {
      const mockListener = vi.fn()
      
      pluginManager.on('plugin:registered', mockListener)

      const testPlugin = {
        id: 'test-plugin-event-listener',
        name: 'Test Plugin Event',
        enabled: true,
        priority: 50,
        search: async () => []
      }

      await pluginManager.register(testPlugin)

      expect(mockListener).toHaveBeenCalledWith(testPlugin)
    })

    it('应该能够移除事件监听器', async () => {
      const mockListener = vi.fn()
      
      pluginManager.on('plugin:registered', mockListener)
      pluginManager.off('plugin:registered', mockListener)

      const testPlugin = {
        id: 'test-plugin-event-remove',
        name: 'Test Plugin Event Remove',
        enabled: true,
        priority: 50,
        search: async () => []
      }

      await pluginManager.register(testPlugin)

      expect(mockListener).not.toHaveBeenCalled()
    })
  })
})