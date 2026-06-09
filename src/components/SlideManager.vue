<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';

import { getSlides, updateSlide } from "@/services/slide_service";
import { onMounted, ref } from 'vue';

const slides = ref([]);

onMounted(() => {
    getSlides().then(response => {
        slides.value = response.data;
    }).catch(error => {
        console.error("Error fetching slides:", error);
    });
});

function onRowEditSave(event:any) {
    const updatedSlide = event.data;
    updateSlide(updatedSlide.id, updatedSlide).then(response => {
        console.log("Slide updated successfully:", response.data);
    }).catch(error => {
        console.error("Error updating slide:", error);
    });
}

</script>

<template>
    <DataTable :value="slides" dataKey="id" editMode="row" 
    @row-edit-save="onRowEditSave" responsiveLayout="scroll" class="slide-table">
        <Column field="id" header="ID"></Column>
        <Column field="name" header="Title" >
            <template #editor="slotProps">
                <InputText v-model="slotProps.data.name"  />
            </template>
        </Column>
        <Column field="created_at" header="Created At"></Column>
        <Column field="updated_at" header="Updated At"></Column>

        <Column :rowEditor="true" style="width: 8rem; text-align: center" bodyStyle="text-align: center"></Column>
    </DataTable>
</template>

<style scoped></style>
