<script setup lang="ts">
import type { Slide } from '@/services/slide_service';
import MarkdownSlide from '@/components/MarkdownSlide.vue';

const props = withDefaults(defineProps<{ 
    content: Slide | Object | null, 
    boxed?: boolean,
    scale?: number,  // 0.5 to 2.0 multiplier
    aspectRatio?: string  // e.g., "16/9"
}>(), {
    boxed: true,
    scale: 1,
    aspectRatio: '16/9'
});
</script>

<template>
    <div 
        :class="{ 'slide-preview': props.boxed }"
        :style="{
            '--slide-aspect-ratio': props.aspectRatio,
            transform: `scale(${props.scale})`
        }"
    >
        <MarkdownSlide 
            v-if="props.content && 'markdown' in props.content" 
            :slide="props.content" 
            class="slide-item"
        />
    </div>
</template>

<style scoped>
.slide-preview {
    border-radius: var(--br-medium);
    background-color: var(--p-primary-50);
    box-shadow: inset 0 0 10px 5px var(--p-primary-100);
    padding: 1rem;
    box-sizing: border-box;
    border: 1px solid var(--p-primary-200);
    overflow: hidden;


    
    /* Enable smooth scaling */
    transform-origin: center;
    transition: transform 0.2s ease;
}

* {
    pointer-events: none;
}
</style>