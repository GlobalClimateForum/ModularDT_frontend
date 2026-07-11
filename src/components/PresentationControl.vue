<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import { useI18n } from 'vue-i18n';
import { getLivePresentation } from "@/services/live_presentation_service";
import { getPresentation } from "@/services/presentation_service";
import type { Presentation } from "@/services/presentation_service";
const { t } = useI18n();

const currentSceneNumber = ref(1);
const activePresentation = ref(false);
const currentPresentation = ref<Presentation | null>(null);
const loading = ref(false);

onMounted(() => {
  loading.value = true;

  // 1. Zuerst die aktive Live-Präsentation abfragen
  getLivePresentation()
    .then(response => {
      const live_presentation_read = response.data.live_presentation;

      if (live_presentation_read && Object.keys(live_presentation_read).length > 0) {
        console.info("Reading live_presentation successful:", live_presentation_read);
        currentSceneNumber.value = live_presentation_read.current_scene;
        activePresentation.value = live_presentation_read.active;

        const presentationId = live_presentation_read.presentation;
        if (presentationId) {
          return getPresentation(presentationId);
        }
      }
      return null;
    })
    .then(presentationResponse => {
      if (presentationResponse) {
        currentPresentation.value = presentationResponse.data;
        console.info("Fetched active presentation details:", currentPresentation.value);
      }
    })
    .catch(error => {
      console.error("Error reading presentation or live settings:", error);
    })
    .finally(() => {
      loading.value = false;
    });
});


const previousScene = () => {
  if (currentSceneNumber.value > 1) currentSceneNumber.value--;
};

const nextScene = () => {
  currentSceneNumber.value++;
};
</script>

<template>
  <div class="presentation_control_container">

    <div v-if="activePresentation" class="top-content-area">
      <span class="center-text">Presentation: {{ currentPresentation?.name }}</span>
    </div>
    <div v-else class="top-content-area">
      <span class="center-text">{{ t('moderator.presentation.no_presentation_showing') }} -- {{ activePresentation
        }}</span>
    </div>



    <!-- Control bar -->
    <div class="bottom-control-bar">
      <Button :label="$t('moderator.presentation.previous')" icon="pi pi-chevron-left" @click="previousScene"
        class="control-item nav-button" />
      <InputNumber v-model="currentSceneNumber" :min="1" class="control-item number-input" />
      <Button :label="$t('moderator.presentation.next')" icon="pi pi-chevron-right" iconPos="right" @click="nextScene"
        class="control-item nav-button" />
    </div>
  </div>
</template>

<style scoped>
.presentation_control_container {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-family: sans-serif;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--p-content-background, #f8f9fa);
  box-sizing: border-box;
}

/* Oberer Bereich streckt sich komplett und zentriert den Inhalt */
.top-content-area {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  /* Entspricht bg-gray-100 */
}

.center-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #374151;
  /* Entspricht text-gray-700 */
}

/* Untere Kontrollleiste bleibt fixiert am Boden */
.bottom-control-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  background-color: #ffffff;
  border-top: 1px solid #e5e7eb;
}

/* Gemeinsame Basis für alle 3 Elemente in der Kontrollleiste:
   Sie teilen sich den Platz absolut gleichmäßig auf. */
.control-item {
  flex: 1 1 0%;
  max-width: 160px;
  /* Alle 3 werden maximal so breit */
  min-width: max-content;
  /* Richtet sich nach dem breitesten Inhalt (z.B. langer Buttontext) */
  white-space: nowrap;
}

/* Spezifisch für die Navigations-Buttons */
.nav-button {
  justify-content: center;
  /* Zentriert Text und Icon im Button */
}

/* Spezifisch für das PrimeVue InputNumber-Feld */
.number-input :deep(.p-inputnumber-input) {
  width: 100%;
  /* Zwingt das innere Textfeld, die volle Breite auszufüllen */
  text-align: center;
  /* Zentriert die Zahl im Eingabefeld für eine schönere Optik */
}
</style>
