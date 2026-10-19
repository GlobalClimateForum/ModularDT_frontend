<script lang="ts" setup>
// Vue stuff
import { ref, onMounted, onUnmounted, computed, toRaw } from 'vue'
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
import { updateGlobalParameter, deleteGlobalParameter, deleteGlobalParameters, saveGlobalParameter, type GlobalParameter } from '@/services/global_parameter_service'
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

const parameterSelectionValueOption = ref<string>("");
const parameterSelectionValueOptions = ref<string[]>([]);

const selectedSlideParameters = ref<number[]>([]);
const slideParameterArray = ref<{ label: string; value: number }[]>([]);

const selectedGlobalParameter = ref<GlobalParameter | null>(null);
const currentGlobalParameter = ref<GlobalParameter | null>(null);
const editingRows = ref<GlobalParameter[]>([]);

onMounted(async () => {
    fetchGlobalParameter()
    await fetchSlideParameters()
    const stop = parameterStore.subscribe((c) => parameterChanges.value.push(c))
    onUnmounted(() => {
        stop()
    })
    slideParameterArray.value = slideParameters.value.map((p) => ({ label: p.name + " of type " + p.type + " on section " + p.slide_seciton, value: p.id ? p.id : -1 })).sort((x, y) => x.label.localeCompare(y.label))
    console.log(globalParameters.value)
})

function onRowEditSaveParameter(event: any) {
    const { id, name } = event.newData
    if (name === event.data.name) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'New and old filenames are identical', life: 3000 });
    } else {
        updateGlobalParameter(id, { name: name }).then(response => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Global parameter updated successfully', life: 3000 });
            globalParameters.value[event.index] = { ...response.data };
        }).catch(error => {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update global parameter', life: 3000 });
            console.error("Error updating global parameter:", error)
        })
    }
}

function onAddParameter() {
    addParameterActive.value = true
}

function onCancelAddParameter() {
    addParameterActive.value = false
}

function onChangeActive(active_clicked: boolean, glob: GlobalParameter) {
    if (glob.id) {
        currentGlobalParameter.value = glob
        currentGlobalParameter.value.active = active_clicked

        updateGlobalParameter(currentGlobalParameter.value.id!, currentGlobalParameter.value)
    }
}

function onSaveParameter() {
    addParameterActive.value = false

    currentGlobalParameter.value = {
        id: currentGlobalParameter.value?.id ?? undefined,
        description: "",
        current_value: "",
        name: parameterName.value,
        ptype: selectedParameterType.value ? selectedParameterType.value : "",
        pvalues: (parameterSelectionValueOptions.value.length === 0) ? [] : parameterSelectionValueOptions.value,
        connect_all: true,
        connected_slide_parameters: [],
        active: true
    } as GlobalParameter;

    console.log(currentGlobalParameter.value)

    if (currentGlobalParameter.value.id) {
        updateGlobalParameter(currentGlobalParameter.value.id, currentGlobalParameter.value).then(_response => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Global paramter saved successfully', life: 3000 })
            fetchGlobalParameter()
        }).catch(error => {
            console.error("Error saving scene:", error);
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save global paramter', life: 3000 })
        });
    } else {
        saveGlobalParameter(currentGlobalParameter.value).then(_response => {
            toast.add({ severity: 'success', summary: 'Success', detail: 'Global paramter saved successfully', life: 3000 })
            fetchGlobalParameter()
        }).catch(error => {
            console.error("Error saving scene:", error);
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save global paramter', life: 3000 })
        });
    }
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

function setCurrentEdit(glob: GlobalParameter, name: string, id: number | undefined) {
    parameterName.value = name
    selectedParameterType.value = glob.ptype
    parameterSelectionValueOptions.value = glob.pvalues
    addParameterActive.value = true
    currentGlobalParameter.value = {
        id: id,
        description: glob.description,
        current_value: glob.current_value,
        name: parameterName.value,
        ptype: selectedParameterType.value ? selectedParameterType.value : "",
        pvalues: (parameterSelectionValueOptions.value.length === 0) ? [] : parameterSelectionValueOptions.value,
        connect_all: true,
        connected_slide_parameters: [],
        active: glob.active
    } as GlobalParameter;
}

function onEditGlobalParameter(glob: GlobalParameter) {
    setCurrentEdit(glob, glob.name, glob.id)
}

function onDuplicateEditGlobalParameter(glob: GlobalParameter) {
    setCurrentEdit(glob, `${glob.name} (${t('moderator.copy')})`, undefined)
}

function onAddParameterValueOption() {
    if (!parameterSelectionValueOptions.value.includes(parameterSelectionValueOption.value)) {
        parameterSelectionValueOptions.value.push(parameterSelectionValueOption.value)
    } else {
        // Do an alert here?
    }
}

function onDeleteParameterValueOption(item) {
    var index = parameterSelectionValueOptions.value.indexOf(item);
    if (index !== -1) {
        parameterSelectionValueOptions.value.splice(index, 1);
    }
}

function globalParameterChange(glob: GlobalParameter) {
    console.log("Change global!", glob)
    updateGlobalParameter(glob.id!, glob)
    // and here: send update message to all slides.
}
</script>

