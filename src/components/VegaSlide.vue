<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { watchDebounced } from '@vueuse/core'
import embed from 'vega-embed'
import { type Slide, type SlideSection } from '@/services/slide_service'
import { useToast } from 'primevue/usetoast'
import { settings } from '@/utils/settings'

const props = defineProps<{
  slide: Slide | null,
  section: SlideSection,
}>()

const toast = useToast()

const container = ref(null)
let view: any = null
let renderToken = 0

async function renderContent(){
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

async function renderUrl(){
  if (!container.value) return
  const token = ++renderToken
}


onMounted( async () => {
  if (props.section.mode === 'content') {
    await renderContent()
  } else if (props.section.mode === 'url') {
    await renderUrl()
  }
})
// render the chart whenever the section content changes, 
// but debounce to avoid excessive re-renders while typing
watchDebounced(() => props.section.content, renderContent, { debounce: 400 })
onBeforeUnmount(() => view?.finalize())
</script>

<template>
  <div style="position: absolute; top: 0; left: 0; font-size: 60px"> {{ props.section.mode }}</div>
  <div ref="container" class="vega-container"></div>
</template>

<style scoped>
.vega-container {
  width: 100%;
  height: 100%;
  background-color: white;
}
</style>