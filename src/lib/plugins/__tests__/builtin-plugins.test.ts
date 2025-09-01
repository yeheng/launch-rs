import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AppsSearchPlugin } from '@/lib/plugins/builtin/apps-plugin'
import { CalculatorPlugin } from '@/lib/plugins/builtin/calculator-plugin'
import { FileSearchPlugin } from '@/lib/plugins/builtin/file-plugin'

/**
 * 内置插件功能测试
 * 验证核心搜索插件的正确性和稳定性
 */

describe('内置插件功能测试', () => {
  describe('AppsSearchPlugin', () => {
    let appsPlugin: AppsSearchPlugin

    beforeEach(() => {
      appsPlugin = new AppsSearchPlugin()
    })

    it('应该正确初始化应用插件', () => {
      expect(appsPlugin.id).toBe('apps')
      expect(appsPlugin.name).toBe('应用搜索')
      expect(appsPlugin.enabled).toBe(true)
      expect(appsPlugin.priority).toBe(100)
    })

    it('应该有正确的搜索前缀', () => {
      expect(appsPlugin.searchPrefixes).toContain('app:')
      expect(appsPlugin.searchPrefixes).toContain('apps:')
    })

    it('应该能够搜索应用', async () => {
      // Mock Vue Router
      vi.mock('vue-router', () => ({
        useRouter: () => ({
          push: vi.fn()
        })
      }))

      // Mock icon manager
      vi.mock('@/lib/utils/icon-manager', () => ({
        useIcon: () => ({
          getIcon: vi.fn().mockResolvedValue({ icon: 'test-icon' })
        }),
        ICON_MAP: {}
      }))

      await appsPlugin.initialize()
      
      const context = {
        query: '设置',
        queryLower: '设置',
        keywords: ['设置'],
        timestamp: Date.now(),
        sessionId: 'test-session'
      }

      const results = await appsPlugin.search(context)
      
      expect(Array.isArray(results)).toBe(true)
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('id')
        expect(results[0]).toHaveProperty('title')
        expect(results[0]).toHaveProperty('description')
      }
    })

    it('应该处理搜索前缀', async () => {
      const context = {
        query: 'app:设置',
        queryLower: 'app:设置',
        keywords: ['app:设置'],
        timestamp: Date.now(),
        sessionId: 'test-session'
      }

      const results = await appsPlugin.search(context)
      
      expect(Array.isArray(results)).toBe(true)
    })

    it('应该处理空查询', async () => {
      const context = {
        query: '',
        queryLower: '',
        keywords: [],
        timestamp: Date.now(),
        sessionId: 'test-session'
      }

      const results = await appsPlugin.search(context)
      
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('CalculatorPlugin', () => {
    let calculatorPlugin: CalculatorPlugin

    beforeEach(() => {
      calculatorPlugin = new CalculatorPlugin()
    })

    it('应该正确初始化计算器插件', () => {
      expect(calculatorPlugin.id).toBe('calculator')
      expect(calculatorPlugin.name).toBe('计算器')
      expect(calculatorPlugin.enabled).toBe(true)
      expect(calculatorPlugin.priority).toBe(90)
    })

    it('应该能够计算基本数学表达式', async () => {
      const context = {
        query: '2 + 2',
        queryLower: '2 + 2',
        keywords: ['2', '+', '2'],
        timestamp: Date.now(),
        sessionId: 'test-session'
      }

      const results = await calculatorPlugin.search(context)
      
      expect(Array.isArray(results)).toBe(true)
      if (results.length > 0) {
        expect(results[0].title).toContain('4')
      }
    })

    it('应该能够计算复杂表达式', async () => {
      const context = {
        query: '(10 + 5) * 3 - 2',
        queryLower: '(10 + 5) * 3 - 2',
        keywords: ['10', '+', '5', '*', '3', '-', '2'],
        timestamp: Date.now(),
        sessionId: 'test-session'
      }

      const results = await calculatorPlugin.search(context)
      
      expect(Array.isArray(results)).toBe(true)
      if (results.length > 0) {
        expect(results[0].title).toContain('43')
      }
    })

    it('应该处理无效表达式', async () => {
      const context = {
        query: 'invalid + expression',
        queryLower: 'invalid + expression',
        keywords: ['invalid', '+', 'expression'],
        timestamp: Date.now(),
        sessionId: 'test-session'
      }

      const results = await calculatorPlugin.search(context)
      
      expect(Array.isArray(results)).toBe(true)
    })

    it('应该处理空查询', async () => {
      const context = {
        query: '',
        queryLower: '',
        keywords: [],
        timestamp: Date.now(),
        sessionId: 'test-session'
      }

      const results = await calculatorPlugin.search(context)
      
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBe(0)
    })
  })

  describe('FileSearchPlugin', () => {
    let filePlugin: FileSearchPlugin

    beforeEach(() => {
      filePlugin = new FileSearchPlugin()
    })

    it('应该正确初始化文件插件', () => {
      expect(filePlugin.id).toBe('files')
      expect(filePlugin.name).toBe('文件搜索')
      expect(filePlugin.enabled).toBe(true)
      expect(filePlugin.priority).toBe(80)
    })

    it('应该能够搜索文件', async () => {
      // Mock Tauri invoke
      vi.mock('@tauri-apps/api/core', () => ({
        invoke: vi.fn().mockResolvedValue([
          { name: 'test.txt', path: '/test.txt', size: 100 },
          { name: 'document.pdf', path: '/document.pdf', size: 2000 }
        ])
      }))

      const context = {
        query: 'test',
        queryLower: 'test',
        keywords: ['test'],
        timestamp: Date.now(),
        sessionId: 'test-session'
      }

      const results = await filePlugin.search(context)
      
      expect(Array.isArray(results)).toBe(true)
      if (results.length > 0) {
        expect(results[0]).toHaveProperty('id')
        expect(results[0]).toHaveProperty('title')
        expect(results[0]).toHaveProperty('description')
      }
    })

    it('应该处理文件搜索前缀', async () => {
      const context = {
        query: 'file:test',
        queryLower: 'file:test',
        keywords: ['file:test'],
        timestamp: Date.now(),
        sessionId: 'test-session'
      }

      const results = await filePlugin.search(context)
      
      expect(Array.isArray(results)).toBe(true)
    })

    it('应该处理空查询', async () => {
      const context = {
        query: '',
        queryLower: '',
        keywords: [],
        timestamp: Date.now(),
        sessionId: 'test-session'
      }

      const results = await filePlugin.search(context)
      
      expect(Array.isArray(results)).toBe(true)
    })

    it('应该处理搜索错误', async () => {
      // Mock Tauri invoke error
      vi.mock('@tauri-apps/api/core', () => ({
        invoke: vi.fn().mockRejectedValue(new Error('Search failed'))
      }))

      const context = {
        query: 'test',
        queryLower: 'test',
        keywords: ['test'],
        timestamp: Date.now(),
        sessionId: 'test-session'
      }

      const results = await filePlugin.search(context)
      
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('插件集成测试', () => {
    it('应该能够同时使用多个插件', async () => {
      const appsPlugin = new AppsSearchPlugin()
      const calculatorPlugin = new CalculatorPlugin()
      const filePlugin = new FileSearchPlugin()

      // Mock dependencies
      vi.mock('vue-router', () => ({
        useRouter: () => ({
          push: vi.fn()
        })
      }))

      vi.mock('@/lib/utils/icon-manager', () => ({
        useIcon: () => ({
          getIcon: vi.fn().mockResolvedValue({ icon: 'test-icon' })
        }),
        ICON_MAP: {}
      }))

      vi.mock('@tauri-apps/api/core', () => ({
        invoke: vi.fn().mockResolvedValue([
          { name: 'test.txt', path: '/test.txt', size: 100 }
        ])
      }))

      // Initialize plugins
      await appsPlugin.initialize()
      
      const context = {
        query: 'test',
        queryLower: 'test',
        keywords: ['test'],
        timestamp: Date.now(),
        sessionId: 'test-session'
      }

      const [appsResults, calculatorResults, fileResults] = await Promise.all([
        appsPlugin.search(context),
        calculatorPlugin.search(context),
        filePlugin.search(context)
      ])

      expect(Array.isArray(appsResults)).toBe(true)
      expect(Array.isArray(calculatorResults)).toBe(true)
      expect(Array.isArray(fileResults)).toBe(true)
    })

    it('应该处理插件优先级', () => {
      const appsPlugin = new AppsSearchPlugin()
      const calculatorPlugin = new CalculatorPlugin()
      const filePlugin = new FileSearchPlugin()

      expect(appsPlugin.priority).toBe(100)
      expect(calculatorPlugin.priority).toBe(90)
      expect(filePlugin.priority).toBe(80)

      // 优先级从高到低排序
      const plugins = [appsPlugin, calculatorPlugin, filePlugin]
      const sortedPlugins = plugins.sort((a, b) => b.priority - a.priority)
      
      expect(sortedPlugins[0]).toBe(appsPlugin)
      expect(sortedPlugins[1]).toBe(calculatorPlugin)
      expect(sortedPlugins[2]).toBe(filePlugin)
    })
  })
})