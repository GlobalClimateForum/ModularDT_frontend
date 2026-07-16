<script lang="ts" setup>

import type { Slide, SlideSection } from '@/services/slide_service'
import { type ParameterChange } from '@/services/parameter_service'
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { parameterStore } from '@/services/parameter_service'


const props = defineProps<{
    slide: Slide,
    targetSlide: Slide,
    section: SlideSection,
    sectionWidth: number,
    showframe?: boolean,
}>()

const emit = defineEmits<{
    (e: 'parameterChanged', changePayload: ParameterChange): void
}>()

function onParameterChange(section: SlideSection, key: string, event: any) {
    const value = event?.target?.value ?? event?.value ?? event
    parameterStore.set({
        section: section.id as number,
        parameter: key,
        value,
    })
}
</script>


<template>

    <div class="section-wrapper" :style="{
        width: props.slide.width * props.sectionWidth + 'px',
        height: props.slide.height + 'px',
        border: props.showframe ? '3px solid var(--accent)' : 'none',
    }">
        <div v-for="(section, index) in props.targetSlide?.sections ?? []" :key="index" class="controls-container">
            <div v-for="(field, key) in section?.parameters ?? {}" :key="key" class="controls">
                <div class="label-container" v-if="field && (field.type === 'number' || field.type === 'string')"
                    style="width: 100%;">
                    <label>{{ key }}</label>
                    <InputText :value="field.default" :type="field.type" @change="onParameterChange(section, key, $event)" />
                </div>

                <div v-else-if="field && field.type === 'select'" class="label-container">
                    <label>{{ key }}</label>
                    <Select :options="field?.options" @change="onParameterChange(section, key, $event)" />
                </div>
            </div>
        </div>

    </div>

</template>


<style scoped>
.section-wrapper {
    position: relative;
    box-sizing: border-box;
    overflow: hidden;
    padding: var(--space-large);
    background: linear-gradient(135deg, var(--p-primary-700) 0%, var(--p-primary-900) 100%);

    display: flex;
    flex-direction: column;
    width: 100%;
}

.controls-container {
    padding: var(--space-medium);
    border-radius: var(--br-large);
}

.controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-medium);
    width: 100%;
    padding: var(--space-medium);
}

.controls :deep(.p-inputtext) {
    width: 100%;
    height: 50px; 
    font-size: var(--fs-large);
}

.controls :deep(.p-select) {
    height: 50px;
    font-size: var(--fs-large);
}
.controls :deep(.p-select-label) {
    display: flex;
    align-items: center;
    font-size: var(--fs-large);
}



</style>