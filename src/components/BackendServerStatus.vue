<script lang="ts" setup>

import { backendServerStatusClass, getBackendServerStatus, backendServerUrl } from '@/services/bs_service.ts';
import Message from 'primevue/message';
import Button from 'primevue/button';
import Badge from 'primevue/badge';
import { ref, onMounted } from 'vue';

const props = defineProps<{
    size?: 'small' | null
}>()

const statusMessage = ref('Checking...')
const statusclass = ref(backendServerStatusClass.value)

onMounted(async () => {
    const status = await getBackendServerStatus()
    statusMessage.value = status.message
    statusclass.value = backendServerStatusClass.value
})

function refreshStatus() {
    statusMessage.value = 'Checking...'
    getBackendServerStatus().then(status => {
        statusMessage.value = status.message
        statusclass.value = backendServerStatusClass.value
    })
}

function stripBackendServerUrl(url: string): string {
    // remove http:// or https:// from the start and any trailing slash
    return url.replace(/^https?:\/\//, '').replace(/\/+$/, '')
}
</script>


<template>
    <div>
        <span v-if="props.size !== 'small'">
            <label for="register-backend-server">Backend Server Status</label>
            <Message :severity="statusclass">
                <template #icon>
                    <i v-if="statusclass === 'success'" class="material-symbols-outlined">cloud_done</i>
                    <i v-else class="material-symbols-outlined">cloud_alert</i>
                </template>
                <div style="display: flex; flex-direction: row; align-items: center; gap: 1rem; padding-left: 0.5rem">
                    <div style="display: flex; flex-direction: column; gap: 0rem">
                        <p style="padding: 0; margin: 0; font-weight: 700">{{ backendServerUrl }}</p>
                        <p style="padding: 0; margin: 0; font-weight: 400">{{ statusMessage }}</p>
                    </div>
                    <Button :severity="statusclass === 'error' ? 'danger' : statusclass" text @click="refreshStatus"
                        rounded>
                        <template #icon>
                            <i class="material-symbols-outlined">refresh</i>
                        </template>
                    </Button>
                </div>
            </Message>
        </span>

        <span v-if="props.size === 'small'">
            <div style="display: flex; flex-direction: row; align-items: center; gap: 0.5rem;">
                <Badge :severity="statusclass === 'error' ? 'danger' : statusclass"
                    style="align-self: center; flex-shrink: 0;" />
                <p style="padding: 0; margin: 0; font-weight: 400; font-family: 'Fira Code';
                font-size: var(--fs-small); ">{{ stripBackendServerUrl(backendServerUrl) }}</p>
                <Button text rounded @click="refreshStatus">
                    <template #icon>
                        <i class="material-symbols-outlined" style="font-size: 1.25rem;">refresh</i>
                    </template>
                </Button>
            </div>
        </span>
    </div>
</template>


<style scoped></style>