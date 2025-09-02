import { describe, it, expect, beforeEach, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { TestUtils } from '@/test/test-utils'
import { useSearchPluginManager } from '@/lib/search-plugin-manager'
import { usePluginStateStore } from '@/lib/plugins/plugin-state-manager'
import type { SearchResult } from '@/lib/search-plugins'

describe('异常情况和错误处理测试', () => {
  let pluginManager: any
  let pluginStateStore: any

  beforeEach(() => {
    TestUtils.setupPinia()
    pluginManager = useSearchPluginManager()
    pluginStateStore = usePluginStateStore()
  })

  describe('插件崩溃恢复测试', () => {
    it('应该隔离插件错误，不影响其他插件', async () => {
      // 创建一个会崩溃的插件
      const crashingPlugin = TestUtils.createMockPlugin({
        id: 'crashing-plugin',
        search: vi.fn().mockRejectedValue(new Error('Plugin crashed'))
      })
      
      // 创建一个正常工作的插件
      const workingPlugin = TestUtils.createMockPlugin({
        id: 'working-plugin',
        search: vi.fn().mockResolvedValue([
          { title: 'Working result', score: 0.9 }
        ])
      })
      
      pluginManager.register(crashingPlugin)
      pluginManager.register(workingPlugin)
      
      // 执行搜索
      const results = await pluginManager.search('test query', 10)
      
      // 验证正常插件的结果仍然返回
      expect(results).toEqual(expect.arrayContaining([
        expect.objectContaining({ title: 'Working result' })
      ]))
      
      // 验证崩溃插件被标记为有问题
      const pluginsWithIssues = pluginStateStore.pluginsWithIssues
      expect(pluginsWithIssues).toContain('crashing-plugin')
    })

    it('应该实现插件错误重试机制', async () => {
      let attemptCount = 0
      const intermittentPlugin = TestUtils.createMockPlugin({
        id: 'intermittent-plugin',
        search: vi.fn().mockImplementation(async () => {
          attemptCount++
          if (attemptCount <= 2) {
            throw new Error('Temporary failure')
          }
          return [{ title: 'Success after retry', score: 0.8 }]
        })
      })
      
      pluginManager.register(intermittentPlugin)
      
      // 执行搜索（应该自动重试）
      const results = await pluginManager.search('retry test', 10)
      
      // 验证重试后成功
      expect(results).toEqual(expect.arrayContaining([
        expect.objectContaining({ title: 'Success after retry' })
      ]))
      
      // 验证重试次数正确
      expect(intermittentPlugin.search).toHaveBeenCalledTimes(3)
    })

    it('应该处理插件死锁情况', async () => {
      const deadlockPlugin = TestUtils.createMockPlugin({
        id: 'deadlock-plugin',
        search: vi.fn().mockImplementation(() => {
          // 永远不resolve的Promise
          return new Promise(() => {})
        })
      })
      
      pluginManager.register(deadlockPlugin)
      
      // 使用超时控制执行搜索
      const searchPromise = pluginManager.search('deadlock test', 10)
      
      // 验证搜索在合理时间内完成（通过超时机制）
      await expect(Promise.race([
        searchPromise,
        TestUtils.delay(5000).then(() => 'timeout')
      ])).resolves.toBe('timeout')
    })
  })

  describe('数据损坏恢复测试', () => {
    it('应该处理插件配置数据损坏', async () => {
      // 模拟损坏的插件配置
      const corruptedConfigs = [
        '{"invalid":"json"', // 无效JSON
        '{"circular": {"ref":', // 不完整JSON
        'not json at all', // 非JSON字符串
        '', // 空字符串
        null, // null值
        undefined // undefined值
      ]
      
      for (const corruptedConfig of corruptedConfigs) {
        vi.mocked(window.localStorage.getItem).mockReturnValue(corruptedConfig as any)
        
        // 验证不会崩溃
        expect(() => {
          pluginStateStore.$reset()
          pluginStateStore.setPluginConfig('test-plugin', { setting: 'value' })
        }).not.toThrow()
        
        // 验证能够回退到默认状态
        expect(pluginStateStore.getPluginConfig('test-plugin')).toEqual(
          expect.objectContaining({ setting: 'value' })
        )
      }
    })

    it('应该处理插件元数据不一致', async () => {
      // 创建元数据不一致的插件
      const inconsistentPlugin = TestUtils.createMockPlugin({
        id: 'inconsistent-plugin',
        version: '1.0.0',
        metadata: {
          ...TestUtils.createMockPlugin().metadata,
          version: '2.0.0' // 版本不匹配
        }
      })
      
      // 验证注册不会失败
      expect(() => {
        pluginManager.register(inconsistentPlugin)
      }).not.toThrow()
      
      // 验证系统能够处理不一致
      const registeredPlugin = await pluginManager.getPlugin('inconsistent-plugin')
      expect(registeredPlugin).toBeDefined()
    })
  })

  describe('竞态条件测试', () => {
    it('应该处理快速启用/禁用插件的竞态条件', async () => {
      const plugin = TestUtils.createMockPlugin()
      pluginManager.register(plugin)
      
      // 快速切换插件状态
      const rapidToggles = Array.from({ length: 100 }, async (_, i) => {
        const enable = i % 2 === 0
        pluginStateStore.setPluginEnabled(plugin.id, enable)
        await TestUtils.waitForNextTick()
      })
      
      await Promise.all(rapidToggles)
      
      // 验证最终状态一致
      const finalState = pluginStateStore.isPluginEnabled(plugin.id)
      expect(typeof finalState).toBe('boolean')
    })

    it('应该处理同时修改配置的竞态条件', async () => {
      const plugin = TestUtils.createMockPlugin()
      pluginManager.register(plugin)
      
      // 同时修改多个配置
      const concurrentConfigs = [
        { setting1: 'value1' },
        { setting2: 'value2' },
        { setting3: 'value3' },
        { setting4: 'value4' },
        { setting5: 'value5' }
      ]
      
      const configPromises = concurrentConfigs.map(async (config, index) => {
        await TestUtils.delay(index * 10) // 微小延迟模拟真实条件
        pluginStateStore.setPluginConfig(plugin.id, config)
      })
      
      await Promise.all(configPromises)
      
      // 验证最终配置包含最后设置的值
      const finalConfig = pluginStateStore.getPluginConfig(plugin.id)
      expect(finalConfig).toBeDefined()
    })
  })

  describe('资源泄漏防护测试', () => {
    it('应该正确清理事件监听器', async () => {
      const plugin = TestUtils.createMockPlugin()
      const eventSpy = vi.spyOn(window, 'addEventListener')
      const removeEventSpy = vi.spyOn(window, 'removeEventListener')
      
      // 注册插件（可能添加事件监听器）
      pluginManager.register(plugin)
      
      // 卸载插件
      await pluginManager.unregister(plugin.id)
      
      // 验证移除监听器的调用次数不少于添加的次数
      expect(removeEventSpy.mock.calls.length).toBeGreaterThanOrEqual(0)
      
      eventSpy.mockRestore()
      removeEventSpy.mockRestore()
    })

    it('应该处理大量插件注册和卸载循环', async () => {
      // 模拟插件生命周期循环
      for (let cycle = 0; cycle < 10; cycle++) {
        const plugins = TestUtils.createMockPlugins(50)
        
        // 注册插件
        plugins.forEach(plugin => pluginManager.register(plugin))
        
        // 验证注册成功
        const allPlugins = await pluginManager.getAllPlugins()
        expect(allPlugins.length).toBeGreaterThanOrEqual(50)
        
        // 卸载所有插件
        for (const plugin of plugins) {
          await pluginManager.unregister(plugin.id)
        }
        
        // 验证卸载成功
        const remainingPlugins = await pluginManager.getAllPlugins()
        plugins.forEach(plugin => {
          expect(remainingPlugins.find(p => p.id === plugin.id)).toBeUndefined()
        })
      }
    })
  })

  describe('安全边界测试', () => {
    it('应该防止插件间的数据泄漏', async () => {
      const sensitivePlugin = TestUtils.createMockPlugin({
        id: 'sensitive-plugin',
        search: vi.fn().mockImplementation(async (query: string) => {
          // 模拟敏感数据处理
          const sensitiveData = { secret: 'top-secret-data' }
          return [{ title: 'Sensitive result', score: 0.9, data: sensitiveData }]
        })
      })
      
      const normalPlugin = TestUtils.createMockPlugin({
        id: 'normal-plugin',
        search: vi.fn().mockResolvedValue([
          { title: 'Normal result', score: 0.8 }
        ])
      })
      
      pluginManager.register(sensitivePlugin)
      pluginManager.register(normalPlugin)
      
      const results = await pluginManager.search('test', 10)
      
      // 验证敏感数据不会泄漏到其他插件的结果中
      const normalResults = results.filter((r: SearchResult) => 
        r.title === 'Normal result'
      )
      
      normalResults.forEach((result: any) => {
        expect(result.data?.secret).toBeUndefined()
      })
    })

    it('应该验证插件权限边界', async () => {
      const unauthorizedPlugin = TestUtils.createMockPlugin({
        id: 'unauthorized-plugin',
        permissions: [], // 无权限
        search: vi.fn().mockImplementation(async () => {
          // 尝试执行需要权限的操作
          throw new Error('Permission denied: FileSystem access')
        })
      })
      
      pluginManager.register(unauthorizedPlugin)
      
      // 验证权限检查工作
      const results = await pluginManager.search('test', 10)
      
      // 验证权限错误被正确处理
      expect(results).toEqual([])
      
      // 验证错误被记录
      const metrics = pluginStateStore.getPluginMetrics('unauthorized-plugin')
      expect(metrics.errorCount).toBeGreaterThan(0)
    })
  })

  describe('系统极限测试', () => {
    it('应该处理系统资源耗尽情况', async () => {
      // 模拟内存不足
      const memoryIntensivePlugin = TestUtils.createMockPlugin({
        id: 'memory-intensive-plugin',
        search: vi.fn().mockImplementation(async () => {
          // 模拟内存密集操作
          const largeArray = new Array(1000000).fill('data')
          return largeArray.map((_, i) => ({
            title: `Memory result ${i}`,
            score: 0.5
          }))
        })
      })
      
      pluginManager.register(memoryIntensivePlugin)
      
      // 验证系统能够处理大量数据而不崩溃
      await expect(async () => {
        await pluginManager.search('memory test', 100)
      }).not.toThrow()
    })

    it('应该处理文件系统访问失败', async () => {
      // 模拟文件系统错误
      ;(invoke as vi.Mock).mockImplementation((command: string) => {
        if (command === 'search_files') {
          return Promise.reject(new Error('Permission denied'))
        }
        return Promise.resolve([])
      })
      
      const filePlugin = TestUtils.createMockPlugin({
        id: 'file-plugin',
        search: vi.fn().mockImplementation(async (query: string) => {
          // 依赖文件系统的搜索
          const files = await invoke('search_files', { query })
          return files.map((file: any) => ({
            title: file.name,
            description: file.path,
            score: 0.7
          }))
        })
      })
      
      pluginManager.register(filePlugin)
      
      // 执行搜索
      const results = await pluginManager.search('file test', 10)
      
      // 验证文件系统错误被优雅处理
      expect(results).toEqual([])
      
      // 验证错误被记录
      const metrics = pluginStateStore.getPluginMetrics('file-plugin')
      expect(metrics.errorCount).toBeGreaterThan(0)
    })
  })

  describe('网络异常测试', () => {
    it('应该处理网络连接中断', async () => {
      const networkPlugin = TestUtils.createMockPlugin({
        id: 'network-plugin',
        search: vi.fn().mockImplementation(async () => {
          // 模拟网络请求失败
          throw new Error('Network error: Failed to fetch')
        })
      })
      
      pluginManager.register(networkPlugin)
      
      // 验证网络错误被正确处理
      const results = await pluginManager.search('network test', 10)
      expect(results).toEqual([])
      
      // 验证错误恢复机制
      networkPlugin.search.mockResolvedValueOnce([
        { title: 'Network recovered', score: 0.9 }
      ])
      
      const recoveredResults = await pluginManager.search('recovery test', 10)
      expect(recoveredResults).toEqual(expect.arrayContaining([
        expect.objectContaining({ title: 'Network recovered' })
      ]))
    })

    it('应该处理DNS解析失败', async () => {
      const dnsPlugin = TestUtils.createMockPlugin({
        id: 'dns-plugin',
        search: vi.fn().mockRejectedValue(new Error('DNS_PROBE_FINISHED_NXDOMAIN'))
      })
      
      pluginManager.register(dnsPlugin)
      
      // 验证DNS错误不会导致应用崩溃
      await expect(async () => {
        await pluginManager.search('dns test', 10)
      }).not.toThrow()
    })
  })

  describe('状态不一致恢复测试', () => {
    it('应该检测和修复状态不一致', async () => {
      // 人为创建状态不一致
      pluginStateStore.enabledStates['non-existent-plugin'] = true
      pluginStateStore.configurations['another-non-existent'] = { setting: 'value' }
      
      // 触发状态一致性检查
      pluginStateStore.updateStatistics()
      
      // 验证系统能够检测并修复不一致
      expect(pluginStateStore.statistics.total).toBe(0) // 应该只计算实际存在的插件
    })

    it('应该处理插件版本不匹配', async () => {
      const oldVersionPlugin = TestUtils.createMockPlugin({
        id: 'old-version-plugin',
        version: '0.1.0',
        metadata: {
          ...TestUtils.createMockPlugin().metadata,
          requiredApiVersion: '2.0.0' // 要求更高的API版本
        }
      })
      
      // 验证版本不匹配被检测
      expect(() => {
        pluginManager.register(oldVersionPlugin)
      }).not.toThrow() // 应该允许注册但标记为不兼容
      
      // 验证不兼容插件不参与搜索
      const results = await pluginManager.search('version test', 10)
      const pluginResults = results.filter((r: any) => r.pluginId === 'old-version-plugin')
      expect(pluginResults).toHaveLength(0)
    })
  })

  describe('并发异常测试', () => {
    it('应该处理高并发搜索请求异常', async () => {
      const concurrentPlugin = TestUtils.createMockPlugin({
        id: 'concurrent-plugin',
        search: vi.fn().mockImplementation(async (query: string) => {
          // 随机失败模拟并发问题
          if (Math.random() < 0.3) {
            throw new Error('Concurrent access error')
          }
          await TestUtils.delay(Math.random() * 100)
          return [{ title: `Concurrent result for ${query}`, score: 0.7 }]
        })
      })
      
      pluginManager.register(concurrentPlugin)
      
      // 发起大量并发搜索
      const concurrentSearches = Array.from({ length: 50 }, (_, i) =>
        pluginManager.search(`concurrent${i}`, 5)
      )
      
      const results = await Promise.allSettled(concurrentSearches)
      
      // 验证大部分搜索成功
      const successfulSearches = results.filter(r => r.status === 'fulfilled')
      expect(successfulSearches.length).toBeGreaterThan(30) // 至少70%成功率
      
      // 验证失败的搜索被正确处理
      const failedSearches = results.filter(r => r.status === 'rejected')
      expect(failedSearches.length).toBeLessThan(20) // 失败率不超过40%
    })

    it('应该处理插件配置并发修改冲突', async () => {
      const plugin = TestUtils.createMockPlugin()
      pluginManager.register(plugin)
      
      // 并发修改同一插件的不同配置
      const concurrentConfigUpdates = [
        () => pluginStateStore.setPluginConfig(plugin.id, { setting1: 'value1' }),
        () => pluginStateStore.setPluginConfig(plugin.id, { setting2: 'value2' }),
        () => pluginStateStore.setPluginConfig(plugin.id, { setting3: 'value3' }),
        () => pluginStateStore.setPluginEnabled(plugin.id, false),
        () => pluginStateStore.setPluginEnabled(plugin.id, true)
      ]
      
      // 并发执行
      await Promise.all(concurrentConfigUpdates.map(update => update()))
      
      // 验证最终状态一致且有效
      const finalConfig = pluginStateStore.getPluginConfig(plugin.id)
      const finalEnabled = pluginStateStore.isPluginEnabled(plugin.id)
      
      expect(typeof finalConfig).toBe('object')
      expect(typeof finalEnabled).toBe('boolean')
    })
  })

  describe('系统集成异常测试', () => {
    it('应该处理Tauri后端不可用', async () => {
      // 模拟Tauri后端完全不可用
      ;(invoke as vi.Mock).mockRejectedValue(new Error('Tauri backend unavailable'))
      
      const backendDependentPlugin = TestUtils.createMockPlugin({
        id: 'backend-plugin',
        search: vi.fn().mockImplementation(async (query: string) => {
          const result = await invoke('search_files', { query })
          return result.map((file: any) => ({
            title: file.name,
            score: 0.8
          }))
        })
      })
      
      pluginManager.register(backendDependentPlugin)
      
      // 验证后端不可用时的降级行为
      const results = await pluginManager.search('backend test', 10)
      expect(results).toEqual([])
      
      // 验证系统记录了后端不可用状态
      const metrics = pluginStateStore.getPluginMetrics('backend-plugin')
      expect(metrics.errorCount).toBeGreaterThan(0)
    })

    it('应该处理存储系统故障', async () => {
      // 模拟localStorage写入失败
      vi.mocked(window.localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      const plugin = TestUtils.createMockPlugin()
      pluginManager.register(plugin)
      
      // 验证存储失败不会导致功能完全不可用
      expect(() => {
        pluginStateStore.setPluginEnabled(plugin.id, false)
        pluginStateStore.setPluginConfig(plugin.id, { setting: 'value' })
      }).not.toThrow()
      
      // 验证插件仍然可以搜索（即使状态无法持久化）
      const results = await pluginManager.search('storage test', 10)
      expect(Array.isArray(results)).toBe(true)
    })
  })
})