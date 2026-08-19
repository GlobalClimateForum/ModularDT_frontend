<script setup lang="ts">
// Vue-stuff
import { onMounted, onBeforeMount, watch, ref } from 'vue'
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from "primevue/confirmdialog";
import { useI18n } from 'vue-i18n'
// globals and services
import type { Slide } from "@/services/slide_service"
import { fetchSettings, settings } from '@/globals/settings'
import { fetchScenes } from '@/globals/scenes';
import { fetchSlides } from '@/globals/slides';
import { fetchPresentations } from '@/globals/presentations';
import { registerContentServer } from '@/services/cs_service.ts';
import { stopPresentation } from "@/services/live_presentation_service";
import { useLiveSlidesOnMonitors } from '@/globals/live_presentation';


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
})
</script>

<template>
  <Toast position="bottom-right" />
  <RouterView v-if="isSettingsLoaded" />
  <div v-else class="loading-screen">
    Load Settings...
  </div>
  <ConfirmDialog />
</template>

<style scoped>
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 100vh;
  text-align: center;
  background: linear-gradient(135deg, var(--p-primary-700) 0%, var(--p-primary-900) 100%);
}
</style>
