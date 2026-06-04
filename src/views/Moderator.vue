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

import { PrimeIcons } from '@primevue/core/api';
import { getGroups } from "@/services/group_service";
import { onMounted, ref } from 'vue';

const currentDashboard = ref<'slides' | 'groups' | 'slidecreate'>('slides');
const groups = ref<any[]>([]);

const items = [
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
                <h2>Moderator Dashboard</h2>
            </template>
            <template #end>
                <OperationsMenu />
                <Button :icon="PrimeIcons.HOME" label="Home" @click="router.push('/')" />
            </template>
        </Toolbar>

        <Splitter class="layout-splitter">

            <SplitterPanel :size="15" :minSize="15">
                <Menu :model="items" class="sidebar-menu">
                    <template #item="{ item, props }">
                        <a class="p-menu-item-link" v-bind="props.action">
                            <span class="material-icons">{{ item.materialIcon }}</span>
                            <span>{{ item.label }}</span>
                        </a>
                    </template>
                </Menu>
            </SplitterPanel>

            <SplitterPanel :size="85">

                <SlideManager v-show="currentDashboard === 'slides'" />
                <GroupManager v-show="currentDashboard === 'groups'" :groups="groups" />
                <SlideCreator v-show="currentDashboard === 'slidecreate'" />

            </SplitterPanel>
        </Splitter>

    </div>

</template>

<style scoped>
.dashboard {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

.toolbar {
    margin: 0;
    padding: none; 
    width: 100%;
    border-radius: 0;
    height: 10vh;
}

.layout-splitter {
    flex: 1;
    /* fill remaining height below toolbar */
    border: none;
    border-radius: 0;
}

.sidebar-menu {
    width: 100%;
    border: none;
    height: 100%;
}

.content-scroll {
    width: 100%;
    height: 100%;
    padding: 1rem;
}
</style>