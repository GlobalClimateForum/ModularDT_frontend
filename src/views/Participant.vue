<script lang="ts" setup>
import { parameterStore } from '@/services/parameter_service'
import { onMounted } from 'vue'

onMounted(() => {
  parameterStore.subscribe((newParameters) => {
    console.log('Parameters updated:', newParameters)
  })
})

</script>


<template>
  <div class="participant-view">
    <h1>Participant View</h1>
    <p>This is the participant view.</p>

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