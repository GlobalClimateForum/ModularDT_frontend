<script lang="ts" setup>
import { ref, computed, watch, defineAsyncComponent, onMounted } from 'vue';
import type { Slide, SlideSection, Parameters, LocationValue } from '@/services/slide_service';
import { basemaps } from '@/utils/map_utils';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import '@/assets/main.css';
import FileUpload from 'primevue/fileupload';
import DataView from 'primevue/dataview';
import Tag from 'primevue/tag';
import { useDialog } from 'primevue/usedialog';
import Button from 'primevue/button';
import { type MapProperties, type Layer, saveMapLayer, localMapLayer, identifyVectorType, getMap } from '@/services/map_service';
import { normalizeLayer } from '@/services/map_layers_service';
import { settings } from '@/globals/settings.ts';

const DEFAULT_START_POSITION: [number, number] = [13.350103005033793, 52.51451583081903];
const DEFAULT_START_ZOOM = 2;

const props = defineProps<{
    slide: Slide | null;
    slideSection: SlideSection;
    startPosition?: [number, number];
}>();

const emit = defineEmits<{
    (e: 'basemapUpdated', key: keyof typeof basemaps): void;
    (e: 'contentUpdated', content: string): void;
    (e: 'sectionUpdated', section: SlideSection): void;
}>();

const MapMarkerEditor = defineAsyncComponent(() => import('@/components/MapMarkerEditor.vue'));
const dialog = useDialog();

// --- Local  state ----------------------------------------------------

const existingLayers = ref<Layer[]>([]);
const selectedExistingLayer = ref<Layer | null>(null);
const layers = ref<Layer[]>([]);
const savedPositions = ref<{ name: string; position: [number, number]; zoom: number; inEdit: boolean }[]>([]);
const selectedBasemap = ref<keyof typeof basemaps>('openfreemap_bright');

// The maps initial position is either the first saved position, or the startPosition prop, or a default value.
const startState = computed<{ position: [number, number]; zoom: number }>(() => {
    const first = savedPositions.value[0];
    return first
        ? { position: first.position, zoom: first.zoom }
        : { position: props.startPosition ?? DEFAULT_START_POSITION, zoom: DEFAULT_START_ZOOM };
});

// --- Init Map Editor Settings onMounted  -----------------------------------------

onMounted(async () => {
    try {
        existingLayers.value = await localMapLayer();
        console.log('Existing layers fetched:', existingLayers.value);
    } catch (e) {
        console.error('localMapLayer failed:', e);
        existingLayers.value = [];
    }
    if (props.slideSection.content) {
        const mapProperties: MapProperties = JSON.parse(props.slideSection.content);
        selectedBasemap.value = mapProperties.basemap;
        layers.value = mapProperties.layers ?? [];
        savedPositions.value = mapProperties.positions ?? [];
    } else {
        selectedBasemap.value = 'openfreemap_bright';
        layers.value = [];
        savedPositions.value = [];
        props.slideSection.mode = 'interactive';
    }
});

// --- build location parameters from saved positions -----------

function buildLocationParameter(): Parameters {
    const options: Record<string, LocationValue> = {};
    for (const p of savedPositions.value) {
        const key = p.name.trim();
        if (!key || key in options) continue; // skip empty / duplicate names
        options[key] = { coord: p.position, zoom: p.zoom };
    }
    const keys = Object.keys(options);
    return {
        location: { type: 'location', options, default: keys[0] ?? null },
    };
}

// --- save section + emit content update + emit section update ----------------

function addExistingLayer() {
    if (!selectedExistingLayer.value) return;
    layers.value.push(normalizeLayer({ ...selectedExistingLayer.value, uploaded: true }));
    selectedExistingLayer.value = null;
    saveSection();
}

function saveSection(patch: Partial<SlideSection> = {}) {
    const mapProperties: MapProperties = {
        basemap: selectedBasemap.value,
        startZoom: startState.value.zoom,
        startPosition: startState.value.position,
        layers: layers.value,
        positions: savedPositions.value.map((pos) => ({
            name: pos.name,
            position: pos.position,
            zoom: pos.zoom,
        })),
    };
    const content = JSON.stringify(mapProperties);

    const params = buildLocationParameter();

    props.slideSection.content = content; // keep if the parent still reads contentUpdated
    emit('contentUpdated', content);
    emit('sectionUpdated', {
        ...props.slideSection,
        content,
        parameters: params,
        ...patch,
    });
}

