<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import { useI18n } from 'vue-i18n';
import { getLivePresentation, stopPresentation, updateLivePresentation } from "@/services/live_presentation_service";
import { getPresentation } from "@/services/presentation_service";
import type { Presentation } from "@/services/presentation_service";
import { getScenes } from "@/services/scene_service";
import type { Scene } from "@/services/scene_service";
import { useLivePresentationState } from '@/utils/live_presentation';
import InputText from 'primevue/inputtext';
import { useNow, useDateFormat } from '@vueuse/core'

const livePresentationState = useLivePresentationState()
import SceneView from '@/components/SceneView.vue';

const { t } = useI18n();
import '@/assets/main.css';

const currentSceneNumber = ref(1);
const activePresentation = ref(false);
const currentPresentation = ref<Presentation | null>(null);
const loading = ref(false);
const scenes = ref<Scene[]>([]);
const currentScene = ref<Scene>();

const now = useNow({ interval: 1000 })
const time = useDateFormat(now, 'HH:mm:ss')

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


function handleKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft') previousScene();
  else if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
    nextScene()
  };
}

onMounted(() => window.addEventListener('keydown', handleKey));
onUnmounted(() => window.removeEventListener('keydown', handleKey));

</script>

<template>

  <div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;
  padding: var(--space-large); overflow: hidden;">
    <div class="presentation_container" @keydown.left="previousScene" @keydown.right="nextScene">

      <div class="scene-container">
        <SceneView v-if="currentScene" :preview="false" :key="currentScene.id" :scene="currentScene"
          :showframe="false" />
      </div>

      <div class="controls glass">
        <Button @click="previousScene" rounded>
          <template #icon>
            <i class="material-symbols-outlined">chevron_left</i>
          </template>
        </Button>

        <InputNumber v-model="currentSceneNumber" :min="1" class="scene_indicator" />

        <Button @click="nextScene" rounded>
          <template #icon>
            <i class="material-symbols-outlined">chevron_right</i>
          </template>
        </Button>

        <Button :label="$t('moderator.presentation.stop')" @click="abortPresentation" rounded>
          <template #icon>
            <i class="material-symbols-outlined">stop_circle</i>
          </template>
        </Button>

        <InputText style="width: 150px" :value="time" readonly class="scene_indicator" disabled />
        <InputText :value="currentPresentation?.name" readonly class="presentation_name" disabled />
      </div>
    </div>
  </div>

</template>

<style scoped>
.scene-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: var(--space-large);
}

.controls {
  position: absolute;
  bottom: var(--space-large);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;

  border-radius: var(--br-large);
  padding: var(--space-medium);
  display: flex;
  flex-direction: row;
  gap: var(--space-medium);
  align-items: center;
}

.presentation_container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: var(--bg-main);
  border-radius: var(--br-medium);
  overflow: auto;
}

.controls:deep(.p-inputtext) {
  background: color-mix(in srgb, var(--p-primary-900) 80%, transparent);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4.3px);
  -webkit-backdrop-filter: blur(4.3px);
  color: var(--p-primary-50);
  font-family: 'Fira Code', monospace;
  border: 1px solid rgba(255, 255, 255, 0.31);
  text-align: center;
}

.scene_indicator:deep(.p-inputtext) {
  font-weight: 900;
  max-width: 5rem;
}
</style>
