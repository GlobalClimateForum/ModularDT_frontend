<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { parameterStore, type ParameterChange } from '@/services/parameter_service'
import { computed, onMounted, onUnmounted } from 'vue'
import { ref } from 'vue'
import { getIPanels } from '@/services/slide_service'

import '@/assets/main.css'
import SlideView from '@/components/SlideView.vue'

const parameterChanges = ref<ParameterChange[]>([])
const panels = ref<any[]>([])
const route = useRoute()
const currentId = computed(() => route.params.id)

let socket: WebSocket | null = null
const connectionStatus = ref('Connecting...')

let stop: (() => void) | undefined

onMounted(() => {
  stop = parameterStore.subscribe((c) => parameterChanges.value.push(c))
  onMounted(() => {
    const socketUrl = `ws://localhost:8000/ws/participant/${currentId.value}/`

    socket = new WebSocket(socketUrl)

    socket.onopen = (event) => {
      console.log('Success: connected to channel!', event)
      connectionStatus.value = 'Connected'
    }

    socket.onmessage = (event) => {
      try {

      } catch (e) {
        console.error('Error processing WebSocket message:', e)
      }
    }

    socket.onerror = (error) => {
      console.error('WebSocket-Error:', error)
      connectionStatus.value = 'Error'
    }

    socket.onclose = (event) => {
      console.log('WebSocket-connection closed.', event)
      connectionStatus.value = 'Disconnected'
    }
  })
})

const ipanels = getIPanels().then((response) => {
  panels.value = response.data
})

onUnmounted(() => {
  if (socket) {
    socket.close()
  }
  stop?.()
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