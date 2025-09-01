import { vi, beforeEach, afterEach } from 'vitest'

// 导入测试工具
import { TestUtils } from './test-utils'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// 设置全局存储模拟
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true })

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue([]),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
  emit: vi.fn(),
}))

// Mock Vue Router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
    query: {},
    path: '/',
    name: 'home',
  }),
}))

// 全局测试环境设置
beforeEach(() => {
  // 清理测试环境
  TestUtils.cleanupTestEnvironment()
  
  // 重置localStorage模拟
  localStorageMock.getItem.mockReturnValue(null)
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  
  // 重置sessionStorage模拟
  sessionStorageMock.getItem.mockReturnValue(null)
  sessionStorageMock.setItem.mockClear()
  sessionStorageMock.removeItem.mockClear()
  sessionStorageMock.clear.mockClear()
})

afterEach(() => {
  // 清理测试环境
  TestUtils.cleanupTestEnvironment()
})