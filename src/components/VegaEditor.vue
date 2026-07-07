<script lang="ts" setup>
import SelectButton from 'primevue/selectbutton';
import '@/assets/main.css'
import type { Slide, SlideSection } from '@/services/slide_service';
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

const toast = useToast()
const props = defineProps<{
    slide: Slide | null,
    slideSection: SlideSection,
}>()

const emit = defineEmits<{
    (e: 'contentUpdated', content: string): void,
    (e: 'sectionUpdated', content: SlideSection): void
}>()

const fetchingVegaPlot = ref<boolean>(false)
const vegaUrlSource = ref<string>("")
const autosize = ref<boolean>(false)
const urlError = ref<string>("")

interface ModeOption {
    label: string
    value: 'static' | 'url' | 'interactive'
}

onMounted(() => {
    const mode = props.slideSection?.mode
    if (mode) {
        const modeOption = modeOptions.find(o => o.value === mode)
        if (modeOption) selectedMode.value = modeOption
    }
})

const modeOptions: ModeOption[] = [
    { label: 'Static JSON', value: 'static' },
    { label: 'Static URL', value: 'url' },
    { label: 'Interactive', value: 'interactive' }
];

const selectedMode = ref<ModeOption>(modeOptions.find(o => o.value === 'static')!)

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

function staticURLSanitize(url: string): string {

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

function onUrlInput() {
    const [, message] = urlIsValid(vegaUrlSource.value)
    urlError.value = message
}

watch(selectedMode, (newMode) => {
    props.slideSection.mode = newMode.value
    emit('sectionUpdated', props.slideSection)
})

watch(props.progress?.value, (newProgress) => {
    if (newProgress !== null) {
        fetchingVegaPlot.value = true;
    } else {
        fetchingVegaPlot.value = false;
    }
})

</script>
<template>
    <div class="editor-container">

        <div
            style="display: flex; flex-direction: row; gap: 1rem; align-items: flex-end; justify-content: space-between;">
            <div class="mode-select label-container">
                <label for="vega-mode-select">Select a Mode</label>
                <SelectButton v-model="selectedMode" :options="modeOptions" optionLabel="label" id="vega-mode-select">
                </SelectButton>
            </div>

            <ContentServerStatus :size="'small'"
                v-if="selectedMode.value === 'url' || selectedMode.value === 'interactive'" />
        </div>

        <div v-if="selectedMode.value === 'static'" class="editor-fill label-container">
            <label for="vega-spec-input">Vega JSON</label>
            <div style="height: 100%; width: 100%">
                <CodeEditor :language="'json'" :slideSection="slideSection"
                    @contentUpdated="$emit('contentUpdated', $event)" class="editor-fill" />
            </div>
        </div>

        <!-- TODO: add Autosize option  -->

        <!-- TODO: bind emit to button not to input -->
        <!-- @input="$emit('sectionUpdated', { ...slideSection, content_path: vegaUrlSource })" -->

        <div v-if="selectedMode.value === 'url'">
            <Inplace :active="true">
                <template #content>
                    <div class="label-container">
                        <label for="vega-url-input">Vega JSON URL</label>
                        <div style="width: 100%; display: flex; flex-direction: row; gap: 0.5rem; align-items: center;">
                            <InputText v-model="vegaUrlSource" id="vega-url-input" placeholder="Enter url to fetch from"
                                @input="onUrlInput();" :invalid="!!urlError" style="flex: 1; min-width: 0;"></InputText>
                            <Button small rounded :disabled="!!urlError || !vegaUrlSource"
                                @click="$emit('sectionUpdated', { ...slideSection, content_path: staticURLSanitize(vegaUrlSource) })">
                                <template #icon>
                                    <i class="material-symbols-outlined">download</i>
                                </template>
                            </Button>
                        </div>
                        <small v-if="urlError" class="url-error">{{ urlError }}</small>
                    </div>
                </template>
                <template #display>
                    <ProgressBar :value="props.progress" style="width: 100%; height: 30px" />
                </template>
            </Inplace>
        </div>


        <div v-if="selectedMode.value === 'url'" class="label-container"
            style="display: flex; flex-direction: column; height: 100%; width: 100%; min-height: 0;">
            <label for="json-preview">Preview</label>
            <TextArea class="vegaspec-preview" id="json-preview" disabled
                v-model="props.slideSection.content"></TextArea>
            <div v-if="props.progress !== null" class="progressIndicator">
            </div>
        </div>


    </div>
</template>

<style scoped>
.editor-toolbar {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
}

.editor-container {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 1rem;
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
    padding: none;
    margin: none;
}

.vegaspec-preview {
    flex: 1;
    min-height: 0;
    width: 100%;
}

.url-error {
    color: var(--p-red-500);
}
</style>