# 插件系统架构文档

## 概述

Launch-rs 的插件系统是一个高度可扩展的架构，支持动态插件加载、状态管理、性能监控和完整的生命周期管理。该系统采用分层设计，提供了丰富的插件开发接口和管理功能。

## 核心架构

### 1. 系统组件图

```
┌─────────────────────────────────────────────────────────────┐
│                    插件系统架构                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌───────────┐ │
│  │   Plugin UI     │    │  Plugin Config  │    │  Plugin   │ │
│  │   Components     │    │  Management     │    │  Stats    │ │
│  │                 │    │                 │    │           │ │
│  └─────────────────┘    └─────────────────┘    └───────────┘ │
│           │                       │                    │        │
│           └───────────────────────┼────────────────────┘        │
│                                   │                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              SearchPluginManager                          │ │
│  │              (插件管理器)                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                   │                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │          PluginManagementService                         │ │
│  │          (插件管理服务)                                  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                   │                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            Plugin State Store                            │ │
│  │            (插件状态存储)                                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                   │                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                 插件实例                                  │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │ │
│  │  │   Apps      │ │   Files     │ │ Calculator  │         │ │
│  │  │   Plugin    │ │   Plugin    │ │   Plugin    │         │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘         │ │
└─────────────────────────────────────────────────────────────┘
```

### 2. 核心接口定义

#### SearchPlugin 接口

```typescript
interface SearchPlugin {
  // 基础信息
  id: string
  name: string
  description: string
  version: string
  author: string
  enabled: boolean
  
  // 搜索能力
  searchPrefixes?: string[]
  search(context: SearchContext): Promise<SearchResultItem[]>
  
  // 生命周期
  initialize?(): Promise<void>
  destroy?(): Promise<void>
  
  // 配置管理
  settings?: PluginSettings
  configure?(config: Record<string, any>): void
}
```

#### EnhancedSearchPlugin 接口

```typescript
interface EnhancedSearchPlugin extends SearchPlugin {
  // 增强元数据
  metadata: PluginMetadata
  installation: PluginInstallation
  health: PluginHealthStatus
  
  // 权限和安全
  permissions: PluginPermission[]
  
  // 依赖关系
  dependencies: string[]
  
  // 性能指标
  performance: PluginPerformanceMetrics
}
```

## 插件生命周期

### 1. 完整生命周期流程

```
[注册] → [初始化] → [状态加载] → [激活] → [运行] → [停用] → [清理] → [卸载]
    ↓         ↓         ↓         ↓        ↓        ↓        ↓        ↓
  验证信息 → 加载资源 → 恢复配置 → 启用插件 → 处理搜索 → 禁用插件 → 清理资源 → 移除插件
```

### 2. 生命周期阶段详解

#### 注册阶段 (Registration)

```typescript
// SearchPluginManager.register()
async register(plugin: SearchPlugin): Promise<void> {
  // 1. 验证插件信息
  if (this.plugins.has(plugin.id)) {
    throw new Error(`插件 ${plugin.id} 已存在`)
  }
  
  // 2. 初始化状态存储
  if (this.stateStore) {
    this.stateStore.initializePlugin(plugin)
  }
  
  // 3. 调用插件初始化
  if (plugin.initialize) {
    await plugin.initialize()
  }
  
  // 4. 注册到管理器
  this.plugins.set(plugin.id, plugin)
  
  // 5. 触发注册事件
  this.emit('plugin:registered', plugin)
}
```

#### 初始化阶段 (Initialization)

```typescript
// 插件初始化示例
async initialize(): Promise<void> {
  // 1. 加载插件资源
  await this.loadResources()
  
  // 2. 建立外部连接
  await this.establishConnections()
  
  // 3. 初始化内部状态
  this.state = {
    isActive: false,
    cache: new Map(),
    metrics: {
      searchCount: 0,
      avgSearchTime: 0
    }
  }
}
```

#### 搜索阶段 (Search)

```typescript
// 搜索执行流程
async search(query: string, maxResults = 50): Promise<SearchResultItem[]> {
  // 1. 创建搜索上下文
  const context = this.createSearchContext(query, maxResults)
  
  // 2. 获取启用插件
  const enabledPlugins = this.getEnabledPlugins()
  
  // 3. 并行搜索
  const searchPromises = enabledPlugins.map(plugin => 
    this.executePluginSearch(plugin, context)
  )
  
  // 4. 聚合结果
  const pluginResults = await Promise.all(searchPromises)
  const allResults = pluginResults.flat()
  
  // 5. 排序和去重
  return this.sortAndDeduplicateResults(allResults)
}
```

#### 清理阶段 (Cleanup)

