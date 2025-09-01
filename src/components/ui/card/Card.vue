<template>
  <div
    :class="cardVariants({ variant, size })"
    v-bind="$attrs"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  'rounded-xl border bg-card text-card-foreground shadow',
  {
    variants: {
      variant: {
        default: '',
        outlined: 'border-2',
        elevated: 'shadow-lg',
      },
      size: {
        default: 'p-6',
        sm: 'p-4',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface CardProps {
  variant?: VariantProps<typeof cardVariants>['variant']
  size?: VariantProps<typeof cardVariants>['size']
  class?: string
}

const props = withDefaults(defineProps<CardProps>(), {
  variant: 'default',
  size: 'default',
})
</script>