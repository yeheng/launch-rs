# 前端开发规范

## shadcn-vue组件开发流程

### 组件创建流程

**初始化组件**：

1. **创建组件目录结构**：
   ```
   src/components/ui/组件名/
   ├── 组件名.vue       # 主组件文件
   └── index.ts        # 导出文件和变体定义
   ```

2. **组件配置**：
   - 在`components.json`中添加组件配置（如需要）
   - 确保组件名称符合命名规范（PascalCase）

**开发步骤**：

1. **定义变体和样式**：在`index.ts`中使用`cva`定义组件变体
2. **实现组件逻辑**：在`.vue`文件中实现组件功能
3. **测试组件**：在应用中引入并测试组件
4. **文档化**：添加组件使用示例和说明

### 组件结构规范

**文件组织**：

- 每个组件应有独立目录
- 主组件文件与组件目录同名（PascalCase）
- 使用`index.ts`导出组件和变体定义

**代码结构**：

```vue
<!-- 组件名.vue -->
<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Primitive, type PrimitiveProps } from 'reka-ui'
import { type 组件名Variants, 组件名Variants } from '.'

interface Props extends PrimitiveProps {
  variant?: 组件名Variants['variant']
  size?: 组件名Variants['size']
  class?: HTMLAttributes['class']
  // 其他组件特有属性
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div', // 默认HTML元素
  // 其他默认值
})
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(组件名Variants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
```

### 样式定义方法

**使用class-variance-authority**：

```typescript
// index.ts
import { cva, type VariantProps } from 'class-variance-authority'

export { default as 组件名 } from './组件名.vue'

export const 组件名Variants = cva(
  'base-styles-here', // 基础样式类
  {
    variants: {
      variant: {
        default: 'default-variant-styles',
        secondary: 'secondary-variant-styles',
        // 其他变体
      },
      size: {
        default: 'default-size-styles',
        sm: 'small-size-styles',
        lg: 'large-size-styles',
        // 其他尺寸
      },
      // 其他变体类型
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export type 组件名Variants = VariantProps<typeof 组件名Variants>
```

**TailwindCSS类使用原则**：

- 使用语义化类名（如`bg-primary`而非`bg-blue-500`）
- 利用Tailwind的主题变量确保一致性
- 使用`cn()`函数合并条件类名
- 遵循项目的暗色模式约定（如使用`dark:`前缀）

### 变体配置指南

**变体类型设计**：

- **外观变体**（variant）：定义组件的视觉样式（如default, destructive, outline等）
- **尺寸变体**（size）：定义组件的大小（如default, sm, lg等）
- **状态变体**：定义组件的不同状态（如disabled, active等）

**变体实现最佳实践**：

- 保持变体命名一致性
- 确保变体间有足够视觉区分
- 为每个变体提供合理默认值
- 考虑变体组合的视觉效果
- 使用CSS变量实现主题化

### 组件导出和使用

**导出方式**：

```typescript
// index.ts
export { default as 组件名 } from './组件名.vue'
export { 组件名Variants } from './index'
export type { 组件名Variants } from './index'
```

**组件使用示例**：

```vue
<script setup lang="ts">
import { 组件名 } from '@/components/ui/组件名'
</script>

<template>
  <组件名 variant="default" size="default">
    内容
  </组件名>
</template>
```

**全局注册（可选）**：

```typescript
// main.ts
import { 组件名 } from '@/components/ui/组件名'

const app = createApp(App)
app.component('组件名', 组件名)
```

### 组件修改流程

**修改现有组件**：

1. **分析影响范围**：
   - 确定组件的使用位置
   - 评估修改对现有功能的影响

2. **修改步骤**：
   - 更新变体定义（如需要）
   - 修改组件实现
   - 更新组件文档
   - 测试所有受影响的场景

**向后兼容性考虑**：

- 尽量避免破坏性更改
- 如需重大更改，考虑版本控制或提供迁移路径
- 使用可选属性和合理默认值

**组件扩展**：

- 使用组合式API扩展组件功能
- 利用插槽系统增强组件灵活性
- 考虑使用高阶组件模式

### 状态管理开发

#### Pinia Store规范

1. **目录结构**
   - 所有状态模块放置在 `src/store/modules/` 目录下
   - 每个功能模块创建独立的状态文件，如 `user.ts`, `settings.ts`
   - 在 `src/store/index.ts` 中统一导出所有状态模块

2. **命名规范**
   - Store定义函数: `use[Module]Store`，如 `useUserStore`
   - Store ID: 使用模块名称，如 `'user'`
   - State接口: `[Module]State`，如 `UserState`

3. **代码组织**
   - 使用选项式API (defineStore with options)
   - 为复杂状态定义TypeScript接口
   - 按state、getters、actions顺序组织代码
   - 相关联的状态和操作放在同一模块中

4. **最佳实践**
   - 在组件setup中使用 `const store = useXxxStore()`
   - 使用解构时需使用storeToRefs: `const { prop } = storeToRefs(store)`
   - 仅在actions中修改状态，不在组件中直接修改
   - 考虑为关键状态添加持久化

---
本文档详细介绍了 launch-rs 项目中前端组件的开发流程和最佳实践。
[返回设计文档](./design.md)
