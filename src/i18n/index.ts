import { createI18n } from 'vue-i18n';
import de from '@/locales/deutsch.json';
import en from '@/locales/english.json';
// import fr from '../locales/fr.json';  etc.

const i18n = createI18n({
  legacy: false,
  globalInjection: true, // Ermöglicht die Nutzung von $i18n und $t im Template ohne Imports!
  locale: 'en',          // Standard-language
  fallbackLocale: 'en',  // Fallback-language
  messages: { en, de }
})

export default i18n
