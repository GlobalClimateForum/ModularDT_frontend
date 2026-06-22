<script setup lang="ts">
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import type { Slide } from '@/services/slide_service'
import '@/assets/main.css'
import SlideView from '@/components/SlideView.vue';
import { ref, onMounted } from 'vue';
import { getSlides } from "@/services/slide_service";
import draggable from 'vuedraggable';

const slides = ref<Slide[]>([]);
const scene = ref<(Slide | null)[]>([null, null, null, null]);

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
</script>

<template>
    <Splitter :gutter-size="2" class="dashboard">
        <SplitterPanel :size="50" class="sub-panel">
            <div>
                <h2 class="dashboard_label">Available Slides</h2>
                <div>
                    <draggable v-model="slides" class="slide_gallery_container slide-container" :sort="false">
                        <template #item="{ element: slide }">
                            <div class="slide-item" draggable="true" @dragstart="onDragStart($event, slide)"
                                @dragend="onDragEnd($event)">
                                <SlideView :boxed="false" :content="slide" />
                            </div>
                        </template>
                    </draggable>
                </div>
            </div>

            <div>
                <h2 class="dashboard_label">Available Monitors</h2>
                <Toolbar class="scene-toolbar">
                    <template #start>
                        <Button label="" icon="pi pi-save" rounded />
                    </template>
                </Toolbar>

                <div>
                    <div class="monitor_container">
                        <div v-for="(slot, index) in scene" :key="index" class="monitor-item monitor-preview"
                            @dragover.prevent @drop="onDrop($event, index)">
                            <SlideView v-if="slot" :boxed="false" :content="slot" />
                            <div v-else class="monitor-symbol">
                                <i class="pi pi-desktop"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SplitterPanel>
    </Splitter>
</template>

<style scoped>
.scene-toolbar {
    margin-bottom: 1rem;
    padding: 0.5rem;
}

.slide_gallery_container {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    overflow-x: auto;
    padding: 0.5rem;
    justify-content: flex-start;
    align-items: center;
}

.slide-item {
    cursor: grab;
    flex: 0 0 auto;
    margin: 0;
    transition: opacity 0.2s, outline 0.2s;
}

.slide-item.is-dragging {
    opacity: 0.5;
    cursor: grabbing;
    outline: 2px dashed var(--p-primary-400);
    border-radius: var(--br-medium);
}

.monitor-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;

    min-width: 200px;
    aspect-ratio: 16 / 9;
}

.monitor-symbol {
    font-size: 5rem;
    color: var(--p-primary-200);
}

.monitor_container {
    display: flex;
    flex-direction: row;
    gap: 1rem;
    width: 100%;
    overflow-x: scroll;
}
</style>