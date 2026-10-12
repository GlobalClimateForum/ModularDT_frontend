<script lang="ts" setup>
// Vue stuff
import { ref, onMounted, onUnmounted, computed } from 'vue'
import DataTable from 'primevue/datatable';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import { useConfirm } from "primevue/useconfirm";
import { useI18n } from 'vue-i18n';
import MultiSelect from 'primevue/multiselect';
import { useToast } from 'primevue/usetoast'
// globals and services
import { type ParameterChange } from '@/services/parameterstore_service'
import parameterStore from '@/services/parameterstore_service'
import { slideParameters, fetchSlideParameters } from '@/globals/slide_parameters';
import { globalParameters, fetchGlobalParameter } from '@/globals/global_parameters';
import { deleteGlobalParameter, deleteGlobalParameters, saveGlobalParameter, type GlobalParameter } from '@/services/global_parameter_service'
import { useItemDeletion } from '@/generics/deleteItem'


const { onConfirmDeleteItem } = useItemDeletion();
const { t } = useI18n();
const confirm = useConfirm();
const toast = useToast();

const parameterChanges = ref<ParameterChange[]>([])
const addParameterActive = ref<Boolean>(false)
const parameterName = ref<string>("");
const autoConnection = ref<Boolean>(false);
const selectedParameterType = ref<string | null>(null);


const parameterTypeOptions = ref<{ label: string; value: string }[]>([
    { label: 'Boolean', value: 'Boolean' },
    { label: 'Number', value: 'Number' },
    { label: 'String', value: 'String' },
    { label: 'Selection', value: 'Selection' }
]);

const parameterValueOption = ref<string>("");
const parameterValueOptions = ref<string[]>([]);

const selectedSlideParameters = ref<number[]>([]);
const slideParameterArray = ref<{ label: string; value: number }[]>([]);

const selectedGlobalParameter = ref<GlobalParameter | null>(null);
const editingRows = ref<GlobalParameter[]>([]);

onMounted(async () => {
    fetchGlobalParameter()
    await fetchSlideParameters()
    const stop = parameterStore.subscribe((c) => parameterChanges.value.push(c))
    onUnmounted(() => {
        stop()
    })
    slideParameterArray.value = slideParameters.value.map((p) => ({ label: p.name + " of type " + p.type + " on section " + p.slide_seciton, value: p.id ? p.id : -1 })).sort((x, y) => x.label.localeCompare(y.label))
    //console.log("globalParameters: ", globalParameters.value)
    //console.log("slideParameters: ", slideParameters.value)
})

function onAddParameter() {
    addParameterActive.value = true
}

function onCancelAddParameter() {
    addParameterActive.value = false
}

function onSaveParameter() {
    addParameterActive.value = false

    const global_parameter_ = {
        name: parameterName.value,
        description: "",
        ptype: selectedParameterType.value ? selectedParameterType.value : "",
        pvalues: (parameterValueOptions.value.length === 0) ? [] : parameterValueOptions.value,
        connect_all: autoConnection.value,
        connected_slide_parameters: ((selectedSlideParameters.value.length === 0) ? [] : selectedSlideParameters.value)
    };

    saveGlobalParameter(global_parameter_).then(_response => {
        toast.add({ severity: 'success', summary: 'Success', detail: 'Global paramter saved successfully', life: 3000 })
        fetchGlobalParameter()
    }).catch(error => {
        console.error("Error saving scene:", error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save global paramter', life: 3000 })
    });
}

function onConfirmedClearParameters() {
    confirm.require({
        header: t('moderator.confirmation'),
        message: t('moderator.confirmation-message-all-parameters'),
        acceptLabel: `${t('moderator.confirmation-ok')}`,
        rejectLabel: t('moderator.confirmation-cancel'),
        accept: async () => {
            deleteGlobalParameters();
            globalParameters.value = []
            toast.add({ severity: 'success', summary: 'Success', detail: 'Global paramters deleted successfully', life: 3000 })
        }, reject: () => {
            // nothing to do    
        },
    });
}

async function onConfirmedDeleteParameter(glob: GlobalParameter) {
    const deleted = await onConfirmDeleteItem(glob, "parameter", deleteGlobalParameter)

    if (deleted) {
        globalParameters.value = globalParameters.value.filter(gp => gp.id !== glob.id);
        if (selectedGlobalParameter.value?.id === glob.id) {
            selectedGlobalParameter.value = null;
        }
    }
}

function onAddParameterValueOption() {
    if (!parameterValueOptions.value.includes(parameterValueOption.value)) {
        parameterValueOptions.value.push(parameterValueOption.value)
    } else {
        // Do an alert here?
    }
}

function onDeleteParameterValueOption(item) {
    var index = parameterValueOptions.value.indexOf(item);
    if (index !== -1) {
        parameterValueOptions.value.splice(index, 1);
    }
}
</script>

<template>
    <div class="panel-content">
        <div class="header-row">
            <h1 class="dashboard_label">{{ $t('moderator.nav.live_parameters') }}</h1>
            <div class="header-row-actions">
                <Button type="button" :label="$t('moderator.clear')" class="save-btn"
                    @click="onConfirmedClearParameters" />
                <Button type="button" :label="$t('moderator.add')" class="save-btn" @click="onAddParameter" />
            </div>
        </div>

        <DataTable v-if="globalParameters.length > 0" :value="globalParameters" dataKey="id" editMode="row" scrollable
            scrollHeight="flex" responsiveLayout="scroll" v-model:editingRows="editingRows"
            v-model:selection="selectedGlobalParameter" selectionMode="single">

            <Column field="name" header="" style="text-align: left">
                <template #editor="slotProps">
                    <InputText v-model="slotProps.data.name" />
                </template>
                <template #body="slotProps">
                    <span style="font-weight: 600;">{{ slotProps.data.name }}</span><br>
                    <!--<span style="font-size: 0.875rem; color: #64748b;">Updated
                                    {{ formatDate(slotProps.data.updated_at) }}</span> -->
                </template>
            </Column>

            <Column style="width: 12rem; text-align: right">
                <template #body="slotProps">
                    <Button size="small" rounded text icon="pi pi-clone" />
                    <Button size="small" rounded text icon="pi pi-pencil" />
                    <Button size="small" rounded text icon="pi pi-trash"
                        @click="onConfirmedDeleteParameter(slotProps.data)" />
                </template>
                <template #editor="slotProps">
                    <Button size="small" rounded text icon="pi pi-check"
                        @click="(e) => slotProps.editorSaveCallback(e)" />
                    <Button size="small" rounded text icon="pi pi-times"
                        @click="(e) => slotProps.editorCancelCallback(e)" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>


<style scoped>
.header-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-medium);
    min-width: 0;
}

.header-row h1 {
    margin: 0;
}

.header-row-actions {
    display: flex;
    /*align-items: center;*/
    gap: var(--space-medium);
}


.scrollable-table {
    /*overflow: auto;*/
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
}

.panel-content {
    height: 100%;
    width: 100%;
    min-height: 0;
    padding: var(--space-small) var(--space-medium) var(--space-medium);
    gap: var(--space-medium);
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    align-items: stretch;
}
</style>