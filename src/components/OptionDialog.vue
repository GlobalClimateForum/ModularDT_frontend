<script setup lang="ts">
import { ref, computed } from 'vue';
import { dialogEmitter } from '@/services/dialog_service';
import Dialog from 'primevue/dialog';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import '@/assets/main.css'
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const visible = ref(false);
const selectedOptions = ref<string[]>([]);
const currentOptions = ref<Array<{ id: string; label: string }>>([]);
const title = ref(`${t('select_options')}`);
let resolveDialog: ((value: any) => void) | null = null;

// Computed Property für "Select All"
const selectAll = computed({
    get() {
        return (
            selectedOptions.value.length === currentOptions.value.length &&
            selectedOptions.value.length > 0
        );
    },
    set(newVal) {
        if (newVal) {
            selectedOptions.value = currentOptions.value.map((o) => o.id);
        } else {
            selectedOptions.value = [];
        }
    },
});

// Toggle einzelne Option
const toggleOption = (id: string, checked: boolean) => {
    if (checked) {
        if (!selectedOptions.value.includes(id)) {
            selectedOptions.value.push(id);
        }
    } else {
        selectedOptions.value = selectedOptions.value.filter((opt) => opt !== id);
    }
};

// Dialog öffnen
dialogEmitter.on('open-option-dialog', ({ options, title: dialogTitle, resolve }) => {
    currentOptions.value = options;
    selectedOptions.value = [];
    title.value = dialogTitle || `${t('select_options')}`;
    resolveDialog = resolve;
    visible.value = true;
});

// Bestätigen
const confirm = () => {
    const selected = currentOptions.value.filter((o) =>
        selectedOptions.value.includes(o.id)
    );
    resolveDialog?.(selected);
    visible.value = false;
};

// Abbrechen
const cancel = () => {
    resolveDialog?.(null);
    visible.value = false;
};
</script>

<template>
    <Dialog v-model:visible="visible" :header="title" :modal="true" :style="{ width: '500px' }" @hide="cancel">
        <div style="display: flex; flex-direction: column; gap: 15px;">
            <!-- Select All Checkbox -->
            <div style="display: flex; align-items: center; gap: 10px;">
                <Checkbox v-model="selectAll" input-id="select_all" binary />
                <label for="select_all" style="font-size: 1.125rem !important; font-weight: bold;">
                    {{ t('select_all') }}
                </label>
            </div>

            <Divider />

            <!-- Individual Options -->
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <div v-for="option in currentOptions" :key="option.id"
                    style="display: flex; align-items: center; gap: 10px;">
                    <Checkbox :model-value="selectedOptions.includes(option.id)" :input-id="`option_${option.id}`"
                        binary @update:model-value="(val) => toggleOption(option.id, val)" />
                    <label :for="`option_${option.id}`" style="font-size: 1.125rem !important;">
                        {{ option.label }}
                    </label>
                </div>
            </div>
        </div>

        <template #footer>
            <Button icon="pi pi-times" @click="cancel" class="p-button-text" style="white-space: nowrap; width: auto; padding: 0.5rem 1.5rem;">
                {{ t('moderator.confirmation-cancel') }}
            </Button>
            <Button icon="pi pi-check" @click="confirm" style="white-space: nowrap; width: auto; padding: 0.5rem 1.5rem;">
                {{ t('moderator.confirmation-ok') }}
            </Button>
        </template>
    </Dialog>
</template>

<style scoped>
/* Optional: Zusätzliche Styles */
</style>
