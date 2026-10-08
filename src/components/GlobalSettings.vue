<script setup lang="ts">
// Vue-stuff
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
import { updatePrimaryPalette } from '@primeuix/themes';
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast';
import { useDialog } from 'primevue/usedialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select'; // In v4 heißt Dropdown jetzt "Select"
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import SelectButton from 'primevue/selectbutton';
import Password from 'primevue/password';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';

// globals and services
import { useRouter } from 'vue-router';
import { settings, fetchSettings } from '@/globals/settings'
import { updateSettings, isModerator, clearModerator } from "@/services/settings_service";
import { sendMonitorsUpdate } from "@/services/monitor_service";
import { getEventOptions, getEventById, type Event, type EventOption } from '@/services/event_service'
// @ts-ignore: module has no declaration file
import { LANGUAGE_NAMES } from '@/constants/languages.ts'
import palettes from '@/assets/palettes.json'
import '@/assets/main.css'
// components
import ContentServerStatus from '@/components/ContentServerStatus.vue';
import BackendServerStatus from '@/components/BackendServerStatus.vue';

const { availableLocales } = useI18n()
const toast = useToast();
const dialog = useDialog();
const changePasswordComponent = defineAsyncComponent(() => import('@/components/ChangePasswordDialog.vue'));
const router = useRouter();

const availablePalettes = computed(() => {
  return Object.keys(palettes).map(key => ({
    label: key,
    value: key
  }));
});

const themeOptions = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' }
];

const eventOptions = ref<EventOption[]>([]);
const selectedEvent = ref<Event | null>(null);

const translatedLocales = computed(() => {
  return availableLocales.map(locale => ({
    label: LANGUAGE_NAMES[locale] || locale,
    value: locale
  }));
});

