<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import { useI18n } from 'vue-i18n';
import SceneView from '@/components/SceneView.vue';
import { getLivePresentation, stopPresentation, updateLivePresentation } from "@/services/live_presentation_service";
import { getPresentation } from "@/services/presentation_service";
import type { Presentation } from "@/services/presentation_service";
import { getScenes } from "@/services/scene_service";
import type { Scene } from "@/services/scene_service";
const { t } = useI18n();

const currentSceneNumber = ref(1);
const activePresentation = ref(false);
const currentPresentation = ref<Presentation | null>(null);
const loading = ref(false);
const scenes = ref<Scene[]>([]);
const currentScene = ref<Scene>();

const scenesMap = computed(() => {
  return new Map(scenes.value.map(scene => [scene.id, scene]));
});

const activeSceneIdFromPresentation = computed(() => {
  const index = currentSceneNumber.value - 1;
  return currentPresentation.value?.scenes?.[index]?.id || null;
});

function fetchScenes() {
  getScenes().then(response => {
    scenes.value = response.data.scenes;
    //console.info('fetched scenes:', JSON.parse(JSON.stringify(scenes.value)))
  }).catch(error => {
    console.error("Error fetching scenes:", error);
  });
}

watch([activeSceneIdFromPresentation, scenesMap], ([newSceneId]) => {
  if (newSceneId) {
    currentScene.value = scenesMap.value.get(newSceneId);
  } else {
    currentScene.value = undefined;
  }
}, { immediate: true }); // immediate sorgt dafür, dass es auch direkt beim Start prüft

// 3. Ihr aufgeräumtes onMounted (loadCurrentScene() und fetchScenes() am Ende fliegen hier raus!)
onMounted(() => {
  loading.value = true;
  fetchScenes(); // Kann sofort parallel starten

  getLivePresentation()
    .then(response => {
      const live_presentation_read = response.data.live_presentation;

      if (live_presentation_read && Object.keys(live_presentation_read).length > 0) {
        currentSceneNumber.value = live_presentation_read.current_scene || 1;
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
      }
    })
    .catch(error => {
      console.error("Error reading presentation or live settings:", error);
    })
    .finally(() => {
      loading.value = false;
    });
});

async function updatePresentationState() {
  try {
    // Wir senden die ID der Präsentation und setzen die Anzeige auf aktiv
    const response = await updateLivePresentation({
      current_scene: currentSceneNumber.value
    });
  } catch (error) {
    console.error("Error controlling presentation:", error);
  }
}

const previousScene = () => {
  if (currentSceneNumber.value > 1) {
    currentSceneNumber.value--;
    updatePresentationState();
  }
};

const nextScene = () => {
  const maxScenes = currentPresentation.value?.scenes?.length || 0;
  if (currentSceneNumber.value < maxScenes) {
    currentSceneNumber.value++;
    updatePresentationState();
  }
};

const abortPresentation = () => {
  stopPresentation();
  activePresentation.value = false;
  currentSceneNumber.value = 1;
};
</script>

<template>
  <div class="presentation_control_container">

    <div v-if="activePresentation" class="top-content-area">
      <div class="preview-safe-bounds">
        <SceneView v-if="currentScene" :preview="true" :key="currentScene.id" :scene="currentScene" :showframe="false"
          class="scene-preview" />
      </div>
    </div>

    <div v-else class="top-content-area">
      <span class="center-text">{{ t('moderator.presentation.no_presentation_showing') }} </span>
    </div>

    <!-- Control bar -->
    <div class="bottom-control-bar">
      <div v-if="activePresentation" class="spacer-left">Presentation: {{ currentPresentation?.name }}</div>
      <div v-else class="spacer-left"></div>
      <Button :label="$t('moderator.presentation.previous')" icon="pi pi-chevron-left" @click="previousScene"
        class="control-item nav-button" />
      <InputNumber v-model="currentSceneNumber" :min="1" class="control-item number-input" />
      <Button :label="$t('moderator.presentation.next')" icon="pi pi-chevron-right" iconPos="right" @click="nextScene"
        class="control-item nav-button" />
      <Button :label="$t('moderator.presentation.stop')" icon="pi pi-stop-circle" @click="abortPresentation"
        class="control-item nav-button push-right" />
    </div>
  </div>
</template>

<style scoped>
.top-content-area {
  flex-grow: 1;
  display: flex;
  align-items: center;     /* Zentriert vertikal, wenn genug Platz ist */
  justify-content: center;   /* Zentriert horizontal */
  background-color: #f3f4f6; /* bg-gray-100 */
  width: 100%;       
  height: 100%;
  overflow: hidden;          /* Verhindert Scrollbalken */
  
  /* WICHTIG: Das sorgt dafür, dass sich der Container bei Platzmangel */
  align-items: safe center;  
}

/* Die Scene-Preview darf maximal 90% der Breite ODER Höhe einnehmen */
.scene-preview {
  max-width: 90% !important;
  max-height: 90% !important;
  width: auto !important;
  height: auto !important;
  aspect-ratio: 16 / 9; 
}
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

.preview-safe-bounds {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}


.center-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #374151;
  /* Entspricht text-gray-700 */
  display: block;
  text-align: center;
  margin-bottom: 1rem;
}


/* Untere Kontrollleiste bleibt fixiert am Boden */
.bottom-control-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  /* Zentriert die mittleren Elemente */
  gap: 1rem;
  padding: 1rem;
  background-color: #ffffff;
  border-top: 1px solid #e5e7eb;
}

/* Drückt den Button ganz nach rechts */
.push-right {
  margin-left: auto;
}

/* Hält die Mitte in Waage (muss dieselbe Breite wie der rechte Button haben) */
.spacer-left {
  margin-right: auto;
  width: 3rem;
  /* Passen Sie diesen Wert an die tatsächliche Breite Ihres Buttons an */
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
