import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

/**
 * E2E 测试配置
 * 专门用于端到端测试，模拟真实用户交互
 */
export default defineConfig({
  plugins: [vue()],
  test: {
    name: 'e2e',
    environment: 'jsdom',
    setupFiles: ['./src/test/setup-e2e.ts'],
    // 文件匹配模式
    include: [
      'src/**/*.e2e.test.ts',
      'tests/e2e/**/*.test.ts'
    ],
    // 超时配置（E2E测试通常需要更长时间）
    testTimeout: 30000,
    hookTimeout: 10000,
    // 串行执行（E2E测试可能有副作用）
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // 重试配置
    retry: 2,
    // 报告配置
    reporter: ['verbose'],
    // 全局变量
    globals: true,
    // 环境变量
    env: {
      NODE_ENV: 'test',
      E2E_TEST: 'true'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})