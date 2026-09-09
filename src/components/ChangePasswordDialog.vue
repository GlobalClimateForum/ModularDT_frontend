<script lang="ts" setup>
import { ref, computed } from 'vue';
import InputOtp from 'primevue/inputotp'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import '@/assets/main.css'
import { authorizeModerator, changePin } from '@/services/settings_service.ts'
import { settings } from '@/globals/settings.ts'

const oldPinValid = ref(false)
const oldPin = ref('')
const newPin = ref('')
const confirmPin = ref('')
const pinLength = ref(6)

async function validatePin(pin: string): Promise<void> {
    if (pin.length < 6) {
        oldPinValid.value = false
        return
    }
    oldPinValid.value = await authorizeModerator(pin)
}

async function onChangePin() {
    if (newPinValid.value) {
        await changePin(oldPin.value , newPin.value)
    }
}

const newPinComplete = computed(() => newPin.value.length === pinLength.value)
const confirmComplete = computed(() => confirmPin.value.length === pinLength.value)
const pinsMatch = computed(() => newPin.value === confirmPin.value)

const newPinValid = computed(() =>
    newPinComplete.value && confirmComplete.value && pinsMatch.value
)

const showMismatch = computed(() =>
    newPinComplete.value && confirmComplete.value && !pinsMatch.value
)
</script>

<template>

    <div class="label-container" v-if="settings.pin_set">
        <label>Enter old pin</label>
        <InputOtp v-model="oldPin" :length="pinLength" @update:modelValue="validatePin" :invalid="!oldPinValid" />
    </div>

    <div style="display: flex; flex-direction: column; gap: 1rem" v-if="!settings.pin_set || oldPinValid">
        <div class="label-container">
            <label>Pin Length</label>
            <InputNumber v-model="pinLength" :min="4" :max="8" />
        </div>

        <div class="label-container">
            <label>Enter new pin</label>
            <InputOtp v-model="newPin" :length="pinLength" />
        </div>

        <div class="label-container">
            <label>Repeat new pin</label>
            <InputOtp v-model="confirmPin" :length="pinLength" :invalid="showMismatch" />
        </div>

        <Button severity="warn" :disabled="!newPinValid" label="Change Pin" @click="onChangePin">
            <template #icon>
                <i class="material-symbols-outlined">lock</i>
            </template>
            Change Pin

        </Button>
    </div>

    <small v-if="showMismatch" class="pin-error">Pins do not match</small>
</template>

<style scoped>
.pin-error {
    color: var(--red-500, #ef4444);
}
</style>