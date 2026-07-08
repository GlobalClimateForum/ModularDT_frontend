<script lang="ts" setup>
import SelectButton from 'primevue/selectbutton';
import '@/assets/main.css'
import type { Slide, SlideSection, Parameters, Parameter } from '@/services/slide_service';
import { ref, onMounted, watch } from 'vue';
import CodeEditor from '@/components/CodeEditor.vue';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast'
import ContentServerStatus from '@/components/ContentServerStatus.vue'
import Button from 'primevue/button';
import { settings } from '@/utils/settings';
import TextArea from 'primevue/textarea';
import ProgressBar from 'primevue/progressbar';
import Inplace from 'primevue/inplace';
import ToggleSwitch from 'primevue/toggleswitch';
import Chip from 'primevue/chip';

const toast = useToast()
const props = defineProps<{
    slide: Slide | null,
    slideSection: SlideSection,
    sectionIdx: number
}>()

const parameters = ref<Parameters>(props.slideSection.parameters ?? {})

const emit = defineEmits<{
    (e: 'contentUpdated', content: string): void,
    (e: 'sectionUpdated', content: SlideSection): void
}>()

const vegaUrlSource = ref<string>("")
const autosize = ref<boolean>(false)
const urlError = ref<string>("")

// Per-parameter draft text for the "add option" inputs, keyed by param key.
const draftOption = ref<Record<string, string>>({})

interface ModeOption {
    label: string
    value: 'static' | 'url' | 'interactive'
}

// On component mount, set the selected mode based on the slideSection's mode,
// and initialize parameters if in interactive mode.
onMounted(() => {
    const mode = props.slideSection?.mode
    if (mode) {
        const modeOption = modeOptions.find(o => o.value === mode)
        if (modeOption) selectedMode.value = modeOption
    }
    if (mode === 'interactive') {
        props.slideSection.parameters = props.slideSection.parameters || {}
    }
})

// Define the available mode options for the SelectButton component.
const modeOptions: ModeOption[] = [
    { label: 'Static JSON', value: 'static' },
    { label: 'Static URL', value: 'url' },
    { label: 'Interactive', value: 'interactive' }
];

// Initialize the selected mode to 'static' by default.
const selectedMode = ref<ModeOption>(modeOptions.find(o => o.value === 'static')!)

// Function to add autosize properties to the Vega spec JSON.
function addAutoSize(content: string) {
    let parsed
    try { parsed = JSON.parse(content) }
    catch {
        toast.add({ severity: 'warn', summary: 'Invalid JSON', detail: 'Could not parse the Vega spec.', life: 4000 })
        return
    }
    // To guarantee that autosize properties are at the beginning.
    // Splat the parsed object after the autosize properties to ensure they are applied first.
    const withAutoSize = {
        width: "container",
        height: "container",
        autosize: { type: "fit", contains: "padding" },
        ...parsed,
    }
    emit('contentUpdated', JSON.stringify(withAutoSize, null, 2))
    toast.add({ severity: 'success', summary: 'Autosize added', detail: 'Autosize property added.', life: 3000 })
}

// Helper to sanitize a provided URL by removing whitespace, leading/trailing slashes, and the content server base URL if present.
function sanitizeURL(url: string): string {
    // Remove any leading/trailing whitespace
    let sanitized = url.trim()
    // Remove any trailing slashes and leading slashes
    sanitized = sanitized.replace(/\/+$/, '').replace(/^\/+/, '')
    // Remove content server base URL if present
    if (settings.value.cs_url) {
        const baseURL = settings.value.cs_url.replace(/\/+$/, '')
        if (sanitized.startsWith(baseURL)) {
            sanitized = sanitized.slice(baseURL.length)
        }
    }
    return sanitized
}

// Helper function to validate a provided URL, checking for whitespace, leading/trailing slashes, and the content server base URL.
function urlIsValid(url: string): [boolean, string] {
    const errors: string[] = []
    if (/\s/.test(url)) {
        errors.push('URL should not contain whitespace.')
    }
    if (settings.value.cs_url && url.startsWith(settings.value.cs_url)) {
        errors.push('URL should not contain the base URL of the content server.')
    }
    if (url.startsWith('/') || url.endsWith('/')) {
        errors.push('URL should not have leading or trailing slashes.')
    }
    return [errors.length === 0, errors.join(' ')]
}

