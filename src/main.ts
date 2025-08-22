import { createPinia } from "pinia";
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { createApp } from "vue";
import App from "./App.vue";
import "./index.css";
import i18n, { initI18nLanguage } from './locales';
import router from "./router";

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);
app.use(i18n);

// 初始化语言设置（在pinia加载之后）
initI18nLanguage();

app.mount("#app");
