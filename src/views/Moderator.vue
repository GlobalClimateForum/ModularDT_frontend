<script setup lang="ts">
// Vue-stuff
import { onMounted, onUnmounted, ref, computed, Transition, provide } from 'vue';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import router from '@/router';
import Badge from 'primevue/badge';
import { useI18n } from 'vue-i18n';
// globals and services
import type { Slide } from "@/services/slide_service"
import type { Scene } from "@/services/scene_service"
import { useLivePresentationState, useLiveSlidesOnMonitors } from '@/globals/live_presentation';
import { presentations } from '@/globals/presentations';
import { settings } from '@/globals/settings'
import { updateLiveParticipantsSlideshow } from '@/globals/live_participant_slideshows';
import { participant_parameters } from '@/globals/participant_parameters';
import wsService from '@/services/websocket_service'
import '@/assets/main.css'
// components
import SlideManager from '@/components/SlideManager.vue';
import ParticipantsManager from '@/components/ParticipantsManager.vue';
import SlideCreator from '@/components/SlideCreator.vue';
import SceneBuilder from '@/components/SceneBuilder.vue';
import SceneManager from '@/components/SceneManager.vue';
import GlobalSettings from '@/components/GlobalSettings.vue';
import PresentationControl from '@/components/PresentationControl.vue';
import LiveSlides from '@/components/LiveSlides.vue';
import ContentServerStatus from '@/components/ContentServerStatus.vue';
import BackendServerStatus from '@/components/BackendServerStatus.vue';
import LivePariticipants from '@/components/LiveParticipants.vue';
import ParticipantSlideshow from '@/components/ParticipantSlideshow.vue';


const { t } = useI18n();
const livePresentationState = useLivePresentationState()
var liveSlidesOnMonitors = useLiveSlidesOnMonitors();

const channelId = `moderator/`
const wsUrlMonitor = new URL('/ws/moderator/', import.meta.env.VITE_API_BASE_URL)
const socketUrl = wsUrlMonitor + ``

const currentDashboard = ref<'slides' | 'slidecreate' | 'liveslides' | 'scenes' | 'scenecreate' | 'live' | 'scenecreate' | 'globalsettings' | 'participants' | 'participants_slides' | 'live_participants' | 'parameterchanges'>('slides');
//const participants = ref<any[]>([]);
const currentSlide = ref<Slide | null>(null);
const currentScene = ref<Scene | null>(null);

const dashboardViews = {
  slides: SlideManager,
  slidecreate: SlideCreator,
  liveslides: LiveSlides,
  scenes: SceneManager,
  scenecreate: SceneBuilder,
  live: PresentationControl,
  //presentations: PresentationManager,
  globalsettings: GlobalSettings,
  participants: ParticipantsManager,
  participants_slides: ParticipantSlideshow,
  live_participants: LivePariticipants
  //parameterchanges: ParameterChanges
}

const currentView = computed(() => dashboardViews[currentDashboard.value])

const viewProps = computed(() => {
  switch (currentDashboard.value) {
    case 'slidecreate': return { slide: currentSlide.value };
    case 'scenecreate': return { nMonitors: 4, inp_scene: currentScene.value };
    default: return {};
  }
});