```typescript
// 插件清理流程
async performPluginCleanup(pluginId: string): Promise<void> {
  // 1. 清理配置
  await this.clearPluginConfiguration(pluginId)
  
  // 2. 移除文件
  await this.removePluginFiles(pluginId)
  
  // 3. 清理缓存
  await this.clearPluginCache(pluginId)
  
  // 4. 更新搜索索引
  await this.removeFromSearchIndexes(pluginId)
  
  // 5. 清理用户数据
  await this.cleanupPluginUserData(pluginId)
}
```

## 状态管理系统

### 1. 状态架构

```
┌─────────────────────────────────────────────────────────────┐
│                    插件状态管理                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │   Pinia Store   │    │  Local Storage  │                 │
│  │   (内存状态)     │    │  (持久化存储)     │                 │
│  │                 │    │                 │                 │
│  │ • pluginStates  │    │ • pluginConfig  │                 │
│  │ • userSettings │    │ • pluginMetrics │                 │
│  │ • appSettings  │    │ • cacheData     │                 │
│  └─────────────────┘    └─────────────────┘                 │
│           │                       │                          │
│           └───────────────────────┼──────────────────────────┘
│                                   │                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              PluginStateManager                         │ │
│  │              (状态管理器)                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                   │                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                事件监听器                                │ │
│  │  • stateChangeListener                                 │ │
│  │  • configurationListener                              │ │
│  │  • performanceListener                                │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. 状态同步机制

```typescript
// 状态同步示例
class PluginStateManager {
  // 监听状态变化
  private setupStateChangeListeners(): void {
    // 监听启用状态变化
    pluginStateListener.on('enabled', (event) => {
      const plugin = this.plugins.get(event.pluginId)
      if (plugin && plugin.enabled !== event.newValue) {
        plugin.enabled = event.newValue as boolean
        this.emit('plugin:enabled', event.pluginId)
      }
    })
    
    // 监听配置变化
    pluginStateListener.on('configured', (event) => {
      const plugin = this.plugins.get(event.pluginId)
      if (plugin && plugin.configure) {
        plugin.configure(event.newValue)
      }
    })
  }
}
```

## 性能监控系统

### 1. 性能监控架构

```
┌─────────────────────────────────────────────────────────────┐
│                    性能监控系统                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │   Metrics       │    │   Cache         │                 │
│  │   Collector     │    │   Manager       │                 │
│  │                 │    │                 │                 │
│  │ • 搜索时间      │    │ • 结果缓存       │                 │
│  │ • 内存使用      │    │ • 插件缓存       │                 │
│  │ • 错误计数      │    │ • 配置缓存       │                 │
│  │ • 成功率        │    │ • 统计缓存       │                 │
│  └─────────────────┘    └─────────────────┘                 │
│           │                       │                          │
│           └───────────────────────┼──────────────────────────┘
│                                   │                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              PerformanceMonitor                         │ │
│  │              (性能监控器)                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                   │                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                报告和警报                                │ │
│  │  • 性能报告       • 健康检查       • 优化建议              │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. 性能指标类型

```typescript
// 性能指标定义
interface PluginPerformanceMetrics {
  // 搜索性能
  searchCount: number
  avgSearchTime: number
  searchLatency: number[]
  
  // 资源使用
  memoryUsage: number
  cpuUsage: number
  cacheSize: number
  
  // 错误统计
  errorCount: number
  successRate: number
  lastError?: string
  
  // 用户交互
  userInteractions: number
  avgResponseTime: number
}
```

### 3. 缓存策略

```typescript
// 缓存装饰器示例
function cached(ttl: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}-${JSON.stringify(args)}`
      
      // 检查缓存
      const cached = pluginCache.get(cacheKey)
      if (cached && !pluginCache.isExpired(cacheKey)) {
        return cached
      }
      
      // 执行方法
      const result = await originalMethod.apply(this, args)
      
      // 缓存结果
      pluginCache.set(cacheKey, result, ttl)
      
      return result
    }
  }
}
```

## 插件管理系统

### 1. 管理功能架构

```
┌─────────────────────────────────────────────────────────────┐
│                   插件管理服务                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │   Installation  │    │   Management    │                 │
│  │   Manager       │    │   Operations    │                 │
│  │                 │    │                 │                 │
│  │ • 插件安装      │    │ • 启用/禁用      │                 │
│  │ • 依赖解析      │    │ • 配置管理      │                 │
│  │ • 版本控制      │    │ • 状态查询      │                 │
│  │ • 权限验证      │    │ • 健康检查      │                 │
│  └─────────────────┘    └─────────────────┘                 │
│           │                       │                          │
│           └───────────────────────┼──────────────────────────┘
│                                   │                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            PluginManagementService                     │ │
│  │            (插件管理服务)                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                   │                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │               验证和安全                                │ │
│  │  • PluginValidator  • SecurityScanner  • HealthChecker   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. 插件安装流程

