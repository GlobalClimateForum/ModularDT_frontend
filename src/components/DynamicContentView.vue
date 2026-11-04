<script lang="ts" setup>

import type { Slide, SlideSection } from '@/services/slide_service';
import { contentServerApi } from '@/services/api';
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useParameterStore } from '@/services/parameterstore_service';

const props = defineProps<{
    section: SlideSection;
    slide: Slide;
}>()

const dynamicContent = ref<string | null>(null);
const paramstore = useParameterStore()

async function getDynamicContent() {
    const path = props.section?.content_path
    if (!path) return
    try {
        const response = await contentServerApi.get<string>(path, { responseType: 'text' })
        dynamicContent.value = response.data
    } catch (err) {
        console.error(`Failed to fetch dynamic content from ${path}`, err)
    }
}

const unsubscribe = paramstore.subscribe((change) => {
    if (props.section?.parameters && change.parameter in props.section.parameters) {
        getDynamicContent();
    }
})

onMounted(async () => {
    await getDynamicContent();
});

onUnmounted(() => {
    unsubscribe();
});

watch(() => props.section?.content_path, async (newContent) => {
    if (newContent) {
        await getDynamicContent();
    }
}, { immediate: true });

</script>


<template>
    <div class="dynamic-content-view" :style="{
        width: (props.slide.width * props.section.width_fraction) + 'px',
        height: props.slide.height + 'px'
    }">
        <iframe v-if="dynamicContent" :srcdoc="dynamicContent" sandbox="allow-scripts allow-same-origin">
        </iframe>
    </div>
</template>

<style scoped>
.dynamic-content-view {
    position: relative;
    overflow: hidden;
}

.dynamic-content-view iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: none;
}
</style>