// Function to handle input changes in the URL field, validating the URL and updating the error message accordingly.
function onUrlInput() {
    const [, message] = urlIsValid(vegaUrlSource.value)
    urlError.value = message
}

// Helper function to extract parameters from a given URL and populate the parameters object accordingly.
function parametersFromUrl(url: string) {

    // Reset the parameters ref
    parameters.value = {}

    // Use window.location.origin to handle relative URLs
    const url_ = new URL(url, window.location.origin)
    // Get parameters from the URL
    const params = new URLSearchParams(url_.search)

    // For each parameter in the URL
    Array.from(params.keys()).forEach(key => {

        // Check if the keys matches the filter pattern (filter[<key>])
        const isfilter = key.match(/^(\w+)\[(\w+)\]$/)
        // If the key matches the filter pattern, use the inner key (<key>), otherwise the original key
        const key_ = isfilter ? isfilter[2] : key

        // Identify the type of the parameter based on its value
        const value = params.get(key)
        let type_: 'string' | 'number' | 'boolean' = 'string'
        if (value?.toLowerCase() === 'true' || value?.toLowerCase() === 'false') {
            type_ = 'boolean'
        } else if (!isNaN(Number(value))) {
            type_ = 'number'
        }
        // Filter out fixed paramters
        if (isfilter) {
            parameters.value[key_] = { type: type_, default: null }
        }
    })

    if (Object.keys(parameters.value).length === 0) {
        toast.add({ severity: 'info', summary: 'No parameters found', detail: 'No parameters were found in the URL.', life: 3000 })
    } else {
        toast.add({ severity: 'success', summary: 'Parameters extracted', detail: `${Object.keys(parameters.value).length} parameters were extracted from the URL.`, life: 3000 })
    }

    vegaUrlSource.value = sanitizeURL(url) // Update the URL field with the sanitized URL
}

// Helper function to extract the base URL and parameters from a given URL, returning an array of parameter objects with their names, values, and filter status.
function getURLPattern(url: string) {
    const url_ = new URL(url, window.location.origin)
    const params = new URLSearchParams(url_.search)
    const baseURL = url_.origin + url_.pathname

    const pattern: { name: string, value: string, isFilter: boolean }[] = []

    pattern.push({
        name: 'baseURL',
        value: baseURL,
        isFilter: false
    })
    params.forEach((value, key) => {
        const isfilter = key.match(/^(\w+)\[(\w+)\]$/)
        const key_ = isfilter ? isfilter[2] : key
        const value_ = isfilter ? `<${key_}>` : value
        pattern.push({
            name: key_,
            value: value_,
            isFilter: !!isfilter
        })
    })
    return pattern;
}

// Helper function to convert the parameters object into an array of parameter objects, each containing the key and its associated properties.
function parametersArray() {
    return Object.entries(parameters.value).map(([key, param]) => {
        return { key, ...param }
    })
}

// --- Select-Parameter - Options Handling -------------------------------------------------

// function to add a parameter option to a select parameter, ensuring no duplicates and setting the default if it's the first option added.
function addParamOption(paramKey: string, option: string) {
    const value = option.trim()
    if (!value) return

    const param = parameters.value[paramKey]
    if (!param || param.type !== 'select') return

    if (!param.options) param.options = []
    if (param.options.includes(value)) {
        toast.add({ severity: 'info', summary: 'Duplicate', detail: `"${value}" is already an option.`, life: 2500 })
        return
    }

    param.options.push(value)

    // First option added becomes the default automatically.
    if (param.default == null) {
        param.default = value
    }
}

// Handler for the "add option" input field, which adds the option to the parameter and clears the draft input.
function onAddOption(paramKey: string) {
    const value = draftOption.value[paramKey] ?? ''
    addParamOption(paramKey, value)
    draftOption.value[paramKey] = ''
}

// Handler to remove an option from a select parameter, updating the default if necessary.
function removeParamOption(paramKey: string, option: string) {
    const param = parameters.value[paramKey]
    if (!param || param.type !== 'select' || !param.options) return

    const idx = param.options.indexOf(option)
    if (idx !== -1) param.options.splice(idx, 1)

    // If we removed the current default, fall back to the first remaining option (or null).
    if (param.default === option) {
        setParamDefault(paramKey, param.options[0] ?? null)
    }
}

