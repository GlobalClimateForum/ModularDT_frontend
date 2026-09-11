<script lang="ts" setup>
import type { Slide, SlideSection } from '@/services/slide_service';
import { defineAsyncComponent, shallowRef, watchEffect, computed } from 'vue';
import { loadModule, type Options } from 'vue3-sfc-loader';
import { buildModuleCache } from '@/globals/slide_runtime'
import { inject, provide } from 'vue';
import { parameterStore, type ParameterChange } from '@/services/parameter_service'

const props = defineProps<{
    slide: Slide,
    section: SlideSection,
    sectionWidth: number,
    showframe?: boolean,
    shadow?: boolean,
    basemap?: string,
    targetSlide?: Slide | null,
}>()

// Define a shared module cache to avoid reloading modules unnecessarily
const sharedModuleCache = buildModuleCache()
// Provide the component to be rendered dynamically to child components
const dynamicComponent = shallowRef<any>(null)

// Define  the updateParticipantParameter function to be injected from the parent component
/*
const updateParticipantParameter = inject('updateParticipantParameter', () => { })
provide('updateParticipantParameter', (name: string, checked: boolean) => {
      parameterStore.set({
        section: props.section.id as number,
        parameter: "TestParameter",
        value: "Test successfully set"
    })
})
*/

// Stable id per section, used for both the wrapper and the CSS prefix
const sectionScopeId = computed(() => `sfc-${props.section.id ?? Math.random().toString(36).slice(2)}`)

// Function to init a new StyleSheet and prefix all CSS rules with a given prefix to scope the styles to a specific section
function scopeCss(css: string, prefix: string): string {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(css)
    return prefixRules(sheet.cssRules, prefix)
}

// Function to prefix all CSS rules with a given prefix to scope the styles to a specific section
function prefixRules(rules: CSSRuleList, prefix: string): string {

    let out = '' // the output css string
    for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
            // Get the selectors for the rule, e.g. "html, body, :root" or ".my-class, .my-other-class"
            // Function to add the prefix to a selector, unless it is html, body or :root
            const addprefix = (selector: string) => /^(html|body|:root)$/.test(selector) ? prefix : `${prefix} ${selector}`
            // Prefix all css selectors
            const selectors = rule.selectorText.replace(/,/g, ',').split(',').map(s => addprefix(s.trim())).join(', ')
            // Add the prefixed selectors and the rule's cssText to the output string
            out += `${selectors} { ${rule.style.cssText} }\n`
        } else if (rule instanceof CSSMediaRule) {
            // If the rule is a media query, recursively prefix its rules and wrap them in the media query
            out += `@media ${rule.media.mediaText} { ${prefixRules(rule.cssRules, prefix)} }\n`
        } else if (rule instanceof CSSKeyframesRule) {
            out += `${rule.cssText}\n`
        } else if (rule instanceof CSSSupportsRule) {
            out += `@supports ${rule.conditionText} { ${prefixRules(rule.cssRules, prefix)} }\n`
        } else {
            out += `${rule.cssText}\n`
        }
    }
    return out
}

watchEffect((onCleanup) => {

    // If the section mode is not 'vue', clear the dynamic component and return early
    if (props.section.mode !== 'vue') {
        dynamicComponent.value = null
        return
    } else {

        // Get the code from the section content and prepare to inject styles
        const code = props.section.content
        // Array to hold the injected style elements so they can be cleaned up later
        const injectedStyles: HTMLStyleElement[] = []
        // Prefix for scoping the styles to this section
        const prefix = `#${sectionScopeId.value}`

        // Generate a unique filename for the dynamic component based on the section id and scope id
        const filename = `dynamic-${sectionScopeId.value}-${Date.now()}.vue`

        // Options for the vue3-sfc-loader to load the component, including how to handle styles and logging
        const options: Options = {
            moduleCache: sharedModuleCache,
            getFile: async () => ({ getContentData: () => code, type: '.vue' }),
            
            // SFC load will call this function for each <style> block in the SFC, 
            // allowing us to scope the styles to this section
            addStyle(styleStr:any) {
                const style = document.createElement('style')
                style.textContent = scopeCss(styleStr, prefix)
                document.head.appendChild(style)
                injectedStyles.push(style)
            }
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
    }
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
            :id="sectionScopeId"
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