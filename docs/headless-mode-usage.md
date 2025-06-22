# Tauri无头窗口模式使用指南

## 概述

无头窗口模式允许应用在没有可见UI界面的情况下运行，适用于后台服务、系统托盘应用等场景。本项目已集成无头窗口支持，可通过环境变量或配置文件控制。

## 启用方法

### 方法1：使用环境变量（推荐）

启动应用时设置`HEADLESS`环境变量为`true`即可启用无头模式：

```bash
# Linux/macOS
HEADLESS=true cargo tauri dev

# Windows PowerShell
$env:HEADLESS="true"; cargo tauri dev

# Windows CMD
set HEADLESS=true && cargo tauri dev
```

### 方法2：修改配置文件

在`src-tauri/tauri.conf.json`文件中修改窗口配置：

```json
"windows": [
  {
    "title": "launch-rs",
    "width": 800,
    "height": 600,
    "visible": false,  // 设置为false启用无头模式
    "decorations": false  // 设置为false移除窗口装饰
  }
]
```

## 编程控制

### Rust代码中控制

```rust
// 导入toggle_headless_mode函数
use launch_rs_lib::toggle_headless_mode;

// 在setup回调中使用
.setup(|app| {
    // 切换为无头模式
    toggle_headless_mode(app, "main", true)?;
    
    // 或者切换为正常模式
    // toggle_headless_mode(app, "main", false)?;
    
    Ok(())
})
```

### 前端代码中控制

```typescript
import { appWindow } from '@tauri-apps/api/window';

// 切换为无头模式
async function enableHeadlessMode() {
  await appWindow.hide();
  await appWindow.setDecorations(false);
}

// 切换为正常模式
async function disableHeadlessMode() {
  await appWindow.setDecorations(true);
  await appWindow.show();
}
```

## 注意事项

1. 无头模式下，应用仍在后台运行，可通过系统托盘图标或快捷键与应用交互
2. 如需完全隐藏应用，可结合`transparent: true`配置使窗口透明
3. 在生产环境中使用无头模式时，建议提供恢复窗口的方法（如系统托盘菜单项）