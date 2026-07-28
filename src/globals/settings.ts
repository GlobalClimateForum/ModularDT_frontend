import { ref } from 'vue'

// globale reactive variable
export const settings = ref({
  cs_url: 'http://127.0.0.1:8002',
  number_of_screens: 4,
  background_image: '',
  language: 'en'
})

// This function returns always the SAME instance
export function useSettings() {
  return settings
}