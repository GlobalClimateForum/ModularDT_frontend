<script lang="ts" setup>

import type { Slide, SlideSection } from '@/services/slide_service';
import { contentServerApi } from '@/services/api';
import { ref, watch, onMounted } from 'vue';

const props = defineProps<{
    section: SlideSection;
    slide: Slide;
}>()

const dynamicContent = ref<string | null>(null);

async function getDynamicContent() {

    if (props.section?.content) {
        console.log(`Fetching dynamic content from ${props.section.content}`);
        const response = await contentServerApi.get(props.section?.content)
        if (response.status === 200) {
            dynamicContent.value = response.data;
        } else {
            console.error(`Failed to fetch dynamic content from ${props.section.content}: ${response.statusText}`);
            return null;
            console.error(`Failed to fetch dynamic content from ${props.section.content}: ${response.statusText}`);

        }
    }
}

onMounted(async () => {
    await getDynamicContent();
});

watch(() => props.section?.content, async (newContent) => {
    if (newContent) {
        await getDynamicContent();
    }
}, { immediate: true });

</script>


<template>
    <div class="dynamic-content-view"
         :style="{
             width: (props.slide.width * props.section.width_fraction) + 'px',
             height: props.slide.height + 'px'
         }">
        <iframe v-if="dynamicContent"
                :srcdoc="dynamicContent"
                sandbox="allow-scripts allow-same-origin">
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
