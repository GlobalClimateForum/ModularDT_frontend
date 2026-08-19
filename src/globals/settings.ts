import { ref } from 'vue'
import { getSettings } from '@/services/settings_service';

// globale reactive variable
export const settings = ref({
  cs_url: 'http://127.0.0.1:8002',
  number_of_screens: 4,
  background_image: '',
  language: 'en',
  avatar_style: 'glyphs'
})

// This function returns always the SAME instance
export function useSettings() {
  return settings
}

export async function fetchSettings() {
  try {
    const response = await getSettings();
    settings.value = { ...settings.value, ...response.data.settings };
  } catch (error) {
    console.error("Error fetching settings:", error);
  }
}
