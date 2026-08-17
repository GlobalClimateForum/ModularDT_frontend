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
import { ref, onMounted, watch } from 'vue';
import { getSlides } from "@/services/slide_service";
import { formatDate } from '@/utils/date_utils';
import { saveScene, updateScene } from '@/services/scene_service';
import { settings } from '@/globals/settings'
import { useToast } from 'primevue/usetoast'
import type { Scene } from '@/services/scene_service';
import { scenes } from '@/globals/scenes';
//import type { Scene } from 'vega'
import { useI18n } from 'vue-i18n';
import { useConfirm } from "primevue/useconfirm";

const { t } = useI18n();
const confirm = useConfirm();

// Define Input Proerties
const props = defineProps({
    inp_scene: {
        type: Object as () => Scene | null,
        required: false,
        default: null
    }
})

const slides = ref<Slide[]>([]);
var scene = ref<(Slide | null)[]>([]);
const scenename = ref<string>("");

// Import the toast notification composable from PrimeVue for displaying success/error messages
const toast = useToast()

// on mount get all slides from backend and store in slides ref
onMounted(() => {
    getSlides().then(response => {
        slides.value = response.data;
        console.log("Fetched slides:", slides.value);
    }).catch(error => {
        console.error("Error fetching slides:", error);
    });

    if (props.inp_scene && props.inp_scene.slides) {
        const grid = Array(settings.value.number_of_screens).fill(null)

        props.inp_scene?.slides.forEach(slide => {
            if (slide && slide.position && slide.position <= settings.value.number_of_screens) {
                grid[slide.position - 1] = slide
            }
        })
        scene.value = grid;
    } else {
        scene.value = Array(settings.value.number_of_screens).fill(null);
    }

    if (props.inp_scene) {
        scenename.value = props.inp_scene.name
    }
});

watch(
    () => settings.value.number_of_screens,
    (newCount) => {
        const currentCount = scene.value.length

        if (newCount > currentCount) {
            const extraSlots = Array(newCount - currentCount).fill(null)
            scene.value.push(...extraSlots)
        } else if (newCount < currentCount) {
            scene.value.splice(newCount)
        }
    },
    { immediate: true }
)
'*'

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

    const slide: Slide = JSON.parse(slideData);
    scene.value[index] = slide;
}

function confirmedUpdateScene(id: number) {

    const validSlidesWithPositions = scene.value.map((s, index) => s ? { ...s, position: index + 1 } : null)
        .filter((s): s is (Slide & { position: number }) => s !== null);

    const scene_ = {
        name: scenename.value,
        description: "",
        tags: [],
        slides: validSlidesWithPositions
    };

    updateScene(id, scene_).then(_response => {
        toast.add({ severity: 'success', summary: 'Success', detail: 'Scene updated successfully', life: 3000 })
    }).catch(error => {
        console.error("Error saving scene:", error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update scene', life: 3000 })
    });
}

function confirmUpdateScene(id: number) {
    confirm.require({
        header: t('moderator.confirmation'),
        message: t('moderator.update-scene-confirmation-message-head') + " " + scenename.value + " " + t('moderator.update-slide-confirmation-message-tail'),
        acceptLabel: `${t('moderator.confirmation-ok')}`,
        rejectLabel: t('moderator.confirmation-cancel'),
        accept: async () => {
            await confirmedUpdateScene(id);
        }, reject: () => {
            // nothing to do    
        },
    });
}

function storeScene() {

    const validSlidesWithPositions = scene.value.map((s, index) => s ? { ...s, position: index + 1 } : null)
        .filter((s): s is (Slide & { position: number }) => s !== null);

    const scene_ = {
        name: scenename.value,
        description: "",
        tags: [],
        slides: validSlidesWithPositions
    };

    saveScene(scene_).then(_response => {
        toast.add({ severity: 'success', summary: 'Success', detail: 'Slide saved successfully', life: 3000 })
    }).catch(error => {
        console.error("Error saving scene:", error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save slide', life: 3000 })
    });
}

// Handle saving the scene to the backend
function onSaveScene() {
    if (!scenename.value.trim()) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'Scene name cannot be empty', life: 3000 })
        return
    }

    const exisitng_scene = scenes.value.find((s) => s.name === scenename.value);
    if (exisitng_scene) {
        confirmUpdateScene(exisitng_scene?.id  ?? -1)
    } else {
        storeScene()
    }
}

