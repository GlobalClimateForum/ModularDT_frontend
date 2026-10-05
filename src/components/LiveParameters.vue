<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Button from 'primevue/button';
import { type ParameterChange } from '@/services/parameterstore_service'
import parameterStore from '@/services/parameterstore_service'
import InputText from 'primevue/inputtext';
import { slideParameters, fetchSlideParameters } from '@/globals/slide_parameters';
import Select from 'primevue/select'; // In v4 heißt Dropdown jetzt "Select"
import Checkbox from 'primevue/checkbox';
import { useConfirm } from "primevue/useconfirm";
import { useI18n } from 'vue-i18n';

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

onMounted(() => {
    fetchSlideParameters()
    const stop = parameterStore.subscribe((c) => parameterChanges.value.push(c))
    onUnmounted(() => {
        stop()
    })
    console.log("slideParameters: ", slideParameters.value)
})

function onAddParameter() {
    addParameterActive.value = true
}

function onCancelAddParameter() {
    addParameterActive.value = false
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
                            <Button type="button" :label="$t('moderator.save')" class="save-btn" @click="" :disabled="selectedParameterType==null"/>
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
                        <!--<Select id="inputParameterType" v-model="selectedParameterType" :options="parameterTypeOptions"
                            optionLabel="label" optionValue="value" fluid/>-->
                    </div>
                    <div class="label-container">
                        <label for="inputParameterType" class="form-label">{{
                            $t('moderator.parameter.global_parameter_connection') }}</label>
                        <div class="labeled-checkbox">
                            <Checkbox v-model="autoConnection" binary inputId="auto_connection-checkbox"
                                @change="autoConnection = !autoConnection" />
                            <Label for="auto_connection-checkbox"> {{
                                $t('moderator.parameter.auto_parameter_connection') }} </Label>
                        </div>
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

.slide-column {
    width: 25%;
    padding: 0;
    vertical-align: top;
}

.second-column {
    width: 75%;
    padding-left: 35px;
}

.slideshow-card {
    width: 100%;
    display: block;
    box-sizing: border-box;
}


.slideshow-content {
    width: 100%;
    height: 100%;
    gap: 10px;
}

.slideshow-item {
    width: 100%;
    display: block;
}

.slideshow-item>* {
    display: block;
    width: 100%;
}

.slideshow-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    flex-shrink: 0;
}

.slideshow-label {
    font-weight: bold;
    font-size: var(--fs-medium);
    color: var(--p-primary-500);
}

.slideshow-parameter {
    font-weight: bold;
    font-size: var(--fs-medium);
    color: var(--p-primary-500);
}

.participant-table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
}

.slide-view {
    display: block;
    width: 100%;

    /* ÄNDERUNG: Die Slide bestimmt ihre Höhe nun selbst wie ein Bild über das Seitenverhältnis */
    height: auto !important;
    aspect-ratio: 16 / 9;

    /* Verhindert das Herausragen von internen Elementen */
    overflow: hidden;
}

.tight-btn {
    /* Erster Wert = Oben/Unten, Zweiter Wert = Links/Rechts */
    padding: 0.25rem 0.5rem !important;

    /* Optional: Falls das Icon zu nah am Text klebt */
    gap: 0.25rem;
}
</style>