<script lang="ts" setup>
import type { Slide, SlideSection } from '@/services/slide_service';
import { computed, defineAsyncComponent, shallowRef, watchEffect } from 'vue';
import * as Vue from 'vue';
import { loadModule, type Options } from 'vue3-sfc-loader';

const props = defineProps<{
    slide: Slide,
    section: SlideSection,
    sectionWidth: number,
    showframe?: boolean,
    shadow?: boolean,
}>()

const dynamicComponent = shallowRef<any>(null)

watchEffect(() => {
    if (props.section.mode !== 'vue') {
        dynamicComponent.value = null
        return
    }
    const code = props.section.content
    const options: Options = {
        moduleCache: { vue: Vue },
        getFile: async () => code,
        addStyle(styleStr) {
            const style = document.createElement('style')
            style.textContent = styleStr
            document.head.appendChild(style)
        },
    }
    dynamicComponent.value = defineAsyncComponent(() =>
        loadModule('dynamic.vue', options)
    )
})
</script>

<template>
    <h1>{{ props.section.mode }}</h1>
    <div :style="{ backgroundColor: 'transparent', width: props.slide.width * props.sectionWidth + 'px', height: props.slide.height + 'px', overflow: 'hidden', position: 'relative' }">

        <div v-if="props.section.mode === 'html'" v-html="props.section.content"
            :style="{ width: props.slide.width * props.sectionWidth + 'px', height: props.slide.height + 'px', overflow: 'hidden' }">
        </div>
        <div v-else-if="props.section.mode === 'vue'"
            :style="{ width: props.slide.width * props.sectionWidth + 'px', height: props.slide.height + 'px', overflow: 'hidden' }">
            <component :is="dynamicComponent" />
        </div>
    </div>
</template>

<style scoped>
/* unchanged */
</style>

<style scoped>
h1 {
    position: absolute;
    top: 35%;
    left: 50%;
    transform: translateX(-50%);
    color: lightcoral;
    font-size: 150pt;
    line-height: 1;
    text-align: center;
    font-family: 'Roboto', sans-serif;
    font-weight: bold;
    z-index: 999;
}
</style>