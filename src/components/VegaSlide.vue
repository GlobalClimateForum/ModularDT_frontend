<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { watchDebounced, useDebounceFn } from '@vueuse/core'
import embed from 'vega-embed'
import { type Slide, type SlideSection } from '@/services/slide_service'
import { streamVegaSpec } from '@/utils/vega_utils'
import parameterStore, { type ParameterChange, hit } from '@/services/parameterstore_service'

const props = defineProps<{
  slide: Slide,
  section: SlideSection,
  progress?: number | null,
  preview?: boolean
}>()

const container = ref<HTMLElement | null>(null)
const bgColor = computed(() => props.section.properties?.bg ?? 'transparent')
const spec = ref<string>(props.section.content ?? '')

let view: any = null
let renderToken = 0
let fetchToken = 0
let unsubscribe: (() => void) | null = null
let alive = true

// Sections with a URL are streamed; the rest use static content
const streamUrl = computed(() =>
  props.section.mode !== 'static' ? (props.section.content_path ?? '') : ''
)

// ---------- Fetching ----------
async function fetchSpecification() {
  const url = streamUrl.value
  if (!alive || !url) return
  const token = ++fetchToken
  try {
    const fetched = await streamVegaSpec(url, () => { })
    if (alive && token === fetchToken) spec.value = fetched
  } catch (err) {
    console.error('Failed to fetch vega spec:', err)
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
  } catch (err) {
    console.error('Failed to render vega content:', err)
  }
}

// ---------- Watchers ----------
// init + whenever the URL changes
watch(streamUrl, (url) => { if (url) fetchSpecification() }, { immediate: true })

// static sections: use the stored content
watch(() => props.section.content, (content) => {
  if (!streamUrl.value) spec.value = content ?? ''
}, { immediate: true })

watchDebounced(spec, renderContent, { debounce: 400 })
watch(() => props.section.properties, renderContent, { deep: true })

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
    backgroundColor: '#' + bgColor,
  }">
    <div ref="container" class="vega-container"></div>
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