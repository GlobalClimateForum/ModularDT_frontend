//
import { ref, computed, watch } from 'vue';
//
import type { Slide } from "@/services/slide_service";
import type { Scene } from "@/services/scene_service";
import type { Presentation } from "@/services/presentation_service";
import { scenes } from '@/globals/scenes';
import { settings } from '@/globals/settings'
import { updateMonitorStatesFromGriddedSlides } from '@/services/monitor_service'
import { updateLivePresentation } from "@/services/live_presentation_service";
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

//var sceneOnMonitors = ref<(Slide | null)[]>([]);

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

/*export function useSceneOnMonitors() {
  return sceneOnMonitors
}*/

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

export async function updatePresentationState() {
  currentScene.value = scenesMap.value.get(currentPresentation.value?.scenes?.[livePresentationState.value.current_scene - 1]?.id)
}

export function updateSlideViews(slide: Slide) {
    for (let sl_index = 0; sl_index < liveSlidesOnMonitors.value.length; sl_index++) {
        if (liveSlidesOnMonitors.value[sl_index]?.id == slide.id) {
            liveSlidesOnMonitors.value[sl_index] = slide
        }
    }
    for (let sl_index = 0; sl_index < sceneOnMonitors.value.length; sl_index++) {
        if (sceneOnMonitors.value[sl_index]?.id == slide.id) {
            sceneOnMonitors.value[sl_index] = slide
        }
    }
    if (currentScene.value?.slides) {
        for (let sl_index = 0; sl_index < currentScene.value?.slides.length; sl_index++) {
            if (currentScene.value.slides[sl_index].id == slide.id) {
                currentScene.value.slides[sl_index].sections = slide.sections
                currentScene.value.slides[sl_index].updated_at = slide.updated_at
            }
        }
    }
}

export const stopPresentation = async () => {
  livePresentationState.value.active = false;
  livePresentationState.value.presentation = -1;
  livePresentationState.value.current_scene = -1;
  currentPresentation.value = null

  try {
    await updateLivePresentation({
      'event_type': 'presentation_stop'
    });
    console.log("Live Presentation stoped.");
  } catch (error) {
    console.error("Error stopping presentation:", error);
  }
  updateMonitors();
}

export const startPresentation = async (presentationid) => {
  livePresentationState.value.active = true;
  livePresentationState.value.presentation = presentationid;
  livePresentationState.value.current_scene = 1;
  currentPresentation.value = presentations.value.find((pres) => pres.id == presentationid) ?? null;

  if (currentPresentation.value) {
    try {
      await updateLivePresentation({
        'event_type': 'presentation_start'
      });
      console.log("Live Presentation started.");
    } catch (error) {
      console.error("Error starting presentation:", error);
    }
  }
  updateMonitors();
}


export function updateMonitors() {
  if (whatYouSeeOnMonitors.value) {
    updateMonitorStatesFromGriddedSlides(whatYouSeeOnMonitors.value)
  }
}

export function previousScene() {
  if (livePresentationState.value.active && (livePresentationState.value.current_scene > 1)) {
    livePresentationState.value.current_scene--;
    updatePresentationState();
    updateMonitors();
  }
}

export function nextScene() {
  const maxScenes = currentPresentation.value?.scenes?.length || 0;
  if (livePresentationState.value.active && (livePresentationState.value.current_scene < maxScenes)) {
    livePresentationState.value.current_scene++;
    updatePresentationState();
    updateMonitors();
  }
};

export function gotoScene(index: number) {
  const maxScenes = currentPresentation.value?.scenes?.length || 0;
  if (livePresentationState.value.active && (index < maxScenes) && (index > 1)) {
    livePresentationState.value.current_scene = index;
    updatePresentationState();
    updateMonitors();
  }
}

/*
const abortPresentation = () => {
  stopPresentation();
  sceneToMonitorGrid();
  livePresentationState.value.current_scene = 1;
};
*/