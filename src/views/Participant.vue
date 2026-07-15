<script lang="ts" setup>
import { parameterStore, type ParameterChange } from '@/services/parameter_service'
import { onMounted, onUnmounted } from 'vue'
import { ref } from 'vue'

const parameterChanges = ref<ParameterChange[]>([])

let stop: (() => void) | undefined
onMounted(() => {
  stop = parameterStore.subscribe((c) => parameterChanges.value.push(c))
})
onUnmounted(() => stop?.())

</script>


<template>
  <div class="participant-view">
    <h1>Participant View</h1>
    <p>This is the participant view.</p>
    <ul>
      <li v-for="change in parameterChanges" :key="`${change.section}:${change.parameter}`">
        Section {{ change.section }}, Parameter {{ change.parameter }}: {{ change.value }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.participant-view{
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    min-height: 100vh;
    background-color: red; 
}
</style>