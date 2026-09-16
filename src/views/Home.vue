<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import InputOtp from 'primevue/inputotp'

import { ref, onMounted, computed } from 'vue'
import router from '@/router'
import { useI18n } from 'vue-i18n';
import { settings } from '@/globals/settings'
import { type Event, getEventById } from '@/services/event_service'

import { type Participant, getParticipants } from '@/services/participant_service'
import { type StyleName, styleNames, makeStyle, avatarUri as buildAvatarUri, previewUri, prettyName, } from '@/services/avatar_service';


const { t } = useI18n();
const selected = ref('')
const event = ref<Event | null>(null)

const selectedRole = ref<string | null>(null)
const selectedParticipant = ref<Participant | null>(null)
const participants = ref<Participant[]>([])
const seatedParticipants = computed(() => participants.value.filter(p => p.seat !== null));

import '@/assets/main.css'

onMounted(() => {

  console.log("Mounted Home.vue")

  getParticipants().then(response => {
    participants.value = response.data.participants;
  }).catch(error => {
    console.error("Error fetching participants:", error);
  });

  if (settings.value.event_id) {
    getEventById(settings.value.event_id).then(response => {
      event.value = response.data;
      console.log("Fetched event details:", response.data);
    }).catch(error => {
      console.error("Error fetching event:", error);
    });
  }
})

function avatarUri(seed: string) {
  return buildAvatarUri(makeStyle('glyphs'), seed);
}

</script>

<template>
  <div class="welcome">

    <h1 v-if="!event" class="welcome-title">Decision Theater</h1>
    <div v-if="event" class="event-info">
      <p class="event-date">{{ event.date && new Date(event.date).toLocaleDateString() }}</p>
      <h2>{{ event.name }}</h2>

      <p class="event-description">{{ event.description }}</p>
    </div>

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

        <Button style="margin-top: 1rem;" :disabled="!selected" :label="t('submit')"
          @click="router.push('/monitor/' + String(selected));" />
      </div>
    </div>

    <!-- Participant Menu -->
    <div v-if="selectedRole !== null && selectedRole === 'participant'">
      <p style="text-align: center;">Who are you?</p>
      <div class="participant-select-container">
        <div v-for="participant in seatedParticipants" :key="participant.id" class="participant-option"
          @click="router.push('/participant/' + participant.seat)">
          <img :src="avatarUri(participant.name)" width="88" height="88" />
          <span>{{ participant.name }}</span>
        </div>
      </div>
    </div>
  </div>

</template>


<style scoped>
.welcome-title {
  font-size: 3rem;
  color: var(--p-primary-50);
  text-shadow: var(--shadow-medium);
  margin-bottom: var(--space-large);
  text-align: center;

  font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
}

.participant-select-container {
  display: flex;
  flex-direction: row;
  gap: var(--space-large);
  flex-wrap: wrap;
  justify-content: center;
  max-width: 500px;
  overflow-y: auto;
  max-height: 500px;
  padding: var(--space-medium);
}

.participant-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-medium);
  font-weight: bold;
}

.participant-option img {
  border-radius: 50%;
  border: 3px solid var(--p-primary-200);
  box-shadow: var(--shadow-light);
}

.participant-option:hover {
  cursor: pointer;
  transform: scale(1.05);
  transition: transform 0.2s ease-in-out;
  box-shadow: var(--shadow-medium);

}

.home-btn {
  position: absolute;
  top: 1rem;
  left: 1rem;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

.event-info {
  text-align: center;
  color: var(--p-primary-50);
  margin-bottom: 2rem;

  h2 {
    font-size: 2rem;
  }

  .event-description {
    font-size: var(--fs-medium);
    color: var(--p-primary-200);
    max-width: 600px;
  }

  .event-date {
    font-size: var(--fs-large);
    color: var(--p-primary-200);
  }
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