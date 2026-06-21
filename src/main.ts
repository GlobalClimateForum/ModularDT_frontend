import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import 'material-symbols'
import "primeicons/primeicons.css"; 
import 'animate.css';
import ToastService from 'primevue/toastservice';
import { definePreset } from '@primevue/themes';
import i18n from './i18n';

const primecolors = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b'
    }
  }
});


const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(ToastService)

app.use(PrimeVue, {
  theme: { preset: primecolors }
})
app.mount('#app')