const items = computed(() => [
  {
    label: t('moderator.nav.live'),
    items: [
      {
        key: 'liveslides',
        label: "Live " + t('moderator.nav.slides'),
        materialIcon: 'live_tv',
        command: () => { currentDashboard.value = 'liveslides'; }
      },
      {
        key: 'live',
        label: "Live " + t('moderator.nav.presentation'),
        materialIcon: 'live_tv',
        command: () => { currentDashboard.value = 'live'; }
      },
      {
        key: 'liveparticipants',
        label: "Live " + t('moderator.nav.participants'),
        materialIcon: 'tune',
        command: () => { currentDashboard.value = 'live_participants'; }
      }
    ],
  },
  {
    label: t('moderator.nav.scenes'),
    items: [
      {
        key: 'scenes',
        label: t('moderator.nav.overview'),
        materialIcon: 'theaters',
        command: () => { currentDashboard.value = 'scenes'; }
      },
      {
        key: 'scenecreate',
        label: t('moderator.nav.builder'),
        materialIcon: 'slide_library',
        command: () => {
          currentScene.value = null;
          currentDashboard.value = 'scenecreate';
        }
      },
    ],
  },
  {
    label: t('moderator.nav.slides'),
    items: [
      {
        key: 'slides',
        label: t('moderator.nav.overview'),
        materialIcon: "filter",
        command: () => { currentDashboard.value = 'slides'; }
      },
      {
        key: 'slidecreate',
        label: t('moderator.nav.editor'),
        materialIcon: 'code',
        command: () => { currentDashboard.value = 'slidecreate'; }
      },
    ],
  },
  {
    label: t('moderator.nav.participants'),
    items: [
      {
        key: 'participants',
        label: t('moderator.nav.overview'),
        materialIcon: "group",
        command: () => { currentDashboard.value = 'participants'; }
      },
      {
        key: 'participants_slides',
        label: t('moderator.nav.participants_slideshow'),
        materialIcon: "live_tv",
        command: () => { currentDashboard.value = 'participants_slides'; }
      },
    ],
  },
  {
    label: t('moderator.nav.settings'),
    items: [
      {
        key: 'globalsettings',
        label: t('moderator.nav.settings'),
        materialIcon: "settings",
        command: () => { currentDashboard.value = 'globalsettings'; }
      },
    ],
  },
]);

const handleMessage = (data) => {
  try {
    if (data.event_type === 'participant_slideshow_update' || data.message) {
      updateLiveParticipantsSlideshow({
        participant_seat: Number(data.sender),
        slideshow_id: data.slideshow_id,
        current_slide_index: data.current_slide_index
      });
    }
    if (data.event_type === 'update_participant_parameter' || data.message) {
      console.log(data)
      /* {
        event_type: "update_participant_parameter",
        paricipant: sender,
        parameter_name: parameter_name,
        value: value
      } */
    }
  } catch (e) {
    console.error('Error processing WebSocket message:', e)
  }
}

function updateParticipantParameter(parameter_name: string, value: string) {
    // This is a Dummy for the Moderator view. In the slide preview the interactive slides
    // for the participant are also rendered. If this function is missing the preview would crash.
    // However, in the moderator view this function does not have to do anything
}

provide('updateParticipantParameter', updateParticipantParameter);


onMounted(() => {
  wsService.connect(channelId, socketUrl)
  wsService.on(channelId, 'message', handleMessage)
  liveSlidesOnMonitors.value = Array(settings.value.number_of_screens).fill(null);
  currentDashboard.value = 'slides';
});

// important: close the socket when the component is unmounted to avoid memory leaks
onUnmounted(() => {
  wsService.off(channelId, 'message', handleMessage)
  wsService.disconnect(channelId)
})

function handleSlideEdit(slide: Slide) {
  currentSlide.value = slide
  currentDashboard.value = 'slidecreate';
}

function handleSceneEdit(scene: Scene) {
  currentScene.value = scene
  currentDashboard.value = 'scenecreate';
}

function handleLiveSwitch() {
  currentDashboard.value = 'live'
}

function handleScenes() {
  currentDashboard.value = 'scenes'
}

function handleLiveparticipants() {
  currentDashboard.value = 'live_participants'
}
</script>

