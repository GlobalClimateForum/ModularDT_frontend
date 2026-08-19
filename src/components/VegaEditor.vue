<script lang="ts" setup>
import SelectButton from 'primevue/selectbutton';
import '@/assets/main.css'
import type { SlideSection, Parameters } from '@/services/slide_service';
import { ref, computed, watch, toRaw } from 'vue'
import { extractParameters, buildVegaUrl, buildPattern, stripFilters, sanitizeURL } from '@/utils/vega_utils'
import CodeEditor from '@/components/CodeEditor.vue';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast'
import ContentServerStatus from '@/components/ContentServerStatus.vue'
import Button from 'primevue/button';
import { settings } from '@/globals/settings';
import TextArea from 'primevue/textarea';
import ProgressBar from 'primevue/progressbar';
import Inplace from 'primevue/inplace';
import ToggleSwitch from 'primevue/toggleswitch';
import Chip from 'primevue/chip';
import { nextTick } from 'vue'

const toast = useToast()
const props = defineProps<{
    slideSection: SlideSection
}>()

const emit = defineEmits<{
    (e: 'contentUpdated', content: string): void,
    (e: 'sectionUpdated', content: SlideSection): void
}>()

// --- Local working state (never mutate props directly) ---------------------

const parameters = ref<Parameters>({})
const baseUrl = ref<string>('')          // path + non-filter query params
const vegaUrlSource = ref<string>('')    // what the user types / sees
const urlError = ref<string>('')
const draftOption = ref<Record<string, string>>({})

interface ModeOption {
    label: string
    value: 'static' | 'url' | 'interactive'
}

const modeOptions: ModeOption[] = [
    { label: 'Static JSON', value: 'static' },
    { label: 'Static URL', value: 'url' },
    { label: 'Interactive', value: 'interactive' }
]

const selectedMode = ref<ModeOption>(modeOptions.find(o => o.value === 'static')!)

// The pattern is DERIVED from baseUrl + the current parameter list.
// Adding a parameter manually will therefore show up in the pattern automatically.
const urlPattern = computed(() => baseUrl.value ? buildPattern(baseUrl.value, parameters.value) : '')

// --- Sync FROM the section (runs on mount and whenever the section changes) --

watch(() => props.slideSection, (section) => {
    if (!section) return
    console.log('SYNC incoming:', JSON.stringify(section.parameters))

    const incoming = section.parameters
        ? structuredClone(toRaw(section.parameters))
        : {}

    // Only overwrite local params if they actually changed.
    if (JSON.stringify(incoming) !== JSON.stringify(toRaw(parameters.value))) {
        parameters.value = incoming
        console.log('SYNC applied')

    } else {
        console.log('SYNC skipped (equal)')
    }

    const modeOption = modeOptions.find(o => o.value === section.mode)
    if (modeOption) selectedMode.value = modeOption

    if (section.url_pattern) {
        baseUrl.value = stripFilters(section.url_pattern)
        vegaUrlSource.value = section.url_pattern
    } else {
        baseUrl.value = ''
        vegaUrlSource.value = section.content_path ?? ''
    }
}, { immediate: true, deep: false })

// --- Emit a full updated section -------------------------------------------

function emitSection(patch: Partial<SlideSection>) {
    const payload = {
        ...props.slideSection,
        mode: selectedMode.value.value,
        parameters: structuredClone(toRaw(parameters.value)),
        url_pattern: urlPattern.value,
        ...patch,
    }
    console.log('EMIT parameters:', JSON.stringify(payload.parameters))
    emit('sectionUpdated', payload)
}

// --- URL validation ---------------------------------------------------------

function urlIsValid(url: string): [boolean, string] {
    const errors: string[] = []
    if (/\s/.test(url)) errors.push('URL should not contain whitespace.')
    if (settings.value.cs_url && url.startsWith(settings.value.cs_url)) {
        errors.push('URL should not contain the base URL of the content server.')
    }
    if (url.startsWith('/') || url.endsWith('/')) {
        errors.push('URL should not have leading or trailing slashes.')
    }
    return [errors.length === 0, errors.join(' ')]
}

