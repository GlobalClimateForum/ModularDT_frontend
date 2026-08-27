<script setup lang="ts">
// Vue-stuff
import { ref, onMounted } from 'vue';
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext';
import { useI18n } from 'vue-i18n';
import { FilterMatchMode } from '@primevue/core/api'
import Message from 'primevue/message';
// globals and services
import type { Slide } from '@/services/slide_service'
import { settings } from '@/globals/settings'
import { slides } from '@/globals/slides';
import { useLivePresentationState, useLiveSlidesOnMonitors, useLiveSlidesActive, useWhatYouSeeOnMonitors } from '@/globals/live_presentation';
import { updateMonitorStatesFromGriddedSlides, updateOneMonitor } from '@/services/monitor_service'
import { startLiveSlides, stopLiveSlides } from "@/services/live_slides_service";
import { formatDate } from '@/utils/date_utils';
import '@/assets/main.css'
// components
import SlideView from '@/components/SlideView.vue';


const livePresentationState = useLivePresentationState()
const liveSlidesActive = useLiveSlidesActive()
const { t } = useI18n();

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

var liveSlidesOnMonitors = useLiveSlidesOnMonitors();
//var sceneOnMonitors = useSceneOnMonitors()
var whatYouSeeOnMonitors = useWhatYouSeeOnMonitors()

onMounted(() => {
});

/*
watch(
    () => settings.value.number_of_screens,
    (newCount) => {
        const currentCount = sceneOnMonitors.value.length

        if (newCount > currentCount) {
            const extraSlots = Array(newCount - currentCount).fill(null)
            sceneOnMonitors.value.push(...extraSlots)
        } else if (newCount < currentCount) {
            sceneOnMonitors.value.splice(newCount)
        }
    },
    { immediate: true }
)
'*' */

// Handle drag-and-drop events for slides and monitors
function onDragStart(e: DragEvent, slide: Slide) {
    e.dataTransfer?.setData('slide', JSON.stringify(slide));

    const original = e.currentTarget as HTMLElement;
    e.dataTransfer?.setDragImage(original, original.offsetWidth / 2, original.offsetHeight / 2);

    // Set AFTER setDragImage so the ghost captures full opacity
    requestAnimationFrame(() => original.classList.add('is-dragging'));
}

function onDragEnd(e: DragEvent) {
    (e.currentTarget as HTMLElement).classList.remove('is-dragging');
}

function onDrop(event: DragEvent, index: number) {

    const slideData = event.dataTransfer?.getData('slide');
    if (!slideData) return;

    startLiveSlides()
    const slide: Slide = JSON.parse(slideData);
    liveSlidesOnMonitors.value[index] = slide;
    updateOneMonitor(slide, index + 1)
}

// remove later
const editingRows = ref<Slide[]>([]);
const selectedSlide = ref<Slide | null>(null);
</script>

