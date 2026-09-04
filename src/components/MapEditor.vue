<script lang="ts" setup>
import { ref, computed, defineAsyncComponent, onMounted } from 'vue';
import type { Slide, SlideSection } from '@/services/slide_service';
import { basemaps } from '@/utils/map_utils';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import '@/assets/main.css'
import FileUpload from 'primevue/fileupload';
import DataView from 'primevue/dataview';
import Tag from 'primevue/tag';
import { useDialog } from 'primevue/usedialog';
import Button from 'primevue/button';
import { type MapProperties, type Layer, saveMapLayer } from '@/services/map_service';
import { localMapLayer } from '@/services/map_service';

const DEFAULT_START_POSITION: [number, number] = [13.350103005033793, 52.51451583081903];

const props = defineProps<{
    slide: Slide | null,
    slideSection: SlideSection,
    startPosition: [number, number]
}>()

const existingLayers = ref<Layer[] | null>(null);

onMounted(async () => {
    if (props.slideSection.content) {
        const mapProperties: MapProperties = JSON.parse(props.slideSection.content);
        selectedBasemap.value = mapProperties.basemap;
        layers.value = mapProperties.layers || [];
        sPosition.value = mapProperties.startPosition?.join(', ') || DEFAULT_START_POSITION.join(', ');
        existingLayers.value = await localMapLayer();
    } else {
        selectedBasemap.value = 'openfreemap_bright';
        layers.value = [];
        sPosition.value = DEFAULT_START_POSITION.join(', ');
    }
});


const MapMarkerEditor = defineAsyncComponent(() => import('@/components/MapMarkerEditor.vue'));

const dialog = useDialog();
const layers = ref<Layer[]>([]);
const sPosition = ref<string>('');

const emit = defineEmits<{
    (e: 'basemapUpdated', key: keyof typeof basemaps): void
    (e: 'contentUpdated', content: string): void
}>()

const selectedBasemap = ref<keyof typeof basemaps>('openfreemap_bright');

const asHexValue = computed(() => (value: string) => {
    if (value.startsWith('#')) {
        return value;
    }
    return '#' + value;
});



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

function updateLayer(layer: Layer, idx: number) {
    layers.value[idx] = layer;
    saveMapProperties();
}


function uploadLayer(layer: Layer, idx: number) {

    if (!props.slideSection?.id) {
        console.error('SlideSection ID is not available. Cannot upload layer.');
        return;
    }
    saveMapLayer(layer, props.slideSection.id)
        .then((response) => {
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
            style: { width: '600px', height: '600px' },
        },
        data: { layer: item },
        onClose: (opt) => {
            const result = opt?.data;
            if (result) {
                updateLayer({ ...item, marker: result }, layers.value.findIndex((l) => l === item));
            }
        },
    });
}

</script>

<template>
    <div class="editor-container">

        <!-- <small class="layerinfo">Note: To be rendered properly layers need to be projected to the Web Mercator coordinate
            system. (WGS84; EPSG:4326). You can only upload Files to existing slides.
        </small> -->

        <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center;">
            <h1 style="margin-bottom: 0;" class="dashboard_label">Layer</h1>
            <div style="display: flex; flex-direction: row; gap: var(--space-small); align-items: center;">

                <Select v-model="existingLayers" :options="layers" optionLabel="name" optionValue="id"
                    placeholder="Add Existing Layer" />

                <FileUpload mode="basic" customUpload auto @select="onFileSelect" chooseLabel="Upload Layer"
                    :chooseButtonProps="{ severity: 'primary', variant: 'filled' }" />


            </div>
        </div>


        <div class="label-container">
            <DataView :value="layers" layout="list" class="layer-container">
                <template #list="slotProps">
                    <div v-for="(item, i) in slotProps.items" :key="i" class="layer-item">

                        <!-- Map Marker for Layer -->
                        <span>
                            <div class="marker-container" @click="openMarkerEditor(item)">
                                <div v-if="item.marker?.type === 'dot'">
                                    <div class="dot-marker" :style="{
                                        width: item.marker.style['circle-radius'] * 2 + 'px',
                                        height: item.marker.style['circle-radius'] * 2 + 'px',
                                        backgroundColor: asHexValue(item.marker.style['circle-color']),
                                        border: item.marker.style['circle-stroke-width'] + 'px solid ' + asHexValue(item.marker.style['circle-stroke-color'])
                                    }"></div>
                                </div>

                                <div v-if="item.marker?.type === 'emoji'">
                                    <span class="marker">{{ item.marker.value }}</span>
                                </div>
                            </div>
                        </span>

                        <div
                            style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start;">
                            <span class="filename">{{ item.name }}</span>
                            <Tag v-if="item.uploaded" severity="success" value="Uploaded" />
                            <!-- <Tag severity="contrast" :value="item.filetype" v-if="item.filetype" /> -->
                        </div>

                        <div class="layer-controls">
                            <Button @click="uploadLayer(item, i)" size="small" rounded
                                :disabled="!props.slideSection?.id">
                                <template #icon>
                                    <i class="material-symbols-outlined"
                                        style="font-size: var(--fs-medium);">upload_2</i>
                                </template>
                            </Button>

                            <Button rounded size="small">
                                <template #icon>
                                    <i class="material-symbols-outlined"
                                        style="font-size: var(--fs-medium);">control_point_duplicate</i>
                                </template>
                            </Button>
                        </div>
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

        <div style="display: flex; flex-direction: row; gap: var(--space-small); align-items: flex-end; width: 100%">
            <div class="label-container">
                <label>Start Position</label>
                <InputText v-model="sPosition" placeholder="Paste WGS84 Coordinate" fluid></InputText>
            </div>
            <Button rounded @click="loadCurrentMapPosition()">
                <template #icon>
                    <i class="material-symbols-outlined" style="font-size: var(--fs-medium);">my_location</i>
                </template>
            </Button>
        </div>
    </div>

</template>

<style scoped>
.editor-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.layerinfo {
    margin: none;
    padding: none;
    font-size: var(--fs-medium);
    color: var(--p-primary-500);
}

.layer-container {
    height: 250px;
    overflow-y: auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    border-top: 1px solid var(--p-primary-500);
    border-bottom: 1px solid var(--p-primary-500);
    padding: var(--space-small)
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

.layer-controls {
    display: flex;
    flex-direction: row;
    gap: var(--space-small);
    margin-left: auto;
}

.dot-marker {
    border-radius: 50%;
    max-width: 100%;
    max-height: 100%;

    transform: scale(0.7);
}

.marker-container {
    width: 60px;
    height: 60px;
    border-radius: var(--br-medium);
    background-color: white;
    box-shadow: var(--shadow-light);

    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    overflow: hidden;
}

.marker-container:hover {
    box-shadow: var(--shadow-dark);
    border: 1px solid var(--p-primary-400);
    cursor: pointer;
}

.marker {
    font-size: var(--fs-xlarge);
}

.filename {
    font-size: var(--fs-medium);
    font-family: "Fira Code", monospace;
    font-weight: bold;
    color: var(--p-primary-500);
}

.layer-btn {
    margin-left: auto;
}

:deep(.p-fileupload-basic .p-fileupload-filename) {
    display: none;
}
</style>