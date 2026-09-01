<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import type { Scene } from "@/services/scene_service"
import SplitterPanel from 'primevue/splitterpanel';
import Splitter from 'primevue/splitter';
import Button from 'primevue/button';
import SceneView from '@/components/SceneView.vue';
import TagView from '@/components/TagView.vue';
import { FilterMatchMode } from '@primevue/core/api'
import { formatDate } from '@/utils/date_utils';
import { saveScene } from '@/services/scene_service'
import draggable from 'vuedraggable';

import { scenes, fetchScenes } from '@/globals/scenes';
import { presentations, fetchPresentations } from '@/globals/presentations';
import { updateScene, deleteScene, addTagToScene, removeTagFromScene } from "@/services/scene_service";
import { onMounted, ref, nextTick } from 'vue';
import '@/assets/main.css'
import { useI18n } from 'vue-i18n';
import { useConfirm } from "primevue/useconfirm";
import { updatePresentation, deletePresentation, savePresentation } from "@/services/presentation_service";
import type { Presentation } from "@/services/presentation_service"
import { startPresentation } from "@/services/live_presentation_service";

const { t } = useI18n();
const confirm = useConfirm();

const selectedScene = ref<Scene | null>(null);
const editingRows = ref<Scene[]>([]);

const selectedPresentation = ref<Presentation | null>(null);
const presentationName = ref<string>("");

const toast = useToast();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

interface SelectedScene {
    id: string;
    uniqueId: string;
    name: string;
    description: string;
}

const selectedOrder = ref<SelectedScene[]>([]);


function onRowEditSaveScene(event: any) {
    const { id, name } = event.newData
    if (name === event.data.name) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'New and old filenames are identical', life: 3000 });
    } else {
        updateScene(id, { name: name }).then(response => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Scene updated successfully', life: 3000 });
            scenes.value[event.index] = { ...response.data };
        }).catch(error => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update scene', life: 3000 });
            console.error("Error updating scene:", error)
        })
    }
}

function onRowClick(event: any) {
    const presentation = event.data;

    if (presentation) {
        selectedPresentation.value = presentation;

        if (presentation.scenes) {
            selectedOrder.value = presentation.scenes.map((scene: any) => ({
                id: String(scene.id ?? ''),
                name: scene.name,
                description: scene.description,
                uniqueId: typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `${scene.id}-init-${Math.random().toString(36).substring(2, 11)}`
            }));
        } else {
            selectedOrder.value = [];
        }
    }
}

function onRowEditSavePresentation(event: any) {
    const { id, name } = event.newData
    if (name === event.data.name) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'New and old filenames are identical', life: 3000 });
    } else {
        updatePresentation(id, { name: name }).then(response => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Presentation updated successfully', life: 3000 });
            presentations.value[event.index] = { ...response.data };
            fetchPresentations();
        }).catch(error => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update presentation', life: 3000 });
            console.error("Error updating presentation:", error)
        })
    }
}

const emit = defineEmits<{
    'edit-scene': [scene: Scene];
    'live': [];
}>();

function onEditScene(scene: Scene) {
    emit('edit-scene', { ...scene });
}

function onDeleteScene(scene: Scene) {
    if (scene.id) {
        deleteScene(scene.id).then(() => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Scene deleted successfully', life: 3000 });
            scenes.value = scenes.value.filter(s => s.id !== scene.id);
            if (selectedScene.value?.id === scene.id) {
                selectedScene.value = null;
            }
            fetchScenes();
        }).catch(error => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete scene', life: 3000 });
            console.error("Error deleting scene:", error);
        })
    }
    else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Scene ID is missing', life: 3000 });
        console.error("Error deleting scene: no valid scene.id");
    }
}

function onConfirmDeleteScene(scene: Scene) {
    confirm.require({
        header: t('moderator.confirmation'),
        message: t('moderator.confirmation-message-head') + t('moderator.scene') + " (" + scene.name + ")" + t('moderator.confirmation-message-tail'),
        acceptLabel: `${t('moderator.confirmation-ok')}`,
        rejectLabel: t('moderator.confirmation-cancel'),
        accept: async () => {
            await onDeleteScene(scene);
        }, reject: () => {
            // nothing to do    
        },
    });
}

