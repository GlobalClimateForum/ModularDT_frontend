<script lang="ts" setup>

import { ref, inject, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import ColorPicker from 'primevue/colorpicker';
import Chip from 'primevue/chip';
import InputText from 'primevue/inputtext';
import emojis from '@/assets/emojis.json';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import ToggleSwitch from 'primevue/toggleswitch';
import Tag from 'primevue/tag';
import Listbox from 'primevue/listbox';
import Slider from 'primevue/slider';
import type { Marker, DotStyle, Condition, Rule, ColorKey } from '@/services/map_service';
import { dotMarkerPreview, asHexValue } from '@/services/map_service';
import { getProperties, type PropertyInfo } from '@/services/map_layers_service';
import InputNumber from 'primevue/inputnumber';
import type { Layer } from '@/services/map_service';

const dialogRef = inject('dialogRef') as any;
const layer = computed<Layer | null>(() => dialogRef.value?.data?.layer ?? null);

const MARKERS_KEY = 'markersByType'; // Key to persist markers by type in localStorage
const STORAGE_KEY = 'lastMarker'; // Key to persist the last selected marker in localStorage

const defaultDotStyle = { mode: 'circle', 'circle-radius': 15, 'circle-color': '#EF6F6C', 'circle-stroke-width': 1, 'circle-stroke-color': '#FEB95F' } as const;
const defaultHTMLMarker = `<div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-map-pin">
        <path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 1 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>`
    ;

const layerProperties = ref<PropertyInfo[]>([]);

const ops = [
    { label: 'is', value: '==' },
    { label: 'is not', value: '!=' },
    { label: 'greater than', value: '>' },
    { label: 'less than', value: '<' },
];

const selectedId = ref<'default' | number>('default'); // Selected marker ID for the listbox, can be 'default' or a number for custom rules
const selectedMarker = ref<Marker>(loadMarker()); // Reactive reference to the currently selected marker, initialized with the last saved marker or a default marker

// Computed property to generate the list of items for the listbox based on the selected marker type
const items = computed(() => {
    const m = selectedMarker.value;
    if (m.type !== 'dot') return [];
    return [
        { id: 'default', label: 'Default', style: m.style },
        ...(m.rules ?? []).map((r, i) => ({ id: i, label: `Rule ${i + 1}`, style: { ...m.style, ...r.style } })),
    ];
});

// Helpers for rules
// Returns the currently selected rule based on the selectedID, or returns null if the selected marker is not a dot or if the selectedId is 'default'
const rule = computed(() => typeof selectedId.value === 'number' ? dot.value?.rules?.[selectedId.value] ?? null : null);
// Returns the style of the currently selected rule, or null if no rule is selected
function get<K extends keyof DotStyle>(key: K) { return rule.value?.style[key] ?? dot.value!.style[key]; }
// Sets the style of the currently selected rule, or does nothing if no rule is selected
function set<K extends keyof DotStyle>(key: K, v: DotStyle[K]) { (rule.value ? rule.value.style : dot.value!.style)[key] = v; }
// Checks if a style property is overridden in the currently selected rule, returns true if it is, false otherwise
function isOverridden(key: keyof DotStyle) { return !!rule.value && key in rule.value.style; }
// Resets a style property in the currently selected rule, or does nothing if no rule is selected
function reset(key: keyof DotStyle) { if (rule.value) delete rule.value.style[key]; }
// Sets a color property in the currently selected rule or marker, validating that the value is a valid hex color string before setting it 
function setHex(key: ColorKey, v: string | undefined) {
    if (v && /^#?[0-9a-f]{6}$/i.test(v)) set(key, v.replace('#', ''));
}


// Type definition for Emoji objects, which include code, emoji character, name, category, and subcategory
export type Emoji = { code: string[]; emoji: string; name: string; category: string; subcategory: string };
const emojiCategories = Array.from(new Set(emojis.map(e => e.category))).sort();

const dot = computed(() => selectedMarker.value.type === 'dot' ? selectedMarker.value : null);
const previewStyle = computed(() => items.value.find(i => i.id === selectedId.value)?.style ?? dot.value?.style);

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

function addRule() {
    if (!dot.value) return;
    dot.value.rules ??= [];
    dot.value.rules.push({ conditions: [{ property: '', op: '==', value: '' }], style: {} });
    selectedId.value = dot.value.rules.length - 1;
}

onMounted(async () => {
    const l = layer.value;
    if (!l) return;

    try {
        if (l.properties?.length) {
            layerProperties.value = l.properties;
        } else if (l.file instanceof File) {
            layerProperties.value = await getProperties(l.file);
        } else if (l.path) {
            const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';
            const url = /^(blob:|https?:)/.test(l.path)
                ? l.path
                : `${API_BASE}/${l.path.replace(/^\//, '')}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
            layerProperties.value = await getProperties(new File([await res.blob()], l.name));
        }
    } catch (e) {
        console.error('Could not read layer properties:', e);
    }
});

</script>

<template>
  
    <div class="container">

        <div class="header">
            <div style="display: flex; flex-direction: row; align-items: center; gap: var(--space-small);">
                <i style="color: var(--p-primary-500)" class="material-symbols-outlined">point_scan</i>
                <h1 class="dashboard_label">Point Marker</h1>
            </div>
            <SelectButton :modelValue="selectedMarker.type" :options="['dot', 'emoji', 'html']"
                @update:modelValue="onChangeMarkerType" :allowEmpty="false" />
            <Button label="Save" @click="save" :disabled="!selectedMarker" />
        </div>

        <div class="marker-editor" v-if="dot">

            <div>
                <Listbox v-model="selectedId" :options="items" optionValue="id" class="rule-list">
                    <template #option="{ option }">
                        <div class="rule-item">
                            <span class="dot-slot">
                                <div class="mini-dot" :style="dotMarkerPreview(option.style)"></div>
                            </span>
                            <div class="rule-item-label">
                                {{ option.label }}
                            </div>
                        </div>

                    </template>
                </Listbox>

                <Button label="Add Rule" fluid size="small" class="space-above" @click="addRule">
                    <template #icon>
                        <i class="material-symbols-outlined">add</i>
                    </template>
                </Button>

                <!-- <Button label="Clear Rules" text fluid size="small" class="space-below" @click="dot.value!.rules = []">
                    <template #icon>
                        <i class="material-symbols-outlined">delete</i>
                    </template>
                </Button> -->

            </div>
            <div class="marker-controls">

                <!-- Default Marker Settings -->
                <div v-if="dot">

                    <div class="label-container" center style="margin-bottom: var(--space-medium);">
                        <label>Preview</label>
                        <div class="preview">
                            <div class="dot-marker" :style="dotMarkerPreview(previewStyle)"></div>
                        </div>
                    </div>

                    <template v-if="rule">
                        <label>Condition</label>
                        <div v-for="(c, i) in rule.conditions" :key="i" class="condition-row inset-control">
                            <label>When</label>
                            <Select placeholder="property" :options="layerProperties" v-model="c.property"
                                style="width: 160px">
                                <template #option="{ option }">
                                    <div
                                        style="display: flex; flex-direction: row; align-items: center; gap: var(--space-small);">
                                        <Tag severity="info">{{ option?.type }}</Tag>
                                        <span class="property-name">{{ option?.name }}</span>
                                    </div>
                                </template>
                                <template #value="{ value, placeholder }">
                                    <span :class="value?.name ? 'property-name' : 'property-placeholder'">{{ value?.name
                                        ?? placeholder }}</span>
                                </template>
                            </Select>
                            <Select v-model="c.op" :options="ops" optionLabel="label" optionValue="value" size="small"
                                class="logic-operator-select">
                                <template #option="{ option }">
                                    <span class="logic-operator">{{ option.value }}</span>
                                </template>
                                <template #value="{ value }">
                                    <span class="logic-operator">{{ value }}</span>
                                </template>
                            </Select>
                            <div v-if="c.property.type === 'boolean'" class="switch-container"">
                                <label>False</label>
                                <ToggleSwitch v-model="c.value">
                                </ToggleSwitch>
                                <label>True</label>
                            </div>
                            <InputText v-if="c.property.type === 'string'" v-model="c.value" placeholder="value"
                                size="small" />
                            <InputNumber v-if="c.property.type === 'number'" v-model="c.value" placeholder="value"
                                size="small" :maxFractionDigits="6" locale="en-US" />
                        </div>
                    </template>

                    <!-- radius -->
                    <div class="marker-setting">

                        <div class="setting-label">
                            <label>Radius</label>
                            <Chip class="override-chip" removable rounded @remove="reset('circle-radius')"
                                v-if="isOverridden('circle-radius')">
                                <template #icon>
                                    <i class="material-symbols-outlined">masked_transitions</i>
                                </template>
                            </Chip>
                        </div>

                        <InputGroup>
                            <InputGroupAddon>
                                <InputNumber :modelValue="get('circle-radius')"
                                    @update:modelValue="v => v != null && set('circle-radius', v)" :min="10" :max="40"
                                    suffix="px" style="width: 70px" />
                            </InputGroupAddon>
                            <InputGroupAddon
                                style="flex: 1; display: flex; align-items: center; flex-direction: row; gap: var(--space-medium);">
                                <label>10px</label>
                                <Slider :modelValue="get('circle-radius')" style="width: 100%"
                                    @update:modelValue="v => set('circle-radius', v as number)" :min="10" :max="40" />
                                <label>40px</label>
                            </InputGroupAddon>
                        </InputGroup>
                    </div>

                    <!-- stroke -->
                    <div class="marker-setting">

                        <div class="setting-label">
                            <label>Stroke</label>
                            <Chip class="override-chip" removable rounded @remove="reset('circle-stroke-width')"
                                v-if="isOverridden('circle-stroke-width')">
                                <template #icon>
                                    <i class="material-symbols-outlined">masked_transitions</i>
                                </template>
                            </Chip>
                        </div>

                        <InputGroup>
                            <InputGroupAddon>
                                <InputNumber :modelValue="get('circle-stroke-width')"
                                    @update:modelValue="v => v != null && set('circle-stroke-width', v)" :min="0"
                                    :max="10" style="width: 70px" suffix="px" />
                            </InputGroupAddon>
                            <InputGroupAddon
                                style="flex: 1; display: flex; align-items: center; flex-direction: row; gap: var(--space-medium);">
                                <label>0px</label>
                                <Slider style="width: 100%" :modelValue="get('circle-stroke-width')"
                                    @update:modelValue="v => set('circle-stroke-width', v as number)" :min="0"
                                    :max="10" />
                                <label>10px</label>
                            </InputGroupAddon>
                        </InputGroup>
                    </div>

                    <!-- fill color -->
                    <div class="color-setting-row">
                        <div class="marker-setting">

                            <div class="setting-label">
                                <label>Fill Color</label>
                                <Chip class="override-chip" removable rounded @remove="reset('circle-color')"
                                    v-if="isOverridden('circle-color')">
                                    <template #icon>
                                        <i class="material-symbols-outlined">masked_transitions</i>
                                    </template>
                                </Chip>
                            </div>

                            <InputGroup>
                                <InputGroupAddon>
                                    <ColorPicker :modelValue="get('circle-color')" class="color-container"
                                        @update:modelValue="v => set('circle-color', v)" />
                                </InputGroupAddon>
                                <InputGroupAddon>
                                    <InputText style="width: 100px;" :modelValue="asHexValue(get('circle-color'))"
                                        @update:modelValue="v => setHex('circle-color', v)" />
                                </InputGroupAddon>
                            </InputGroup>
                        </div>

                        <div class="marker-setting">

                            <div class="setting-label">
                                <label>Stroke Color</label>
                                <Chip class="override-chip" removable rounded @remove="reset('circle-stroke-color')"
                                    v-if="isOverridden('circle-stroke-color')">
                                    <template #icon>
                                        <i class="material-symbols-outlined">masked_transitions</i>
                                    </template>
                                </Chip>
                            </div>

                            <InputGroup>
                                <InputGroupAddon>
                                    <ColorPicker :modelValue="get('circle-stroke-color')" class="color-container"
                                        @update:modelValue="v => set('circle-stroke-color', v)" />
                                </InputGroupAddon>
                                <InputGroupAddon>
                                    <InputText style="width: 100px;"
                                        :modelValue="asHexValue(get('circle-stroke-color'))"
                                        @update:modelValue="v => setHex('circle-stroke-color', v)" />
                                </InputGroupAddon>
                            </InputGroup>
                        </div>
                    </div>

                </div>

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
    </div>

</template>

<style scoped>
.header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.setting-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-small);
    height: 30px;
}

.marker-menu {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    padding: var(--space-medium);
    align-items: center;
    width: 100%;
    height: 100%;
}

.override-chip {
    margin-bottom: 0;
    padding: calc(var(--space-small) / 2) var(--space-small);
    width: fit-content;
    background-color: var(--p-primary-100);
    color: var(--p-primary-700);
    font-size: var(--fs-small);

    i {
        font-size: var(--fs-medium);
    }
}

.rule-list {
    height: 90%;
    width: 100%;
    overflow-y: auto;
}

.override-chip :deep(.p-chip-remove-icon) {
    color: var(--p-primary-700);
}

.marker-editor {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 3fr);
    gap: var(--space-medium);
    width: 100%;
    height: 500px;
}

.marker-controls {
    border-radius: var(--br-small);
    border: 1px solid var(--p-primary-500);
    padding: var(--space-large);
}

.color-setting-row {
    display: flex;
    flex-direction: row;
    gap: var(--space-xlarge);
}

.color-setting-row .marker-setting {
    width: auto;
}

.marker-setting {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: var(--space-small) 0;
    gap: var(--space-small);
}

.space-above {
    margin-top: var(--space-small);
}

.space-below {
    margin-bottom: var(--space-small);
}

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

.dot-slot {
    position: relative;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    top: calc(50% - 12px);
}

.rule-item {
    display: flex;
    align-items: center;
    gap: var(--space-small);
    width: 100%;
    justify-content: space-between;
}

.rule-item-label {
    flex: 1;
    min-width: 0;
    margin: 0;
    color: var(--p-primary-700);
    font-size: var(--fs-medium);
    text-align: right;
    color: var(--p-primary-700);
    font-family: 'Fira Code', monospace;
    font-size: var(--fs-small);
    letter-spacing: 0.1px;
}

.mini-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
}

:deep(.p-listbox-option) {
    overflow: hidden;
}

.knob-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.color-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}


.color-container :deep(.p-colorpicker-preview) {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 5px solid var(--p-primary-100);
}

.condition-row {
    display: flex;
    align-items: center;
    gap: var(--space-small);
    margin-bottom: var(--space-medium);
    padding: var(--space-small);
    border: 1px solid var(--p-primary-300);
}

.condition-row>* {
    min-width: 0;
}

.condition-row :deep(.p-inputtext) {
    flex: 1 1 0;
    min-width: 0;
}

.logic-operator-select {
    width: 100px;
    outline: none;
    box-shadow: none;
    background-color: transparent;
    text-align: center;
}

.logic-operator {
    font-family: 'Fira Code', monospace;
    font-size: var(--fs-medium);
    color: var(--p-primary-700);
    text-align: center;
    font-weight: bold;
    width: 100%;
    font-size: var(--fs-medium);
}

.property-name {
    font-family: 'Fira Code', monospace;
    font-size: var(--fs-small) !important;
    color: var(--p-primary-700);
    text-align: left;
    font-weight: bold;
}

.property-placeholder {
    font-family: 'Fira Code', monospace;
    font-size: var(--fs-small) !important;
    color: var(--p-primary-300);
    text-align: left;
    font-weight: normal;
}

.switch-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-small);
    width: 160px;
    justify-content: center;
}
</style>