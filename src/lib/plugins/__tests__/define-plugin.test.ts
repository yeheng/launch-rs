import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  definePlugin, 
  createSimplePlugin, 
  createPrefixPlugin, 
  pluginUtils 
} from '../define-plugin'
import type { SearchContext, SearchResultItem } from '../../search-plugins'

/**
 * definePlugin 工厂函数测试
 * 验证插件创建和功能是否正常
 */

describe('definePlugin 工厂函数测试', () => {

  describe('基础插件创建', () => {
    it('应该能够创建基础插件', () => {
      const plugin = definePlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        description: 'A test plugin',
        search: () => []
      })

      expect(plugin.id).toBe('test-plugin')
      expect(plugin.name).toBe('Test Plugin')
      expect(plugin.description).toBe('A test plugin')
      expect(plugin.version).toBe('1.0.0')
      expect(plugin.enabled).toBe(true)
      expect(plugin.priority).toBe(50)
      expect(plugin.searchPrefixes).toEqual([])
    })

    it('应该支持自定义配置', () => {
      const plugin = definePlugin({
        id: 'custom-plugin',
        name: 'Custom Plugin',
        description: 'A custom plugin',
        version: '2.0.0',
        enabled: false,
        priority: 100,
        searchPrefixes: ['custom:', 'test:'],
        search: () => []
      })

      expect(plugin.version).toBe('2.0.0')
      expect(plugin.enabled).toBe(false)
      expect(plugin.priority).toBe(100)
      expect(plugin.searchPrefixes).toEqual(['custom:', 'test:'])
    })
  })

  describe('插件生命周期', () => {
    it('应该能够正确初始化', async () => {
      const initializeMock = vi.fn()
      
      const plugin = definePlugin({
        id: 'lifecycle-plugin',
        name: 'Lifecycle Plugin',
        description: 'Test lifecycle',
        initialize: initializeMock,
        search: () => []
      })

      await plugin.initialize()

      expect(initializeMock).toHaveBeenCalledWith(plugin)
    })

    it('应该能够正确销毁', async () => {
      const destroyMock = vi.fn()
      
      const plugin = definePlugin({
        id: 'destroy-plugin',
        name: 'Destroy Plugin',
        description: 'Test destroy',
        destroy: destroyMock,
        search: () => []
      })

      await plugin.destroy()

      expect(destroyMock).toHaveBeenCalledWith(plugin)
    })

    it('应该防止重复初始化', async () => {
      const initializeMock = vi.fn()
      
      const plugin = definePlugin({
        id: 'no-duplicate-init',
        name: 'No Duplicate Init',
        description: 'Test no duplicate init',
        initialize: initializeMock,
        search: () => []
      })

      await plugin.initialize()
      await plugin.initialize()

      expect(initializeMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('搜索功能', () => {
    it('应该能够执行搜索', async () => {
      const searchResults: SearchResultItem[] = [
        {
          id: 'result-1',
          title: 'Test Result',
          description: 'A test result',
          icon: null,
          priority: 50,
          action: () => {},
          source: 'test-search-plugin'
        }
      ]

      const plugin = definePlugin({
        id: 'test-search-plugin',
        name: 'Test Search Plugin',
        description: 'Test search functionality',
        search: () => searchResults
      })

      const context: SearchContext = {
        query: 'test',
        queryLower: 'test',
        keywords: ['test']
      }

      const results = await plugin.search(context)

      expect(results).toEqual(searchResults)
    })

    it('应该在搜索前自动初始化', async () => {
      const initializeMock = vi.fn()
      const searchMock = vi.fn().mockResolvedValue([])
      
      const plugin = definePlugin({
        id: 'auto-init-plugin',
        name: 'Auto Init Plugin',
        description: 'Test auto init',
        initialize: initializeMock,
        search: searchMock
      })

      const context: SearchContext = {
        query: 'test',
        queryLower: 'test',
        keywords: ['test']
      }

      await plugin.search(context)

      expect(initializeMock).toHaveBeenCalledWith(plugin)
      expect(searchMock).toHaveBeenCalledWith(context, plugin)
    })

    it('应该处理搜索错误', async () => {
      const searchMock = vi.fn().mockRejectedValue(new Error('Search failed'))
      
      const plugin = definePlugin({
        id: 'error-search-plugin',
        name: 'Error Search Plugin',
        description: 'Test error handling',
        search: searchMock
      })

      const context: SearchContext = {
        query: 'test',
        queryLower: 'test',
        keywords: ['test']
      }

      const results = await plugin.search(context)

      expect(results).toEqual([])
    })
  })

  describe('事件系统', () => {
    it('应该能够添加和触发事件监听器', () => {
      const listenerMock = vi.fn()
      
      const plugin = definePlugin({
        id: 'event-plugin',
        name: 'Event Plugin',
        description: 'Test event system',
        search: () => []
      })

      plugin.on('search:start', listenerMock)
      plugin.emit('search:start', 'test query')

      expect(listenerMock).toHaveBeenCalledWith('test query')
    })

    it('应该能够移除事件监听器', () => {
      const listenerMock = vi.fn()
      
      const plugin = definePlugin({
        id: 'event-remove-plugin',
        name: 'Event Remove Plugin',
        description: 'Test event removal',
        search: () => []
      })

      plugin.on('search:start', listenerMock)
      plugin.off('search:start', listenerMock)
      plugin.emit('search:start', 'test query')

      expect(listenerMock).not.toHaveBeenCalled()
    })
  })

  describe('私有数据管理', () => {
    it('应该能够存储和获取私有数据', () => {
      const plugin = definePlugin({
        id: 'private-data-plugin',
        name: 'Private Data Plugin',
        description: 'Test private data',
        search: () => []
      })

      plugin.setPrivateData('testKey', 'testValue')
      plugin.setPrivateData('numberKey', 42)

      expect(plugin.getPrivateData('testKey')).toBe('testValue')
      expect(plugin.getPrivateData('numberKey')).toBe(42)
      expect(plugin.getPrivateData('nonExistent')).toBeUndefined()
    })
  })

  describe('统计信息', () => {
    it('应该能够获取插件统计信息', () => {
      const plugin = definePlugin({
        id: 'stats-plugin',
        name: 'Stats Plugin',
        description: 'Test statistics',
        search: () => []
      })

      const stats = plugin.getStats()

      expect(stats).toEqual({
        initialized: false,
        destroyed: false,
        errorCount: 0,
        lastUsed: 0,
        totalSearches: 0,
        lastSearchTime: 0,
        privateDataSize: 0
      })
    })

    it('应该能够检查健康状态', () => {
      const plugin = definePlugin({
        id: 'health-plugin',
        name: 'Health Plugin',
        description: 'Test health check',
        search: () => []
      })

      expect(plugin.isHealthy()).toBe(false) // 未初始化

      plugin.setPrivateData('test', 'value')
      expect(plugin.isHealthy()).toBe(false) // 仍然未初始化
    })
  })

  describe('便捷函数', () => {
    it('createSimplePlugin 应该创建简单插件', () => {
      const plugin = createSimplePlugin({
        id: 'simple-test',
        name: 'Simple Test',
        description: 'Test simple plugin',
        search: () => []
      })

      expect(plugin.id).toBe('simple-test')
      expect(plugin.priority).toBe(50)
    })

    it('createPrefixPlugin 应该创建前缀插件', () => {
      const plugin = createPrefixPlugin('test:', {
        id: 'prefix-test',
        name: 'Prefix Test',
        description: 'Test prefix plugin',
        search: () => []
      })

      expect(plugin.searchPrefixes).toEqual(['test:'])
      expect(plugin.priority).toBe(75)
    })
  })

  describe('验证工具', () => {
    it('应该能够验证插件配置', () => {
      const validOptions = {
        id: 'valid-plugin',
        name: 'Valid Plugin',
        description: 'A valid plugin',
        search: () => []
      }

      const validation = pluginUtils.validateOptions(validOptions)
      expect(validation.valid).toBe(true)
      expect(validation.errors).toEqual([])
    })

    it('应该检测到无效配置', () => {
      const invalidOptions = {
        id: '',
        name: 'Invalid Plugin',
        description: 'An invalid plugin',
        search: 'not a function'
      }

      const validation = pluginUtils.validateOptions(invalidOptions as any)
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('应该能够检测ID冲突', () => {
      const plugin1 = definePlugin({
        id: 'same-id',
        name: 'Plugin 1',
        description: 'First plugin',
        search: () => []
      })

      const plugin2 = definePlugin({
        id: 'same-id',
        name: 'Plugin 2',
        description: 'Second plugin',
        search: () => []
      })

      const conflicts = pluginUtils.checkIdConflicts([plugin1, plugin2])
      expect(conflicts).toContain('插件ID冲突: same-id 被使用了 2 次')
    })

    it('应该能够获取插件摘要', () => {
      const plugin = definePlugin({
        id: 'summary-plugin',
        name: 'Summary Plugin',
        description: 'Test plugin summary',
        search: () => []
      })

      const summary = pluginUtils.getPluginSummary(plugin)
      expect(summary).toEqual({
        id: 'summary-plugin',
        name: 'Summary Plugin',
        version: '1.0.0',
        enabled: true,
        priority: 50,
        hasSettings: false,
        prefixCount: 0
      })
    })
  })

  describe('配置设置', () => {
    it('应该支持插件配置', () => {
      const plugin = definePlugin({
        id: 'config-plugin',
        name: 'Config Plugin',
        description: 'Test plugin configuration',
        settings: {
          schema: [
            {
              key: 'testSetting',
              label: 'Test Setting',
              type: 'boolean',
              defaultValue: true
            }
          ],
          values: {
            testSetting: false
          }
        },
        search: () => []
      })

      expect(plugin.settings).toBeDefined()
      expect(plugin.settings?.schema).toHaveLength(1)
      expect(plugin.settings?.values.testSetting).toBe(false)
    })
  })
})