<script setup lang="ts">
import { ref, onBeforeUnmount, watch, onMounted, computed } from 'vue'
import { watchDebounced } from '@vueuse/core'
import embed from 'vega-embed'
import { type Slide, type SlideSection } from '@/services/slide_service'
import { buildVegaUrl, streamVegaSpec } from '@/utils/vega_utils'
import parameterStore from '@/services/parameterstore_service'

const props = defineProps<{
  slide: Slide,
  section: SlideSection,
  showframe?: boolean,
  progress?: number | null,
}>()

// Containter for the Vega chart. We use a ref so that we can pass it to vega-embed.
const container = ref<HTMLElement | null>(null)
// The current values of the parameters for this section.
const paramValues = ref<Record<string, unknown>>(seedValues())
// Background Color
const bgColor = computed(() => props.section.properties?.bg ?? 'transparent')

let view: any = null // The current Vega view
let renderToken = 0 // Token to track the latest render request. If a new render is requested before the previous one finishes, we cancel the previous one.
let fetchToken = 0 // Token to track the latest fetch request. If a new fetch is requested before the previous one finishes, we cancel the previous one.

// Whether this section is interactive (i.e. has a URL pattern and is in interactive mode)
const isInteractive = computed(() =>
  props.section.mode === 'interactive' && !!props.section.url_pattern
)

// The current Vega spec for this section. This is either the content of the section (if not interactive) or the fetched spec from the URL (if interactive).
const spec = ref<string>(props.section.content ?? '')

// The URL this section currently resolves to
const currentUrl = computed(() => {
  if (!isInteractive.value) return ''
  return buildVegaUrl(props.section.url_pattern!, paramValues.value)
})

// Function to fetch the Vega spec from the current URL. We use a token to ensure that we only update the spec if this is the latest fetch request.
async function fetchSpec() {
  if (!currentUrl.value) return
  const token = ++fetchToken
  try {
    const fetched = await streamVegaSpec(currentUrl.value, () => { })
    if (token === fetchToken) spec.value = fetched
  } catch (err) {
    console.error('fetchSpec: failed', err)
  }
}

// Function to initialize the parameter values for this section.
function seedValues(): Record<string, unknown> {
  const seeded: Record<string, unknown> = {}
  Object.entries(props.section.parameters ?? {}).forEach(([name, param]) => {
    seeded[name] = param.default ?? null
  })
  return seeded
}

// Function to render the Vega spec in the container. We use a token to ensure that we only update the view if this is the latest render request.
async function renderContent() {
  if (!container.value || !spec.value) return
  const token = ++renderToken

  try {
    const parsed = JSON.parse(spec.value)

    const finalSpec = props.section.properties?.autosize
      ? {
        width: 'container', height: 'container',
        autosize: { type: 'fit', contains: 'padding' }, ...parsed
      }
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
watchDebounced(spec, renderContent, { debounce: 400 })
watch(() => props.section.properties, renderContent, { deep: true })
watch(() => props.section.parameters, () => { paramValues.value = seedValues() }, { deep: true })

watch(() => props.section.content, (content) => {
  if (!isInteractive.value) spec.value = content ?? ''
}, { immediate: true })

watch(() => props.section.properties, renderContent, { deep: true })


onBeforeUnmount(() => {
  view?.finalize()
})

onMounted(() => {
  renderContent()
  const unsubscribe = parameterStore.subscribe((change) => {
    if (change.section === props.section.id) {
      console.log(change);
    }
  })
})
</script>

<template>
  <div class="vega-layout" :style="{
    border: props.showframe ? '3px solid var(--accent)' : 'none',
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