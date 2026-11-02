<script lang="ts" setup>

import type { Slide, SlideSection } from '@/services/slide_service';
import { contentServerApi } from '@/services/api';
import { ref, watch, onMounted} from 'vue';

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
    <div :style="{ width: props.slide.width, height: props.slide.height }" v-if="dynamicContent" v-html="dynamicContent">
    </div>
</template>

<style scoped>

.debug-info {
    position: absolute;
    top: 0;
    left: 0;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 5px;
    font-size: 12px;
    z-index: 1000;
}
</style>
