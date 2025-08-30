# API 文档

## Tauri 命令 API

本文档详细描述了 Launch-rs 应用程序中可用的 Tauri 命令接口，这些命令允许前端与 Rust 后端进行通信。

## 概述

Tauri 命令系统是前后端通信的核心机制，通过 `@tauri-apps/api/core` 的 `invoke` 函数调用 Rust 后端实现的功能。

### 基本调用模式

```typescript
import { invoke } from '@tauri-apps/api/core'

// 调用 Tauri 命令
const result = await invoke<ReturnType>('command_name', {
  param1: value1,
  param2: value2
})
```

## 命令列表

### 1. greet - 基础问候功能

**描述**: 简单的问候功能，用于测试前后端通信。

**签名**:

```rust
fn greet(name: &str) -> String
```

**TypeScript 接口**:

```typescript
function greet(name: string): Promise<string>
```

**参数**:

- `name` (string): 要问候的名称

**返回值**: `Promise<string>` - 格式化的问候消息

**示例**:

```typescript
const message = await invoke('greet', { name: 'World' })
// 返回: "Hello, World! You've been greeted from Rust!"
```

### 2. toggle_headless - 窗口可见性控制

**描述**: 控制应用程序窗口的可见性和装饰器状态。

**签名**:

```rust
fn toggle_headless(app_handle: tauri::AppHandle, headless: bool) -> Result<(), String>
```

**TypeScript 接口**:

```typescript
function toggle_headless(headless: boolean): Promise<void>
```

**参数**:

- `headless` (boolean):
  - `true`: 隐藏窗口并移除装饰器
  - `false`: 显示窗口并添加装饰器

**返回值**: `Promise<void>`

**错误处理**: 可能抛出窗口操作错误

**示例**:

```typescript
// 进入无头模式
await invoke('toggle_headless', { headless: true })

// 退出无头模式
await invoke('toggle_headless', { headless: false })
```

### 3. register_global_shortcut - 全局快捷键注册

**描述**: 注册全局快捷键，用于窗口显示/隐藏等操作。

**签名**:

```rust
fn register_global_shortcut(
    app_handle: tauri::AppHandle,
    shortcut_id: String,
    accelerator: String,
) -> Result<(), String>
```

**TypeScript 接口**:

```typescript
function register_global_shortcut(
  shortcut_id: string,
  accelerator: string
): Promise<void>
```

**参数**:

- `shortcut_id` (string): 快捷键唯一标识符
- `accelerator` (string): 快捷键组合字符串，格式如 "Alt+Space", "Ctrl+Shift+F"

**返回值**: `Promise<void>`

**错误处理**:

- 快捷键解析失败
- 快捷键注册失败
- 监听器设置失败

**示例**:

```typescript
// 注册默认快捷键
await invoke('register_global_shortcut', {
  shortcut_id: 'toggle_window',
  accelerator: 'Alt+Space'
})

// 注册自定义快捷键
await invoke('register_global_shortcut', {
  shortcut_id: 'quick_search',
  accelerator: 'Ctrl+Shift+F'
})
```

**支持的快捷键格式**:

- 修饰键: `Ctrl`, `Alt`, `Shift`, `Meta` (Windows/Cmd)
- 普通键: `A-Z`, `0-9`, `F1-F12`, `Space`, `Enter`, `Esc`
- 组合示例: `Ctrl+Space`, `Alt+Shift+Enter`, `Meta+C`

### 4. unregister_global_shortcut - 全局快捷键注销

**描述**: 注销已注册的全局快捷键。

**签名**:

```rust
fn unregister_global_shortcut(
    app_handle: tauri::AppHandle,
    shortcut_id: String,
) -> Result<(), String>
```

**TypeScript 接口**:

```typescript
function unregister_global_shortcut(shortcut_id: string): Promise<void>
```

**参数**:

- `shortcut_id` (string): 要注销的快捷键标识符

**返回值**: `Promise<void>`

**错误处理**: 快捷键注销失败

**示例**:

```typescript
// 注销特定快捷键
await invoke('unregister_global_shortcut', {
  shortcut_id: 'toggle_window'
})
```

### 5. search_files - 文件系统搜索

**描述**: 在指定路径中搜索文件，支持递归搜索和相关性排序。

**签名**:

```rust
fn search_files(
    query: String,
    search_path: Option<String>,
    max_results: Option<usize>,
) -> Result<Vec<FileSearchResult>, String>
```

**TypeScript 接口**:

```typescript
interface FileSearchResult {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: number // Unix 时间戳
}

function search_files(
  query: string,
  search_path?: string,
  max_results?: number
): Promise<FileSearchResult[]>
```

**参数**:

- `query` (string): 搜索查询字符串
- `search_path` (string, 可选): 搜索路径，默认为用户主目录
- `max_results` (number, 可选): 最大结果数量，默认为 50

**返回值**: `Promise<FileSearchResult[]>` - 文件搜索结果数组

**搜索规则**:

