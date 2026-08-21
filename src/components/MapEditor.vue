<script lang="ts" setup>
import { ref, computed, defineAsyncComponent } from 'vue';
import type { Slide, SlideSection } from '@/services/slide_service';
import { basemaps } from '@/utils/map_utils';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import '@/assets/main.css'
import FileUpload from 'primevue/fileupload';
import DataView from 'primevue/dataview';
import Tag from 'primevue/tag';
import { useDialog } from 'primevue/usedialog';
import type { Marker } from '@/components/MapMarkerEditor.vue';

const props = defineProps<{
    slide: Slide | null,
    section: SlideSection,
}>()

const MapMarkerEditor = defineAsyncComponent(() => import('@/components/MapMarkerEditor.vue'));

interface Layer {
    name: string;
    file: File;
    filetype: 'geojson' | 'gpkg' | undefined
    marker?: Marker; // Optional marker property
}

interface MapProperties {
    basemap: keyof typeof basemaps;
    startPosition: [number, number]; // [longitude, latitude]
    layers: Layer[];
}

const dialog = useDialog();

const layers = ref<Layer[]>([
    {
        name: 'example.geojson',
        file: new File([], 'example.geojson'),
        filetype: 'geojson'
    }, {
        name: 'example.gpkg',
        file: new File([], 'example.gpkg'),
        filetype: 'gpkg'
    }
]);

const emit = defineEmits<{
    (e: 'basemapUpdated', key: keyof typeof basemaps): void
    (e: 'contentUpdated', content: string): void
}>()

const selectedBasemap = ref<keyof typeof basemaps>('openfreemap_bright');

const basemapOptions = computed(() =>
    (Object.keys(basemaps) as (keyof typeof basemaps)[]).map(key => ({
        label: basemaps[key].name,
        value: key
    }))
);

function onChangeBasemap() {
    emit('basemapUpdated', selectedBasemap.value);
}

function saveMapProperties() {
    const mapProperties: MapProperties = {
        basemap: selectedBasemap.value,
        startPosition: [0, 0], 
        layers: layers.value
    };
    props.section.content = JSON.stringify(mapProperties);
    emit('contentUpdated', props.section.content);
}

function onFileSelect(event: { files: File[] }) {
    const newLayers: Layer[] = event.files.map(file => ({
        name: file.name,
        file,
        filetype: file.name.endsWith('.geojson')
            ? 'geojson'
            : file.name.endsWith('.gpkg')
                ? 'gpkg'
                : undefined,
    }));
    layers.value.push(...newLayers);
}

function openMarkerEditor(item: Layer) {
    dialog.open(MapMarkerEditor, {
        props: {
            header: item.name,
            modal: true,
            style: { width: '400px', height: '600px' },
        },
        data: { layer: item },
        onClose: (opt) => {
            const result = opt?.data;
            if (result) {
                item.marker = result;
            }
        },
    });
}


</script>

<template>
    <div class="editor-container">

        <!-- <FileUpload :multiple="true" :auto="true" :customUpload="true" @select="onFileSelect">
            <template #empty>
                <div>Drag and drop files here to upload.</div>
            </template>
</FileUpload> -->
        <h1 class="dashboard_label">Layer</h1>
        <div class="label-container">
            <DataView :value="layers" layout="list" class="layer-container">
                <template #list="slotProps">
                    <div v-for="(item, i) in slotProps.items" :key="i" class="layer-item">
                        <div class="marker-container" @click="openMarkerEditor(item)">

                            <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                                <span v-if="item.marker">
                                    <i class="material-symbols-outlined marker">{{ item.marker.value }}</i>
                                </span>
                                <span v-else>
                                    <i class="material-symbols-outlined marker">explore_nearby</i>
                                </span>
                            </div>

                        </div>
                        <Tag :value="item.filetype" v-if="item.filetype" />
                        <span class="filename">{{ item.name }}</span>
                    </div>
                </template>
            </DataView>
        </div>

        <h1 class="dashboard_label">Map Settings</h1>
        <div class="label-container">
            <label>Basemap</label>
            <Select v-model="selectedBasemap" :options="basemapOptions" optionLabel="label" optionValue="value"
                @change="onChangeBasemap" fluid />
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

.layer-container {
    padding: var(--space-small);
    max-height: 300px;
    overflow-y: auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
}

.layer-item {
    display: flex;
    align-items: center;
    flex-direction: row;
    gap: var(--space-medium);
    padding: var(--space-small);
    background-color: var(--p-primary-50);
    border-radius: var(--br-medium);
    border: 1px solid var(--p-primary-200);
    margin-bottom: var(--space-small);
}

.marker-container {
    width: 60px;
    height: 60px;
    border-radius: var(--br-medium);
    background-color: white;
    box-shadow: var(--shadow-light);
}

.marker-container:hover {
    box-shadow: var(--shadow-dark);
    border: 1px solid var(--p-primary-400);
    cursor: pointer;

    .marker {
        color: var(--p-primary-400);
    }
}

.marker {
    font-size: var(--fs-xlarge);
    color: var(--p-primary-200);
}

.filename {
    font-size: var(--fs-medium);
    font-family: "Fira Code", monospace;
    font-weight: bold;
    color: var(--p-primary-500);
}
</style>