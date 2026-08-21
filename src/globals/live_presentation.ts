import { ref, computed } from 'vue';
import type { Slide } from "@/services/slide_service";
import type { Scene } from "@/services/scene_service";
import type { Presentation } from "@/services/presentation_service";
import { scenes } from '@/globals/scenes';


// globale reactive variable
const livePresentationState = ref({
  active: false,
  presentation: -1,
  current_scene: 1
})

// This function returns always the SAME instance
export function useLivePresentationState() {
  return livePresentationState
}

const currentScene = ref<Scene | null>();

export function useCurrentScene() {
  return currentScene
}

const currentPresentation = ref<Presentation | null>(null);

export function useCurrentPresentation() {
  return currentPresentation
}

const scenesMap = computed(() => {
  return new Map(scenes.value.map(scene => [scene.id, scene]));
});

export function useScenesMap() {
  return scenesMap
}

const activeSceneIdFromPresentation = computed(() => {
  const index = livePresentationState.value.current_scene - 1;
  return currentPresentation.value?.scenes?.[index]?.id || null;
});

export function useActiveSceneIdFromPresentation() {
  return activeSceneIdFromPresentation
}

var sceneOnMonitors = ref<(Slide | null)[]>([]);

export function useSceneOnMonitors() {
  return sceneOnMonitors
}

var liveSlidesOnMonitors = ref<(Slide | null)[]>([]);

export function useLiveSlidesOnMonitors() {
  return liveSlidesOnMonitors
}

// globale reactive variable
export var liveSlidesActive = computed(() => {
    return liveSlidesOnMonitors.value.reduce((memo, slide) => memo || (slide!=null), false)
});

// This function returns always the SAME instance
export function useLiveSlidesAcive() {
  return liveSlidesActive
}