```typescript
// 插件安装示例
async installPlugin(pluginId: string): Promise<PluginOperationResult> {
  try {
    // 1. 查找插件
    const catalogItem = this.mockCatalog.find(item => item.id === pluginId)
    
    // 2. 验证插件
    const validationResult = await this.validatePlugin(catalogItem)
    if (!validationResult.isValid) {
      throw new PluginManagementError(
        PluginManagementErrorType.VALIDATION_FAILED,
        'Plugin validation failed'
      )
    }
    
    // 3. 安全检查
    if (validationResult.security.level === 'dangerous') {
      throw new PluginManagementError(
        PluginManagementErrorType.SECURITY_ERROR,
        'Plugin poses security risks'
      )
    }
    
    // 4. 执行安装
    await this.simulateAsyncOperation(2000)
    
    return {
      success: true,
      data: { pluginId, message: 'Plugin installed successfully' }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof PluginManagementError ? error : new PluginManagementError(
        PluginManagementErrorType.INSTALLATION_FAILED,
        'Plugin installation failed'
      )
    }
  }
}
```

### 3. 错误处理系统

```typescript
// 错误类型定义
enum PluginManagementErrorType {
  PLUGIN_NOT_FOUND = 'plugin_not_found',
  INSTALLATION_FAILED = 'installation_failed',
  UNINSTALLATION_FAILED = 'uninstallation_failed',
  UPDATE_FAILED = 'update_failed',
  VALIDATION_FAILED = 'validation_failed',
  PERMISSION_DENIED = 'permission_denied',
  SECURITY_ERROR = 'security_error'
}

// 错误处理类
class PluginManagementError extends Error {
  constructor(
    public type: PluginManagementErrorType,
    message: string,
    public details?: string,
    public pluginId?: string,
    public recoverable: boolean = true,
    public suggestedAction?: string
  ) {
    super(message)
    this.name = 'PluginManagementError'
  }
  
  getUserFriendlyMessage(): string {
    switch (this.type) {
      case PluginManagementErrorType.PLUGIN_NOT_FOUND:
        return 'Plugin not found. Please check if the plugin exists and try again.'
      case PluginManagementErrorType.SECURITY_ERROR:
        return 'Security error. The plugin may pose a security risk and cannot be installed.'
      // ... 其他错误类型
    }
  }
}
```

## 内置插件系统

### 1. Apps Plugin

```typescript
// 应用程序搜索插件
class AppsPlugin implements SearchPlugin {
  id = 'apps'
  name = 'Applications'
  description = 'Search and launch system applications'
  
  async search(context: SearchContext): Promise<SearchResultItem[]> {
    // 获取系统应用列表
    const apps = await this.getSystemApps()
    
    // 过滤匹配的应用
    const filtered = apps.filter(app => 
      app.name.toLowerCase().includes(context.queryLower) ||
      app.description.toLowerCase().includes(context.queryLower)
    )
    
    // 转换为搜索结果
    return filtered.map(app => ({
      id: `app-${app.id}`,
      title: app.name,
      description: app.description,
      action: () => this.launchApp(app.path),
      icon: app.icon,
      priority: 90
    }))
  }
  
  private async launchApp(path: string): Promise<void> {
    // 使用 Tauri opener 启动应用
    await invoke('open_path', { path })
  }
}
```

### 2. Files Plugin

```typescript
// 文件搜索插件
class FilesPlugin implements SearchPlugin {
  id = 'files'
  name = 'Files'
  description = 'Search files and directories'
  
  async search(context: SearchContext): Promise<SearchResultItem[]> {
    // 调用 Rust 后端的文件搜索
    const files = await invoke('search_files', {
      query: context.query,
      max_results: context.maxResults || 20
    })
    
    // 转换为搜索结果
    return files.map((file: FileSearchResult) => ({
      id: `file-${file.path}`,
      title: file.name,
      description: `${file.is_dir ? 'Directory' : 'File'} • ${this.formatFileSize(file.size)}`,
      action: () => this.openFile(file.path),
      icon: file.is_dir ? 'folder' : 'file',
      priority: 80
    }))
  }
  
  private async openFile(path: string): Promise<void> {
    await invoke('open_path', { path })
  }
  
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}
```

### 3. Calculator Plugin