function onDuplicateScene(scene: Scene) {
    if (scene.id) {

        const new_scene = {
            name: `${scene.name} (${t('moderator.copy')})`,
            description: scene.description,
            slides: scene.slides,
            tags: scene.tags
        };

        saveScene(new_scene).then(() => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Scene saved successfully', life: 3000 })
            fetchScenes();
        }).catch(error => {
            console.error("Error saving scene:", error);
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save scene', life: 3000 })
            fetchScenes();
        });
    } else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Scene ID is missing', life: 3000 });
        console.error("Error deleting scene: no valid scene.id");
    }
}

function onTagRemoved(removedTag: string) {
    if (selectedScene.value) {
        selectedScene.value.tags = selectedScene.value.tags.filter(tag => tag !== removedTag);
    }
}

function onTagAdded(addedTag: string) {
    if (selectedScene.value) {
        selectedScene.value.tags = [...selectedScene.value.tags, addedTag];
    }
}

const colLeftSize = ref(35);
const colRightSize = ref(65);
/*
const syncTopResize = (event) => {
    // event.sizes gibt dir die neuen Größen  
    if (event.sizes) {
        colLeftSize.value = event.sizes[0];
        colRightSize.value = event.sizes[1];
    }
};
const syncBottomResize = (event) => {
    if (event.sizes) {
        colLeftSize.value = event.sizes[0];
        colRightSize.value = event.sizes[1];
    }
};
*/

function onDeletePresentation(presentation: Presentation) {
    if (presentation.id) {
        deletePresentation(presentation.id).then(() => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Presentation deleted successfully', life: 3000 });
            presentations.value = presentations.value.filter(s => s.id !== presentation.id);
            if (selectedPresentation.value?.id === presentation.id) {
                selectedPresentation.value = null;
            }
            fetchPresentations();
        }).catch(error => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete presentation', life: 3000 });
            console.error("Error deleting presentation:", error);
        })
    }
    else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Presentation ID is missing', life: 3000 });
        console.error("Error deleting presentation: no valid presentation.id");
    }
}

function onDuplicatePresentation(presentation: Presentation) {
    if (presentation.id) {

        const new_presentation = {
            name: `${presentation.name} (${t('moderator.copy')})`,
            description: presentation.description,
            scenes: presentation.scenes
        };

        savePresentation(new_presentation).then(() => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Presentation saved successfully', life: 3000 })
            fetchPresentations();
        }).catch(error => {
            console.error("Error saving presentation:", error);
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save presentation', life: 3000 })
            fetchPresentations();
        });
    } else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Presentation ID is missing', life: 3000 });
        console.error("Error duplicating presentation: no valid presentation.id");
    }
}

// Handle saving the scene to the backend
function onAddPresentation() {

    const presenation_ = {
        name: presentationName.value || `${t('moderator.presentation.new_presentation')} ${presentations.value.length + 1}`,
        description: "",
        scenes: []
    };

    savePresentation(presenation_).then(_response => {
        toast.add({ severity: 'success', summary: 'Success', detail: 'Presentation created successfully', life: 3000 })
        fetchPresentations();
    }).catch(error => {
        console.error("Error saving presentation:", error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create presentation', life: 3000 })
    });
}

async function onPlayPresentation(presentation: Presentation) {
    console.log("presentation:", presentation);
    const presentationId = presentation.id;
    if (presentationId === undefined) {
        console.error("Error starting presentation: no valid presentation id");
        return;
    }

    startPresentation(presentationId)
    emit('live')
}

const onDragStart = (event: DragEvent, item: Scene) => {
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/json', JSON.stringify(item));
    }
};

