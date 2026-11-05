<script lang="ts" setup>

import type { Slide, SlideSection } from '@/services/slide_service'
import { getSlide } from '@/services/slide_service'
import { type ParameterChange } from '@/services/parameterstore_service'
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import ToggleSwitch from 'primevue/toggleswitch';
import parameterStore from '@/services/parameterstore_service'
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{
    slide: Slide,
    targetSlide?: Slide,
    section: SlideSection,
    sectionWidth: number,
    showframe?: boolean,
    preview?: boolean
}>()

const localTargetSlide = ref<Slide | null>(props.targetSlide ?? null)
const preview = ref(props.preview ?? false)

const emit = defineEmits<{
    (e: 'parameterChanged', changePayload: ParameterChange): void
}>()

function onParameterChange(section: SlideSection, key: string, event: any) {
    console.log('Parameter changed:', section.id, key, event)
    const value = event?.target?.value ?? event?.value ?? event
    parameterStore.set({
        section: section.id as number,
        parameter: key,
        value,
    })
}

function initializeParameters(section: SlideSection) {
    if (!preview.value) {
        for (const [key, field] of Object.entries(section?.parameters ?? {})) {
            if (field && field.default !== undefined) {
                parameterStore.set({
                    section: section.id as number,
                    parameter: key,
                    value: field.default,
                })
            }
        }
    }
}

function getDefaultParameterValue(section: SlideSection, key: string) {
    const field = section?.parameters?.[key]
    if (field && field.default !== undefined) {
        return field.default
    }
    return null
}

onMounted(() => {
    if (!props.targetSlide && props.section.content) {
        const targetSlideId = JSON.parse(props.section.content).targetSlide
        getSlide(targetSlideId).then((slide) => {
            localTargetSlide.value = slide.data as Slide
        })
    } else {
        localTargetSlide.value = props.targetSlide ?? null
    }
})

watch(() => props.targetSlide, (newSlide) => {
    if (newSlide) localTargetSlide.value = newSlide
})

watch(localTargetSlide, (newSlide) => {
    if (newSlide) {
        for (const s of newSlide?.sections ?? []) {
            initializeParameters(s)
        }
    }
})

const hexColor = (color: string) => `#${color}`

</script>


<template>
    <div class="section-wrapper" :style="{
        width: props.slide.width * props.sectionWidth + 'px',
        height: props.slide.height + 'px',
        border: props.showframe ? '3px solid var(--accent)' : 'none',
        backgroundColor: section?.properties?.bg ? hexColor(section?.properties?.bg) : 'linear-gradient(135deg, var(--p-primary-700) 0%, var(--p-primary-900) 100%)'
    }">


        <h1 class="dashboard_label header_label">
            {{ localTargetSlide?.name ?? 'Loading...' }} | {{ localTargetSlide?.id ?? 'N/A' }}
        </h1>

        <div v-for="(section, index) in localTargetSlide?.sections ?? []" :key="index" class="controls-container">
            <div v-for="(field, key) in section?.parameters ?? {}" :key="key" class="glass controls">

                <div class="parameter-label">{{ key }}</div>
                <div class="parameter-description">{{ field.description }}</div>

                <div class="label-container" v-if="field && (field.type === 'number' || field.type === 'string')"
                    style="width: 100%;">

                    <InputText :value="field.default" :type="field.type"
                        @change="onParameterChange(section, key, $event)" />

                </div>


                <div v-else-if="field && field.type === 'select'" class="option-buttons">
                    <Button v-for="opt in field.options" :key="opt" :label="opt"
                        :outlined="(parameterStore.get(section.id, key)?.value ?? field.default) !== opt"
                        @click="onParameterChange(section, key, opt)" />
                </div>
                <!-- { "type": "location", "description": "", "range": null, "default": "Neuer See", "options": { "Neuer See": { "coord": [ 13.341956366916861, 52.51158065509287 ], "zoom": 17.44198180716278 }, "Tegeler See": { "coord": [ 13.24091066669098, 52.576390804257784 ], "zoom": 13.497985693034344 }, "Flughafen See": { "coord": [ 13.286433415275269, 52.56767090492565 ], "zoom": 15.414935676552137 }, "Teufelsee": { "coord": [ 13.233772660481577, 52.4912490881689 ], "zoom": 17.466015897115785 }, "Müggelsee": { "coord": [ 13.643570567026018, 52.437180895642484 ], "zoom": 13.812912416756612 } } } -->

                <div v-else-if="field && field.type === 'location'" class="label-container">
                    <label>{{ key }}</label>
                    <div class=" location-select">
                        <div v-for="(option, optionKey) in field?.options" :key="optionKey">
                            <Button @click="onParameterChange(section, key, field.options?.[optionKey])">{{ optionKey
                                }}</Button>
                        </div>
                    </div>
                </div>

                <div v-else-if="field && field.type === 'boolean'" class="label-container boolean-control">

                    <div class="option-buttons">
                        <ToggleSwitch :checked="parameterStore.get(section.id, key)?.value ?? field.default"
                            @change="onParameterChange(section, key, $event)" />
                    </div>
                </div>

            </div>
        </div>

    </div>

