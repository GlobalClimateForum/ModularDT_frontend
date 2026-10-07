<script setup lang="ts">
import Toolbar from 'primevue/toolbar'
import ToggleSwitch from 'primevue/toggleswitch';
import Button from 'primevue/button'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import InputText from 'primevue/inputtext';
import ColorPicker from 'primevue/colorpicker';
import { useDialog } from 'primevue/usedialog'
import type { Slide } from '@/services/slide_service'


import CustomLayoutDialog from '@/components/CustomLayoutDialog.vue'

import { ref, watch } from 'vue'
import { Color } from 'maplibre-gl';

const emit = defineEmits<{
    (e: 'sectionWidths', layout: number[]): void,
    (e: 'showframe', show: boolean): void,  // emits a boolean value indicating whether to show the frame or not
    (e: 'autosize', autoSize: boolean): void // emits a boolean value indicating whether to auto size or not
    (e: 'bgcolor', color: string): void // emits a Color object representing the selected background color
}>()

const dialog = useDialog();

const props = defineProps<{
    layout?: string,
    widths?: number[],
    showFrame?: boolean,
    autoSizeButton?: boolean
    bgPicker?: boolean
    slide?: Slide
    backgroundColor?: string
}>()

const hexBgColor = ref(props.backgroundColor ?? '')
const currentLayout = ref<string>(props.layout || 'fullscreen');
const currentWidths = ref<number[]>(props.widths || [0.5]);
const showFrame = ref<boolean>(props.showFrame || false);
const autoSize = ref<boolean>(props.autoSizeButton || false);
const isCustom = ref<boolean>(false);

interface Layout {
    id: string;
    label: string;
    widths: number[];
    fractions: number[];
}

const layouts = [
    { id: 'fullscreen', label: 'fullscreen', widths: [1], fractions: [12] },
    { id: 'fiftyfifty', label: '1:1', widths: [0.5, 0.5], fractions: [6, 6] },
    { id: 'golden', label: '3:2', widths: [0.6, 0.4], fractions: [8, 4] },
    { id: 'reversegolden', label: '2:3', widths: [0.4, 0.6], fractions: [4, 8] },
    { id: 'thirds', label: '1|3 each', widths: [1 / 3, 1 / 3, 1 / 3], fractions: [4, 4, 4] },
]

function onCustomLayout() {
    dialog.open(CustomLayoutDialog, {
        props: {
            header: 'Custom Layout',
            style: { width: '400px', height: '380px' },
            maximizable: false,
            modal: true,
        },
        data: { widths: currentWidths.value, slide: props.slide, dialogwidth: 400 },
        emits: {
            onSectionWidths: (widths: number[]) => emit('sectionWidths', [...widths]),
        },
        onClose: (opt) => {
            if (opt?.data) {
                emit('sectionWidths', [...opt.data])
                isCustom.value = true
            }

        },
    });
}
function selectLayout(widths: number[]) {
    emit('sectionWidths', [...widths]);
    isCustom.value = false;
}

function isDisabled(layout: Layout): boolean {
    return layout.widths.length != currentWidths.value.length;
}

function activeLayout(): string {
    return layouts.find(l =>
        l.widths.length === currentWidths.value.length &&
        l.widths.every((w, i) => Math.abs(w - currentWidths.value[i]) < 0.01)
    )?.id ?? ''
}

function onToggleSectionFrame() {
    emit('showframe', showFrame.value);
    return showFrame.value;
}

function onHexInput(v: string | undefined) {
    const hex = (v ?? '').replace('#', '')
    if (/^[0-9a-f]{6}$/i.test(hex)) emit('bgcolor', hex)
}

watch(() => props.widths, (newWidths) => {
    if (newWidths) currentWidths.value = newWidths;
}, { immediate: true });

watch(() => props.layout, (newLayout) => {
    if (newLayout) currentLayout.value = newLayout;
}, { immediate: true });

watch(() => props.backgroundColor, v => { if (v !== undefined) hexBgColor.value = v })