const handleNativeDrop = async (event: DragEvent) => {
    if (!event.dataTransfer) return;

    const dataString = event.dataTransfer.getData('application/json');
    if (!dataString) return;

    try {
        const rawScene = JSON.parse(dataString);

        const deepClonedScene = structuredClone(rawScene);

        const newElement: SelectedScene = {
            ...deepClonedScene,
            uniqueId: crypto.randomUUID() // Garantiert eindeutige ID im Browser
        };

        await nextTick();
        selectedOrder.value.push(newElement);

    } catch (error) {
        console.error('Drop error:', error);
    }
};

const isSaving = ref(false);

const saveOrderToApi = async () => {
    if (selectedOrder.value.length === 0) return;

    isSaving.value = true;
    try {
        // 1. Payload für das Backend vorbereiten
        const scenePayload = selectedOrder.value.map((item, index) => ({
            scene_id: item.id,
            position: index + 1
        }));

        const response = await updatePresentation(selectedPresentation.value.id, {
            scenes: scenePayload as any
        });

        fetchPresentations();
        toast.add({ severity: 'success', summary: 'Success', detail: 'Scene order updated successfully', life: 3000 });

    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update scene order', life: 3000 })
        console.error("Error updating scene order:", error);
    } finally {
        isSaving.value = false;
    }
};

const removeItem = (index: number) => {
    selectedOrder.value.splice(index, 1);
};
</script>


