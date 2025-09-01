import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSearchPluginManager } from '@/lib/search-plugin-manager'
import { InputValidator } from '@/lib/security/input-validator'
import { logger } from '@/lib/logger'

/**
 * 错误处理和边界情况测试
 * 验证系统在各种异常情况下的稳定性和恢复能力
 */

describe('错误处理和边界测试', () => {
  let pluginManager: ReturnType<typeof useSearchPluginManager>

  beforeEach(() => {
    // 重置插件管理器
    pluginManager = useSearchPluginManager()
    vi.clearAllMocks()
  })

  describe('输入验证边界情况', () => {
    it('应该处理空字符串输入', () => {
      const result = InputValidator.validateSearchQuery('')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('搜索查询不能为空')
    })

    it('应该处理只有空格的输入', () => {
      const result = InputValidator.validateSearchQuery('   ')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('搜索查询不能为空')
    })

    it('应该处理超长输入', () => {
      const longQuery = 'a'.repeat(1000)
      const result = InputValidator.validateSearchQuery(longQuery)
      
      expect(result.warnings).toContain('搜索查询过长，可能会影响性能')
      expect(result.sanitized.length).toBe(500)
    })

    it('应该处理包含危险字符的输入', () => {
      const dangerousQuery = '<script>alert("xss")</script>'
      const result = InputValidator.validateSearchQuery(dangerousQuery)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('危险字符或模式'))).toBe(true)
    })

    it('应该处理SQL注入尝试', () => {
      const sqlInjectionQuery = "SELECT * FROM users WHERE 1=1"
      const result = InputValidator.validateSearchQuery(sqlInjectionQuery)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('危险字符或模式'))).toBe(true)
    })

    it('应该处理命令注入尝试', () => {
      const commandInjectionQuery = "rm -rf / && ls"
      const result = InputValidator.validateSearchQuery(commandInjectionQuery)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('危险字符或模式'))).toBe(true)
    })

    it('应该处理路径遍历尝试', () => {
      const pathTraversalQuery = "../../../etc/passwd"
      const result = InputValidator.validateSearchQuery(pathTraversalQuery)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('危险字符或模式'))).toBe(true)
    })
  })

  describe('插件管理错误处理', () => {
    it('应该处理无效插件ID', () => {
      const invalidPluginIds = ['', null, undefined, 123, {}, []]
      
      for (const invalidId of invalidPluginIds) {
        expect(() => {
          InputValidator.validatePluginId(invalidId as string)
        }).toThrow()
      }
    })

    it('应该处理格式错误的插件ID', () => {
      const malformedIds = [
        '1invalid', // 数字开头
        'invalid plugin', // 包含空格
        'invalid@plugin', // 包含特殊字符
        'a', // 太短
        'a'.repeat(51) // 太长
      ]
      
      for (const malformedId of malformedIds) {
        const result = InputValidator.validatePluginId(malformedId)
        expect(result.isValid).toBe(false)
      }
    })

    it('应该处理保留字插件ID', () => {
      const reservedIds = ['system', 'admin', 'root', 'core', 'builtin']
      
      for (const reservedId of reservedIds) {
        const result = InputValidator.validatePluginId(reservedId)
        expect(result.warnings.some(warning => warning.includes('保留字'))).toBe(true)
      }
    })

    it('应该处理重复插件注册', async () => {
      const testPlugin = {
        id: 'duplicate-test-plugin',
        name: 'Duplicate Test Plugin',
        enabled: true,
        priority: 50,
        search: async () => []
      }

      // 第一次注册应该成功
      await pluginManager.register(testPlugin)
      
      // 第二次注册应该抛出错误
      await expect(pluginManager.register(testPlugin)).rejects.toThrow()
    })

    it('应该操作不存在的插件', async () => {
      const nonExistentPluginId = 'non-existent-plugin'
      
      // 操作不存在插件应该抛出错误
      await expect(pluginManager.enablePlugin(nonExistentPluginId)).rejects.toThrow()
      await expect(pluginManager.disablePlugin(nonExistentPluginId)).rejects.toThrow()
      await expect(pluginManager.unregister(nonExistentPluginId)).rejects.toThrow()
    })
  })

  describe('搜索错误处理', () => {
    it('应该处理插件搜索异常', async () => {
      const errorPlugin = {
        id: 'error-search-plugin',
        name: 'Error Search Plugin',
        enabled: true,
        priority: 50,
        search: async () => {
          throw new Error('Plugin search failed')
        }
      }

      await pluginManager.register(errorPlugin)
      
      // 搜索错误应该被优雅处理，返回空数组
      const results = await pluginManager.search('test query')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBe(0)
    })

    it('应该处理插件搜索超时', async () => {
      const timeoutPlugin = {
        id: 'timeout-search-plugin',
        name: 'Timeout Search Plugin',
        enabled: true,
        priority: 50,
        search: async () => {
          // 模拟超时
          await new Promise(resolve => setTimeout(resolve, 10000))
          return []
        }
      }

      await pluginManager.register(timeoutPlugin)
      
      // 设置较短的测试超时
      const startTime = Date.now()
      const results = await pluginManager.search('test query')
      const endTime = Date.now()
      
      // 验证结果仍然是数组（即使可能为空）
      expect(Array.isArray(results)).toBe(true)
    })

    it('应该处理插件返回无效结果', async () => {
      const invalidResultPlugin = {
        id: 'invalid-result-plugin',
        name: 'Invalid Result Plugin',
        enabled: true,
        priority: 50,
        search: async () => {
          // 返回无效结果
          return null as any
        }
      }

      await pluginManager.register(invalidResultPlugin)
      
      // 应该处理无效结果
      const results = await pluginManager.search('test query')
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('文件路径验证错误处理', () => {
    it('应该处理空文件路径', () => {
      const result = InputValidator.validateFilePath('')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('文件路径不能为空')
    })

    it('应该处理超长文件路径', () => {
      const longPath = 'a'.repeat(5000)
      const result = InputValidator.validateFilePath(longPath)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('文件路径过长')
    })

    it('应该处理包含危险字符的文件路径', () => {
      const dangerousPath = 'file<>name.txt'
      const result = InputValidator.validateFilePath(dangerousPath)
      
      expect(result.warnings.some(warning => warning.includes('非法字符'))).toBe(true)
    })

    it('应该处理路径遍历尝试', () => {
      const pathTraversalPath = '../../../etc/passwd'
      const result = InputValidator.validateFilePath(pathTraversalPath)
      
      expect(result.warnings.some(warning => warning.includes('路径遍历'))).toBe(true)
    })

    it('应该处理网络路径', () => {
      const networkPath = '\\\\server\\share\\file.txt'
      const result = InputValidator.validateFilePath(networkPath)
      
      expect(result.warnings.some(warning => warning.includes('网络路径'))).toBe(true)
    })
  })

  describe('数学表达式验证错误处理', () => {
    it('应该处理空数学表达式', () => {
      const result = InputValidator.validateMathExpression('')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('数学表达式不能为空')
    })

    it('应该处理超长数学表达式', () => {
      const longExpression = '1 + '.repeat(100)
      const result = InputValidator.validateMathExpression(longExpression)
      
      expect(result.warnings.some(warning => warning.includes('过长'))).toBe(true)
    })

    it('应该处理包含代码注入的数学表达式', () => {
      const maliciousExpression = 'function() { alert("xss") }()'
      const result = InputValidator.validateMathExpression(maliciousExpression)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('危险模式'))).toBe(true)
    })

    it('应该处理非数学内容的表达式', () => {
      const nonMathExpression = 'hello world'
      const result = InputValidator.validateMathExpression(nonMathExpression)
      
      expect(result.warnings.some(warning => warning.includes('不包含数学内容'))).toBe(true)
    })
  })

  describe('URL验证错误处理', () => {
    it('应该处理空URL', () => {
      const result = InputValidator.validateUrl('')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('URL不能为空')
    })

    it('应该处理无效URL格式', () => {
      const invalidUrls = [
        'not a url',
        'http://',
        'https://',
        'ftp://'
      ]
      
      for (const invalidUrl of invalidUrls) {
        const result = InputValidator.validateUrl(invalidUrl)
        expect(result.isValid).toBe(false)
      }
    })

    it('应该处理不支持的协议', () => {
      const unsupportedProtocolUrl = 'javascript:alert("xss")'
      const result = InputValidator.validateUrl(unsupportedProtocolUrl)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('不支持的协议'))).toBe(true)
    })

    it('应该处理超长URL', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000)
      const result = InputValidator.validateUrl(longUrl)
      
      expect(result.warnings.some(warning => warning.includes('过长'))).toBe(true)
    })

    it('应该自动补充缺失的协议', () => {
      const urlWithoutProtocol = 'example.com'
      const result = InputValidator.validateUrl(urlWithoutProtocol)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(warning => warning.includes('缺少协议'))).toBe(true)
      expect(result.sanitized).toBe('https://example.com')
    })
  })

  describe('内存和资源错误处理', () => {
    it('应该处理大量插件注册', async () => {
      const plugins = []
      const pluginCount = 100
      
      // 创建大量插件
      for (let i = 0; i < pluginCount; i++) {
        plugins.push({
          id: `stress-test-plugin-${i}`,
          name: `Stress Test Plugin ${i}`,
          enabled: true,
          priority: 50,
          search: async () => []
        })
      }
      
      // 批量注册插件
      for (const plugin of plugins) {
        await pluginManager.register(plugin)
      }
      
      // 验证所有插件都已注册
      const allPlugins = pluginManager.getAllPlugins()
      expect(allPlugins.length).toBe(pluginCount)
    })

    it('应该处理大量并发搜索请求', async () => {
      const testPlugin = {
        id: 'concurrent-search-plugin',
        name: 'Concurrent Search Plugin',
        enabled: true,
        priority: 50,
        search: async () => [
          { id: 'result-1', title: 'Test Result', description: 'Test description' }
        ]
      }

      await pluginManager.register(testPlugin)
      
      // 创建大量并发搜索请求
      const searchPromises = []
      const searchCount = 50
      
      for (let i = 0; i < searchCount; i++) {
        searchPromises.push(pluginManager.search(`test query ${i}`))
      }
      
      // 等待所有搜索完成
      const results = await Promise.all(searchPromises)
      
      // 验证所有搜索都返回了有效结果
      expect(results.length).toBe(searchCount)
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true)
      })
    })
  })

  describe('配置错误处理', () => {
    it('应该处理无效配置值', async () => {
      const pluginId = 'config-error-plugin'
      
      const testPlugin = {
        id: pluginId,
        name: 'Config Error Plugin',
        enabled: true,
        priority: 50,
        search: async () => []
      }

      await pluginManager.register(testPlugin)
      
      // 设置各种无效配置值
      const invalidConfigs = [
        null,
        undefined,
        () => {}, // 函数
        Symbol('test'), // Symbol
      ]
      
      for (const invalidConfig of invalidConfigs) {
        expect(() => {
          pluginManager.setPluginConfig(pluginId, invalidConfig as any)
        }).not.toThrow() // 应该优雅处理，不抛出错误
      }
    })

    it('应该处理配置读取错误', async () => {
      const nonExistentPluginId = 'non-existent-plugin'
      
      // 读取不存在插件的配置应该返回默认值
      const config = pluginManager.getPluginConfig(nonExistentPluginId)
      expect(config).toEqual({})
    })
  })

  describe('事件系统错误处理', () => {
    it('应该处理事件监听器错误', async () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      
      pluginManager.on('plugin:registered', errorListener)
      
      const testPlugin = {
        id: 'event-error-plugin',
        name: 'Event Error Plugin',
        enabled: true,
        priority: 50,
        search: async () => []
      }

      // 插件注册不应该因为监听器错误而失败
      await expect(pluginManager.register(testPlugin)).resolves.not.toThrow()
    })

    it('应该处理无效事件监听器', () => {
      const invalidListeners = [
        null,
        undefined,
        'not a function',
        123,
        {},
      ]
      
      for (const invalidListener of invalidListeners) {
        expect(() => {
          pluginManager.on('plugin:registered', invalidListener as any)
        }).not.toThrow() // 应该优雅处理
      }
    })
  })
})