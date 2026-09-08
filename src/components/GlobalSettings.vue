<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast';

import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select'; // In v4 heißt Dropdown jetzt "Select"
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';

import { settings, fetchSettings } from '@/globals/settings'
import { updateSettings } from "@/services/settings_service";
import ContentServerStatus from '@/components/ContentServerStatus.vue';
import BackendServerStatus from '@/components/BackendServerStatus.vue';

// @ts-ignore: module has no declaration file
import { LANGUAGE_NAMES } from '@/constants/languages.ts'

import palettes from '@/assets/palettes.json'
import '@/assets/main.css'

const { availableLocales } = useI18n()
const toast = useToast();

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
    background_image: settings.value.background_image,
    language: settings.value.language
  };

  await updateSettings(current_settings).then(response => {
    toast.add({ severity: 'success', summary: 'Success', detail: 'Settings saved successfully', life: 3000 })
  }).catch(error => {
    console.error("Error saving settings:", error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save settings', life: 3000 })
  });
  await fetchSettings()
}

// better: go via backend.
const testConnection = async () => {
  const url = `${settings.value.cs_url}/ping`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server-Fehler: Status ${response.status}`);
    }

    const textData = await response.text();
    console.log('Antwort vom Server:', textData);

    // Falls der Server JSON zurückgibt:
    // const jsonData = await response.json();
    // console.log('JSON vom Server:', jsonData);

  } catch (error) {
    alert(`Connection test failed! ${error.message}`);
  }

}

</script>

<template>
  <form @submit.prevent="saveSettings" class="settings-form">

    <Toolbar fluid>
      <template #start>
        <h1 class="dashboard_label">
          Global Settings
        </h1>
      </template>

      <template #end>
        <Button type="button" :label="$t('moderator.save')" class="save-btn" @click="saveSettings" />
      </template>
    </Toolbar>

    <div class="settings-container">

      <div class="sub-panel">
        <h1 class="dashboard_label">
          Appearance
        </h1>

        <div class="label-container">
          <label for="background_url" class="form-label">{{ $t('moderator.settings.background_image') }}</label>
          <InputText id="background_url" v-model.trim="settings.background_image" type="text" fluid />
        </div>
      </div>

      <div class="sub-panel">
        <h1 class="dashboard_label">
          Server
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

      <div class="sub-panel">
        <h1 class="dashboard_label">
          Language
        </h1>

        <div class="label-container">
          <label for="language" class="form-label">{{ $t('moderator.settings.language') }}</label>
          <!-- Select-Komponente für das Dropdown-Menü -->
          <Select id="language" v-model="settings.language" :options="translatedLocales" optionLabel="label"
            optionValue="value" fluid />
        </div>

      </div>

      <div class="sub-panel">
        <h1 class="dashboard_label">Presentation</h1>
        <div class="label-container">
          <label for="number_of_screens" class="form-label">{{ $t('moderator.settings.numberscreens') }}</label>
          <InputNumber id="number_of_screens" v-model="settings.number_of_screens" :min="1" :max="8" placeholder="4"
            fluid />
        </div>
      </div>

 
    </div>
  </form>

</template>

<style scoped>
.sub-panel {
  background-color: var(--surface);
  border-radius: var(--br-small);
  box-shadow: var(--shadow-light); 
}

.settings-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-large);
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-large);
}


</style>