<template>
  <Splitter class="main-panel" :gutterSize="0">

    <SplitterPanel :size="15" :minSize="15" class="menu-panel">

      <div class="menu-header panel">
        <div class="content-title">{{ $t('moderator.nav.dashboard') }}</div>
        <Button @click="router.push('/')" text style="color: white;">
          <template #icon>
            <span class="material-symbols-outlined">home</span>
          </template>
        </Button>
      </div>

      <Menu :model="items" class="panel" style="overflow-y: auto;">
        <template #submenulabel="{ item }">
          <h2 class="group-label">{{ item.label }}</h2>
        </template>
        <template #item="{ item, props }">
          <a :class="{ 'p-menu-item-link': true, 'active-item': currentDashboard === item.key }" v-bind="props.action">
            <span class="material-symbols-outlined">{{ item.materialIcon }}</span>
            <span>{{ item.label }}</span>
          </a>
        </template>
      </Menu>

      <div class="status-panel panel">
        <ul>
          <li class="label-container">
            <label>Content Server</label>
            <ContentServerStatus :size="'small'" />
          </li>
          <li class="label-container">
            <label>Backend Server</label>
            <BackendServerStatus :size="'small'" />
          </li>
        </ul>
        <ul>
          <li class="label-container">
            <label>{{ $t('moderator.presentation.presentation') }}</label>
            <div style="display: flex; flex-direction: row; align-items: center; gap: 0.5rem;">
              <Badge :severity="livePresentationState.active ? 'success' : 'danger'"
                style="align-self: center; flex-shrink: 0;" />
              <div v-if="livePresentationState.active">
                <p style="padding: 0; margin: 0; font-weight: 400; font-family: 'Fira Code';
                font-size: var(--fs-small);"> {{presentations.find(p => p.id ===
                  livePresentationState.presentation)?.name}} </p>
              </div>
              <div v-else>
                <p style="padding: 0; margin: 0; font-weight: 400; font-family: 'Fira Code';
                font-size: var(--fs-small); ">{{ t('moderator.presentation.no_presentation_showing_short') }}</p>
              </div>
            </div>
          </li>
        </ul>
      </div>

    </SplitterPanel>
    <SplitterPanel :size="85" class="fixed" >
      <Transition name="fade">
        <component :is="currentView" v-bind="viewProps" :key="currentDashboard" @edit-slide="handleSlideEdit"
          @edit-scene="handleSceneEdit" @live="handleLiveSwitch" @scenes="handleScenes" @liveparticipants="handleLiveparticipants"/>
      </Transition>
    </SplitterPanel>
  </Splitter>
</template>

<style scoped>
.fixed {
  position: relative;
  overflow: hidden;
}

.fade-leave-active {
  position: absolute;
  inset: 0;
}

.fade-enter-active {
  transition: opacity 220ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-leave-active {
  transition: opacity 140ms ease-in, transform 140ms ease-in;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@keyframes main-in {
  from {
    transform: scale(0.99);
    opacity: 0.9;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

.content-title {
  font-size: var(--fs-medium);
  font-weight: 600;
}

.main-panel {
  flex: 1 1 auto;
  min-height: 0;
  border: none;
  padding: var(--space-large);
  gap: var(--space-medium);
  height: 100vh;
  min-height: 100vh;
  background-color: var(--surface-dark);
}

:deep(.p-menu-item-link) {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-small);
}

:deep(.p-menu-item[data-p-focused="true"] .p-menu-item-content) {
  background-color: var(--p-primary-600);
  color: var(--p-primary-50);
}

:deep(.p-menu) {
  border: none;
  padding: 0 var(--space-small);
  border-radius: var(--br-medium);
}

:deep(.p-menu-submenu-label) {
  padding: var(--space-small) var(--space-small) 0;
}

:deep(.p-menu-list > li:first-child) .group-label { margin-top: 0; }

.group-label {
  margin: 0; 
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-primary-500); 
}

.group-label {
  color: var(--p-primary-500);
  font-size: var(--fs-small) !important;
  font-weight: 600;
  padding: 0;
}

:deep(.p-menu-item-link) .material-symbols-outlined {
  font-size: 20px;
  flex-shrink: 0;
}

.active-item {
  background-color: var(--p-primary-600);
  color: var(--p-primary-50);
}

.menu-header {
  padding: var(--space-medium);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: var(--p-primary-500);
  color: white;
  font-size: var(--fs-xlarge);
}

.menu-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
}

.status-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
  background-color: var(--surface);
  padding:  var(--space-medium) 0;
  border-radius: var(--br-medium); 
}

.status-panel ul {
  list-style: none;
  margin: 0;
  padding-left: var(--space-medium);
  overflow-y: auto;
}
</style>