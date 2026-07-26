<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputOtp from 'primevue/inputotp'
import Select from 'primevue/select'

import { ref } from 'vue'
import router from '@/router'
import { useI18n } from 'vue-i18n';
import { settings } from '@/utils/settings'

const { t } = useI18n();
const selected = ref('')

const selectedRole = ref<string | null>(null)
import '@/assets/main.css'
</script>

<template>
  <div class="welcome">

    <h1>Decision Theater</h1>

    <div class="role_options" v-if="selectedRole === null">


      <Card class="role_option_card " v-if="selectedRole === null || selectedRole === 'moderator'"
        @click="selectedRole = 'moderator'">

        <template #content>
          <div class="role_option_card_content">
            <span class="material-symbols-outlined big-icon">record_voice_over</span>
            <h2>{{ t('moderator.name') }}</h2>
          </div>
        </template>
      </Card>

      <Card class="role_option_card" v-if="selectedRole === null || selectedRole === 'participant'"
        @click="selectedRole = 'participant'">
        <template #content>
          <div class="role_option_card_content">
            <span class="material-symbols-outlined big-icon">person</span>
            <h2>{{ t('participant.name') }}</h2>
          </div>
        </template>
      </Card>

      <Card class="role_option_card" v-if="selectedRole === null || selectedRole === 'monitor'"
        @click="selectedRole = 'monitor'">
        <template #content>
          <div class="role_option_card_content">
            <span class="material-symbols-outlined big-icon">monitor</span>
            <h2>{{ t('monitor.name') }}</h2>
          </div>
        </template>
      </Card>
    </div>

    <Button class="home-btn" v-if="selectedRole !== null" @click="selectedRole = null">
      <i class="material-symbols-outlined">home</i>
    </Button>

    <div class="pin_enter" v-if="selectedRole !== null">
      <p v-if="selectedRole !== null && selectedRole === 'moderator'"
        style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
        <i class="material-symbols-outlined">lock</i>
        {{ t('pin-message') }}
      </p>

      <div v-if="selectedRole == 'moderator'">
        <InputOtp :length="6" />
        <Button style="margin-top: 1rem;" :label="t('submit')" @click="router.push('/moderator')" />
      </div>

      <p v-if="selectedRole !== null && selectedRole === 'monitor'"
        style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
        <i class="material-symbols-outlined">monitor</i>
      </p>

      <div v-if="selectedRole == 'monitor'">
        <label class="monitor_select_label">{{ t('select_monitor') }}<select class="monitor_select" v-model="selected">
            <option disabled value="">{{ t('please_select') }}</option>
            <option v-for="i in settings.number_of_screens" :key="i" :value="i"> Monitor{{ i }} </option>
          </select> </label>
        <p>Aktiv: {{ selected }}</p>

        <Button style="margin-top: 1rem;" :disabled="!selected" :label="t('submit')"
          @click="router.push('/monitor/' + String(selected));" />
      </div>
    </div>

    <Button @click="router.push('/participant/1')" v-if="selectedRole === 'participant'" text>
      <span class="material-symbols-outlined">person</span>
    </Button>

  </div>

</template>


<style scoped>
.home-btn {
  position: absolute;
  top: 1rem;
  left: 1rem;
}

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

.role_options {
  display: flex;
  flex-direction: row;
  gap: 2rem;
}

.role_option_card {

  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4.3px);
  -webkit-backdrop-filter: blur(4.3px);

  border: 1px solid rgba(255, 255, 255, 0.31);
  width: 20rem;
  height: 15rem;
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  color: var(--p-primary-50);
}

:deep(.p-card-body) {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.p-card-content) {
  padding: 0;
  height: 100%;
  flex: 1;
}

.role_option_card_content {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex: 1;
}

.role_option_card:hover {
  transform: scale(1.05);
  cursor: pointer;
}

.big-icon {
  font-size: 4rem;
}

.pin_enter {
  display: flex;
  flex-direction: column;
  align-items: center;

}

.pin_enter:deep(.p-inputtext) {
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--br-large);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4.3px);
  -webkit-backdrop-filter: blur(4.3px);
  color: white;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  border: 1px solid rgba(255, 255, 255, 0.31);
}

.monitor_select_label {
  font-size: 1.2rem !important;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: white !important;
}

.monitor_select {
  font-size: 1.2rem;
  padding: 0.5rem 0.75rem;
  min-width: 14rem;
}
</style>