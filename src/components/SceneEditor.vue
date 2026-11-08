<script setup lang="ts">
// Vue-stuff
import { ref, onMounted, computed } from 'vue';
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast'
import ButtonGroup from 'primevue/buttongroup';
import FloatLabel from 'primevue/floatlabel';
import { useI18n } from 'vue-i18n';
import { useConfirm } from "primevue/useconfirm";
import { dialogService } from '@/services/dialog_service';
// globals and services
import type { Slide } from '@/services/slide_service'
import type { Scene } from '@/services/scene_service';
import { scenes, fetchScenes } from '@/globals/scenes';
import { settings } from '@/globals/settings'
import { saveScene, updateScene } from '@/services/scene_service';
import '@/assets/main.css'
import { useItemUpdate } from '@/generics/updateItem'
// components
import SlideView from '@/components/SlideView.vue';
import SlideGallery from '@/components/SlideGallery.vue';


const { t } = useI18n();
const confirm = useConfirm();
const nameEditing = ref(false);
const { onConfirmedUpdateItem } = useItemUpdate();

// Define Input Proerties
const props = defineProps({
    inp_scene: {
        type: Object as () => Scene | null,
        required: false,
        default: null
    },
    name_edit_enabled: {
        type: Boolean,
        default: true
    }
})

const isSavedScene = computed(() => !!props.inp_scene?.id)

const nameTaken = computed(() => {
    const name = scenename.value.trim()
    if (!name) return false
    return scenes.value.some(s => s.name === name && s.id !== props.inp_scene?.id)
})

function cancelRename() {
    nameEditing.value = false
    scenename.value = props.inp_scene?.name ?? ''
}

function onRenameScene() {
    const id = props.inp_scene?.id
    const name = scenename.value.trim()
    nameEditing.value = false
    if (!id || !name || name === props.inp_scene?.name) return

    updateScene(id, { name }).then(() => {
        toast.add({ severity: 'success', summary: 'Success', detail: 'Scene renamed successfully', life: 3000 })
        fetchScenes()
    }).catch(() => {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to rename scene', life: 3000 })
        scenename.value = props.inp_scene?.name ?? ''
    })
}


var scene = ref<(Slide | null)[]>([]);
const scenename = ref<string>("");
const selectedSlide = ref<Slide | null>(null);

// Import the toast notification composable from PrimeVue for displaying success/error messages
const toast = useToast()


