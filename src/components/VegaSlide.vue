<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { watchDebounced } from '@vueuse/core'
import embed from 'vega-embed'
import { type Slide, type SlideSection } from '@/services/slide_service'

interface Layout {
  width: number,
  height: number,
  top: number,
  left: number,
  scale: number,
  bg: string
}

const props = defineProps<{
  slide: Slide,
  section: SlideSection,
  showframe?: boolean
  progress: number | null,
  layout?: Layout
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
  <div class="vega-layout" :style="{
    border: props.showframe ? '3px solid var(--accent)' : 'none',
    width: slide.width * section.width_fraction + 'px',
    height: slide?.height + 'px',
    backgroundColor: props.layout?.bg || 'transparent',
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