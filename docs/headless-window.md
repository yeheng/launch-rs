# Tauri无头窗口模式使用指南

## 配置方式

### 1. 静态配置（tauri.conf.json）

在`tauri.conf.json`文件中，可以通过以下配置控制窗口是否为无头模式：

```json
"windows": [
  {
    "title": "launch-rs",
    "width": 800,
    "height": 600,
    "visible": false,  // 设置为false启用无头模式
    "decorations": false,  // 设置为false移除窗口装饰（标题栏等）
    "transparent": true  // 可选：设置为true使窗口透明
  }
]
```

### 2. 动态控制（Rust代码）

在Rust代码中，可以通过Tauri API动态控制窗口的可见性：

```rust
// 在应用启动时获取主窗口
let window = app.get_window("main").unwrap();

// 隐藏窗口（切换为无头模式）
window.hide().unwrap();

// 显示窗口（退出无头模式）
// window.show().unwrap();

// 设置窗口是否有装饰（标题栏等）
// window.set_decorations(false).unwrap();

// 设置窗口是否透明
// window.set_transparent(true).unwrap();
```

### 3. 前端控制（JavaScript/TypeScript）

在前端代码中，可以通过Tauri API控制窗口：

```typescript
import { appWindow } from '@tauri-apps/api/window';

// 隐藏窗口（切换为无头模式）
await appWindow.hide();

// 显示窗口（退出无头模式）
// await appWindow.show();

// 设置窗口是否有装饰（标题栏等）
// await appWindow.setDecorations(false);
```

## 使用场景

无头窗口模式适用于以下场景：

1. **后台服务应用**：应用需要在后台运行，不需要UI界面
2. **系统托盘应用**：应用主要通过系统托盘图标交互
3. **临时隐藏**：在特定操作期间临时隐藏窗口
4. **自定义窗口**：创建完全自定义外观的窗口（结合`decorations: false`和`transparent: true`）

## 注意事项

1. 当使用无头模式时，确保提供其他与用户交互的方式（如系统托盘图标）
2. 在某些操作系统上，无头窗口可能仍会在任务栏显示
3. 使用`transparent: true`可能会影响性能
4. 在生产环境中切换到无头模式前，确保用户有方法重新显示窗口