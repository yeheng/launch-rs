// src/router.ts
import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/Home.vue';
import SettingWindow from './views/SettingWindow.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/setting_window', component: SettingWindow },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;