<script setup lang="ts">
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Slider from 'primevue/slider'
import { ref, computed, inject } from 'vue'
import type { Slide } from '@/services/slide_service'
import '@/assets/main.css'

const dialogRef = inject('dialogRef') as any
const data = dialogRef.value.data
const dialogWidth = ref<number>(data?.dialogwidth ?? 400)
const slide = ref(scaleSlideDimensions(data?.slide ?? { width: 800, height: 600 }))
const widths = ref<number[]>([...(data?.widths ?? [0.5, 0.5])])

// Slider value = positions of the cuts between sections
const MIN = 0.05 // smallest allowed section width (5%)

const cuts = computed<number | number[]>({
    get: () => {
        let sum = 0
        const c = widths.value.slice(0, -1).map(w => (sum += w))
        return c.length === 1 ? c[0] : c
    },
    set: (v) => {
        const c = Array.isArray(v) ? [...v] : [v]
        if (c.length === 2) {
            const [oldLeft] = cuts.value as number[]
            if (c[0] !== oldLeft) c[0] = Math.min(c[0], c[1] - MIN) // left handle moved
            else c[1] = Math.max(c[1], c[0] + MIN)                  // right handle moved
        }
        const clamped = c.map(x => Math.min(Math.max(x, MIN), 1 - MIN))
        const points = [0, ...clamped, 1]
        widths.value = points.slice(1).map((p, i) => +(p - points[i]).toFixed(2))
    },
})

function scaleSlideDimensions(slide: Slide) {
    const maxWidth = dialogWidth.value * 0.8
    const scale = Math.min(1, maxWidth / slide.width)
    return { width: Math.round(slide.width * scale), height: Math.round(slide.height * scale) }
}

// Center of each section, used to position its input
const centers = computed(() => {
    let start = 0
    return widths.value.map(w => {
        const c = start + w / 2
        start += w
        return c
    })
})

// Set one width; the others share the remaining space in their current ratio
function setWidth(i: number, v: number) {
    v = Math.min(Math.max(v, 0), 1)
    const rest = widths.value.reduce((s, w, j) => (j === i ? s : s + w), 0)
    const others = widths.value.length - 1
    widths.value = widths.value.map((w, j) =>
        j === i ? v : +((rest ? w / rest : 1 / others) * (1 - v)).toFixed(2))
}

function apply() {
    dialogRef.value.close([...widths.value])
}

</script>

<template>
    <div class="custom-layout-dialog">
        <div class="slide-frame" :style="{ width: slide.width + 'px' }">
            <div class="hand-container inset-control"
                :style="slide.width ? { width: slide.width + 'px', height: slide.height + 'px' } : {}">
                <div class="hand" v-for="(cut, i) in [cuts].flat()" :key="i" :style="{ left: cut * 100 + '%' }" />
                <InputNumber v-for="(w, i) in widths" :key="'w' + i" class="width-input"
                    :style="{ left: (centers[i] * 100) + '%' }"
                    :inputStyle="{ width: '3.5rem', textAlign: 'center', padding: '0.25rem' }"
                    :modelValue="Math.round(w * 100)" @update:modelValue="v => v != null && setWidth(i, v / 100)"
                    :min="0" :max="100" suffix="%" />
            </div>
            <div class="slider-wrap">

                <Slider v-if="widths.length > 1" v-model="cuts" :range="widths.length === 3" :step="0.01" :min="0"
                    :max="1" />
                <div class="scale">
                    <span v-for="t in [0, 0.25, 0.5, 0.75, 1]" :key="t">{{ t * 100 }}%</span>
                </div>

            </div>
        </div>
        <Button size="small" label="Apply" @click="apply" />
    </div>
</template>

<style scoped>
.custom-layout-dialog {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-small);
    overflow: hidden;
}

.hand-container {
    position: relative;
    height: 200px;
    width: 100%;
}

.hand {
    position: absolute;
    top: 0;
    width: 2px;
    height: 100%;
    background: red;
    transform: translateX(-50%);
}

.width-input {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 50px;
}

.slider-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    padding: var(--space-small) 0;
}

.scale {
    display: flex;
    justify-content: space-between;
    font-size: var(--fs-small);
    color: var(--p-primary-700);
}

.slider-wrap :deep(.p-slider-range) {
    background: transparent;
}
</style>