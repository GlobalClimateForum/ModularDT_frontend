<script setup lang="ts">
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
import { onMounted } from 'vue'
import { settings } from '@/utils/settings'
import { getSettings } from "@/services/settings_service";

// Läuft sofort, wenn das Skript geladen wird
//settings.value.language = 'de' // Beispiel: Sprache hartkodiert setzen
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
  })
})
</script>

<template>
  <Toast position="bottom-right" />
  <RouterView />
</template>

<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 100vh;
  text-align: center;
}
</style>