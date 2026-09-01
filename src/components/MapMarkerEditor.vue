<script lang="ts" setup>

import { ref, inject } from 'vue';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Knob from 'primevue/knob';
import ColorPicker from 'primevue/colorpicker';
import InputText from 'primevue/inputtext';
import emojis from '@/assets/emojis.json';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';


type MarkerStyle =
    | { mode: 'circle'; 'circle-radius': number; 'circle-color': string; 'circle-stroke-width': number; 'circle-stroke-color': string }
    | { mode: 'symbol'; value: string; 'text-size': number; 'text-halo-color': string; 'text-halo-width': number }
    | { mode: 'html'; value: string; size: number; };

export type Marker = { type: 'dot' | 'emoji' | 'html'; value: string; category: string, style: MarkerStyle };
export type Emoji = { code: string[]; emoji: string; name: string; category: string; subcategory: string };

const emojiCategories = Array.from(new Set(emojis.map(e => e.category))).sort();

const dialogRef = inject('dialogRef') as any;
const selectedMarker = ref<Marker>({
    type: 'dot', value: '', category: '', style:
        { mode: 'circle', 'circle-radius': 10, 'circle-color': '#F7F9F9', 'circle-stroke-width': 1, 'circle-stroke-color': '#363946' }
});

function filterEmojisByCategory(category: string) {
    if (!category) return emojis;
    return emojis.filter(e => e.category === category);
}

function selectEmoji(emoji: Emoji) {
    selectedMarker.value.type = 'emoji';
    selectedMarker.value.value = emoji.emoji;
    selectedMarker.value.category = emoji.category;
    selectedMarker.value.style = { mode: 'symbol', value: emoji.emoji, 'text-size': 24, 'text-halo-color': '#ffffff', 'text-halo-width': 2 };
}

function save() {
    dialogRef.value.close(selectedMarker.value);
}
</script>

<template>
    <div class="container">

        <SelectButton v-model="selectedMarker.type" :options="['dot', 'emoji', 'html']" fluid />

        <div v-if="selectedMarker.type === 'dot'" class="marker-controls">

            <div class="knob-container">
                <label>Radius </label>
                <Knob v-model="selectedMarker.style['circle-radius']" :min="10" :max="40" valueTemplate="{value}px" />
            </div>

            <div class="knob-container">
                <label>Stroke Width </label>
                <Knob v-model="selectedMarker.style['circle-stroke-width']" :min="0" :max="10"
                    valueTemplate="{value}px" />
            </div>

            <div class="color-container">
                <label>Fill Color </label>
                <ColorPicker v-model="selectedMarker.style['circle-color']" />
                <InputText size="small" style="width: 100px;" v-model="selectedMarker.style['circle-color']" />
            </div>

            <div class="color-container">
                <label>Stroke Color </label>
                <ColorPicker v-model="selectedMarker.style['circle-stroke-color']" />
                <InputText size="small" style="width: 100px;" v-model="selectedMarker.style['circle-stroke-color']" />
            </div>
        </div>

        <div v-if="selectedMarker.type === 'emoji'"
            style="display: flex; flex-direction: column; align-items: center; gap: var(--space-small);">
            <div class="preview">{{ selectedMarker.value }}</div>
            <Select placeholder="Select Category" fluid :options="emojiCategories" v-model="selectedMarker.category" />
            <div class="inset-control emoji-picker">
                <div v-for="emoji in filterEmojisByCategory(selectedMarker.category)" :key="emoji.code"
                    class="emoji-item" @click="selectEmoji(emoji)">
                    {{ emoji.emoji }}
                </div>
            </div>
        </div>

        <div v-if="selectedMarker.type === 'html'"
            style="display: flex; flex-direction: column; align-items: center; gap: var(--space-small);">
            <div class="preview"></div>
            <Textarea v-model="selectedMarker.value" placeholder="Enter HTML code" rows="5" cols="30" />
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
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-large);
}

.color-container :deep(.p-colorpicker-preview) {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    border: 5px solid var(--p-primary-100);
}
</style>