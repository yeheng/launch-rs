<template>
  <button
    type="button"
    :class="[
      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      checked ? 'bg-blue-600' : 'bg-gray-200',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    ]"
    @click="toggle"
    :disabled="disabled"
    role="switch"
    :aria-checked="checked"
  >
    <span
      :class="[
        'inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
        checked ? 'translate-x-4' : 'translate-x-0'
      ]"
    />
  </button>
</template>

<script setup lang="ts">
interface Props {
  checked?: boolean
  disabled?: boolean
}

interface Emits {
  (e: 'update:checked', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  checked: false,
  disabled: false
})

const emit = defineEmits<Emits>()

const toggle = () => {
  if (!props.disabled) {
    emit('update:checked', !props.checked)
  }
}
</script>