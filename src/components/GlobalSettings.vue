<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import Column from 'primevue/column';
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast';

import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select'; // In v4 heißt Dropdown jetzt "Select"
import Button from 'primevue/button';

import { settings } from '@/utils/settings'
import { getSettings, updateSettings } from "@/services/settings_service";
import ContentServerStatus from '@/components/ContentServerStatus.vue';

// @ts-ignore: module has no declaration file
import { LANGUAGE_NAMES } from '@/constants/languages.ts'

const { locale, availableLocales } = useI18n()
const toast = useToast();

const translatedLocales = computed(() => {
  return availableLocales.map(locale => ({
    label: LANGUAGE_NAMES[locale] || locale,
    value: locale
  }));
});

//locale.value = settings.value.language
watch(() => settings.value.language, (newLanguage) => {
  locale.value = newLanguage
}, { immediate: true })

// save function - todo
const saveSettings = () => {
  //console.info('Saved settings:', JSON.parse(JSON.stringify(settings.value)))
  const fetched_settings = {
    cs_url: settings.value.cs_url,
    number_of_screens: settings.value.number_of_screens,
    background_image: settings.value.background_image,
    language: settings.value.language
  };

  updateSettings(fetched_settings).then(response => {
    toast.add({ severity: 'success', summary: 'Success', detail: 'Settings saved successfully', life: 3000 })
  }).catch(error => {
    console.error("Error saving settings:", error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save settings', life: 3000 })
  });
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
  <div class="settings-container">

    <form @submit.prevent="saveSettings" class="settings-form">
      <!-- CS URL -->
       <ContentServerStatus />
      <div class="form-group">
        <label for="cs_url" class="form-label">{{ $t('moderator.settings.cs_url') }}</label>
        <div class="input-with-button">
          <InputText id="cs_url" v-model.trim="settings.cs_url" type="text" fluid required />
          <Button type="button" label="Test" @click="testConnection" class="test-btn" />
        </div>
      </div>

      <!-- number of screens -->
      <div class="form-group">
        <label for="number_of_screens" class="form-label">{{ $t('moderator.settings.numberscreens') }}</label>
        <InputNumber id="number_of_screens" v-model="settings.number_of_screens" :min="1" :max="8" placeholder="4"
          fluid />
      </div>

      <!-- background -->
      <div class="form-group">
        <label for="background_url" class="form-label">{{ $t('moderator.settings.background_image') }}</label>
        <InputText id="background_url" v-model.trim="settings.background_image" type="text" fluid />
      </div>

      <!-- language -->
      <div class="form-group">
        <label for="language" class="form-label">{{ $t('moderator.settings.language') }}</label>
        <!-- Select-Komponente für das Dropdown-Menü -->
        <Select id="language" v-model="settings.language" :options="translatedLocales" optionLabel="label"
          optionValue="value" fluid />
      </div>

      <!-- Button -->
      <Button type="button" :label="$t('moderator.save')" class="save-btn" @click="saveSettings" />
    </form>
  </div>
</template>

<style scoped>
.settings-container {
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-family: sans-serif;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--p-content-background, #f8f9fa);
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-label {
  font-weight: bold;
  font-size: 0.9rem;
}

input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.custom-select {
  padding: 8px 12px;
  font-size: 1rem;
}

.save-btn {
  padding: 10px;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: bold;
  max-width: 160px;
  min-width: max-content;
}

.test-btn {
  padding: 10px;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: bold;
}

.input-with-button {
  display: flex;
  gap: 15px;
  /* gap between input field and button */
  width: 100%;
}

.input-with-button input {
  flex: 1;
  width: 100%;
}
</style>
