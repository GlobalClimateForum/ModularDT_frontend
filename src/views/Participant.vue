<script lang="ts" setup>
// Vue-stuff
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n';
// globals and services
//import { parameterStore, type ParameterChange } from '@/services/parameter_service'
//import { getIPanels } from '@/services/slide_service'
import wsService from '@/services/websocket_service'
import '@/assets/main.css'
// components
import SlideView from '@/components/SlideView.vue'
import type { Slide } from "@/services/slide_service"
import type { Slideshow } from "@/services/slideshow_service"
import { sendModeratorUpdate, sendUpdateParticipantParameter } from "@/services/moderator_service";
import SlideLink from '@/components/SlideLink.vue'

//const parameterChanges = ref<ParameterChange[]>([])
//const panels = ref<any[]>([])
const route = useRoute()
const currentId = computed(() => route.params.id)
const { t } = useI18n();

const connectionStatus = ref('Connecting...')

const channelId = `participant/${currentId.value}/`
const wsUrlParticipant = new URL('/ws/participant/', import.meta.env.VITE_API_BASE_URL)
const socketUrl = wsUrlParticipant + `${currentId.value}/`

const slideshowActive = ref<Boolean>(false)
const mySlideshow = ref<Slide[] | null>(null);
const myCurrentSlide = ref<Slide | null>(null);
let currentSlideIndex = -1
let mySlideshowId = -1

let stop: (() => void) | undefined

function updateParticipantParameter(parameter_name: string, value: string) {
  sendUpdateParticipantParameter(parameter_name, value, `${currentId.value}`)
}

provide('updateParticipantParameter', updateParticipantParameter);

function participantSlideLinkHandler(href: string, event: Event) {  
  console.log('Handler für Link:', href);
  const index = mySlideshow.value?.findIndex(slide => slide.name === href)
  if ((index) && (mySlideshow.value)) {
    currentSlideIndex = index
    myCurrentSlide.value = mySlideshow.value[currentSlideIndex]
  }
  event.preventDefault() 
}

provide('slideLinkClickHandler', participantSlideLinkHandler)
provide('SlideLink', SlideLink)

const handleMessage = (data) => {
  console.log("got message: ", data)
  try {
    if (data.event_type === 'start_slideshow' || data.message) {
      slideshowActive.value = true
      mySlideshow.value = data.slides
      if ((mySlideshow.value) && (mySlideshow.value.length > 0)) {
        myCurrentSlide.value = mySlideshow.value[0]
        currentSlideIndex = 0
        mySlideshowId = data.slideshow_id
      }
    }
    if (data.event_type === 'stop_slideshow' || data.message) {
      slideshowActive.value = false
      myCurrentSlide.value = null
      currentSlideIndex = -1
      mySlideshowId = -1
    }
  } catch (e) {
    console.error('Error processing WebSocket message:', e)
  }
}

const nextSlide = () => {
  if ((mySlideshow.value) && (currentSlideIndex < mySlideshow.value.length - 1)) {
    currentSlideIndex++
    myCurrentSlide.value = mySlideshow.value[currentSlideIndex]
    sendModeratorUpdate({
      event_type: "participant_slideshow_update",
      sender: `${currentId.value}`,
      slideshow_id: mySlideshowId,
      current_slide_index: currentSlideIndex
    })
  }
};

const previousSlide = () => {
  if ((mySlideshow.value) && (currentSlideIndex > 0)) {
    currentSlideIndex--
    myCurrentSlide.value = mySlideshow.value[currentSlideIndex]
    sendModeratorUpdate({
      event_type: "participant_slideshow_update",
      sender: `${currentId.value}`,
      slideshow_id: mySlideshowId,
      current_slide_index: currentSlideIndex
    })
  }
};

// 1. keyboard-control
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowRight') nextSlide();
  if (event.key === 'ArrowLeft') previousSlide();
};

// 2. touch-control
let touchStartX = 0;
let touchEndX = 0;
const minSwipeDistance = 50; // minimal pixel-distance for interpretation as "swipe"

const handleTouchStart = (event: TouchEvent) => {
  touchStartX = event.changedTouches[0].screenX;
};

const handleTouchEnd = (event: TouchEvent) => {
  touchEndX = event.changedTouches[0].screenX;
  handleSwipe();
};

const handleSwipe = () => {
  const distance = touchEndX - touchStartX;

  // Wenn von rechts nach links gewischt wird (Abstand negativ) -> Nächstes Item
  if (distance < -minSwipeDistance) {
    nextSlide();
  }
  // Wenn von links nach rechts gewischt wird (Abstand positiv) -> Vorheriges Item
  if (distance > minSwipeDistance) {
    previousSlide();
  }
};

onMounted(() => {
  //stop = parameterStore.subscribe((c) => parameterChanges.value.push(c))
  wsService.connect(channelId, socketUrl)
  wsService.on(channelId, 'message', handleMessage)
  window.addEventListener('keydown', handleKeyDown)
  //window.updateParticipantParameter = updateParticipantParameter;
})

/*
const ipanels = getIPanels().then((response) => {
  panels.value = response.data
})*/

onUnmounted(() => {
  wsService.off(channelId, 'message', handleMessage)
  wsService.disconnect(channelId)
  window.removeEventListener('keydown', handleKeyDown)
  //delete window.updateParticipantParameter;
})
</script>

<template>
  <div v-if="(slideshowActive)" class="slideshow-container" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
    <SlideView :preview="false" :slide="myCurrentSlide" :showframe="false"
      :sections="myCurrentSlide?.sections ? myCurrentSlide?.sections : []" class="slide-preview" />
    <div class="controls">
      <button class="nav-btn prev" @click="previousSlide" :disabled="currentSlideIndex <= 0">◀</button>
      <button class="nav-btn next" @click="nextSlide"
        :disabled="currentSlideIndex === (mySlideshow && mySlideshow.length - 1)">▶</button>
    </div>
  </div>
  <div v-else class="welcome">
    <img src="/background_monitor.jpg" alt="Welcome"
      style="width: 100%; height: 100%; object-fit: cover; object-position: center;">
    <div style="position: absolute;">
      <h2>{{ t('participant.greeting') }}</h2>
      <p> {{ t('participant.waiting') }} </p>
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

.slideshow-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  user-select: none;
  /* prevent marking text when swiping */
  touch-action: pan-y;
}

/* Common styles for both buttons (centered in the middle) */
.nav-btn {
  position: absolute;
  top: 50%;
  /* Schiebt die Oberkante des Buttons in die exakte Bildschirmmitte */
  transform: translateY(-50%);
  /* Zieht den Button um die eigene halbe Höhe hoch -> perfekt zentriert */
  z-index: 10;
  /* Stellt sicher, dass die Buttons über dem Inhalt liegen */

  /* nice design (optional) */
  padding: 16px;
  font-size: 24px;
  background-color: rgba(255, 255, 255, 0.7);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.9);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.prev {
  left: 20px;
  /* Abstand zum linken Rand */
}

.next {
  right: 20px;
  /* Abstand zum rechten Rand */
}
</style>