// Handler to set the default option for a select parameter when an option chip is clicked.
function setParamDefault(paramKey: string, option: string) {
    const param = parameters.value[paramKey]
    if (param && param.type === 'select') {
        param.default = option
    }
}

// Handler to change a parameter's type between 'string' and 'select', preserving options and default values as appropriate.
function setStrType(param: Parameter & { key: string }, newType: 'string' | 'select') {
    if (newType === 'select') {
        parameters.value[param.key] = {
            ...param,
            type: 'select',
            options: param.options ?? [],
            // Keep an existing default only if it's still a valid option; otherwise reset.
            default: (param.options && param.default != null && param.options.includes(String(param.default)))
                ? param.default
                : null,
        }
    } else {
        parameters.value[param.key] = {
            ...param,
            type: 'string',
        }
    }
}

function updateParamValue(param: Parameter & { key: string }, field: 'min' | 'max' | 'default', event: Event) {

    console.log(urlWithDefaults())
    
    // If the parameter is a number
    if (param.type === 'number') {

        // Convert the input value to a number, or null if the input is empty
        const numValue = (event.target as HTMLInputElement).value === '' ? null : Number((event.target as HTMLInputElement).value)
        
        // Update the parameter's field with the new number value, preserving other properties
        // if (field == 'default'){
        //     parameters.value[param.key].default = numValue
        // } else if (field == 'min') {
        //     parameters.value[param.key].range.minimum = numValue
        // } else if (field == 'max') {
        //     parameters.value[param.key].range.maximum = numValue
        // }
        
        
  
    }
}

// Function to build a URL with current default values
function urlWithDefaults() {

    const url_ = new URL(vegaUrlSource.value)
    const params = new URLSearchParams(url_.search)

    Object.entries(parameters.value).forEach(([key, param]) => {
        if (param.default != null) {
            const value = String(param.default)
            if (param.type === 'boolean') {
                params.set(key, value.toLowerCase())
            } else if (param.type === 'number') {
                params.set(key, value)
            } else if (param.type === 'string' || param.type === 'select') {
                params.set(key, value)
            }
        }
    })
    url_.search = params.toString()
    return url_.toString()
}

// ---------------------------------------------------------------------------

watch(selectedMode, (newMode) => {
    props.slideSection.mode = newMode.value
    emit('sectionUpdated', props.slideSection)
})

watch(parameters, (newParameters) => {
    props.slideSection.parameters = newParameters
    emit('sectionUpdated', props.slideSection)
}, { deep: true })