- **递归深度**: 最大 3 层
- **文件过滤**: 跳过隐藏文件（以 `.` 开头）和临时文件（以 `~` 开头）
- **大小写不敏感**: 搜索查询不区分大小写
- **相关性排序**: 基于匹配类型和文件名长度排序

**相关性评分算法**:

- 完全匹配: 100 分
- 前缀匹配: 80 分  
- 包含匹配: 60 分
- 文件名长度奖励: 20 / 文件名长度

**错误处理**:

- 目录读取失败
- 文件元数据读取失败
- 路径访问权限错误

**示例**:

```typescript
// 基本文件搜索
const results = await invoke('search_files', {
  query: 'document'
})

// 指定路径和结果数量
const results = await invoke('search_files', {
  query: 'config',
  search_path: '/Users/yeheng/projects',
  max_results: 20
})

// 处理搜索结果
results.forEach(file => {
  console.log(`${file.name} (${file.is_dir ? '目录' : '文件'})`)
  console.log(`路径: ${file.path}`)
  console.log(`大小: ${file.size} bytes`)
  console.log(`修改时间: ${new Date(file.modified * 1000).toLocaleString()}`)
})
```

## 错误处理

### 通用错误处理模式

```typescript
try {
  const result = await invoke('command_name', { /* 参数 */ })
  // 处理成功结果
} catch (error) {
  console.error('命令执行失败:', error)
  // 处理错误情况
}
```

### 错误类型

1. **参数错误**: 缺少必需参数或参数类型错误
2. **权限错误**: 没有执行操作的权限
3. **系统错误**: 操作系统级别的错误（如文件访问权限）
4. **状态错误**: 应用程序状态不匹配（如窗口不存在）

## 使用示例

### 完整的快捷键管理示例

```typescript
// 快捷键管理类
class ShortcutManager {
  async registerToggleShortcut() {
    try {
      await invoke('register_global_shortcut', {
        shortcut_id: 'toggle_window',
        accelerator: 'Alt+Space'
      })
      console.log('快捷键注册成功')
    } catch (error) {
      console.error('快捷键注册失败:', error)
    }
  }

  async unregisterToggleShortcut() {
    try {
      await invoke('unregister_global_shortcut', {
        shortcut_id: 'toggle_window'
      })
      console.log('快捷键注销成功')
    } catch (error) {
      console.error('快捷键注销失败:', error)
    }
  }
}

// 使用示例
const shortcutManager = new ShortcutManager()
await shortcutManager.registerToggleShortcut()
```

### 文件搜索组件示例

```typescript
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export function useFileSearch() {
  const searchResults = ref<FileSearchResult[]>([])
  const isSearching = ref(false)
  const searchError = ref<string | null>(null)

  const searchFiles = async (query: string, path?: string) => {
    if (!query.trim()) {
      searchResults.value = []
      return
    }

    isSearching.value = true
    searchError.value = null

    try {
      const results = await invoke('search_files', {
        query,
        search_path: path,
        max_results: 50
      })
      searchResults.value = results
    } catch (error) {
      searchError.value = error instanceof Error ? error.message : '搜索失败'
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }

  return {
    searchResults,
    isSearching,
    searchError,
    searchFiles
  }
}
```

## 性能考虑

### 1. 搜索性能

- **结果限制**: 默认限制 50 个结果，避免大量数据传输
- **递归深度**: 限制为 3 层，防止深度递归影响性能
- **文件过滤**: 自动跳过隐藏和系统文件

### 2. 快捷键性能

- **轻量级监听**: 快捷键监听器在 Rust 层实现，性能开销小
- **状态管理**: 使用全局静态变量存储已注册快捷键

### 3. 错误恢复

- **幂等操作**: 重复注册相同快捷键不会导致问题
- **资源清理**: 应用退出时自动清理快捷键注册

## 安全考虑

### 1. 文件系统访问

- **路径限制**: 搜索范围受限于用户有权限访问的目录
- **隐藏文件**: 自动跳过敏感系统文件和隐藏文件

### 2. 快捷键安全

- **权限检查**: 全局快捷键需要系统权限
- **冲突检测**: 系统级别的快捷键冲突由操作系统处理

### 3. 输入验证

- **参数验证**: Rust 层对所有输入参数进行验证
- **错误处理**: 详细的错误信息帮助调试但不暴露系统细节

## 调试和日志

### 启用调试模式

在开发环境中，可以通过以下方式启用详细日志：

```rust
// 在 Rust 代码中添加日志
println!("Debug: command called with params: {:?}", params);
```

### 常见问题排查

1. **快捷键不工作**: 检查快捷键格式和系统权限
2. **文件搜索失败**: 确认路径存在且有访问权限
3. **窗口控制失败**: 检查窗口是否存在和状态

## 版本兼容性

### API 版本

- 当前版本: v1.0.0
- 兼容的 Tauri 版本: 2.x
- 支持的平台: Windows, macOS, Linux

### 后续版本计划

- 添加更多文件搜索选项
- 支持自定义快捷键行为
- 增强错误处理和恢复机制

这个 API 文档提供了 Launch-rs 应用程序中所有 Tauri 命令的详细说明，包括使用方法、参数说明、错误处理和最佳实践。
