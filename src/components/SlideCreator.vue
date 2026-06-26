<script setup lang="ts">
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { onMounted, onBeforeUnmount, ref, nextTick, watch } from 'vue'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import type { Slide } from '@/services/slide_service'
import { saveSlide } from '@/services/slide_service'
import SlideView from '@/components/SlideView.vue'
import { useToast } from 'primevue/usetoast'
import LayoutEditor from '@/components/LayoutEditor.vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import type { SlideSection } from '@/services/slide_service'
import type { Extension } from '@codemirror/state'
import '@/assets/main.css'

// Define the Default Markdown Content, and Default Slide structure for new slides
const DEFAULT_CONTENT = ''
const DEFAULT_SLIDE = { name: '', width: 1920, height: 1080, tags: [] }
const DEFAULT_SECTION = { view_type: 'markdown', content: DEFAULT_CONTENT, content_path: '', width_fraction: 1.0 }
const SECTION_LIMIT = 3

// Define Input Proerties
const props = defineProps<{ slide?: Slide | null }>()

// Define references
const editorRefs = ref<(HTMLElement | null)[]>([]) // References for each Editor (in TabPanel)
const views: EditorView[] = [] // Array to hold the EditorView instances for each Section / TabPanel
const currentSlide = ref<Slide>(props.slide ?? DEFAULT_SLIDE) // Init a new slide if no slide is passed as prop

const slideSections = ref<SlideSection[]>([]) // Track the sections of the current slide (view_type, content, content_path, width_fraction)
const sectionWidths = ref<number[]>([1.0]) // Track the width fractions of each section (default to 1.0 for a single section = fullscreen)
const showFrame = ref<boolean>(false) // Track whether to show the frame around the slide preview
const layout = ref<string>('fullscreen') // Track the current selected layout for the sections (fullscreen, golden, reversegolden, etc.)


// Import the toast notification composable from PrimeVue for displaying success/error messages
const toast = useToast()

// Define Icon Mapping for each view type -> TODO: Get from backend (db)
const TABICONS: Record<string, string> = {
    markdown: 'markdown',
    chart: 'bar_chart',
    video: 'video_file',
    image: 'image',
}

// Save a slide handler
function storeSlide() {

    const sections = slideSections.value.map((section, index) => ({
        view_type: section.view_type,
        content: section.content,
        content_path: section.content_path,
        width_fraction: sectionWidths.value[index]
    }));

    const slide = {
        id: currentSlide.value.id,
        name: currentSlide.value.name,
        width: currentSlide.value.width,
        height: currentSlide.value.height,
        tags: currentSlide.value.tags,
    };

    saveSlide(slide, sections).then(response => {
        toast.add({ severity: 'success', summary: 'Success', detail: 'Slide saved successfully', life: 3000 })
    }).catch(error => {
        console.error("Error saving slide:", error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save slide', life: 3000 })
    });
}

// Function to initialize the CodeMirror editors for each section
function initEditors() {
    editorRefs.value.forEach((el, index) => {
        if (!el || views[index]) return
        views[index] = new EditorView({
            parent: el,
            state: EditorState.create({
                doc: slideSections.value[index].content,
                extensions: [
                    basicSetup,
                    markdown(),
                    editorUpdateListener(index),
                ],
            }),
        })
    })
}

// Small Helper to identify the layout type based on the section widths (fullscreen, golden, reversegolden, custom)
function getLayoutType(widths: number[]): string {
    if (widths.length === 1) return 'fullscreen'
    if (widths.length === 2) return widths[0] > widths[1] ? 'golden' : 'reversegolden'
    return 'custom'
}

// Handler to add a new section to the slide (up to a maximum of 3 sections)
function addSection() {
    // Limit to 3 sections
    if (slideSections.value.length >= SECTION_LIMIT) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: `Maximum of ${SECTION_LIMIT} sections allowed`, life: 3000 })
        return
    }

    slideSections.value.push(DEFAULT_SECTION) // Push a new defaultt section
    // Make all section widths equal (1 / number of sections)
    sectionWidths.value = slideSections.value.map(() => 1 / slideSections.value.length)
    // Update the layout type based on the new section widths
    layout.value = getLayoutType(sectionWidths.value)
    // Initialize the new editor for the added section before the next tick to ensure the DOM is updated
    nextTick(() => initEditors())
}

