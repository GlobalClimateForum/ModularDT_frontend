<script setup lang="ts">
import { inject, ref, computed, reactive, nextTick, type Ref } from 'vue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions';
import type { SlideSection, Parameter } from '@/services/slide_service';
import { useParameterStore, ptypes, type ParameterType } from '@/services/parameterstore_service';

import Tag from 'primevue/tag';
import SplitButton from 'primevue/splitbutton';
import InputNumber from 'primevue/inputnumber';
import FloatLabel from 'primevue/floatlabel';
import TextArea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import RadioButton from 'primevue/radiobutton';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import RuleBuilder from './RuleBuilder.vue';
import Inplace from 'primevue/inplace';
import Textarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')!;

const parameterStore = useParameterStore();
const parameterJSON = ref('')
const jsonError = ref('')
const newParameterName = ref('')
const openInplace = ref<'json' | 'add' | null>(null)
const original = dialogRef.value.data.section as SlideSection
const section = reactive<SlideSection>(JSON.parse(JSON.stringify(original))) // deep copy to avoid mutation


const optionsFor = (param: any) =>
    ptypes.map(type => ({
        label: type,
        command: () => {
            param.type = type
            if (type === 'number') param.range ??= { min: 0, max: 1, step: 0.25 }
            if (type === 'select') {
                param.options ??= []                       // NEW
                if (!param.options.includes(param.default)) {
                    param.default = param.options[0] ?? null   // default must be one of the options
                }
            }
        }
    }))


for (const param of Object.values(section.parameters ?? {})) {
    if (param.type === 'number') param.range ??= { min: 0, max: 1, step: 0.5 }
    if (param.type === 'select') param.options ??= []   // NEW
}

const sectionParameters = computed(() => {
    return section.parameters || {};
})

function cancel() {
    dialogRef.value.close()                       // no data → parent discards
}

function save() {
    dialogRef.value.close({ saved: true, parameters: section.parameters ?? {} })
    toast.add({ severity: 'success', summary: 'Parameters saved', life: 3000 })
}

const renameOption = (param: any, i: number, value: string) => {
    if (param.default === param.options[i]) param.default = value
    param.options[i] = value
}

const removeOption = (param: any, i: number) => {
    const [removed] = param.options.splice(i, 1)
    if (removed === param.default) param.default = param.options[0] ?? null
}

const addOptionAfter = async (param: any, name: string, i: number) => {
    param.options.splice(i + 1, 0, '')
    await nextTick()
    document.getElementById(`${name}-opt-${i + 1}`)?.focus()
}

function addStringParameter(name: string) {
    if (!section.parameters) section.parameters = {}
    section.parameters[name] = {
        type: 'string',
        description: '',
        default: ''
    }
}

function submitNewParameter(close: () => void) {
    const name = newParameterName.value.trim()
    if (!name) return
    addStringParameter(name)
    newParameterName.value = ''
    close()
}

function parametersFromJSON(paramJSON: string): boolean {
    jsonError.value = ''
    let parsed: unknown
    try {
        parsed = JSON.parse(paramJSON)
    } catch (e) {
        jsonError.value = `Invalid JSON: ${(e as Error).message}`
        return false
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        jsonError.value = 'Expected an object like { "name": { ...parameter } }'
        return false
    }

    section.parameters = { ...(section.parameters ?? {}), ...(parsed as Record<string, Parameter>) }
    parameterJSON.value = ''   // clear for next time
    return true
}

</script>