function onUrlInput() {
    const [, message] = urlIsValid(vegaUrlSource.value)
    urlError.value = message
}

// --- Interactive mode: seed parameters from the typed URL --------------------

function seedParametersFromUrl(url: string) {
    baseUrl.value = stripFilters(url)
    parameters.value = extractParameters(url)

    const count = Object.keys(parameters.value).length
    if (count === 0) {
        toast.add({ severity: 'info', summary: 'No parameters found', detail: 'No parameters were found in the URL.', life: 3000 })
    } else {
        toast.add({ severity: 'success', summary: 'Parameters extracted', detail: `${count} parameters were extracted from the URL.`, life: 3000 })
    }

    vegaUrlSource.value = urlPattern.value
    emitSection({})
}

// --- Interactive mode: resolve the pattern with current defaults and fetch ----

function fetchWithDefaults() {
    const values: Record<string, unknown> = {}
    Object.entries(parameters.value).forEach(([name, param]) => {
        values[name] = param.default
    })

    const resolved = buildVegaUrl(urlPattern.value, values)
    emitSection({ content_path: resolved })
}

// --- Select-parameter option handling ---------------------------------------

function addParamOption(paramKey: string, option: string) {
    const value = option.trim()
    if (!value) return

    const param = parameters.value[paramKey]
    if (!param || param.type !== 'select') return

    if (param.options.includes(value)) {
        toast.add({ severity: 'info', summary: 'Duplicate', detail: `"${value}" is already an option.`, life: 2500 })
        return
    }

    param.options.push(value)
    if (param.default == null) param.default = value
}

function onAddOption(paramKey: string) {
    addParamOption(paramKey, draftOption.value[paramKey] ?? '')
    draftOption.value[paramKey] = ''
    console.log('after add, local param:', structuredClone(toRaw(parameters.value[paramKey])))
}

function removeParamOption(paramKey: string, option: string) {
    const param = parameters.value[paramKey]
    if (!param || param.type !== 'select') return

    const idx = param.options.indexOf(option)
    if (idx !== -1) param.options.splice(idx, 1)

    if (param.default === option) {
        param.default = param.options[0] ?? null
    }
}

function setParamDefault(paramKey: string, option: string | null) {
    const param = parameters.value[paramKey]
    if (param && param.type === 'select') param.default = option
}

function setStrType(key: string, newType: 'string' | 'select') {
    const param = parameters.value[key]
    if (!param) return

    if (newType === 'select' && param.type !== 'select') {
        parameters.value[key] = { type: 'select', options: [], default: null }
    } else if (newType === 'string' && param.type !== 'string') {
        parameters.value[key] = { type: 'string', default: null }
    }
}

function updateParamValue(key: string, field: 'min' | 'max' | 'default', event: Event) {
    const target = parameters.value[key]
    if (!target || target.type !== 'number') return

    const raw = (event.target as HTMLInputElement).value
    const numValue = raw === '' ? null : Number(raw)

    if (field === 'default') {
        target.default = numValue
    } else {
        if (!target.range) target.range = { min: null, max: null }
        target.range[field] = numValue
    }
}

// --- Watches ----------------------------------------------------------------

watch(selectedMode, async () => {
    await nextTick()
    emitSection({})
})

watch(parameters, () => emitSection({}), { deep: true })

