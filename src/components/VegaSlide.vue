<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { watchDebounced } from '@vueuse/core'
import embed from 'vega-embed'
import { type Slide, type SlideSection } from '@/services/slide_service'

const props = defineProps<{
  slide: Slide | null,
  section: SlideSection,
  showframe?: boolean
  progress: number | null
}>()

const container = ref<HTMLElement | null>(null)

let view: any = null
let renderToken = 0

async function renderContent() {

  if (!container.value || !props.section.content) return

  if (!container.value) return
  const token = ++renderToken

  try {
    const spec = JSON.parse(props.section.content)
    const result = await embed(container.value, spec, {
      actions: false
    })

    if (token !== renderToken) {
      result.view.finalize()
      return
    }

    view?.finalize()
    view = result.view
  } catch (err) {
    console.error('Failed to render vega content:', err)
  }
}

onMounted(renderContent)

// Re-render whenever the section content changes (debounced while typing)
watchDebounced(() => props.section.content, renderContent, { debounce: 400 })

onBeforeUnmount(() => {
  view?.finalize()
})
</script>

<template>
  <div ref="container" class="vega-container"></div>
</template>

<style scoped>
.vega-container {
  width: 100%;
  height: 100%;
  background-color: white;
}

</style>