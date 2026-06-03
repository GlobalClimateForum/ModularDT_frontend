<script setup lang="ts">
import { ref } from 'vue'
import FloatLabel from 'primevue/floatlabel';
import InputOtp from 'primevue/inputotp';
import Select from 'primevue/select';

const roleValue = ref(null);

const roleOptions
  = ref([
    {
      key: 'moderator',
      label: 'Moderator'
    },
    {
      key: 'participant',
      label: 'Participant',
      partialChecked: false,
      children: [
        { key: '1-0', label: 'Group A' },
        { key: '1-1', label: 'Group B' },
      ],
    },
  ])
</script>

<template>
  <div class="welcome">

    <h1 class="animate__animated animate__fadeInUp">Decision Theater</h1>

    <form class="login-form animate__animated animate__fadeInUp">
      <FloatLabel :variant="'outlined'">
        <Select id="role" v-model="roleValue" :options="roleOptions" option-label="label" class="role-select" />
        <label for="role">Select your role</label>
      </FloatLabel>

      <FloatLabel v-if="roleValue && roleValue.key === 'participant'" :variant="'outlined'">
        <Select id="group" :options="roleValue.children" option-label="label" class="group-select animate__animated animate__fadeInUp" />
        <label for="group">Select your group</label>
      </FloatLabel>

      <InputOtp v-if="roleValue && roleValue.key === 'moderator'" id="pin" class="password-input animate__animated animate__fadeInUp" :length="6" />
    </form>

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

.login-form {
  display: flex;
  flex-direction: column;
  gap:2rem;
  justify-content: center;
}

.role-select {
  width: 20em;
  text-align: left;
}

.password-input {
  width: 20em;
  align-self: center;
}

.group-select {
  width: 20em;
  text-align: left;
}


</style>