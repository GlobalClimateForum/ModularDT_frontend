<script setup lang="ts">
// Vue-stuff
import { onMounted, onBeforeMount, watch, ref } from 'vue'
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from "primevue/confirmdialog";
import ProgressSpinner from 'primevue/progressspinner'
import { useI18n } from 'vue-i18n'
// globals and services
import type { Slide } from "@/services/slide_service"
import { fetchSettings, settings } from '@/globals/settings'
import { fetchScenes } from '@/globals/scenes';
import { fetchSlides } from '@/globals/slides';
import { fetchPresentations } from '@/globals/presentations';
import { fetchSlideshows } from '@/globals/slideshows';
import { fetchParticipants } from '@/globals/participants';
import { registerContentServer } from '@/services/cs_service.ts';
import { stopPresentation } from "@/services/live_presentation_service";
import { useLiveSlidesOnMonitors } from '@/globals/live_presentation';
import DynamicDialog from 'primevue/dynamicdialog';
import OptionDialog from '@/components/OptionDialog.vue';
import { updatePrimaryPalette } from '@primeuix/themes';

import palettes from '@/assets/palettes.json'

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
})

onMounted(async () => {
  liveSlidesOnMonitors.value = Array(settings.value.number_of_screens).fill(null);
  fetchSlides();
  fetchScenes();
  fetchPresentations();
  stopPresentation();
  fetchSlideshows();
  fetchParticipants();
})
</script>

<template>
  <Toast position="bottom-right" />
  <RouterView v-if="isSettingsLoaded" />
  <div v-else class="loading-screen">
    <ProgressSpinner  animationDuration="1s" style="width: 100px; height: 100px" />
    <p style="color: black">Load Settings ...</p>
  </div>
  <DynamicDialog />
  <ConfirmDialog />
  <OptionDialog />
</template>

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
