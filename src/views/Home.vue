<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputOtp from 'primevue/inputotp'

import { ref } from 'vue'
import router from '@/router'

const selectedRole = ref<string | null>(null)
import '@/assets/main.css'
</script>

<template>
  <div class="welcome">

    <h1>Decision Theater</h1>
    <p v-if="selectedRole === null">Select your role to get started.</p>

    <div class="role_options" v-if="selectedRole === null">

      <Card class="role_option_card " v-if="selectedRole === null || selectedRole === 'moderator'"
        @click="selectedRole = 'moderator'">
        <template #title>
          <h2>Moderator</h2>
        </template>
        <template #content>
          <span class="material-icons big-icon">record_voice_over</span>
        </template>
      </Card>

      <Card class="role_option_card" v-if="selectedRole === null || selectedRole === 'participant'"
        @click="selectedRole = 'participant'">
        <template #title>
          <h2>Participant</h2>
        </template>
        <template #content>
          <span class="material-icons big-icon">person</span>
        </template>
      </Card>

      <Card class="role_option_card" v-if="selectedRole === null || selectedRole === 'monitor'"
        @click="selectedRole = 'monitor'">
        <template #title>
          <h2>Monitor</h2>
        </template>
        <template #content>
          <span class="material-icons big-icon">monitor</span>
        </template>
      </Card>
    </div>

    <div class="pin_enter" v-if="selectedRole !== null">
      <p v-if="selectedRole !== null && selectedRole === 'moderator'">
        Enter pin to acces moderator dashboard.
      </p>

      <div v-if="selectedRole == 'moderator'">
        <InputOtp :length="6" />
        <Button style="margin-top: 1rem;" label="Submit" @click="router.push('/moderator')" />
      </div>
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
  background-color: var(--primary);
}

.role_options {
  display: flex;
  flex-direction: row;
  gap: 2rem;
}

.role_option_card {
  background-color: var(--primary-light);
  color: white;
  width: 20rem;
  height: 15rem;
  transition: transform 0.25s ease, box-shadow 0.25s ease;

}

.role_option_card:hover {
  transform: scale(1.05);
  cursor: pointer;
}

.big-icon {
  font-size: 4rem;
}

.pin_enter{
  display:flex; 
  flex-direction: column;
  align-items: center;
}
</style>