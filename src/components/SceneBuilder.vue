<script setup lang="ts">
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import type { Slide } from '@/services/slide_service'
import '@/assets/main.css'
import SlideView from '@/components/SlideView.vue';
import InputText from 'primevue/inputtext';
import { ref, onMounted } from 'vue';
import { getSlides } from "@/services/slide_service";
import draggable from 'vuedraggable';
import { formatDate } from '@/utils/date_utils';
import { saveScene } from '@/services/scene_service';

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
            <h2 class="dashboard_label">Available Monitors</h2>
            <Toolbar class="scene-toolbar">
                <template #start>
                    <InputText v-model="scenename" placeholder="Enter scene name..." />
                </template>
                <template #end>
                    <div style="display: flex; gap: 0.5rem;">
                        <Button label="" icon="pi pi-times" outlined rounded
                            @click="scene = [null, null, null, null]" />
                        <Button label="Save" icon="pi pi-save" @click="onSaveScene" :disabled="scenename === ''" />
                    </div>
                </template>
            </Toolbar>

            <div class="monitor_container">
                <div v-for="(slot, index) in scene" :key="index" class="monitor-item monitor-preview"
                    @dragover.prevent @drop="onDrop($event, index)">
                    <SlideView v-if="slot" :boxed="false" :content="slot" />
                    <div v-else class="monitor-symbol">
                        <i class="pi pi-desktop"></i>
                        <h3 class="monitor-label">Monitor {{ index + 1 }}</h3>
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
    color: var(--p-primary-700);
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

.monitor-label {
    font-size: 0.8rem;
    color: var(--p-primary-300);
    margin-bottom: 0;
    padding: 0;
    text-transform: uppercase;
}
</style>