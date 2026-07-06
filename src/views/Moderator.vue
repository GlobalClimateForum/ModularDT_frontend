<script setup lang="ts">
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import router from '@/router';

import SlideManager from '@/components/SlideManager.vue';
import GroupManager from '@/components/GroupManager.vue';
import SlideCreator from '@/components/SlideCreator.vue';
import SceneBuilder from '@/components/SceneBuilder.vue';
import SceneManager from '@/components/SceneManager.vue';
import GlobalSettings from '@/components/GlobalSettings.vue';
import PresentationControl from '@/components/PresentationControl.vue';
import PresentationManager from '@/components/PresentationManager.vue';

import '@/assets/main.css'

import { PrimeIcons } from '@primevue/core/api';
import { getGroups } from "@/services/group_service";
import { onMounted, ref, computed } from 'vue';
import type { Slide } from "@/services/slide_service"
import type { Scene } from "@/services/scene_service"
import { Transition } from "vue";
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const currentDashboard = ref<'slides' | 'slidecreate' | 'scenes' | 'scenecreate' | 'live' | 'presentations' | 'scenecreate' | 'globalsettings' | 'groups'>('slides');
const groups = ref<any[]>([]);
const currentSlide = ref<Slide | null>(null);
const currentScene = ref<Scene | null>(null);

const items = computed(() => [
  {
    label: t('moderator.nav.presentations'),
    items: [
      {
        key: 'presentations',
        label: t('moderator.nav.overview'),
        materialIcon: "filter",
        command: () => { currentDashboard.value = 'presentations'; }
      },
/*      {
        key: 'presentationcreate',
        label: t('moderator.nav.editor'),
        materialIcon: 'code',
        command: () => { currentDashboard.value = 'presentationcreate'; }
      },*/
      {
        key: 'live',
        label: "Live",
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
        command: () => { currentDashboard.value = 'scenecreate'; }
      },
    ],
  },
  {
    label: t('moderator.nav.slides'),
    items: [
      {
        key: t('moderator.nav.slides'),
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
  getGroups()
    .then(response => { groups.value = response.data.groups; })
    .catch(error => { console.error("Error fetching groups:", error); });
});

function handleSlideEdit(slide: Slide) {
  currentSlide.value = slide
  currentDashboard.value = 'slidecreate';
}

function handleSceneEdit(scene: Scene) {
  currentScene.value = scene
  currentDashboard.value = 'scenecreate';
}

</script>

<template>
  <Splitter class="main-panel" :gutterSize="2">

    <SplitterPanel :size="15" :minSize="15" class="menu-panel">

      <Menu :model="items">

        <template #start>
          <div class="menu-header">
            <div class="content-title">{{ $t('moderator.nav.dashboard') }}</div>
            <Button icon="pi pi-home" @click="router.push('/')" />
          </div>
        </template>

        <template #item="{ item, props }">
          <a :class="{ 'p-menu-item-link': true, 'active-item': currentDashboard === item.key }" v-bind="props.action">
            <span class="material-symbols-outlined">{{ item.materialIcon }}</span>
            <span>{{ item.label }}</span>
          </a>
        </template>
      </Menu>

    </SplitterPanel>
    <SplitterPanel :size="85">
      <!--nsition name="fade" mode="out-in">
        <PresentationManager v-if="currentDashboard === 'presentations'" />
      </Transition>-->
      <Transition name="fade" mode="out-in">
        <PresentationControl v-if="currentDashboard === 'live'" />
      </Transition>
      <Transition name="fade" mode="out-in">
        <SceneBuilder v-if="currentDashboard === 'scenecreate'" :n-monitors="4" />
      </Transition>
      <Transition name="fade" mode="out-in">
        <SlideManager v-if="currentDashboard === 'slides'" @edit-slide="handleSlideEdit" />
      </Transition>
      <Transition name="fade" mode="out-in">
        <SceneManager v-if="currentDashboard === 'scenes'" @edit-scene="handleSceneEdit" />
      </Transition>
      <Transition name="fade" mode="out-in">
        <GroupManager v-if="currentDashboard === 'groups'" :groups="groups" />
      </Transition>
      <Transition name="fade" mode="out-in">
        <SlideCreator v-if="currentDashboard === 'slidecreate'" :slide="currentSlide" />
      </Transition>
      <Transition name="fade" mode="out-in">
        <GlobalSettings v-if="currentDashboard === 'globalsettings'" />
      </Transition>
    </SplitterPanel>
  </Splitter>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 180ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.content-title {
  font-size: 1.0rem;
  font-weight: 600;
}

.main-panel {
  flex: 1 1 auto;
  min-height: 0;
  border: none;
  border-radius: 0;
  padding: 1.5rem;
  gap: 1rem;
  height: 100vh;
  min-height: 100vh;

  background-image:
    linear-gradient(135deg, #eaeff6 0%, #d6dde8 100%);
}

:deep(.p-menu-item-link) {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
}

:deep(.p-menu-item[data-p-focused="true"] .p-menu-item-content) {
  background-color: var(--p-primary-600);
  color: var(--p-primary-50);
}

:deep(.p-menu) {
  padding: 0.5rem;
  border: none;
}

.active-item {
  background-color: var(--p-primary-600);
  color: var(--p-primary-50);
}

.menu-header {
  padding: 1rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--surface);
}

.menu-panel {
  border: 1px solid var(--surface-border, #e2e8f0);
  background-color: var(--surface-card, #fff);
  border-radius: var(--br-medium);
}
</style>