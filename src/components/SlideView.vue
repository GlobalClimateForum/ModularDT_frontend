<script setup lang="ts">
import type { Slide } from '@/services/slide_service';
import MarkdownSlide from '@/components/MarkdownSlide.vue';
import ViteSlide from '@/components/ViteSlide.vue';

const props = withDefaults(defineProps<{ content: Slide | Object | null, boxed?: boolean }>(), {
    boxed: true
});

</script>


<template>

    <div :class="{ 'slide-preview': props.boxed }">
        <MarkdownSlide v-if="props.content && 'markdown' in props.content" :slide="props.content" />
    </div>

</template>

<style scoped>
.slide-preview {
    aspect-ratio: 16 / 9;
    border-radius: var(--br-medium);
    background-color: var(--p-primary-50);
    box-shadow: inset 0 0 10px 5px var(--p-primary-100);
    padding: 1rem;
    box-sizing: border-box;
    border: 1px solid var(--p-primary-200);
    overflow: hidden;
}

* {
    pointer-events: none;
}
</style>