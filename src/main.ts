import 'bootstrap/dist/css/bootstrap.min.css'
import '@/assets/css/app.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'

createApp(App).use(createPinia()).use(router).mount('#app')
