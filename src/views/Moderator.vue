<script setup lang="ts">
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import router from '@/router';

import SlideManager from '@/components/SlideManager.vue';
import GroupManager from '@/components/GroupManager.vue';
import SlideCreator from '@/components/SlideCreator.vue';

import '@/assets/main.css'

import { PrimeIcons } from '@primevue/core/api';
import { getGroups } from "@/services/group_service";
import { onMounted, ref } from 'vue';

const currentDashboard = ref<'slides' | 'groups' | 'slidecreate' | 'livePresentation'>('slides');
const groups = ref<any[]>([]);

const items = [
  {
    label: 'Presentation',
    items : [
      {
        label: "Live", 
        materialIcon: 'live_tv',
        command: () => { currentDashboard.value = 'livePresentation';}
      }
    ]
  },
  {
    label: 'Slides',
    items: [
      {
        label: 'Manage',
        materialIcon: 'slideshow',
        command: () => { currentDashboard.value = 'slides'; }
      },
      {
        label: 'Add New',
        materialIcon: 'add',
        command: () => { currentDashboard.value = 'slidecreate'; }
      },
    ],
  },
  {
    label: 'Groups',
    items: [
      {
        label: 'Manage',
        materialIcon: 'group',
        command: () => { currentDashboard.value = 'groups'; }
      },
    ],
  },
];

onMounted(() => {
  getGroups()
    .then(response => { groups.value = response.data.groups; })
    .catch(error => { console.error("Error fetching groups:", error); });
});
</script>

<template>
  <div class="dashboard">
    <Toolbar class="toolbar">
      <template #start>
        <h2 class="toolbar-title">Moderator Dashboard</h2>
      </template>
      <template #end>
        <Button :icon="PrimeIcons.HOME" label="Home" @click="router.push('/')" />
      </template>
    </Toolbar>

    <Splitter class="layout-splitter" :gutterSize="1">
      <SplitterPanel :size="18" :minSize="15" class="sidebar-panel">

        <Menu :model="items">
          <template #item="{ item, props }">
            <a class="p-menu-item-link" v-bind="props.action">
              <span class="material-icons">{{ item.materialIcon }}</span>
              <span>{{ item.label }}</span>
            </a>
          </template>
        </Menu>

      </SplitterPanel>

      <SplitterPanel :size="82" class="content-panel">
        <div>
          <SlideManager v-if="currentDashboard === 'slides'" />
          <GroupManager v-if="currentDashboard === 'groups'" :groups="groups" />
          <SlideCreator v-if="currentDashboard === 'slidecreate'" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>

<style scoped>
.content-title {
  font-size: 1.0em; 
  margin-top: 0;
  margin-bottom: 0.5em;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-color-secondary, #64748b);
}

.dashboard {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  box-sizing: border-box;
}

.toolbar {
  border-radius: 0;
  z-index: 1;
  height: 10vh;
  color: white;
  box-shadow: var(--shadow-dark);
  background-color: var(--primary);
  border: none;
}

.content-panel {
  overflow: hidden;
  height: 80vh;
  padding: 1em;
  background-color: white;
  border-radius: 6px;
}

.toolbar-title {
  margin: 0;
  font-weight: 600;
}

.layout-splitter {
  flex: 1 1 auto;
  min-height: 0;
  border: none;
  border-radius: 0;
  padding: 2rem;
  gap: 1rem;
  background-color: var(--surface);
}

.sidebar-menu {
  width: 100%;
  height: 100%;
  height: 80vh;
}
</style>