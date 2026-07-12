<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import SplitterPanel from 'primevue/splitterpanel';
import Splitter from 'primevue/splitter';
import Button from 'primevue/button';
import PresentationEditing from '@/components/PresentationEditor.vue';
import { formatDate } from '@/utils/date_utils';

import { getPresentations, updatePresentation, deletePresentation, savePresentation } from "@/services/presentation_service";
import type { Presentation } from "@/services/presentation_service"
import { updateLivePresentation } from "@/services/live_presentation_service";
import { getScenes } from "@/services/scene_service";
import type { Scene } from "@/services/scene_service";
import { onMounted, ref } from 'vue';
import '@/assets/main.css'
import { useI18n } from 'vue-i18n';
//import type { Scene } from 'vega';

const { t } = useI18n();

const presentations = ref<Presentation[]>([]);
const scenes = ref<Scene[]>([]);
const selectedPresentation = ref<Presentation | null>(null);
const presentationName = ref<string>("");
const editingRows = ref<Presentation[]>([]);
const toast = useToast();

function fetchPresentations() {
    getPresentations().then(response => {
        presentations.value = response.data.presentations;
        console.info('fetched presentations:', JSON.parse(JSON.stringify(presentations.value)))
    }).catch(error => {
        console.error("Error fetching presentations:", error);
    });
}

function fetchScenes() {
    getScenes().then(response => {
        scenes.value = response.data.scenes;
        //console.info('fetched scenes:', JSON.parse(JSON.stringify(scenes.value)))
    }).catch(error => {
        console.error("Error fetching scenes:", error);
    });
}

onMounted(() => {
    fetchPresentations();
    fetchScenes();
});

function onRowEditSave(event: any) {
    const { id, name } = event.newData
    if (name === event.data.name) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'New and old filenames are identical', life: 3000 });
    } else {
        updatePresentation(id, { name: name }).then(response => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Presentation updated successfully', life: 3000 });
            presentations.value[event.index] = { ...response.data };
        }).catch(error => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update presentation', life: 3000 });
            console.error("Error updating presentation:", error)
        })
    }
}

const emit = defineEmits(['live'])

/*
const emit = defineEmits<{ 'edit-presentation': [presentation: Presentation] }>()

function onEditPresentation(presentation: Presentation) {
    //console.info('Emitting edit-presentation event with presentation:', JSON.parse(JSON.stringify(presentation)));
    emit('edit-presentation', { ...presentation });
}
*/

function onDeletePresentation(presentation: Presentation) {
    if (presentation.id) {
        deletePresentation(presentation.id).then(() => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Presentation deleted successfully', life: 3000 });
            presentations.value = presentations.value.filter(s => s.id !== presentation.id);
            if (selectedPresentation.value?.id === presentation.id) {
                selectedPresentation.value = null;
            }
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

        savePresentation(new_presentation).then(response => {
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
    try {
        // Wir senden die ID der Präsentation und setzen die Anzeige auf aktiv
        const response = await updateLivePresentation({
            presentation: presentation.id,
            active: true,
            current_scene: 1
        });
        
        console.log("Live Presentation startet:", response.data);

    } catch (error) {
        console.error("Error starting presentation:", error);
    }
    emit('live')
}
</script>


<template>
    <Splitter class="dashboard" :gutterSize="2" stateKey="presentation-manager-splitter" stateStorage="local">

        <SplitterPanel class="sub-panel" :size="40" :minSize="40" :maxSize="40">
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; ">
                <InputText class="name-input" v-model="presentationName"
                    :placeholder="$t('moderator.presentation.new_presentation')" type="text" />
                <Button class="button-add-presentation" :label="$t('moderator.presentation.create')" icon="pi pi-save"
                    @click="onAddPresentation" />
            </div>
            <div>
                <DataTable :value="presentations" dataKey="id" editMode="row" scrollable scrollHeight="flex"
                    @row-edit-save="onRowEditSave" responsiveLayout="scroll" class="presentation-table"
                    v-model:editingRows="editingRows" v-model:selection="selectedPresentation" selectionMode="single">

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
                </DataTable>
            </div>
        </SplitterPanel>

        <SplitterPanel class="sub-panel" :size="60" :minSize="60" :maxSize="60">
            <div v-if="selectedPresentation">
                <!-- <h2>Details für: {{ selectedPresentation.name }}</h2> -->
                <PresentationEditing :key="selectedPresentation.id" :presentation="selectedPresentation" :scenes="scenes"/>
            </div>
            <div v-else>
            </div>
        </SplitterPanel>
    </Splitter>
</template>

<style scoped>

.presentation-preview {
    flex: 1;
    min-height: 0;
    width: 100%;
    max-height: 500px
}


.presentation-table {
    flex: 1;
    min-height: 0;
    /* the critical line */
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

.name-input {
    width: 100%;
    padding: 0.5rem;
    border-radius: var(--br-medium);
    border: 1px solid var(--surface-border, #e2e8f0);
    background-color: var(--p-primary-50, #f8fafc);
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