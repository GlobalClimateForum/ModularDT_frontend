// Vue-stuff
import { ref, computed, watch, type ComputedRef } from 'vue';
//
import type { Slide } from "@/services/slide_service";
import type { Scene } from "@/services/scene_service";
import type { Presentation } from "@/services/presentation_service";
import { scenes } from '@/globals/scenes';
import { getSlideById } from '@/globals/slides';
import { settings } from '@/globals/settings'
import { updateMonitorStatesFromGriddedSlides } from '@/services/monitor_service'
//import { updateLivePresentation } from "@/services/live_presentation_service";
import { presentations } from '@/globals/presentations';


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

export const currentScene = ref<Scene | null>();
export const currentPresentation = ref<Presentation | null>(null);
export const liveSlidesOnMonitors = ref<(Slide | null)[]>([]);
export const liveSlidesActive: ComputedRef<boolean> = computed<boolean>(() => liveSlidesOnMonitors.value.some(slide => slide))

const scenesMap: ComputedRef<Map<number | undefined, Scene>> = computed<Map<number | undefined, Scene>>(() => {
  return new Map(scenes.value.map(scene => [scene.id, scene]));
});

export function useScenesMap() {
  return scenesMap
}

function setCurrentScene() {
  currentScene.value = scenesMap.value.get(currentPresentation.value?.scenes?.[livePresentationState.value.current_scene - 1]?.id)
}

const activeSceneIdFromPresentation: ComputedRef<number | null> = computed<number | null>(() => {
  const index = livePresentationState.value.current_scene - 1;
  return currentPresentation.value?.scenes?.[index]?.id || null;
});

export function useActiveSceneIdFromPresentation() {
  return activeSceneIdFromPresentation
}

export const sceneOnMonitors = computed(() => {
  const grid = Array(settings.value.number_of_screens).fill(null)
  if (livePresentationState.value.active) {
    currentScene.value?.slides.forEach(slide => {
      if (slide && slide.position && slide.position <= settings.value.number_of_screens) {
        grid[slide.position - 1] = slide
      }
    })

  }
  return grid;
});

export function useSceneOnMonitors() {
  return sceneOnMonitors
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

// probably unesseccary once mulit-moderators is implemented cleanly
export function updateSlideViews(slide: Slide) {
  for (let sl_index = 0; sl_index < liveSlidesOnMonitors.value.length; sl_index++) {
    if (liveSlidesOnMonitors.value[sl_index] && liveSlidesOnMonitors.value[sl_index]?.id == slide.id) {
      liveSlidesOnMonitors.value[sl_index] = slide
    }
  }
  for (let sl_index = 0; sl_index < sceneOnMonitors.value.length; sl_index++) {
    if (sceneOnMonitors.value[sl_index] && sceneOnMonitors.value[sl_index]?.id == slide.id) {
      sceneOnMonitors.value[sl_index] = slide
    }
  }
  if (currentScene.value?.slides) {
    for (let sl_index = 0; sl_index < currentScene.value?.slides.length; sl_index++) {
      if (currentScene.value.slides[sl_index] && currentScene.value.slides[sl_index].id == slide.id) {
        currentScene.value.slides[sl_index].sections = slide.sections
        currentScene.value.slides[sl_index].updated_at = slide.updated_at
      }
    }
  }
}

export function stopPresentation() {
  livePresentationState.value.active = false;
  livePresentationState.value.presentation = -1;
  livePresentationState.value.current_scene = -1;
  currentPresentation.value = null
  currentScene.value = null
}

export function startPresentation(presentationid: number) {
  livePresentationState.value.active = true;
  livePresentationState.value.presentation = presentationid;
  livePresentationState.value.current_scene = 1;
  currentPresentation.value = presentations.value.find((pres) => pres.id == presentationid) ?? null;
  setCurrentScene()
}


export function updateMonitors() {
  if (whatYouSeeOnMonitors.value) {
    updateMonitorStatesFromGriddedSlides(whatYouSeeOnMonitors)
  }
}

export function gotoScene(index: number) {
  const maxScenes = currentPresentation.value?.scenes?.length || 0;
  if (livePresentationState.value.active && (index <= maxScenes) && (index >= 1)) {
    livePresentationState.value.current_scene = index;
    setCurrentScene();
  }
}

export function putLiveSlide(index: number, slideID: number) {
  const slide = getSlideById(slideID)
  if (slide) { liveSlidesOnMonitors.value[index] = slide; }
}

export function removeLiveSlide(index: number) {
  liveSlidesOnMonitors.value[index] = null;
}

export function removeAllLiveSlides() {
  liveSlidesOnMonitors.value.fill(null);
}

export function removeLiveSlideById(id: number) {
  for (let i = 0; i < liveSlidesOnMonitors.value.length; i++) {
    if (liveSlidesOnMonitors.value[i]?.id === id) {
      removeLiveSlide(i);
    }
  }
}

export function updateLiveSlideById(id: number) {
  const slide = getSlideById(id)

  if (slide) {
    for (let i = 0; i < liveSlidesOnMonitors.value.length; i++) {
      if (liveSlidesOnMonitors.value[i]?.id === id) {
        liveSlidesOnMonitors.value[i] = slide
      }
    }
  }
}