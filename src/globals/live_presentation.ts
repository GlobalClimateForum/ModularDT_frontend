import { ref, computed, watch } from 'vue';
import type { Slide } from "@/services/slide_service";
import type { Scene } from "@/services/scene_service";
import type { Presentation } from "@/services/presentation_service";
import { scenes } from '@/globals/scenes';
import { settings } from '@/globals/settings'


// globale reactive variable
const livePresentationState = ref({
  active: false,
  presentation: -1,
  current_scene: -1
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

export var liveSlidesOnMonitors = ref<(Slide | null)[]>([]);

export function useLiveSlidesOnMonitors() {
  return liveSlidesOnMonitors
}

export function useLiveSlidesActive() {
  return computed(() => {
    const result = liveSlidesOnMonitors.value.reduce((memo, slide) => memo || (slide != null), false)
    return result
  })
}

export const whatYouSeeOnMonitors = computed(() => {
    const maxLen = Math.max(liveSlidesOnMonitors.value.length, sceneOnMonitors.value.length);
    return Array.from({ length: maxLen }, (_, i) => {
      return liveSlidesOnMonitors.value[i] ?? sceneOnMonitors.value[i] ?? null;
    });
  });

  export function useWhatYouSeeOnMonitors() {
    return whatYouSeeOnMonitors
  }

  watch(
    () => settings.value.number_of_screens,
    (newCount) => {
      const currentCount = sceneOnMonitors.value.length

      if (newCount > currentCount) {
        const extraSlots = Array(newCount - currentCount).fill(null)
        sceneOnMonitors.value.push(...extraSlots)
        liveSlidesOnMonitors.value.push(...extraSlots)
      } else if (newCount < currentCount) {
        sceneOnMonitors.value.splice(newCount)
        liveSlidesOnMonitors.value.splice(newCount)
      }
    },
    { immediate: true }
  )