// Handler to remove a section from the slide (by index)
function removeSection(index: number) {

    // Ensure at least one section remains
    if (slideSections.value.length <= 1) {
        toast.add({ severity: 'warn', summary: 'Warning', detail: 'At least one section is required', life: 3000 })
        return
    }

    slideSections.value.splice(index, 1) // Remove the section at the specified index
    sectionWidths.value = slideSections.value.map(() => 1 / slideSections.value.length) // Recalculate widths
    layout.value = getLayoutType(sectionWidths.value) // Update layout type

    // Destroy the corresponding editor view and remove it from the views array
    if (views[index]) {
        views[index].destroy()
        views.splice(index, 1)
    }

    // Re-initialize editors to ensure they are correctly set up after removal
    nextTick(() => initEditors())
}

// Listener for CodeMirror editor updates to sync content with slideSections
function editorUpdateListener(index: number): Extension {
    return EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            // Update the content of the corresponding section in slideSections
            const updated = [...slideSections.value]
            updated[index] = { ...updated[index], content: update.state.doc.toString() }
            slideSections.value = updated
        }
    })
}

// Clean up the EditorView instances when the component is unmounted
onBeforeUnmount(() => {
    views.forEach(v => v?.destroy())
    views.length = 0
})

// Watch for changes in the slide prop and update the currentSlide and slideSections accordingly
watch(() => props.slide, (newSlide) => {
    // Destroy existing editors first
    views.forEach(v => v?.destroy())
    views.length = 0

    if (newSlide) {
        currentSlide.value = { ...newSlide }
        slideSections.value = newSlide.sections?.map(section => ({ ...section })) ?? []
        sectionWidths.value = newSlide.sections?.map(section => section.width_fraction ?? 1.0) ?? [1.0]
        layout.value = getLayoutType(sectionWidths.value)
    } else {
        // No slide passed — initialize with defaults
        slideSections.value = [{ view_type: 'markdown', content: DEFAULT_CONTENT, content_path: '', width_fraction: 1.0 }]
        sectionWidths.value = [1.0]
        layout.value = 'fullscreen'
    }

    nextTick(() => initEditors())
}, { immediate: true })

</script>

<template>

    <!-- Editor -->
    <Splitter :gutter-size="2" class="dashboard">
        <SplitterPanel :size="50" class="sub-panel">

            <Tabs value="0" style="height: 100%;" scrollable>

                <!-- For every section in the slide, create a tab with an editor -->
                <TabList class="tab-header">
                    <Tab v-for="(section, index) in slideSections" :key="index" :value="String(index)" class="tab">
                        <div class="tab-title">
                            <Button class="close-tab-btn" rounded text @click.stop="removeSection(index)">
                                <i class="material-symbols-outlined" style="font-size: 1.25rem;">close</i>
                            </Button>
                            <p>Section {{ index + 1 }}</p>
                            <i class="material-symbols-outlined">{{ TABICONS[section.view_type] }}</i>
                        </div>
                    </Tab>
                    <Button text rounded v-if="slideSections.length < SECTION_LIMIT" class="add-tab-btn"
                        @click="addSection()">
                        <i class="material-symbols-outlined">add</i>
                    </Button>
                </TabList>

                <!-- For every section in the slide, create a tab panel with a CodeMirror editor -->
                <TabPanels class="tab-panel">
                    <TabPanel v-for="(section, index) in slideSections" :key="index" :value="String(index)"
                        style="height: 100%;">
                        <div class="editor-container">
                            <div :ref="el => { editorRefs[index] = el as HTMLElement }" class="editor-host"></div>
                        </div>
                    </TabPanel>
                </TabPanels>
            </Tabs>

        </SplitterPanel>

        <!-- Preview & Layout, Save, ... -->
        <SplitterPanel class="sub-panel  preview-panel">
            <div class="preview-panel">

                <!-- Save Toolbar -->
                <Toolbar class="editor-toolbar">
                    <template #start>
                        <div class="editor-toolbar-start">
                            <Button icon="pi pi-save" size="small" rounded @click="storeSlide"
                                :disabled="currentSlide.name === ''" />
                            <InputText v-model="currentSlide.name" placeholder="Enter slide name..." size="small"
                                rounded />
                        </div>
                    </template>
                </Toolbar>

                <!-- Slide Preview -->
                <SlideView class="slide-preview" v-if="currentSlide" :preview="true" :slide="currentSlide"
                    :sections="slideSections.map((s, i) => ({ ...s, width_fraction: sectionWidths[i] }))"
                    :showframe="showFrame" />

                <!-- Layout Editor -->
                <LayoutEditor :layout="layout" :widths="sectionWidths" :showFrame="showFrame"
                    @sectionWidths="sectionWidths = [...$event]" @showframe="showFrame = $event" />

            </div>
        </SplitterPanel>
    </Splitter>
