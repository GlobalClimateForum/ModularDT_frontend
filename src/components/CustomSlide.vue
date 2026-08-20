<script lang="ts" setup>
import type { Slide, SlideSection } from '@/services/slide_service';
import { defineAsyncComponent, shallowRef, watchEffect } from 'vue';
import { loadModule, type Options } from 'vue3-sfc-loader';
import { buildModuleCache } from '@/globals/slide_runtime'

const props = defineProps<{
    slide: Slide,
    section: SlideSection,
    sectionWidth: number,
    showframe?: boolean,
    shadow?: boolean,
    basemap?: string,
    targetSlide?: Slide | null,
}>()

const sharedModuleCache = buildModuleCache()
const dynamicComponent = shallowRef<any>(null)

watchEffect((onCleanup) => {
    if (props.section.mode !== 'vue') {
        dynamicComponent.value = null
        return
    }

    const code = props.section.content
    const injectedStyles: HTMLStyleElement[] = []

    const filename = `dynamic-${props.section.id ?? Math.random().toString(36).slice(2)}.vue`

    const options: Options = {
        moduleCache: sharedModuleCache,
        getFile: async () => ({ getContentData: () => code, type: '.vue' }),
        addStyle(styleStr) {
            const style = document.createElement('style')
            style.textContent = styleStr
            document.head.appendChild(style)
            injectedStyles.push(style)
        },
        log(type, ...args) {
            console.log('[sfc-loader]', type, ...args)
        },
    }

    dynamicComponent.value = defineAsyncComponent({
        loader: () => loadModule(filename, options),
        onError(err) {
            console.error('[sfc-loader] failed to load slide:', err)
        },
    })

    onCleanup(() => {
        injectedStyles.forEach((s) => s.remove())
    })
})
</script>
<template>
    <div
        :style="{ backgroundColor: 'transparent', width: props.slide.width * props.sectionWidth + 'px', height: props.slide.height + 'px', overflow: 'hidden', position: 'relative' }">
        <div v-if="props.section.mode === 'html'"
            :style="{ width: props.slide.width * props.sectionWidth + 'px', height: props.slide.height + 'px', overflow: 'hidden' }">
            <div v-html="props.section.content" :style="{ width: '100%', height: '100%' }"></div>
        </div>
        <div v-else-if="props.section.mode === 'vue'"
            :style="{ width: props.slide.width * props.sectionWidth + 'px', height: props.slide.height + 'px', overflow: 'hidden' }">
            <Suspense>
                <component :is="dynamicComponent" />
                <template #fallback>
                    <div>Loading…</div>
                </template>
            </Suspense>
        </div>
    </div>
</template>



<style scoped>
/* unchanged */
</style>

<style scoped>
h1 {
    position: absolute;
    top: 35%;
    left: 50%;
    transform: translateX(-50%);
    color: lightcoral;
    font-size: 150pt;
    line-height: 1;
    text-align: center;
    font-family: 'Roboto', sans-serif;
    font-weight: bold;
    z-index: 999;
}
</style>