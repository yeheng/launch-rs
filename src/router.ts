// src/router.ts
import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/Home.vue';
import SettingWindow from './views/SettingWindow.vue';
import PluginManagementPage from './views/PluginManagementPage.vue';

const routes = [
  { 
    path: '/', 
    name: 'Home',
    component: Home,
    meta: {
      title: 'ZeroLaunch',
      requiresAuth: false
    }
  },
  { 
    path: '/setting_window', 
    name: 'Settings',
    component: SettingWindow,
    meta: {
      title: 'Settings',
      requiresAuth: false
    }
  },
  { 
    path: '/plugins', 
    name: 'PluginManagement',
    component: PluginManagementPage,
    meta: {
      title: 'Plugin Management',
      requiresAuth: false,
      breadcrumb: [
        { name: 'Home', path: '/' },
        { name: 'Plugin Management', path: '/plugins' }
      ]
    }
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guards
router.beforeEach((to, _from, next) => {
  // Set document title
  if (to.meta?.title) {
    document.title = `${to.meta.title} - ZeroLaunch`;
  }
  
  // Handle authentication if needed in the future
  if (to.meta?.requiresAuth) {
    // Add authentication logic here when needed
    // For now, just proceed
    next();
  } else {
    next();
  }
});

// After navigation
router.afterEach((to, from) => {
  // Log navigation for debugging
  console.log(`Navigated from ${from.path} to ${to.path}`);
  
  // Handle any post-navigation logic
  if (to.name === 'PluginManagement') {
    // Ensure plugin management page is properly initialized
    console.log('Entering plugin management page');
  }
});

export default router;