</template>


<style scoped>
.header_label {
    font-size: var(--fs-large);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    color: var(--p-primary-50) !important;
    z-index: 100;
}

.parameter-label {
    font-size: var(--fs-xlarge) !important;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    color: var(--p-primary-50) !important;
    font-family: "Fira Code";
}

.parameter-description {
    font-size: var(--fs-large);
    font-style: italic;
    margin-bottom: var(--space-large);
}

.boolean-control {
    flex-direction: row;
    align-items: center;
    gap: var(--space-medium);
}

/* bigger switch: the slide is scaled down */
.boolean-control :deep(.p-toggleswitch) {
    transform: scale(1.6);
    transform-origin: left center;
}

.boolean-value {
    font-size: var(--fs-large);
    font-weight: 600;
    color: var(--p-primary-50);
}

.option-buttons {
    display: flex;
    flex-direction: row;
    gap: var(--space-medium);
}

.option-buttons :deep(.p-button) {
    min-width: 100px;
    min-height: 50px;
    font-size: var(--fs-large);
    flex-wrap: wrap;
}

.section-wrapper {
    position: relative;
    box-sizing: border-box;
    overflow: visible;
    padding: var(--space-large);
    /* background: linear-gradient(135deg, var(--p-primary-700) 0%, var(--p-primary-900) 100%); */
    display: flex;
    flex-direction: column;
    gap: var(--space-medium);
    width: 100%;
}

.section-wrapper::before {
    content: '';
    position: absolute;
    inset: 0;
    /* background:
        radial-gradient(circle at 50% 0%, var(--p-primary-500), transparent 50%),
        radial-gradient(circle at 100% 100%, var(--p-primary-500), transparent 50%); */
    pointer-events: none;
}

.controls-container {
    position: relative;
    padding: var(--space-medium);
    border-radius: var(--br-large);
    display: flex;
    flex-direction: column;
    gap: var(--space-large);
    overflow-y: scroll;
}

.controls {
    overflow: visible;
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    width: 100%;
    padding: var(--space-medium);
    border-radius: var(--br-medium);
}

.controls :deep(label),
.label-container :deep(label) {
    font-size: var(--fs-medium) !important;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    color: var(--p-primary-50) !important;
}

.controls :deep(.p-inputtext) {
    width: 100%;
    height: 50px;
    font-size: var(--fs-large);
    background-color: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--br-medium);
    color: var(--p-primary-50);
    transition: border-color 0.15s ease, background-color 0.15s ease;
}

.controls :deep(.p-inputtext:focus) {
    border-color: var(--accent);
    background-color: rgba(0, 0, 0, 0.35);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
}

.controls :deep(.p-select) {
    height: 50px;
    font-size: var(--fs-large);
    background-color: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--br-medium);
    color: var(--p-primary-50);
    transition: border-color 0.15s ease;
    position: relative;
}

.controls :deep(.p-select-overlay) {
    position: absolute !important;
    top: calc(100% + 4px) !important;
    left: 0 !important;
    width: 100% !important;
    min-width: 0 !important;
    transform: none !important;
    z-index: 50;
}

.controls :deep(.p-select-option) {
    font-size: var(--fs-large);
    color: var(--p-surface-800);
}

.controls :deep(.p-select-option.p-select-option-selected) {
    color: var(--p-primary-600);
    font-weight: 600;
}

.controls :deep(.p-select-label) {
    display: flex;
    align-items: center;
    font-size: var(--fs-large);
    background-color: transparent;
    color: var(--p-primary-50);
}

.location-select {
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    gap: var(--space-medium);
    padding: var(--space-small);
}
</style>