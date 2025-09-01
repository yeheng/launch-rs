# Launch-rs 测试完善指南

## 📊 测试架构概览

### 测试层次结构
```
测试金字塔
├── 🔬 单元测试 (70%)
│   ├── Rust 后端单元测试
│   ├── Vue 组件测试
│   ├── TypeScript 工具函数测试
│   └── Pinia 状态管理测试
├── 🔗 集成测试 (20%)
│   ├── 插件系统集成测试
│   ├── 前后端通信测试
│   └── 状态持久化测试
└── 🎭 E2E 测试 (10%)
    ├── 用户工作流测试
    ├── 跨平台兼容性测试
    └── 性能基准测试
```

## 🛠️ 测试工具栈

### 前端测试
- **测试框架**: Vitest + Vue Test Utils
- **模拟工具**: Vi (Vitest内置)
- **DOM环境**: jsdom
- **覆盖率**: V8 provider

### 后端测试
- **测试框架**: Rust内置测试 + Cargo test
- **模拟工具**: mockall (推荐添加)
- **临时文件**: tempfile crate
- **覆盖率**: cargo-tarpaulin

### E2E测试
- **框架**: Vitest E2E配置
- **环境**: 近真实环境模拟
- **并发控制**: 串行执行防止副作用

## 📝 测试命令

### 基本测试命令
```bash
# 运行所有测试
bun run test:all

# 单独运行前端测试
bun run test:run

# 单独运行后端测试  
bun run test:rust

# 运行E2E测试
bun run test:e2e

# 生成覆盖率报告
bun run test:coverage

# CI环境测试
bun run test:ci
```

### 高级测试命令
```bash
# 监视模式运行测试
bun run test:watch

# 测试UI界面
bun run test:ui

# E2E测试UI界面
bun run test:e2e:ui

# 使用自动化脚本
./scripts/test-automation.sh unit
./scripts/test-automation.sh e2e  
./scripts/test-automation.sh coverage
./scripts/test-automation.sh ci
./scripts/test-automation.sh all
```

## 🎯 测试覆盖率目标

### 当前状态
- **总体测试**: 357个（194通过 + 163失败）
- **覆盖率目标**: 70%（分支、函数、行、语句）
- **优先修复**: 高优先级失败测试

### 覆盖率阈值
```typescript
// vitest.config.ts
coverage: {
  threshold: {
    global: {
      branches: 70,
      functions: 70, 
      lines: 70,
      statements: 70
    }
  }
}
```

## 🔧 测试最佳实践

### 1. 测试结构
```typescript
describe('功能模块名称', () => {
  // 设置和清理
  beforeEach(() => {
    TestUtils.setupPinia()
  })
  
  describe('具体功能点', () => {
    it('应该满足特定行为预期', () => {
      // Arrange (安排)
      const mockData = TestUtils.createMockPlugin()
      
      // Act (执行)
      const result = performAction(mockData)
      
      // Assert (断言)
      expect(result).toEqual(expectedOutcome)
    })
  })
})
```

### 2. 边界测试
```typescript
const edgeCases = [
  { input: '', expected: [] },
  { input: 'a'.repeat(10000), expected: 'handled' },
  { input: null, expected: 'error' },
  { input: undefined, expected: 'error' }
]

edgeCases.forEach(({ input, expected }) => {
  it(`应该处理边界情况: ${input}`, () => {
    expect(() => testFunction(input)).not.toThrow()
  })
})
```

### 3. 异步测试
```typescript
it('应该正确处理异步操作', async () => {
  const promise = asyncFunction()
  
  // 验证Promise状态
  expect(promise).toBeInstanceOf(Promise)
  
  // 等待结果
  const result = await promise
  expect(result).toBeDefined()
})
```

## 🚨 常见测试问题和解决方案

### 1. 状态泄漏
**问题**: 测试间状态互相影响
**解决**: 使用TestUtils.cleanupTestEnvironment()

### 2. 异步竞态
**问题**: 异步操作未完成就进行断言
**解决**: 使用适当的等待机制

### 3. Mock泄漏
**问题**: Mock函数在测试间没有重置
**解决**: beforeEach中使用vi.clearAllMocks()

### 4. DOM清理
**问题**: 组件挂载后未正确卸载
**解决**: afterEach中调用wrapper.unmount()

## 📈 持续改进

### 短期目标（1周）
- [ ] 修复所有失败的单元测试
- [ ] 提高测试覆盖率到70%
- [ ] 完善错误处理测试
- [ ] 优化测试执行速度

### 中期目标（1个月）  
- [ ] 实现视觉回归测试
- [ ] 添加性能基准测试
- [ ] 完善可访问性测试
- [ ] 集成安全测试

### 长期目标（3个月）
- [ ] 实现真实浏览器E2E测试
- [ ] 添加跨平台兼容性测试
- [ ] 实现自动化性能监控
- [ ] 建立测试数据管理系统

## 🔍 测试调试

### 运行特定测试
```bash
# 运行特定文件的测试
bun test plugin-state-manager.test.ts

# 运行特定测试用例
bun test -t "应该处理插件状态"

# 调试模式运行
bun test --inspect-brk
```

### 查看详细输出
```bash
# 详细输出模式
bun test --reporter=verbose

# 显示测试覆盖率
bun test --coverage

# 生成HTML覆盖率报告
bun test --coverage --reporter=html
```

## 📊 测试指标监控

### 关键指标
- **通过率**: >95%
- **覆盖率**: >70%
- **执行时间**: <2分钟
- **维护性**: 每个测试独立且稳定

### 自动化监控
- CI/CD管道自动运行
- 覆盖率趋势跟踪
- 性能回归检测
- 失败测试自动报告

---

**更新时间**: 2025-09-01  
**维护者**: Launch-rs 团队  
**版本**: 1.0.0