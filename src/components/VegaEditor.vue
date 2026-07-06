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

const toast = useToast()
const props = defineProps<{
    slide: Slide | null,
    slideSection: SlideSection,
}>()

const emit = defineEmits<{
    (e: 'contentUpdated', content: string): void,
    (e: 'sectionUpdated', content: SlideSection): void
}>()

const vegaUrlSource = ref<string>("")

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
    console.log(props.slideSection)
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
    parsed.width = "container"
    parsed.height = "container"
    parsed.autosize = { type: "fit", contains: "padding" }

    emit('contentUpdated', JSON.stringify(parsed, null, 2))
    toast.add({ severity: 'success', summary: 'Autosize added', detail: 'Autosize property added.', life: 3000 })
}


watch(selectedMode, (newMode) => {
    props.slideSection.mode = newMode.value
    emit('sectionUpdated', props.slideSection)
})


</script>
<template>
    <div class="editor-container">

        <div class="mode-select label-container">
            <label for="vega-mode-select">Select a Mode</label>
            <SelectButton v-model="selectedMode" :options="modeOptions" optionLabel="label" id="vega-mode-select">
            </SelectButton>
        </div>

        <!-- <Button @click="addAutoSize(props.slideSection.content)">Add autosize</Button> -->
        <div v-if="selectedMode.value === 'static'" class="editor-fill label-container">

            <label for="vega-spec-input">Vega JSON</label>
            <div style="height: 100%; width: 100%">
                <CodeEditor :language="'json'" :slideSection="slideSection"
                    @contentUpdated="$emit('contentUpdated', $event)" class="editor-fill" />
            </div>
        </div>

        <ContentServerStatus v-if="selectedMode.value === 'url' || selectedMode.value === 'interactive'" />

        <div v-if="selectedMode.value === 'url'" style="display: flex; flex-direction: row; gap: 0.5rem; align-items: center; width: 100%">
            <div class="label-container">
                <label for="vega-url-input">Vega JSON URL</label>
                <InputText v-model="vegaUrlSource" id="vega-url-input" placeholder="Enter url to fetch from"
                    style="width: 100%"
                    @input="$emit('sectionUpdated', { ...slideSection, content_path: vegaUrlSource })">
                </InputText>
            </div>
            <Button rounded>
                <template #icon>
                    <i class="material-symbols-outlined">reset_colors</i>
                </template>
            </Button>
        </div>
    </div>
</template>

<style scoped>
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
</style>