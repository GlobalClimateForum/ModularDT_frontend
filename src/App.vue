<script setup lang="ts">
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import { onMounted, onBeforeMount, watch, ref } from 'vue'
import { settings } from '@/utils/settings'
import { getSettings } from "@/services/settings_service";
import { registerContentServer } from '@/services/cs_service.ts';
import { useI18n } from 'vue-i18n'
import { updateLivePresentation, stopPresentation } from "@/services/live_presentation_service";
import ConfirmDialog from "primevue/confirmdialog";

const { locale } = useI18n()
const isSettingsLoaded = ref(false)

watch(() => settings.value.cs_url, (url) => {
  if (url) registerContentServer();
}, { immediate: true });

watch(() => settings.value.language, (newLanguage) => {
  locale.value = newLanguage
}, { immediate: true })

onMounted(async () => {
  getSettings().then(response => {
    const settings_read = response.data.settings

    if (settings_read && Object.keys(settings_read).length > 0) {
      console.info("Reading settings successful:", settings_read)
      settings.value = { ...settings.value, ...settings_read }
    } else {
      // we keep the defaults
    }

  }).catch(error => {
    console.error("Error reading settings:", error)
  }).finally(() => {
    // allow the App to render now, independet if the settings were read successfully or not
    isSettingsLoaded.value = true
  })

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

