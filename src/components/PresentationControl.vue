<script setup lang="ts">
// Vue-stuff
import { onMounted, onUnmounted, ref, computed, watch, toRaw } from 'vue';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import { useNow, useDateFormat } from '@vueuse/core'
import { useI18n } from 'vue-i18n';
// globals and services
import type { Scene } from "@/services/scene_service";
import { getLivePresentation, stopPresentation, updateLivePresentation } from "@/services/live_presentation_service";
import { getPresentation } from "@/services/presentation_service";
import { updateMonitorStates } from '@/services/monitor_service'
import { useCurrentScene, useLivePresentationState, useScenesMap } from '@/globals/live_presentation';
import { useCurrentPresentation, useActiveSceneIdFromPresentation, useSceneOnMonitors } from '@/globals/live_presentation';
import { settings } from '@/globals/settings'
// components
import SlideView from '@/components/SlideView.vue';
import SceneView from '@/components/SceneView.vue';
import '@/assets/main.css';

const { t } = useI18n();

const now = useNow({ interval: 1000 })
const time = useDateFormat(now, 'HH:mm:ss')

const previewItem = ref<Scene | null>(null)
const posLeft = ref(0)
const posTop = ref(0)

const livePresentationState = useLivePresentationState()
const currentPresentation = useCurrentPresentation()
const loading = ref(false);
const currentScene = useCurrentScene()
const scenesMap = useScenesMap()
const activeSceneIdFromPresentation = useActiveSceneIdFromPresentation()
const sceneOnMonitors = useSceneOnMonitors()

watch([activeSceneIdFromPresentation, scenesMap], ([newSceneId]) => {
  if (newSceneId) {
    currentScene.value = scenesMap.value.get(newSceneId);
  } else {
    currentScene.value = undefined;
  }
}, { immediate: true }); // immediate to execute also at start

