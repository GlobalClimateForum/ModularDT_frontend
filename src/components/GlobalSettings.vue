<script setup lang="ts">
import { ref } from 'vue'
import Column from 'primevue/column';
import { useI18n } from 'vue-i18n' 

const { locale, availableLocales } = useI18n()

const languageNames = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français'
}

// reactive settings
const settings = ref({
  cs_url: 'http://127.0.0.1:8002',
  number_of_screens: 4,
  background_image: ''
})

// save function - todo
const saveSettings = () => {
  console.log('Saved settings:', JSON.parse(JSON.stringify(settings.value)))
  alert('Settings saved!')
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
      <div class="form-group">
      <label for="cs_url">{{ $t('moderator.settings.cs_url') }}</label>
      <div class="input-with-button">
        <input 
          id="cs_url"
          v-model.trim="settings.cs_url" 
          type="text" 
          placeholder=""
          required
        />
        <button type="button" @click="testConnection" class="test-btn">Test</button>
      </div>
      </div>

      <!-- number of screens -->
      <div class="form-group">
        <label for="numberOfX">{{ $t('moderator.settings.numberscreens') }}</label>
        <input 
          id="number_of_screens"
          v-model.number="settings.number_of_screens" 
          type="number" 
          min="1"
          max="8"
          placeholder="4"
        />
      </div>

      <!-- background -->
      <div class="form-group">
        <label for="path">Url of background image:</label>
        <input 
          id="cs_url"
          v-model.trim="settings.cs_url" 
          type="text" 
          placeholder=""
        />
      </div>

      <div class="form-group"> 
      <label for="language">{{ $t('moderator.settings.language') }}</label>
       <select v-model="$i18n.locale" class="custom-select">
        <option
          v-for="locale in $i18n.availableLocales"
          :key="`locale-${locale}`"
          :value="locale"
        >
          {{ languageNames[locale] || locale }}
        </option>
      </select>
      </div> 

      <!-- Button -->
      <button type="submit" class="save-btn">Save</button>
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

label {
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
  background-color: var(--p-primary-900);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: bold;
}

.test-btn {
  padding: 10px; 
  background-color: var(--p-primary-900);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: bold;
  flex-shrink: 0; 
}

.input-with-button {
  display: flex;
  gap: 15px; /* gap between input field and button */
  width: 100%; 
}

.input-with-button input {
  flex: 1; 
  width: 100%; 
}
</style>