```typescript
// 计算器插件
class CalculatorPlugin implements SearchPlugin {
  id = 'calculator'
  name = 'Calculator'
  description = 'Mathematical calculations and expressions'
  searchPrefixes = ['=', 'calc', 'calculate']
  
  async search(context: SearchContext): Promise<SearchResultItem[]> {
    try {
      // 解析数学表达式
      const expression = context.query
      const result = this.evaluateExpression(expression)
      
      return [{
        id: `calc-${Date.now()}`,
        title: `= ${result}`,
        description: `Calculation result for: ${expression}`,
        action: () => this.copyToClipboard(result.toString()),
        icon: 'calculator',
        priority: 95
      }]
    } catch (error) {
      return []
    }
  }
  
  private evaluateExpression(expression: string): number {
    // 安全的数学表达式求值
    // 使用 Function 构造函数进行沙箱化求值
    const safeExpression = expression.replace(/[^0-9+\-*/().\s]/g, '')
    return new Function(`return ${safeExpression}`)()
  }
  
  private async copyToClipboard(text: string): Promise<void> {
    // 复制到剪贴板
    await navigator.clipboard.writeText(text)
  }
}
```

## 扩展开发指南

### 1. 创建新插件

```typescript
// 插件模板
class MyCustomPlugin implements SearchPlugin {
  id = 'my-custom-plugin'
  name = 'My Custom Plugin'
  description = 'Custom search functionality'
  version = '1.0.0'
  author = 'Your Name'
  enabled = true
  
  // 可选：搜索前缀
  searchPrefixes = ['my', 'custom']
  
  // 可选：设置定义
  settings = {
    schema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', description: 'API Key for external service' },
        maxResults: { type: 'number', default: 10, description: 'Maximum results to return' }
      }
    }
  }
  
  async initialize(): Promise<void> {
    // 插件初始化逻辑
    console.log('MyCustomPlugin initialized')
  }
  
  async search(context: SearchContext): Promise<SearchResultItem[]> {
    // 实现搜索逻辑
    const results = await this.performSearch(context.query)
    
    return results.map(item => ({
      id: `my-plugin-${item.id}`,
      title: item.title,
      description: item.description,
      action: () => this.handleAction(item),
      icon: 'custom-icon',
      priority: 70
    }))
  }
  
  async destroy(): Promise<void> {
    // 清理资源
    console.log('MyCustomPlugin destroyed')
  }
  
  configure(config: Record<string, any>): void {
    // 应用配置
    console.log('Plugin configured:', config)
  }
  
  private async performSearch(query: string): Promise<any[]> {
    // 实现具体的搜索逻辑
    return []
  }
  
  private async handleAction(item: any): Promise<void> {
    // 处理用户操作
    console.log('Action triggered:', item)
  }
}

// 注册插件
pluginManager.register(new MyCustomPlugin())
```

### 2. 插件最佳实践

#### 命名约定

- 使用小写字母和连字符: `my-plugin`
- 类名使用 PascalCase: `MyPlugin`
- 文件名与插件 ID 保持一致

#### 错误处理

```typescript
async search(context: SearchContext): Promise<SearchResultItem[]> {
  try {
    // 搜索逻辑
    return await this.performSearch(context.query)
  } catch (error) {
    console.error(`Search failed in ${this.id}:`, error)
    // 返回空数组而不是抛出错误，避免影响其他插件
    return []
  }
}
```

#### 性能优化

```typescript
// 使用缓存
@cached(5 * 60 * 1000) // 5分钟缓存
async getCachedData(query: string): Promise<any[]> {
  return await this.fetchDataFromSource(query)
}

// 使用性能监控
@monitored('my-plugin-search')
async performSearch(query: string): Promise<any[]> {
  return await this.searchImplementation(query)
}
```

#### 配置验证

```typescript
configure(config: Record<string, any>): void {
  // 验证配置
  if (config.apiKey && typeof config.apiKey !== 'string') {
    throw new Error('API key must be a string')
  }
  
  // 应用配置
  this.config = { ...this.config, ...config }
}
```

## 测试策略

### 1. 单元测试

```typescript
// 插件测试示例
describe('MyCustomPlugin', () => {
  let plugin: MyCustomPlugin
  
  beforeEach(() => {
    plugin = new MyCustomPlugin()
  })
  
  test('should initialize successfully', async () => {
    await expect(plugin.initialize()).resolves.not.toThrow()
  })
  
  test('should return search results', async () => {
    const context: SearchContext = {
      query: 'test',
      queryLower: 'test',
      keywords: ['test']
    }
    
    const results = await plugin.search(context)
    expect(Array.isArray(results)).toBe(true)
  })
})
```

### 2. 集成测试

```typescript
// 插件管理器测试
describe('PluginManager', () => {
  test('should register and search plugins', async () => {
    const plugin = new MyCustomPlugin()
    await pluginManager.register(plugin)
    
    const results = await pluginManager.search('test')
    expect(results.length).toBeGreaterThan(0)
  })
})
```

这个插件系统架构文档提供了 Launch-rs 插件系统的完整技术说明，包括核心架构、生命周期管理、状态系统、性能监控和扩展开发指南。