</script>
<template>
    <div class="editor-container">

        <!-- EDITOR TOOL BAR  -->
        <div class="editor-toolbar">
            <div class="mode-select label-container">
                <SelectButton v-model="selectedMode" :options="modeOptions" optionLabel="label" id="vega-mode-select">
                </SelectButton>
            </div>

            <ContentServerStatus :size="'small'"
                v-if="selectedMode.value === 'url' || selectedMode.value === 'interactive'" />
        </div>

        <!-- STATIC JSON MODE -->
        <div v-if="selectedMode.value === 'static'" class="editor-fill label-container">
            <label for="vega-spec-input">Vega JSON</label>
            <div style="height: 100%; width: 100%">
                <CodeEditor :language="'json'" :slideSection="slideSection"
                    @contentUpdated="$emit('contentUpdated', $event)" class="editor-fill" />
            </div>
        </div>

        <!-- STATIC URL MODE -->
        <div v-if="selectedMode.value === 'url'">
            <Inplace :active="true">
                <template #content>
                    <div class="label-container">
                        <label for="vega-url-input">Vega JSON URL</label>
                        <div style="width: 100%; display: flex; flex-direction: row; gap: 0.5rem; align-items: center;">
                            <InputText v-model="vegaUrlSource" id="vega-url-input" placeholder="Enter url to fetch from"
                                @input="onUrlInput();" :invalid="!!urlError" style="flex: 1; min-width: 0;"></InputText>
                            <Button small rounded :disabled="!!urlError || !vegaUrlSource"
                                @click="$emit('sectionUpdated', { ...slideSection, content_path: sanitizeURL(vegaUrlSource) })">
                                <template #icon>
                                    <i class="material-symbols-outlined">download</i>
                                </template>
                            </Button>
                        </div>
                        <small v-if="urlError" class="url-error">{{ urlError }}</small>
                    </div>
                </template>
                <template #display>
                    <ProgressBar :value="0" style="width: 100%; height: 30px" />
                </template>
            </Inplace>
        </div>

        <div v-if="selectedMode.value === 'url'" class="label-container"
            style="display: flex; flex-direction: column; height: 100%; width: 100%; min-height: 0;">
            <label for="json-preview">Preview</label>
            <TextArea class="vegaspec-preview" id="json-preview" disabled
                v-model="props.slideSection.content"></TextArea>
        </div>

        <!-- INTERACTIVE MODE -->
        <div v-if="selectedMode.value === 'interactive'" class="label-container"
            style="display: flex; flex-direction: column; height: 100%; width: 100%; min-height: 0; gap: 0.5rem;">

            <div
                style="display: flex; flex-direction: row; gap: 0.5rem; align-items: flex-end; width: 100%; min-width: 0;">

                <div class="label-container" style="width: 100%; min-width: 0;">
                    <label>URL Pattern</label>
                    <InputText v-model="vegaUrlSource" placeholder="Enter a URL pattern" fluid
                        style="flex: 1; min-width: 0;">
                    </InputText>
                </div>

                <Button @click="parametersFromUrl(vegaUrlSource)" rounded>
                    <template #icon>
                        <i class="material-symbols-outlined">functions</i>
                    </template>
                </Button>
            </div>

            <!-- parameter list -->
            <div class="label-container parameter-list" style="width: 100%; min-width: 0;">

                <label>Parameters</label>

                <div v-if="parametersArray().length === 0" class="param-empty">
                    No parameters found. Enter a URL pattern and click Get Parameters.
                </div>

                <div v-else class="param-cards inset-control">
                    <div v-for="param in parametersArray()" :key="param.key" class="param-card">

                        <!-- Header: name + type chip, plus text/select toggle for strings -->
                        <div class="param-card-header">
                            <div class="param-id">
                                <span class="parameter-item-name">{{ param.key }}</span>
                                <span class="parameter-item-type">{{ param.type }}</span>
                            </div>

                            <SelectButton v-if="param.type === 'string' || param.type === 'select'"
                                :modelValue="param.type === 'select' ? 'select' : 'text'"
                                @update:modelValue="(val: string) => setStrType(param, val as 'string' | 'select')"
                                :options="['text', 'select']" :allowEmpty="false" size="small" class="kind-toggle" />
                        </div>

                        <!-- Body: editors depend on the parameter type -->
                        <div class="param-card-body">

                            <!-- number: min / max / default -->
                            <div v-if="param.type === 'number'" class="param-grid-3">
                                <div class="field">
                                    <label>Min</label>
                                    <InputText @input="updateParamValue(param, 'min', $event)" type="number" placeholder="min" class="cell-input" />
                                </div>
                                <div class="field">
                                    <label>Max</label>
                                    <InputText @input="updateParamValue(param, 'max', $event)" type="number" placeholder="max" class="cell-input" />
                                </div>
                                <div class="field">
                                    <label>Default</label>
                                    <InputText @input="updateParamValue(param, 'default', $event)" type="number" placeholder="0" class="cell-input" />
                                </div>
                            </div>

                            <!-- string: default value -->
                            <div v-else-if="param.type === 'string'" class="field">
                                <label>Default</label>
                                <InputText placeholder="default value" class="cell-input" />
                            </div>

                            <!-- select: option chips + add input -->
                            <div v-else-if="param.type === 'select'" class="field">
                                <label>
                                    Options
                                    <span class="field-hint">— click a chip to set it as the default</span>
                                </label>

                                <div v-if="param.options && param.options.length" class="option-list">
                                    <Chip
                                        v-for="option in param.options"
                                        :key="option"
                                        :label="option"
                                        removable
                                        class="option-chip"
                                        :class="{ 'option-chip--default': param.default === option }"
                                        @click="setParamDefault(param.key, option)"
                                        @remove="removeParamOption(param.key, option)"
                                    />
                                </div>
                                <div v-else class="option-empty">No options yet.</div>

                                <InputText
                                    v-model="draftOption[param.key]"
                                    placeholder="Add option…"
                                    class="cell-input"
                                    @keyup.enter="onAddOption(param.key)"
                                />
                            </div>

                            <!-- boolean: default toggle -->
                            <div v-else-if="param.type === 'boolean'" class="field">
                                <label>Default</label>
                                <ToggleSwitch v-model="param.default" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<style scoped>
