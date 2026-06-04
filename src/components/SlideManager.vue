<script setup lang="ts">
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import ScrollPanel from 'primevue/scrollpanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

import { PrimeIcons } from '@primevue/core/api';
import { getSlides } from "@/services/slide_service";
import { onMounted, ref } from 'vue';

const slides = ref([]);

onMounted(() => {
    getSlides().then(response => {
        console.log("Fetched slides:", response);
        slides.value = response.data;
    }).catch(error => {
        console.error("Error fetching slides:", error);
    });
});

</script>


<template>
    <ScrollPanel style="width: 100%; height: 100%;">
        <DataTable :value="slides" responsiveLayout="scroll">
            <Column field="id" header="ID"></Column>
            <Column field="name" header="Title"></Column>
            <Column field="created_at" header="Created At"></Column>
            <Column field="updated_at" header="Updated At"></Column>
        </DataTable>
    </ScrollPanel>
</template>


<style scoped></style>
