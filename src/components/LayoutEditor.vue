<script setup lang="ts">
import Toolbar from 'primevue/toolbar'
import ToggleSwitch from 'primevue/toggleswitch';
import Button from 'primevue/button'
import { ref, watch } from 'vue'

const emit = defineEmits<{
    (e: 'sectionWidths', layout: number[]): void,
    (e: 'showframe', show: boolean): void // emits a boolean value indicating whether to show the frame or not
}>()

const props = defineProps<{
    layout?: string,
    widths?: number[],
    showFrame?: boolean
}>()

const currentLayout = ref<string>(props.layout || 'fullscreen');
const currentWidths = ref<number[]>(props.widths || [0.5]);
const showFrame = ref<boolean>(props.showFrame || false);

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

function selectLayout(widths: number[]) {
    emit('sectionWidths', [...widths]);
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

watch(() => props.widths, (newWidths) => {
    if (newWidths) currentWidths.value = newWidths;
}, { immediate: true });

watch(() => props.layout, (newLayout) => {
    if (newLayout) currentLayout.value = newLayout;
}, { immediate: true });

</script>

<template>
    <div >
        <Toolbar class="">
            <template #start>
                <div class="label-container">
                    <label class="layout-label">Layout</label>
                    <div class="layout-controls ">
                        <div v-for="layout in layouts" :key="layout.id"
                            :class="{ 'layout-btn': true, active: layout.id === activeLayout(), disabled: isDisabled(layout) }"
                            :title="layout.label" @click="selectLayout(layout.widths)">
                            <div class="col-preview">
                                <div v-for="(f, i) in layout.fractions" :key="i" class="col-block"
                                    :style="{ flex: f }" />
                            </div>
                        </div>
                    </div>
                </div>
            </template>
            <template #end>
                <div class="label-container">
                    <label for="showFrame">Show Frame</label>
                    <Button small rounded  @click="showFrame = !showFrame; emit('showframe', showFrame)">
                        <i v-if="showFrame" class="material-symbols-outlined">grid_off</i>
                        <i v-else class="material-symbols-outlined">grid_on</i>
                    </Button>
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
}

.disabled {
    opacity: 0.5;
    pointer-events: none;
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
</style>