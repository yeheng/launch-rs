<template>
  <nav class="flex items-center space-x-2 text-sm" :aria-label="ariaLabel">
    <template v-for="(item, index) in items" :key="item.path || index">
      <!-- Separator -->
      <span v-if="index > 0" class="text-gray-400" aria-hidden="true">
        {{ separator }}
      </span>
      
      <!-- Breadcrumb Item -->
      <component
        :is="item.path && index < items.length - 1 ? 'button' : 'span'"
        :class="[
          'transition-colors',
          item.path && index < items.length - 1
            ? 'text-gray-500 hover:text-gray-700 cursor-pointer'
            : 'text-gray-900 font-medium'
        ]"
        @click="item.path && index < items.length - 1 ? handleItemClick(item) : undefined"
      >
        {{ item.name }}
      </component>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

interface BreadcrumbItem {
  name: string
  path?: string
}

interface Props {
  items: BreadcrumbItem[]
  separator?: string
  ariaLabel?: string
}

withDefaults(defineProps<Props>(), {
  separator: '/',
  ariaLabel: 'Breadcrumb navigation'
})

const router = useRouter()

const handleItemClick = (item: BreadcrumbItem) => {
  if (item.path) {
    router.push(item.path)
  }
}
</script>