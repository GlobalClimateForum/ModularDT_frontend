<script setup lang="ts">
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import type { Slide } from '@/services/slide_service'
import '@/assets/main.css'
import SlideView from '@/components/SlideView.vue';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import '@/assets/main.css'
import { ref, onMounted } from 'vue';
import { getSlides } from "@/services/slide_service";
import draggable from 'vuedraggable';
import { formatDate } from '@/utils/date_utils';
import { saveScene } from '@/services/scene_service';
import { getViewConfigContinuousSize } from 'vega-lite/types_unstable/config.js'

const slides = ref<Slide[]>([]);
const scene = ref<(Slide | null)[]>([null, null, null, null]);
const scenename = ref<string>("");

onMounted(() => {
    getSlides().then(response => {
        slides.value = response.data;
    }).catch(error => {
        console.error("Error fetching slides:", error);
    });
});

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

    const slide: Slide = JSON.parse(slideData);
    scene.value[index] = slide;
}

function onSaveScene() {
    if (!scenename.value.trim()) {
        alert("Please enter a scene name before saving.");
        return;
    }

    const scene_ = {
        name: scenename.value,
        slides: scene.value.map(s => s?.id ?? null)
    };

    saveScene(scene_).then(response => {
        console.log("Scene saved successfully:", response.data);
    }).catch(error => {
        console.error("Error saving scene:", error);
    });
}

function duplicates() {
    const slideIds = scene.value
        .map(s => s?.id)
        .filter(id => id != null);
    return new Set(slideIds).size !== slideIds.length;
}

function emptyScreens() {
    return scene.value.filter(s => s === null).length;
}

</script>

<template>
    <Splitter :gutter-size="2" class="dashboard">
        <SplitterPanel :size="30" class="sub-panel">
            <h2 class="dashboard_label">Available Slides</h2>

            <draggable v-model="slides" class="slide_gallery_container slide-container" :sort="false">
                <template #item="{ element: slide }">
                    <div class="slide-item" draggable="true" @dragstart="onDragStart($event, slide)"
                        @dragend="onDragEnd($event)">
                        <div class="slide-info">
                            <p class="slide-label">{{ slide.name }}</p>
                            <p class="slide-date">{{ formatDate(slide.created_at) }}</p>
                        </div>
                        <SlideView :boxed="false" :content="slide" />
                    </div>
                </template>
            </draggable>
        </SplitterPanel>

        <SplitterPanel :size="70" :minSize="15" class="sub-panel">
            <h2 class="dashboard_label">Scene</h2>
            <Toolbar class="scene-toolbar">
                <template #start>
                    <div style="display: flex; flex-direction: row; gap: 0.5rem; align-items: center;">
                        <Message info size="small">
                            <span style="display: flex; align-items: center; gap: 0.25rem;">
                                <i class="material-symbols-outlined">desktop_windows</i>
                                {{ scene.length }}
                            </span>
                        </Message>
                        <Message v-if="duplicates()" severity="warn" size="small">
                            duplicate slides
                        </Message>
                        <Message severity="warn" v-if="emptyScreens()" size="small">
                            empty {{ emptyScreens() === 1 ? 'screen' : 'screens' }}
                        </Message>
                    </div>
                </template>
                <template #end>
                    <div style="display: flex; gap: 0.5rem;">
                        <InputText v-model="scenename" placeholder="Enter scene name..." />
                        <Button label="Save" icon="pi pi-save" @click="onSaveScene" :disabled="scenename === ''" />
                        <Button icon="pi pi-trash" outlined label="Clear" @click="scene = [null, null, null, null]" />
                    </div>
                </template>
            </Toolbar>

            <div class="monitor_container">
                <div v-for="(slot, index) in scene" :key="index" class="monitor-item monitor-preview" @dragover.prevent
                    @drop="onDrop($event, index)">
                    <div class="monitor-info">
                        <div class="monitor-label-container">
                            <h3 class="monitor-label"><i class="material-symbols-outlined">desktop_windows</i>{{ index +
                                1 }}
                            </h3>
                            <h3 class="assigned-slide-label" v-if="slot">{{ slot.name }}</h3>
                        </div>
                        <Button icon="pi pi-times" small rounded @click="scene[index] = null" />
                    </div>
                    <SlideView v-if="slot" :boxed="false" :content="slot" />
                    <div v-else class="monitor-symbol">
                        <i class="pi pi-desktop"></i>
                    </div>
                </div>
            </div>
        </SplitterPanel>
    </Splitter>
</template>

<style scoped>
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
    gap: 1rem;
    overflow-y: auto !important;
    padding: 1rem;
    flex: 1;
    min-height: 0;
}

.slide-item {
    cursor: grab;
    transition: opacity 0.2s, outline 0.2s;
    width: 100%;
}

.slide-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.slide-label {
    font-weight: bold;
    font-size: var(--fs-small);
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
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    align-content: start;
}

.monitor-item {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 200px;
    position: relative;
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
</style>