// --- Basemap ----------------------------------------------------------------

const basemapOptions = computed(() => {
    const hasCartoKey = !!settings.value?.carto_api_key && settings.value.carto_api_key.trim() !== '';
    return (Object.keys(basemaps) as (keyof typeof basemaps)[])
        .map((key) => ({ label: basemaps[key].name, value: key }))
        .filter((option) => hasCartoKey || !option.value.startsWith('carto_'));
});

function onChangeBasemap() {
    emit('basemapUpdated', selectedBasemap.value);
    saveSection();
}

// --- Layers -----------------------------------------------------------------

const asHexValue = computed(() => (value: string) => (value.startsWith('#') ? value : '#' + value));

async function onFileSelect(event: { files: File[] }) {
    const newLayers: Layer[] = await Promise.all(
        event.files.map(async (file) => ({
            name: file.name,
            file,
            filetype: file.name.endsWith('.geojson')
                ? 'geojson'
                : file.name.endsWith('.gpkg')
                    ? 'gpkg'
                    : undefined,
            path: URL.createObjectURL(file),
            id: null,
            section: props.slideSection?.id ?? null,
            uploaded: false,
            vectorType: await identifyVectorType(file),
        })),
    );
    layers.value.push(...newLayers);
}

function updateLayer(layer: Layer, idx: number) {
    layers.value[idx] = normalizeLayer(layer);
    saveSection();
}

