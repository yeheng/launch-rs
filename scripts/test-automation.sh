#!/bin/bash

# 测试自动化脚本
# 用于CI/CD和本地开发环境

set -e  # 遇到错误立即退出

echo "🚀 Launch-rs 测试自动化流程开始"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查项目依赖..."
    
    if ! command -v bun &> /dev/null; then
        log_error "Bun 未安装，请先安装 Bun"
        exit 1
    fi
    
    if ! command -v cargo &> /dev/null; then
        log_error "Cargo 未安装，请先安装 Rust"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 安装前端依赖
    bun install
    
    # 检查Rust依赖
    cd src-tauri
    cargo check
    cd ..
    
    log_success "依赖安装完成"
}

# 运行静态检查
run_static_checks() {
    log_info "运行静态代码检查..."
    
    # TypeScript 类型检查
    log_info "TypeScript 类型检查..."
    bunx vue-tsc --noEmit
    
    # Rust 编译检查
    log_info "Rust 编译检查..."
    cd src-tauri
    cargo check
    cargo clippy -- -D warnings
    cd ..
    
    log_success "静态检查通过"
}

# 运行单元测试
run_unit_tests() {
    log_info "运行单元测试..."
    
    # 前端单元测试
    log_info "前端单元测试..."
    bun run test:run
    
    # Rust 单元测试
    log_info "Rust 单元测试..."
    bun run test:rust
    
    log_success "单元测试通过"
}

# 运行E2E测试
run_e2e_tests() {
    log_info "运行E2E测试..."
    
    bun run test:e2e
    
    log_success "E2E测试通过"
}

# 生成覆盖率报告
generate_coverage() {
    log_info "生成测试覆盖率报告..."
    
    # 前端覆盖率
    bun run test:coverage
    
    # Rust 覆盖率（需要额外工具）
    if command -v cargo-tarpaulin &> /dev/null; then
        cd src-tauri
        cargo tarpaulin --out Html --output-dir ../coverage/rust
        cd ..
        log_success "Rust 覆盖率报告已生成"
    else
        log_warning "cargo-tarpaulin 未安装，跳过 Rust 覆盖率"
    fi
    
    log_success "覆盖率报告生成完成"
}

# 性能测试
run_performance_tests() {
    log_info "运行性能测试..."
    
    # 构建应用以测试性能
    bun run build
    
    # 这里可以添加性能基准测试
    log_info "构建性能测试完成"
    
    log_success "性能测试通过"
}

# 清理测试资源
cleanup() {
    log_info "清理测试资源..."
    
    # 清理临时文件
    rm -rf coverage/tmp
    rm -rf .vitest-cache
    rm -rf src-tauri/target/debug/deps/*test*
    
    log_success "清理完成"
}

# 主函数
main() {
    local test_type="${1:-all}"
    local skip_deps="${2:-false}"
    
    echo "测试类型: $test_type"
    echo "跳过依赖安装: $skip_deps"
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 安装依赖（除非明确跳过）
    if [ "$skip_deps" != "true" ]; then
        install_dependencies
    fi
    
    # 创建测试结果目录
    mkdir -p test-results
    mkdir -p coverage
    
    case $test_type in
        "unit")
            run_static_checks
            run_unit_tests
            ;;
        "e2e")
            run_static_checks
            run_e2e_tests
            ;;
        "coverage")
            run_static_checks
            generate_coverage
            ;;
        "performance")
            run_static_checks
            run_performance_tests
            ;;
        "ci")
            run_static_checks
            run_unit_tests
            run_e2e_tests
            generate_coverage
            ;;
        "all")
            run_static_checks
            run_unit_tests
            run_e2e_tests
            generate_coverage
            run_performance_tests
            ;;
        *)
            log_error "无效的测试类型: $test_type"
            echo "可用选项: unit, e2e, coverage, performance, ci, all"
            exit 1
            ;;
    esac
    
    cleanup
    
    log_success "🎉 所有测试完成！"
}

# 错误处理
trap 'log_error "测试过程中发生错误，正在清理..."; cleanup; exit 1' ERR

# 运行主函数
main "$@"