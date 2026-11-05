<script lang="ts" setup>
import SelectButton from 'primevue/selectbutton';
import '@/assets/main.css'
import type { SlideSection, Parameters } from '@/services/slide_service';
import { ref, computed, watch } from 'vue'
import CodeEditor from '@/components/CodeEditor.vue';
import InputText from 'primevue/inputtext';
import ContentServerStatus from '@/components/ContentServerStatus.vue'
import Button from 'primevue/button';
import { settings } from '@/globals/settings';
import TextArea from 'primevue/textarea';
import { nextTick } from 'vue'
import { useDialog } from 'primevue/usedialog'
import ParameterBuilder from '@/components/ParameterBuilder.vue';

const props = defineProps<{
    slideSection: SlideSection
}>()

const emit = defineEmits<{
    (e: 'contentUpdated', content: string): void,
    (e: 'sectionUpdated', content: SlideSection): void
}>()

// --- Local working state (never mutate props directly) ---------------------

const parameters = ref<Parameters>({})
const urlError = ref<string>('')
const vegaEndpoint = ref<string>('') // the resolved URL to fetch the vega spec from
const dialog = useDialog();

const parameterEntries = computed(() =>
    Object.entries(props.slideSection.parameters ?? {})
)

const formatValue = (v: unknown) =>
    v === null || v === undefined || v === '' ? '—' : String(v)

const hasExtra = (param: any) =>
    (param.type === 'number' && param.range) ||
    (param.type === 'select' && param.options?.length) ||
    param.description

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


function onEditParameters() {
    dialog.open(ParameterBuilder, {
        props: {
            header: 'Parameter Builder',
            style: { width: '80vw', height: '80vh' },
            maximizable: true,
            modal: true,
        },
        data: {
            section: props.slideSection,
        },
        onClose: (opt) => {
            if (!opt?.data?.saved) return
            emit('sectionUpdated', {
                ...props.slideSection,
                parameters: opt.data.parameters,
            })
        },
    })
}

function onModeChange(option: ModeOption) {
    selectedMode.value = option
    emitSection({})
}

// --- Emit a full updated section -------------------------------------------

function emitSection(patch: Partial<SlideSection>) {
    emit('sectionUpdated', {
        ...props.slideSection,
        mode: selectedMode.value.value,
        ...patch,
    })
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
    const [, message] = urlIsValid(vegaEndpoint.value)     // was: vegaUrlSource
    urlError.value = message
}

// --- Interactive mode: resolve the pattern with current defaults and fetch ----

function fetchVega() {
    emitSection({
        content_path: vegaEndpoint.value,
        properties: {
            ...props.slideSection.properties,
            refreshKey: Date.now(),          // NEW: changes on every click
        }
    })
}

// --- Watchers ----------------------------------------------------------------

watch(selectedMode, async () => {
    await nextTick()
    emitSection({})
})

watch(() => props.slideSection, (section) => {
    if (!section) return
    vegaEndpoint.value = section.content_path ?? ''
    const modeOption = modeOptions.find(o => o.value === section.mode)
    if (modeOption && modeOption.value !== selectedMode.value.value) {
        selectedMode.value = modeOption
    }
}, { immediate: true })

watch(parameters, () => emitSection({}), { deep: true })

