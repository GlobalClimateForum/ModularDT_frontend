<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import embed from 'vega-embed'

const props = defineProps({
  spec: { type: Object, required: true }
})

const container = ref(null)
let view = null

async function render() {
  if (!container.value) return
  view?.finalize() // clean up previous view
  const result = await embed(container.value, props.spec, {
    actions: false // hides the export/source menu
  })
  view = result.view
}

onMounted(render)
watch(() => props.spec, render, { deep: true }) // ToDO: optimize by diffing spec changes instead of re-rendering everything
onBeforeUnmount(() => view?.finalize()) // Clean up Vega view when component is destroyed
</script>

<template>
  <div ref="container"></div>
</template>