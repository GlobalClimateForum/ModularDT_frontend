<script setup lang="ts">
import type { Slide } from '@/services/slide_service';
import MarkdownSlide from '@/components/MarkdownSlide.vue';
const props = defineProps<{ slide: Slide | null }>();

</script>


<template>

    <div class="slide-preview">
        <MarkdownSlide :slide="props.slide" />
    </div>

</template>

<style scoped>

.slide-preview {
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: var(--br-medium);
    background-color: var(--p-primary-50);
    box-shadow: inset 0 0 10px 5px var(--p-primary-100);
    padding: 1rem;
    box-sizing: border-box;
    border: 1px solid var(--p-primary-200);
    overflow: hidden;
}

</style>