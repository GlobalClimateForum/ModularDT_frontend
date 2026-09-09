<script lang="ts" setup>
import type { Scene } from '@/services/scene_service';
import SlideView from '@/components/SlideView.vue';
import { computed } from 'vue';
import { settings } from '@/globals/settings'
import Tag from 'primevue/tag';

const props = withDefaults(defineProps<{
    scene: Scene | null,
    preview: boolean,
    showframe?: boolean,
    shadow?: boolean
}>(), {
    scene: null,
    showframe: false,
    shadow: true
});

const gridedSlides = computed(() => {
    const grid = Array(settings.value.number_of_screens).fill(null)

    props.scene?.slides.forEach(slide => {
        if (slide && slide.position && slide.position <= settings.value.number_of_screens) {
            grid[slide.position - 1] = slide
        }
    })

    return grid
})

</script>
<template>

    <!-- Container to hold the monitor -->
    <div :class="'monitor_container' + (props.preview ? ' inset-control' : '')">

        <div v-for="(slot, index) in gridedSlides" :key="index" class="monitor-item"
            :style="{ '--i': index, zIndex: gridedSlides.length - index }">

            <SlideView class="slide" v-if="slot" :preview="false" :slide="slot" :sections="slot.sections ?? []"
                :showFrame="false" />

            <div v-else class="empty-screen"></div>

            <div class="monitor-info">
                {{ index + 1 }}
            </div>

        </div>

    </div>
</template>

<style scoped>
.monitor_container {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    padding-left: var(--space-medium);
    padding-right: var(--space-medium);

    perspective: 1200px;
    /* Tilt the monitors in 3D space */
    overflow-x: scroll;
}

.monitor-item {
    position: relative;
    flex: 0 0 auto;
    /* Prevent the monitor from shrinking or growing */
    width: 320px;
    /* Set a fixed width for the monitor */
    aspect-ratio: 16 / 9;
    margin-left: -140px;
    /* Overlap the monitors */
    border-radius: var(--br-small);
    overflow: hidden;
    box-shadow: var(--shadow-dark);
    transform: rotateY(-25deg);
    transform-origin: center left;
    transition: transform 0.3s ease, margin 0.3s ease;
}

.dark-mode .monitor-item {
    box-shadow: var(--shadow-light);
}

.monitor-item:first-child {
    margin-left: 0;
}

.monitor-item:hover {
    transform: rotateY(0deg) translateY(var(--space-small)) scale(1.2);
    z-index: 999 !important;
}

.monitor-info {

    position: absolute;
    top: 0;
    left: calc(100% - 40px);
    width: 40px;
    height: 25px;
    display: flex;
    align-items: center;
    justify-content: center;


    background-color: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(20px);
    border-radius: 0 0 0 var(--br-medium);

    font-family: 'Fira Code', monospace;
    color: var(--p-primary-800) !important;
    font-weight: bold;
    font-size: var(--font-size-large);

}

.dark-mode .monitor-info {
    color: var(--text-color) !important;
    background-color: rgba(0, 0, 0, .5);
}

.slide {
    width: 100%;
    height: 100%;
}

.empty-screen {
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    box-shadow: inset 0 0 12px 2px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}
</style>