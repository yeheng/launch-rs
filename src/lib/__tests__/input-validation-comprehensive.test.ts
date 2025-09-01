import { describe, it, expect, beforeEach } from 'vitest'
import { 
  InputValidator, 
  validateAndSanitizeSearchQuery, 
  validateFilePath, 
  validatePluginId, 
  validateMathExpression, 
  validateUrl, 
  sanitizeInput 
} from '@/lib/security/input-validator'

/**
 * 输入验证和消毒专项测试
 * 深度测试各种边界情况和攻击向量
 */

describe('输入验证和消毒专项测试', () => {
  describe('搜索查询验证测试', () => {
    it('应该正确处理空值和无效输入', () => {
      const invalidInputs = [
        '',
        '   ',
        '\t',
        '\n',
        '\r\n',
        ' \t\n\r ',
        null as any,
        undefined as any,
        0 as any,
        {} as any,
        [] as any
      ]

      for (const input of invalidInputs) {
        const result = InputValidator.validateSearchQuery(input as string)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      }
    })

    it('应该正确处理极短但有效的查询', () => {
      const shortValidQueries = [
        'a',
        '1',
        '.',
        '-',
        '_'
      ]

      for (const query of shortValidQueries) {
        const result = InputValidator.validateSearchQuery(query)
        expect(result.isValid).toBe(true)
        expect(result.sanitized).toBe(query.trim())
      }
    })

    it('应该检测各种编码的XSS攻击', () => {
      const xssPayloads = [
        // 基础脚本注入
        '<script>alert("XSS")</script>',
        '<SCRIPT>alert("XSS")</SCRIPT>',
        '<ScRiPt>alert("XSS")</sCrIpT>',
        
        // 事件处理器注入
        '<img src=x onerror="alert(\'XSS\')">',
        '<img src=x onerror=alert(\'XSS\')>',
        '<svg onload=alert(\'XSS\')>',
        '<body onload=alert(\'XSS\')>',
        '<input type="text" onfocus="alert(\'XSS\')">',
        
        // JavaScript协议
        'javascript:alert("XSS")',
        'JAVASCRIPT:alert("XSS")',
        'javascript:alert(String.fromCharCode(88,83,83))',
        
        // 数据URI
        'data:text/html,<script>alert(\'XSS\')</script>',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=',
        
        // CSS表达式
        '<style>body{background:expression(alert(\'XSS\'))}</style>',
        '<div style="background:expression(alert(\'XSS\'))">',
        
        // iframe注入
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<iframe src="data:text/html,<script>alert(\'XSS\')</script>"></iframe>',
        
        // SVG注入
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(\'XSS\')"/>',
        '<svg><script>alert(\'XSS\')</script></svg>',
        
        // Unicode编码
        '\u003Cscript\u003Ealert(\'XSS\')\u003C/script\u003E',
        '&#60;script&#62;alert(\'XSS\')&#60;/script&#62;',
        
        // 混合编码
        '%3Cscript%3Ealert(\'XSS\')%3C/script%3E',
        '%253Cscript%253Ealert(\'XSS\')%253C/script%253E',
        
        // HTML注释绕过
        '<!--<script>alert(\'XSS\')//-->',
        '<![CDATA[<script>alert(\'XSS\')</script>]]>',
        
        // 属性注入
        '<div data="x" onmouseover="alert(\'XSS\')">test</div>',
        '<a href="javascript:alert(\'XSS\')">click</a>',
        '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
        
        // 表单注入
        '<form action="javascript:alert(\'XSS\')"><input type=submit></form>',
        '<button onclick="alert(\'XSS\')">click</button>',
        
        // Meta标签注入
        '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
        '<meta http-equiv="Set-Cookie" content="test=xss">',
        
        // Object/embed注入
        '<object data="javascript:alert(\'XSS\')"></object>',
        '<embed src="javascript:alert(\'XSS\')">',
        
        // Base标签注入
        '<base href="javascript:alert(\'XSS\')//">',
        
        // Audio/Video注入
        '<audio src=x onerror=alert(\'XSS\')>',
        '<video src=x onerror=alert(\'XSS\')>',
        
        // Source/Track注入
        '<source src=x onerror=alert(\'XSS\')>',
        '<track src=x onerror=alert(\'XSS\')>',
        
        // Progress/Meter注入
        '<progress onmouseover="alert(\'XSS\')">',
        '<meter onmouseover="alert(\'XSS\')">',
        
        // 时间相关元素注入
        '<time onmouseover="alert(\'XSS\')">',
        
        // 模板注入
        '<template><script>alert(\'XSS\')</script></template>',
        
        // 详细信息元素注入
        '<details open ontoggle="alert(\'XSS\')">',
        
        // 图片相关注入
        '<picture><source srcset=x onerror=alert(\'XSS\')></picture>',
        '<image src=x onerror=alert(\'XSS\')>',
        
        // 引用注入
        '<blockquote cite="javascript:alert(\'XSS\')">',
        '<q cite="javascript:alert(\'XSS\')">',
        
        // 列表注入
        '<ul style="list-style-image: url(javascript:alert(\'XSS\'))">',
        
        // 表格相关注入
        '<table background="javascript:alert(\'XSS\')">',
        '<td background="javascript:alert(\'XSS\')">',
        
        // 其他元素注入
        '<marquee onstart="alert(\'XSS\')">test</marquee>',
        '<blink onmouseover="alert(\'XSS\')">test</blink>'
      ]

      for (const payload of xssPayloads) {
        const result = InputValidator.validateSearchQuery(payload)
        expect(result.isValid).toBe(false, `Payload should be rejected: ${payload}`)
        expect(result.errors.some(error => 
          error.includes('危险字符或模式') || 
          error.includes('脚本注入') ||
          error.includes('XSS')
        )).toBe(true, `Payload should trigger XSS detection: ${payload}`)
      }
    })

    it('应该检测各种SQL注入技术', () => {
      const sqlPayloads = [
        // 基础SQL注入
        'SELECT * FROM users',
        'SELECT username, password FROM users',
        'DROP TABLE users',
        'DELETE FROM users',
        'INSERT INTO users VALUES (\'admin\', \'password\')',
        'UPDATE users SET password=\'\'',
        
        // 条件注入
        '1 OR 1=1',
        '1\' OR \'1\'=\'1',
        'admin\'--',
        'admin\'#',
        '1\' OR 1--',
        '1\' UNION SELECT NULL--',
        
        // 时间盲注
        '1\' AND SLEEP(5)--',
        '1\' AND BENCHMARK(1000000,MD5(NOW()))--',
        '1\' WAITFOR DELAY \'0:0:5\'--',
        
        // 布尔盲注
        '1\' AND 1=1--',
        '1\' AND 1=2--',
        '1\' AND ASCII(SUBSTRING((SELECT password FROM users LIMIT 1),1,1))>64--',
        
        // 联合查询注入
        '1\' UNION SELECT username, password FROM users--',
        '1\' UNION SELECT NULL, version()--',
        '1\' UNION SELECT NULL, database()--',
        '1\' UNION SELECT NULL, user()--',
        
        // 堆叠查询
        '1\'; DROP TABLE users--',
        '1\'; SELECT * FROM users--',
        
        // 编码注入
        'SELECT * FROM users WHERE username = CHAR(97, 100, 109, 105, 110)',
        'SELECT * FROM users WHERE username = 0x61646D696E',
        
        // 注释绕过
        '1/**/UNION/**/SELECT/**/NULL--',
        '1/*!UNION*/SELECT/*!NULL*/--',
        '1%23%0AUNION%0ASELECT%0ANULL--',
        
        // 函数注入
        '1\' AND LOAD_FILE(\'/etc/passwd\')--',
        '1\' AND OUTFILE(\'/tmp/shell.php\')--',
        '1\' AND BENCHMARK(1000000,MD5(NOW()))--',
        
        // 存储过程注入
        '1\'; EXEC sp_configure \'xp_cmdshell\', 1; RECONFIGURE--',
        '1\'; EXEC xp_cmdshell \'dir\'--',
        
        // NoSQL注入
        '{$where: \'this.username == /admin/\'}',
        'db.collection.find({$where: function() { return this.username == "admin" }})',
        
        // XPath注入
        '//user[username/text()=\'admin\' and password/text()=\'password\']',
        '//user[contains(username, \'admin\')]',
        
        // LDAP注入
        '(uid=*)',
        '(|(uid=*)(cn=*))',
        '(uid=admin)(password=password)',
        
        // OS命令注入
        '1\' | ls -la',
        '1\' && whoami',
        '1\' ; cat /etc/passwd',
        '1\' $(cat /etc/passwd)',
        '1\' || cat /etc/passwd',
        
        // 混合攻击
        '1\'; DROP TABLE users; SELECT * FROM users--',
        '1\' UNION SELECT username, password FROM users WHERE 1=1--',
        'admin\'/**/OR/**/1=1--',
        '1%27%20UNION%20SELECT%20NULL%2C%20version%28%29--'
      ]

      for (const payload of sqlPayloads) {
        const result = InputValidator.validateSearchQuery(payload)
        expect(result.isValid).toBe(false, `SQL payload should be rejected: ${payload}`)
        expect(result.errors.some(error => 
          error.includes('危险字符或模式') || 
          error.includes('SQL注入') ||
          error.includes('命令注入')
        )).toBe(true, `Payload should trigger SQL detection: ${payload}`)
      }
    })

    it('应该正确处理国际化和Unicode字符', () => {
      const internationalQueries = [
        '中文测试',
        'café',
        'naïve',
        'résumé',
        'Москва',
        '北京',
        '東京',
        'العربية',
        'हिन्दी',
        '한국어',
        'ภาษาไทย',
        'tiếng Việt',
        'ελληνικά',
        'Café',
        'Mötley Crüe',
        'Spın̈al Tap',
        'ℌℯℓℓℴ 𝒲𝑜𝓇𝓁𝒹',
        '𝕿𝖊𝖘𝖙 𝖘𝖙𝖗𝖎𝖓𝖌',
        '🎵 音乐 🎶',
        'Hello 🌍',
        'Test 😊'
      ]

      for (const query of internationalQueries) {
        const result = InputValidator.validateSearchQuery(query)
        expect(result.isValid).toBe(true, `International query should be valid: ${query}`)
        expect(result.sanitized).toBe(query.trim())
      }
    })

    it('应该正确处理特殊符号和标点', () => {
      const symbolQueries = [
        'test@example.com',
        'https://example.com',
        'file:///path/to/file',
        'C:\\Windows\\System32',
        '/usr/local/bin',
        '$HOME/.config',
        '~/.bashrc',
        'test-file.txt',
        'test_file.txt',
        'test.file.txt',
        'test@domain.com',
        'user:password@host:port',
        '192.168.1.1',
        '2001:db8::1',
        'test(1)',
        'test[1]',
        'test{1}',
        'test<1>',
        'test"1"',
        'test\'1\'',
        'test/1',
        'test\\1',
        'test|1',
        'test?1',
        'test*1',
        'test+1',
        'test=1',
        'test#1',
        'test$1',
        'test%1',
        'test&1',
        'test^1',
        'test!1',
        'test~1',
        'test`1`'
      ]

      for (const query of symbolQueries) {
        const result = InputValidator.validateSearchQuery(query)
        if (!result.isValid) {
          // 某些符号可能被标记为警告，但不应该使查询无效
          expect(result.errors.length).toBe(0, `Symbol query should not have errors: ${query}`)
        }
        expect(result.sanitized).toBeDefined()
      }
    })

    it('应该正确处理边界长度情况', () => {
      // 刚好在边界内
      const validLengthQuery = 'a'.repeat(500)
      const result = InputValidator.validateSearchQuery(validLengthQuery)
      expect(result.isValid).toBe(true)
      expect(result.sanitized.length).toBe(500)

      // 刚好超出边界
      const longQuery = 'a'.repeat(501)
      const longResult = InputValidator.validateSearchQuery(longQuery)
      expect(longResult.isValid).toBe(true)
      expect(longResult.warnings).toContain('搜索查询过长，可能会影响性能')
      expect(longResult.sanitized.length).toBe(500)

      // 极长查询
      const veryLongQuery = 'a'.repeat(10000)
      const veryLongResult = InputValidator.validateSearchQuery(veryLongQuery)
      expect(veryLongResult.isValid).toBe(true)
      expect(veryLongResult.sanitized.length).toBe(500)
    })

    it('应该正确清理控制字符和不可见字符', () => {
      const queriesWithControlChars = [
        'test\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0B\x0C\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1Fquery',
        'test\u2028\u2029query',
        'test\u200B\u200C\u200D\u2060query',
        'test\uFEFFquery',
        'test\t\n\r\v\fquery',
        'test\u0000query',
        'test\u0008query',
        'test\u001Bquery'
      ]

      for (const query of queriesWithControlChars) {
        const result = InputValidator.validateSearchQuery(query)
        expect(result.isValid).toBe(true)
        
        // 验证控制字符被清理
        expect(result.sanitized).not.toContain('\x00')
        expect(result.sanitized).not.toContain('\x1F')
        expect(result.sanitized).not.toContain('\u2028')
        expect(result.sanitized).not.toContain('\u2029')
        
        // 验证有效内容保留
        expect(result.sanitized).toContain('test')
        expect(result.sanitized).toContain('query')
      }
    })

    it('应该检测重复和混淆的攻击模式', () => {
      const obfuscatedPayloads = [
        // 重复的危险模式
        '<script><script>alert("XSS")</script></script>',
        'javascript:javascript:alert("XSS")',
        'data:data:text/html,<script>alert("XSS")</script>',
        
        // 编码混淆
        '%3Cscript%3Ealert("XSS")%3C/script%3E',
        '%253Cscript%253Ealert("XSS")%253C/script%253E',
        '&#60;script&#62;alert("XSS")&#60;/script&#62;',
        '&lt;script&gt;alert("XSS")&lt;/script&gt;',
        
        // 大小写混淆
        'JaVaScRiPt:alert("XSS")',
        'ScRiPt:alert("XSS")',
        'OnLoAd=alert("XSS")',
        
        // 注释混淆
        '<script/*test*/>alert("XSS")</script>',
        '<script>alert(/*test*/"XSS")</script>',
        '<script>alert("XSS"/*test*/)</script>',
        
        // 空格混淆
        '<script >alert("XSS")</script>',
        '<script\n>alert("XSS")</script>',
        '<script\r>alert("XSS")</script>',
        '<script\t>alert("XSS")</script>',
        
        // 字符串混淆
        '<script>alert(String.fromCharCode(88,83,83))</script>',
        '<script>alert(\'X\' + \'S\' + \'S\')</script>',
        '<script>alert(/XSS/.source)</script>',
        
        // DOM基础XSS
        'document.location="javascript:alert(\'XSS\')"',
        'window.location=\'javascript:alert(\'XSS\')\'',
        'eval(alert(\'XSS\'))',
        'setTimeout(alert(\'XSS\'),0)',
        'setInterval(alert(\'XSS\'),1000)',
        
        // CSS表达式
        'expression(alert("XSS"))',
        '-moz-binding:url(test.xml#xss)',
        'behavior:url(test.htc)',
        
        // VBScript
        'vbscript:alert("XSS")',
        'vbscript:Execute("alert(\'XSS\')")',
        
        // Flash
        'flash:alert("XSS")',
        'data:application/x-shockwave-flash,<script>alert("XSS")</script>'
      ]

      for (const payload of obfuscatedPayloads) {
        const result = InputValidator.validateSearchQuery(payload)
        expect(result.isValid).toBe(false, `Obfuscated payload should be rejected: ${payload}`)
      }
    })

    it('应该正确处理数字和字母组合', () => {
      const alphanumericQueries = [
        '123',
        'abc',
        '123abc',
        'abc123',
        'a1b2c3',
        'test123',
        '123test',
        'UPPERCASE',
        'lowercase',
        'MixedCase',
        'camelCase',
        'snake_case',
        'kebab-case',
        'PascalCase',
        'test123file',
        'file123test',
        'version1.0',
        '2.5.1',
        '192.168.1.1',
        '2001:db8::1',
        'MD5',
        'SHA256',
        'AES256',
        'RSA2048',
        'UTF8',
        'ASCII',
        'HTML5',
        'CSS3',
        'ES6',
        'Node.js',
        'React18',
        'Vue3',
        'TypeScript',
        'JavaScript',
        'Python3.9',
        'Java17',
        'C++17',
        'Rust1.60',
        'Go1.18',
        'Docker20.10',
        'Kubernetes1.24',
        'Ubuntu22.04',
        'Windows11',
        'macOS13',
        'iOS16',
        'Android13',
        'Chrome106',
        'Firefox105',
        'Safari16',
        'Edge106'
      ]

      for (const query of alphanumericQueries) {
        const result = InputValidator.validateSearchQuery(query)
        expect(result.isValid).toBe(true, `Alphanumeric query should be valid: ${query}`)
        expect(result.sanitized).toBe(query.trim())
      }
    })
  })

  describe('文件路径验证测试', () => {
    it('应该验证各种文件路径格式', () => {
      const validPaths = [
        // Unix路径
        '/home/user/file.txt',
        '/tmp/test',
        '/var/log/system.log',
        '/usr/local/bin/script.sh',
        '/etc/config.conf',
        '/opt/app/data.json',
        
        // Windows路径
        'C:\\Users\\User\\Documents\\file.txt',
        'D:\\Projects\\app\\src\\main.js',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        'E:\\Data\\backup\\2023\\archive.zip',
        
        // 相对路径
        './file.txt',
        '../parent/file.txt',
        '../../grandparent/file.txt',
        './scripts/build.sh',
        '../src/components/App.js',
        
        // 网络路径
        '\\\\server\\share\\file.txt',
        '\\\\192.168.1.100\\shared\\data.csv',
        
        // 简单文件名
        'file.txt',
        'document.pdf',
        'image.jpg',
        'script.js',
        'style.css',
        'data.json',
        'config.xml',
        'archive.zip',
        'video.mp4',
        'audio.mp3'
      ]

      const invalidPaths = [
        // 路径遍历攻击
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd/../../../etc/passwd',
        'C:\\Windows\\..\\..\\..\\boot.ini',
        
        // 危险字符
        'file<name>.txt',
        'file>name.txt',
        'file:name.txt',
        'file"name.txt',
        'file|name.txt',
        'file?name.txt',
        'file*name.txt',
        
        // 空路径
        '',
        '   ',
        '\t',
        '\n',
        
        // 过长路径
        'a'.repeat(5000),
        
        // 无效格式
        'con', // Windows设备名
        'prn',
        'aux',
        'nul',
        'com1',
        'lpt1',
        
        // 协议注入
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'ftp://evil.com/malware.exe',
        'http://evil.com/shell.php'
      ]

      for (const path of validPaths) {
        const result = InputValidator.validateFilePath(path)
        expect(result.isValid).toBe(true, `Valid path should be accepted: ${path}`)
      }

      for (const path of invalidPaths) {
        const result = InputValidator.validateFilePath(path)
        expect(result.isValid).toBe(false, `Invalid path should be rejected: ${path}`)
      }
    })

    it('应该正确处理路径清理', () => {
      const dirtyPaths = [
        {
          input: '  /path/to/file.txt  ',
          expected: '/path/to/file.txt'
        },
        {
          input: 'file<name>.txt',
          expected: 'filename.txt'
        },
        {
          input: 'file>name.txt',
          expected: 'filename.txt'
        },
        {
          input: 'file:name.txt',
          expected: 'filename.txt'
        },
        {
          input: 'file"name.txt',
          expected: 'filename.txt'
        },
        {
          input: 'file|name.txt',
          expected: 'filename.txt'
        },
        {
          input: 'file?name.txt',
          expected: 'filename.txt'
        },
        {
          input: 'file*name.txt',
          expected: 'filename.txt'
        }
      ]

      for (const { input, expected } of dirtyPaths) {
        const result = InputValidator.validateFilePath(input)
        expect(result.sanitized).toBe(expected, `Path should be sanitized correctly: ${input}`)
      }
    })
  })

  describe('通用输入消毒测试', () => {
    it('应该正确处理各种消毒选项', () => {
      const testCases = [
        {
          input: '<script>alert("XSS")</script>',
          options: { allowHtml: false },
          expected: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
        },
        {
          input: '<script>alert("XSS")</script>',
          options: { allowHtml: true },
          expected: '<script>alert("XSS")</script>'
        },
        {
          input: 'javascript:alert("XSS")',
          options: { allowScripts: false },
          expected: 'javascript-disabled:alert("XSS")'
        },
        {
          input: 'javascript:alert("XSS")',
          options: { allowScripts: true },
          expected: 'javascript:alert("XSS")'
        },
        {
          input: '  test  ',
          options: { trim: false },
          expected: '  test  '
        },
        {
          input: '  test  ',
          options: { trim: true },
          expected: 'test'
        },
        {
          input: 'a'.repeat(100),
          options: { maxLength: 50 },
          expected: 'a'.repeat(50)
        },
        {
          input: 'test\x00\x01\x02',
          options: {},
          expected: 'test'
        }
      ]

      for (const { input, options, expected } of testCases) {
        const result = sanitizeInput(input, options)
        expect(result).toBe(expected, `Input should be sanitized correctly: ${input}`)
      }
    })

    it('应该正确处理复杂的消毒场景', () => {
      const complexInputs = [
        {
          input: '<script>alert("XSS")</script> Click <a href="javascript:evil()">here</a>',
          options: { allowHtml: false, allowScripts: false },
          expectedContains: ['&lt;script&gt;', 'javascript-disabled:', '&lt;a href=']
        },
        {
          input: '  Multiple   Spaces   and\t\ttabs\n\n',
          options: { trim: true },
          expected: 'Multiple   Spaces   and\t\ttabs'
        },
        {
          input: 'Normal text with some <em>HTML</em> and "quotes"',
          options: { allowHtml: true },
          expectedContains: ['<em>', 'HTML', '</em>', '"']
        },
        {
          input: 'Data with\x00null\x01bytes\x1F',
          options: {},
          expectedNotContains: ['\x00', '\x01', '\x1F']
        }
      ]

      for (const { input, options, expectedContains, expectedNotContains } of complexInputs) {
        const result = sanitizeInput(input, options)
        
        if (expectedContains) {
          for (const expected of expectedContains) {
            expect(result).toContain(expected, `Result should contain: ${expected}`)
          }
        }
        
        if (expectedNotContains) {
          for (const notExpected of expectedNotContains) {
            expect(result).not.toContain(notExpected, `Result should not contain: ${notExpected}`)
          }
        }
      }
    })
  })

  describe('性能测试', () => {
    it('应该快速处理大量验证请求', () => {
      const testQueries = Array.from({ length: 1000 }, (_, i) => `test query ${i} with some ${i % 2 === 0 ? 'safe' : 'content'}`)
      
      const startTime = performance.now()
      
      for (const query of testQueries) {
        InputValidator.validateSearchQuery(query)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const avgTime = duration / testQueries.length
      
      // 平均每次验证应该小于0.1ms
      expect(avgTime).toBeLessThan(0.1)
      console.log(`Average validation time: ${avgTime.toFixed(4)}ms`)
    })

    it('应该高效处理超长输入', () => {
      const veryLongInput = 'a'.repeat(100000) // 100KB
      
      const startTime = performance.now()
      const result = InputValidator.validateSearchQuery(veryLongInput)
      const endTime = performance.now()
      
      const duration = endTime - startTime
      
      // 应该在50ms内完成
      expect(duration).toBeLessThan(50)
      expect(result.sanitized.length).toBe(500) // 应该被截断
      console.log(`Very long input processing time: ${duration.toFixed(4)}ms`)
    })

    it('应该高效处理大量路径验证', () => {
      const testPaths = Array.from({ length: 1000 }, (_, i) => 
        `/path/to/file${i}.txt`
      )
      
      const startTime = performance.now()
      
      for (const path of testPaths) {
        InputValidator.validateFilePath(path)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const avgTime = duration / testPaths.length
      
      // 平均每次验证应该小于0.05ms
      expect(avgTime).toBeLessThan(0.05)
      console.log(`Average path validation time: ${avgTime.toFixed(4)}ms`)
    })
  })
})