.parameter-list {
    width: 100%;
    flex: 1;
    min-height: 0;
    height: 100%;
}

.param-cards {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    min-height: 0;
    overflow-y: auto;
    padding: 0.5rem;
}

.param-card {
    background-color: var(--p-content-background, #fff);
    border: 1px solid var(--p-content-border-color, var(--p-gray-200));
    border-radius: 0.5rem;
    padding: 0.6rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    box-shadow: var(--shadow-light);
}

.param-card-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-width: 0;
}

.param-id {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.param-card-body {
    width: 100%;
    min-width: 0;
}

.param-grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
    min-width: 0;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
}

.option-list {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.4rem;
    width: 100%;
    padding: 0.15rem 0;
}

.option-empty {
    font-size: var(--fs-small);
    color: var(--p-gray-400);
    padding: 0.15rem 0;
}

.field-label {
    font-size: var(--fs-small);
    color: var(--p-gray-500);
}

.field-hint {
    color: var(--p-gray-400);
    font-weight: 400;
}

.cell-input {
    width: 100%;
    min-width: 0;
}

.parameter-list :deep(.p-inputtext) {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 0.25rem 0.4rem;
    font-size: var(--fs-small);
}

.kind-toggle {
    font-size: var(--fs-small);
    flex: 0 0 auto;
}

.kind-toggle :deep(.p-togglebutton),
.kind-toggle :deep(.p-selectbutton .p-button) {
    padding: 0.2rem 0.6rem;
    font-size: var(--fs-small);
}

.param-empty {
    font-size: var(--fs-small);
    color: var(--p-gray-400);
    padding: 1rem 0.5rem;
    text-align: center;
}

.parameter-item-name {
    font-weight: 800;
    text-transform: lowercase;
    font-size: var(--fs-medium);
    margin: 0;
    color: var(--p-primary-500);
    font-family: 'Fira Code', monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.parameter-item-type {
    font-family: 'Fira Code', monospace;
    background-color: var(--p-gray-100);
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    font-size: var(--fs-small);
    width: fit-content;
    color: var(--p-gray-700);
    flex: 0 0 auto;
}

.editor-toolbar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;

    border-bottom: 1px solid var(--p-primary-500);
    padding: 0.5rem 0;
}

.editor-container {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0;
}

.mode-select {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 0 0 auto;
}

.editor-fill {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.vegaspec-preview {
    flex: 1;
    min-height: 0;
    width: 100%;
}

.url-error {
    color: var(--p-red-500);
}

.url-pattern-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem 0;
}

.url-pattern-cell {
    border-radius: 0.25rem;
    padding: 0.2rem 0.4rem;
    font-family: 'Fira Code', monospace;
    font-size: var(--fs-small);
    color: var(--p-gray-900);
}

/* Option chips */
.option-chip {
    font-size: var(--fs-small);
    background-color: var(--p-primary-100);
    cursor: pointer;
    transition: background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    will-change: transform;
}

.option-chip:hover {
    background-color: var(--p-primary-200);
    transform: translateY(-1px);
    box-shadow: var(--shadow-light, 0 2px 6px rgba(0, 0, 0, 0.12));
}

.option-chip:active {
    transform: translateY(0);
    transition-duration: 0.05s;
}

/* The chip currently chosen as the parameter's default */
.option-chip--default {
    background-color: var(--p-primary-500);
    color: var(--p-primary-50, #fff);
    font-weight: 600;
}

.option-chip--default:hover {
    background-color: var(--p-primary-600, var(--p-primary-500));
}

.option-chip--default :deep(.p-chip-label) {
    color: inherit;
}
</style>