</template>

<style scoped>
.p-toolbar {
    margin: 0;
}

.preview-panel {
    display: flex !important;
    /* PrimeVue may override this */
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    gap: 1rem;
}

.slide-preview {
    flex: 1;
    min-height: 0;
    width: 100%;
}

:deep(.p-tab[data-p-active="true"]) {
    background-color: var(--p-primary-500);
    border-bottom: none;
    color: var(--p-primary-50);
}

:deep(.p-tab) {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0rem 1.0rem;
    border: 1px solid var(--p-primary-200);
    border-radius: var(--br-medium) var(--br-medium) 0 0;
    height: 2.5rem;
}

.add-tab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0rem 0.1rem;
    border-radius: var(--br-medium) var(--br-medium) 0 0;
    height: 2.5rem;
    cursor: pointer;
}

.tab-header {
    border-bottom: 2px solid var(--p-primary-500);
    height: 2.5rem;
}

.tab-title {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin: 0;
}

.tab-panel {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    padding: 0;
    padding-top: 0.5rem;
}

.close-tab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0rem 0rem;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 0.75rem;
    height: 1.5rem;
    cursor: pointer;
    color: white;
}


.editor-toolbar {
    margin-bottom: 1rem;
}

.editor-toolbar-start {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    gap: 0.5rem;
}

.editor-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.editor-host {
    flex: 1;
    min-height: 0;
}

.editor-host :deep(.cm-editor) {
    height: 100%;
    border: 1px solid var(--p-primary-200);
    border-radius: var(--br-medium);
    overflow: hidden;
    box-shadow: inset 0 0 5px 2.5px var(--p-primary-50);
}

.editor-host :deep(.cm-gutters) {
    background-color: var(--p-primary-100);
    border: none;
    box-shadow: -5px 0 10px 5px var(--p-primary-50);
}

.editor-host :deep(.cm-lineNumbers .cm-activeLineGutter) {
    border-left: 3px solid var(--p-primary-400);
}

.editor-host :deep(.cm-gutters) {
    border-right: none;
}

.editor-host :deep(.cm-activeLine) {
    background-color: var(--p-primary-200);
}

.editor-host :deep(.cm-line) {
    font-size: 1rem;
}

.editor-host :deep(.cm-lineNumbers) {
    font-size: 1rem;
}

.editor-host :deep(.cm-activeLineGutter, .cm-activeLine) {
    background-color: var(--p-primary-200);
}

.editor-host :deep(.cm-content) {
    height: 100%;
}

.editor-host :deep(.cm-content) {
    font-family: "Fira Code", monospace;
    font-variant-ligatures: contextual;
}
</style>