function uploadLayer(layer: Layer, idx: number) {
    if (layer.uploaded || !(layer.file instanceof File)) return;

    if (!props.slideSection?.id) {
        console.error('SlideSection ID is not available. Cannot upload layer.');
        return;
    }
    saveMapLayer(layer, props.slideSection.id)
        .then((response) => {
            layer.uploaded = true;
            layer.path = response.data.path.replace(/^\//, '');
            layer.id = response.data.id;
            layers.value[idx] = normalizeLayer({ ...layer, uploaded: true, id: response.data.id, path: response.data.path });
            existingLayers.value.push(normalizeLayer({ ...layer, uploaded: true, id: response.data.id, path: response.data.path }));
            saveSection();
        })
        .catch((error) => {
            console.error('Error uploading layer:', error);
        });
}

function openMarkerEditor(item: Layer, idx: number) {
    dialog.open(MapMarkerEditor, {
        props: {
            header: 'Edit Marker',
            modal: true,
            style: { width: '600px', height: '600px' },
        },
        data: { layer: item },
        onClose: (opt) => {
            const result = opt?.data;
            if (result) updateLayer({ ...item, marker: result }, idx);
        },
    });
}

// --- Map navigation ---------------------------------------------------------

function flyToMapPosition(position: [number, number], zoom: number) {
    if (!props.slideSection?.id) return;
    getMap(props.slideSection.id)?.flyToPosition(position, zoom);
}

function jumpToMapPosition(position: [number, number], zoom: number) {
    if (!props.slideSection?.id) return;
    getMap(props.slideSection.id)?.jumpToPosition(position, zoom);
}

function savePosition() {
    if (!props.slideSection?.id) return;
    const current = getMap(props.slideSection.id)?.getCurrentMapPosition();
    if (!current) return;
    savedPositions.value.push({
        name: `Position ${savedPositions.value.length + 1}`,
        position: current.center,
        zoom: current.zoom,
        inEdit: false,
    });
}

watch(savedPositions, () => saveSection(), { deep: true });

</script>

<template>

    <div class="editor-container">

        <!-- <small class="layerinfo">Note: To be rendered properly layers need to be projected to the Web Mercator coordinate
            system. (WGS84; EPSG:4326). You can only upload Files to existing slides.
        </small> -->

        <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center;">
            <h1 style="margin-bottom: 0;" class="dashboard_label">Layer</h1>
            <div style="display: flex; flex-direction: row; gap: var(--space-small); align-items: center;">

                <Select v-model="selectedExistingLayer" :options="existingLayers ?? []" optionLabel="name"
                    placeholder="Add Existing Layer" @change="addExistingLayer" />

                <FileUpload mode="basic" customUpload auto @select="onFileSelect" chooseLabel="Add Layer"
                    :chooseButtonProps="{ severity: 'primary', variant: 'filled' }" />


            </div>
        </div>

        <div class="label-container">
            <DataView :value="layers" layout="list" class="layer-container">
                <template #list="slotProps">
                    <div v-for="(item, i) in slotProps.items" :key="i" class="layer-item">

                        <!-- Map Marker for Layer -->
                        <span>
                            <div class="marker-container" @click="openMarkerEditor(item, i)">
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

                        <div style="display: flex; flex-direction: column; gap: var(--space-small); justify-content: center; align-items: flex-start;">
                            <span class="filename">{{ item.name }}</span>
                            <div style="display: flex; flex-direction: row; gap: var(--space-small); align-items: center;">
                                <Tag v-if="item.uploaded" severity="success" value="Uploaded">
                                    <template #icon>
                                        <i class="material-symbols-outlined">cloud_done</i>
                                    </template>
                                </Tag>
                                <Tag severity="info">
                                    <template #default>
                                        {{ item.vectorType ? item.vectorType.toUpperCase() : 'unknown' }}
                                    </template>
                                    <template #icon>
                                        <i class="material-symbols-outlined"
                                            v-if="item.vectorType == 'point'">point_scan</i>
                                        <i class="material-symbols-outlined"
                                            v-if="item.vectorType == 'polygon'">shapes</i>
                                    </template>
                                </Tag>
                            </div>
                        </div>

                        <div class="layer-controls">
                            <Button @click="uploadLayer(item, i)" size="small" 
                                :disabled="!props.slideSection?.id" v-if="!item.uploaded"
                                label="Upload">
                                <template #icon>
                                    <i class="material-symbols-outlined"
                                        style="font-size: var(--fs-medium);">upload</i>
                                </template>
                            </Button>

                            <!-- <Button  size="small">
                                <template #icon>
                                    <i class="material-symbols-outlined"
                                        style="font-size: var(--fs-medium);">control_point_duplicate</i>
                                </template>
                            </Button> -->
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



        <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center;">
            <h1 class="dashboard_label">Saved Positions</h1>
            <Button label="Save Position" @click="savePosition" :disabled="!props.slideSection?.id">
                <template #icon>
                    <i class="material-symbols-outlined">add</i>
                </template>
            </Button>
        </div>
        <div class="saved_positions inset-control">

            <div v-for="(pos, index) in savedPositions" :key="index" class="position-item">

                <div class="position-header">
                    <h2 style="width: 100%;" v-if="!pos.inEdit">{{ pos.name }}</h2>
                    <InputText fluid v-else v-model="pos.name" />

                    <Button text @click="pos.inEdit = !pos.inEdit">
                        <template #icon>
                            <i class="material-symbols-outlined">{{ pos.inEdit ? 'save' : 'edit' }}</i>
                        </template>
                    </Button>

                    <Button text @click="savedPositions.splice(index, 1)">
                        <template #icon>
                            <i class="material-symbols-outlined">delete</i>
                        </template>
                    </Button>

                    <div class="position-actions">
                        <Button text @click="flyToMapPosition(pos.position, pos.zoom)">
                            <template #icon>
                                <i class="material-symbols-outlined">travel</i>
                            </template>
                        </Button>

                        <Button text @click="jumpToMapPosition(pos.position, pos.zoom)">
                            <template #icon>
                                <i class="material-symbols-outlined">arrow_forward</i>
                            </template>
                        </Button>
                    </div>
                </div>

                <div class="position-controls">
                    <InputText class="coordinate-input pos-coord" :model-value="pos.position.join(', ')"
                        @update:model-value="pos.position = ($event.split(',').map(c => parseFloat(c.trim())) as [number, number]);
                        flyToMapPosition(pos.position, pos.zoom)" :disabled="!props.slideSection?.id"
                        placeholder="Paste WGS84 Coordinate" fluid />

                    <div class="zoom-control">
                        <Button class="zoom-btn" small iconOnly :disabled="pos.zoom <= 1 || !props.slideSection?.id"
                            @click="pos.zoom--; flyToMapPosition(pos.position, pos.zoom)">
                            <template #icon>
                                <i class="material-symbols-outlined" style="font-size: var(--fs-medium);">remove</i>
                            </template>
                        </Button>

                        <InputText class="coordinate-input zoom-value" :disabled="true" v-model="pos.zoom"
                            placeholder="Zoom" />

                        <Button class="zoom-btn" small iconOnly :disabled="pos.zoom >= 23 || !props.slideSection?.id"
                            @click="pos.zoom++; flyToMapPosition(pos.position, pos.zoom)">
                            <template #icon>
                                <i class="material-symbols-outlined" style="font-size: var(--fs-medium);">add</i>
                            </template>
                        </Button>
                    </div>

                    <Button class="current-btn" :disabled="!props.slideSection?.id"
                        @click="const p = getMap(props.slideSection.id)?.getCurrentMapPosition(); if (p) { pos.position = p.center; pos.zoom = p.zoom; }">
                        <template #icon>
                            <i class="material-symbols-outlined" style="font-size: var(--fs-medium);">my_location</i>
                        </template>
                    </Button>
                </div>
            </div>

        </div>


    </div>

</template>

<style scoped>
.editor-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.saved_positions {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    height: 100%;
    padding: var(--space-small);
    overflow-y: auto;
}

.position-item {
    padding: var(--space-small);
    background-color: var(--p-primary-50);
    border-radius: var(--br-medium);
    border: 1px solid var(--p-primary-200);
    box-shadow: var(--shadow-light);
    display: flex;
    flex-direction: column;
    gap: var(--space-small);

    h2 {
        font-size: var(--fs-medium);
        font-family: "Fira Code", monospace;
        font-weight: bold;
        margin: 0;
        color: var(--p-primary-500);
    }
}

.position-header {
    display: flex;
    flex-direction: row;
    gap: var(--space-small);
    align-items: center;
}

.position-actions {
    border: 1px solid var(--p-primary-200);
    border-radius: var(--br-medium);
    display: flex;
    flex-direction: row;
    gap: var(--space-small);
    align-items: center;
    margin-left: auto;
}

.position-controls {
    display: flex;
    flex-direction: row;
    gap: var(--space-small);
    align-items: center;
    width: 100%;
}

.pos-coord {
    flex: 1 1 auto;
    min-width: 0;
}

.zoom-control {
    display: flex;
    flex-direction: row;
    gap: var(--space-small);
    align-items: center;
    flex: 0 0 auto;
}

.zoom-btn {
    width: 2.5rem;
    height: 2.5rem;
    flex: 0 0 auto;
    padding: 0;
}

.zoom-value {
    width: 4rem;
    flex: 0 0 auto;
    text-align: center;
}

.current-btn {
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    flex: 0 0 auto;
}

.coordinate-input {
    font-family: "Fira Code", monospace;
    font-size: var(--fs-medium);
    text-align: center;
}

.layerinfo {
    margin: none;
    padding: none;
    font-size: var(--fs-medium);
    color: var(--p-primary-500);
}

.layer-container {
    height: 200px;
    overflow-y: auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    border-top: 1px solid var(--p-primary-500);
    border-bottom: 1px solid var(--p-primary-500);
    padding: var(--space-small)
}

.dark-mode .layer-item {
    background-color: var(--p-primary-800);
    border: 1px solid var(--p-primary-400);
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
    box-shadow: var(--shadow-light);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    background-color: var(--surface);
}

.dark-mode .marker-container {
    background-color: var(--surface-dark);
}

.marker-container:hover {
    box-shadow: var(--shadow-dark);
    border: 1px solid var(--p-primary-400);
    cursor: pointer;
}

.marker {
    font-size: var(--fs-xlarge);
}

.dark-mode .filename {
    color: var(--p-primary-50);
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