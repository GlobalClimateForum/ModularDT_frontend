<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n';
import { settings } from '@/utils/settings'

const { t } = useI18n();
const route = useRoute()
const currentId = computed(() => route.params.id)

// is the monitor ID between 1 and the number of screens?
const activeMonitor = computed(() => {
  const idAsNumber = Number(route.params.id)
  return 1 <= idAsNumber && idAsNumber <= settings.value.number_of_screens
})

let socket: WebSocket | null = null
const connectionStatus = ref('Connecting...')
const serverMessages = ref<string[]>([])

onMounted(() => {
  const socketUrl = `ws://localhost:8000/ws/monitor/${currentId.value}/`

  socket = new WebSocket(socketUrl)
  socket.onopen = (event) => {
    console.log('Success: connected to Django Channel!', event)
    connectionStatus.value = 'Connected'
  }

  socket.onmessage = (event) => {
    console.log('Message received from server:', event.data)
    try {
      const data = JSON.parse(event.data)
      serverMessages.value.push(data.message || JSON.stringify(data))
    } catch (e) {
      // ???
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

// we do not need a send function, because the monitor is only a listener, not a sender

// important: close the socket when the component is unmounted to avoid memory leaks
onBeforeUnmount(() => {
  if (socket) {
    socket.close()
  }
})
</script>

<template>
  <div class="welcome">
    <h2>{{ t('monitor.greeting') }}</h2>
    <p>{{ t('monitor.instance_id') }}: {{ currentId }}</p>

    <!-- Monitor ID is between 1 and the number of screens -->
    <div v-if="activeMonitor">
      <p>{{ t('monitor.waiting') }}: /ws/monitor/{{currentId}}/ </p>
      <p>Status: <strong>{{ connectionStatus }}</strong></p>
    </div>

    <!-- Monitor ID is 0 or exceeds the number of screens -->
    <div v-else>
      <p>{{ t('monitor.invalid') }}</p>
    </div>
  </div>
</template>


<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 100vh;
  text-align: center;
  background: linear-gradient(135deg, var(--p-primary-700) 0%, var(--p-primary-900) 100%);
}
</style>