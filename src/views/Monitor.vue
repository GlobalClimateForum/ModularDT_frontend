<script setup lang="ts">
// Vue-stuff
import { useRoute } from 'vue-router'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n';
// globals and services
import type { Slide, SlideSection } from '@/services/slide_service';
import { settings } from '@/globals/settings'
import { useLivePresentationState } from '@/globals/live_presentation';
import { parameterStore, type ParameterChange } from '@/services/parameter_service'
import wsService from '@/services/websocket_service'
// components
import SlideView from '@/components/SlideView.vue';

const livePresentationState = useLivePresentationState()
const { t } = useI18n();
const route = useRoute()
const currentId = computed(() => route.params.id)
const currentSlide = ref<Slide | null>(null)

const channelId = `monitor/${currentId.value}/`
const socketUrl = `ws://localhost:8000/ws/monitor/${currentId.value}/`

var liveSlidesActive = ref<Boolean>(false)

// is the monitor ID between 1 and the number of screens?
const activeMonitor = computed(() => {
  const idAsNumber = Number(route.params.id)
  return 1 <= idAsNumber && idAsNumber <= settings.value.number_of_screens
})

//let socket: WebSocket | null = null
const connectionStatus = ref('Connecting...')

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

const handleMessage = (data) => {
  //console.log("got message: ", data)
  try {
    if (data.event_type === 'presentation_start' || data.message) {
      if (1 <= Number(route.params.id) && Number(route.params.id) <= settings.value.number_of_screens) {
        livePresentationState.value.active = true
        livePresentationState.value.presentation = data.presentation_id || 1
        livePresentationState.value.current_scene = data.current_scene || 1
      }
    }

    if (data.event_type === 'presentation_stop' || data.message) {
      if (1 <= Number(route.params.id) && Number(route.params.id) <= settings.value.number_of_screens) {
        livePresentationState.value.active = false
        livePresentationState.value.presentation = -1
        livePresentationState.value.current_scene = 1
      }
    }

    if (data.event_type === 'slide_update' || data.message) {
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

    if (data.event_type === 'live_slides_start' || data.message) {
      if (1 <= Number(route.params.id) && Number(route.params.id) <= settings.value.number_of_screens) {
        liveSlidesActive.value = true
      }
    }

    if (data.event_type === 'live_slides_stop' || data.message) {
      if (1 <= Number(route.params.id) && Number(route.params.id) <= settings.value.number_of_screens) {
        liveSlidesActive.value = false
      }
    }
  } catch (e) {
    console.error('Error processing WebSocket message:', e)
  }
}


onMounted(() => {
  wsService.connect(channelId, socketUrl)
  wsService.on(channelId, 'message', handleMessage)
})

// important: close the socket when the component is unmounted to avoid memory leaks
onUnmounted(() => {
  wsService.off(channelId, 'message', handleMessage)
  wsService.disconnect(channelId)
})
</script>

<template>
  <div v-if="(livePresentationState.active || liveSlidesActive)" class="slideshow">
    <div v-if="currentSlide === null && livePresentationState.active">
    </div>
    <div v-else-if="currentSlide === null && !livePresentationState.active" class="welcome"
      style="width: 100vw; height: 100vh;  overflow: hidden;">
      <img src="/background_monitor.jpg" alt="Welcome"
        style="width: 100%; height: 100%; object-fit: cover; object-position: center;">
    </div>
    <div v-else style="width: 100vw; height: 100vh; overflow: hidden;">
      <SlideView :preview="false" :slide="displaySlide" :showframe="false"
        :sections="displaySlide?.sections ? displaySlide?.sections : []" class="slide-preview" />
    </div>
  </div>
  <div v-else class="welcome">
    <img src="/background_monitor.jpg" alt="Welcome"
      style="width: 100%; height: 100%; object-fit: cover; object-position: center;">
    <div style="position: absolute;">
      <h2>{{ t('monitor.greeting') }}</h2>
      <p>{{ t('monitor.instance_id') }}: {{ currentId }}</p>

      <!-- Monitor ID is between 1 and the number of screens -->
      <div v-if="activeMonitor">
        <p>{{ t('monitor.waiting') }}: /ws/monitor/{{ currentId }}/ </p>
        <p>Status: <strong>{{ connectionStatus }}</strong></p>
      </div>
      <!-- Monitor ID is 0 or exceeds the number of screens -->
      <div v-else>
        <p>{{ t('monitor.invalid') }}</p>
      </div>
    </div>
  </div>
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
  background: linear-gradient(135deg, var(--p-primary-700) 0%, var(--p-primary-900) 100%);
}

.slideshow {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 100vh;
  text-align: center;
}
</style>