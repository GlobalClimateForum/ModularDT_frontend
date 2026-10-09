<script setup lang="ts">
// Vue-stuff
import { useRoute } from 'vue-router'
import { computed, onMounted, onUnmounted, onBeforeMount, ref, provide, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n';
import { updatePrimaryPalette } from '@primeuix/themes';
// globals and services
import type { Slide, SlideSection } from '@/services/slide_service';
import { settings } from '@/globals/settings'
import { type ParameterChange } from '@/services/parameterstore_service'
import parameterStore from '@/services/parameterstore_service'
import { useWebsocketService } from '@/services/websocket_service'
import { background_image, fetchBackgoundImage } from '@/globals/background_image';
import { sendModeratorAMonitorRequest } from '@/services/moderator_service'
import '@/assets/main.css'
import palettes from '@/assets/palettes.json'
// components
import SlideView from '@/components/SlideView.vue';

const { t } = useI18n();
const route = useRoute()
const currentId = computed(() => route.params.id)
const currentSlide = ref<Slide | null>(null)

const channelId = `monitor/${currentId.value}/`
const wsUrlMonitor = new URL('/ws/monitor/', import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/')
const socketUrl = wsUrlMonitor + `${currentId.value}/`

const wsService = useWebsocketService()

let livePresentationActive = ref<Boolean>(false)
let liveSlidesActive = ref<Boolean>(false)
let ready_to_render = ref<Boolean>(false) 

// is the monitor ID between 1 and the number of screens?
const activeMonitor = computed(() => {
  const idAsNumber = Number(route.params.id)
  return 1 <= idAsNumber && idAsNumber <= settings.value.number_of_screens
})

//let socket: WebSocket | null = null
const connectionStatus = ref('Connecting...')

function updateParticipantParameter(parameter_name: string, value: string) {
  // This is a Dummy for the Monitor view. In the Monitor view the interactive slides
  // for the participant should not appear, but you never know what the user does. 
  // If an interactive slide is displayed and this function is missing the monitor view would crash.
  // However, in the monitor view this function does not have to do anything
}

provide('updateParticipantParameter', updateParticipantParameter);

// The slide to be displayed, which is the currentSlide with the latest parameter changes applied
const displaySlide = computed(() => {
  if (!currentSlide.value) return null
  const lastChange = parameterChanges.value[parameterChanges.value.length - 1]
  const updatedSlide = applyParameterChange(currentSlide.value, lastChange)
  return updatedSlide
})

function getSlideMode(sections: SlideSection[]): string {
  return sections.some(section => section.mode === 'interactive') ? 'interactive' : 'static';
}

// -- Parameter Changes --
const parameterChanges = ref<ParameterChange[]>([])
// Subscribe to parameter changes when the component is mounted
onMounted(() => {
  stop = parameterStore.subscribe((c) => parameterChanges.value.push(c))
})
// Function to stop the subscription to parameter changes
let stop: (() => void) | undefined
// Clean up the subscription when the component is unmounted
onUnmounted(() => stop?.())

// Function to apply a parameter change to a slide, returning a new slide object with the updated parameters
function applyParameterChange(slide: Slide, change: ParameterChange | undefined): Slide {
  if (!change) return slide // If no change is provided, return the original slide
  const updatedSections = slide.sections?.map(section => {
    if (section.id !== change.section) return section // If the section ID does not match, return the original section
    const existing = section.parameters?.[change.parameter] // Get the existing parameter value for the section
    const updated = existing && typeof existing === 'object'
      ? { ...existing, default: change.value }
      : change.value
    return {
      ...section,
      parameters: { ...section.parameters, [change.parameter]: updated },
    }
  })
  return { ...slide, sections: updatedSections }
}

function updateSettings(data) {
      let need_to_rerender = false

      settings.value.background_image_on_empty_screens = data.settings.background_image_on_empty_screens

      if (settings.value.number_of_screens != data.settings.number_of_screens) {
        settings.value.number_of_screens = data.settings.number_of_screens
        need_to_rerender = true
      }

      if (settings.value.background_image_on_welcome_screens != data.settings.background_image_on_welcome_screens) {
        settings.value.background_image_on_welcome_screens = data.settings.background_image_on_welcome_screens
        need_to_rerender = true
      }

      if (settings.value.show_screen_id != data.settings.show_screen_id) {
        settings.value.show_screen_id = data.settings.show_screen_id
        need_to_rerender = true
      }

      if (settings.value.palette != data.settings.palette) {
        settings.value.palette = data.settings.palette
        updatePrimaryPalette(palettes[settings.value.palette]);
        //need_to_rerender = true
      }

      if (settings.value.background_image != data.settings.background_image) {
        settings.value.background_image = data.settings.background_image
        fetchBackgoundImage(settings.value.background_image);
        //need_to_rerender = true
      }

      if (need_to_rerender) {
        const instance = getCurrentInstance();
        if (instance?.proxy) {
          instance.proxy.$forceUpdate();
        }
      }
}

const handleMessage = (data) => {
  console.debug("got message: ", data)
  try {
    if (data.event_type === 'presentation_start' || data.message) {
      if (1 <= Number(route.params.id) && Number(route.params.id) <= settings.value.number_of_screens) {
        livePresentationActive.value = true
      }
    }

    if (data.event_type === 'presentation_stop' || data.message) {
      if (1 <= Number(route.params.id) && Number(route.params.id) <= settings.value.number_of_screens) {
        livePresentationActive.value = false
      }
    }

    if (data.event_type === 'slide_change' || data.message) {
      if (1 <= Number(route.params.id) && Number(route.params.id) <= settings.value.number_of_screens) {
        if (data.slide != "null") {
          if ((currentSlide.value != null && currentSlide.value.id != data.slide.id) || currentSlide.value == null) {
            currentSlide.value = data.slide
          }
        } else {
          currentSlide.value = null
        }
      }
    }

    if (data.event_type === 'slide_update' || data.message) {
      if (data.slide != "null") {
        if (currentSlide.value != null && currentSlide.value.id == data.slide.id) {
          currentSlide.value = data.slide
        }
      }
    }

    if (data.event_type === 'live_slides_start' || data.message) {
      if (1 <= Number(route.params.id) && Number(route.params.id) <= settings.value.number_of_screens) {
        liveSlidesActive.value = true
      }
    }

    if (data.event_type === 'live_slides_stop' || data.message) {
      if (1 <= Number(route.params.id) && Number(route.params.id) <= settings.value.number_of_screens) {
        liveSlidesActive.value = false
        if (!livePresentationActive.value) {
          currentSlide.value = null
        }
      }
    }

    if (data.event_type === 'settings_update' || data.message) {
      updateSettings(data)
    }

    if (data.event_type === 'data_update' || data.message) {
      updateSettings(data)
      liveSlidesActive.value = data.presentation.liveSlidesActive
      livePresentationActive.value = data.presentation.livePresentationActive
      currentSlide.value = data.presentation.slide
      ready_to_render.value = true
    }
  } catch (e) {
    console.error('Error processing WebSocket message:', e)
  }
}

onBeforeMount(() => {
  wsService.connect(channelId, socketUrl)
  wsService.on(channelId, 'message', handleMessage)
  sendModeratorAMonitorRequest(`${currentId.value}`)
  fetchBackgoundImage(settings.value.background_image);
})

// important: close the socket when the component is unmounted to avoid memory leaks
onUnmounted(() => {
  wsService.off(channelId, 'message', handleMessage)
  wsService.disconnect(channelId)
})
</script>

<template>
  <div v-if="ready_to_render">
  <div v-if="settings.show_screen_id" class="monitor_ID">
    {{ currentId }}
  </div>
  <div v-if="(livePresentationActive || liveSlidesActive)" class="slideshow">
    <div v-if="currentSlide === null && livePresentationActive">
      <div v-if="settings.background_image_on_empty_screens && background_image">
        <img class="bg_image" :src="background_image?.src || ''" alt="">
      </div>
    </div>
    <div v-else-if="currentSlide === null && !livePresentationActive" class="welcome show-bg-text">
      style="width: 100vw; height: 100vh; overflow: hidden;">
    </div>
    <div v-else style="width: 100vw; height: 100vh; overflow: hidden;">
      <SlideView :preview="false" :slide="displaySlide" :showframe="false"
        :sections="displaySlide?.sections ? displaySlide?.sections : []" class="slide-preview" />
    </div>
  </div>
  <div v-else>
    <div v-if="settings.background_image_on_welcome_screens && background_image">
        <img class="bg_image" :src="background_image?.src || ''" alt="">
    </div>
    <div v-else class="welcome show-bg-text">
    </div>
    <div class="centered">
      <h2 style="font-size: 2rem;">{{ t('monitor.greeting') }}</h2>
      <!-- Monitor ID is between 1 and the number of screens -->
      <div v-if="activeMonitor">
        <p>{{ t('monitor.waiting') }}</p>
      </div>
      <!-- Monitor ID is 0 or exceeds the number of screens -->
      <div v-else>
        <p>{{ t('monitor.invalid') }}</p>
      </div>
    </div>
  </div>
  </div>
</template>


<style scoped>
.slideshow {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 100vh;
  text-align: center;
}

.monitor_ID {
  /* fixed ignoriert andere Elemente und fixiert es am Bildschirm */
  position: fixed;
  top: 20px;
  left: 20px;

  /*transform: rotateX(10deg); */
  font-size: clamp(3.5rem, 9vw, 8rem);
  font-weight: 600;
  color: white;
  pointer-events: none;
  z-index: 9999;
  /* Hoher z-index, damit es über allem anderen liegt */
  white-space: nowrap;
}

.bg_image {
  position: fixed; 
  top: 0; 
  left: 0; 
	
  /* Preserve aspet ratio */
  min-width: 100%;
  min-height: 100%;
}
</style>