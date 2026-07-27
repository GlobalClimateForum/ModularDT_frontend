<script lang="ts" setup>

import { contentServerStatusClass, getContentServerStatus } from '@/services/cs_service.ts';
import Message from 'primevue/message';
import { settings } from '@/globals/settings'
import Button from 'primevue/button';
import Badge from 'primevue/badge';
import { ref, onMounted } from 'vue';

const props = defineProps<{
    size?: 'small' | null
}>()

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

function stripContentServerUrl(url: string): string {
    // remove http:// or https:// from the beginning of the url
    return url.replace(/^https?:\/\//, '')
}

</script>


<template>
    <div class="label-container">
        <span v-if="props.size !== 'small'">
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
                font-size: var(--fs-small); ">{{ stripContentServerUrl(settings.cs_url) }}</p>
                <Button  text rounded
                    @click="refreshStatus">
                    <template #icon>
                        <i class="material-symbols-outlined" style="font-size: 1.25rem;">refresh</i>
                    </template>
                </Button>
            </div>
        </span>
    </div>
</template>


<style scoped></style>