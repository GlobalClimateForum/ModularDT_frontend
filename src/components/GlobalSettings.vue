<script setup lang="ts">
import { computed } from 'vue';
import { updatePrimaryPalette } from '@primeuix/themes';
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast';

import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select'; // In v4 heißt Dropdown jetzt "Select"
import Button from 'primevue/button';
import Toolbar from 'primevue/toolbar';
import SelectButton from 'primevue/selectbutton';

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
    language: settings.value.language,
    palette: settings.value.palette,
    theme: settings.value.theme
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
};

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

        <div class="label-container">
          <label>Main Color</label>

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
              <span v-else>Select a palette</span>
            </template>
          </Select>
        </div>

        <div class="label-container">
          <label>Theme</label>
          <SelectButton fluid v-model="settings.theme" :options="themeOptions" optionLabel="label"
            optionValue="value" />
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
          General
        </h1>

        <div class="label-container">
          <label for="language" class="form-label">{{ $t('moderator.settings.language') }}</label>
          <!-- Select-Komponente für das Dropdown-Menü -->
          <Select id="language" v-model="settings.language" :options="translatedLocales" optionLabel="label"
            optionValue="value" fluid />
        </div>

        <div class="label-container">
          <label>CARTO API Key</label>
          <InputText v-model="settings.carto_api_key" type="text" fluid />
        </div>

        <div style="display: flex; flex-direction: row; gap: var(--space-medium); align-items: flex-end; width: 100%;">
          <div class="label-container">
            <label>Moderator Pin</label>
            <InputText v-model="settings.moderator_pin" type="text" fluid />
          </div>
          
          <Button  label="Change" >
            <template #icon>
              <i class="material-symbols-outlined">password</i>
            </template>
          </Button>

          <Button>
            <template #icon>
              <i class="material-symbols-outlined">visibility</i>
            </template>
          </Button>
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

.sub-panel {
  background-color: var(--surface);
  border-radius: var(--br-small);
  box-shadow: var(--shadow-light);

  display: flex;
  flex-direction: column;
  gap: var(--space-medium);
  padding-top: 0;
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
