<template>
  <div class="flex flex-col h-screen bg-white">
    <!-- 顶部栏 -->
    <header class="flex items-center px-4 py-3 border-b">
      <SearchIcon class="w-5 h-5 text-gray-400 mr-2" />
      <h1 class="text-2xl text-gray-500 font-normal">Hello, ZeroLaunch!</h1>
    </header>

    <!-- 主要内容 -->
    <div class="flex-1 flex flex-col">
      <!-- 菜单项 -->
      <div class="border-b">
        <div class="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer" @click="openTerminal">
          <TerminalIcon class="w-5 h-5 mr-3 text-gray-700" />
          <span class="text-base">终端</span>
        </div>
      </div>

      <div class="border-b">
        <div class="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer" @click="navigateToSettings">
          <SettingsIcon class="w-5 h-5 mr-3 text-gray-700" />
          <span class="text-base">设置</span>
        </div>
      </div>

      <div class="border-b">
        <div class="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer" @click="openDevHome">
          <div class="w-5 h-5 mr-3 text-purple-500">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" fill="currentColor" opacity="0.2" />
              <path
                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <span class="text-base font-medium">Dev Home</span>
        </div>
      </div>

      <div class="border-b">
        <div class="flex items-center px-4 py-3 hover:bg-gray-100 cursor-pointer" @click="openAssistant">
          <MessageSquareIcon class="w-5 h-5 mr-3 text-blue-600" />
          <span class="text-base">快速助手</span>
        </div>
      </div>
    </div>

    <!-- 底部栏 -->
    <footer class="flex justify-between items-center px-4 py-2 border-t text-gray-500 text-sm">
      <div>ZeroLaunch-rs v0.4.1</div>
      <Button variant="ghost" class="text-gray-500 hover:text-gray-700" @click="toggleOpen">
        {{ isOpen ? '关闭' : '打开' }}
      </Button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { MessageSquareIcon, SearchIcon, SettingsIcon, TerminalIcon } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isOpen = ref(true)

const navigateToSettings = () => {
  router.push('/setting_window')
}

const openTerminal = () => {
  // TODO: 实现终端功能
  console.log('打开终端')
}

const openDevHome = () => {
  // TODO: 实现 Dev Home 功能
  console.log('打开 Dev Home')
}

const openAssistant = () => {
  // TODO: 实现快速助手功能
  console.log('打开快速助手')
}

const toggleOpen = () => {
  isOpen.value = !isOpen.value
  // TODO: 实现窗口开关功能
  console.log(isOpen.value ? '窗口已打开' : '窗口已关闭')
}
</script> 