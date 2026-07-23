import { createI18n } from 'vue-i18n';
import de from '@/locales/deutsch.json';
import en from '@/locales/english.json';
// import fr from '../locales/fr.json';  etc.

const i18n = createI18n({
  legacy: false,
  globalInjection: true, // Ermöglicht die Nutzung von $i18n und $t im Template ohne Imports!
  locale: 'en',          // Standard-Sprache beim Start
  fallbackLocale: 'en',  // Rückfall-Sprache, falls ein Schlüssel fehlt
  messages: { en, de }
})

export default i18n
