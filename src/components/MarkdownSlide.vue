<script setup lang="ts">

import type { Slide, SlideSection } from '@/services/slide_service';
import { renderSlide } from '@/services/slide_service';
import { ref, watch } from 'vue';

const props = defineProps<{
    slide: Slide,
    section: SlideSection,
    sectionWidth: number
    showframe?: boolean
    shadow?: boolean
}>()

const marpDocument = ref<string>("");
const isRendering = ref(false);

function toDocument(html: string, css: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${css}</style>
        </head>
        <body>
            ${html}
        </body>
        </html>
    `;
}

async function getMarpContent() {
    const renderWidth = props.slide.width * props.sectionWidth;
    isRendering.value = true;
    try {
        const content = await renderSlide(props.section.content, renderWidth, props.slide.height);
        marpDocument.value = toDocument(content.data.html, content.data.css);
    } catch (error) {
        console.error("Error rendering slide:", error);
    } finally {
        isRendering.value = false;
    }
}

watch(
    () => [props.section.content, props.sectionWidth],
    () => { getMarpContent(); },
    { immediate: true }
);
</script>

<template>
    <div class="section-wrapper" :style="{
        width: props.slide.width * props.sectionWidth + 'px',
        height: props.slide.height + 'px',
        border: props.showframe ? '3px solid var(--accent)' : 'none',
        boxShadow: props.shadow ? '-2px 5px 32px -1px rgba(0,0,0,0.48);' : 'none',

    }">
        <Transition name="spinner">
            <div v-if="isRendering" class="spinner-overlay">
                <i class="material-symbols-outlined spinning">progress_activity</i>
            </div>
        </Transition>
        <iframe class="marp-iframe" :class="{ rerendering: isRendering }" :srcdoc="marpDocument" :style="{
            width: props.slide.width * props.sectionWidth + 'px',
            height: props.slide.height + 'px',
        }" />
    </div>
</template>

<style scoped>
.section-wrapper {
    position: relative;
    flex-shrink: 0;
    box-sizing: border-box;
    overflow: hidden;
}

.marp-iframe {
    display: block;
    box-sizing: border-box;
    border: none;
    box-shadow: none;
    transition: opacity 0.25s ease, filter 0.25s ease;
    overflow: hidden;
}

.marp-iframe.rerendering {
    opacity: 0.35;
    filter: blur(3px);
}

.spinner-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 10;
    background-color: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(10px);
}

.spinning {
    font-size: 2.5rem;
    color: var(--p-primary-400);
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

/* Spinner fades in/out so it doesn't flash for fast renders */
.spinner-enter-active,
.spinner-leave-active {
    transition: opacity 0.3s ease;
}

.spinner-enter-from,
.spinner-leave-to {
    opacity: 0;
}
</style>