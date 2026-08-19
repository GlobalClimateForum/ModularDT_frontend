<script setup lang="ts">
// Vue-stuff
import { onMounted, ref, computed } from 'vue';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import router from '@/router';
import Badge from 'primevue/badge';
import { Transition } from "vue";
import { useI18n } from 'vue-i18n';
// globals and services
import type { Slide } from "@/services/slide_service"
import type { Scene } from "@/services/scene_service"
import { getParticipants } from "@/services/participant_service";
import { useLivePresentationState, useLiveSlidesOnMonitors } from '@/globals/live_presentation';
import { presentations } from '@/globals/presentations';
import { settings } from '@/globals/settings'
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


const { t } = useI18n();
const livePresentationState = useLivePresentationState()
var liveSlidesOnMonitors = useLiveSlidesOnMonitors();

const currentDashboard = ref<'slides' | 'slidecreate' | 'liveslides' | 'scenes' | 'scenecreate' | 'live' | 'scenecreate' | 'globalsettings' | 'participants' | 'participants_slides'>('slides');
const participants = ref<any[]>([]);
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
  participants: ParticipantsManager
}

const currentView = computed(() => dashboardViews[currentDashboard.value])

const viewProps = computed(() => {
  switch (currentDashboard.value) {
    case 'slidecreate': return { slide: currentSlide.value };
    case 'scenecreate': return { nMonitors: 4, inp_scene: currentScene.value };
    case 'participants': return { participants: participants.value };
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
        label: t('moderator.nav.participants_slides'),
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

onMounted(() => {
  getParticipants()
    .then(response => { participants.value = response.data.participants; })
    .catch(error => { console.error("Error fetching participants:", error); });
  currentDashboard.value = 'slides';
  liveSlidesOnMonitors = ref<(Slide | null)[]>(Array(settings.value.number_of_screens).fill(null));
});

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

      <Menu :model="items" class="panel">
        <template #submenulabel="{ item }">
          <h2>{{ item.label }}</h2>
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
                font-size: var(--fs-small);"> {{ presentations.find(p => p.id === livePresentationState.presentation)?.name }} </p>
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
    <SplitterPanel :size="85" class="panel">
      <Transition name="fade">
        <component :is="currentView" v-bind="viewProps" :key="currentDashboard" @edit-slide="handleSlideEdit"
          @edit-scene="handleSceneEdit" @live="handleLiveSwitch" @scenes="handleScenes" />
      </Transition>
    </SplitterPanel>
  </Splitter>
</template>

<style scoped>
.panel {
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
  font-size: var(--fs-large);
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
  padding: var(--space-small);
  border: none;
  border-radius: var(--br-large);
  background-color: var(--surface);
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
  gap: var(--space-large);
}

.status-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-small);
  background-color: var(--surface);
  padding: var(--space-medium);
}

.status-panel ul {
  list-style: none;
  margin: 0;
  padding-left: var(--space-medium);
}
</style>