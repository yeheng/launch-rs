# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `bun run dev` - Start development server with hot reload (port 1420)
- `bun run build` - Build the project (frontend TypeScript check + Vite build)
- `bun run preview` - Preview the built application
- `bun run tauri` - Run Tauri CLI commands

### Rust Backend Commands
- `cd src-tauri && cargo build` - Build Rust backend only
- `cd src-tauri && cargo test` - Run Rust tests
- `cd src-tauri && cargo run` - Run the Rust application directly

### Testing
- Tests are located in `src/lib/plugins/__tests__/` directory
- Run tests with your preferred test runner (framework not yet configured)

### Package Management
- Uses **Bun** as the primary package manager (not npm/yarn)
- Frontend dependencies in `package.json`
- Rust dependencies in `src-tauri/Cargo.toml`

## Project Architecture

### Technology Stack
- **Desktop Framework**: Tauri 2.0 (Rust + WebView architecture)
- **Frontend**: Vue 3 + TypeScript + Vite
- **UI Framework**: Shadcn-vue + TailwindCSS + reka-ui
- **State Management**: Pinia with persistence plugin
- **Internationalization**: Vue-i18n
- **Backend**: Rust with Tauri commands

### Core Architecture Patterns

**Tauri Command Pattern**: The application uses Tauri's command system for Rust-TypeScript communication:
```rust
// Rust side (src-tauri/src/lib.rs)
#[tauri::command]
fn command_name(param: Type) -> Result<ReturnType, String>

// TypeScript side
import { invoke } from '@tauri-apps/api/core'
await invoke('command_name', { param: value })
```

**Plugin System Architecture**: 
- **Plugin Manager**: `src/lib/search-plugin-manager.ts` - Central orchestrator
- **Plugin Interface**: `src/lib/search-plugins.ts` - Base interfaces and types
- **Built-in Plugins**: `src/lib/plugins/` - Apps, files, calculator, units
- **Enhanced Types**: `src/lib/plugins/types.ts` - Extended plugin metadata and validation
- **Plugin Registration**: Auto-registration in `src/lib/plugins/index.ts`

**State Management Pattern**:
- **Store Structure**: `src/store/index.ts` exports modules from `src/store/modules/`
- **User Store**: `src/store/modules/user.ts` handles user preferences, themes, i18n
- **Plugin State**: `src/lib/plugins/plugin-state-manager.ts` manages plugin states
- **Persistence**: Uses `pinia-plugin-persistedstate` for automatic state persistence

### Key Components

**Main Application Flow**:
1. **Entry Point**: `src/main.ts` initializes Pinia, router, i18n, and global shortcuts
2. **App Shell**: `src/App.vue` provides basic routing container
3. **Router**: `src/router.ts` handles navigation with metadata and breadcrumbs
4. **Home View**: `src/views/Home.vue` - Main search interface with plugin integration

**Rust Backend Structure**:
- **Library Entry**: `src-tauri/src/lib.rs` contains all Tauri commands and main application logic
- **Binary Entry**: `src-tauri/src/main.rs` simply calls `launch_rs_lib::run()`
- **Commands Available**:
  - `greet(name)` - Basic greeting function
  - `toggle_headless(headless)` - Window visibility control
  - `register_global_shortcut(shortcut_id, accelerator)` - Global hotkey registration
  - `unregister_global_shortcut(shortcut_id)` - Hotkey cleanup
  - `search_files(query, search_path?, max_results?)` - File system search

### Plugin System Deep Dive

**Plugin Lifecycle**:
1. Plugin implements `SearchPlugin` interface from `src/lib/search-plugins.ts`
2. Registration via `pluginManager.register()` in plugin index
3. Runtime search through `pluginManager.search(query, limit)`
4. Enhanced plugins support metadata, health monitoring, and validation

**Built-in Plugin Types**:
- **Apps Plugin**: System application search and launch
- **File Plugin**: File system search with Rust backend integration  
- **Calculator Plugin**: Mathematical expressions and calculations
- **Unit Converter**: Unit conversion calculations

**Plugin Enhancement Layer**:
- **Metadata**: Author, license, permissions, categories
- **Installation Tracking**: Built-in vs manual, installation status
- **Health Monitoring**: Performance metrics, error tracking
- **Validation**: Security assessment, compatibility checking
- **Configuration Schema**: Dynamic settings with validation

### UI Component System

**Shadcn-vue Integration**:
- Components located in `src/components/ui/`
- Built on reka-ui primitives with TailwindCSS styling
- Key components: Button, Dialog, Input, Select, Toast, Loading states
- Custom components: PluginCard, PluginDetailsModal, PluginSettingsDialog

**Styling Architecture**:
- **TailwindCSS**: Primary styling system with custom configuration
- **Component Variants**: Uses `class-variance-authority` for consistent variants
- **Utils**: `src/lib/utils.ts` provides `cn()` function for class merging
- **Theme System**: Integrated with user store for persistent theme switching

### Internationalization

**Structure**:
- **Config**: `src/locales/index.ts` - Vue-i18n setup with dynamic loading
- **Languages**: English (`en-US`) and Chinese (`zh-CN`) in `src/locales/`
- **Integration**: User store manages language persistence and switching
- **Usage**: `useI18n()` composable in components

### Development Patterns

**Vue 3 Composition API**: All components use `<script setup>` syntax with TypeScript
**Reactive State**: Uses `ref()`, `reactive()`, and `computed()` for component state
**Event Handling**: Custom event systems in plugin manager with `.on()/.off()` methods
**Error Handling**: Comprehensive error boundaries and plugin error management
**File Organization**: Feature-based organization with clear separation of concerns

### Configuration Files

**Key Config Files**:
- `src-tauri/tauri.conf.json` - Tauri window and security configuration
- `vite.config.ts` - Frontend build configuration with Tauri integration
- `tailwind.config.js` - TailwindCSS customization
- `tsconfig.json` - TypeScript configuration with path aliases
- `components.json` - Shadcn-vue component configuration

### Global Shortcuts & Window Management

The application supports global shortcuts for window toggle functionality:
- Default shortcut: Alt+Space (configurable)
- Headless mode support via `HEADLESS=true` environment variable
- Window decoration control for seamless UX
- Shortcut registration/unregistration through Rust backend

### File Search Integration

Rust-powered file search with:
- Recursive directory traversal (max depth: 3)
- Relevance-based scoring (exact match > prefix > contains)
- Performance optimization (max 50 results, skip hidden files)
- Cross-platform path handling using `dirs` crate