<template>
    <Splitter :gutter-size="2" class="dashboard">
        <!-- Available Slides -->
        <SplitterPanel :size="25" class="sub-panel">
            <DataTable :value="slides" dataKey="id" editMode="row" scrollable scrollHeight="flex"
                responsiveLayout="scroll" class="slide-table" v-model:editingRows="editingRows"
                v-model:selection="selectedSlide" selectionMode="single"
                :globalFilterFields="['name', 'content', 'tags']" v-model:filters="filters">

                <Column field="name" header="">
                    <template #editor="slotProps">
                        <InputText v-model="slotProps.data.name" />
                    </template>
                    <template #body="slotProps">
                        <div class="slide-info">
                            <p class="slide-label">{{ slotProps.data.name }}</p>
                            <p class="slide-date">{{ formatDate(slotProps.data.updated_at) }}</p>
                        </div>
                        <div class="slide-item" draggable="true" @dragstart="onDragStart($event, slotProps.data)"
                            @dragend="onDragEnd($event)">
                            <SlideView :preview="false" :slide="slotProps.data"
                                :sections="slotProps.data.sections ?? []" :showFrame="false"
                                style="pointer-events: none; width: 100%; height: 150px; overflow: hidden;"
                                :shadow="true" />
                        </div>
                    </template>
                </Column>

                <template #header>
                    <div style="display: flex; gap: 8px; width: 100%;">
                        <InputText class="search-input" v-model="filters.global.value"
                            :placeholder="$t('moderator.search')" type="text" />
                        <Button @click="filters.global.value = null" rounded :disabled="!filters.global.value">
                            <i class="pi pi-times"></i>
                        </Button>
                    </div>
                </template>
            </DataTable>

        </SplitterPanel>
        <!-- Current view -->
        <SplitterPanel :size="75" :minSize="15" class="sub-panel">
            <h2 class="dashboard_label">{{ $t('moderator.live_monitors') }}</h2>
            <Toolbar class="scene-toolbar">
                <template #start>
                    <div style="display: flex; flex-direction: row; gap: 0.5rem; align-items: center;">
                        <Message info size="small">
                            <span style="display: flex; align-items: center; gap: 0.25rem;">
                                <i class="material-symbols-outlined">desktop_windows</i>
                                {{ settings.number_of_screens }}
                            </span>
                        </Message>
                    </div>
                </template>
                <template #end>
                    <div style="display: flex; gap: 0.5rem;">
                        <Button icon="pi pi-trash" outlined :label="$t('moderator.clear')"
                            @click="liveSlidesOnMonitors.fill(null); updateMonitorStatesFromGriddedSlides(whatYouSeeOnMonitors); stopLiveSlides()" />
                    </div>
                </template>
            </Toolbar>

            <div class="monitor_container">
                <!-- For each slide in the scene, render a monitor item -->
                <div v-for="(slot, index) in whatYouSeeOnMonitors" :key="index" class="monitor-item inset-control"
                    @dragover.prevent @drop="onDrop($event, index)">

                    <!-- Monitor Info: Name, Index, and Clear Button -->
                    <div class="monitor-info">
                        <div class="monitor-label-container">
                            <h3 class="monitor-label">
                                <i class="material-symbols-outlined">desktop_windows</i>
                                {{ index + 1 }}
                            </h3>
                            <h3 class="assigned-slide-label" v-if="slot">{{ slot.name }}</h3>
                        </div>

                        <Button small rounded
                            @click="liveSlidesOnMonitors.splice(index, 1, null); updateOneMonitor(whatYouSeeOnMonitors[index], index + 1); if (!liveSlidesActive) { stopLiveSlides() }">
                            <template #icon>
                                <i class="material-symbols-outlined">close</i>
                            </template>
                        </Button>
                    </div>

                    <!-- If Slide assigned to Monitor show SlideView component, else show monitor symbol -->
                    <div v-if="slot" style="width: 100%; height:90%; pointer-events: none">
                        <SlideView :preview="false" :slide="slot" :sections="slot.sections ? slot.sections : []"
                            :showFrame="false">
                        </SlideView>
                    </div>
                    <div v-else class="monitor-symbol">
                        <i class="pi pi-desktop"></i>
                    </div>

                </div>
            </div>
        </SplitterPanel>
    </Splitter>
</template>

<style scoped>
.slide-table :deep(.p-datatable tbody tr) {
    flex: 1;
    min-height: 0;
}

.dashboard {
    height: 100%;
}

.sub-panel {
    display: flex !important;
    flex-direction: column;
    height: 100%;
}

.scene-toolbar {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    flex-shrink: 0;
}

.slide_gallery_container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    overflow-y: auto !important;
    padding: 1rem;
    flex: 1;
    min-height: 0;
}

.slide-card {
    width: 100%;
    height: 200px;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
}

.slide-item {

    flex: 1;
    /* fill remaining height after slide-info */
    min-height: 0;
    /* allow shrinking */
    width: 100%;

    cursor: grab;
    transition: opacity 0.2s, outline 0.2s;
    width: 100%;

    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.slide-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.slide-label {
    font-weight: bold;
    font-size: var(--fs-medium);
    color: var(--p-primary-500);
}

.slide-date {
    font-size: var(--fs-small);
    color: var(--p-primary-500);
}

.slide-item.is-dragging {
    opacity: 0.5;
    cursor: grabbing;
    outline: 2px dashed var(--p-primary-400);
    border-radius: var(--br-medium);
}

.monitor_container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    padding: 1rem;
    flex: 1;
    min-height: 0;
    align-content: start;
    overflow: hidden;
}

.monitor-item {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 200px;
    position: relative;
    overflow: hidden;
}

.monitor-info {
    position: absolute;
    bottom: 0;
    z-index: 10;
    width: 100%;
    background-color: var(--p-primary-500);

    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0.5rem;

}

.monitor-label-container {
    display: flex;
    flex-direction: row;
    gap: 1.0rem;
    align-items: center;
}

.monitor-label {
    font-size: var(--fs-small);
    color: var(--p-primary-50);
    margin-bottom: 0;
    padding: 0;
    text-transform: uppercase;
}

.assigned-slide-label {
    font-weight: normal;
    font-size: var(--fs-small);
    color: var(--p-primary-50);
    margin-bottom: 0;
    padding: 0;
}

.monitor-symbol {
    color: var(--p-primary-300);
    margin: 0px;
    padding: 0px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.slide_gallery_container :deep(> div) {
    width: 100%;
}

.search-input {
    flex: 1;
    width: 100%;
    padding: 0.5rem;
    border-radius: var(--br-medium);
    border: 1px solid var(--surface-border, #e2e8f0);
    background-color: var(--p-primary-50, #f8fafc);
}
</style>