<script setup lang="ts">
import '@/assets/main.css'
import InputOtp from 'primevue/inputotp'
import ToggleSwitch from 'primevue/toggleswitch'

import { ref, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { settings } from '@/globals/settings'
import { authorizeModerator, setModerator } from '@/services/settings_service'

const router = useRouter()

const pinWrapper = ref<HTMLElement | null>(null)

const pin = ref('')
const stayLoggedIn = ref(false)
const pinError = ref(false)
const shaking = ref(false)
const checking = ref(false)

function focusFirstInput() {
    pinWrapper.value?.querySelector('input')?.focus()
}

onMounted(() => {
    focusFirstInput();
})

watch(pin, async (value) => {
    // Only check the PIN if it has the correct length
    if (!value || value.length !== Number(settings.value.pin_length)) return

    // Reset error state and disable the input while checking
    pinError.value = false
    checking.value = true
    let valid = false

    try {
        valid = await authorizeModerator(value)
    } catch (error) {
        console.error('PIN check failed:', error)
    } finally {
        checking.value = false // re-enable the input
    }

    if (valid) {
        // Persistent (localStorage) if stayLoggedIn, else sessionStorage
        setModerator(stayLoggedIn.value)
        await router.push('/moderator')
        return
    }

    // Wrong PIN or request failed: show error, shake, reset and refocus
    pinError.value = true
    shaking.value = true
    pin.value = ''
    await nextTick() // wait until the inputs are rendered as enabled again
    focusFirstInput() // Focus the first input
})

</script>

<template>
    <div class="container">
        <div class="login-box glass">
            <i class="material-symbols-outlined lock-icon">lock_person</i>

            <div class="heading">
                <h1>Moderator login</h1>
                <p>Enter your PIN to continue.</p>
            </div>

                {{  settings.pin_length }}-digit PIN

            <div class="pin_enter" :class="{ shake: shaking }" @animationend="shaking = false" ref="pinWrapper">
                <InputOtp v-model="pin" :length="settings.pin_length" :invalid="pinError" :disabled="checking"
                type="password"
                    integer-only mask />
            </div>

            <small class="error" :class="{ visible: pinError }" role="alert">
                Wrong PIN, please try again.
            </small>

            <label class="stay-row" for="stay-logged-in">
                <ToggleSwitch v-model="stayLoggedIn" input-id="stay-logged-in" />
                <span>Stay logged in</span>
            </label>
        </div>
    </div>
</template>

<style scoped>
.container {
    min-height: 100dvh;
    background: var(--bg-main);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--space-medium);
    box-sizing: border-box;
}

.login-box {
    width: 100%;
    max-width: 26rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-medium);
    padding: var(--space-large);
    text-align: center;
    border-radius: var(--br-medium);
    color: white;
}

.lock-icon {
    font-size: var(--fs-xlarge);
    padding: var(--space-small);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.heading h1 {
    margin: 0 0 0.25rem;
    font-size: var(--fs-large);
}

.heading p {
    margin: 0;
    opacity: 0.75;
}

.pin_enter:deep(.p-inputotp) {
    gap: var(--space-small);
}

.pin_enter:deep(.p-inputtext) {
    width: 3rem;
    height: 3.5rem;
    font-size: var(--fs-large);
    text-align: center;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--br-large);
    backdrop-filter: blur(4.3px);
    color: white;
    font-weight: 700;
    font-family: 'Fira Code', monospace;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.pin_enter:deep(.p-inputtext:focus) {
    border-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.15);
}

.pin_enter:deep(.p-invalid) {
    border-color: #ff8a8a;
}

.error {
    min-height: 1.25em;
    /* reserves space so nothing jumps */
    color: #ffb3b3;
    opacity: 0;
    transition: opacity 0.2s;
}

.error.visible {
    opacity: 1;
}

.stay-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    font-size: 0.9rem;
    opacity: 0.85;
}

.shake {
    animation: shake 0.35s;
}

@keyframes shake {

    0%,
    100% {
        transform: translateX(0);
    }

    25% {
        transform: translateX(-6px);
    }

    75% {
        transform: translateX(6px);
    }
}

@media (prefers-reduced-motion: reduce) {
    .shake {
        animation: none;
    }
}
</style>