<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import Message from 'primevue/message'

import { ref, onMounted, computed } from 'vue'
import router from '@/router'
import { useI18n } from 'vue-i18n';
import { settings } from '@/globals/settings'
import { type Event, getEventById } from '@/services/event_service'
import { authorizeModerator } from '@/services/settings_service' // adjust path

import { type Participant, getParticipants } from '@/services/participant_service'
import { type StyleName, styleNames, makeStyle, avatarUri as buildAvatarUri, previewUri, prettyName, } from '@/services/avatar_service';

const { t } = useI18n();
const event = ref<Event | null>(null)

const selectedRole = ref<string | null>(null)
const pin = ref<any>(null)
const pinError = ref(false)
const participants = ref<Participant[]>([])
const seatedParticipants = computed(() => participants.value.filter(p => p.seat !== null));

import '@/assets/main.css'
import { useSessionStorage } from '@vueuse/core'

const pinOk = useSessionStorage('pin_ok', '0')

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

async function submitPin() {
  try {
    const valid = await authorizeModerator(pin.value ?? '')
    if (!valid) {
      pinError.value = true
      pin.value = ''
      return
    }
    sessionStorage.setItem('pin_ok', '1')
    router.push('/moderator')
  } catch (e) {
    console.error('PIN check failed:', e)
    pinError.value = true
  }
}

function logout() {
  sessionStorage.removeItem('pin_ok')
  pinOk.value = '0'
  selectedRole.value = null
  pin.value = ''
  router.push('/home')
}

</script>

<template>
  <div class="welcome">

    <Message class="dev-mode-message" v-if="settings.dev_mode" severity="warn">
      <template #default>
        Development Mode is enabled. Authorization is bypassed.
      </template>
      <template #icon>
        <i class="material-symbols-outlined">warning</i>
      </template>
    </Message>

    <h1 v-if="!event" class="welcome-title">{{ this.$APP_NAME }}</h1>
    <div v-if="event" class="event-info">
      <p class="event-date">{{ event.date && new Date(event.date).toLocaleDateString() }}</p>
      <h2>{{ event.name }}</h2>

      <p class="event-description">{{ event.description }}</p>
    </div>

    <div class="role_options" v-if="selectedRole === null">


      <Card class="role_option_card " v-if="selectedRole === null"
        @click="selectedRole = 'moderator'; router.push('/moderator')">

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
.dev-mode-message {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
}

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