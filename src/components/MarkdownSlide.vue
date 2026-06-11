<script lang="ts" setup>

import type { Slide } from '@/services/slide_service';
import { renderSlide } from '@/services/slide_service';
import { ref, watch } from 'vue';

const props = defineProps<{ slide: Slide | null }>();
const slideView = ref('');


function showSlide(slide: Slide) {
    renderSlide(slide.markdown).then((response) => {
        const { html, css } = response.data
        slideView.value = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`
    }).catch((error) => {
        console.error("Error rendering slide:", error)
    })
}
watch(
    () => props.slide,
    (newSlide) => {
        if (newSlide) showSlide(newSlide)
        else slideView.value = ''
    },
    { immediate: true }
)
</script>


<template>
        <iframe class="slide-iframe" :srcdoc="props.slide ? slideView : ''" sandbox="allow-same-origin" title="Slide preview"></iframe>
</template>

<style scoped>
.slide-iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: var(--br-medium);
    display: block;
    box-shadow: 0 0 10px 5px var(--p-primary-200);
}
</style>