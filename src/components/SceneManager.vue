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

import { getScenes, updateScene, deleteScene, addTagToScene, removeTagFromScene } from "@/services/scene_service";
import { onMounted, ref } from 'vue';
import '@/assets/main.css'
import { useI18n } from 'vue-i18n';
import { useConfirm } from "primevue/useconfirm";

const { t } = useI18n();
const confirm = useConfirm();

const scenes = ref<Scene[]>([]);
const selectedScene = ref<Scene | null>(null);
//const previewScene = ref('');
const editingRows = ref<Scene[]>([]);
const toast = useToast();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

function fetchScenes() {
    getScenes().then(response => {
        scenes.value = response.data.scenes;
        //console.info('fetched scenes:', JSON.parse(JSON.stringify(scenes.value)))
    }).catch(error => {
        console.error("Error fetching scenes:", error);
    });
}

onMounted(() => {
    fetchScenes();
});

function onRowEditSave(event: any) {
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

const emit = defineEmits<{ 'edit-scene': [scene: Scene] }>()

function onEditScene(scene: Scene) {
    console.info('Emitting edit-scene event with scene:', JSON.parse(JSON.stringify(scene)));
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

        saveScene(new_scene).then(response => {
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
        //console.error("Tags before:", selectedScene.value.tags);
        selectedScene.value.tags = [...selectedScene.value.tags, addedTag];
        // console.error("Tags after:", selectedScene.value.tags);
    }
}
</script>


<template>
    <Splitter class="dashboard" :gutterSize="2" stateKey="scene-manager-splitter" stateStorage="local">

        <SplitterPanel class="sub-panel" :size="50">

            <DataTable :value="scenes" dataKey="id" editMode="row" scrollable scrollHeight="flex"
                @row-edit-save="onRowEditSave" responsiveLayout="scroll" class="scene-table"
                v-model:editingRows="editingRows" v-model:selection="selectedScene" selectionMode="single"
                :globalFilterFields="['name', 'tags']" v-model:filters="filters">

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

                <Column style="width: 10rem" bodyClass="flex justify-content-end white-space-nowrap"
                    editorClass="flex justify-content-end white-space-nowrap">
                    <template #body="slotProps">
                        <Button size="small" rounded text icon="pi pi-code" @click="onEditScene(slotProps.data)" />
                        <Button size="small" rounded text icon="pi pi-clone"
                            @click="onDuplicateScene(slotProps.data)" />
                        <Button size="small" rounded text icon="pi pi-pencil"
                            @click="(e) => slotProps.editorInitCallback(e)" />
                        <Button size="small" rounded text icon="pi pi-trash" @click="onConfirmDeleteScene(slotProps.data)" />
                    </template>
                    <template #editor="slotProps">
                        <Button size="small" rounded text icon="pi pi-check"
                            @click="(e) => slotProps.editorSaveCallback(e)" />
                        <Button size="small" rounded text icon="pi pi-times"
                            @click="(e) => slotProps.editorCancelCallback(e)" />
                    </template>
                </Column>


                <template #header>
                    <InputText class="search-input" v-model="filters.global.value" :placeholder="$t('moderator.search')"
                        type="text" />
                    <Button class="button-reset-search" @click="filters.global.value = null" rounded
                        :disabled="!filters.global.value">
                        <i class="pi pi-times"></i>
                    </Button>
                </template>

            </DataTable>
        </SplitterPanel>

        <SplitterPanel class="sub-panel" :size="50">
            <!--{{ selectedScene }}-->
            <SceneView v-if="selectedScene" :preview="true" :key="selectedScene.id" :scene="selectedScene"
                :showframe="false" class="scene-preview" />
            <TagView v-if="selectedScene" :item="selectedScene ? selectedScene : null" :onAddTagApi="addTagToScene"
                :onRemoveTagApi="removeTagFromScene" @tagRemoved="onTagRemoved" @tagAdded="onTagAdded" />
        </SplitterPanel>
    </Splitter>
</template>

<style scoped>
.scene-preview {
    flex: 1;
    min-height: 0;
    width: 100%;
}

.scene-table {
    flex: 1;
    min-height: 0;
}

.marp-output {
    flex: 1;
    width: 100%;
    min-height: 0;
    border-radius: var(--br-medium);
    background: transparent;
    border: 1px solid var(--surface-border, #e2e8f0);
    background-color: var(--surface, #f8fafc);
    margin-top: 0.5rem;
    overflow: hidden;
}

.preview-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-color-secondary, #64748b);
    flex-shrink: 0;
}

.search-input {
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
</style>