<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import embed from 'vega-embed'
import { type Slide, type SlideSection } from '@/services/slide_service'
import { computed } from 'vue'
import { buildVegaUrl, streamVegaSpec } from '@/utils/vega_utils'

const props = defineProps<{
  slide: Slide,
  section: SlideSection,
  showframe?: boolean,
  progress?: number | null,
}>()
const container = ref<HTMLElement | null>(null)

let view: any = null
let renderToken = 0
let fetchToken = 0

// is this section interactive?
const isInteractive = computed(() =>
  props.section.mode === 'interactive' && !!props.section.url_pattern
)

const spec = ref<string>(props.section.content ?? '')

// The URL this section currently resolves to
const currentUrl = computed(() => {
  if (!isInteractive.value) return ''
  const values: Record<string, unknown> = {}
  Object.entries(props.section.parameters ?? {}).forEach(([name, param]) => {
    values[name] = param.default ?? null
  })
  return buildVegaUrl(props.section.url_pattern!, values)
})

async function fetchSpec() {
  if (!currentUrl.value) return
  const token = ++fetchToken
  try {
    const fetched = await streamVegaSpec(currentUrl.value, () => {})
    if (token === fetchToken) spec.value = fetched
  } catch (err) {
    console.error('fetchSpec: failed', err)
  }
}

async function renderContent() {
  if (!container.value || !spec.value) return
  const token = ++renderToken

  try {
    const parsed = JSON.parse(spec.value)

    const finalSpec = props.section.properties?.autosize
      ? { width: 'container', height: 'container',
          autosize: { type: 'fit', contains: 'padding' }, ...parsed }
      : parsed

    const result = await embed(container.value, finalSpec, { actions: false })
    if (token !== renderToken) { result.view.finalize(); return }
    view?.finalize()
    view = result.view
  } catch (err) {
    console.error('Failed to render vega content:', err)
  }
}

// Refetch only when the resolved URL genuinely changes
watchDebounced(currentUrl, (url) => {
  if (url) fetchSpec()
}, { debounce: 400, immediate: true })

// Re-render whenever the section content changes (debounced while typing)
watchDebounced(
  () => [spec.value, props.section.properties],
  renderContent,
  { debounce: 400, deep: true }
)
watch(() => props.section.content, (content) => {
  if (!isInteractive.value) spec.value = content ?? ''
}, { immediate: true })

onBeforeUnmount(() => {
  view?.finalize()
})
</script>

<template>
  <div class="vega-layout" :style="{
    border: props.showframe ? '3px solid var(--accent)' : 'none',
    width: slide.width * section.width_fraction + 'px',
    height: slide?.height + 'px',
  }">
    <div ref="container" class="vega-container" :style="{

    }"></div>
  </div>
</template>

<style scoped>
.vega-layout {
  display: flex;
}


.vega-container {
  width: 100%;
  height: 100%;
}
</style>