<template>
    <div style="display: flex; flex-direction: column; height: 100vh;"> <!-- Obere Reihe -->
        <div style="height: 300px; flex: 1; display: flex; width: 100%;">
            <Splitter layout="horizontal" style="width: 100%; height: 100%">
                <SplitterPanel class="sub-panel" :size="colLeftSize">
                    <h2 class="dashboard_label">{{ $t('moderator.nav.scenes') }}</h2>
                    <DataTable :value="scenes" dataKey="id" editMode="row" scrollable scrollHeight="flex"
                        @row-edit-save="onRowEditSaveScene" responsiveLayout="scroll" class="my-table"
                        v-model:editingRows="editingRows" v-model:selection="selectedScene" selectionMode="single"
                        :globalFilterFields="['name', 'tags']" v-model:filters="filters">

                        <Column field="name" header="">
                            <template #editor="slotProps">
                                <InputText v-model="slotProps.data.name" />
                            </template>
                            <template #body="slotProps">
                                <div draggable="true" @dragstart="onDragStart($event, slotProps.data)">
                                    <span style="font-weight: 600;">{{ slotProps.data.name }}</span><br>
                                    <span style="font-size: 0.875rem; color: #64748b;">Updated
                                        {{ formatDate(slotProps.data.updated_at) }}</span>
                                </div>
                            </template>
                        </Column>

                        <Column style="width: 10rem" bodyClass="flex justify-content-end white-space-nowrap"
                            editorClass="flex justify-content-end white-space-nowrap">
                            <template #body="slotProps">
                                <Button size="small" rounded text icon="pi pi-code"
                                    @click="onEditScene(slotProps.data)" />
                                <Button size="small" rounded text icon="pi pi-clone"
                                    @click="onDuplicateScene(slotProps.data)" />
                                <Button size="small" rounded text icon="pi pi-pencil"
                                    @click="(e) => slotProps.editorInitCallback(e)" />
                                <Button size="small" rounded text icon="pi pi-trash"
                                    @click="onConfirmDeleteScene(slotProps.data)" />
                            </template>
                            <template #editor="slotProps">
                                <Button size="small" rounded text icon="pi pi-check"
                                    @click="(e) => slotProps.editorSaveCallback(e)" />
                                <Button size="small" rounded text icon="pi pi-times"
                                    @click="(e) => slotProps.editorCancelCallback(e)" />
                            </template>
                        </Column>

                        <template #header>
                            <InputText class="input-field" v-model="filters.global.value"
                                :placeholder="$t('moderator.search')" type="text" />
                            <Button class="button-reset-search" @click="filters.global.value = null" rounded
                                :disabled="!filters.global.value">
                                <i class="pi pi-times"></i>
                            </Button>
                        </template>

                    </DataTable>
                </SplitterPanel>
                <SplitterPanel class="sub-panel" :size="colRightSize">
                    <SceneView v-if="selectedScene" :preview="true" :key="selectedScene.id" :scene="selectedScene"
                        :showframe="false" class="scene-preview" />
                    <TagView v-if="selectedScene" :item="selectedScene ? selectedScene : null"
                        :onAddTagApi="addTagToScene" :onRemoveTagApi="removeTagFromScene" @tagRemoved="onTagRemoved"
                        @tagAdded="onTagAdded" />
                </SplitterPanel>
            </Splitter>
        </div>
        <!-- horizontal line -->
        <div style="height: 10px; background: #e5e5e5;"></div>
        <!-- Lower panel row -->
        <div style="height: 300px; flex: 1; display: flex; width: 100%;">
            <Splitter layout="horizontal" style="width: 100%; height: 100%">
                <SplitterPanel class="sub-panel" :size="colLeftSize">
                    <h2 class="dashboard_label">{{ $t('moderator.nav.presentations') }}</h2>
                    <DataTable :value="presentations" dataKey="id" editMode="row" scrollable scrollHeight="flex"
                        @row-edit-save="onRowEditSavePresentation" @row-click="onRowClick" responsiveLayout="scroll"
                        class="my-table" v-model:editingRows="editingRows" v-model:selection="selectedPresentation"
                        selectionMode="single">

                        <Column field="name" header="">
                            <template #editor="slotProps">
                                <InputText v-model="slotProps.data.name" />
                            </template>
                            <template #body="slotProps">
                                <span style="font-weight: 600;">{{ slotProps.data.name }}</span><br>
                                <span style="font-size: 0.875rem; color: #64748b;">Updated
                                    {{ formatDate(slotProps.data.updated_at) }}</span>
                            </template>
                        </Column>

                        <Column style="width: 12rem" bodyClass="flex justify-content-end white-space-nowrap"
                            editorClass="flex justify-content-end white-space-nowrap">
                            <template #body="slotProps">
                                <Button size="small" rounded text icon="pi pi-clone"
                                    @click="onDuplicatePresentation(slotProps.data)" />
                                <Button size="small" rounded text icon="pi pi-pencil"
                                    @click="(e) => slotProps.editorInitCallback(e)" />
                                <Button size="small" rounded text icon="pi pi-trash"
                                    @click="onDeletePresentation(slotProps.data)" />
                                <Button size="small" rounded text icon="pi pi-play-circle"
                                    @click="onPlayPresentation(slotProps.data)" />
                            </template>
                            <template #editor="slotProps">
                                <Button size="small" rounded text icon="pi pi-check"
                                    @click="(e) => slotProps.editorSaveCallback(e)" />
                                <Button size="small" rounded text icon="pi pi-times"
                                    @click="(e) => slotProps.editorCancelCallback(e)" />
                            </template>
                        </Column>

                        <template #header>
                            <InputText class="input-field" v-model="presentationName"
                                :placeholder="$t('moderator.presentation.new_presentation')" type="text" />
                            <Button :label="$t('moderator.presentation.create')" icon="pi pi-save"
                                @click="onAddPresentation" />
                        </template>
                    </DataTable>
                </SplitterPanel>
                <SplitterPanel :size="colRightSize">
                    <div v-if="selectedPresentation" style="overflow: auto; height: 100%;">
                        <div class="target-panel" @dragover.prevent @drop="handleNativeDrop">
                            <div class="header-container">
                                <h3>{{ t('moderator.order') }}</h3>
                                <Button class="button-add-presentation" :label="$t('moderator.save_order')"
                                    icon="pi pi-save" @click="saveOrderToApi" />
                            </div>

                            <draggable v-model="selectedOrder" group="elements" item-key="uniqueId" class="drop-zone"
                                ghost-class="ghost-item" handle=".drag-handle-target" tag="div">
                                <template #item="{ element, index }">
                                    <div class="ordered-item" :key="element.uniqueId">
                                        <div class="item-meta">
                                            <span class="badge-index">#{{ index + 1 }}</span>
                                            <span class="item-name">{{ element.name }}</span>
                                        </div>
                                        <div class="item-actions">

                                            <i class="pi pi-sort-alt drag-handle-target"></i>
                                            <Button icon="pi pi-trash" severity="danger" text rounded size="small"
                                                @click="removeItem(index)" />
                                        </div>
                                    </div>
                                </template>

                                <template #footer>
                                    <div v-if="selectedOrder.length === 0" class="empty-placeholder">
                                        <i class="pi pi-plus-circle" style="font-size: 2rem;"></i>
                                        <p>{{ t('moderator.order_instruction') }}</p>
                                    </div>
                                </template>
                            </draggable>
                        </div>
                    </div>
                    <div v-else>
                    </div>
                </SplitterPanel>
            </Splitter>
        </div>
    </div>


