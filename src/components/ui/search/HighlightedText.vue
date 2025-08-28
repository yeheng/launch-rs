<template>
  <span v-html="highlightedText" class="highlighted-text" />
</template>

<style scoped>
.highlighted-text :deep(mark) {
  background-color: #fef3c7; /* yellow-200 equivalent */
  color: #92400e; /* yellow-900 equivalent */
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-weight: 500;
  animation: highlight-fade 0.3s ease-in-out;
}

@keyframes highlight-fade {
  0% {
    background-color: #fde68a; /* yellow-300 equivalent */
  }
  100% {
    background-color: #fef3c7; /* yellow-200 equivalent */
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { highlightSearchTerms } from '@/lib/utils/search-highlight'

interface Props {
  /** The text to highlight */
  text: string
  /** The search query to highlight */
  searchQuery?: string
  /** Whether to enable highlighting */
  highlight?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  searchQuery: '',
  highlight: true
})

const highlightedText = computed(() => {
  if (!props.highlight || !props.searchQuery) {
    return props.text
  }
  
  return highlightSearchTerms(props.text, props.searchQuery)
})
</script>