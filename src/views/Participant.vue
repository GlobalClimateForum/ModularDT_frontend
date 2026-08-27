<script lang="ts" setup>
// Vue-stuff
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
// globals and services
import { parameterStore, type ParameterChange } from '@/services/parameter_service'
import { getIPanels } from '@/services/slide_service'
import wsService from '@/services/websocket_service'
import '@/assets/main.css'
// components
import SlideView from '@/components/SlideView.vue'

const parameterChanges = ref<ParameterChange[]>([])
const panels = ref<any[]>([])
const route = useRoute()
const currentId = computed(() => route.params.id)

const connectionStatus = ref('Connecting...')

const channelId = `participant/${currentId.value}/`
const socketUrl = `ws://localhost:8000/ws/participant/${currentId.value}/`

let stop: (() => void) | undefined

const handleMessage = (data) => {
  //console.log("got message: ", data)
  try {
    if (data.event_type === 'presentation_start' || data.message) {
//...
    }

    if (data.event_type === 'presentation_stop' || data.message) {
    }
  } catch (e) {
    console.error('Error processing WebSocket message:', e)
  }
}

onMounted(() => {
  stop = parameterStore.subscribe((c) => parameterChanges.value.push(c))
  wsService.connect(channelId, socketUrl)
  wsService.on(channelId, 'message', handleMessage)
})

const ipanels = getIPanels().then((response) => {
  panels.value = response.data
})

onUnmounted(() => {
  wsService.off(channelId, 'message', handleMessage)
  wsService.disconnect(channelId)
})
</script>

<template>
  <div class="participant-view">
    <h1>Participant View</h1>
    <p>This is the participant view.</p>

    <div v-for="panel in panels" :key="panel.id">
      <SlideView class="ipanel" :slide="panel" :sections="panel.sections" :preview="false" />
    </div>

    <ul>
      <li v-for="change in parameterChanges" :key="`${change.section}:${change.parameter}`">
        Section {{ change.section }}, Parameter {{ change.parameter }}: {{ change.value }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ipanel {
  width: 1000px;
  height: 700px;
}

.participant-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 100vh;
  background: var(--bg-main);
  color: white;
}
</style>