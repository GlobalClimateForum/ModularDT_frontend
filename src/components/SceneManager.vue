<script setup lang="ts">
// Vue-stuff
import { ref, toRaw } from 'vue';
import { useI18n } from 'vue-i18n';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import type { Scene } from "@/services/scene_service"
import SplitterPanel from 'primevue/splitterpanel';
import Splitter from 'primevue/splitter';
import Button from 'primevue/button';
import { formatDate } from '@/utils/date_utils';
// globals and services
import { scenes, selectedSceneInSceneManager } from '@/globals/scenes';
import { updateScene, deleteScene } from "@/services/scene_service";
import { addTagToScene, removeTagFromScene } from "@/services/tag_service";
import GenericSearch from '@/components/GenericSearch.vue';
import { useItemDeletion } from '@/generics/deleteItem'
import { sendModeratorMessage } from '@/services/moderator_service'
import { existingTags, collectAllExistingTags, selectedTagsInSceneManager } from '@/globals/tags';
import { filtersSceneManager, filterLogicSceneManager, useFilteredScenes } from "@/globals/filters"
import '@/assets/main.css'
// components
import SceneView from '@/components/SceneView.vue';
import TagView from '@/components/TagView.vue';


const { onConfirmDeleteItem } = useItemDeletion();
const { t } = useI18n();

const filteredScenes = useFilteredScenes(filtersSceneManager, selectedTagsInSceneManager, filterLogicSceneManager)
const editingRows = ref<Scene[]>([]);

const toast = useToast();

const colLeftSize = ref(35);
const colRightSize = ref(65);

const emit = defineEmits<{
    'edit-scene': [scene: Scene];
}>();

function onRowEditSaveScene(event: any) {
    const { id, name } = event.newData
    if (name.trim() === event.data.name) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: t('moderator.names_are_identical'), life: 4000 });
    } else if (name.trim() === "") {
        toast.add({ severity: 'error', summary: 'Error', detail: t('moderator.name_is_empty'), life: 4000 });
    } else if (scenes.value.some(s => s.name === name.trim())) {
        toast.add({ severity: 'error', summary: 'Error', detail: t('moderator.scene') + t('moderator.name_already_exists'), life: 4000 });
    } else {
        updateScene(id, { name: name }).then(() => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Scene updated successfully', life: 3000 });
            sendModeratorMessage({
                event_type: "update",
                command: "update_scene",
                sceneid: id
            })
        }).catch(error => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update scene', life: 3000 });
            console.error("Error updating scene:", error)
        })
    }
}

function onEditScene(scene: Scene) {
    emit('edit-scene', { ...scene });
}

async function onConfirmDeleteScene(scene: Scene) {
    const deleted = await onConfirmDeleteItem("scene", deleteScene, scene)

    if (deleted) {
        sendModeratorMessage({
            event_type: "delete",
            command: "delete_scene",
            sceneid: scene.id
        })
        if (selectedSceneInSceneManager.value?.id === scene.id) {
            selectedSceneInSceneManager.value = null;
        }
    }
}

function onDuplicateEditScene(scene: Scene) {
    if (scene.id) {
        const new_scene = structuredClone(toRaw(scene))
        new_scene.name = `${scene.name} (${t('moderator.copy')})`
        new_scene.id = undefined
        emit('edit-scene', { ...new_scene });
    }
}

function onTagRemoved(removedTag: string) {
    if (selectedSceneInSceneManager.value) {
        selectedSceneInSceneManager.value.tags = selectedSceneInSceneManager.value.tags.filter(tag => tag !== removedTag);
    }
    existingTags.value = collectAllExistingTags()
}

function onTagAdded(addedTag: string) {
    if (selectedSceneInSceneManager.value) {
        selectedSceneInSceneManager.value.tags = [...selectedSceneInSceneManager.value.tags, addedTag];
    }

    let index = existingTags.value.findIndex(tag => tag.toLowerCase() === addedTag.toLowerCase());
    if (index === -1) {
        existingTags.value.push(addedTag);
    }
}
</script>


<template>
    <div style="display: flex; flex-direction: column; height: 100vh; gap: var(--space-small);"> <!-- Obere Reihe -->
        <div style="height: 300px; flex: 1; display: flex; width: 100%; ">
            <Splitter layout="horizontal" style="width: 100%; height: 94%">
                <SplitterPanel class="sub-panel" :size="colLeftSize">
                    <DataTable :value="filteredScenes" dataKey="id" editMode="row"
                        scrollable scrollHeight="flex" @row-edit-save="onRowEditSaveScene" responsiveLayout="scroll"
                        class="my-table" v-model:editingRows="editingRows"
                        v-model:selection="selectedSceneInSceneManager" selectionMode="single">

                        <Column field="name" header="" style="text-align: left">
                            <template #editor="slotProps">
                                <InputText v-model="slotProps.data.name" />
                            </template>
                            <template #body="slotProps">
                                <div draggable="true">
                                    <span style="font-weight: 600;">{{ slotProps.data.name }}</span><br>
                                    <span style="font-size: 0.875rem; color: #64748b;">Updated
                                        {{ formatDate(slotProps.data.updated_at) }}</span>
                                </div>
                            </template>
                        </Column>

                        <Column style="width: 10rem; text-align: right"
                            bodyClass="flex justify-content-end white-space-nowrap"
                            editorClass="flex justify-content-end white-space-nowrap">
                            <template #body="slotProps">
                                <Button size="small" rounded text icon="pi pi-code"
                                    @click="onEditScene(slotProps.data)" />
                                <Button size="small" rounded text icon="pi pi-clone"
                                    @click="onDuplicateEditScene(slotProps.data)" />
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
                            <GenericSearch ref="searchComponent" v-model:selectedTags="selectedTagsInSceneManager"
                                v-model:filterLogic="filterLogicSceneManager" v-model:filters="filtersSceneManager"
                                :title="$t('moderator.available_scenes')" />
                        </template>

                    </DataTable>
                </SplitterPanel>
                <SplitterPanel class="sub-panel" :size="colRightSize">
                    <SceneView v-if="selectedSceneInSceneManager" :preview="true" :key="selectedSceneInSceneManager.id"
                        :scene="selectedSceneInSceneManager" :showframe="false" class="scene-preview" />
                    <TagView v-if="selectedSceneInSceneManager"
                        :item="selectedSceneInSceneManager ? selectedSceneInSceneManager : null"
                        :onAddTagApi="addTagToScene" :onRemoveTagApi="removeTagFromScene" @tagRemoved="onTagRemoved"
                        @tagAdded="onTagAdded" />
                </SplitterPanel>
            </Splitter>
        </div>
        <!-- horizontal line -->
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
    border-radius: 8px;
    min-height: 400px;
}

/* Rechter Bereich: Die Drop-Zone */
.drop-zone {
    min-height: 300px;
    border: 2px dashed #cbd5e1;
    border-radius: 6px;
    padding: 1rem;
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
.dark-mode .ordered-item {
    background: var(--surface-dark);
    color: var(--text-color);
    border: none;
}

.ordered-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--surface-dark);
    border: 1px solid var(--p-primary-300);
    border-radius: var(--br-small);
    box-shadow: var(--shadow-light);
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