<template>
    <div class="panel-content">
        <Splitter>
            <SplitterPanel v-if="addParameterActive" class="flex items-center justify-center">

                <div v-if="addParameterActive" class="panel-content" style="padding: var(--space-large);">
                    <div class="header-row">
                        <h1 class="dashboard_label">Add Live Parameter</h1>
                        <div class="header-row-actions">
                            <Button type="button" :label="$t('moderator.confirmation-cancel')" class="save-btn"
                                @click="onCancelAddParameter" />
                            <Button type="button" :label="$t('moderator.save')" class="save-btn"
                                @click="onSaveParameter"
                                :disabled="selectedParameterType == null || parameterName.length == 0" />
                        </div>
                    </div>
                    <div class="label-container">
                        <label for="inputParameterName" class="form-label">{{
                            $t('moderator.parameters.global_parameter_name') }}</label>
                        <InputText id="inputParameterName" v-model.trim="parameterName" type="text" fluid />
                    </div>
                    <div class="label-container">
                        <label for="inputParameterType" class="form-label">{{
                            $t('moderator.parameters.global_parameter_type') }}</label>
                        <Select id="inputParameterType" v-model="selectedParameterType" :options="parameterTypeOptions"
                            optionLabel="label" optionValue="value" :placeholder="t('moderator.parameters.select_type')"
                            fluid />
                    </div>
                    <div v-if="selectedParameterType === 'Selection'" class="label-container">
                        <label for="inputParameterType" class="form-label">{{
                            $t('moderator.parameters.global_parameter_type_config') }}</label>
                        <div class="flexbox">
                            <InputText id="inputParameterValueOptionName" v-model.trim="parameterSelectionValueOption"
                                type="text" fluid />
                            <Button type="button" :label="$t('moderator.add')" class="save-btn"
                                :disabled="parameterSelectionValueOption == null || parameterSelectionValueOption.length == 0"
                                @click="onAddParameterValueOption" />
                        </div>

                        <DataTable v-if="parameterSelectionValueOptions.length > 0"
                            :value="parameterSelectionValueOptions" :rowClass="() => 'custom-row'" style="width: 100%">
                            <Column style="text-align: left">
                                <template #body="slotProps">{{ slotProps.data }}</template>
                            </Column>
                            <Column style="width: 12rem; text-align: right">
                                <template #body="slotProps">
                                    <Button size="small" rounded text icon="pi pi-trash"
                                        @click="onDeleteParameterValueOption(slotProps.data)" />
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>
            </SplitterPanel>

            <SplitterPanel class="flex items-center justify-center">
                <div class="header-row">
                    <h1 class="dashboard_label">{{ $t('moderator.nav.live_parameters') }}</h1>
                    <div class="header-row-actions">
                        <Button type="button" :label="$t('moderator.clear')" class="save-btn"
                            @click="onConfirmedClearParameters" />
                        <Button type="button" :label="$t('moderator.add')" class="save-btn" @click="onAddParameter" />
                    </div>
                </div>

                <DataTable v-if="globalParameters.length > 0" :value="globalParameters" dataKey="id" editMode="row"
                    @row-edit-save="onRowEditSaveParameter" scrollable scrollHeight="flex" responsiveLayout="scroll"
                    v-model:editingRows="editingRows" tableStyle="width: 100%; table-layout: auto;">

                    <Column field="active" header="Enabled" style="text-align: left; width: 1%; white-space: nowrap">
                        <template #body="slotProps">
                            <Checkbox v-model="slotProps.data.active" binary inputId="active-checkbox"
                                @change="onChangeActive(slotProps.data.active, slotProps.data)" />
                        </template>
                    </Column>

                    <Column field="name" header="Parameter" style="text-align: left">
                        <template #editor="slotProps">
                            <InputText v-model="slotProps.data.name" />
                        </template>
                        <template #body="slotProps">
                            <span v-if="slotProps.data.active" style="font-weight: 600;">{{ slotProps.data.name }}</span>
                            <span v-else style="font-weight: 600; user-select: none; color: #94a3b8;">{{ slotProps.data.name }}</span>
                        </template>
                    </Column>

                    <Column field="input" header="Value" style="text-align: left">
                        <template #body="slotProps">
                            <InputText v-if="slotProps.data.ptype === 'String'" v-model="slotProps.data.current_value" :disabled="!slotProps.data.active" 
                                @change="globalParameterChange(slotProps.data)" />
                            <InputText v-else-if="slotProps.data.ptype === 'Number'" v-model="slotProps.data.current_value" :disabled="!slotProps.data.active" 
                                @change="globalParameterChange(slotProps.data)" />
                            <Select v-else-if="slotProps.data.ptype === 'Selection'" v-model="slotProps.data.current_value" :disabled="!slotProps.data.active" 
                                :options="slotProps.data.pvalues" @change="globalParameterChange(slotProps.data)" /> 
                            <Checkbox v-else-if="slotProps.data.ptype === 'Boolean'" v-model="slotProps.data.current_value" :disabled="!slotProps.data.active" 
                                binary trueValue="1" falseValue="0" @change="globalParameterChange(slotProps.data)" />
                            <span v-else>Unsupported input type</span>
                        </template>
                    </Column>

                    <Column style="width: 12rem; text-align: right">
                        <template #body="slotProps">
                            <Button size="small" rounded text icon="pi pi-code" :disabled="!slotProps.data.active" 
                                @click="onEditGlobalParameter(slotProps.data)" />
                            <Button size="small" rounded text icon="pi pi-clone" :disabled="!slotProps.data.active" 
                                @click="onDuplicateEditGlobalParameter(slotProps.data)" />
                            <Button size="small" rounded text icon="pi pi-pencil" :disabled="!slotProps.data.active"
                                @click="(e) => slotProps.editorInitCallback(e)" />
                            <Button size="small" rounded text icon="pi pi-trash" :disabled="!slotProps.data.active"
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
            </SplitterPanel>
        </Splitter>

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

.table-container {
    /* display: flex; */
    width: 100%;
}
</style>