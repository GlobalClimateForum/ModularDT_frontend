<script setup lang="ts">
// Vue-stuff
import { onMounted, onBeforeMount, getCurrentInstance, watch, ref } from 'vue'
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from "primevue/confirmdialog";
import ProgressSpinner from 'primevue/progressspinner'
import { useI18n } from 'vue-i18n'
// globals and services
import { fetchSettings, settings } from '@/globals/settings'
import { fetchScenes } from '@/globals/scenes';
import { fetchSlides } from '@/globals/slides';
import { fetchPresentations } from '@/globals/presentations';
import { fetchSlideshows } from '@/globals/slideshows';
import { fetchParticipants } from '@/globals/participants';
import { registerContentServer } from '@/services/cs_service.ts';
import { stopPresentation } from "@/services/live_presentation_service";
import { useLiveSlidesOnMonitors } from '@/globals/live_presentation';
import { fetchBackgoundImage } from '@/globals/background_image';
import DynamicDialog from 'primevue/dynamicdialog';
import OptionDialog from '@/components/OptionDialog.vue';
import { updatePrimaryPalette } from '@primeuix/themes';

import palettes from '@/assets/palettes.json'

// proxy ersetzt das klassische "this" im Setup-Skript
const { proxy } = getCurrentInstance() as any;

const { locale } = useI18n()
const isSettingsLoaded = ref(false)
var liveSlidesOnMonitors = useLiveSlidesOnMonitors()

watch(() => settings.value?.cs_url, (url) => {
  if (url) registerContentServer();
}, { immediate: true });

watch(() => settings.value?.language, (newLanguage) => {
  if (newLanguage) { // Nur setzen, wenn ein gültiger Wert vorhanden ist    
    locale.value = newLanguage
  }
}, { immediate: true })

watch(() => settings.value?.palette, (newPalette) => {
  if (newPalette) { // Nur setzen, wenn ein gültiger Wert vorhanden ist    
    updatePrimaryPalette(palettes[newPalette]);
  }
}, { immediate: true })

watch(
  () => settings.value.theme,
  (mode) => {
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark-mode', prefersDark);
    } else {
      document.documentElement.classList.toggle('dark-mode', mode === 'dark');
    }
  },
  { immediate: true }
);

onBeforeMount(async () => {
  await fetchSettings();
  isSettingsLoaded.value = true
  const appName = proxy.$APP_NAME || 'Default App Title';
  document.documentElement.style.setProperty('--app-title', `"${appName}"`);
})

onMounted(async () => {
  liveSlidesOnMonitors.value = Array(settings.value.number_of_screens).fill(null);
  await fetchSlides();
  fetchBackgoundImage(settings.value.background_image);
  fetchScenes();
  fetchPresentations();
  stopPresentation();
  fetchSlideshows();
  fetchParticipants();
})
</script>

<template>
  <Toast position="bottom-right" />
  <RouterView v-if="isSettingsLoaded" :key="$route.path"/>
  <div v-else class="loading-screen">
    <ProgressSpinner  animationDuration="1s" style="width: 100px; height: 100px" />
    <p style="color: black">Load Settings ...</p>
  </div>
  <DynamicDialog />
  <ConfirmDialog />
  <OptionDialog />
</template>

<style>
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 100vh;
  text-align: center;
  background: linear-gradient(135deg, var(--p-primary-600) 0%, var(--p-primary-900) 100%);
}

.welcome::before {  
  content: none;
}

/* .welcome[data-bg-text="true"]::before { */
.welcome.show-bg-text::before {
  content: var(--app-title); 
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotateX(10deg);
  font-size: clamp(3.5rem, 12vw, 9rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--p-primary-550);
  text-shadow: 0 1px 0 color-mix(in srgb, var(--p-primary-50) 40%, transparent), 0 0 12px color-mix(in srgb, var(--p-primary-100) 20%, transparent), 0 8px 20px rgba(0, 0, 0, 0.16);
  opacity: 0.1;
  pointer-events: none;
  z-index: 0;
  white-space: nowrap;
}
</style>

<style scoped>
.loading-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  z-index: 9999;

  display: flex; 
  flex-direction: column;
  justify-content: center;

  p{
    text-align: center;
    font-size: var(--fs-medium);
    margin-top: 1rem;
  }
}
</style>