onMounted(() => {
  loading.value = true;

  getLivePresentation()
    .then(response => {
      const live_presentation_read = response.data.live_presentation;

      if (live_presentation_read && Object.keys(live_presentation_read).length > 0) {
        livePresentationState.value.active = live_presentation_read.active;
        if (livePresentationState.value.active) {
          livePresentationState.value.current_scene = live_presentation_read.current_scene || 1;
        } else {
          livePresentationState.value.current_scene = 1;
        }

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
      currentScene.value = scenesMap.value.get(currentPresentation.value?.scenes?.[livePresentationState.value.current_scene - 1]?.id)
      updateMonitors();
    });
    sceneToMonitorGrid();
});

function sceneToMonitorGrid() {
  if (livePresentationState.value.active) {
    const grid = Array(settings.value.number_of_screens).fill(null)

    currentScene.value?.slides.forEach(slide => {
      if (slide && slide.position && slide.position <= settings.value.number_of_screens) {
        grid[slide.position - 1] = slide
      }
    })
    sceneOnMonitors.value = grid;
  } else {
    sceneOnMonitors.value = Array(settings.value.number_of_screens).fill(null);
  }
}

async function updateMonitors() {
  if (currentScene.value) {
    updateMonitorStates(currentScene.value)
  }
}

async function updatePresentationState() {
  currentScene.value = scenesMap.value.get(currentPresentation.value?.scenes?.[livePresentationState.value.current_scene - 1]?.id)
  try {
    // Wir senden die ID der Präsentation und setzen die Anzeige auf aktiv
    await updateLivePresentation({
      active: livePresentationState.value.active,
      current_scene: livePresentationState.value.current_scene
    });
  } catch (error) {
    console.error("Error controlling presentation:", error);
  }
}

const previousScene = () => {
  if (livePresentationState.value.active && (livePresentationState.value.current_scene > 1)) {
    livePresentationState.value.current_scene--;
    updatePresentationState();
    sceneToMonitorGrid();
    updateMonitors();
  }
};

const nextScene = () => {
  const maxScenes = currentPresentation.value?.scenes?.length || 0;
  if (livePresentationState.value.active && (livePresentationState.value.current_scene < maxScenes)) {
    livePresentationState.value.current_scene++;
    updatePresentationState();
    sceneToMonitorGrid();
    updateMonitors();
  }
};

const abortPresentation = () => {
  stopPresentation();
  sceneToMonitorGrid();
  livePresentationState.value.current_scene = 1;
};

const emit = defineEmits<{
  'scenes': [];
}>();

const choosePresentation = () => {
  emit('scenes')
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

function clickScene(index: number) {
  livePresentationState.value.current_scene = index + 1;
  updatePresentationState();
  updateMonitors();
}

function showPreview(item, e) {
  previewItem.value = toRaw(item);
  const rect = e.currentTarget.getBoundingClientRect();
  posLeft.value = rect.right + 12;
  posTop.value = rect.top;
  //console.log("posLeft:", posLeft)
  //console.log("posTop:", posTop)
}

function hidePreview() {
  previewItem.value = null;
}

onMounted(() => window.addEventListener('keydown', handleKey));
onUnmounted(() => window.removeEventListener('keydown', handleKey));
</script>

<template>
  <Splitter :gutter-size="2" class="dashboard">
    <!-- Available Slides -->
    <SplitterPanel :size="25" class="sub-panel">
      <h2 class="dashboard_label">{{ $t('moderator.presentation.presentation_szenes') }}</h2>
      <div class="slide_gallery_container">
        <div v-if="currentPresentation && livePresentationState.active">
          <div v-for="(scene, index) in currentPresentation.scenes" :key="scene.id" class="scene-card"
            @click="clickScene(index)">
            <div class="scene-info">
              <p class="scene-label">{{ scene.name }}</p>
              <!--<p class="scene-date">{{ formatDate(scene.created_at) }}</p>-->
            </div>
            <div v-if="scenesMap.get(scene.id)?.slides[0]" class="scene-item"
              @mouseenter="showPreview(scenesMap.get(scene.id), $event)" @mouseleave="hidePreview">
              <SlideView :preview="false" :slide="scenesMap.get(scene.id)?.slides[0]"
                :sections="scenesMap.get(scene.id)?.slides[0].sections ?? []" :showFrame="false"
                style="pointer-events: none;" :shadow="true" />
            </div>
          </div>
        </div>
      </div>
    </SplitterPanel>

    <!-- Zweites Panel -->
    <SplitterPanel :size="75" :minSize="15" class="sub-panel">
      <h2 class="dashboard_label">{{ t('moderator.presentation.presentation_control') }}</h2>
      <div class="presentation_container inset-control" @keydown.left="previousScene" @keydown.right="nextScene">

        <div v-if="livePresentationState.active" class="scene-container">
          <SceneView v-if="currentScene" :preview="false" :key="currentScene.id" :scene="currentScene"
            :showframe="false" />
        </div>

        <div v-else class="fallback-container">
          <span class="center-text">{{ t('moderator.presentation.no_presentation_showing') }} </span>
        </div>

        <div class="controls glass">
          <Button @click="previousScene" rounded>
            <template #icon>
              <i class="material-symbols-outlined">chevron_left</i>
            </template>
          </Button>

          <InputNumber v-model="livePresentationState.current_scene" :min="1" class="scene_indicator" />

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
          <Button style="white-space: nowrap"
            :label="livePresentationState.active ? currentPresentation?.name : $t('moderator.choose_presentation')"
            rounded :disabled="!!livePresentationState.active" @click="choosePresentation">
            <template v-if="!livePresentationState.active" #icon>
              <i class="material-symbols-outlined">file_open</i>
            </template>
          </Button>


        </div>
      </div>
    </SplitterPanel>
  </Splitter>
  <Teleport to="body">
    <div v-if="previewItem" class="preview-layer" :style="{ left: posLeft + 'px', top: posTop + 'px' }">
      <SceneView v-if="previewItem" :preview="true" :key="previewItem.id" :scene="previewItem" :showframe="false" />
    </div>
  </Teleport>
</template>

<style scoped>
.dashboard {
  height: 100%;
}

.dashboard :deep(.p-splitter-panel) {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  height: 100% !important;
}

/* Erhält die Flex-Spalten-Struktur für beide Panels aufrecht */
.sub-panel {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  height: 100%;
}

.presentation_container {
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: var(--br-medium);
  padding: var(--space-large);
  overflow: hidden;
  flex: 1;
  /* Zwingt den Container, den Rest des Panels auszufüllen */
  min-height: 0;
  /* Verhindert das Kollabieren von Flexbox-Kindern */
}

/* Die Szene dehnt sich innerhalb des Präsentationscontainers maximal aus */
.scene-container,
.fallback-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
}

.slide_gallery_container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  overflow-y: auto !important;
  padding: 1rem;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.slide_gallery_container :deep(> div) {
  width: 100%;
}

/* Steuerung dockt dank position: absolute sicher im presentation_container unten an */
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

.controls:deep(.p-inputtext) {
  background: color-mix(in srgb, var(--p-primary-500) 80%, transparent);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4.3px);
  -webkit-backdrop-filter: blur(4.3px);
  color: var(--p-primary-50);
  font-family: 'Fira Code', monospace;
  border: 1px solid rgba(255, 255, 255, 0.31);
  text-align: center;
}

.scene-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.scene_indicator:deep(.p-inputtext) {
  font-weight: 900;
  max-width: 5rem;
}

.scene-card {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.scene-label {
  font-weight: bold;
  font-size: var(--fs-medium);
  color: var(--p-primary-500);
}

.scene-date {
  font-size: var(--fs-small);
  color: var(--p-primary-500);
}

.scene-item {
  flex: 1;
  /* fill remaining height after slide-info */
  min-height: 0;
  /* allow shrinking */
  width: 100%;

  cursor: grab;
  transition: opacity 0.2s, outline 0.2s;
  width: 100%;

  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-layer {
  position: fixed;
  /* viewport-anchored (works with nested panels) */
  background: rgba(0, 0, 0, 0.6);
  z-index: 999999;
  pointer-events: none;
  /* doesn’t break hover */
  transform: translateY(-50%);
  /* center at posTop */
  background: white;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, .15);
  transform: scale(0.5);
  transform-origin: top left;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  /*height: 100%;*/
  flex: 1;
  min-height: 0;
}
</style>