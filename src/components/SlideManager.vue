<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import type { Slide } from "@/services/slide_service"

import { getSlides, updateSlide } from "@/services/slide_service";
import { onMounted, ref } from 'vue';
import '@/assets/main.css'

const slides = ref<Slide[]>([]);
const editingRows = ref<Slide[]>([]);
const toast = useToast();

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

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('de-DE', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    })
}

</script>

<template>
    <div class="panel">
        <DataTable :value="slides" dataKey="id" editMode="row" scrollable scrollHeight="flex"
            @row-edit-save="onRowEditSave" responsiveLayout="scroll" class="slide-table"
            v-model:editingRows="editingRows">
            <Column field="id" header="ID"></Column>
            <Column field="name" header="Title">
                <template #editor="slotProps">
                    <InputText v-model="slotProps.data.name" />
                </template>
            </Column>
            <Column field="created_at" header="Created At">
                <template #body="{ data }">
                    {{ formatDate(data.created_at) }}
                </template>
            </Column>
            <Column field="updated_at" header="Updated At">
                <template #body="{ data }">
                    {{ formatDate(data.updated_at) }}
                </template>
            </Column>
            <Column :rowEditor="true" style="width: 8rem; text-align: center" bodyStyle="text-align: center"></Column>
        </DataTable>
    </div>
</template>

<style scoped>
.panel {
    height: calc(70vh);
    /* adjust to your real header height */
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-sizing: border-box;
}

.slide-table {
    flex: 1;
    min-height: 0;
}

:deep(.p-datatable-thead tr > th) {
    border-bottom: 2px solid var(--primary);
    font-weight: 600;
}

:deep(.p-datatable-thead) {
    box-shadow: var(--shadow-light);
}
</style>