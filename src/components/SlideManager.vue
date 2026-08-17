<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import type { Slide, SlideSection } from "@/services/slide_service"
import SplitterPanel from 'primevue/splitterpanel';
import Splitter from 'primevue/splitter';
import Button from 'primevue/button';
import SlideView from '@/components/SlideView.vue';
import TagView from '@/components/TagView.vue';
import { FilterMatchMode } from '@primevue/core/api'
import { formatDate } from '@/utils/date_utils';
import { saveSlide } from '@/services/slide_service'
import Tag from 'primevue/tag';
import { slides, fetchSlides } from '@/globals/slides';
import { updateSlide, deleteSlide, addTagToSlide, removeTagFromSlide } from "@/services/slide_service";

import { onMounted, ref } from 'vue';
import '@/assets/main.css'
import { useI18n } from 'vue-i18n';
import { useConfirm } from "primevue/useconfirm";

const confirm = useConfirm();
const { t } = useI18n();

const selectedSlide = ref<Slide | null>(null);
const previewSlide = ref('');
const editingRows = ref<Slide[]>([]);
const toast = useToast();
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})

onMounted(() => {
    fetchSlides();
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
    emit('edit-slide', { ...slide, sections: slide.sections || [] });
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
    else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Slide ID is missing', life: 3000 });
        console.error("Error deleting slide: no valid slide.id");
    }
}

function onConfirmDeleteSlide(slide: Slide) {
    confirm.require({
        header: t('moderator.confirmation'), 
        message: t('moderator.confirmation-message-head') + t('moderator.slide') + " (" + slide.name + ")" + t('moderator.confirmation-message-tail'), 
        acceptLabel: `${t('moderator.confirmation-ok')}`,
        rejectLabel: t('moderator.confirmation-cancel'), 
        accept: async () => {    
            await onDeleteSlide(slide);
        }, reject: () => {      
            // nothing to do    
        },
    });
}

function onDuplicateSlide(slide: Slide) {
    if (slide.id) {

        const new_sections = slide.sections?.map((section, index) => ({
            view_type: section.view_type,
            content: section.content,
            content_path: section.content_path,
            width_fraction: section.width_fraction
        })) || [];

        const new_slide = {
            name: `${slide.name} (${t('moderator.copy')})`,
            width: slide.width,
            height: slide.height,
            tags: slide.tags
        };

        saveSlide(new_slide, new_sections).then(() => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Slide saved successfully', life: 3000 })
            fetchSlides();
        }).catch(error => {
            console.error("Error saving slide:", error);
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save slide', life: 3000 })
            fetchSlides();
        });
    } else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Slide ID is missing', life: 3000 });
        console.error("Error deleting slide: no valid slide.id");
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
                        <div style="width: 100%; display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem;">
                            <Tag :severity="slotProps.data.mode === 'interactive' ? 'success' : 'info'">
                                {{ slotProps.data.mode }}
                            </Tag>
                        </div>
                    </template>
                </Column>

                <Column style="width: 10rem" bodyClass="flex justify-content-end white-space-nowrap" editorClass="flex justify-content-end white-space-nowrap">
                    <template #body="slotProps">
                        <Button size="small" rounded text icon="pi pi-code" @click="onEditSlide(slotProps.data)" />
                        <Button size="small" rounded text icon="pi pi-clone"
                            @click="onDuplicateSlide(slotProps.data)" />
                        <Button size="small" rounded text icon="pi pi-pencil"
                            @click="(e) => slotProps.editorInitCallback(e)" />
                        <Button size="small" rounded text icon="pi pi-trash" @click="onConfirmDeleteSlide(slotProps.data)" />
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

        <SplitterPanel class="sub-panel">
            <SlideView v-if="selectedSlide" :preview="true" :slide="selectedSlide" :showframe="false"
                :sections="selectedSlide.sections ? selectedSlide.sections : []" class="slide-preview" />
            <TagView :item="selectedSlide ? selectedSlide : null" :onAddTagApi="addTagToSlide"
                :onRemoveTagApi="removeTagFromSlide" @tagRemoved="onTagRemoved" @tagAdded="onTagAdded" />
        </SplitterPanel>
    </Splitter>
</template>

<style scoped>
.slide-preview {
    flex: 1;
    min-height: 0;
    width: 100%;
    max-height: 500px
}


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
</style>