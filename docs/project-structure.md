# 项目结构文档

## 概述

Launch-rs 是一个基于 Tauri 2.0 的桌面应用程序，采用 Rust 后端 + Vue 3 前端的架构。项目实现了插件化的搜索启动器功能，支持多种搜索类型和扩展。

## 技术栈

### 后端技术栈

- **框架**: Tauri 2.0 (Rust + WebView 架构)
- **语言**: Rust (edition 2021)
- **主要依赖**:
  - `tauri` - 核心 Tauri 框架
  - `tauri-plugin-global-shortcut` - 全局快捷键支持
  - `tauri-plugin-opener` - 文件/URL 打开功能
  - `serde` + `serde_json` - JSON 序列化
  - `dirs` - 跨平台目录路径处理

### 前端技术栈

- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia + 持久化插件
- **UI 框架**: Shadcn-vue + TailwindCSS + reka-ui
- **国际化**: Vue-i18n
- **测试**: Vitest + Vue Test Utils

## 目录结构

```
launch-rs/
├── src-tauri/                 # Rust 后端代码
│   ├── src/
│   │   ├── main.rs            # 应用程序入口点
│   │   └── lib.rs             # Tauri 命令和核心逻辑
│   ├── Cargo.toml             # Rust 依赖配置
│   ├── build.rs               # 构建脚本
│   └── tauri.conf.json        # Tauri 配置文件
├── src/                       # Vue 前端代码
│   ├── components/            # Vue 组件
│   │   ├── ui/                # 基础 UI 组件 (Shadcn-vue)
│   │   ├── PluginCard.vue     # 插件卡片组件
│   │   ├── PluginDetailsModal.vue  # 插件详情模态框
│   │   └── ...                # 其他业务组件
│   ├── lib/                   # 核心业务逻辑
│   │   ├── search-plugin-manager.ts      # 插件管理器
│   │   ├── search-plugins.ts            # 插件接口定义
│   │   └── plugins/                    # 插件系统
│   │       ├── plugin-management-service.ts  # 插件管理服务
│   │       ├── plugin-state-manager.ts        # 插件状态管理
│   │       ├── types.ts                    # 插件类型定义
│   │       └── index.ts                    # 插件注册入口
│   ├── store/                  # Pinia 状态管理
│   │   ├── modules/            # 状态模块
│   │   └── index.ts            # 状态导出
│   ├── views/                  # 页面视图
│   │   ├── Home.vue            # 主页搜索界面
│   │   ├── PluginSettings.vue  # 插件设置页面
│   │   └── ...                 # 其他页面
│   ├── locales/                # 国际化文件
│   │   ├── en-US.ts            # 英文语言包
│   │   └── zh-CN.ts            # 中文语言包
│   ├── main.ts                 # 应用程序入口
│   ├── App.vue                 # 根组件
│   └── router.ts               # 路由配置
├── docs/                       # 项目文档
│   ├── project-structure.md   # 项目结构文档
│   ├── api-documentation.md    # API 文档
│   └── plugin-architecture.md  # 插件架构文档
├── package.json                # 前端依赖配置
├── vite.config.ts              # Vite 构建配置
├── tailwind.config.js          # TailwindCSS 配置
├── tsconfig.json               # TypeScript 配置
└── components.json             # Shadcn-vue 组件配置
```

## 核心架构组件

### 1. Tauri 命令系统 (src-tauri/src/lib.rs)

Rust 后端提供了以下核心命令：

- **`greet(name)`** - 基础问候功能
- **`toggle_headless(headless)`** - 窗口可见性控制
- **`register_global_shortcut(shortcut_id, accelerator)`** - 全局快捷键注册
- **`unregister_global_shortcut(shortcut_id)`** - 全局快捷键注销
- **`search_files(query, search_path?, max_results?)`** - 文件系统搜索

### 2. 插件管理系统 (src/lib/plugins/)

#### 核心组件

- **`SearchPluginManager`** - 插件管理器，负责插件注册、搜索协调
- **`PluginManagementService`** - 插件管理服务，提供安装、卸载、更新等功能
- **`plugin-state-manager.ts`** - 插件状态管理和持久化
- **`plugin-statistics.ts`** - 插件统计和性能监控

#### 插件类型

- **内置插件**: Apps、Files、Calculator、Units
- **外部插件**: 通过插件管理系统安装和管理

### 3. 前端组件系统

