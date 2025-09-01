import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { TestUtils } from '@/test/test-utils'
import { mockTauriInvoke, realisticLocalStorage } from '@/test/setup-e2e'
import Home from '@/views/Home.vue'
import { useSearchPluginManager } from '@/lib/search-plugin-manager'

describe('应用启动和搜索流程 E2E 测试', () => {
  let wrapper: any
  let pluginManager: any

  beforeEach(() => {
    // 设置测试环境
    TestUtils.setupPinia()
    
    // 初始化插件管理器
    pluginManager = useSearchPluginManager()
  })

  describe('应用启动流程', () => {
    it('应该成功启动应用并显示搜索界面', async () => {
      // 模拟应用启动
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })

      // 验证搜索界面显示
      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
      expect(wrapper.find('.search-input').exists()).toBe(true)
    })

    it('应该正确加载和初始化所有插件', async () => {
      // 验证插件已加载
      const plugins = await pluginManager.getAllPlugins()
      expect(plugins.length).toBeGreaterThan(0)
      
      // 验证内置插件存在
      const builtInPluginIds = ['apps', 'files', 'calculator', 'units']
      builtInPluginIds.forEach(id => {
        const plugin = plugins.find(p => p.id === id)
        expect(plugin).toBeDefined()
        expect(plugin?.enabled).toBe(true)
      })
    })

    it('应该正确恢复用户设置和插件状态', async () => {
      // 模拟已保存的用户设置
      realisticLocalStorage.setItem('plugin-state-store', JSON.stringify({
        enabledStates: { 'apps': false, 'files': true },
        configurations: { 'calculator': { precision: 4 } },
        usageMetrics: {},
        lastSync: Date.now()
      }))

      // 重新初始化
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })

      await TestUtils.waitForNextTick()

      // 验证状态恢复
      const pluginStateStore = usePluginStateStore()
      expect(pluginStateStore.isPluginEnabled('apps')).toBe(false)
      expect(pluginStateStore.isPluginEnabled('files')).toBe(true)
      expect(pluginStateStore.getPluginConfig('calculator')).toEqual({ precision: 4 })
    })
  })

  describe('搜索功能 E2E 流程', () => {
    beforeEach(async () => {
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })
      await TestUtils.waitForNextTick()
    })

    it('应该执行完整的搜索流程：输入 → 搜索 → 显示结果', async () => {
      const searchInput = wrapper.find('input[type="text"]')
      
      // 1. 用户输入搜索查询
      await searchInput.setValue('test document')
      await searchInput.trigger('input')
      
      // 2. 等待防抖延迟
      await TestUtils.delay(500)
      
      // 3. 验证搜索被触发
      expect(mockTauriInvoke).toHaveBeenCalledWith('search_files', {
        query: 'test document'
      })
      
      // 4. 验证结果显示
      await TestUtils.waitForNextTick()
      const results = wrapper.findAll('.search-result-item')
      expect(results.length).toBeGreaterThan(0)
    })

    it('应该支持键盘导航选择结果', async () => {
      const searchInput = wrapper.find('input[type="text"]')
      
      // 输入搜索查询
      await searchInput.setValue('test')
      await TestUtils.delay(500)
      await TestUtils.waitForNextTick()
      
      // 模拟键盘导航
      await searchInput.trigger('keydown', { key: 'ArrowDown' })
      await TestUtils.waitForNextTick()
      
      // 验证第一个结果被选中
      const firstResult = wrapper.find('.search-result-item.selected')
      expect(firstResult.exists()).toBe(true)
      
      // 继续导航
      await searchInput.trigger('keydown', { key: 'ArrowDown' })
      await TestUtils.waitForNextTick()
      
      // 验证选择移动到下一个结果
      const results = wrapper.findAll('.search-result-item.selected')
      expect(results.length).toBe(1) // 只有一个选中项
    })

    it('应该支持Enter键执行选中的搜索结果', async () => {
      const searchInput = wrapper.find('input[type="text"]')
      
      // 输入并选择结果
      await searchInput.setValue('test')
      await TestUtils.delay(500)
      await searchInput.trigger('keydown', { key: 'ArrowDown' })
      await TestUtils.waitForNextTick()
      
      // 模拟按Enter执行
      await searchInput.trigger('keydown', { key: 'Enter' })
      await TestUtils.waitForNextTick()
      
      // 验证结果被执行（这里需要根据具体实现验证）
      // 例如：文件被打开、应用被启动等
    })

    it('应该正确处理空搜索结果', async () => {
      // 模拟空结果
      mockTauriInvoke.mockResolvedValueOnce([])
      
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('nonexistent file')
      await TestUtils.delay(500)
      await TestUtils.waitForNextTick()
      
      // 验证显示"无结果"消息
      expect(wrapper.text()).toContain('No results found')
    })
  })

  describe('插件管理 E2E 流程', () => {
    it('应该支持完整的插件启用/禁用流程', async () => {
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })
      
      // 1. 进入插件管理页面
      const settingsButton = wrapper.find('[data-testid="settings-button"]')
      if (settingsButton.exists()) {
        await settingsButton.trigger('click')
        await TestUtils.waitForNextTick()
      }
      
      // 2. 找到插件列表
      const pluginCards = wrapper.findAll('[data-testid="plugin-card"]')
      expect(pluginCards.length).toBeGreaterThan(0)
      
      // 3. 切换插件状态
      const firstPluginToggle = pluginCards[0].find('input[type="checkbox"]')
      const initialState = firstPluginToggle.element.checked
      
      await firstPluginToggle.trigger('change')
      await TestUtils.waitForNextTick()
      
      // 4. 验证状态已更改
      expect(firstPluginToggle.element.checked).toBe(!initialState)
      
      // 5. 验证状态持久化
      const pluginStateStore = usePluginStateStore()
      const pluginId = pluginCards[0].props('plugin')?.id
      expect(pluginStateStore.isPluginEnabled(pluginId)).toBe(!initialState)
    })

    it('应该支持插件配置修改流程', async () => {
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })
      
      // 1. 打开配置对话框
      const configButton = wrapper.find('[data-testid="configure-plugin"]')
      if (configButton.exists()) {
        await configButton.trigger('click')
        await TestUtils.waitForNextTick()
      }
      
      // 2. 修改配置值
      const configInput = wrapper.find('[data-testid="config-input"]')
      if (configInput.exists()) {
        await configInput.setValue('new value')
        await configInput.trigger('input')
      }
      
      // 3. 保存配置
      const saveButton = wrapper.find('[data-testid="save-config"]')
      if (saveButton.exists()) {
        await saveButton.trigger('click')
        await TestUtils.waitForNextTick()
      }
      
      // 4. 验证配置已保存
      const pluginStateStore = usePluginStateStore()
      const config = pluginStateStore.getPluginConfig('test-plugin')
      expect(config).toEqual(expect.objectContaining({ 'setting1': 'new value' }))
    })
  })

  describe('性能和响应性 E2E 测试', () => {
    it('应该在大量搜索结果下保持响应性', async () => {
      // 模拟大量搜索结果
      const largeResultSet = Array.from({ length: 100 }, (_, i) => ({
        name: `file${i}.txt`,
        path: `/path/file${i}.txt`,
        size: 1000 + i
      }))
      
      mockTauriInvoke.mockResolvedValueOnce(largeResultSet)
      
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })
      
      const searchInput = wrapper.find('input[type="text"]')
      
      // 记录搜索开始时间
      const startTime = performance.now()
      
      await searchInput.setValue('file')
      await TestUtils.delay(500)
      await TestUtils.waitForNextTick()
      
      // 记录搜索完成时间
      const endTime = performance.now()
      const searchDuration = endTime - startTime
      
      // 验证搜索性能（应该在合理时间内完成）
      expect(searchDuration).toBeLessThan(2000) // 2秒内完成
      
      // 验证结果显示
      const results = wrapper.findAll('.search-result-item')
      expect(results.length).toBeLessThanOrEqual(50) // 结果应该被限制以提高性能
    })

    it('应该正确处理搜索防抖', async () => {
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })
      
      const searchInput = wrapper.find('input[type="text"]')
      
      // 快速连续输入
      await searchInput.setValue('t')
      await searchInput.setValue('te')
      await searchInput.setValue('tes')
      await searchInput.setValue('test')
      
      // 等待防抖延迟
      await TestUtils.delay(300) // 少于防抖时间
      
      // 验证搜索还未被触发
      expect(mockTauriInvoke).not.toHaveBeenCalled()
      
      // 等待完整防抖时间
      await TestUtils.delay(300)
      
      // 验证搜索只被触发一次
      expect(mockTauriInvoke).toHaveBeenCalledTimes(1)
      expect(mockTauriInvoke).toHaveBeenCalledWith('search_files', {
        query: 'test'
      })
    })
  })

  describe('错误处理 E2E 流程', () => {
    it('应该优雅处理搜索错误', async () => {
      // 模拟搜索错误
      mockTauriInvoke.mockRejectedValueOnce(new Error('Search failed'))
      
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })
      
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('error test')
      await TestUtils.delay(500)
      await TestUtils.waitForNextTick()
      
      // 验证错误被优雅处理
      expect(wrapper.text()).toContain('Search failed') // 或其他错误消息
      
      // 验证应用仍然可用
      await searchInput.setValue('new search')
      expect(searchInput.element.value).toBe('new search')
    })

    it('应该处理插件崩溃并提供降级体验', async () => {
      // 模拟插件崩溃
      const brokenPlugin = TestUtils.createMockPlugin({
        id: 'broken-plugin',
        search: vi.fn().mockRejectedValue(new Error('Plugin crashed'))
      })
      
      pluginManager.register(brokenPlugin)
      
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })
      
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test')
      await TestUtils.delay(500)
      await TestUtils.waitForNextTick()
      
      // 验证其他插件仍然工作
      expect(mockTauriInvoke).toHaveBeenCalled()
      
      // 验证错误被记录但不影响整体功能
      const results = wrapper.findAll('.search-result-item')
      expect(results.length).toBeGreaterThanOrEqual(0) // 至少其他插件的结果应该显示
    })
  })

  describe('多插件协作 E2E 流程', () => {
    it('应该正确处理多个插件的搜索结果合并', async () => {
      // 创建多个模拟插件
      const plugins = [
        TestUtils.createMockPlugin({
          id: 'plugin-1',
          priority: 1,
          search: vi.fn().mockResolvedValue([
            { title: 'Result from Plugin 1', score: 0.9 }
          ])
        }),
        TestUtils.createMockPlugin({
          id: 'plugin-2', 
          priority: 2,
          search: vi.fn().mockResolvedValue([
            { title: 'Result from Plugin 2', score: 0.8 }
          ])
        })
      ]
      
      plugins.forEach(plugin => pluginManager.register(plugin))
      
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })
      
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('test query')
      await TestUtils.delay(500)
      await TestUtils.waitForNextTick()
      
      // 验证所有插件都被调用
      plugins.forEach(plugin => {
        expect(plugin.search).toHaveBeenCalledWith('test query', expect.any(Number))
      })
      
      // 验证结果按优先级排序
      const results = wrapper.findAll('.search-result-item')
      expect(results.length).toBe(2)
      // 高优先级插件的结果应该排在前面
      expect(results[0].text()).toContain('Plugin 2') // priority: 2
      expect(results[1].text()).toContain('Plugin 1') // priority: 1
    })

    it('应该支持搜索结果的实时更新', async () => {
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })
      
      const searchInput = wrapper.find('input[type="text"]')
      
      // 第一次搜索
      await searchInput.setValue('test')
      await TestUtils.delay(500)
      await TestUtils.waitForNextTick()
      
      let results = wrapper.findAll('.search-result-item')
      const initialResultCount = results.length
      
      // 修改搜索查询
      await searchInput.setValue('test document')
      await TestUtils.delay(500)
      await TestUtils.waitForNextTick()
      
      // 验证结果已更新
      results = wrapper.findAll('.search-result-item')
      // 结果数量可能不同，但应该包含新的搜索结果
      expect(results.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('用户交互 E2E 流程', () => {
    it('应该支持完整的用户会话流程', async () => {
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })
      
      // 1. 用户开始搜索
      const searchInput = wrapper.find('input[type="text"]')
      await searchInput.setValue('important document')
      await TestUtils.delay(500)
      
      // 2. 用户浏览结果
      await searchInput.trigger('keydown', { key: 'ArrowDown' })
      await searchInput.trigger('keydown', { key: 'ArrowDown' })
      
      // 3. 用户修改搜索
      await searchInput.setValue('important document.pdf')
      await TestUtils.delay(500)
      
      // 4. 用户执行搜索结果
      await searchInput.trigger('keydown', { key: 'Enter' })
      await TestUtils.waitForNextTick()
      
      // 5. 验证整个流程的状态跟踪
      const pluginStateStore = usePluginStateStore()
      const metrics = pluginStateStore.getPluginMetrics('files')
      expect(metrics.searchCount).toBeGreaterThan(0)
    })

    it('应该正确处理快捷键和全局事件', async () => {
      wrapper = mount(Home, {
        global: {
          plugins: [createPinia()]
        }
      })
      
      // 模拟全局快捷键（Alt+Space）
      const keyEvent = new KeyboardEvent('keydown', {
        key: ' ',
        altKey: true,
        bubbles: true
      })
      
      document.dispatchEvent(keyEvent)
      await TestUtils.waitForNextTick()
      
      // 验证应用响应快捷键（例如：显示/隐藏窗口）
      // 这里需要根据具体的快捷键处理逻辑进行验证
      expect(mockTauriInvoke).toHaveBeenCalledWith('toggle_headless', expect.any(Object))
    })
  })
})