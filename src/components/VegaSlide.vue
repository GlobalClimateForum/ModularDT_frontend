<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { watchDebounced } from '@vueuse/core'
import embed from 'vega-embed'
import { SlideSectionTypes, type Slide, type SlideSection } from '@/services/slide_service'
import { useToast } from 'primevue/usetoast'

const props = defineProps<{
  slide: Slide | null,
  section: SlideSection,
}>()

const toast = useToast()

const container = ref(null)
let view: any = null
let renderToken = 0

async function render() {

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

  }
}


onMounted(render)
// render the chart whenever the section content changes, 
// but debounce to avoid excessive re-renders while typing
watchDebounced(() => props.section.content, render, { debounce: 400 })
onBeforeUnmount(() => view?.finalize())
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