</script>
<template>
    <div class="editor-container">

        <!-- EDITOR TOOL BAR  -->
        <div class="editor-toolbar">
            <div class="mode-select label-container">
                <SelectButton v-model="selectedMode" :options="modeOptions" optionLabel="label" dataKey="value"
                    :allowEmpty="false" id="vega-mode-select" />
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

                <div class="label-container" style="flex: 1 1 auto; min-width: 0;">
                    <label>URL Pattern</label>
                    <InputText v-model="vegaUrlSource" placeholder="Enter a URL pattern" fluid
                        style="flex: 1; min-width: 0;">
                    </InputText>
                </div>

                <Button @click="seedParametersFromUrl(vegaUrlSource)" rounded>
                    <template #icon>
                        <i class="material-symbols-outlined">functions</i>
                    </template>
                </Button>
                <Button :disabled="!urlPattern" @click="fetchWithDefaults()" rounded>
                    <template #icon>
                        <i class="material-symbols-outlined">download</i>
                    </template>
                </Button>
            </div>

            <!-- parameter list -->
            <div class="label-container parameter-list" style="width: 100%; min-width: 0;">

                <label>Parameters</label>

                <div v-if="Object.keys(parameters).length === 0" class="param-empty">
                    No parameters found. Enter a URL pattern and click Get Parameters.
                </div>

                <div v-else class="param-cards inset-control">
                    <div v-for="(param, key) in parameters" :key="key" class="param-card">

                        <!-- Header: name + type chip, plus text/select toggle for strings -->
                        <div class="param-card-header">
                            <div class="param-id">
                                <span class="parameter-item-name">{{ key }}</span>
                                <span class="parameter-item-type">{{ param.type }}</span>
                            </div>

                            <SelectButton v-if="param.type === 'string' || param.type === 'select'"
                                :modelValue="param.type === 'select' ? 'select' : 'text'"
                                @update:modelValue="(val: string) => setStrType(String(key), val as 'string' | 'select')"
                                :options="['text', 'select']" :allowEmpty="false" size="small" class="kind-toggle" />
                        </div>

                        <!-- Body: editors depend on the parameter type -->
                        <div class="param-card-body">

                            <!-- number: min / max / default -->
                            <div v-if="param.type === 'number'" class="param-grid-3">
                                <div class="field">
                                    <label>Min</label>
                                    <InputText :value="param.range?.min ?? ''"
                                        @input="updateParamValue(String(key), 'min', $event)" type="number"
                                        placeholder="min" class="cell-input" />
                                </div>
                                <div class="field">
                                    <label>Max</label>
                                    <InputText :value="param.range?.max ?? ''"
                                        @input="updateParamValue(String(key), 'max', $event)" type="number"
                                        placeholder="max" class="cell-input" />
                                </div>
                                <div class="field">
                                    <label>Default</label>
                                    <InputText :value="param.default ?? ''"
                                        @input="updateParamValue(String(key), 'default', $event)" type="number"
                                        placeholder="0" class="cell-input" />
                                </div>
                            </div>

                            <!-- string: default value -->
                            <div v-else-if="param.type === 'string'" class="field">
                                <label>Default</label>
                                <InputText :value="param.default ?? ''"
                                    @input="(e: Event) => param.default = (e.target as HTMLInputElement).value"
                                    placeholder="default value" class="cell-input" />
                            </div>

                            <!-- select: option chips + add input -->
                            <div v-else-if="param.type === 'select'" class="field">
                                <label>
                                    Options
                                    <span class="field-hint">— click a chip to set it as the default</span>
                                </label>

                                <div v-if="param.options && param.options.length" class="option-list">
                                    <Chip v-for="option in param.options" :key="option" :label="option" removable
                                        class="option-chip"
                                        :class="{ 'option-chip--default': param.default === option }"
                                        @click="setParamDefault(String(key), option)"
                                        @remove="removeParamOption(String(key), option)" />
                                </div>
                                <div v-else class="option-empty">No options yet.</div>

                                <InputText v-model="draftOption[key]" placeholder="Add option…" class="cell-input"
                                    @keyup.enter="onAddOption(String(key))" />
                            </div>

                            <!-- boolean: default toggle -->
                            <div v-else-if="param.type === 'boolean'" class="field">
                                <label>Default</label>
                                <ToggleSwitch :modelValue="!!param.default"
                                    @update:modelValue="(val: boolean) => param.default = val" />
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
    gap: 0px;
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