watch(hexBgColor, v => {
    const clean = v.replace(/#/g, '')
    if (clean !== v) { hexBgColor.value = clean; return }  // strip and re-run
    if (/^[0-9a-f]{6}$/i.test(clean)) emit('bgcolor', clean)
})

</script>

<template>
    <div>
        <Toolbar class="">
            <template #start>
                <div class="label-container">
                    <label class="layout-label">Layout</label>
                    <div class="layout-controls ">
                        <div v-for="layout in layouts" :key="layout.id"
                            :class="{ 'layout-btn': true, active: layout.id === activeLayout() && !isCustom, disabled: isDisabled(layout) }"
                            :title="layout.label" @click="selectLayout(layout.widths)">
                            <div class="col-preview">
                                <div v-for="(f, i) in layout.fractions" :key="i" class="col-block"
                                    :style="{ flex: f }" />
                            </div>
                        </div>
                        <Button v-if="currentWidths.length > 1" outlined size="small" label="Custom"
                            @click="onCustomLayout" :class="{ active: isCustom }" />
                    </div>
                </div>
            </template>
            <template #end>
                <div class="layout-btn-controls">
                    <div class="label-container" center>
                        <label for="showFrame">section frame</label>
                        <ToggleSwitch v-model="props.showFrame" @change="onToggleSectionFrame"></ToggleSwitch>
                        <!-- <Button small rounded text @click="showFrame = !showFrame; emit('showframe', showFrame)">
                            <template #icon>
                                <i v-if="showFrame" class="material-symbols-outlined">grid_off</i>
                                <i v-else class="material-symbols-outlined">grid_on</i>
                            </template>
</Button> -->
                    </div>

                    <div class="label-container" center v-if="props.autoSizeButton">
                        <label>auto fit</label>
                        <Button small rounded @click="autoSize = !autoSize; emit('autosize', autoSize)">
                            <template #icon>
                                <i v-if="autoSize" class="material-symbols-outlined">fit_screen</i>
                                <i v-else class="material-symbols-outlined">photo_size_select_small</i>
                            </template>
                        </Button>
                    </div>

                    <div class="label-container">
                        <label>Background Color</label>
                        <InputGroup v-if="props.bgPicker" class="">
                            <InputGroupAddon>
                                <InputText v-model="hexBgColor" size="small" style="width: 80px" />
                            </InputGroupAddon>
                            <InputGroupAddon>
                                <ColorPicker class="background-btn" :modelValue="props.backgroundColor"
                                    @update:modelValue="emit('bgcolor', $event)" />
                            </InputGroupAddon>
                        </InputGroup>
                    </div>


                </div>
            </template>
        </Toolbar>
    </div>
</template>

<style scoped>
.layout-controls {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    box-sizing: border-box;
}

.layout-btn-controls {
    display: flex;
    align-items: flex-start;
    gap: 1.5rem;
}

.disabled {
    opacity: 0.5;
    pointer-events: none;
}

.background-btn :deep(.p-colorpicker-preview) {
    width: 40px;
    height: 40px;
    border-radius: 20px;
    border: 5px solid var(--p-primary-200);
}

.background-btn :deep(.p-colorpicker-preview:focus) {

    border: 5px solid var(--p-primary-400);
    outline: none;
}


.layout-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2rem;
    border-radius: 6px;
    cursor: pointer;
    padding: 5px;
    transition: border-color 0.15s, background 0.15s;
}

.layout-btn:hover {
    border-color: var(--p-primary-400);
    background: var(--p-primary-200);
}

.layout-btn.active {
    border-color: var(--p-primary-400);
    background: var(--p-primary-200);
}


.col-preview {
    display: flex;
    gap: 2px;
    width: 100%;
    height: 100%;
}

.col-block {
    background: var(--p-surface-400);
    border-radius: 2px;
    transition: background 0.15s;
}

.layout-btn:hover .col-block,
.layout-btn.active .col-block {
    background: var(--p-primary-400);
}

.p-button.active {
    background: var(--p-primary-200);
    border: 4px solid var(--p-primary-200);
    background-color: var(--p-primary-400);
    color: var(--text);
    box-sizing: border-box;
    color: white;
}
</style>