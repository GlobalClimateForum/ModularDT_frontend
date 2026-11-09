<script lang="ts" setup>
// Vue-stuff
import { ref, computed, onMounted, onUnmounted, provide, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n';
import { updatePrimaryPalette } from '@primeuix/themes';
// globals and services
import { settings } from '@/globals/settings'
import { useWebsocketService } from '@/services/websocket_service'
import '@/assets/main.css'
import { API_BASE_URL } from '@/config'
import { participants } from '@/globals/participants'
import { getParticipants } from '@/services/participant_service'
import palettes from '@/assets/palettes.json'
import type { Slide } from "@/services/slide_service"
import { sendModeratorMessage } from "@/services/moderator_service";
import { background_image, fetchBackgoundImage } from '@/globals/background_image';
import { slides, fetchSlides } from '@/globals/slides'
// components
import SlideView from '@/components/SlideView.vue'
import SlideLink from '@/components/SlideLink.vue'


const route = useRoute()
const currentId = computed(() => route.params.id)
const { t } = useI18n();
const wsService = useWebsocketService()

const channelId = `participant/${currentId.value}/`
const wsUrlParticipant = new URL('/ws/participant/', API_BASE_URL)
const socketUrl = wsUrlParticipant + `${currentId.value}/`

const currentParticipantName = ref<String>("")
const activeParticipant = ref<Boolean>(false)
const slideshowActive = ref<Boolean>(false)
const mySlideshow = ref<Slide[] | null>(null);
const myCurrentSlide = ref<Slide | null>(null);
let currentSlideIndex = -1
let mySlideshowId = -1

let stop: (() => void) | undefined

onMounted(async () => {
  //stop = parameterStore.subscribe((c) => parameterChanges.value.push(c))
  await getParticipants().then(response => {
    participants.value = response.data.participants;
  }).catch(error => {
    console.error("Error fetching participants:", error);
  });
  wsService.connect(channelId, socketUrl)
  wsService.on(channelId, 'message', handleMessage)
  window.addEventListener('keydown', handleKeyDown)
  sendModeratorAParticipantRequest(`${currentId.value}`)
  const filteredResult = participants.value.find((p) => p.seat === Number(Array.isArray(currentId.value) ? currentId.value[0] : currentId.value));
  currentParticipantName.value = filteredResult ? filteredResult.name : ""
  activeParticipant.value = filteredResult ? true : false
})

onUnmounted(() => {
  wsService.off(channelId, 'message', handleMessage)
  wsService.disconnect(channelId)
  window.removeEventListener('keydown', handleKeyDown)
})

function updateParticipantParameter(parameter_name: string, value: string) {
  sendModeratorMessage({
    event_type: "update",
    command: "update_participant_parameter",
    participant: `${currentId.value}`,
    parameter_name: parameter_name,
    value: value
  })
}

provide('updateParticipantParameter', updateParticipantParameter);

// -- Background slide --
// The slide selected in the global settings is rendered as a layer behind the
// current slide. It is looked up by name in the global slide store.
const backgroundSlide = computed<Slide | null>(() =>
  settings.value.background_participant_slide
    ? slides.value.find(slide => slide.name === settings.value.background_participant_slide) ?? null
    : null
)

// Make sure the slide store is populated whenever a background slide is configured
watch(() => settings.value.background_participant_slide, (name) => {
  if (name) fetchSlides()
}, { immediate: true })

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

function sendModeratorAParticipantRequest(participantid: string) {
  sendModeratorMessage({
    event_type: "request",
    command: "request_from_praticipant",
    participantid: participantid
  })
}

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

    if (data.event_type === 'settings_update' || data.message) {
      if (settings.value.palette != data.settings.palette) {
        settings.value.palette = data.settings.palette
        updatePrimaryPalette(palettes[settings.value.palette]);
      }

      if (settings.value.background_image != data.settings.background_image) {
        console.log("New Background image: ", data.settings.background_image)
        settings.value.background_image = data.settings.background_image
        fetchBackgoundImage(settings.value.background_image);
      }


      if (settings.value.background_image_on_welcome_screens != data.settings.background_image_on_welcome_screens) {
        settings.value.background_image_on_welcome_screens = data.settings.background_image_on_welcome_screens
      }

      // Only update if the payload actually carries the field, so older/other payloads
      // cannot wipe the locally loaded setting back to ''
      if (data.settings.background_participant_slide !== undefined
        && settings.value.background_participant_slide != data.settings.background_participant_slide) {
        settings.value.background_participant_slide = data.settings.background_participant_slide
      }
    }
  } catch (e) {
    console.error('Error processing WebSocket message:', e)
  }
}

const nextSlide = () => {
  if ((mySlideshow.value) && (currentSlideIndex < mySlideshow.value.length - 1)) {
    currentSlideIndex++
    myCurrentSlide.value = mySlideshow.value[currentSlideIndex]
    sendModeratorMessage({
      event_type: "update",
      command: "update_participant_slideshow",
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
    sendModeratorMessage({
      event_type: "update",
      command: "update_participant_slideshow",
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
</script>

<template>
  <div v-if="(slideshowActive)" class="slideshow-container" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
    <!-- Background slide layer (from global settings), if configured -->
    <div v-if="backgroundSlide" class="background-slide">
      <SlideView :preview="false" :slide="backgroundSlide" :showframe="false"
        :sections="backgroundSlide.sections ?? []" />
    </div>
    <SlideView :preview="false" :slide="myCurrentSlide" :showframe="false"
      :sections="myCurrentSlide?.sections ? myCurrentSlide?.sections : []" class="slide-preview" />
    <div class="controls">
      <button v-if="currentSlideIndex > 0" class="nav-btn prev" @click="previousSlide">◀</button>
      <button v-if="mySlideshow && currentSlideIndex < mySlideshow.length - 1" class="nav-btn next"
        @click="nextSlide">▶</button>
    </div>
  </div>
  <div v-else>
    <div v-if="settings.background_image_on_welcome_screens && background_image">
      <img class="bg_image" :src="background_image?.src || ''" alt="">
    </div>
    <div v-else class="welcome show-bg-text">
    </div>
    <div class="centered">
      <h2 style="font-size: 2rem;">{{ t('participant.greeting') }} {{ currentParticipantName }}</h2>
      <!-- Monitor ID is between 1 and the number of screens -->
      <div v-if="activeParticipant">
        <p>{{ t('participant.waiting') }}</p>
      </div>
      <!-- Monitor ID is 0 or exceeds the number of screens -->
      <div v-else>
        <p>{{ t('participant.invalid') }}</p>
      </div>
    </div>
  </div>
</template>

<!--  <div v-else class="welcome show-bg-text">
    <div v-if="(activeParticipant)" style="position: absolute;">
      <h2 style="font-size: 2rem;">{{ t('participant.greeting') }} {{ currentParticipantName }}</h2>
      <p> {{ t('participant.waiting') }} </p>
    </div>
    <div v-else style="position: absolute;">
      <h2 style="font-size: 2rem;">{{ t('participant.greeting') }} {{ currentParticipantName }}</h2>
      <p> {{ t('participant.invalid') }}</p>
    </div>
  </div>
-->

<style scoped>
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

.slide-preview {
  position: relative;
  z-index: 1;
}

.background-slide {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.prev {
  left: 20px;
  /* Abstand zum linken Rand */
}

.next {
  right: 20px;
  /* Abstand zum rechten Rand */
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