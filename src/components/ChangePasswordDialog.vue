<script lang="ts" setup>
import { ref, computed } from 'vue';
import InputOtp from 'primevue/inputotp'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import '@/assets/main.css'
import { authorizeModerator, changePin } from '@/services/settings_service.ts'
import { settings } from '@/globals/settings.ts'
import { updateSettings } from '@/services/settings_service.ts'

const oldPinValid = ref(false)
const oldPin = ref('')
const newPin = ref('')
const confirmPin = ref('')
const pinLength = ref(settings.value.pin_length || 4)
const devMode = ref(settings.value.dev_mode || false)

const newPinComplete = computed(() => newPin.value.length === pinLength.value)
const confirmComplete = computed(() => confirmPin.value.length === pinLength.value)

const pinsMatch = computed(() => newPin.value === confirmPin.value)

const newPinValid = computed(() =>
    newPinComplete.value && confirmComplete.value && pinsMatch.value
)

const showMismatch = computed(() =>
    newPinComplete.value && confirmComplete.value && !pinsMatch.value
)

async function validatePin(pin: string): Promise<void> {
    if (pin.length < pinLength.value) {
        oldPinValid.value = false
        return
    }
    oldPinValid.value = await authorizeModerator(pin)
}

async function onChangePin() {
    if (newPinValid.value) {
        const success = await changePin(oldPin.value, newPin.value)
        if (success) {
            oldPin.value = ''
            newPin.value = ''
            confirmPin.value = ''
            oldPinValid.value = false
            alert('Pin changed successfully')
        } else {
            alert('Failed to change pin')
        }
    }
}

function onEnableDevMode() {
    if (confirm('Are you sure you want to enable development mode? This will disable pin protection and allow access to all features.')) {
        settings.value.dev_mode = true
        updateSettings({
            ...settings.value,
            dev_mode: true
        });
        alert('Development mode enabled')
    }
}


</script>

<template>

    <div class="label-container" v-if="settings.pin_set && !oldPinValid">
        <label>Enter old pin</label>
        <InputOtp v-model="oldPin" :length="pinLength" @update:modelValue="validatePin" :invalid="!oldPinValid" />
    </div>


    <div style="display: flex; flex-direction: column; gap: 1rem" v-if="!settings.pin_set || oldPinValid">

        <div class="label-container">
            <label>Development Mode</label>
            <ToggleSwitch v-model="devMode" />
        </div>

        <div class="label-container" v-if="!devMode">
            <label>Pin Length</label>
            <InputNumber v-model="pinLength" :min="4" :max="10" />
        </div>

        <div class="label-container" v-if="!devMode">
            <label>Enter new pin</label>
            <InputOtp v-model="newPin" :length="pinLength" />
        </div>

        <div class="label-container" v-if="!devMode">
            <label>Repeat new pin</label>
            <InputOtp v-model="confirmPin" :length="pinLength" :invalid="showMismatch" />
        </div>

        <Button severity="warn" :disabled="!newPinValid" label="Change Pin" @click="onChangePin" v-if="!devMode">
            <template #icon>
                <i class="material-symbols-outlined">lock</i>
            </template>
        </Button>

        <Button severity="warn" label="Enable Dev Mode" @click="onEnableDevMode" v-if="devMode">
            <template #icon>
                <i class="material-symbols-outlined">code</i>
            </template>
        </Button>

    </div>

    <small v-if="showMismatch" class="pin-error">Pins do not match</small>
</template>

<style scoped>
.pin-error {
    color: var(--red-500, #ef4444);
}
</style>