#### UI 组件层次

```
App.vue (根组件)
├── 路由系统
├── 全局状态 (Pinia)
├── 国际化 (Vue-i18n)
└── 页面组件
    ├── Home.vue (主搜索界面)
    ├── PluginManagementPage.vue (插件管理)
    └── SettingWindow.vue (设置窗口)
```

#### 业务组件

- **`PluginCard`** - 插件展示卡片
- **`PluginDetailsModal`** - 插件详情展示
- **`PluginSettingsDialog`** - 插件设置对话框
- **`PerformanceDashboard`** - 性能监控面板

### 4. 状态管理架构

#### Pinia Store 模块

- **`user.ts`** - 用户偏好、主题、语言设置
- **`plugin-state-manager.ts`** - 插件状态管理
- **持久化策略** - 使用 `pinia-plugin-persistedstate`

#### 状态类型

- **应用状态**: 主题、语言、用户偏好
- **插件状态**: 启用/禁用、配置、使用统计
- **临时状态**: 搜索结果、UI 状态

### 5. 插件架构详情

#### 插件生命周期

1. **注册** → 插件管理器注册
2. **初始化** → 状态初始化和配置加载
3. **搜索** → 响应用户搜索请求
4. **状态管理** → 启用/禁用、配置更新
5. **监控** → 性能监控和健康检查
6. **清理** → 卸载或禁用时清理资源

#### 插件增强特性

- **元数据管理**: 作者、许可证、分类、权限
- **安装跟踪**: 内置 vs 手动、安装状态
- **健康监控**: 性能指标、错误跟踪
- **安全验证**: 权限检查、兼容性验证
- **配置管理**: 动态设置、验证和持久化

## 数据流架构

### 1. 搜索流程

```
用户输入 → 搜索插件管理器 → 并行搜索各插件 → 结果聚合排序 → 返回结果
```

### 2. 插件管理流程

```
插件操作 → 插件管理服务 → 验证和权限检查 → 执行操作 → 更新状态 → 通知监听器
```

### 3. 状态同步流程

```
用户操作 → Pinia Store → 持久化存储 → 其他组件响应 → UI 更新
```

## 配置文件说明

### 1. Tauri 配置 (src-tauri/tauri.conf.json)

- 窗口设置和装饰器配置
- 安全策略和权限设置
- 构建和打包配置

### 2. 前端配置文件

- **`package.json`** - 项目依赖和脚本配置
- **`vite.config.ts`** - Vite 构建配置，包含 Tauri 集成
- **`tailwind.config.js`** - TailwindCSS 自定义配置
- **`tsconfig.json`** - TypeScript 配置和路径别名
- **`components.json`** - Shadcn-vue 组件配置

## 开发工作流

### 1. 开发环境启动

```bash
# 前端开发服务器
bun run dev

# Rust 后端构建
cd src-tauri && cargo build

# 完整应用运行
bun run tauri dev
```

### 2. 测试流程

```bash
# 前端测试
bun test

# Rust 测试
cd src-tauri && cargo test
```

### 3. 构建流程

```bash
# 前端构建
bun run build

# 完整应用构建
bun run tauri build
```

## 关键设计模式

### 1. 插件模式

- **策略模式**: 不同插件实现相同的搜索接口
- **观察者模式**: 插件状态变化通知监听器
- **工厂模式**: 插件实例化和注册

### 2. 状态管理模式

- **单一数据源**: Pinia 提供统一状态管理
- **响应式更新**: Vue 3 响应式系统
- **持久化**: 自动保存用户偏好和设置

### 3. 架构模式

- **分层架构**: 清晰的表示层、业务层、数据层分离
- **微前端思想**: 插件化设计支持功能扩展
- **事件驱动**: 插件间通过事件进行通信

## 扩展点

### 1. 新插件开发

- 实现 `SearchPlugin` 接口
- 在 `src/lib/plugins/index.ts` 中注册
- 添加相应的元数据和配置

### 2. 新功能模块

- 在 `src/lib/` 下创建新模块
- 在 Pinia 中添加对应的状态管理
- 创建相应的 Vue 组件和页面

### 3. UI 组件扩展

- 基于 Shadcn-vue 创建新组件
- 遵循现有的设计系统
- 添加到 `components.json` 配置中

这个项目结构文档提供了对整个应用的架构概览，有助于新开发者快速理解项目组织方式和关键组件关系。
