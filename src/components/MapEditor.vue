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
import { type MapLayer, saveMapLayer } from '@/services/map_service';
import Button from 'primevue/button';
import { slides } from '@/globals/slides';
import { type MapProperties, type Layer } from '@/services/map_service';
const props = defineProps<{
    slide: Slide | null,
    slideSection: SlideSection,
}>()

const MapMarkerEditor = defineAsyncComponent(() => import('@/components/MapMarkerEditor.vue'));

const dialog = useDialog();

const layers = ref<Layer[]>([
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
    props.slideSection.content = JSON.stringify(mapProperties);
    emit('contentUpdated', props.slideSection.content);
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
        path: URL.createObjectURL(file),
        id: null,
        section: props.slideSection?.id || null,
        uploaded: false
    }));
    layers.value.push(...newLayers);
}

function uploadLayer(layer: Layer, idx: number) {

    if (!props.slideSection?.id) {
        console.error('SlideSection ID is not available. Cannot upload layer.');
        return;
    }
    saveMapLayer(layer, props.slideSection.id)
        .then((response) => {
            console.log('upload response:', response.data);
            layer.uploaded = true;
            layer.path = response.data.path.replace(/^\//, '');
            layer.id = response.data.id;
            layers.value[idx] = layer;
            saveMapProperties();
        })
        .catch((error) => {
            console.error('Error uploading layer:', error);
        });
}

function openMarkerEditor(item: Layer) {
    dialog.open(MapMarkerEditor, {
        props: {
            header: "Edit Marker",
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
        <h1 style="margin-bottom: 0;" class="dashboard_label">Layer</h1>
        <small class="layerinfo">To be rendered properly layers need to be projected to the Web Mercator coordinate system. (WGS84;
            EPSG:4326)</small>
        <FileUpload style="margin-left: auto" mode="basic" chooseLabel="Add File" :multiple="true" class="file-upload"
            @select="onFileSelect" />
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
                        <div
                            style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start;">
                            <span class="filename">{{ item.name }}</span>
                            <Tag severity="success" :value="item.filetype" v-if="item.filetype" />
                        </div>
                        <div v-if="item.uploaded">
                            <Tag severity="success" value="Uploaded" />
                        </div>

                        <Button label="Upload" @click="uploadLayer(item, i)" class="upload-btn"
                            :disabled="!props.slideSection?.id"></Button>
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

.layerinfo{
    margin: none;
    padding: none;
    font-size: var(--fs-medium);
    color: var(--p-primary-500);
}

.layer-container {
    max-height: 300px;
    overflow-y: auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    border-top: 1px solid var(--p-primary-500);
    border-bottom: 1px solid var(--p-primary-500);
    padding-top: var(--space-small);
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

.upload-btn {
    margin-left: auto;
}

:deep(.p-fileupload-basic .p-fileupload-filename) {
    display: none;
}
</style>