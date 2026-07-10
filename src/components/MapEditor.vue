<script lang="ts" setup>
import { ref, computed } from 'vue';
import type { Slide, SlideSection } from '@/services/slide_service';
import { basemaps } from '@/utils/map_utils';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import '@/assets/main.css'

const props = defineProps<{
    slide: Slide | null,
    section: SlideSection,
}>()

const emit = defineEmits<{
    (e: 'basemapUpdated', key: keyof typeof basemaps): void
}>()

const selectedBasemap = ref<keyof typeof basemaps>('openfreemap_bright');

const basemapOptions = computed(() =>
    (Object.keys(basemaps) as (keyof typeof basemaps)[]).map(key => ({
        label: basemaps[key].name,
        value: key,
    }))
);

function onChangeBasemap() {
    emit('basemapUpdated', selectedBasemap.value);
}
</script>

<template>
    <div class="editor-container">
        <div class="label-container">
            <label>Basemap</label>
            <Select v-model="selectedBasemap" :options="basemapOptions" optionLabel="label" optionValue="value"
                @change="onChangeBasemap" />
        </div>
        <div class="label-container">
            <label>Start Position</label>
            <InputText placeholder="Paste WGS84 Coordinate"></InputText>
        </div>
    </div>

</template>

<style scoped>
.editor-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.label-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
</style>