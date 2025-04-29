# Tauri 命令开发流程

## 命令定义与注册

**命令定义**：

- 使用 `#[tauri::command]` 宏标记函数
- 支持多种参数类型和返回类型
- 可以是同步或异步函数

```rust
// 基础命令定义
#[tauri::command]
fn basic_command(param: &str) -> String {
    format!("处理参数: {}", param)
}

// 带多参数的命令
#[tauri::command]
fn multi_params(name: &str, age: u32, active: bool) -> String {
    format!("名称: {}, 年龄: {}, 状态: {}", name, age, active)
}
```

**命令注册**：

- 在 Tauri 应用构建器中使用 `invoke_handler` 注册命令
- 使用 `tauri::generate_handler!` 宏生成命令处理器

```rust
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            basic_command,
            multi_params
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 参数类型与验证

**支持的参数类型**：

- 基本类型：`&str`, `String`, `i32`, `u32`, `f64`, `bool` 等
- 复杂类型：结构体、枚举（需实现 `Serialize` 和 `Deserialize` 特性）
- 可选参数：使用 `Option<T>` 类型

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct User {
    name: String,
    age: u32,
    roles: Vec<String>,
}

#[tauri::command]
fn process_user(user: User) -> String {
    format!("处理用户: {}, 年龄: {}, 角色数: {}", 
            user.name, user.age, user.roles.len())
}
```

**参数验证**：

- 使用 Rust 的模式匹配和条件检查
- 返回 `Result` 类型处理验证错误

```rust
#[tauri::command]
fn validate_input(value: i32) -> Result<String, String> {
    if value < 0 {
        return Err("值不能为负数".into());
    }
    if value > 100 {
        return Err("值不能大于100".into());
    }
    Ok(format!("有效值: {}", value))
}
```

## 错误处理

**使用 Result 类型**：

- Tauri 命令可以返回 `Result<T, E>` 类型
- 错误类型 `E` 必须实现 `Serialize` 特性
- 前端可以捕获和处理这些错误

```rust
use thiserror::Error;
use serde::Serialize;

#[derive(Error, Debug, Serialize)]
enum AppError {
    #[error("验证错误: {0}")]
    ValidationError(String),
    
    #[error("IO错误: {0}")]
    IoError(String),
    
    #[error("未知错误")]
    Unknown,
}

#[tauri::command]
fn risky_operation(input: &str) -> Result<String, AppError> {
    if input.is_empty() {
        return Err(AppError::ValidationError("输入不能为空".into()));
    }
    
    // 模拟IO操作
    if input == "trigger_io_error" {
        return Err(AppError::IoError("文件无法访问".into()));
    }
    
    Ok(format!("操作成功: {}", input))
}
```

## 异步命令

**定义异步命令**：

- 使用 `async` 关键字和 `.await` 语法
- 返回 `impl Future<Output = T>` 或 `async_trait` 中的类型

```rust
use tauri::async_runtime::Mutex;
use std::sync::Arc;
use std::time::Duration;

struct Database {
    // 模拟数据库连接
}

impl Database {
    async fn query(&self, sql: &str) -> Result<String, String> {
        // 模拟异步数据库查询
        tauri::async_runtime::sleep(Duration::from_millis(500)).await;
        Ok(format!("查询结果: {}", sql))
    }
}

#[tauri::command]
async fn db_query(db: tauri::State<'_, Arc<Mutex<Database>>>, sql: String) 
    -> Result<String, String> {
    let db = db.lock().await;
    db.query(&sql).await
}
```

**状态管理**：

- 使用 `tauri::State` 在命令间共享状态
- 结合 `Arc` 和 `Mutex` 安全地共享和修改状态

```rust
pub fn run() {
    let db = Arc::new(Mutex::new(Database {}));
    
    tauri::Builder::default()
        .manage(db) // 注册应用状态
        .invoke_handler(tauri::generate_handler![greet, db_query])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 前端调用

**基本调用**：

- 使用 `invoke` 函数调用 Tauri 命令
- 处理返回的 Promise

```typescript
// Vue 组件中调用 Tauri 命令
import { invoke } from '@tauri-apps/api/tauri';

// 在 setup 函数或组合式 API 中
const callGreet = async () => {
  try {
    const response = await invoke('greet', { name: 'Vue 用户' });
    console.log(response); // 输出: "Hello, Vue 用户!"
  } catch (error) {
    console.error('调用出错:', error);
  }
};

// 调用带复杂参数的命令
const processUser = async () => {
  const user = {
    name: '张三',
    age: 30,
    roles: ['admin', 'user']
  };
  
  try {
    const result = await invoke('process_user', { user });
    console.log(result);
  } catch (error) {
    console.error('处理用户出错:', error);
  }
};
```

**错误处理**：

- 使用 try/catch 捕获命令错误
- 处理自定义错误类型

```typescript
const handleRiskyOperation = async (input: string) => {
  try {
    const result = await invoke('risky_operation', { input });
    console.log('操作成功:', result);
  } catch (error: any) {
    // 处理不同类型的错误
    if (error.includes('ValidationError')) {
      console.error('验证错误:', error);
    } else if (error.includes('IoError')) {
      console.error('IO错误:', error);
    } else {
      console.error('未知错误:', error);
    }
  }
};
```

**TypeScript 类型定义**：

- 为 Tauri 命令创建类型定义，提高代码可靠性

```typescript
// types.ts
export interface User {
  name: string;
  age: number;
  roles: string[];
}

declare global {
  interface Window {
    __TAURI__: {
      invoke(cmd: 'greet', args: { name: string }): Promise<string>;
      invoke(cmd: 'process_user', args: { user: User }): Promise<string>;
      invoke(cmd: 'validate_input', args: { value: number }): Promise<string>;
      // 其他命令类型定义...
    }
  }
}
```

## 权限配置

**配置命令权限**：

- 在 `tauri.conf.json` 中配置命令权限
- 限制命令的访问范围和条件

```json
{
  "tauri": {
    "allowlist": {
      "all": false,
      // 配置允许的API
    },
    "security": {
      "dangerousRemoteDomainIpcAccess": [
        // 配置允许访问命令的远程域
        {
          "domain": "tauri.localhost",
          "windows": ["main"],
          "commands": ["greet", "basic_command"]
        }
      ]
    }
  }
}
```

**命令安全最佳实践**：

1. **最小权限原则**：只授予命令所需的最小权限
2. **输入验证**：始终验证命令输入，防止注入攻击
3. **错误处理**：不要在错误消息中泄露敏感信息
4. **状态隔离**：使用适当的锁机制确保状态安全
5. **避免阻塞主线程**：使用异步命令处理耗时操作

---

本文档详细介绍了 launch-rs 项目中 Tauri 命令的开发流程和最佳实践。
[返回设计文档](./design.md)
