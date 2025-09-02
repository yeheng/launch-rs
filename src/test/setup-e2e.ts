import { vi, beforeEach, afterEach } from 'vitest'
import { TestUtils } from './test-utils'

/**
 * E2E 测试专用设置
 * 模拟更接近真实环境的条件
 */

// Mock Tauri API for E2E environment
const mockTauriInvoke = vi.fn()

// 简化的 mock 设置
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockTauriInvoke
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
  emit: vi.fn()
}))

// 创建更真实的localStorage实现
const createRealisticStorage = () => {
  const storage = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => storage.get(key) || null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    get size() { return storage.size }
  }
}

const realisticLocalStorage = createRealisticStorage()
const realisticSessionStorage = createRealisticStorage()

// 设置全局 window 对象（如果不存在）
if (typeof window === 'undefined') {
  (global as any).window = {}
}

// 设置全局存储
Object.defineProperty(window, 'localStorage', { 
  value: realisticLocalStorage, 
  writable: true 
})
Object.defineProperty(window, 'sessionStorage', { 
  value: realisticSessionStorage, 
  writable: true 
})

// 模拟文件系统响应
mockTauriInvoke.mockImplementation((command: string, args?: any) => {
  switch (command) {
    case 'search_files':
      return Promise.resolve([
        { name: 'test.txt', path: '/test.txt', size: 100 },
        { name: 'document.pdf', path: '/document.pdf', size: 2000 }
      ])
    case 'greet':
      return Promise.resolve(`Hello ${args?.name || 'World'}!`)
    case 'toggle_headless':
      return Promise.resolve()
    case 'register_global_shortcut':
      return Promise.resolve()
    case 'unregister_global_shortcut':
      return Promise.resolve()
    default:
      return Promise.resolve(null)
  }
})

// Mock Vue Router with navigation history
const navigationHistory: string[] = []
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn((path: string) => navigationHistory.push(path)),
    replace: vi.fn((path: string) => navigationHistory[navigationHistory.length - 1] = path),
    go: vi.fn(),
    back: vi.fn(() => navigationHistory.pop()),
    forward: vi.fn(),
    currentRoute: { value: { path: '/', query: {}, params: {} } }
  }),
  useRoute: () => ({
    params: {},
    query: {},
    path: navigationHistory[navigationHistory.length - 1] || '/',
    name: 'home',
  }),
}))

// 全局E2E测试设置
beforeEach(() => {
  // 重置导航历史
  navigationHistory.length = 0
  navigationHistory.push('/')
  
  // 清理存储
  realisticLocalStorage.clear()
  realisticSessionStorage.clear()
  
  // 重置模拟函数
  vi.clearAllMocks()
  
  // 重新设置Tauri模拟
  mockTauriInvoke.mockImplementation((command: string, args?: any) => {
    switch (command) {
      case 'search_files':
        return Promise.resolve([
          { name: 'test.txt', path: '/test.txt', size: 100 },
          { name: 'document.pdf', path: '/document.pdf', size: 2000 }
        ])
      case 'greet':
        return Promise.resolve(`Hello ${args?.name || 'World'}!`)
      default:
        return Promise.resolve(null)
    }
  })
})

afterEach(() => {
  // 清理E2E测试环境
  TestUtils.cleanupTestEnvironment()
  
  // 清理存储
  realisticLocalStorage.clear()
  realisticSessionStorage.clear()
})

// 导出用于E2E测试的工具
export {
  mockTauriInvoke,
  realisticLocalStorage,
  realisticSessionStorage,
  navigationHistory
}