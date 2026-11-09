<script setup lang="ts">

import type { Slide, SlideSection } from '@/services/slide_service';
import { renderSlide } from '@/services/slide_service';
import { ref, watch, computed, onBeforeUnmount } from 'vue';

const props = defineProps<{
    slide: Slide,
    section: SlideSection,
    sectionWidth: number
    shadow?: boolean
}>()

const marpDocument = ref<string>("");
const isRendering = ref(false);
const bgColor = computed(() => {
    const color = props.section.properties?.bg?.trim() || 'transparent';
    return /^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color) ? `#${color}` : color;
});
let bgTimer: ReturnType<typeof setTimeout> | undefined;
let renderVersion = 0;

function toDocument(html: string, css: string | undefined, backgroundColor: string): string {
    // The server can return a complete document or separate Marp HTML/CSS.
    // Parse either form instead of nesting a full document inside another body.
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (css) {
        const themeStyle = doc.createElement('style');
        themeStyle.textContent = css;
        doc.head.append(themeStyle);
    }

    const frameStyle = doc.createElement('style');
    frameStyle.textContent = `
        :root { color-scheme: light; }
        html, body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: transparent !important;
        }
        /* An iframe's outer background does not override the Marp theme inside it. */
        .marpit > svg > foreignObject > section {
            background-color: ${backgroundColor} !important;
        }
    `;
    doc.head.append(frameStyle);
    return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

async function getMarpContent() {
    const renderWidth = props.slide.width * props.sectionWidth;
    const backgroundColor = bgColor.value;
    const version = ++renderVersion;
    isRendering.value = true;
    try {
        const content = await renderSlide(props.section.content, renderWidth, props.slide.height, backgroundColor);
        if (version === renderVersion) {
            marpDocument.value = toDocument(content.data.html, content.data.css, backgroundColor);
        }
    } catch (error) {
        console.error("Error rendering slide:", error);
    } finally {
        if (version === renderVersion) isRendering.value = false;
    }
}

watch(bgColor, () => {
    clearTimeout(bgTimer);
    bgTimer = setTimeout(getMarpContent, 300);
});


onBeforeUnmount(() => {
    clearTimeout(bgTimer);
    renderVersion += 1;
});

watch(
    () => [props.section.content, props.sectionWidth, props.slide.width, props.slide.height],
    () => { clearTimeout(bgTimer); getMarpContent(); },
    { immediate: true }
);
</script>

<template>
    <div class="section-wrapper" :style="{
        width: props.slide.width * props.sectionWidth + 'px',
        height: props.slide.height + 'px',
        backgroundColor: bgColor,
        boxShadow: props.shadow ? '-2px 5px 32px -1px rgba(0,0,0,0.48)' : 'none',
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
    /* Keep the iframe canvas and its document on the same color scheme. */
    color-scheme: light;
    background: transparent;
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