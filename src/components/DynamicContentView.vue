<script lang="ts" setup>
import type { Slide, SlideSection } from '@/services/slide_service'
import { contentServerApi } from '@/services/api'
import { ref, watch, onBeforeUnmount } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useParameterStore, hit, type ParameterChange } from '@/services/parameterstore_service'

const props = defineProps<{
    section: SlideSection
    slide: Slide
}>()

const dynamicContent = ref<string | null>(null)
const paramstore = useParameterStore()
let fetchToken = 0
let alive = true

async function getDynamicContent() {
    const path = props.section?.content_path
    if (!alive || !path) return
    const token = ++fetchToken
    try {
        const sender = props.section.id ?? '-1'
        const response = await contentServerApi.get<string>(`${path}?sender=${sender}`, { responseType: 'text' })
        if (alive && token === fetchToken) dynamicContent.value = response.data   // ignore outdated responses
    } catch (err) {
        console.error(`Failed to fetch dynamic content from ${path}`, err)
    }
}

// 500 ms: merges bursts of changes and lets the snapshot reach the server first
const debouncedFetch = useDebounceFn(getDynamicContent, 500)

// global changes + changes for this section
const unsubscribe = paramstore.subscribe((change: ParameterChange) => {
    if (props.section.id && hit(props.section.id, change)) debouncedFetch()
})

// init + URL change + manual refresh (Fetch button)
watch(
    () => [props.section?.content_path, props.section?.properties?.refreshKey],
    ([path]) => { if (path) getDynamicContent() },
    { immediate: true }
)

onBeforeUnmount(() => {
    alive = false
    unsubscribe()
})
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
