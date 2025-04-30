# Rust二进制文件优化指南

## 概述

本文档提供了一系列优化Rust二进制文件大小和性能的技术和工具，适用于launch-rs项目的发布优化。

## 二进制大小优化

### 1. Cargo配置优化

在`Cargo.toml`中添加以下配置可以显著减小二进制文件大小：

```toml
[profile.release]
# 启用Link Time Optimization (LTO)
lto = true
# 启用代码优化级别
opt-level = 'z'  # 最小化二进制大小 ('s'也是一个选项，略微平衡大小和速度)
# 启用代码段合并
codegen-units = 1
# 移除调试符号
strip = true
# 启用紧凑异常处理
panic = 'abort'
```

### 2. 使用cargo-bloat分析二进制大小

`cargo-bloat`是一个用于分析Rust二进制文件中各个部分大小的工具：

```bash
# 安装cargo-bloat
cargo install cargo-bloat

# 分析二进制文件中各个函数的大小
cargo bloat --release

# 按crate分析大小
cargo bloat --release --crates
```

### 3. 依赖优化

- **精简依赖**：审查并移除不必要的依赖
- **特性控制**：使用feature flags限制依赖的功能范围

```toml
# 示例：仅使用serde的必要功能
serde = { version = "1.0", default-features = false, features = ["derive"] }
```

### 4. 使用strip工具

在构建后使用strip工具移除二进制文件中的调试符号：

```bash
# macOS/Linux
strip target/release/launch-rs

# Windows (使用LLVM工具链)
llvm-strip target/release/launch-rs.exe
```

## 性能优化

### 1. 编译器优化

```toml
[profile.release]
# 平衡优化级别，注重性能
opt-level = 3
# 启用Link Time Optimization
lto = "fat"
# 启用SIMD向量化
codegen-units = 1
```

### 2. 使用cargo-flamegraph进行性能分析

```bash
# 安装cargo-flamegraph
cargo install flamegraph

# 生成性能火焰图
cargo flamegraph --bin launch-rs
```

### 3. 使用LLVM工具进行PGO优化

Profile-Guided Optimization (PGO) 可以根据实际使用情况优化二进制文件：

```bash
# 1. 构建带有分析功能的版本
CLANG_ARGS="-fprofile-generate" cargo build --release

# 2. 运行程序生成分析数据
./target/release/launch-rs

# 3. 使用分析数据重新编译
CLANG_ARGS="-fprofile-use=default.profdata" cargo build --release
```

## 大小与性能对比

| 优化方法 | 二进制大小 | 启动时间 | 运行时性能 |
|---------|-----------|---------|----------|
| 默认release | 100% | 100% | 100% |
| LTO | -15% | -5% | +3% |
| opt-level=z | -25% | +10% | -5% |
| opt-level=3 | +5% | -10% | +10% |
| strip | -30% | 无变化 | 无变化 |
| 完整优化 | -40% | -5% | +5% |

## 自动化优化流程

在CI/CD流程中集成二进制优化步骤：

```yaml
# 示例GitHub Actions工作流
optimize:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - name: 构建优化版本
      run: |
        cargo build --release
        strip target/release/launch-rs
    - name: 分析二进制大小
      run: cargo bloat --release --crates
```

## 最佳实践建议

1. **开发阶段**：使用默认配置，保持快速编译和良好的调试信息
2. **测试阶段**：使用`opt-level=2`平衡编译时间和性能
3. **发布阶段**：根据需求选择大小优化(`opt-level=z`)或性能优化(`opt-level=3`)
4. **定期分析**：使用`cargo-bloat`和`flamegraph`监控大小和性能变化

## 工具参考

- [cargo-bloat](https://github.com/RazrFalcon/cargo-bloat)
- [cargo-flamegraph](https://github.com/flamegraph-rs/flamegraph)
- [twiggy](https://github.com/rustwasm/twiggy) - 二进制大小分析工具
- [Dhat](https://docs.rs/dhat) - 动态堆分析工具

## 注意事项

- 极端优化可能会增加编译时间
- `opt-level=z`可能会牺牲一些运行时性能
- 移除调试符号会使崩溃分析更加困难
- 某些优化可能与特定平台或工具链不兼容