</script>
<template>
    <div class="editor-container">

        <!-- EDITOR TOOL BAR  -->
        <div class="editor-header">

            <div class="label-container">
                <label>Select Vega Mode</label>
                <SelectButton :modelValue="selectedMode" @update:modelValue="onModeChange" :options="modeOptions"
                    optionLabel="label" dataKey="value" :allowEmpty="false" />
            </div>

            <ContentServerStatus :size="'small'"
                v-if="selectedMode.value === 'url' || selectedMode.value === 'interactive'" />
        </div>

        <div class="url-input-container" v-if="selectedMode.value === 'interactive' || selectedMode.value === 'url'">


            <InputText class="url-input" v-model="vegaEndpoint" @input="onUrlInput();" placeholder="/vega-endpoint">
            </InputText>


            <Button label="Fetch" size="small" @click="fetchVega()">
                <template #icon>
                    <i class="material-symbols-outlined">download</i>
                </template>
            </Button>

        </div>

        <!-- STATIC JSON MODE -->
        <div v-if="selectedMode.value === 'static'" class="editor-fill label-container">
            <label for="vega-spec-input">Vega JSON</label>
            <div style="height: 100%; width: 100%">
                <CodeEditor :language="'json'" :slideSection="slideSection"
                    @contentUpdated="$emit('contentUpdated', $event)" class="editor-fill" />
            </div>
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

            <Button label="Edit Parameters" size="small" @click="onEditParameters()">
                <template #icon>
                    <i class="material-symbols-outlined">function</i>
                </template>
            </Button>

            <div class="param-section">
                <label>Current Parameters</label>

                <div v-if="parameterEntries.length" class="param-list">
                    <div v-for="[name, param] in parameterEntries" :key="name" class="param-row">

                        <div class="param-main">
                            <span class="param-name" :title="name">{{ name }}</span>
                            <span class="param-type">{{ param.type }}</span>
                            <span class="param-default" :title="formatValue(param.default)">
                                {{ formatValue(param.default) }}
                            </span>
                        </div>

                        <div v-if="hasExtra(param)" class="param-extra">
                            <span v-if="param.type === 'number' && param.range">
                                {{ formatValue(param.range.min) }} … {{ formatValue(param.range.max) }}
                                <template v-if="param.range.step"> · step {{ param.range.step }}</template>
                            </span>

                            <span v-if="param.type === 'select' && param.options?.length" class="option-chips">
                                <span v-for="opt in param.options" :key="opt" class="option-chip"
                                    :class="{ 'is-default': opt === param.default }">{{ opt }}</span>
                            </span>

                            <span v-if="param.description" class="param-description">{{ param.description }}</span>
                        </div>
                    </div>
                </div>

                <div v-else class="param-empty">No parameters defined</div>
            </div>

        </div>

    </div>
</template>

<style scoped>
.editor-header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-small);
    border-bottom: 1px solid var(--p-primary-500);
    padding-bottom: var(--space-small);
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

.url-input-container {
    display: flex;
    flex-direction: row;
    gap: var(--space-small);
    align-items: center;
    margin-bottom: var(--space-small);
}

.url-input {
    width: 100%;
    font-family: "Fira Code";
}

/* ---------- Parameter list ---------- */

.param-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    margin-top: var(--space-medium);
}

.param-list {
    width: 100%;
    border: 1px solid var(--p-primary-200);
    border-radius: var(--br-medium);
    max-height: 300px;
    overflow-y: auto;
}

.param-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-small) var(--space-medium);
}

.param-row+.param-row {
    border-top: 1px solid var(--p-primary-100);
}

.param-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(60px, 35%);
    align-items: center;
    gap: var(--space-small);
}

.param-name {
    font-family: "Fira Code";
    font-weight: bold;
    color: var(--p-primary-500);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.param-type {
    font-family: "Fira Code";
    font-size: var(--fs-small);
    padding: 1px 6px;
    border-radius: var(--br-small);
    background-color: var(--p-surface-100);
    color: var(--p-surface-600);
}

.param-default {
    font-family: "Fira Code";
    font-size: var(--fs-small);
    text-align: right;
    color: var(--p-primary-600);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.param-extra {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px var(--space-small);
    font-family: "Fira Code";
    font-size: var(--fs-small);
    opacity: 0.75;
}

.option-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.option-chip {
    padding: 0 6px;
    border: 1px solid var(--p-primary-200);
    border-radius: var(--br-small);
}

.option-chip.is-default {
    border-color: var(--p-primary-500);
    font-weight: bold;
}

.param-description {
    width: 100%;
    font-family: inherit;
    font-style: italic;
}

.param-empty {
    font-size: var(--fs-small);
    opacity: 0.6;
    font-style: italic;
}
</style>