// save function - todo
const saveSettings = async () => {

  const current_settings = {
    cs_url: settings.value.cs_url,
    number_of_screens: settings.value.number_of_screens,
    show_screen_id: settings.value.show_screen_id,
    background_image_on_empty_screens: settings.value.background_image_on_empty_screens,
    background_image_on_welcome_screens: settings.value.background_image_on_welcome_screens,
    background_image_on_all_slides_per_default: settings.value.background_image_on_all_slides_per_default,
    background_image: settings.value.background_image,
    language: settings.value.language,
    palette: settings.value.palette,
    theme: settings.value.theme,
    carto_api_key: settings.value.carto_api_key,
    event_id: selectedEvent.value ? selectedEvent.value.id : null,
    dev_mode: settings.value.dev_mode
  };

  await updateSettings(current_settings).then(response => {
    toast.add({ severity: 'success', summary: 'Success', detail: 'Settings saved successfully', life: 3000 })
  }).catch(error => {
    console.error("Error saving settings:", error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save settings', life: 3000 })
  });
  await fetchSettings()

}

const onPaletteChange = ({ value }: { value: string }) => {
  updatePrimaryPalette(palettes[value]);
  settings.value.palette = value;
  updateSettingsForMonitors()
};

function changePassword() {
  dialog.open(changePasswordComponent, {
    props: {
      header: 'Change Moderator Pin',
      style: { width: '400px' },
      modal: true,
    },
  });
}

function onEventChange(eventID: number) {
  if (eventID) {
    // Fetch the event details
    getEventById(eventID).then(response => {
      selectedEvent.value = response.data; // Write the Event details to the selectedEvent ref
      // update the settings with the selected event ID
      settings.value.event_id = eventID;
    }).catch(error => {
      console.error("Error fetching selected event:", error);
    })
  }
}

function onLogout() {
  clearModerator(); 
  router.push('/home');
}

function onAddEvent() {
  dialog.open(defineAsyncComponent(() => import('@/components/AddEventDialog.vue')), {
    props: {
      header: 'Add New Event',
      style: { width: '400px' },
      modal: true,
    },
    onClose: async () => {
      eventOptions.value = await getEventOptions();  // refresh dropdown
    }
  });
}

onMounted(async () => {
  eventOptions.value = await getEventOptions();
  onEventChange(settings.value.event_id);
});

function updateSettingsForMonitors() {
  sendMonitorsUpdate({
    'payload': {
      'event_type': 'settings_update',
      'settings': {
        'number_of_screens': settings.value.number_of_screens,
        'background_image': settings.value.background_image,
        'background_image_on_empty_screens': settings.value.background_image_on_empty_screens,
        'background_image_on_welcome_screens': settings.value.background_image_on_welcome_screens,
        'show_screen_id': settings.value.show_screen_id,
        'palette': settings.value.palette,
      }
    }
  })
}
</script>

<template>
  <form @submit.prevent="saveSettings" class="settings-form">

    <div class="dashboard-header" style="justify-content: space-between; align-items: center; width: 100%;">
      <h1 class="dashboard_label">
        {{ $t('moderator.settings.global_settings') }}
      </h1>
      <Button type="button" :label="$t('moderator.save')" class="save-btn" @click="saveSettings" />
    </div>

    <div class="settings-container">

      <div class="sub-panel-adaptive">
        <h1 class="dashboard_label">
          {{ $t('moderator.settings.appearance') }}
        </h1>

        <div class="label-container">
          <label for="background_url" class="form-label">{{ $t('moderator.settings.background_image') }}</label>
          <InputText id="background_url" v-model.trim="settings.background_image" type="text" fluid />
        </div>

        <div class="labeled-checkbox">
          <Checkbox v-model="settings.background_image_on_empty_screens" binary
            inputId="background_image_on_empty_screens-checkbox" @change="updateSettingsForMonitors()" />
          <Label for="background_image_on_empty_screens-checkbox"> {{
            $t('moderator.settings.background_image_on_empty_screens') }} </Label>
        </div>

        <div class="labeled-checkbox">
          <Checkbox v-model="settings.background_image_on_welcome_screens" binary
            inputId="background_image_on_welcome_screens-checkbox" @change="updateSettingsForMonitors()" />
          <Label for="background_image_on_welcome_screens-checkbox"> {{
            $t('moderator.settings.background_image_on_welcome_screens') }} </Label>
        </div>

        <div class="labeled-checkbox">
          <Checkbox v-model="settings.background_image_on_all_slides_per_default" binary
            inputId="background_image_on_all_slides_per_default-checkbox" @change="updateSettingsForMonitors()" />
          <Label for="background_image_on_all_slides_per_default-checkbox"> {{
            $t('moderator.settings.background_image_on_all_slides_per_default') }} </Label>
        </div>

        <div class="label-container">
          <label>{{ $t('moderator.settings.palette') }}</label>

          <Select fluid v-model="settings.palette" :options="availablePalettes" optionLabel="label" optionValue="value"
            @change="onPaletteChange">
            <template #option="{ option }">
              <div class="color-option">
                <div class="palette">
                  <div v-for="(hex, step) in palettes[option.value]" :key="step" class="swatch"
                    :style="{ backgroundColor: hex }">
                  </div>
                </div>
                <p>{{ option.value }}</p>
              </div>
            </template>
            <template #value="{ value }">
              <div class="color-option" v-if="value">
                <div class="palette">
                  <div v-for="(hex, step) in palettes[value]" :key="step" class="swatch"
                    :style="{ backgroundColor: hex }"></div>
                </div>
                <p>{{ value }}</p>
              </div>
              <span v-else>{{ $t('moderator.settings.select_palette') }}</span>
            </template>
          </Select>
        </div>

        <div class="label-container">
          <label>{{ $t('moderator.settings.theme') }}</label>
          <SelectButton fluid v-model="settings.theme" :options="themeOptions" optionLabel="label"
            optionValue="value" />
        </div>
      </div>

      <div class="sub-panel-adaptive">
        <h1 class="dashboard_label">
          {{ $t('moderator.settings.server') }}
        </h1>

        <div style="display: flex; flex-direction: column; gap: var(--space-medium); width: 100%;">
          <BackendServerStatus />
          <ContentServerStatus />
          <div class="label-container">
            <label for="cs_url">{{ $t('moderator.settings.cs_url') }}</label>
            <InputText id="cs_url" v-model.trim="settings.cs_url" type="text" fluid required />
          </div>
        </div>
      </div>

      <div class="sub-panel-adaptive">
        <h1 class="dashboard_label">
          {{ $t('moderator.settings.general') }}
        </h1>

        <div class="label-container">
          <label for="language" class="form-label">{{ $t('moderator.settings.language') }}</label>
          <!-- Select-Komponente für das Dropdown-Menü -->
          <Select id="language" v-model="settings.language" :options="translatedLocales" optionLabel="label"
            optionValue="value" fluid />
        </div>

        <div class="label-container">
          <label>CARTO API Key</label>
          <Password v-model="settings.carto_api_key" :feedback="false" toggleMask fluid />
        </div>

        <div style="display: flex; flex-direction: row; gap: var(--space-medium); align-items: flex-end; width: 100%;">
          <div class="label-container">
            <label>{{ $t('moderator.settings.moderator_pin') }}</label>
            <Button label="Change" size="small" @click="changePassword">
              <template #icon>
                <i class="material-symbols-outlined">password</i>
              </template>
            </Button>
          </div>

          <div class="label-container" v-if="isModerator()">
            <label>{{ $t('moderator.settings.moderator_logout') }}</label>
            <Button size="small" label="Logout" @click="onLogout()">
              <template #icon>
                <i class="material-symbols-outlined">logout</i>
              </template>
            </Button>
          </div>
        </div>
      </div>

      <div class="sub-panel-adaptive">
        <h1 class="dashboard_label">Presentation</h1>
        <div class="label-container">
          <label for="number_of_screens" class="form-label">{{ $t('moderator.settings.numberscreens') }}</label>
          <InputNumber id="number_of_screens" v-model="settings.number_of_screens" :min="1" :max="8" placeholder="4"
            fluid @update:modelValue="updateSettingsForMonitors()" />
        </div>
        <div class="labeled-checkbox">
          <Checkbox v-model="settings.show_screen_id" binary inputId="show_screen_id-checkbox"
            @change="updateSettingsForMonitors()" />
          <Label for="show_screen_id-checkbox"> {{ $t('moderator.settings.show_screen_id') }}</Label>
        </div>
      </div>

      <div class="sub-panel-adaptive">
        <h1 class="dashboard_label">Event Settings</h1>

        <Button label="Add Event" fluid size="small" @click="onAddEvent()">
          <template #icon>
            <i class="material-symbols-outlined">event</i>
          </template>
        </Button>

        <div class="label-container">
          <label>Active Event</label>
          <Select fluid v-model="settings.event_id" :options="eventOptions" optionLabel="label" optionValue="value"
            @change="onEventChange($event.value)"></Select>
        </div>

        <div class="label-container" v-if="selectedEvent">
          <label>Event Name</label>
          <InputText v-model="selectedEvent.name" fluid />
        </div>

        <div class="label-container" v-if="selectedEvent">
          <label>Description</label>
          <Textarea v-model="selectedEvent.description" fluid />
        </div>

        <div class="label-container" v-if="selectedEvent">
          <label>Date</label>
          <DatePicker v-model="selectedEvent.date" fluid appendTo="body" />
        </div>


      </div>

    </div>
  </form>

</template>

<style scoped>
#cs_url {
  font-family: 'Fira Code', monospace;
  font-weight: light;
  color: var(--text-color);
}

.color-option {
  display: flex;
  align-items: center;
  gap: var(--space-small);

  p {
    margin: 0;
    font-size: var(--fs-medium);
    font-style: italic;
    text-transform: capitalize;
  }
}

.palette {
  display: flex;
  flex-direction: row;
}

.swatch {
  width: 20px;
  height: 20px;
}

.settings-form {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.settings-container {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: max-content;
  align-content: start;
  align-items: start;
  gap: var(--space-large);

  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-small);

  mask-image: linear-gradient(to bottom, black calc(100% - 2.5rem), transparent);
  mask-image: linear-gradient(to top, black calc(100% - 0.5rem), transparent);

  padding-bottom: 2.5rem;
}


.label-container :deep(.p-password) {
  width: 100%;
}
</style>
