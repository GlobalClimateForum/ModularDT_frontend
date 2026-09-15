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
import { definePreset } from '@primeuix/themes';
import i18n from './i18n/index.ts';
import ConfirmationService from "primevue/confirmationservice";
import DialogService from 'primevue/dialogservice';
import palettes from '@/assets/palettes.json'
import Tooltip from 'primevue/tooltip';

const primecolors = definePreset(Aura, {
  semantic: {
    primary: palettes.indigo,
  }
});

export function toggleDark() {
  document.documentElement.classList.toggle('dark-mode')
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(ToastService)
app.use(DialogService);
app.directive('tooltip', Tooltip);

app.use(PrimeVue, {
  theme: {
    preset: primecolors,
    options: {
      darkModeSelector: '.dark-mode',   // class-based toggle
      // darkModeSelector: 'system',    // follow OS preference
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, primevue'  // control layer precedence vs your CSS
      }
    }
  }
})

app.use(ConfirmationService)
app.mount('#app')

