<script setup lang="ts">
import ScrollPanel from 'primevue/scrollpanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';

import { getSlides, updateSlide, deleteSlide } from "@/services/slide_service";
import { onMounted, ref } from 'vue';

const slides = ref([]);
const editingRows = ref([]);

onMounted(() => {
    getSlides().then(response => {
        slides.value = response.data;
    }).catch(error => {
        console.error("Error fetching slides:", error);
    });
});

function onRowEditSave(event) {
    
    const updatedSlide = event.data;
    updateSlide(updatedSlide.id, updatedSlide).then(response => {
        console.log("Slide updated successfully:", response.data);
    }).catch(error => {
        console.error("Error updating slide:", error);
    });
}

</script>


<template>
    <ScrollPanel style="width: 100%; height: 100%;">
        <DataTable
            :value="slides"
            dataKey="id"
            editMode="row"
            v-model:editingRows="editingRows"
            @row-edit-save="onRowEditSave"
            responsiveLayout="scroll"
        >
            <Column field="id" header="ID"></Column>
            <Column field="name" header="Title">
                <template #editor="slotProps">
                    <InputText v-model="slotProps.data.name" class="p-inputtext-sm" />
                </template>
            </Column>
            <Column field="created_at" header="Created At"></Column>
            <Column field="updated_at" header="Updated At"></Column>

            <Column :rowEditor="true" style="width: 8rem; text-align: center" bodyStyle="text-align: center"></Column>
            <Column header="Actions" style="width: 8rem; text-align: center" bodyStyle="text-align: center">
                <template #body="slotProps">
                    <button @click="editingRows = [slotProps.data.id]" class="p-button p-button-text p-button-sm">Edit</button>
                </template>
            </Column>
        </DataTable>
    </ScrollPanel>
</template>

<style scoped></style>
