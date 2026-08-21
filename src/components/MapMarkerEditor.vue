<script lang="ts" setup>

import markersData from '@/assets/markers.json';
import { ref, inject } from 'vue';
import Select from 'primevue/select';
import Button from 'primevue/button';

export type Marker = { type: 'icon' | 'emoji'; value: string; category: string };
const markers = markersData as Marker[];

const dialogRef = inject('dialogRef') as any;


const selectedMarker = ref<Marker>();
const selectedCategory = ref<string>("");
const markerCategories = Array.from(new Set(markers.map(marker => marker.category)));

function save() {
    dialogRef.value.close(selectedMarker.value);
}

function filterMarkersByCategory(category: string): Marker[] {
    if (category === "") {
        return markers;
    }
    return markers.filter(marker => marker.category === category);
}

function onSelectMarker(marker: Marker) {
    selectedMarker.value = marker;
}


</script>

<template>
    <div class="container">

        <div class="marker-preview">
            <span v-if="selectedMarker?.type === 'icon'">
                <i class="material-symbols-outlined">{{ selectedMarker.value }}</i>
            </span>
            <span v-else>{{ selectedMarker?.value }}</span>
        </div>

        <div class="marker-picker">
            <Select class="marker-filter" :options="markerCategories" v-model="selectedCategory" placeholder="Select a Category" />
            <div v-for="(marker, i) in filterMarkersByCategory(selectedCategory)" :key="i" class="marker-item" @click="onSelectMarker(marker)">
                <span v-if="marker.type === 'icon'">
                    <i class="material-symbols-outlined">{{ marker.value }}</i>
                </span>
                <span v-else>{{ marker.value }}</span>
            </div>
        </div>

        <Button label="Save" @click="save" :disabled="!selectedMarker" />
    </div>

</template>


<style scoped>
.container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: var(--space-xlarge);
}

.marker-preview {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 1rem;
    border: 2px solid var(--p-primary-500);

    font-size: var(--fs-xlarge);
}

.marker-filter {
    width: 100%;
    margin-bottom: var(--space-small);
    position: sticky;
    top: 0;
}

.marker-picker {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;

    gap: var(--space-small);

    width: 100%;
    height: 300px;
    overflow-y: auto;

    background-color: var(--p-primary-50);
    border-radius: var(--br-medium);

    padding: var(--space-small);
}

.marker-item {
    font-size: var(--fs-large);
    color: var(--p-primary-500);
    width: 30px;
    height: 30px;
    border-radius: 15px;

    display: flex;
    justify-content: center;
    align-items: center;
}

.marker-item:hover {
    color: var(--p-primary-700);
    background-color: var(--p-primary-100);
    cursor: pointer;
}
</style>