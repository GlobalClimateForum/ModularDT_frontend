<script lang="ts" setup>

import { ref, inject, computed } from 'vue';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Knob from 'primevue/knob';
import ColorPicker from 'primevue/colorpicker';
import InputText from 'primevue/inputtext';
import emojis from '@/assets/emojis.json';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';

const MARKERS_KEY = 'markersByType';

export type Marker =
    | { type: 'dot'; value: string; category: string; style: { mode: 'circle'; 'circle-radius': number; 'circle-color': string; 'circle-stroke-width': number; 'circle-stroke-color': string } }
    | { type: 'emoji'; value: string; category: string; style: { mode: 'symbol'; value: string; 'text-size': number; } }
    | { type: 'html'; value: string; category: string; style: { mode: 'html'; value: string; size: number } };

export type Emoji = { code: string[]; emoji: string; name: string; category: string; subcategory: string };

const emojiCategories = Array.from(new Set(emojis.map(e => e.category))).sort();

const defaultHTMLMarker = `<div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-map-pin">
        <path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 1 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>`

const defaultDotStyle = { mode: 'circle', 'circle-radius': 15, 'circle-color': '#EF6F6C', 'circle-stroke-width': 1, 'circle-stroke-color': '#FEB95F' } as const;

const STORAGE_KEY = 'lastMarker';

const dialogRef = inject('dialogRef') as any;
const selectedMarker = ref<Marker>(loadMarker());

function filterEmojisByCategory(category: string) {
    if (!category) return emojis;
    return emojis.filter(e => e.category === category);
}

function loadAllMarkers(): Partial<Record<Marker['type'], Marker>> {
    try {
        return JSON.parse(localStorage.getItem(MARKERS_KEY) ?? '{}');
    } catch {
        return {};
    }
}

function defaultMarker(type: Marker['type']): Marker {
    switch (type) {
        case 'dot':
            return { type, value: '', category: '', style: { ...defaultDotStyle } };
        case 'emoji':
            return { type, value: '', category: '', style: { mode: 'symbol', value: '', 'text-size': 24 } };
        case 'html':
            return { type, value: '', category: '', style: { mode: 'html', value: defaultHTMLMarker, size: 24 } };
    }
}

function onChangeMarkerType(type: Marker['type']) {
    const all = loadAllMarkers();
    all[selectedMarker.value.type] = selectedMarker.value;
    localStorage.setItem(MARKERS_KEY, JSON.stringify(all));
    selectedMarker.value = all[type] ?? defaultMarker(type);
}

// Function to get the last saved marker from localStorage, or return a default marker if none is found
function loadMarker(): Marker {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch { }
    return { type: 'dot', value: '', category: '', style: { ...defaultDotStyle } };
}


const asHexValue = computed(() => (value: string) => {
    if (value.startsWith('#')) {
        return value;
    }
    return '#' + value;
});

function selectEmoji(emoji: Emoji) {
    selectedMarker.value.type = 'emoji';
    selectedMarker.value.value = emoji.emoji;
    selectedMarker.value.category = emoji.category;
    selectedMarker.value.style = { mode: 'symbol', value: emoji.emoji, 'text-size': 24 };
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedMarker.value));
    dialogRef.value.close(selectedMarker.value);
}

</script>

<template>
    <div class="container">

        <SelectButton :modelValue="selectedMarker.type" :options="['dot', 'emoji', 'html']"
            @update:modelValue="onChangeMarkerType" :allowEmpty="false" fluid />

        <div v-if="selectedMarker.type === 'dot'" class="preview">
            <div class="dot-marker" :style="{
                width: selectedMarker.style['circle-radius'] * 2 + 'px',
                height: selectedMarker.style['circle-radius'] * 2 + 'px',
                backgroundColor: asHexValue(selectedMarker.style['circle-color']),
                border: selectedMarker.style['circle-stroke-width'] + 'px solid ' + asHexValue(selectedMarker.style['circle-stroke-color'])
            }"></div>
        </div>

        <div v-if="selectedMarker.type === 'dot'" class="marker-controls">

            <div class="knob-container">
                <label>Radius </label>
                <Knob v-model="selectedMarker.style['circle-radius']" :min="10" :max="40" valueTemplate="{value}px" />
                <!-- <Button label="Function">
                    <template #icon>
                        <i class="material-symbols-outlined">function</i>
                    </template>
</Button> -->
            </div>

            <div class="knob-container">
                <label>Stroke Width </label>
                <Knob v-model="selectedMarker.style['circle-stroke-width']" :min="0" :max="10"
                    valueTemplate="{value}px" />
            </div>

            <div class="color-container">
                <label>Fill Color </label>
                <ColorPicker mode="hex" v-model="selectedMarker.style['circle-color']" />
                <InputText size="small" style="width: 100px;"
                    :value="asHexValue(selectedMarker.style['circle-color'])" />
            </div>

            <div class="color-container">
                <label>Stroke Color </label>
                <ColorPicker mode="hex" v-model="selectedMarker.style['circle-stroke-color']" />
                <InputText size="small" style="width: 100px;"
                    :value="asHexValue(selectedMarker.style['circle-stroke-color'])" />
            </div>
        </div>

        <div v-if="selectedMarker.type === 'emoji'"
            style="display: flex; flex-direction: column; align-items: center; gap: var(--space-small);">
            <div class="preview">{{ selectedMarker.value }}</div>
            <Select placeholder="Select Category" fluid :options="emojiCategories" v-model="selectedMarker.category" />
            <div class="inset-control emoji-picker">
                <div v-for="emoji in filterEmojisByCategory(selectedMarker.category)" class="emoji-item"
                    @click="selectEmoji(emoji)">
                    {{ emoji.emoji }}
                </div>
            </div>
        </div>

        <div v-if="selectedMarker.type === 'html'"
            style="display: flex; flex-direction: column; align-items: center; gap: var(--space-small);">
            <div class="preview">
                <iframe class="htmlmarker" :srcdoc="selectedMarker.style.value"
                    style="width: 100%; height: 100%; border: none;"></iframe>
            </div>
            <Textarea v-model="selectedMarker.style.value" placeholder="Enter HTML code" rows="10" cols="60" />
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

.preview {
    font-size: 3rem;
    text-align: center;
    background-color: var(--p-primary-100);
    border: 2px solid var(--p-primary-200);
    border-radius: var(--br-medium);
    padding: var(--space-small);

    width: 80px;
    height: 80px;
    border-radius: 50%;

    box-shadow: var(--shadow-light);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
}

.htmlmarker {
    width: 100%;
    height: 100%;
    border: none;
}

.emoji-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
    gap: var(--space-small);
    font-size: var(--fs-large);
    padding: var(--space-small);
    width: 300px;
    height: 200px;
    border-radius: var(--br-medium);
    overflow-y: auto;
}

.emoji-item {
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: transform 0.2s ease-in-out;
    width: 40px;
    height: 40px;
    border-radius: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.emoji-item:hover {
    transform: scale(1.1);
    background-color: var(--p-primary-50);
    border: 2px solid var(--p-primary-200);
}

.dot-marker {
    border-radius: 50%;
    max-width: 100%;
    max-height: 100%;
}

.knob-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: var(--space-small);
}

.color-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: var(--space-small);
}

.marker-controls {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    gap: var(--space-large);
}

.color-container :deep(.p-colorpicker-preview) {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    border: 5px solid var(--p-primary-100);
}
</style>