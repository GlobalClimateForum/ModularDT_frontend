<script setup lang="ts">
import Button from 'primevue/button'
import { RouterView } from 'vue-router'
</script>

<template>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
  <RouterView />
  <div class="welcome">
    <h1>Decision Theater</h1>
    <Button label="Start" @click="$router.push('/home')" />
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

  background: #29A4C3;
  color: white;
}
</style>