// on mount get all slides from backend and store in slides ref
onMounted(() => {

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

const handleDragStart = (item) => {
    // Track if needed, but actual drag setup happens in child
};

function onDrop(event: DragEvent, index: number) {
    const slideData = event.dataTransfer?.getData('slide');
    if (!slideData) return;

    const slide: Slide = JSON.parse(slideData);
    scene.value[index] = slide;
}

async function confirmUpdateScene(id: number) {
    const validSlidesWithPositions = scene.value.map((s, index) => s ? { ...s, position: index + 1 } : null)
        .filter((s): s is (Slide & { position: number }) => s !== null);

    const scene_ = {
        id: id,
        name: scenename.value,
        description: "",
        tags: [],
        slides: validSlidesWithPositions
    };

    const updated = await onConfirmedUpdateItem("scene", updateScene, scene_)

    if (updated) {
        // ? fetch scenes should not be neccessary? Or? With multiple moderator clients?
    }
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
        fetchScenes()
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
    if (isSavedScene.value) {
        confirmUpdateScene(props.inp_scene!.id!)
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

const onSendSlideToMultipleMonitors = async (slide: Slide) => {
    const options = Array.from({ length: settings.value.number_of_screens }, (_, i) => i).map(m => ({ id: m, label: `${t('monitor.name')} ${m + 1}` }))
    const selected = await dialogService.openOptionDialog(options, `${t('select_monitors')}`);

    if (selected) {
        for (const monitor of selected) {
            scene.value[monitor.id] = slide;
        }
    }
}
</script>

<template>

    <div class="scene-builder">
        <div class="dashboard-header">

            <FloatLabel variant="on" style="width: 400px;">
                <InputText id="scenename_input" v-model="scenename" :placeholder="$t('moderator.enter_scene_name')"
                    :disabled="isSavedScene && !nameEditing" :invalid="nameTaken" fluid />
                <label v-if="nameTaken" for="scenename_input">Scene name already exists</label>
            </FloatLabel>
            <!-- <InputText v-model="scenename" :placeholder="$t('moderator.enter_scene_name')" :disabled="!props.name_edit_enabled" /> -->

            <Transition name="fade" mode="out-in">
                <div v-if="!nameEditing" key="view">
                    <Button v-if="isSavedScene" outlined size="small" label="Rename" @click="nameEditing = true">
                        <template #icon><i class="material-symbols-outlined">edit</i></template>
                    </Button>
                </div>
                <div v-else key="edit">
                    <ButtonGroup>
                        <Button text @click="onRenameScene" :disabled="!scenename.trim() || nameTaken">
                            <template #icon><i class="material-symbols-outlined">check</i></template>
                        </Button>
                        <Button text @click="cancelRename">
                            <template #icon><i class="material-symbols-outlined">close</i></template>
                        </Button>
                    </ButtonGroup>
                </div>
            </Transition>

            <Button :label="$t('moderator.save')" icon="pi pi-save" @click="onSaveScene"
                :disabled="!scenename.trim() || nameEditing || nameTaken" />

            <Button icon="pi pi-trash" outlined :label="$t('moderator.clear')" @click="scene.fill(null)" />

            <div class="dashboard-header-messages">

                <Message info size="small">
                    <template #icon>
                        <i style="font-size: var(--fs-medium)" class="material-symbols-outlined">desktop_windows</i>
                    </template>
                    <template #default>
                        {{ settings.number_of_screens }}
                    </template>
                </Message>

                <Message v-if="duplicates()" severity="warn" size="small">
                    {{ $t('moderator.duplicate_slides') }}
                </Message>
                <Message severity="warn" v-if="emptyScreens()" size="small">
                    {{ emptyScreens() === 1 ? $t('moderator.empty_screen') : $t('moderator.empty_screens')
                    }}
                </Message>
            </div>

        </div>

        <Splitter :gutter-size="2" class="dashboard">
            <!-- Available Slides -->
            <SplitterPanel :size="25" class="sub-panel">
                <SlideGallery style="height: 100%;" v-model:selectedSlide="selectedSlide"
                    @slide-drag-start="handleDragStart" />
            </SplitterPanel>
            <!-- Scene Builder -->
            <SplitterPanel :size="75" :minSize="15" class="sub-panel">

                <div class="scenebuilder-header">
                    <h2 class="dashboard_label">{{ $t('moderator.scene') }}</h2>
                    <Button :disabled="selectedSlide == null" size="small"
                        :label="$t('moderator.send_to_multiple_monitors')"
                        @click="onSendSlideToMultipleMonitors(selectedSlide)">
                        <template #icon>
                            <i class="material-symbols-outlined">queue_play_next</i>
                        </template>

                    </Button>
                </div>

                <div class="monitor_container">

                    <!-- For each slide in the scene, render a monitor item -->
                    <div v-for="(slot, index) in scene" :key="index" class="monitor-item inset-control"
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
                            <Button size="small" text round @click="scene[index] = null">
                                <template #icon>
                                    <i class="material-symbols-outlined">close</i>
                                </template>
                            </Button>
                        </div>

                        <!-- If Slide assigned to Monitor show SlideView component, else show monitor symbol -->
                        <div v-if="slot" class="monitor-preview">
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
    </div>


</template>

<style scoped>
.scene-builder {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.scenebuilder-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
}

.dashboard-header .p-floatlabel {
    width: 30%;
}

.dashboard-header .p-inputtext {
    width: 100%;
}

.dashboard-header .p-floatlabel label {
    color: var(--p-floatlabel-invalid-color) !important;
}

.dashboard-header-messages {
    display: flex;
    flex-direction: row;
    gap: var(--space-small);
    align-items: center;
    margin-left: auto;
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

.monitor-preview {
    width: 100%;
    height: 90%;
    pointer-events: none;
}

.monitor-info {
    background-color: var(--surface);
    position: absolute;
    left: var(--space-small);
    right: var(--space-small);
    bottom: var(--space-small);
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: fit-content;
    border-radius: var(--br-small);
    width: auto;
    box-shadow: var(--shadow-light);
    border: 1px solid var(--p-surface-100);
}

.monitor-label-container {
    display: flex;
    flex-direction: row;
    gap: 1.0rem;
    align-items: center;
}

.monitor-label {
    font-size: var(--fs-medium);
    font-weight: bold;
    color: var(--p-primary-50);
    margin-bottom: 0;
    padding: 0;
    text-transform: uppercase;
}

.assigned-slide-label {
    font-weight: normal;
    font-size: var(--fs-medium);
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