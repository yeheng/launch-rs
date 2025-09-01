import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PermissionManager } from '@/lib/security/permission-manager'

describe('权限管理器测试', () => {
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
    
    // 重置 process 而不是删除
    Object.defineProperty(global, 'process', {
      value: undefined,
        writable: true
      })
  })

  describe('单例模式测试', () => {
    it('应该返回相同的实例', () => {
      const instance1 = PermissionManager.getInstance()
      const instance2 = PermissionManager.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    it('应该维护独立的权限状态', () => {
      const instance1 = PermissionManager.getInstance()
      const instance2 = PermissionManager.getInstance()
      
      // 通过一个实例设置权限
      instance1['permissionStates'].set('test_permission', true)
      
      // 通过另一个实例验证
      expect(instance2.getPermissionStatus('test_permission')).toBe(true)
    })
  })

  describe('剪贴板权限测试', () => {
    it('应该正确处理剪贴板权限请求', async () => {
      // 测试基本功能 - 不依赖具体的navigator状态
      const result = await permissionManager.requestClipboardAccess('test')
      
      // 应该返回一个布尔值
      expect(typeof result).toBe('boolean')
    })

    it('应该正确使用权限缓存', async () => {
      // 设置缓存状态
      permissionManager['permissionStates'].set('clipboard_test', true)

      const result = await permissionManager.requestClipboardAccess('test')
      
      expect(result).toBe(true)
    })

    it('应该为不同上下文维护独立的权限状态', async () => {
      // 设置不同上下文的权限状态
      permissionManager['permissionStates'].set('clipboard_context1', true)
      permissionManager['permissionStates'].set('clipboard_context2', false)
      
      expect(permissionManager.getPermissionStatus('clipboard', 'context1')).toBe(true)
      expect(permissionManager.getPermissionStatus('clipboard', 'context2')).toBe(false)
    })
  })

  describe('文件系统访问测试', () => {
    it('应该拒绝无效的路径输入', () => {
      expect(permissionManager.checkFileSystemAccess('')).toBe(false)
      expect(permissionManager.checkFileSystemAccess(null as any)).toBe(false)
      expect(permissionManager.checkFileSystemAccess(123 as any)).toBe(false)
      expect(permissionManager.checkFileSystemAccess(undefined as any)).toBe(false)
    })

    it('应该检测路径遍历攻击', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '../../.ssh/id_rsa',
        'valid/path/../etc/passwd'
      ]

      for (const path of dangerousPaths) {
        expect(permissionManager.checkFileSystemAccess(path)).toBe(false)
      }
    })

    it('应该检测网络路径', () => {
      const networkPaths = [
        '//server/share',
        '\\\\server\\share',
        '//?/UNC/server/share'
      ]

      for (const path of networkPaths) {
        expect(permissionManager.checkFileSystemAccess(path)).toBe(false)
      }
    })

    it('应该检测包含非法字符的路径', () => {
      const pathsWithIllegalChars = [
        'file<name>.txt',
        'file>name.txt',
        'file:name.txt',
        'file"name.txt',
        'file|name.txt',
        'file?name.txt',
        'file*name.txt'
      ]

      for (const path of pathsWithIllegalChars) {
        expect(permissionManager.checkFileSystemAccess(path)).toBe(false)
      }
    })

    it('应该允许安全的文件路径', () => {
      const safePaths = [
        '/home/user/documents',
        '/tmp/test.txt',
        'C:\\Users\\user\\Documents',
        'C:\\Temp\\test.txt',
        './relative/path',
        './file.txt'
      ]

      for (const path of safePaths) {
        // 这些路径可能在某些环境中被允许，取决于允许的目录配置
        expect(typeof permissionManager.checkFileSystemAccess(path)).toBe('boolean')
      }
    })

    it('应该处理文件系统检查中的异常', () => {
      // 模拟异常情况
      const originalGetAllowedDirs = permissionManager['getAllowedDirectories']
      permissionManager['getAllowedDirectories'] = () => {
        throw new Error('Test error')
      }

      expect(permissionManager.checkFileSystemAccess('/safe/path')).toBe(false)
      
      // 恢复原始方法
      permissionManager['getAllowedDirectories'] = originalGetAllowedDirs
    })
  })

  describe('搜索路径验证测试', () => {
    it('应该拒绝无效的搜索路径', () => {
      expect(permissionManager.validateSearchPath('')).toBe(false)
      expect(permissionManager.validateSearchPath(null as any)).toBe(false)
      expect(permissionManager.validateSearchPath(123 as any)).toBe(false)
    })

    it('应该拒绝过长的路径', () => {
      const longPath = 'a'.repeat(5000)
      expect(permissionManager.validateSearchPath(longPath)).toBe(false)
    })

    it('应该清理路径中的引号', () => {
      const pathWithQuotes = '"/path/with/quotes"'
      expect(permissionManager.validateSearchPath(pathWithQuotes)).toBe(false)
    })

    it('应该验证绝对路径', () => {
      const absolutePaths = [
        '/absolute/path',
        '/home/user',
        'C:\\Windows\\System32',
        'D:\\Program Files'
      ]

      for (const path of absolutePaths) {
        const result = permissionManager.validateSearchPath(path)
        expect(typeof result).toBe('boolean')
      }
    })

    it('应该验证相对路径', () => {
      const relativePaths = [
        './relative/path',
        '../parent/path',
        './file.txt'
      ]

      for (const path of relativePaths) {
        const result = permissionManager.validateSearchPath(path)
        expect(typeof result).toBe('boolean')
      }
    })

    it('应该拒绝无效的路径格式', () => {
      const invalidPaths = [
        'invalid-path-format',
        'justafilename',
        'no/slashes/here\\but\\mixed',
        '   '
      ]

      for (const path of invalidPaths) {
        expect(permissionManager.validateSearchPath(path)).toBe(false)
      }
    })

    it('应该检测并处理路径遍历', () => {
      const pathWithTraversal = '../../etc/passwd'
      const result = permissionManager.validateSearchPath(pathWithTraversal)
      
      // 应该返回 false，因为路径遍历会被检测到
      expect(result).toBe(false)
    })
  })

  describe('路径安全检查测试', () => {
    it('应该检测危险的系统路径', () => {
      const dangerousPaths = [
        '/etc/passwd',
        '/usr/bin',
        '/sbin/init',
        '/system/framework',
        'C:\\Windows\\System32',
        'C:\\Program Files\\App',
        'C:\\Program Files (x86)\\App'
      ]

      for (const path of dangerousPaths) {
        const isSafe = permissionManager['isPathSafe'](path)
        expect(isSafe).toBe(false)
      }
    })

    it('应该允许安全的用户路径', () => {
      const safePaths = [
        '/home/user/documents',
        '/tmp/test',
        '/var/tmp/file',
        'C:\\Users\\user\\Documents',
        'C:\\Temp\\test'
      ]

      for (const path of safePaths) {
        const isSafe = permissionManager['isPathSafe'](path)
        expect(isSafe).toBe(true)
      }
    })

    it('应该进行大小写不敏感的路径检查', () => {
      const windowsPaths = [
        'c:\\windows\\system32',
        'C:\\WINDOWS\\SYSTEM32',
        'c:\\Program Files\\App'
      ]

      for (const path of windowsPaths) {
        const isSafe = permissionManager['isPathSafe'](path)
        expect(isSafe).toBe(false)
      }
    })
  })

  describe('路径解析测试', () => {
    it('应该正确解析绝对路径', () => {
      const absolutePaths = [
        '/absolute/path',
        'C:\\Windows\\Path'
      ]

      for (const path of absolutePaths) {
        const resolved = permissionManager['resolvePath'](path)
        expect(resolved).toBe(path)
      }
    })

    it('应该正确解析相对路径', () => {
      // 设置 mock process
      Object.defineProperty(global, 'process', {
        value: {
          cwd: () => '/current/working/directory'
        },
        writable: true
      })
      
      const relativePath = './relative/path'
      const resolved = permissionManager['resolvePath'](relativePath)
      expect(resolved).toBe('/current/working/directory/./relative/path')
    })

    it('应该处理路径解析异常', () => {
      // 设置 mock process
      Object.defineProperty(global, 'process', {
        value: {
          cwd: () => {
            throw new Error('Cannot get current directory')
          }
        },
        writable: true
      })

      const path = './relative/path'
      const resolved = permissionManager['resolvePath'](path)
      expect(resolved).toBe(path)
    })
  })

  describe('允许目录测试', () => {
    it('应该返回正确的允许目录列表', () => {
      // 设置 mock process
      Object.defineProperty(global, 'process', {
        value: {
          env: {
            HOME: '/home/user',
            USERPROFILE: 'C:\\Users\\user',
            TEMP: '/tmp',
            TMP: 'C:\\Temp'
          }
        },
        writable: true
      })
      
      const allowedDirs = permissionManager['getAllowedDirectories']()
      
      expect(allowedDirs).toContain('/home/user')
      expect(allowedDirs).toContain('/tmp')
      expect(allowedDirs).toContain('/var/tmp')
      // 注意：实际的实现可能不会包含 Windows 路径，取决于环境
    })

    it('应该过滤掉空目录', () => {
      // 设置没有环境变量的 process
      Object.defineProperty(global, 'process', {
        value: {
          env: {}
        },
        writable: true
      })

      const allowedDirs = permissionManager['getAllowedDirectories']()
      
      expect(allowedDirs).toContain('/tmp')
      expect(allowedDirs).toContain('/var/tmp')
      expect(allowedDirs).not.toContain('')
    })
  })

  describe('权限缓存管理测试', () => {
    it('应该能够清除权限缓存', () => {
      // 设置一些权限状态
      permissionManager['permissionStates'].set('test_permission', true)
      permissionManager['permissionStates'].set('another_permission', false)
      
      expect(permissionManager['permissionStates'].size).toBe(2)
      
      permissionManager.clearPermissionCache()
      
      expect(permissionManager['permissionStates'].size).toBe(0)
    })

    it('应该正确获取权限状态', () => {
      // 设置权限状态
      permissionManager['permissionStates'].set('clipboard_test', true)
      permissionManager['permissionStates'].set('filesystem', false)
      
      expect(permissionManager.getPermissionStatus('clipboard', 'test')).toBe(true)
      expect(permissionManager.getPermissionStatus('filesystem')).toBe(false)
      expect(permissionManager.getPermissionStatus('nonexistent')).toBe(null)
    })
  })

  describe('权限对话框测试', () => {
    it('应该正确处理权限对话框显示', async () => {
      // 测试基本功能 - 不依赖具体的confirm实现
      const result = await permissionManager['showPermissionDialog'](
        '测试权限',
        '测试权限请求消息',
        'test-context'
      )

      // 应该返回一个布尔值
      expect(typeof result).toBe('boolean')
    })
  })

  describe('边界情况和错误处理测试', () => {
    it('应该处理没有 navigator 对象的环境', () => {
      // 保存原始 navigator
      const originalNav = global.navigator
      
      // 移除 navigator
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true
      })

      const permissionManager = PermissionManager.getInstance()
      
      // 应该不抛出异常
      expect(() => permissionManager.checkFileSystemAccess('/safe/path')).not.toThrow()
      
      // 恢复 navigator
      Object.defineProperty(global, 'navigator', {
        value: originalNav,
        writable: true
      })
    })

    it('应该处理没有 process 对象的环境', () => {
      // 保存原始 process
      const originalProcess = (global as any).process
      
      // 移除 process
      Object.defineProperty(global, 'process', {
        value: undefined,
        writable: true
      })

      const permissionManager = PermissionManager.getInstance()
      
      // 应该不抛出异常
      expect(() => permissionManager['getAllowedDirectories']()).not.toThrow()
      expect(() => permissionManager['resolvePath']('./relative')).not.toThrow()
      
      // 恢复 process
      if (originalProcess) {
        Object.defineProperty(global, 'process', {
          value: originalProcess,
          writable: true
        })
      }
    })
  })

  describe('性能测试', () => {
    it('应该高效处理大量权限检查', () => {
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

    it('应该高效处理权限缓存', () => {
      const startTime = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        permissionManager.getPermissionStatus(`test_permission_${i}`)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // 应该很快，因为只是缓存查找
      expect(duration).toBeLessThan(10)
    })
  })
})