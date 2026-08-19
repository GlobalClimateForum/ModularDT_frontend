<script lang="ts" setup>
import type { Slide, SlideSection } from '@/services/slide_service';
import { defineAsyncComponent } from 'vue'
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue';
import { basemaps } from '@/utils/map_utils';

// -- Inputs -- 
// Props definition with default values for optional props
const props = withDefaults(defineProps<{
    slide: Slide | null,
    targetSlide?: Slide | null,
    sections: SlideSection[],
    preview: boolean,
    showframe?: boolean,
    shadow?: boolean
    basemap?: keyof typeof basemaps
}>(), {
    sections: () => [],
})

const sectionContents = computed(() => props.sections);
const sectionWidths = computed(() => props.sections.map(section => section.width_fraction));

// -- Re-Rendering -- 
// A reference to trigger re-rendering of sections when their content or widths change
const sectionRenderKey = ref(0);
watch(
    () => [sectionContents.value, sectionWidths.value, props.showframe],
    () => { sectionRenderKey.value += 1; },
    { deep: true, immediate: true }
); // The watcher listens for changes in sectionContents, sectionWidths, and showframe to update the sectionRenderKey

// -- Dynamic Component Mapping --
// Mapping of view types to their corresponding components for dynamic rendering - TODO: Get from Backend (db)
const componentsMap: Record<string, any> = {
    markdown: defineAsyncComponent(() => import('@/components/MarkdownSlide.vue')),
    map: defineAsyncComponent(() => import('@/components/MapSlide.vue')),
    vega: defineAsyncComponent(() => import('@/components/VegaSlide.vue')), 
    ipanel: defineAsyncComponent(() => import('@/components/IPSlide.vue')),
    custom: defineAsyncComponent(() => import('@/components/CustomSlide.vue')),
};

// -- Auto scaling --
// Observeres the wrapper div and updates availableWidth and availableHeight when it resizes
let resizeObserver: ResizeObserver | null = null
// Calculate available width and height for scaling based on the wrapper div's size on mount
onMounted(() => {
    if (!wrapperRef.value) return
    resizeObserver = new ResizeObserver(([entry]) => {
        availableWidth.value = entry.contentRect.width
        availableHeight.value = entry.contentRect.height
    })
    resizeObserver.observe(wrapperRef.value)
})
// the wrapper div that contains the slide-preview, used to measure available width and height for scaling
const wrapperRef = ref<HTMLElement | null>(null)
// the available width and height for scaling, updated by ResizeObserver
const availableWidth = ref(0)
const availableHeight = ref(0)

// Width of the decorative monitor bezel (box-shadow spread) painted around the slide in preview mode - kept out of
// the box model (outline/box-shadow) so it must be reserved manually here instead of via padding/border.
const BEZEL_PX = props.preview ? 48 : 0
const bezel = computed(() => (props.preview ? BEZEL_PX : 0))

// Computes the scale factor to fit the slide (plus its bezel) within the available width and height while maintaining aspect ratio
const autoScale = computed(() => {
    if (!props.slide || !availableWidth.value || !availableHeight.value) return 1
    const scaleX = availableWidth.value / (props.slide.width + bezel.value * 2)
    const scaleY = availableHeight.value / (props.slide.height + bezel.value * 2)
    return Math.min(scaleX, scaleY)
})

// Disconnect the ResizeObserver when the component is unmounted
onBeforeUnmount(() => resizeObserver?.disconnect())

</script>

<template>
    <div :class="{ 'slide-outer': true, 'inset-control': props.preview }">
        <div ref="wrapperRef" class="slide-measure" />

        <div class="slide-content" :style="{
            width: ((props.slide?.width ?? 0) + bezel * 2) * autoScale + 'px',
            height: ((props.slide?.height ?? 0) + bezel * 2) * autoScale + 'px',
        }">

            <!-- preview container -->
            <div :class="{ 'monitor-preview': props.preview, 'section-container': true }" :style="{
                position: 'absolute',
                top: bezel * autoScale + 'px',
                left: bezel * autoScale + 'px',
                width: props.slide?.width + 'px',
                height: props.slide?.height + 'px',
                transform: `scale(${autoScale})`,
                transformOrigin: 'top left',
                boxShadow: props.shadow 
            }">

                <!-- dynamic component rendering slide sections based on their view_type -->
                <component v-for="(section, index) in sectionContents" :key="`${section.view_type}-${index}`"
                    :is="componentsMap[section.view_type]" :slide="props.slide" :section="section"
                    :sectionWidth="sectionWidths[index]" :showframe="props.showframe"
                    :basemap="props.basemap" 
                    :targetSlide="props.targetSlide"/>
            </div>
        </div>

    </div>
</template>

<style scoped>
.slide-outer {
    width: 100%;
    height: 100%;
    min-height: 0;
    position: relative;
}

.slide-measure {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.slide-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.monitor-preview {
    border-radius: var(--br-medium);
    outline: 1px solid var(--p-primary-200);
    box-sizing: border-box;
}

.section-container {
    display: flex;
    flex-direction: row;
    gap: 0;
}
</style>