<template>
    <div class="parameter-builder">
        <div class="parameter-builder-header">
            <Button label="Cancel" severity="secondary" outlined @click="cancel">
                <template #icon>
                    <i class="material-symbols-outlined">close</i>
                </template>
            </Button>
            <Button label="Save" @click="save">
                <template #icon>
                    <i class="material-symbols-outlined">save</i>
                </template>
            </Button>
        </div>

        <div class="parameter-builder-container">

            <div class="parameter-container inset-control">

                <div class="add-parameter-header">

                    <Inplace v-show="openInplace !== 'add'" class="json-inplace" :active="openInplace === 'json'"
                        @update:active="v => openInplace = v ? 'json' : null">
                        <template #display>
                            <Button label="From JSON" outlined size="small">
                                <template #icon>
                                    <i class="material-symbols-outlined">code</i>
                                </template>
                            </Button>
                        </template>

                        <template #content="{ closeCallback }">
                            <div class="parameter-builder-json">
                                <Textarea v-model="parameterJSON" autoResize rows="5"
                                    placeholder='{ "myParam": { "type": "select", ... } }' :invalid="!!jsonError"
                                    class="json-input" />
                                <small v-if="jsonError" class="json-error">{{ jsonError }}</small>

                                <div class="json-actions">
                                    <Button label="Cancel" severity="secondary" text size="small"
                                        @click="jsonError = ''; closeCallback()" />
                                    <Button label="Load" icon="pi pi-check" size="small"
                                        :disabled="!parameterJSON.trim()"
                                        @click="parametersFromJSON(parameterJSON) && closeCallback()" />
                                </div>
                            </div>
                        </template>
                    </Inplace>

                    <Inplace v-show="openInplace !== 'json'" class="json-inplace" :active="openInplace === 'add'"
                        @update:active="v => openInplace = v ? 'add' : null">
                        <template #display>
                            <Button label="Add Parameter" outlined size="small">
                                <template #icon>
                                    <i class="material-symbols-outlined">add</i>
                                </template>
                            </Button>
                        </template>

                        <template #content="{ closeCallback }">
                            <div class="parameter">
                                <InputText v-model="newParameterName" autofocus
                                    @keydown.enter="submitNewParameter(closeCallback)"
                                    @keydown.esc="newParameterName = ''; closeCallback()" placeholder="Parameter Name"
                                    class="parameter-name-input" />

                                <div
                                    style="display: flex; justify-content: flex-end; gap: var(--space-small); margin-top: var(--space-small);">
                                    <Button label="Cancel" severity="secondary" outlined size="small"
                                        @click="newParameterName = ''; closeCallback()" />
                                    <Button label="Add" size="small" icon="pi pi-check" style="width: 150px"
                                        :disabled="!newParameterName.trim()"
                                        @click="submitNewParameter(closeCallback)" />
                                </div>
                            </div>
                        </template>
                    </Inplace>

                </div>


                <div v-for="(param, name) in sectionParameters" :key="name" class="parameter">

                    <div class="parameter-header">
                        <h2 class="parameter-name">{{ name }}</h2>
                        <div class="parameter-header-controls">
                            <SplitButton size="small" class="parameter-tag" :label="param.type"
                                :model="optionsFor(param)">
                                <template #item="{ item }">
                                    <Tag class="parameter-tag">{{ item.label }}</Tag>
                                </template>
                            </SplitButton>
                            <Button class="delete-parameter-btn" size="small" severity="secondary" outlined
                                @click="delete section.parameters[name]">
                                <template #icon>
                                    <i class="material-symbols-outlined">close</i>
                                </template>
                            </Button>
                        </div>
                    </div>

                    <div class="parameter-values">

                        <div v-if="param.type === 'number'" class="number-range">

                            <FloatLabel variant="on">
                                <InputNumber :inputId="`${name}-min`" v-model="param.range.min" showButtons
                                    buttonLayout="horizontal" :step="param.range.step" fluid />
                                <label :for="`${name}-min`">Min</label>
                            </FloatLabel>
                            <FloatLabel variant="on">
                                <InputNumber class="highlight-input" :inputId="`${name}-default`"
                                    v-model="param.default" showButtons buttonLayout="horizontal"
                                    :step="param.range.step" fluid />
                                <label :for="`${name}-default`">Default</label>
                            </FloatLabel>
                            <FloatLabel variant="on">
                                <InputNumber :inputId="`${name}-max`" v-model="param.range.max" showButtons
                                    buttonLayout="horizontal" :step="param.range.step" fluid />
                                <label :for="`${name}-max`">Max</label>
                            </FloatLabel>
                            <FloatLabel variant="on">
                                <InputNumber :inputId="`${name}-step`" v-model="param.range.step" :min="0"
                                    :minFractionDigits="0" :maxFractionDigits="4" fluid />
                                <label :for="`${name}-step`">Step</label>
                            </FloatLabel>
                            <div class="label-container">
                                <label :for="`${name}-log`">Show as Slider</label>
                                <ToggleSwitch :inputId="`${name}-log`" />
                            </div>
                        </div>

                        <div v-if="param.type === 'boolean'">
                            <div class="label-container">
                                <label>Default</label>
                                <div style="display: flex; align-items: center; gap: var(--space-small);">
                                    <ToggleSwitch v-model="param.default" />
                                    <div class="boolean-text">{{ param.default }}</div>
                                </div>
                            </div>
                        </div>

                        <div v-if="param.type === 'select'" class="select-options">
                            <div v-for="(opt, i) in param.options" :key="i" class="select-option"
                                :class="{ 'is-default': opt === param.default }">
                                <RadioButton size="small" v-model="param.default" :value="opt" />
                                <InputText size="small" :id="`${name}-opt-${i}`" :modelValue="opt"
                                    @update:modelValue="v => renameOption(param, i, v)"
                                    @keydown.enter.prevent="addOptionAfter(param, name, i)" fluid />
                                <Button icon="pi pi-times" text severity="secondary" @click="removeOption(param, i)" />
                            </div>
                        </div>
                        <Button v-if="param.type === 'select'" label="Add option" size="small" outlined
                            style="width: 150px; margin: auto;" @click="param.options.push('')">
                            <template #icon>
                                <i class="material-symbols-outlined">add</i>
                            </template>
                        </Button>

                        <div v-if="param.type === 'string'">
                            <FloatLabel variant="on">
                                <InputText :inputId="`${name}-default`" v-model="param.default" fluid />
                                <label :for="`${name}-default`">Default</label>
                            </FloatLabel>
                        </div>

                        <div class="label-container">
                            <label>Description</label>
                            <TextArea fluid v-model="param.description"></TextArea>
                        </div>
                    </div>

                </div>
            </div>

            <div class="rule-container inset-control">
                <RuleBuilder :section="section"></RuleBuilder>
            </div>
        </div>

    </div>
