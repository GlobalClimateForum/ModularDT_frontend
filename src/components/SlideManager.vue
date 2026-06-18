<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import type { Slide } from "@/services/slide_service"
import SplitterPanel from 'primevue/splitterpanel';
import Splitter from 'primevue/splitter';
import Button from 'primevue/button';
import SlideView from '@/components/SlideView.vue';
import TagView from '@/components/TagView.vue';
import { FilterMatchMode } from '@primevue/core/api'

import { getSlides, updateSlide, deleteSlide } from "@/services/slide_service";
import { onMounted, ref } from 'vue';
import '@/assets/main.css'

const slides = ref<Slide[]>([]);
const selectedSlide = ref<Slide | null>(null);
const previewSlide = ref('');
const editingRows = ref<Slide[]>([]);
const toast = useToast();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})


onMounted(() => {
    getSlides().then(response => {
        slides.value = response.data;
    }).catch(error => {
        console.error("Error fetching slides:", error);
    });
});

function onRowEditSave(event: any) {
    const { id, name } = event.newData
    if (name === event.data.name) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'New and old filenames are identical', life: 3000 });
    } else {
        updateSlide(id, { name: name }).then(response => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Slide updated successfully', life: 3000 });
            slides.value[event.index] = response.data;
        }).catch(error => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update slide', life: 3000 });
            console.error("Error updating slide:", error)
        })
    }
}

const emit = defineEmits<{ 'edit-slide': [slide: Slide] }>()

function onEditSlide(slide: Slide) {
    emit('edit-slide', slide)
}

function onDeleteSlide(slide: Slide) {
    if (slide.id) {
        deleteSlide(slide.id).then(() => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Slide deleted successfully', life: 3000 });
            slides.value = slides.value.filter(s => s.id !== slide.id);
            if (selectedSlide.value?.id === slide.id) {
                selectedSlide.value = null;
            }
        }).catch(error => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete slide', life: 3000 });
            console.error("Error deleting slide:", error);
        })
    }
    else{
        toast.add({ severity: 'error', summary: 'Error', detail: 'Slide ID is missing', life: 3000 });
        console.error("Error deleting slide: no valid slide.id");
    }
}

function formatDate(iso: string): string {

    // calculate how long ago the date is from now
    const min_ago = (Date.now() - new Date(iso).getTime()) / (1000 * 60);
    const hours_ago = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
    const days_ago = hours_ago / 24;

    if (min_ago < 1) {
        return "Just now";
    } else if (min_ago < 60) {
        return `${Math.floor(min_ago)} ${Math.floor(min_ago) <= 1 ? 'minute' : 'minutes'} ago`;
    } else if (hours_ago < 24) {
        return `${Math.floor(hours_ago)} ${Math.floor(hours_ago) <= 1 ? 'hour' : 'hours'} ago`;
    } else {
        return `${Math.floor(days_ago)} ${Math.floor(days_ago) <= 1 ? 'day' : 'days'} ago`;
    }
}

function onTagRemoved(removedTag: string) {
    if (selectedSlide.value) {
        selectedSlide.value.tags = selectedSlide.value.tags.filter(tag => tag !== removedTag);
    }
}

function onTagAdded(addedTag: string) {
    if (selectedSlide.value) {
        selectedSlide.value.tags = [...selectedSlide.value.tags, addedTag];
    }
}

</script>

<template>
    <Splitter class="dashboard" :gutterSize="2" stateKey="slide-manager-splitter" stateStorage="local">

        <SplitterPanel class="sub-panel" :size="30">

            <DataTable :value="slides" dataKey="id" editMode="row" scrollable scrollHeight="flex"
                @row-edit-save="onRowEditSave" responsiveLayout="scroll" class="slide-table"
                v-model:editingRows="editingRows" v-model:selection="selectedSlide" selectionMode="single"
                :globalFilterFields="['name', 'content', 'tags']" v-model:filters="filters">

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

                <Column style="width: 8rem">
                    <template #body="slotProps">
                        <Button size="small" rounded text icon="pi pi-code" @click="onEditSlide(slotProps.data)" />
                        <Button size="small" rounded text icon="pi pi-pencil"
                            @click="(e) => slotProps.editorInitCallback(e)" />
                        <Button size="small" rounded text icon="pi pi-trash" @click="onDeleteSlide(slotProps.data)" />
                    </template>
                    <template #editor="slotProps">
                        <Button size="small" rounded text icon="pi pi-check"
                            @click="(e) => slotProps.editorSaveCallback(e)" />
                        <Button size="small" rounded text icon="pi pi-times"
                            @click="(e) => slotProps.editorCancelCallback(e)" />
                    </template>
                </Column>


                <template #header>
                    <InputText class="search-input" v-model="filters.global.value" placeholder="Search" type="text" />
                    <Button class="button-reset-search" @click="filters.global.value = null" rounded
                        :disabled="!filters.global.value">
                        <i class="pi pi-times"></i>
                    </Button>
                </template>

            </DataTable>
        </SplitterPanel>

        <SplitterPanel class="sub-panel slide-preview">
            <SlideView :content="selectedSlide"></SlideView>
            <TagView :slide="selectedSlide? selectedSlide : null" @tagRemoved="onTagRemoved" @tagAdded="onTagAdded"></TagView>
        </SplitterPanel>
    </Splitter>
</template>

<style scoped>
.slide-table {
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

:deep(.p-datatable-table-container::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
}

:deep(.p-datatable-table-container::-webkit-scrollbar-thumb) {
    background: var(--p-primary-300);
    border-radius: 4px;
}

:deep(.p-datatable-table-container::-webkit-scrollbar-thumb:hover) {
    background: var(--p-primary-500);
}

:deep(.p-datatable-table-container::-webkit-scrollbar-track) {
    background: transparent;
}
</style>