// Check if there are slides assinged to multiple monitors (duplicates)
function duplicates() {
    const slideIds = scene.value
        .map(s => s?.id)
        .filter(id => id != null);
    return new Set(slideIds).size !== slideIds.length;
}

// Check if there are empty monitors (null slots) in the scene
function emptyScreens() {
    return scene.value.filter(s => s === null).length;
}

</script>

<template>
    <Splitter :gutter-size="2" class="dashboard">

        <!-- Available Slides -->
        <SplitterPanel :size="25" class="sub-panel">
            <h2 class="dashboard_label">{{ $t('moderator.available_slides') }}</h2>
            <div class="slide_gallery_container">
                <div v-for="slide in slides" :key="slide.id" class="slide-card">
                    <div class="slide-info">
                        <p class="slide-label">{{ slide.name }}</p>
                        <p class="slide-date">{{ formatDate(slide.created_at  ?? '') }}</p>
                    </div>
                    <div class="slide-item" draggable="true" @dragstart="onDragStart($event, slide)"
                        @dragend="onDragEnd($event)">
                        <SlideView :preview="false" :slide="slide" :sections="slide.sections ?? []" :showFrame="false"
                            style="pointer-events: none;" :shadow="true" />
                    </div>
                </div>
            </div>
        </SplitterPanel>
        <!-- Scene Builder -->
        <SplitterPanel :size="75" :minSize="15" class="sub-panel">
            <h2 class="dashboard_label">{{ $t('moderator.scene') }}</h2>
            <Toolbar class="scene-toolbar">
                <template #start>
                    <div style="display: flex; flex-direction: row; gap: 0.5rem; align-items: center;">
                        <Message info size="small">
                            <span style="display: flex; align-items: center; gap: 0.25rem;">
                                <i class="material-symbols-outlined">desktop_windows</i>
                                {{ settings.number_of_screens }}
                            </span>
                        </Message>
                        <Message v-if="duplicates()" severity="warn" size="small">
                            {{ $t('moderator.duplicate_slides') }}
                        </Message>
                        <Message severity="warn" v-if="emptyScreens()" size="small">
                            {{ emptyScreens() === 1 ? $t('moderator.empty_screen') : $t('moderator.empty_screens') }}
                        </Message>
                    </div>
                </template>
                <template #end>
                    <div style="display: flex; gap: 0.5rem;">
                        <InputText v-model="scenename" :placeholder="$t('moderator.enter_scene_name')" />
                        <Button :label="$t('moderator.save')" icon="pi pi-save" @click="onSaveScene"
                            :disabled="scenename === ''" />
                        <Button icon="pi pi-trash" outlined :label="$t('moderator.clear')" @click="scene.fill(null)" />
                    </div>
                </template>
            </Toolbar>

            <div class="monitor_container">

                <!-- For each slide in the scene, render a monitor item -->
                <div v-for="(slot, index) in scene" :key="index" class="monitor-item inset-control" @dragover.prevent
                    @drop="onDrop($event, index)">

                    <!-- Monitor Info: Name, Index, and Clear Button -->
                    <div class="monitor-info">
                        <div class="monitor-label-container">
                            <h3 class="monitor-label">
                                <i class="material-symbols-outlined">desktop_windows</i>
                                {{ index + 1 }}
                            </h3>
                            <h3 class="assigned-slide-label" v-if="slot">{{ slot.name }}</h3>
                        </div>
                        <Button small rounded @click="scene[index] = null">
                            <template #icon>
                                <i class="material-symbols-outlined">close</i>
                            </template>
                        </Button>
                    </div>

                    <!-- If Slide assigned to Monitor show SlideView component, else show monitor symbol -->
                    <div v-if="slot" style="width: 100%; height:90%;">
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
</style>