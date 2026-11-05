<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { watchDebounced, useDebounceFn } from '@vueuse/core'
import embed from 'vega-embed'
import { type Slide, type SlideSection } from '@/services/slide_service'
import { streamVegaSpec } from '@/utils/vega_utils'
import parameterStore, { type ParameterChange, hit } from '@/services/parameterstore_service'
import ProgressSpinner from 'primevue/progressspinner';

const props = defineProps<{
  slide: Slide,
  section: SlideSection,
  progress?: number | null,
  preview?: boolean
}>()

const container = ref<HTMLElement | null>(null)
const loading = ref(true)

// Background Color: 'transparent' (or missing) -> transparent, otherwise hex like '000000'
const bgColor = computed(() => {
  const bg = props.section.properties?.bg ?? 'transparent'
  return bg.toLowerCase() === 'transparent' ? 'transparent' : '#' + bg
})
let view: any = null
let renderToken = 0
let fetchToken = 0
let unsubscribe: (() => void) | null = null
let alive = true

// Sections with a URL are streamed; the rest use static content
const streamUrl = computed(() =>
  props.section.mode !== 'static' ? (props.section.content_path ?? '') : ''
)

// Streaming sections start blank: the stored content is a cache and must not
// be shown before the fresh spec from the content server has arrived.
// Static sections render their stored content directly.
const spec = ref<string>(streamUrl.value ? '' : (props.section.content ?? ''))

// ---------- Fetching ----------
async function fetchSpecification() {
  const url = streamUrl.value
  if (!alive || !url) return
  const token = ++fetchToken
  loading.value = true
  try {
    const fetched = await streamVegaSpec(url, () => { })
    if (!alive || token !== fetchToken) return
    spec.value = fetched
    await renderContent()
  } catch (err) {
    console.error('Failed to fetch vega spec:', err)
    if (token === fetchToken) loading.value = false
  }
}
const debouncedFetch = useDebounceFn(fetchSpecification, 500)

function parameterChangeHandler(change: ParameterChange) {
  const hit_ = hit(props.section.id, change)
  console.log('parameterChangeHandler: section.id=', props.section.id, 'change=', change, 'hit=', hit_)
  if (props.section.id && hit(props.section.id, change)) debouncedFetch()
}

// ---------- Rendering ----------
async function renderContent() {
  if (!container.value || !spec.value) return
  const token = ++renderToken
  try {
    const parsed = JSON.parse(spec.value)
    const finalSpec = props.section.properties?.autosize
      ? { width: 'container', height: 'container', autosize: { type: 'fit', contains: 'padding' }, ...parsed }
      : parsed
    const result = await embed(container.value, finalSpec, { actions: false })
    if (token !== renderToken) { result.view.finalize(); return }
    view?.finalize()
    view = result.view
    loading.value = false
  } catch (err) {
    console.error('Failed to render vega content:', err)
    loading.value = false
  }
}


// ---------- Watchers ----------
// init + URL change + manual refresh (refreshKey)
// Clear the spec so nothing (not even cached content) is shown until the
// fresh spec from the content server arrives.
watch(
  () => [streamUrl.value, props.section.properties?.refreshKey],
  ([url]) => {
    if (url) {
      spec.value = ''
      fetchSpecification()
    }
  },
  { immediate: true }
)

// static sections: use the stored content
watch(() => props.section.content, (content) => {
  if (!streamUrl.value) spec.value = content ?? ''
}, { immediate: true })

watchDebounced(spec, renderContent, { debounce: 400 })
watch(() => props.section.properties?.autosize, renderContent)   // only autosize needs a re-render

// ---------- Lifecycle ----------
onMounted(() => {
  renderContent()
  unsubscribe = parameterStore.subscribe(parameterChangeHandler)
})

onBeforeUnmount(() => {
  alive = false
  unsubscribe?.()
  view?.finalize()
})


</script>

<template>
  <div class="vega-layout" :style="{
    width: slide.width * section.width_fraction + 'px',
    height: slide?.height + 'px',
    backgroundColor: bgColor,
  }">
    <div class="loading-overlay" v-if="loading">
      <div class="loading-content">
        <ProgressSpinner style="width: 100px; height: 100px;" strokeWidth="4" animationDuration=".5s" />
        <div class="loading-text">Fetching Vega Spec...</div>
      </div>
    </div>
    <div ref="container" class="vega-container"></div>
  </div>
</template>

<style scoped>
.vega-layout {
  display: flex;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(20px);
  z-index: 10;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-text {
  font-size: var(--fs-xlarge);
  font-weight: bold;
  color: var(--p-primary-500);
}

.vega-container {
  width: 100%;
  height: 100%;
}
</style>