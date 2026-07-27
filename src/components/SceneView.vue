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

const GRID_LAYOUTS: Record<number, { cols: number, rows: number }> = {
    1: { cols: 1, rows: 1 },
    2: { cols: 2, rows: 1 },
    3: { cols: 3, rows: 1 },
    4: { cols: 2, rows: 2 },
    5: { cols: 3, rows: 2 },
    6: { cols: 3, rows: 2 },
    7: { cols: 4, rows: 2 },
    8: { cols: 4, rows: 2 },
    9: { cols: 3, rows: 3 },
}

// Berechnet das optimale Grid-Layout dynamisch, damit alle Monitore reinpassen
const gridStyle = computed(() => {
    const count = settings.value.number_of_screens
    if (count <= 0) return {}

    const { cols, rows } = GRID_LAYOUTS[count] ?? { cols: 4, rows: Math.ceil(count / 4) }

    return {
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        '--grid-aspect': `${(16 * cols) / (9 * rows)}`,
    }
})

</script>

<template>
    <div :class="'monitor_container' + (props.preview ? ' inset-control' : '')" :style="gridStyle">
        <div v-for="(slot, index) in gridedSlides" :key="index" class="screen monitor-item">
            <SlideView v-if="slot" :preview="false" :slide="slot" :sections="slot.sections ?? []" :showFrame="false" />
            <div v-else class="empty-screen">

            </div>
            <div class="slide-meta-container">
                <Tag :value="index + 1" severity="info" rounded>
                    <template #icon>
                        <i class="material-symbols-outlined">monitor</i>
                    </template>
                </Tag>
            </div>
        </div>
    </div>
</template>

<style scoped>

.slide-meta-container {
    width: 100%;
    position: absolute;
    top: var(--space-medium);
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: var(--space-small);
    align-items: center;
    padding: var(--space-small);
}

.monitor_container {
    display: grid;
    aspect-ratio: var(--grid-aspect);
    width: 100%;
    height: auto;
    max-height: 100%;
    margin: auto;
    gap: var(--space-medium);
    padding: var(--space-medium);
    border-radius: var(--br-medium);
}

.monitor-item {
    min-width: 0;
    min-height: 0;
    position: relative;
    overflow: hidden;
    padding: var(--space-small);
}

.empty-screen {
    width: 100%;
    height: 100%;
    border-radius: var(--br-medium);

    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--br-medium);
    box-shadow: inset 0 0 12px 2px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}
</style>