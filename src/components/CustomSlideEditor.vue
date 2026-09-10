<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import SelectButton from 'primevue/selectbutton';
import type { SlideSection } from '@/services/slide_service';
import CodeEditor from './CodeEditor.vue';

const props = defineProps<{
    slideSection: SlideSection
}>()

interface ModeOption {
    label: string
    value: 'html' | 'vue'
    language: 'html' | 'vue'
}

const modeOptions: ModeOption[] = [
    { label: 'HTML', value: 'html', language: 'html' },
    { label: 'Vue', value: 'vue', language: 'vue' }
]
const selectedMode = ref<ModeOption>(modeOptions.find(o => o.value === 'html')!)

const emit = defineEmits<{
    (e: 'contentUpdated', content: string): void,
    (e: 'sectionUpdated', content: SlideSection): void
}>()

onMounted(() => {
    if (!props.slideSection.mode) {
        props.slideSection.mode = 'html'
        emit('sectionUpdated', { ...props.slideSection, mode: 'html' })
    }else {
        selectedMode.value = modeOptions.find(o => o.value === props.slideSection.mode) || modeOptions[0]
    }
})

</script>

<template>
    <div class="editor-container">
        <div class="editor-toolbar">
            <div class="mode-select label-container">
                <SelectButton v-model="selectedMode" :options="modeOptions" optionLabel="label" dataKey="value"
                    :allowEmpty="false"  @change="$emit('sectionUpdated', { ...props.slideSection, mode: selectedMode.value })" />
            </div>
        </div>
        <CodeEditor class="editor-fill" :slideSection="props.slideSection" :language="selectedMode.language" 
        @contentUpdated="$emit('contentUpdated', $event)"></CodeEditor>
    </div>
</template>

<style scoped>
.editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
}

.editor-fill {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 0px;
}

.editor-container {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    padding: 0;
}
</style>