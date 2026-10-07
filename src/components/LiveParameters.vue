<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import DataTable from 'primevue/datatable';
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Button from 'primevue/button';
import { type ParameterChange } from '@/services/parameterstore_service'
import parameterStore from '@/services/parameterstore_service'
import InputText from 'primevue/inputtext';
import { slideParameters, fetchSlideParameters } from '@/globals/slide_parameters';
import Select from 'primevue/select'; // In v4 heißt Dropdown jetzt "Select"
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import { useConfirm } from "primevue/useconfirm";
import { useI18n } from 'vue-i18n';
import MultiSelect from 'primevue/multiselect';

const { t } = useI18n();
const confirm = useConfirm();

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
const selectedParameterValueOption = ref<string | null>(null);

const selectedSlideParameters = ref<{ label: string, value: string; }[]>([]);
const slideParameterArray = ref<{ label: string; value: string }[]>([]);

onMounted(async () => {
    await fetchSlideParameters()
    const stop = parameterStore.subscribe((c) => parameterChanges.value.push(c))
    onUnmounted(() => {
        stop()
    })
    //console.log("slideParameters: ", slideParameters.value)
    slideParameterArray.value = slideParameters.value.map((p) => ({ label: p.name + " of type " + p.type + " on section " + p.slide_seciton, value: "" }))
})

function onAddParameter() {
    addParameterActive.value = true
}

function onCancelAddParameter() {
    addParameterActive.value = false
}

function onSaveParameter() {

}

function onConfirmedClearParameters() {
    confirm.require({
        header: t('moderator.confirmation'),
        message: t('moderator.confirmation-message-all-parameters'),
        acceptLabel: `${t('moderator.confirmation-ok')}`,
        rejectLabel: t('moderator.confirmation-cancel'),
        accept: async () => {
            // await onClearParameters();
        }, reject: () => {
            // nothing to do    
        },
    });
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

// experimental stuff
</script>


<template>
    <div class="dashboard">
        <Splitter :gutter-size="2" class="dashboard" layout="vertical">
            <SplitterPanel :size="50" class="sub-panel">
                <div class="panel-content" style="padding: var(--space-large);">
                    <div class="header-row">
                        <h1 class="dashboard_label">{{ $t('moderator.nav.live_parameters') }}</h1>
                        <div class="header-row-actions">
                            <Button type="button" :label="$t('moderator.clear')" class="save-btn"
                                @click="onConfirmedClearParameters" />
                            <Button type="button" :label="$t('moderator.add')" class="save-btn"
                                @click="onAddParameter" />
                        </div>
                    </div>
                </div>
            </SplitterPanel>
            <SplitterPanel :size="50" class="sub-panel">
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
                            $t('moderator.parameter.global_parameter_name') }}</label>
                        <InputText id="inputParameterName" v-model.trim="parameterName" type="text" fluid />
                    </div>
                    <div class="label-container">
                        <label for="inputParameterType" class="form-label">{{
                            $t('moderator.parameter.global_parameter_type') }}</label>
                        <Select id="inputParameterType" v-model="selectedParameterType" :options="parameterTypeOptions"
                            optionLabel="label" optionValue="value" placeholder="Select type" fluid />
                    </div>
                    <div v-if="selectedParameterType === 'Selection'" class="label-container">
                        <label for="inputParameterType" class="form-label">{{
                            $t('moderator.parameter.global_parameter_type_config') }}</label>
                        <div class="flexbox">
                            <InputText id="inputParameterValueOptionName" v-model.trim="parameterValueOption"
                                type="text" fluid />
                            <Button type="button" :label="$t('moderator.add')" class="save-btn"
                                @click="onAddParameterValueOption" />
                        </div>

                        <DataTable v-if="parameterValueOptions.length > 0" :value="parameterValueOptions"
                            :rowClass="() => 'custom-row'" style="width: 100%">
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
                    <div class="label-container">
                        <label for="inputParameterType" class="form-label">{{
                            $t('moderator.parameter.global_parameter_connection') }}</label>
                        <div class="labeled-checkbox">
                            <Checkbox v-model="autoConnection" binary inputId="auto_connection-checkbox" />
                            <Label for="auto_connection-checkbox"> {{
                                $t('moderator.parameter.auto_parameter_connection') }} </Label>
                        </div>
                    </div>
                    <div v-if="!autoConnection" class="label-container">
                        <label for="connectedParameters" class="form-label">{{
                            $t('moderator.parameter.global_parameter_connect') }}</label>
                        <MultiSelect v-model="selectedSlideParameters" :options="slideParameterArray"
                            optionLabel="label" placeholder="Select paramters" display="chip" :showClear="true"
                            :maxSelectedLabels="1" selectedItemsLabel="{0} (+{1})" fluid>
                            <template #value="slotProps">
                                <div v-if="slotProps.value && slotProps.value.length > 0">
                                    <!-- Erstes ausgewähltes Element anzeigen -->
                                    <span>{{ slotProps.value[0].label }}</span>

                                    <!-- Wenn mehr als ein Element ausgewählt ist, (+X) anhängen -->
                                    <span v-if="slotProps.value.length > 1">
                                        (+{{ slotProps.value.length - 1 }})
                                    </span>
                                </div>

                                <!-- Falls nichts ausgewählt ist, zeige den normalen Platzhalter -->
                                <span v-else>
                                    {{ slotProps.placeholder }}
                                </span>
                            </template>
                        </MultiSelect>
                    </div>
                </div>
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
}

.header-row h1 {
    margin: 0;
}

.header-row-actions {
    display: flex;
    align-items: center;
    gap: var(--space-medium);
}

.label-container {
    width: 100%;
}

.parameter-change-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    overflow-y: auto;
}

.parameter-change {
    display: flex;
    flex-direction: row;
    gap: var(--space-medium);
}

.section-indicator {
    font-weight: bold;
    color: var(--p-primary-500);
    width: 50px;
    font-family: "Fira Code", monospace;
    font-size: var(--fs-large);
    display: flex;
    align-items: center;
    justify-content: center;
}

.parameter-change-list {
    list-style: none;
    padding: 0;
    margin: 0;
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
    min-height: 0;
    padding: var(--space-small) var(--space-medium) var(--space-medium);
    gap: var(--space-medium);
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
}

.participant-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
}

.participant-column {
    width: 25%;
}

.content-column {
    width: 75%;
}

.header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-shrink: 0;
}


:deep(.custom-row > td) {
    padding-top: 0px;
    padding-bottom: 0px;
}


.tight-btn {
    /* Erster Wert = Oben/Unten, Zweiter Wert = Links/Rechts */
    padding: 0.25rem 0.5rem !important;

    /* Optional: Falls das Icon zu nah am Text klebt */
    gap: 0.25rem;
}
</style>