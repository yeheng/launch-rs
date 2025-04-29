# launch-rs 项目设计文档

## 技术栈架构

**跨端框架**:

- Tauri 2.0 (Rust + WebView)
- 开发模式端口: 1420
- 构建命令: `bun run build`

**前端技术**:

- Vue 3 + TypeScript
- 构建工具: Vite + Shadcn-vue
- 状态管理: Pinia
- UI组件库: `@/components/ui/button`
- 样式方案: TailwindCSS

**后端技术**:

- Rust 核心模块: `launch_rs_lib::run()`
- Tauri命令: `greet` 接口
- [插件系统](./plugin.md): 支持TypeScript插件的Rust插件框架

## 目录结构

```
├── src-tauri/         # Tauri核心
│   ├── build.rs       # 构建脚本
│   ├── tauri.conf.json # 窗口配置
│   └── src/
│       └── main.rs    # Rust入口
├── src/              # 前端核心
│   ├── App.vue       # 根组件
│   ├── lib/utils.ts  # 工具函数
│   ├── store/        # Pinia状态管理
│   │   ├── index.ts  # 状态管理入口
│   │   └── modules/  # 状态模块
│   │       └── user.ts # 用户状态模块
│   └── assets/       # 静态资源
└── vite.config.ts    # 构建配置
```

## 模块说明

### 前端模块

1. **App主组件**

- 功能: 集成Tauri调用和UI展示
- 交互: 通过`invoke("greet")`调用Rust命令
- 技术特性: Vue3组合式API (setup script)
- 依赖: Button组件, Tauri API

2. **UI组件库**

- 路径: `@/components/ui`
- 组件结构:
  - Button组件: 基于TailwindCSS的可变体按钮
    - 变体类型: default, destructive, outline, secondary, ghost, link
    - 尺寸选项: default, sm, lg, icon
    - 依赖: class-variance-authority, reka-ui, utils

3. **状态管理**

- 技术: Pinia
- 路径: `@/store`
- 模块结构:
  - 入口文件: `index.ts` - 导出所有状态模块
  - 用户模块: `modules/user.ts` - 用户信息与偏好设置
    - 状态(State): 用户ID、用户名、登录状态、偏好设置
    - 计算属性(Getters): 显示名称、登录状态、当前主题
    - 操作(Actions): 设置用户信息、退出登录、切换主题、设置语言
    - 持久化: 用户偏好设置本地存储
- 使用方式: 通过`useUserStore()`在组件中访问状态

4. **工具函数**

- 路径: `@/lib/utils.ts`
- 功能: 提供CSS类合并工具 `cn()`
- 依赖: clsx, tailwind-merge

### Rust模块

1. **核心库**

- 入口: `launch_rs_lib::run()`
- 当前功能: 窗口初始化

2. **插件系统**

- [详细设计文档](./plugin.md)
- 功能特性:
  - TypeScript插件支持
  - 热插拔能力
  - 动态加载更新
  - Rust底层集成

## 接口定义

**Tauri命令接口**:

```rust
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}
```

## 开发规范

### Tauri命令开发

[Tauri命令开发流程](./tauri-development.md)

### 前端组件开发

[前端组件开发流程](./frontend-development.md)

### 插件开发

[插件系统开发指南](./plugin.md)

## 待完善模块

1. 补充Rust模块的线程调度设计（当前main.rs仅调用库入口）
2. 增加Tauri命令安全审计章节
3. 添加前端组件依赖关系图（当前仅Button组件）
4. 完善插件系统实现