</template>

<style scoped>
.scene-preview {
    flex: 1;
    min-height: 0;
    width: 100%;
}

.my-table {
    flex: 1;
    min-height: 0;
}

.preview-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-color-secondary, #64748b);
    flex-shrink: 0;
}

.input-field {
    flex: 1;
    width: 100%;
    padding: 0.5rem;
    border-radius: var(--br-medium);
    border: 1px solid var(--surface-border, #e2e8f0);
    background-color: var(--p-primary-50, #f8fafc);
}

:deep(.p-datatable-header) {
    padding: 0.5em 0em;
    display: flex;
    gap: 0.5rem;
}


:deep(.p-datatable-thead) {
    display: none;
}

:deep(.p-datatable-row-selected) {
    background: var(--p-primary-50);
    color: var(--p-primary-900);
    box-shadow: inset 3px 0 0 var(--p-primary-400);
    font-weight: 500;
}

.drop-zone * {

    pointer-events: none;
}

/* Erlaubt Interaktionen wieder für Buttons und Handles, wenn nicht gedraggt wird */
.drop-zone .item-actions Button,
.drop-zone .drag-handle-target {
    pointer-events: auto;
}

/* Sorgt dafür, dass die Drop-Zone groß genug ist, auch wenn sie leer ist */
.drop-zone {
    display: flex;
    flex-direction: column;
    min-height: 200px;
    height: 95%;
    gap: 0.5rem;
}

.builder-container {
    display: flex;
    gap: 2rem;
    width: 100%;
    align-items: flex-start;
}

.source-panel,
.target-panel {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    min-height: 400px;
}

/* Rechter Bereich: Die Drop-Zone */
.drop-zone {
    min-height: 300px;
    border: 2px dashed #cbd5e1;
    border-radius: 6px;
    padding: 1rem;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 1rem;
}

.header-container h3 {
    margin: 0;
}

/* Einzelnes gezogenes Element */
.ordered-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    cursor: grab;
}

.ordered-item:active {
    cursor: grabbing;
}

.item-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.badge-index {
    background: #cbd5e1;
    color: #334155;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: bold;
}

.item-name {
    font-weight: 600;
}

.item-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.drag-handle-target {
    color: #94a3b8;
    cursor: grab;
}

/* CSS für das Element während des Ziehens */
.ghost-item {
    opacity: 0.4;
    background: #e2e8f0;
    border: 2px dashed #94a3b8;
}

/* Einfacher Trigger-Bereich für die linke Tabellenseite */
.draggable-table-row-trigger {
    padding: 0.5rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    margin-bottom: 0.25rem;
    border-radius: 4px;
    cursor: grab;
}

.empty-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    height: 200px;
    text-align: center;
}

.control-item {
    flex: 1 1 0%;
    max-width: 160px;
    /* Alle 3 werden maximal so breit */
    min-width: max-content;
    /* Richtet sich nach dem breitesten Inhalt (z.B. langer Buttontext) */
    white-space: nowrap;
}

/* Spezifisch für die Navigations-Buttons */
.nav-button {
    justify-content: center;
    /* Zentriert Text und Icon im Button */
}
</style>