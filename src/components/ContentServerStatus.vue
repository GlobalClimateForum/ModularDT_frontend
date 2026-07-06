<script lang="ts" setup>

import { contentServerStatusClass, getContentServerStatus } from '@/services/api.ts';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { settings } from '@/utils/settings'
import Button from 'primevue/button';
import { ref, onMounted } from 'vue';

const statusMessage = ref('Checking...')
const statusclass = ref(contentServerStatusClass.value)

onMounted(async () => {
    const status = await getContentServerStatus()
    statusMessage.value = status.message
    statusclass.value = contentServerStatusClass.value
})

function refreshStatus() {
    statusMessage.value = 'Checking...'
    getContentServerStatus().then(status => {
        statusMessage.value = status.message
        statusclass.value = contentServerStatusClass.value
    })
}

</script>


<template>
    <div class="label-container">
        <label for="register-content-server">Content Server Status</label>
        <Message :severity="statusclass">
            <template #icon>
                <i v-if="statusclass === 'success'" class="material-symbols-outlined">cloud_done</i>
                <i v-else class="material-symbols-outlined">cloud_alert</i>
            </template>
            <div style="display: flex; flex-direction: row; align-items: center; gap: 1rem; padding-left: 0.5rem">
                <div style="display: flex; flex-direction: column; gap: 0rem">
                    <p style="padding: 0; margin: 0; font-weight: 700">{{ settings.cs_url }}</p>
                    <p style="padding: 0; margin: 0; font-weight: 400">{{ statusMessage }}</p>
                </div>
                <Button :severity="statusclass === 'error' ? 'danger' : statusclass" text @click="refreshStatus" rounded>
                    <template #icon>
                        <i class="material-symbols-outlined">refresh</i>
                    </template>
                </Button>
            </div>

        </Message>
    </div>
</template>


<style scoped></style>