</template>

<style scoped>
.parameter-builder {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
}

.add-parameter-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--space-small);
}

.add-parameter-header :deep(.p-inplace:has(.p-inplace-content)) {
    flex: 1 1 100%;
}

.parameter-builder-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-small);
    margin-bottom: var(--space-small);
}

.parameter-header-controls {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.parameter-builder-json {
    display: flex;
    flex-direction: column;
    padding: var(--space-small);
    gap: var(--space-small);
    width: 100%;
    border: 1px solid var(--p-primary-200);
    border-radius: var(--br-medium);
    background: var(--surface);
    box-shadow: var(--shadow-light);
}

.json-input {
    width: 100%;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.85rem;
    resize: vertical;
}

.json-inplace {
    flex: 0 0 auto;
}

.json-inplace :deep(.p-inplace-content) {
    display: block;
    width: 100%;
}

.json-inplace :deep(.p-inplace-display) {
    padding: 0;
}

.json-error {
    color: var(--p-red-500);
}

.json-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}

.parameter-builder-container {
    display: flex;
    flex-direction: row;
    gap: var(--space-small);
    padding: var(--space-small);
    height: 100%;
}

.parameter-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-medium);
    padding: var(--space-small);
    height: 100%;
    width: 50%;
    overflow-y: auto;
}

.rule-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    padding: var(--space-small);
    height: 100%;
    overflow-y: auto;
    width: 50%;
}

.parameter {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    padding: var(--space-small);
    background-color: var(--surface);
    border-radius: var(--br-medium);
    border: 1px solid var(--p-primary-200);
    box-shadow: var(--shadow-light);
}

.parameter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.parameter-values {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
    padding: var(--space-small);
    background-color: var(--surface-dark);
    border-radius: var(--br-medium);
    box-shadow: inset 0 0 0 2px var(--p-primary-100);
}

.parameter-name {
    font-size: var(--fs-medium);
    font-weight: bold;
    color: var(--p-primary-500);
    font-family: "Fira Code"
}

.parameter-tag {
    font-size: var(--fs-small);
    font-weight: bold !important;
    text-transform: lowercase;
    font-family: "Fira Code";
    margin: var(--space-small);
    cursor: pointer;
}

.parameter-name-input {
    font-family: "Fira Code";
    font-size: var(--fs-small);
}

.highlight-input {
    border-radius: var(--p-inputtext-border-radius);
    box-shadow: 0 0 0 0.2rem var(--p-primary-200);
}

.boolean-text {
    font-family: "Fira Code";
    font-weight: bold;
    font-size: var(--fs-small);
    border: 2px solid var(--p-primary-200);
    padding: var(--space-small);
    border-radius: var(--br-small);
    color: var(--p-primary-500);
    width: 80px;
    text-align: center;
}

.number-range {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--space-small);
    align-items: flex-end;
}

.select-options {
    display: flex;
    flex-direction: column;
    padding: var(--space-small);
    gap: var(--space-small);
    height: 150px;
    overflow-y: auto;
    border: 1px solid var(--p-primary-300);
    border-radius: var(--br-medium);
}

.select-option {
    display: flex;
    align-items: center;
    gap: var(--space-small);
    padding: var(--space-small);
    border-radius: var(--br-small);
    border: 2px solid transparent;
}

.select-option.is-default {
    border-color: var(--p-primary-500);
    background-color: var(--p-primary-50);
}
</style>