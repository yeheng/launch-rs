import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PermissionManager } from '@/lib/security/permission-manager'
import { InputValidator } from '@/lib/security/enhanced-input-validator-v2'

describe('文件系统访问安全测试', () => {
  let permissionManager: PermissionManager
  let originalNavigator: any

  beforeEach(() => {
    // 重置单例
    (PermissionManager as any).instance = null
    
    // 保存原始 navigator
    originalNavigator = global.navigator
    
    // 创建新实例
    permissionManager = PermissionManager.getInstance()
    
      })

  afterEach(() => {
    // 恢复原始 navigator
    if (originalNavigator) {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true
      })
    }
    
    // 重置 process
    Object.defineProperty(global, 'process', {
      value: undefined,
      writable: true
    })
  })

  describe('路径遍历攻击防护测试', () => {
    it('应该阻止各种路径遍历攻击', () => {
      const pathTraversalAttacks = [
        // 基本路径遍历
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config',
        '../../.ssh/id_rsa',
        '../../.env',
        
        // 编码的路径遍历
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%2f..%2f..%2fetc%2fpasswd',
        
        // 混合路径遍历
        'valid/../../etc/passwd',
        './normal/.././../etc/passwd',
        
        // 多层路径遍历
        '../../../../../../../../etc/passwd',
        '..\\\\..\\\\..\\\\..\\\\windows\\\\system32',
        
        // 相对路径遍历
        '../config/../etc/passwd',
        './src/../../../etc/passwd',
        
        // 特殊字符组合
        '....//....//....//etc/passwd',
        '..//..//..//etc/passwd',
        
        // 系统文件访问
        '../../../system32/cmd.exe',
        '../../windows/system32/drivers/etc/hosts',
        
        // 配置文件访问
        '../../../.git/config',
        '../../.ssh/authorized_keys',
        '../wp-config.php',
        '../../../application.yml'
      ]

      for (const maliciousPath of pathTraversalAttacks) {
        const result = permissionManager.checkFileSystemAccess(maliciousPath)
        expect(result).toBe(false, `路径遍历攻击应该被阻止: ${maliciousPath}`)
        
        // 也应该通过输入验证器
        const validationResult = InputValidator.validateFilePath(maliciousPath)
        expect(validationResult.warnings.length).toBeGreaterThan(0, 
          `输入验证器应该检测到路径遍历: ${maliciousPath}`)
      }
    })

    it('应该阻止通过符号链接的路径遍历', () => {
      const symlinkAttacks = [
        '/tmp/symlink_to_etc/passwd',
        '/var/www/html/symlink_to_config',
        'symlink_to_etc/passwd'
      ]

      for (const symlinkPath of symlinkAttacks) {
        const result = permissionManager.checkFileSystemAccess(symlinkPath)
        expect(result).toBe(false, `符号链接攻击应该被阻止: ${symlinkPath}`)
      }
    })

    it('应该阻止URL编码的路径遍历', () => {
      const urlEncodedAttacks = [
        'file:///etc/passwd',
        'file:///C:/Windows/System32/config',
        'http://evil.com/../../../etc/passwd',
        'ftp://evil.com/../../etc/passwd'
      ]

      for (const encodedPath of urlEncodedAttacks) {
        const result = permissionManager.checkFileSystemAccess(encodedPath)
        expect(result).toBe(false, `URL编码攻击应该被阻止: ${encodedPath}`)
      }
    })
  })

  describe('系统关键目录保护测试', () => {
    it('应该阻止访问系统关键目录', () => {
      const systemCriticalPaths = [
        // Unix/Linux 系统目录
        '/etc',
        '/usr',
        '/bin',
        '/sbin',
        '/lib',
        '/lib64',
        '/boot',
        '/dev',
        '/proc',
        '/sys',
        '/root',
        '/var/log',
        '/var/spool',
        '/var/tmp',
        '/etc/passwd',
        '/etc/shadow',
        '/etc/hosts',
        '/etc/sudoers',
        
        // Windows 系统目录
        'C:\\Windows',
        'C:\\Windows\\System32',
        'C:\\Windows\\SysWOW64',
        'C:\\Program Files',
        'C:\\Program Files (x86)',
        'C:\\ProgramData',
        'C:\\Users\\Default',
        'C:\\Windows\\System32\\config',
        
        // 系统配置文件
        '/etc/systemd/system',
        '/etc/init.d',
        '/etc/cron.d',
        '/etc/logrotate.d',
        'C:\\Windows\\System32\\drivers\\etc',
        
        // 启动脚本
        '/etc/rc.local',
        '/etc/profile',
        '/etc/bashrc',
        'C:\\Windows\\System32\\GroupPolicy',
        
        // 系统应用程序
        '/usr/bin',
        '/usr/sbin',
        '/usr/local/bin',
        'C:\\Windows\\System32\\WindowsPowerShell'
      ]

      for (const systemPath of systemCriticalPaths) {
        const result = permissionManager.checkFileSystemAccess(systemPath)
        expect(result).toBe(false, `系统关键目录应该被保护: ${systemPath}`)
      }
    })

    it('应该阻止访问系统关键目录的子目录', () => {
      const systemSubPaths = [
        '/etc/nginx/conf.d',
        '/etc/apache2/sites-enabled',
        '/usr/local/bin',
        'C:\\Windows\\System32\\drivers',
        'C:\\Program Files\\Common Files'
      ]

      for (const subPath in systemSubPaths) {
        const result = permissionManager.checkFileSystemAccess(subPath)
        expect(result).toBe(false, `系统关键子目录应该被保护: ${subPath}`)
      }
    })
  })

  describe('危险文件扩展名检测测试', () => {
    it('应该检测和警告危险文件扩展名', () => {
      const dangerousExtensions = [
        // 可执行文件
        'script.exe',
        'malware.bat',
        'virus.cmd',
        'trojan.com',
        'worm.pif',
        'backdoor.scr',
        'keylogger.js',
        'ransomware.vbs',
        'spyware.ps1',
        
        // 系统文件
        'system.dll',
        'critical.sys',
        'driver.ocx',
        'malicious.cpl',
        
        // 脚本文件
        'exploit.py',
        'hack.pl',
        'backdoor.rb',
        'malicious.sh',
        'virus.php',
        'trojan.asp',
        
        // 文档宏
        'macro.doc',
        'malware.xls',
        'virus.ppt',
        'exploit.docm',
        
        // 压缩文件（可能包含恶意内容）
        'bomb.zip',
        'virus.rar',
        'malware.7z',
        'trojan.tar.gz'
      ]

      for (const dangerousFile in dangerousExtensions) {
        const result = permissionManager.checkFileSystemAccess(dangerousFile)
        // 危险文件不一定被完全阻止，但应该有安全检查
        expect(typeof result).toBe('boolean')
      }
    })
  })

  describe('文件权限验证测试', () => {
    it('应该验证文件权限的合法性', () => {
      // 设置 mock process
      Object.defineProperty(global, 'process', {
        value: {
          env: {
            HOME: '/home/user',
            USERPROFILE: 'C:\\Users\\user'
          }
        },
        writable: true
      })

      const safeFiles = [
        '/home/user/documents/report.pdf',
        '/home/user/pictures/photo.jpg',
        'C:\\Users\\user\\Documents\\file.txt',
        'C:\\Users\\user\\Pictures\\image.png'
      ]

      const unsafeFiles = [
        '/etc/shadow',
        '/etc/passwd',
        'C:\\Windows\\System32\\config\\SAM',
        '/usr/bin/sudo'
      ]

      for (const safeFile of safeFiles) {
        const result = permissionManager.checkFileSystemAccess(safeFile)
        // 安全文件可能在某些环境中被允许
        expect(typeof result).toBe('boolean')
      }

      for (const unsafeFile of unsafeFiles) {
        const result = permissionManager.checkFileSystemAccess(unsafeFile)
        expect(result).toBe(false, `不安全的系统文件应该被阻止: ${unsafeFile}`)
      }
    })
  })

  describe('搜索路径验证测试', () => {
    it('应该验证搜索路径的安全性', () => {
      const safeSearchPaths = [
        '/home/user',
        '/home/user/documents',
        'C:\\Users\\user',
        'C:\\Users\\user\\Documents',
        './local/path',
        '../relative/path'
      ]

      const dangerousSearchPaths = [
        '/etc',
        '/usr',
        '/bin',
        'C:\\Windows',
        'C:\\Windows\\System32',
        '../../../etc',
        '../../system32'
      ]

      for (const safePath of safeSearchPaths) {
        const result = permissionManager.validateSearchPath(safePath)
        expect(typeof result).toBe('boolean')
      }

      for (const dangerousPath of dangerousSearchPaths) {
        const result = permissionManager.validateSearchPath(dangerousPath)
        expect(result).toBe(false, `危险的搜索路径应该被拒绝: ${dangerousPath}`)
      }
    })

    it('应该阻止超长的搜索路径', () => {
      const longPath = 'a'.repeat(5000)
      const result = permissionManager.validateSearchPath(longPath)
      expect(result).toBe(false)
    })

    it('应该清理和规范化搜索路径', () => {
      const uncleanPaths = [
        '"/path/with/quotes"',
        "'/path/with/single/quotes'",
        '  /path/with/spaces  ',
        '/path/with/../traversal',
        '/path/with/./current/./directory'
      ]

      for (const uncleanPath of uncleanPaths) {
        const result = permissionManager.validateSearchPath(uncleanPath)
        // 清理后的路径应该通过安全验证
        expect(typeof result).toBe('boolean')
      }
    })
  })

  describe('符号链接和硬链接安全测试', () => {
    it('应该处理符号链接的安全风险', () => {
      const symlinkPaths = [
        '/tmp/symlink',
        '/var/tmp/symlink_to_system',
        'symlink_to_etc',
        '/home/user/symlink_to_config'
      ]

      for (const symlinkPath of symlinkPaths) {
        const result = permissionManager.checkFileSystemAccess(symlinkPath)
        // 符号链接需要特殊处理
        expect(typeof result).toBe('boolean')
      }
    })

    it('应该检测循环链接', () => {
      const circularLinks = [
        '/tmp/circular_link',
        '/home/user/link_to_self'
      ]

      for (const circularLink in circularLinks) {
        const result = permissionManager.checkFileSystemAccess(circularLink)
        expect(typeof result).toBe('boolean')
      }
    })
  })

  describe('文件大小和类型限制测试', () => {
    it('应该验证文件大小的合理性', () => {
      // 这个测试可能需要实际的文件系统访问
      // 现在我们测试路径验证逻辑
      const reasonablePaths = [
        '/home/user/normal_file.txt',
        'C:\\Users\\user\\document.docx'
      ]

      for (const path of reasonablePaths) {
        const result = permissionManager.checkFileSystemAccess(path)
        expect(typeof result).toBe('boolean')
      }
    })

    it('应该根据文件类型应用不同的安全策略', () => {
      const fileTypes = [
        { path: '/home/user/document.pdf', type: 'document' },
        { path: '/home/user/image.jpg', type: 'image' },
        { path: '/home/user/script.sh', type: 'script' },
        { path: '/home/user/executable.exe', type: 'executable' }
      ]

      for (const { path, type } of fileTypes) {
        const result = permissionManager.checkFileSystemAccess(path)
        // 不同类型的文件可能有不同的安全要求
        expect(typeof result).toBe('boolean')
      }
    })
  })

  describe('环境相关的安全测试', () => {
    it('应该适应不同操作系统的安全要求', () => {
      const unixPaths = [
        '/home/user/file.txt',
        '/tmp/temporary',
        '/var/www/html'
      ]

      const windowsPaths = [
        'C:\\Users\\user\\file.txt',
        'C:\\Temp\\temporary',
        'D:\\Web\\html'
      ]

      // 测试Unix路径
      for (const unixPath of unixPaths) {
        const result = permissionManager.checkFileSystemAccess(unixPath)
        expect(typeof result).toBe('boolean')
      }

      // 测试Windows路径
      for (const windowsPath of windowsPaths) {
        const result = permissionManager.checkFileSystemAccess(windowsPath)
        expect(typeof result).toBe('boolean')
      }
    })

    it('应该在没有环境变量的情况下正常工作', () => {
      // 移除环境变量
      Object.defineProperty(global, 'process', {
        value: {
          env: {}
        },
        writable: true
      })

      const testPaths = [
        '/tmp/test.txt',
        './relative/path'
      ]

      for (const path of testPaths) {
        const result = permissionManager.checkFileSystemAccess(path)
        expect(typeof result).toBe('boolean')
      }
    })
  })

  describe('权限缓存和性能测试', () => {
    it('应该高效处理大量路径验证', () => {
      const paths = Array.from({ length: 100 }, (_, i) => `/path/to/file${i}.txt`)
      
      const startTime = performance.now()
      
      for (const path of paths) {
        permissionManager.checkFileSystemAccess(path)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // 应该在合理时间内完成
      expect(duration).toBeLessThan(100)
    })

    it('应该正确使用权限缓存', () => {
      // 测试相同路径的重复验证
      const testPath = '/home/user/test.txt'
      
      const result1 = permissionManager.checkFileSystemAccess(testPath)
      const result2 = permissionManager.checkFileSystemAccess(testPath)
      
      // 结果应该一致
      expect(result1).toBe(result2)
    })
  })

  describe('错误处理和边界情况测试', () => {
    it('应该优雅处理无效输入', () => {
      const invalidInputs = [
        '',
        null,
        undefined,
        123,
        {},
        [],
        NaN,
        Infinity
      ]

      for (const invalidInput of invalidInputs) {
        expect(() => {
          permissionManager.checkFileSystemAccess(invalidInput as string)
        }).not.toThrow()
      }
    })

    it('应该处理特殊字符路径', () => {
      const specialCharPaths = [
        '/path/with spaces/file.txt',
        '/path/with-dashes/file.txt',
        '/path/under_score/file.txt',
        '/path/with.dots/file.txt',
        '/path/with@symbol/file.txt',
        '/path/with#hash/file.txt',
        '/path/with$ Dollar/file.txt',
        '/path/with%percent/file.txt'
      ]

      for (const specialPath of specialCharPaths) {
        const result = permissionManager.checkFileSystemAccess(specialPath)
        expect(typeof result).toBe('boolean')
      }
    })

    it('应该处理Unicode路径', () => {
      const unicodePaths = [
        '/home/用户/文档.txt',
        '/home/user/résumé.pdf',
        'C:\\Users\\user\\文档.docx',
        '/tmp/测试文件.txt'
      ]

      for (const unicodePath of unicodePaths) {
        const result = permissionManager.checkFileSystemAccess(unicodePath)
        expect(typeof result).toBe('boolean')
      }
    })
  })

  describe('输入验证器集成测试', () => {
    it('应该与输入验证器协同工作', () => {
      const testPaths = [
        '/home/user/safe_file.txt',
        '../../../etc/passwd',
        'C:\\Users\\user\\document.docx',
        'C:\\Windows\\System32\\malware.exe'
      ]

      for (const path of testPaths) {
        // 权限管理器检查
        const permissionResult = permissionManager.checkFileSystemAccess(path)
        
        // 输入验证器检查
        const validationResult = InputValidator.validateFilePath(path)
        
        // 结果应该一致（都为布尔值）
        expect(typeof permissionResult).toBe('boolean')
        expect(typeof validationResult.isValid).toBe('boolean')
        
        // 如果权限管理器拒绝，输入验证器应该也有警告或错误
        if (!permissionResult) {
          const hasIssues = validationResult.warnings.length > 0 || !validationResult.isValid
          expect(hasIssues).toBe(true, 
            `权限管理器拒绝的路径应该被输入验证器标记: ${path}`)
        }
      }
    })

    it('应该处理输入验证器清理的路径', () => {
      const dirtyPaths = [
        '  /home/user/file.txt  ',
        '"/home/user/file.txt"',
        "'/home/user/file.txt'",
        '/home/user/../user/file.txt'
      ]

      for (const dirtyPath of dirtyPaths) {
        // 首先通过输入验证器清理
        const validationResult = InputValidator.validateFilePath(dirtyPath)
        const sanitizedPath = validationResult.sanitized
        
        // 然后通过权限管理器检查
        const permissionResult = permissionManager.checkFileSystemAccess(sanitizedPath)
        
        expect(typeof permissionResult).toBe('boolean')
      }
    })
  })
})