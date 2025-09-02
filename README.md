# Launch-rs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app/)
[![Vue 3](https://img.shields.io/badge/Vue-3.5.13-green.svg)](https://vuejs.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org/)

一个基于 Tauri 2.0 的现代化桌面应用程序，采用 Rust 后端 + Vue 3 前端架构，实现了插件化的搜索启动器功能。

## ✨ 特性

### 🚀 核心功能

- **🔍 智能搜索**: 支持应用程序、文件、计算器等多种搜索类型
- **🔌 插件系统**: 高度可扩展的插件架构，支持动态加载和管理
- **⚡ 全局快捷键**: 可自定义的全局快捷键，快速启动应用
- **🎨 现代化界面**: 基于 Shadcn-vue 的美观用户界面
- **🌍 多语言支持**: 内置中英文国际化支持

### 🛠️ 技术特性

- **跨平台**: 支持 Windows、macOS、Linux
- **高性能**: Rust 后端确保出色的性能表现
- **响应式**: Vue 3 Composition API 提供流畅的用户体验
- **状态持久化**: 自动保存用户偏好和插件配置
- **实时监控**: 插件性能监控和健康检查

## 🏗️ 技术栈

### 后端技术

- **框架**: [Tauri 2.0](https://tauri.app/) - Rust + WebView 架构
- **语言**: [Rust](https://www.rust-lang.org/) (edition 2021)
- **插件**: [tauri-plugin-global-shortcut](https://github.com/tauri-apps/plugins-workspace) - 全局快捷键
- **序列化**: [Serde](https://serde.rs/) + [Serde JSON](https://github.com/serde-rs/json)
- **路径处理**: [dirs](https://crates.io/crates/dirs) - 跨平台目录路径

### 前端技术

- **框架**: [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **包管理器**: [Bun](https://bun.sh/) (首选) - 高性能的 JavaScript 运行时和包管理器
- **状态管理**: [Pinia](https://pinia.vuejs.org/) + [pinia-plugin-persistedstate](https://prazdevs.github.io/pinia-plugin-persistedstate/)
- **UI 框架**: [Shadcn-vue](https://www.shadcn-vue.com/) + [TailwindCSS](https://tailwindcss.com/) + [reka-ui](https://reka-ui.com/)
- **国际化**: [Vue i18n](https://vue-i18n.intlify.dev/)
- **测试**: [Vitest](https://vitest.dev/) + [Vue Test Utils](https://test-utils.vuejs.org/)

## 📦 包管理器

### 为什么选择 Bun？

**Bun** 是本项目首选的包管理器，它提供了显著的性能优势：

- **⚡ 极速安装**: 比 npm 快 5-10 倍的依赖安装速度
- **🚀 内置运行时**: 原生支持 TypeScript 和 JSX，无需额外配置
- **🛠️ 一体化工具**: 集成了包管理器、运行时、测试运行器和打包器
- **🔧 兼容性**: 完全兼容 npm 生态系统，可以无缝替换

### 安装 Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# 验证安装
bun --version
```

### 使用 Bun

```bash
# 安装依赖
bun install

# 运行开发服务器
bun run dev

# 运行测试
bun test

# 构建项目
bun run build
```

> 💡 **提示**: 如果你已经熟悉 npm/yarn，可以无缝切换到 Bun。所有现有的 npm 命令都有对应的 Bun 等价命令。

## 🚀 快速开始

### 环境要求

- **Node.js**: >= 18.0.0
- **Rust**: >= 1.70.0
- **包管理器**: [Bun](https://bun.sh/) (首选和推荐) 或 npm/yarn

### 安装步骤

1. **克隆项目**

   ```bash
   git clone https://github.com/your-username/launch-rs.git
   cd launch-rs
   ```

2. **安装依赖**

   ```bash
   # 使用 Bun (首选和推荐)
   bun install
   
   # 或使用 npm
   npm install
   ```

3. **启动开发服务器**

   ```bash
   # 启动前端开发服务器
   bun run dev
   
   # 启动完整的 Tauri 开发环境
   bun run tauri dev
   ```

### 构建应用

```bash
# 构建前端 (使用 Bun)
bun run build

# 构建完整的桌面应用 (使用 Bun)
bun run tauri build
```

### 运行测试

```bash
# 运行前端测试 (使用 Bun)
bun test

# 运行 Rust 测试
cd src-tauri && cargo test
```

## 📁 项目结构

```
launch-rs/
├── src-tauri/                 # Rust 后端代码
│   ├── src/
│   │   ├── main.rs            # 应用程序入口点
│   │   └── lib.rs             # Tauri 命令和核心逻辑
│   ├── Cargo.toml             # Rust 依赖配置
│   └── tauri.conf.json        # Tauri 配置文件
├── src/                       # Vue 前端代码
│   ├── components/            # Vue 组件
│   ├── lib/                   # 核心业务逻辑
│   │   ├── plugins/           # 插件系统
│   │   └── search-plugin-manager.ts
│   ├── store/                 # Pinia 状态管理
│   ├── views/                 # 页面视图
│   └── locales/               # 国际化文件
├── docs/                      # 项目文档
├── package.json                # 前端依赖配置
└── README.md                  # 项目说明
```

## 🔌 插件系统

### 内置插件

- **📱 Apps**: 系统应用程序搜索和启动
- **📁 Files**: 文件系统搜索和管理
- **🧮 Calculator**: 数学表达式计算
- **📏 Units**: 单位转换计算

### 开发自定义插件

```typescript
// 插件开发示例
class MyPlugin implements SearchPlugin {
  id = 'my-plugin'
  name = 'My Custom Plugin'
  description = 'Custom search functionality'
  
  async search(context: SearchContext): Promise<SearchResultItem[]> {
    // 实现搜索逻辑
    return [{
      id: 'result-1',
      title: 'Search Result',
      description: 'Result description',
      action: () => this.handleAction(),
      icon: 'search',
      priority: 80
    }]
  }
}

// 注册插件
pluginManager.register(new MyPlugin())
```

详细插件开发指南请参考 [插件架构文档](docs/plugin-architecture.md)。

## 📖 API 文档

### Tauri 命令接口

应用程序提供了以下核心命令接口：

- **`greet(name)`** - 基础问候功能
- **`toggle_headless(headless)`** - 窗口可见性控制
- **`register_global_shortcut(shortcut_id, accelerator)`** - 全局快捷键注册
- **`unregister_global_shortcut(shortcut_id)`** - 全局快捷键注销
- **`search_files(query, search_path?, max_results?)`** - 文件系统搜索

详细 API 文档请参考 [API 文档](docs/api-documentation.md)。

## 🎨 界面展示

### 主界面

- **搜索框**: 中央搜索输入框，支持实时搜索
- **结果列表**: 动态显示搜索结果，支持高亮和分类
- **插件状态**: 显示当前启用的插件和搜索状态

### 插件管理

- **插件列表**: 显示所有已安装的插件
- **插件详情**: 查看插件详细信息、配置选项
- **性能监控**: 实时显示插件性能指标

### 设置界面

- **主题设置**: 支持亮色/暗色主题切换
- **语言设置**: 中英文语言切换
- **快捷键设置**: 自定义全局快捷键

## 🔧 配置说明

### 环境变量

```bash
# 启用无头模式
HEADLESS=true

# 设置开发服务器端口
PORT=1420

# 设置日志级别
LOG_LEVEL=debug
```

### 应用配置

主要配置文件：

- **`src-tauri/tauri.conf.json`** - Tauri 应用配置
- **`vite.config.ts`** - Vite 构建配置
- **`tailwind.config.js`** - TailwindCSS 配置
- **`tsconfig.json`** - TypeScript 配置

## 🧪 测试

### 前端测试

```bash
# 运行所有测试 (使用 Bun)
bun test

# 运行特定测试文件 (使用 Bun)
bun test src/lib/plugins/__tests__/plugin-management-service.test.ts

# 运行测试并生成覆盖率报告 (使用 Bun)
bun test --coverage
```

### Rust 测试

```bash
# 运行所有测试
cd src-tauri && cargo test

# 运行特定测试
cd src-tauri && cargo test greet

# 运行测试并生成覆盖率报告
cd src-tauri && cargo tarpaulin
```

## 📦 构建和发布

### 开发构建

```bash
# 构建前端资源 (使用 Bun)
bun run build

# 构建 Rust 后端
cd src-tauri && cargo build

# 完整开发构建 (使用 Bun)
bun run tauri build --debug
```

### 生产构建

```bash
# 生产环境构建 (使用 Bun)
bun run tauri build

# 指定平台构建 (使用 Bun)
bun run tauri build --target x86_64-pc-windows-msvc
bun run tauri build --target x86_64-apple-darwin
bun run tauri build --target x86_64-unknown-linux-gnu
```

### 发布检查

```bash
# 检查构建问题 (使用 Bun)
bun run tauri build --bundles none

# 检查依赖问题 (使用 Bun)
bun audit
cd src-tauri && cargo audit
```

## 🤝 贡献指南

### 开发流程

1. **Fork 项目** 并创建特性分支
2. **安装 Bun** (如果尚未安装) - 见上方 [包管理器](#-包管理器) 部分
3. **安装依赖**: `bun install`
4. **遵循代码规范** (见 [代码规范](docs/code-standards.md))
5. **编写测试** 确保代码质量: `bun test`
6. **提交更改** 并推送分支
7. **创建 Pull Request** 等待审核

### 代码规范

- **TypeScript**: 使用严格模式，添加适当的类型注解
- **Vue 3**: 使用 Composition API 和 `<script setup>` 语法
- **Rust**: 遵循 Rust 官方风格指南
- **提交信息**: 使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式

### 提交格式

```bash
# 功能添加
feat: add new plugin type support

# 错误修复
fix: resolve plugin installation issue

# 文档更新
docs: update API documentation

# 样式调整
style: improve UI component styling
```

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Tauri](https://tauri.app/) - 优秀的跨平台桌面应用框架
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Shadcn-vue](https://www.shadcn-vue.com/) - 美观的 Vue 组件库
- [TailwindCSS](https://tailwindcss.com/) - 实用优先的 CSS 框架

## 📞 支持

- **问题反馈**: [GitHub Issues](https://github.com/your-username/launch-rs/issues)
- **功能请求**: [GitHub Discussions](https://github.com/your-username/launch-rs/discussions)
- **邮件联系**: <your-email@example.com>

## 📊 项目状态

[![GitHub issues](https://img.shields.io/github/issues/your-username/launch-rs.svg)](https://github.com/your-username/launch-rs/issues)
[![GitHub forks](https://img.shields.io/github/forks/your-username/launch-rs.svg)](https://github.com/your-username/launch-rs/network)
[![GitHub stars](https://img.shields.io/github/stars/your-username/launch-rs.svg)](https://github.com/your-username/launch-rs/stargazers)

---

<div align="center">
  <p>
    <strong>Launch-rs</strong> - 现代化的桌面搜索启动器
  </p>
  <p>
    Made with ❤️ by <a href="https://github.com/your-username">Your Name</a>
  </p>
</div>
