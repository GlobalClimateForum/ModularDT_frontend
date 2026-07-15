<script lang="ts" setup>

import type { Slide, SlideSection } from '@/services/slide_service'
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';

const props = defineProps<{
    slide: Slide,
    targetSlide: Slide,
    section: SlideSection,
    sectionWidth: number,
    showframe?: boolean,
}>()

</script>


<template>

    <div class="section-wrapper" :style="{
        width: props.slide.width * props.sectionWidth + 'px',
        height: props.slide.height + 'px',
        border: props.showframe ? '3px solid var(--accent)' : 'none',
    }">
        <div style="font-size: 40px; color: white;">
            <div v-for="(section, index) in props.targetSlide?.sections ?? []" :key="index">
                
                <div v-for="(field, key) in section?.parameters ?? {}" :key="key" class="controls">
                   
                    <div class="label-container" v-if="field && (field.type === 'number' || field.type === 'string')"
                        style="width: 100%;">
                        <label>{{ key }}</label>
                        <InputText :value="field.default" :type="field.type" />
                    </div>

                    <div v-else-if="field && field.type === 'select'" class="label-container" style="width: 100%;">
                        <label>{{ key }}</label>
                        <Select :options="field?.options" />
                    </div>

                </div>

            </div>
        </div>

    </div>

</template>


<style scoped>
.section-wrapper {
    position: relative;
    flex-shrink: 0;
    box-sizing: border-box;
    overflow: hidden;

    padding: var(--space-large);
}

.controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-medium);

    width: 100%;
    align-items: center;
    justify-content: center;

    padding: var(--space-medium);
}

</style>